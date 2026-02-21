"""
Envio de e-mail via SMTP (variáveis de ambiente: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD).
Sem dependências novas; usa apenas smtplib e email da stdlib.
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from core.logging_config import get_logger

logger = get_logger(__name__)


def is_email_configured() -> bool:
    """Retorna True se SMTP está configurado (host presente)."""
    return bool(os.getenv("SMTP_HOST", "").strip())


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    from_email: str | None = None,
) -> bool:
    """
    Envia e-mail em HTML. Retorna True se enviado com sucesso.
    Se SMTP não estiver configurado, apenas loga e retorna False.
    """
    if not is_email_configured():
        logger.warning("SMTP não configurado; e-mail não enviado", extra={"to": to_email, "subject": subject})
        return False

    host = os.getenv("SMTP_HOST", "").strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    from_addr = from_email or user or "noreply@vaidepix.com"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(host, port) as server:
            if user and password:
                server.starttls()
                server.login(user, password)
            server.sendmail(from_addr, [to_email], msg.as_string())
        logger.info("E-mail enviado com sucesso", extra={"to": to_email, "subject": subject})
        return True
    except Exception as e:
        logger.exception("Falha ao enviar e-mail: %s", e, extra={"to": to_email})
        return False
