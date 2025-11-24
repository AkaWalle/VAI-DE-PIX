# 🚀 Guia de Instalação Rápida - VAI DE PIX

## 🐍 Opção 1: Setup Manual (Recomendado para desenvolvimento)

### 1. **Configurar Backend**

```bash
# Criar ambiente virtual Python
python -m venv venv

# Ativar ambiente (Windows)
venv\Scripts\activate

# Instalar dependências
cd backend
pip install -r requirements.txt

# Configurar banco (SQLite para início)
copy env.example .env
# Edite .env se necessário

# Inicializar banco de dados
python init_db.py

# Executar servidor
python main.py
```

**✅ Backend disponível em: http://localhost:8000**
**📚 Documentação: http://localhost:8000/docs**

### 2. **Frontend (terminal separado)**

```bash
# Instalar dependências
npm install

# Executar desenvolvimento
npm run dev
```

**✅ Frontend disponível em: http://localhost:8080**

### 3. **Credenciais de Teste**
- **Email:** `admin@vaidepix.com`
- **Senha:** `123456`

---

## 🐳 Opção 2: Docker (Setup Automático)

### **Executar tudo com um comando:**

```bash
# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down
```

**Serviços incluídos:**
- 🗄️ **PostgreSQL** - Porta 5432
- 🐍 **FastAPI** - Porta 8000
- ⚛️ **React** - Porta 8080

---

## 🌐 Opção 3: Deploy no Railway

### **Deploy Automático:**

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy backend
cd backend
railway init
railway up

# Deploy frontend
cd ..
railway init
railway up
```

**✅ URLs automáticas geradas pelo Railway**

---

## 🔧 Configurações Avançadas

### **PostgreSQL Local:**

```bash
# Instalar PostgreSQL
# Windows: https://www.postgresql.org/download/

# Criar banco
psql -U postgres
CREATE DATABASE vai_de_pix;
CREATE USER vai_de_pix_user WITH PASSWORD 'sua_senha';
GRANT ALL PRIVILEGES ON DATABASE vai_de_pix TO vai_de_pix_user;

# Atualizar .env
DATABASE_URL=postgresql://vai_de_pix_user:sua_senha@localhost:5432/vai_de_pix
```

### **Variáveis de Ambiente (.env):**

```env
# Banco de dados
DATABASE_URL=sqlite:///./vai_de_pix.db

# Segurança
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Servidor
PORT=8000
DEBUG=True
FRONTEND_URL=http://localhost:8080
```

---

## 📊 Endpoints da API

### **Autenticação:**
- `POST /api/auth/register` - Criar conta
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Perfil do usuário

### **Transações:**
- `GET /api/transactions` - Listar (com filtros)
- `POST /api/transactions` - Criar
- `PUT /api/transactions/{id}` - Atualizar
- `DELETE /api/transactions/{id}` - Remover

### **Metas:**
- `GET /api/goals` - Listar
- `POST /api/goals` - Criar
- `POST /api/goals/{id}/add-value` - Adicionar valor

### **Caixinhas:**
- `GET /api/envelopes` - Listar
- `POST /api/envelopes` - Criar
- `POST /api/envelopes/{id}/add-value` - Adicionar
- `POST /api/envelopes/{id}/withdraw-value` - Retirar

### **Relatórios:**
- `GET /api/reports/summary` - Resumo financeiro
- `GET /api/reports/cashflow` - Fluxo de caixa
- `GET /api/reports/export` - Exportar dados

---

## 🧪 Testes

```bash
# Testar API
curl http://localhost:8000/api/health

# Documentação interativa
# Acesse: http://localhost:8000/docs
```

---

## ⚡ Próximos Passos

1. **Executar backend:** `python backend/main.py`
2. **Executar frontend:** `npm run dev`
3. **Acessar:** http://localhost:8080
4. **Login:** admin@vaidepix.com / 123456
5. **Testar funcionalidades**

**🎉 Sistema completo rodando com banco de dados real!**
