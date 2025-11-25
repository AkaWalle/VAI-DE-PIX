#!/bin/bash

# Script para conectar ao Raspberry Pi 5 e executar comandos
# Uso: ./scripts/connect-rpi5.sh [comando]

RPI_IP="${RPI_IP:-192.168.10.130}"
RPI_USER="${RPI_USER:-pi}"

if [ -z "$1" ]; then
    echo "🔌 Conectando ao Raspberry Pi 5..."
    echo "IP: $RPI_IP"
    echo "Usuário: $RPI_USER"
    echo ""
    ssh "$RPI_USER@$RPI_IP"
else
    echo "🔌 Executando comando no Raspberry Pi 5..."
    ssh "$RPI_USER@$RPI_IP" "$@"
fi

