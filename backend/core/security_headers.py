"""
Middleware de segurança HTTP para VAI DE PIX
Implementa headers de segurança conforme OWASP ASVS Nível 3
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from typing import Callable
import os


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware que adiciona headers de segurança HTTP em todas as respostas.
    Conforme OWASP ASVS Nível 3 e melhores práticas de segurança.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # HSTS - HTTP Strict Transport Security
        # Força uso de HTTPS por 1 ano, inclui subdomínios, permite preload
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        # Content-Security-Policy
        # Política de segurança de conteúdo restritiva
        # 'self' permite apenas recursos do mesmo domínio
        # 'unsafe-inline' necessário para alguns estilos inline (pode ser removido com refatoração)
        csp = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "upgrade-insecure-requests"
        )
        response.headers["Content-Security-Policy"] = csp
        
        # X-Frame-Options
        # Previne clickjacking - não permite que a página seja exibida em iframe
        response.headers["X-Frame-Options"] = "DENY"
        
        # X-Content-Type-Options
        # Previne MIME type sniffing - força o navegador a respeitar o Content-Type
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Referrer-Policy
        # Controla quanto de informação do referrer é enviado
        # strict-origin-when-cross-origin: envia origem completa apenas para requisições HTTPS
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions-Policy (antigo Feature-Policy)
        # Desabilita recursos que não são necessários para a aplicação
        permissions_policy = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "speaker=()"
        )
        response.headers["Permissions-Policy"] = permissions_policy
        
        # Cross-Origin-Embedder-Policy
        # Requer que recursos sejam carregados via CORS ou CORP
        response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
        
        # Cross-Origin-Opener-Policy
        # Isola o contexto de navegação da página
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        
        # Cross-Origin-Resource-Policy
        # Controla quais sites podem carregar recursos desta origem
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        
        # X-Permitted-Cross-Domain-Policies
        # Previne uso de políticas cross-domain do Flash/PDF
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
        
        # Remove header X-Powered-By (se existir)
        # Não revela tecnologia usada
        if "X-Powered-By" in response.headers:
            del response.headers["X-Powered-By"]
        
        return response

