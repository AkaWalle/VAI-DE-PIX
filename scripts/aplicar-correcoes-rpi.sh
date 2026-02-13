#!/bin/bash

# Script para aplicar correções de API no Raspberry Pi
# Execute: bash scripts/aplicar-correcoes-rpi.sh

cd ~/vai-de-pix

echo "🔧 Aplicando correções..."

# Parar servidor
pkill -f gunicorn || true

# 1. Corrigir src/lib/api.ts
cat > src/lib/api.ts << 'EOF'
const getApiBaseURL = (): string => {
  if (typeof window === 'undefined') return 'http://localhost:8000/api';

  // 1. Override manual via localStorage
  const override = localStorage.getItem('vai-de-pix-api-url');
  if (override) return override;

  // 2. Detecta automaticamente se está acessando via IP/rede
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port || '8000';

  // Se não for localhost → está na rede
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${protocol}//${hostname}:${port}/api`;
  }

  return 'http://localhost:8000/api';
};

export const API_CONFIG = {
  get baseURL() {
    return getApiBaseURL();
  },
  timeout: 15000,
};

// API endpoints (mantém os existentes)
export const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    me: "/auth/me",
    logout: "/auth/logout",
  },
  transactions: {
    list: "/transactions",
    create: "/transactions",
    update: (id: string) => `/transactions/${id}`,
    delete: (id: string) => `/transactions/${id}`,
    summary: "/transactions/summary/monthly",
  },
  goals: {
    list: "/goals",
    create: "/goals",
    update: (id: string) => `/goals/${id}`,
    delete: (id: string) => `/goals/${id}`,
    addValue: (id: string) => `/goals/${id}/add-value`,
  },
  envelopes: {
    list: "/envelopes",
    create: "/envelopes",
    update: (id: string) => `/envelopes/${id}`,
    delete: (id: string) => `/envelopes/${id}`,
    addValue: (id: string) => `/envelopes/${id}/add-value`,
    withdrawValue: (id: string) => `/envelopes/${id}/withdraw-value`,
  },
  categories: {
    list: "/categories",
    create: "/categories",
    update: (id: string) => `/categories/${id}`,
    delete: (id: string) => `/categories/${id}`,
  },
  accounts: {
    list: "/accounts",
    create: "/accounts",
    update: (id: string) => `/accounts/${id}`,
    delete: (id: string) => `/accounts/${id}`,
  },
  reports: {
    summary: "/reports/summary",
    cashflow: "/reports/cashflow",
    categories: "/reports/categories/summary",
    export: "/reports/export",
  },
} as const;
EOF

# 2. Corrigir src/lib/http-client.ts (adicionar função getApiBaseURLDynamic)
# Ler arquivo atual e adicionar função se não existir
if ! grep -q "getApiBaseURLDynamic" src/lib/http-client.ts 2>/dev/null; then
    # Adicionar função no início do arquivo
    sed -i '1i\
import { getApiBaseURLDynamic } from "./api";\
' src/lib/http-client.ts 2>/dev/null || echo "⚠️  Não foi possível modificar http-client.ts automaticamente"
fi

# 3. Rebuildar frontend
echo "🏗️  Rebuildando frontend..."
npm run build

echo ""
echo "✅ Correções aplicadas!"
echo "🚀 Execute: ./start-vai-de-pix.sh"

