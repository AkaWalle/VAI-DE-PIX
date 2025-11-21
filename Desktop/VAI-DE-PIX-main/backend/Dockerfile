# Multi-stage build para otimização
FROM python:3.11-slim as builder

# Instalar dependências de build
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Criar diretório de trabalho
WORKDIR /app

# Copiar e instalar dependências Python
COPY requirements.txt requirements-test.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage final - imagem otimizada
FROM python:3.11-slim

# Instalar apenas runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Criar usuário não-root
RUN useradd --create-home --shell /bin/bash app

# Copiar dependências instaladas do builder
COPY --from=builder /root/.local /home/app/.local

# Definir PATH para incluir .local/bin
ENV PATH=/home/app/.local/bin:$PATH

# Definir diretório de trabalho
WORKDIR /app

# Copiar código da aplicação
COPY --chown=app:app . .

# Mudar para usuário não-root
USER app

# Expor porta
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Variáveis de ambiente padrão
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Comando padrão (pode ser sobrescrito)
CMD ["python", "production_server.py"]
