# REGRA MONETÁRIA DO SISTEMA:
# Todos os valores recebidos pela API devem estar em centavos (int).
# Nenhum float é aceito na camada de entrada.
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, Field, model_validator, field_validator

from database import get_db
from models import Transaction, User, Account
from auth_utils import get_current_user
from repositories.transaction_repository import TransactionRepository
from services.transaction_service import TransactionService
from middleware.idempotency import IdempotencyContext, get_idempotency_context_transactions
from core.database_utils import atomic_transaction
from core.request_context import set_idempotency_key
from services.automation_checks import check_low_balance_after_transaction
from services.round_up_service import apply_round_up_after_expense
from core.amount_parser import serialize_money

router = APIRouter()

# Pydantic models: API monetária exclusivamente em centavos (int). Sem amount, sem float.
class TransactionCreate(BaseModel):
    date: datetime
    account_id: str
    category_id: str
    type: str  # income, expense, transfer
    amount_cents: int = Field(..., gt=0, description="Valor em centavos (inteiro positivo)")
    description: str
    tags: Optional[List[str]] = []
    to_account_id: Optional[str] = None  # obrigatório quando type=transfer
    shared_expense_id: Optional[str] = None  # despesa compartilhada vinculada (opcional)

    @field_validator("amount_cents", mode="before")
    @classmethod
    def amount_cents_strict_int(cls, v: object) -> int:
        """Rejeita bool, str e float; aceita apenas int (contrato único)."""
        if isinstance(v, bool):
            raise ValueError("amount_cents must be integer")
        if not isinstance(v, int):
            raise ValueError("amount_cents must be integer")
        return v

    @model_validator(mode="after")
    def check_transfer_has_to_account(self):
        if self.type == "transfer" and not self.to_account_id:
            raise ValueError("Transferências requerem 'to_account_id'")
        return self

class TransactionUpdate(BaseModel):
    date: Optional[datetime] = None
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    type: Optional[str] = None
    amount_cents: Optional[int] = Field(None, gt=0, description="Valor em centavos (inteiro positivo)")
    description: Optional[str] = None
    tags: Optional[List[str]] = None

class TransactionResponse(BaseModel):
    id: str
    date: datetime
    account_id: str
    category_id: str
    type: str
    amount: float  # mantido: backward compatibility (frontend consome como number)
    amount_str: Optional[str] = None  # enterprise: valor como string "1234.56" (evita float no JSON)
    description: str
    tags: Optional[List[str]]
    created_at: datetime
    updated_at: Optional[datetime]
    shared_expense_id: Optional[str] = None  # despesa compartilhada vinculada (quando existir)

    @field_validator("amount", mode="before")
    @classmethod
    def amount_to_float(cls, v: object) -> float:
        """Serializa Decimal (Numeric do banco) para float na API (compatibilidade)."""
        if isinstance(v, Decimal):
            return round(float(v), 2)
        return float(v) if v is not None else 0.0

    class Config:
        from_attributes = True


def _transaction_to_response(t: Transaction) -> TransactionResponse:
    """Monta TransactionResponse com amount (number) e amount_str (string)."""
    r = TransactionResponse.model_validate(t)
    r.amount_str = serialize_money(t.amount)
    return r

