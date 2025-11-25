# 🐍 Setup do Backend - VAI DE PIX

## 📋 Pré-requisitos

- **Python 3.8+**
- **pip** ou **pipenv**
- **PostgreSQL** (para produção) ou **SQLite** (desenvolvimento)

## 🚀 Instalação Rápida

### 1. Configurar Ambiente Python

```bash
# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependências
cd backend
pip install -r requirements.txt
```

### 2. Configurar Banco de Dados

#### **Opção A: SQLite (Desenvolvimento - Mais Simples)**
```bash
# Copiar arquivo de configuração
copy env.example .env

# O SQLite será criado automaticamente
# Arquivo: vai_de_pix.db
```

#### **Opção B: PostgreSQL (Produção - Recomendado)**
```bash
# Instalar PostgreSQL
# Windows: https://www.postgresql.org/download/windows/
# Ubuntu: sudo apt install postgresql postgresql-contrib

# Criar banco de dados
sudo -u postgres psql
CREATE DATABASE vai_de_pix;
CREATE USER vai_de_pix_user WITH PASSWORD 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON DATABASE vai_de_pix TO vai_de_pix_user;
\q

# Configurar .env
copy env.example .env
# Editar DATABASE_URL no .env:
# DATABASE_URL=postgresql://vai_de_pix_user:sua_senha_aqui@localhost:5432/vai_de_pix
```

### 3. Executar Migrações

```bash
# Criar tabelas do banco
python -c "from main import *; print('Database created!')"

# Ou usar Alembic para migrações
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### 4. Executar Servidor

```bash
# Modo desenvolvimento
python main.py

# Ou com uvicorn diretamente
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**API estará disponível em:**
- **Local:** http://localhost:8000
- **Docs:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## 🔧 Configuração do Frontend

### Atualizar Frontend para usar API

1. **Criar arquivo de configuração da API:**

```typescript
// src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = {
  baseURL: API_BASE_URL,
  
  // Auth endpoints
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    register: `${API_BASE_URL}/auth/register`,
    me: `${API_BASE_URL}/auth/me`,
  },
  
  // Resource endpoints
  transactions: `${API_BASE_URL}/transactions`,
  goals: `${API_BASE_URL}/goals`,
  envelopes: `${API_BASE_URL}/envelopes`,
  categories: `${API_BASE_URL}/categories`,
  accounts: `${API_BASE_URL}/accounts`,
  reports: `${API_BASE_URL}/reports`,
};
```

2. **Criar cliente HTTP:**

```typescript
// src/lib/http-client.ts
import axios from 'axios';
import { api } from './api';

const httpClient = axios.create({
  baseURL: api.baseURL,
  timeout: 10000,
});

// Interceptor para adicionar token
httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('vai-de-pix-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vai-de-pix-token');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export { httpClient };
```

## 🌐 Opções de Deploy

### **1. Railway (Recomendado - Simples)**
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login e deploy
railway login
railway init
railway up
```

### **2. Render (Gratuito)**
1. Conecte repositório GitHub
2. Configure:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python main.py`
   - **Environment:** Adicione variáveis do .env

### **3. DigitalOcean App Platform**
1. Conecte repositório
2. Configure Python app
3. Adicione PostgreSQL managed database

### **4. Heroku**
```bash
# Criar Procfile
echo "web: python main.py" > Procfile

# Deploy
heroku create vai-de-pix-api
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

## 📊 Estrutura da API

### **Endpoints Principais:**

```
POST   /api/auth/register     # Criar conta
POST   /api/auth/login        # Fazer login
GET    /api/auth/me           # Perfil do usuário

GET    /api/transactions      # Listar transações
POST   /api/transactions      # Criar transação
PUT    /api/transactions/{id} # Atualizar transação
DELETE /api/transactions/{id} # Remover transação

GET    /api/goals             # Listar metas
POST   /api/goals             # Criar meta
PUT    /api/goals/{id}        # Atualizar meta
DELETE /api/goals/{id}        # Remover meta

GET    /api/envelopes         # Listar caixinhas
POST   /api/envelopes         # Criar caixinha
PUT    /api/envelopes/{id}    # Atualizar caixinha
DELETE /api/envelopes/{id}    # Remover caixinha

GET    /api/categories        # Listar categorias
POST   /api/categories        # Criar categoria

GET    /api/accounts          # Listar contas
POST   /api/accounts          # Criar conta

GET    /api/reports/summary   # Resumo financeiro
GET    /api/reports/cashflow  # Fluxo de caixa
GET    /api/reports/trends    # Análise de tendências
```

## 🔄 Migração dos Dados

### **Script de Migração:**
```python
# backend/migrate_local_data.py
import json
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, Transaction, Goal, Envelope, Category, Account

def migrate_user_data(user_email: str, local_data_file: str):
    db = SessionLocal()
    
    # Load local data
    with open(local_data_file, 'r') as f:
        data = json.load(f)
    
    # Find or create user
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        print("User not found. Please register first.")
        return
    
    # Migrate accounts, categories, transactions, etc.
    # Implementation here...
    
    db.commit()
    db.close()
```

## 🧪 Testes

```bash
# Executar testes
pytest

# Com coverage
pytest --cov=./ --cov-report=html
```

## 📝 Próximos Passos

1. **Implementar routers completos** para cada entidade
2. **Criar autenticação JWT** completa
3. **Migrar stores do frontend** para usar API
4. **Configurar deploy** em produção
5. **Implementar sistema de backup** automático
6. **Adicionar logs** e monitoramento
