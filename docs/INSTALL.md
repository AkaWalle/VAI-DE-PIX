# Guia de instalação — VAI DE PIX

## Setup manual (recomendado)

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/macOS: source venv/bin/activate

pip install -r requirements.txt
pip install -r requirements-test.txt
cp .env.example .env
```

Configure `backend/.env` (PostgreSQL, `SECRET_KEY`, `FRONTEND_URL=http://localhost:5000`).

```bash
alembic upgrade head
python init_db.py
python main.py
```

- API: http://localhost:8000  
- Docs: http://localhost:8000/docs  

### 2. Frontend (outro terminal, na raiz)

```bash
cp env.local.example .env.local
npm install
npm run dev
```

- App: http://localhost:5000  

### Credenciais de teste (após `init_db`)

- Email: `admin@vaidepix.com`  
- Senha: `123456`  

---

## Deploy no Railway (opcional)

```bash
npm install -g @railway/cli
railway login
cd backend && railway init && railway up
cd .. && railway init && railway up
```

---

## PostgreSQL local

```bash
psql -U postgres
CREATE DATABASE vai_de_pix;
CREATE USER vai_de_pix_user WITH PASSWORD 'sua_senha';
GRANT ALL PRIVILEGES ON DATABASE vai_de_pix TO vai_de_pix_user;
```

No `.env`:

```env
DATABASE_URL=postgresql://vai_de_pix_user:sua_senha@localhost:5432/vai_de_pix
SECRET_KEY=<mínimo 32 caracteres>
FRONTEND_URL=http://localhost:5000
```

---

## Verificação

```bash
curl http://localhost:8000/api/health
npm run type-check
npx vitest run tests/basic.spec.ts
cd backend && pytest tests/unit/ -q
```

Documentação completa: [README.md](../README.md)