@router.get("/", response_model=List[TransactionResponse])
async def get_transactions(
    skip: int = Query(0, ge=0, description="Registros a pular (padrão 0)"),
    limit: int = Query(50, ge=1, le=100, description="Máximo de registros (padrão 50, máx 100)"),
    type_filter: Optional[str] = Query(None, regex="^(income|expense)$"),
    category_id: Optional[str] = None,
    account_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's transactions with filters. Paginação aplicada no repositório: skip (default 0), limit (default 50, max 100)."""
    repo = TransactionRepository(db)
    transactions = repo.get_by_user(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        type_filter=type_filter,
        category_id=category_id,
        account_id=account_id,
        start_date=start_date,
        end_date=end_date,
        tag_ids=None,
        search=None,
    )
    return [_transaction_to_response(t) for t in transactions]

@router.post("/", response_model=TransactionResponse)
async def create_transaction(
    transaction: TransactionCreate,
    idem: IdempotencyContext = Depends(get_idempotency_context_transactions),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new transaction. Ledger append-only via TransactionService.
    Idempotency-Key opcional: mesmo key + mesmo payload → mesma resposta (retry seguro).
    Router controla transação principal; idempotency usa sessão separada (crash safety).
    """
    set_idempotency_key(idem.key)
    body_for_hash = transaction.model_dump(mode="json")
    idem.acquire(body_for_hash)

    if idem.cached_response is not None:
        return idem.cached_response
    if idem.conflict_in_progress:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Outra requisição com a mesma Idempotency-Key está em andamento. Aguarde ou retente.",
        )

    try:
        account = db.query(Account).filter(
            Account.id == transaction.account_id,
            Account.user_id == current_user.id
        ).first()

        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conta não encontrada"
            )

        transaction_data = {
            "date": transaction.date,
            "category_id": transaction.category_id,
            "type": transaction.type,
            "amount_cents": transaction.amount_cents,
            "description": transaction.description,
            "tags": transaction.tags or [],
        }
        if transaction.to_account_id is not None:
            transaction_data["to_account_id"] = transaction.to_account_id
        if transaction.shared_expense_id is not None:
            transaction_data["shared_expense_id"] = transaction.shared_expense_id

        with atomic_transaction(db):
            db_transaction = TransactionService.create_transaction(
                transaction_data=transaction_data,
                account=account,
                user_id=current_user.id,
                db=db,
            )
        try:
            check_low_balance_after_transaction(db, transaction.account_id, current_user.id)
        except Exception:
            pass
        if transaction.type == "expense":
            try:
                apply_round_up_after_expense(db, current_user.id, transaction.amount_cents)
            except Exception:
                pass
        resp = _transaction_to_response(db_transaction)
        idem.save_success(200, resp.model_dump(mode="json"))
        return resp
    except HTTPException:
        idem.save_failed()
        raise
    except Exception:
        idem.save_failed()
        raise

@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific transaction."""
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação não encontrada"
        )
    
    return _transaction_to_response(transaction)

@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    transaction_update: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a transaction. Ledger: reversão + nova entrada (append-only) via TransactionService."""
    db_transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id,
        Transaction.deleted_at.is_(None),
    ).first()

    if not db_transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação não encontrada"
        )

    old_account = db.query(Account).filter(Account.id == db_transaction.account_id).first()
    if not old_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta da transação não encontrada"
        )
    update_data = transaction_update.model_dump(exclude_unset=True)
    new_account_id = update_data.get("account_id", db_transaction.account_id)
    new_account = db.query(Account).filter(
        Account.id == new_account_id,
        Account.user_id == current_user.id
    ).first()

    if not new_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )

    with atomic_transaction(db):
        updated = TransactionService.update_transaction(
            db_transaction=db_transaction,
            update_data=update_data,
            old_account=old_account,
            new_account=new_account,
            user_id=current_user.id,
            db=db,
        )
        return _transaction_to_response(updated)

@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a transaction (hard). Ledger: reversão (append-only) via TransactionService."""
    db_transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id,
        Transaction.deleted_at.is_(None),
    ).first()

    if not db_transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação não encontrada"
        )

    account = db.query(Account).filter(Account.id == db_transaction.account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta da transação não encontrada"
        )

    with atomic_transaction(db):
        TransactionService.delete_transaction(
            db_transaction=db_transaction,
            account=account,
            user_id=current_user.id,
            db=db,
            hard=True,
        )
    return {"message": "Transação removida com sucesso"}

@router.get("/summary/monthly")
async def get_monthly_summary(
    year: int = Query(datetime.now().year),
    month: int = Query(datetime.now().month, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get monthly transaction summary."""
    from sqlalchemy import func, extract
    
    # Get transactions for the specified month
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        extract('year', Transaction.date) == year,
        extract('month', Transaction.date) == month
    ).all()
    
    # Calculate totals
    total_income = sum(t.amount for t in transactions if t.type == 'income')
    total_expenses = sum(abs(t.amount) for t in transactions if t.type == 'expense')
    net_balance = total_income - total_expenses
    
    # Category breakdown
    category_breakdown = {}
    for transaction in transactions:
        cat_id = transaction.category_id
        if cat_id not in category_breakdown:
            category_breakdown[cat_id] = {'income': 0, 'expense': 0}
        
        if transaction.type == 'income':
            category_breakdown[cat_id]['income'] += transaction.amount
        else:
            category_breakdown[cat_id]['expense'] += abs(transaction.amount)
    
    return {
        "year": year,
        "month": month,
        "total_transactions": len(transactions),
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_balance": net_balance,
        "category_breakdown": category_breakdown
    }
