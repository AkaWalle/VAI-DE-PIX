#!/bin/bash

# Script para configurar o serviço systemd do VAI DE PIX
# Uso: ./scripts/configurar-servico-systemd.sh

set -e

echo "⚙️  Configurando serviço systemd para VAI DE PIX..."
echo "=================================================="

# Verificar se estamos na raiz do projeto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script a partir da raiz do projeto"
    exit 1
fi

# Obter caminho absoluto do projeto
PROJECT_DIR=$(pwd)
BACKEND_DIR="$PROJECT_DIR/backend"
VENV_DIR="$BACKEND_DIR/venv"
PYTHON_BIN="$VENV_DIR/bin/python"
SERVICE_FILE="/etc/systemd/system/vai-de-pix.service"

echo "📁 Diretório do projeto: $PROJECT_DIR"
echo "🐍 Python: $PYTHON_BIN"

# Verificar se venv existe
if [ ! -f "$PYTHON_BIN" ]; then
    echo "❌ Erro: Ambiente virtual não encontrado em $VENV_DIR"
    echo "   Execute primeiro: cd backend && python3 -m venv venv"
    exit 1
fi

# Criar arquivo de serviço
echo ""
echo "📝 Criando arquivo de serviço systemd..."
sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=VAI DE PIX - Sistema de Controle Financeiro
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=pi
WorkingDirectory=$BACKEND_DIR
Environment="PATH=$VENV_DIR/bin"
Environment="PYTHONUNBUFFERED=1"
ExecStart=$PYTHON_BIN production_server.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Arquivo de serviço criado: $SERVICE_FILE"

# Recarregar systemd
echo ""
echo "🔄 Recarregando systemd..."
sudo systemctl daemon-reload

# Habilitar serviço
echo ""
echo "✅ Habilitando serviço para iniciar no boot..."
sudo systemctl enable vai-de-pix.service

echo ""
echo "=================================================="
echo "✅ Serviço systemd configurado com sucesso!"
echo "=================================================="
echo ""
echo "📋 Comandos úteis:"
echo ""
echo "Iniciar serviço:"
echo "  sudo systemctl start vai-de-pix.service"
echo ""
echo "Parar serviço:"
echo "  sudo systemctl stop vai-de-pix.service"
echo ""
echo "Reiniciar serviço:"
echo "  sudo systemctl restart vai-de-pix.service"
echo ""
echo "Ver status:"
echo "  sudo systemctl status vai-de-pix.service"
echo ""
echo "Ver logs:"
echo "  sudo journalctl -u vai-de-pix.service -f"
echo ""
echo "🚀 Para iniciar agora, execute:"
echo "  sudo systemctl start vai-de-pix.service"
echo ""

