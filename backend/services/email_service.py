"""
Envio de e-mail via SMTP (Gmail recomendado).

Variáveis de ambiente:
- SMTP_HOST (ex.: smtp.gmail.com)
- SMTP_PORT (ex.: 587)
- SMTP_USER (usuário SMTP; para Gmail precisa ser conta Google)
- SMTP_PASSWORD (App Password)
- SMTP_FROM (remetente exibido; ex.: "VAI DE PIX <seu_email@gmail.com>")
- FRONTEND_URL (ex.: https://vai-de-pix.vercel.app)
- PASSWORD_RESET_EXPIRE_MINUTES (opcional; padrão 60)

Regras:
- Nunca logar credenciais.
- Sempre enviar multipart (text/plain + text/html).
"""
# flake8: noqa E501
from __future__ import annotations

import os
import ssl
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from core.logging_config import get_logger

logger = get_logger(__name__)


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def is_email_configured() -> bool:
    return all(
        [
            _env("SMTP_HOST"),
            _env("SMTP_PORT"),
            _env("SMTP_USER"),
            _env("SMTP_PASSWORD"),
            _env("SMTP_FROM"),
            _env("FRONTEND_URL"),
        ]
    )


def _password_reset_subject() -> str:
    return "Redefinir sua senha - VAI DE PIX"


def _password_reset_bodies(*, reset_link: str, name: str, expire_minutes: int) -> tuple[str, str]:
    safe_name = (name or "Olá").strip()

    text_body = (
        f"{safe_name},\n\n"
        "Recebemos uma solicitação para redefinir a senha da sua conta no VAI DE PIX.\n\n"
        f"Para continuar, abra o link:\n{reset_link}\n\n"
        f"Este link é válido por {expire_minutes} minutos.\n"
        "Se você não solicitou essa alteração, ignore este e-mail.\n\n"
        "VAI DE PIX • Organizador financeiro\n"
    )

    html_body = f"""\
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{_password_reset_subject()}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#e2e8f0;">
  <div style="width:100%;padding:24px 0;">
    <div style="max-width:520px;margin:0 auto;background:#111827;border:1px solid #334155;border-radius:14px;padding:24px;">
      <div style="font-weight:800;font-size:16px;letter-spacing:.08em;color:#22c55e;margin-bottom:14px;">
        VAI DE PIX
      </div>

      <h1 style="margin:0 0 12px;font-size:20px;color:#f8fafc;">Redefinir sua senha</h1>

      <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        Olá, <strong style="color:#f8fafc;">{safe_name}</strong>.
      </p>

      <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        Recebemos uma solicitação para redefinir a senha da sua conta no <strong style="color:#f8fafc;">VAI DE PIX</strong>.
      </p>

      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        Se foi você, clique no botão abaixo para criar uma nova senha:
      </p>

      <div style="margin:16px 0 18px;">
        <a href="{reset_link}"
           style="display:inline-block;background:#22c55e;color:#020617 !important;text-decoration:none;font-weight:700;
                  padding:12px 18px;border-radius:10px;font-size:14px;">
          Redefinir minha senha
        </a>
      </div>

      <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#94a3b8;word-break:break-word;">
        Se o botão não funcionar, copie e cole este link no navegador:<br/>
        <a href="{reset_link}" style="color:#93c5fd;text-decoration:underline;">{reset_link}</a>
      </p>

      <div style="height:1px;background:#334155;margin:16px 0;"></div>

      <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#94a3b8;">
        Este link expira em <strong style="color:#e2e8f0;">{expire_minutes} minutos</strong>.
      </p>

      <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#94a3b8;">
        Se você não solicitou essa alteração, ignore este e-mail.
      </p>

      <p style="margin:0;font-size:12px;line-height:1.6;color:#22c55e;">
        🔒 Ambiente seguro
      </p>

      <div style="height:1px;background:#334155;margin:16px 0;"></div>

      <p style="margin:0;text-align:center;font-size:12px;color:#64748b;">
        VAI DE PIX • Organizador financeiro
      </p>
    </div>
  </div>
</body>
</html>
"""
    return text_body, html_body


def _send_smtp(*, to_email: str, subject: str, text_body: str, html_body: str) -> bool:
    host = _env("SMTP_HOST")
    port = int(_env("SMTP_PORT", "587") or "587")
    user = _env("SMTP_USER")
    password = _env("SMTP_PASSWORD")
    from_addr = _env("SMTP_FROM")
    if not (host and port and user and password and from_addr):
        logger.warning("SMTP não configurado; e-mail não enviado", extra={"to": to_email, "subject": subject})
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    context = ssl.create_default_context()

    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(user, password)
            server.sendmail(from_addr, [to_email], msg.as_string())
        logger.info("E-mail enviado com sucesso (SMTP)", extra={"to": to_email, "subject": subject})
        return True
    except Exception as e:
        logger.exception("Falha ao enviar e-mail SMTP: %s", e, extra={"to": to_email})
        return False


def send_password_reset_email(*, to_email: str, reset_token: str, name: str) -> bool:
    """
    Envia e-mail de redefinição de senha.

    - reset_token: token em claro (vai no link).
    - name: nome do usuário (para saudação).
    """
    logger.info(
        "Tentando enviar email de reset",
        extra={
            "to": to_email,
            "smtp_host": _env("SMTP_HOST"),
            "smtp_user": _env("SMTP_USER"),
            "smtp_from": _env("SMTP_FROM"),
            "frontend_url": _env("FRONTEND_URL"),
            "configurado": is_email_configured(),
        },
    )
    frontend_url = _env("FRONTEND_URL")
    expire_minutes = int(_env("PASSWORD_RESET_EXPIRE_MINUTES", "60") or "60")
    if not frontend_url:
        logger.warning("FRONTEND_URL ausente; e-mail não enviado", extra={"to": to_email})
        return False

    reset_link = f"{frontend_url.rstrip('/')}/auth/reset-password?token={reset_token}"
    subject = _password_reset_subject()
    text_body, html_body = _password_reset_bodies(
        reset_link=reset_link, name=name, expire_minutes=expire_minutes
    )
    return _send_smtp(to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    from_email: str | None = None,
) -> bool:
    """
    Compat: envio genérico usado por jobs/alertas.

    - Mantido para não quebrar outras partes do backend.
    - Usa SMTP puro.
    - Se from_email for passado, ele sobrescreve SMTP_FROM (apenas no cabeçalho).
    """
    host = _env("SMTP_HOST")
    port = int(_env("SMTP_PORT", "587") or "587")
    user = _env("SMTP_USER")
    password = _env("SMTP_PASSWORD")
    default_from = _env("SMTP_FROM")
    from_addr = (from_email or default_from).strip()

    if not (host and port and user and password and from_addr):
        logger.warning(
            "SMTP não configurado; e-mail não enviado",
            extra={"to": to_email, "subject": subject},
        )
        return False

    text_fallback = "Este e-mail requer HTML para exibição completa."

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.attach(MIMEText(text_fallback, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(user, password)
            server.sendmail(from_addr, [to_email], msg.as_string())
        logger.info("E-mail enviado com sucesso (SMTP)", extra={"to": to_email, "subject": subject})
        return True
    except Exception as e:
        logger.exception("Falha ao enviar e-mail SMTP: %s", e, extra={"to": to_email})
        return False
