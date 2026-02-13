from datetime import datetime, timedelta
from typing import Optional, Tuple
from jose import jwt, JWTError
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Response
from sqlalchemy.orm import Session
import os
import hashlib
import secrets
from dotenv import load_dotenv

from database import get_db
from models import User, UserSession

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
# Quando USE_REFRESH_TOKENS=1: access token curto (5–15 min); refresh em cookie HttpOnly
USE_REFRESH_TOKENS = os.getenv("USE_REFRESH_TOKENS", "").lower() in ("1", "true", "yes")
ACCESS_TOKEN_EXPIRE_MINUTES_SHORT = min(15, max(5, int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES_SHORT", "10"))))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
REFRESH_TOKEN_COOKIE_NAME = "refresh_token"

security = HTTPBearer()


def clear_refresh_cookie(response: Response) -> None:
    """Remove o cookie de refresh token (uso em logout e exclusão de conta)."""
    response.delete_cookie(key=REFRESH_TOKEN_COOKIE_NAME, path="/")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    """Generate password hash."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Create JWT access token.
    Com USE_REFRESH_TOKENS=1 usa expiração curta (5–15 min); senão usa ACCESS_TOKEN_EXPIRE_MINUTES.
    """
    to_encode = data.copy()
    if expires_delta is not None:
        expire = datetime.utcnow() + expires_delta
    elif USE_REFRESH_TOKENS:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES_SHORT)
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def _hash_refresh_token(token: str) -> str:
    """Hash do refresh token para armazenar (SHA-256 hex)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_refresh_token(
    user_id: str,
    db: Session,
    device: Optional[str] = None,
    ip: Optional[str] = None,
) -> Tuple[str, UserSession]:
    """
    Gera um refresh token aleatório, persiste o hash na sessão e retorna (token_em_claro, session).
    O token em claro deve ser enviado ao cliente uma única vez (cookie HttpOnly).
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_refresh_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    session = UserSession(
        user_id=user_id,
        refresh_token_hash=token_hash,
        device=device,
        ip=ip,
        expires_at=expires_at,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return raw_token, session


def verify_refresh_token(token: str, db: Session) -> Optional[UserSession]:
    """
    Valida o refresh token: existe sessão com hash, não expirada e não revogada.
    Retorna UserSession ou None.
    """
    if not token:
        return None
    token_hash = _hash_refresh_token(token)
    session = (
        db.query(UserSession)
        .filter(
            UserSession.refresh_token_hash == token_hash,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > datetime.utcnow(),
        )
        .first()
    )
    return session


def revoke_session(session_id: str, db: Session) -> bool:
    """Revoga uma sessão por id (marca revoked_at). Retorna True se encontrada."""
    session = db.query(UserSession).filter(UserSession.id == session_id).first()
    if not session:
        return False
    session.revoked_at = datetime.utcnow()
    db.add(session)
    db.commit()
    return True


def revoke_all_sessions_for_user(user_id: str, db: Session) -> int:
    """Revoga todas as sessões do usuário. Retorna quantidade revogada."""
    count = (
        db.query(UserSession)
        .filter(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))
        .update({UserSession.revoked_at: datetime.utcnow()}, synchronize_session=False)
    )
    db.commit()
    return count

def verify_token(token: str, db: Session) -> User:
    """Verify JWT token and return user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise credentials_exception

    return user

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user."""
    return verify_token(credentials.credentials, db)
