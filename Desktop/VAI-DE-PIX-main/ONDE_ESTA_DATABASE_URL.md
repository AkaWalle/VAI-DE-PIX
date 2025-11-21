# 📍 ONDE ESTÁ A URL DO BANCO NO RAILWAY

## 🎯 LOCALIZAÇÃO EXATA DA DATABASE_URL

### OPÇÃO 1: No Serviço PostgreSQL (Recomendado)

1. **Acesse:** https://railway.app
2. **Abra seu projeto** (clique no nome do projeto)
3. **Encontre o serviço PostgreSQL** (geralmente aparece como "Postgres" ou "PostgreSQL")
4. **Clique no serviço PostgreSQL**
5. **Vá na aba "Variables"** (ou "Variables" no menu lateral)
6. **Procure por `DATABASE_URL`** na lista de variáveis
7. **Clique no ícone de "olho" 👁️** ou nos **3 pontinhos** → **"View"**
8. **Copie a URL completa**

**Formato esperado:**
```
postgresql://postgres:senha@containers-us-west-xxx.railway.app:5432/railway
```

---

### OPÇÃO 2: No Serviço do Backend (Referência)

Se você configurou `DATABASE_URL=${{Postgres.DATABASE_URL}}` no backend:

1. **Acesse:** https://railway.app
2. **Abra seu projeto**
3. **Clique no serviço do Backend** (seu serviço FastAPI)
4. **Vá em "Variables"**
5. **Procure por `DATABASE_URL`**
6. **O valor será:** `${{Postgres.DATABASE_URL}}` (referência automática)

**⚠️ IMPORTANTE:** 
- Se você ver `${{Postgres.DATABASE_URL}}`, isso é uma **referência automática**
- O Railway injeta automaticamente a URL real do PostgreSQL
- **NÃO precisa copiar manualmente** se usar essa referência
- Mas se quiser ver a URL real, vá no serviço PostgreSQL (Opção 1)

---

### OPÇÃO 3: DATABASE_PUBLIC_URL (Alternativa)

Se `DATABASE_URL` não funcionar, use `DATABASE_PUBLIC_URL`:

1. **No serviço PostgreSQL**, vá em **"Variables"**
2. **Procure por `DATABASE_PUBLIC_URL`**
3. **Copie essa URL** (é a URL pública, acessível de fora)

---

## 📸 PASSO A PASSO VISUAL

### Passo 1: Dashboard do Railway
```
Railway Dashboard
└── Seu Projeto
    ├── 📦 PostgreSQL (serviço do banco)
    └── 🚀 Backend (serviço da API)
```

### Passo 2: Abrir Serviço PostgreSQL
```
Clique em: 📦 PostgreSQL
    ↓
Aba "Variables" ou "Variables" no menu
    ↓
Lista de variáveis:
    - DATABASE_URL
    - DATABASE_PUBLIC_URL
    - PGHOST
    - PGPORT
    - etc...
```

### Passo 3: Ver/Copiar DATABASE_URL
```
Clique em DATABASE_URL
    ↓
Opções:
    - 👁️ View (ver valor)
    - 📋 Copy (copiar)
    - ✏️ Edit (editar)
```

---

## 🔍 ONDE USAR A URL

### 1. No Railway (Backend Service)

**Se usar referência automática (recomendado):**
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**Se copiar manualmente:**
```env
DATABASE_URL=postgresql://postgres:senha@host:5432/railway
```

**⚠️ LEMBRE-SE:** 
- Remova qualquer `?db_type=postgresql` do final
- Formato limpo: `postgresql://user:pass@host:port/dbname`

---

## 🚨 TROUBLESHOOTING

### Não encontro DATABASE_URL

**Causa:** PostgreSQL não foi criado ainda

**Solução:**
1. No projeto Railway, clique em **"+ New"**
2. Selecione **"Database"** → **"PostgreSQL"**
3. Railway criará automaticamente o banco e a variável `DATABASE_URL`

---

### DATABASE_URL tem parâmetros extras

**Exemplo problemático:**
```
postgresql://user:pass@host:5432/db?db_type=postgresql
```

**Solução:**
1. Copie a URL
2. **Remova tudo após `?`**
3. Formato correto: `postgresql://user:pass@host:5432/db`
4. Cole no Railway

**OU** deixe como está - o código agora remove automaticamente!

---

### URL não funciona

**Teste a conexão:**
```bash
# No shell do Railway (Deployments → 3 pontos → Open in Shell)
cd backend
python -c "from database import engine; engine.connect(); print('✅ Conexão OK!')"
```

**Se der erro:**
- Verifique se PostgreSQL está rodando (status verde)
- Tente usar `DATABASE_PUBLIC_URL` em vez de `DATABASE_URL`
- Verifique se a URL está completa (sem cortes)

---

## ✅ CHECKLIST

- [ ] PostgreSQL criado no Railway
- [ ] Serviço PostgreSQL está com status verde (rodando)
- [ ] Encontrei `DATABASE_URL` em Variables
- [ ] URL está limpa (sem `?db_type=postgresql`)
- [ ] URL copiada corretamente
- [ ] Configurada no serviço do Backend (ou usando `${{Postgres.DATABASE_URL}}`)

---

## 📝 RESUMO

**Onde está:**
- **Serviço PostgreSQL** → **Variables** → **DATABASE_URL**

**Como copiar:**
- Clique em `DATABASE_URL` → **View** ou **Copy**

**Onde usar:**
- No serviço do Backend → Variables → `DATABASE_URL`

**Formato correto:**
```
postgresql://user:password@host:5432/database
```

---

**🎯 Dica:** Use `${{Postgres.DATABASE_URL}}` no backend para referência automática (mais fácil e seguro)!

