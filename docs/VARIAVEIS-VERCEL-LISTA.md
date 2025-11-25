# 📋 Variáveis de Ambiente para o Vercel

## ✅ VARIÁVEIS QUE DEVEM IR PARA O VERCEL

### 🔴 OBRIGATÓRIAS (6 variáveis)

#### 1. **DATABASE_URL** ⚠️ CRÍTICA
```
postgresql://postgres:OkqhtgBPqgGnlMHVmBtGhapAMNhZtWDc@tramway.proxy.rlwy.net:52632/railway
```
- ✅ **COLOCAR NO VERCEL**: SIM
- **Ambientes**: Production, Preview, Development

#### 2. **SECRET_KEY** ⚠️ CRÍTICA
```
j_vkLtaI369fMnQgjP6Qpv0G-UTJ3KJFD8KoO-Ut-1c
```
- ✅ **COLOCAR NO VERCEL**: SIM
- **Ambientes**: Production, Preview, Development

#### 3. **ALGORITHM**
```
HS256
```
- ✅ **COLOCAR NO VERCEL**: SIM
- **Ambientes**: Production, Preview, Development

#### 4. **ACCESS_TOKEN_EXPIRE_MINUTES**
```
30
```
- ✅ **COLOCAR NO VERCEL**: SIM
- **Ambientes**: Production, Preview, Development

#### 5. **FRONTEND_URL** ⚠️ IMPORTANTE
```
https://vai-de-pix.vercel.app
```
- ✅ **COLOCAR NO VERCEL**: SIM
- **⚠️ ATENÇÃO**: Substitua pela URL REAL do seu projeto no Vercel!
- **Como descobrir**: Dashboard Vercel → Seu Projeto → Domains
- **Ambientes**: Production, Preview, Development

#### 6. **VITE_API_URL** ⚠️ CRÍTICA PARA FRONTEND
```
https://vai-de-pix.vercel.app/api
```
- ✅ **COLOCAR NO VERCEL**: SIM
- **⚠️ ATENÇÃO**: 
  - Substitua pela URL REAL do seu projeto
  - Deve terminar em `/api`
  - Se backend está no Vercel: `https://seu-projeto.vercel.app/api`
  - Se backend está no Railway: `https://seu-backend.up.railway.app/api`
- **Ambientes**: Production, Preview, Development

---

### 🟡 OPCIONAIS MAS RECOMENDADAS (5 variáveis)

#### 7. **ENVIRONMENT**
```
production
```
- ✅ **COLOCAR NO VERCEL**: SIM (opcional)
- **Ambientes**: Production

#### 8. **LOG_LEVEL**
```
INFO
```
- ✅ **COLOCAR NO VERCEL**: SIM (opcional)
- **Ambientes**: Production, Preview, Development

#### 9. **FRONTEND_URL_PRODUCTION**
```
https://vai-de-pix.vercel.app
```
- ✅ **COLOCAR NO VERCEL**: SIM (opcional)
- **⚠️ ATENÇÃO**: Substitua pela URL REAL do seu projeto
- **Ambientes**: Production

#### 10. **ENABLE_RECURRING_JOBS**
```
false
```
- ✅ **COLOCAR NO VERCEL**: SIM (opcional)
- **Motivo**: Serverless não suporta schedulers
- **Ambientes**: Production

#### 11. **PYTHON_VERSION**
```
3.11
```
- ✅ **COLOCAR NO VERCEL**: SIM (opcional)
- **Ambientes**: Production

---

### 🟢 VARIÁVEIS DO FRONTEND (3 variáveis)

#### 12. **VITE_APP_NAME**
```
VAI DE PIX
```
- ✅ **COLOCAR NO VERCEL**: SIM
- **Ambientes**: Production, Preview, Development

#### 13. **VITE_APP_VERSION**
```
1.1.1
```
- ✅ **COLOCAR NO VERCEL**: SIM (opcional)
- **Ambientes**: Production, Preview, Development

#### 14. **VITE_DEBUG**
```
false
```
- ✅ **COLOCAR NO VERCEL**: SIM (opcional)
- **⚠️ ATENÇÃO**: Use `false` em produção, `true` apenas em desenvolvimento
- **Ambientes**: Development (não colocar em Production!)

---

## ❌ VARIÁVEIS QUE NÃO DEVEM IR PARA O VERCEL

### 🚫 Apenas para Desenvolvimento Local

#### **PORT**
```
8000
```
- ❌ **NÃO COLOCAR**: Serverless não usa porta fixa

#### **HOST**
```
0.0.0.0
```
- ❌ **NÃO COLOCAR**: Serverless não usa host fixo

#### **DEBUG**
```
True
```
- ❌ **NÃO COLOCAR**: Use `LOG_LEVEL=INFO` em produção

---

## 📝 RESUMO RÁPIDO

### ✅ COLOCAR NO VERCEL (11 variáveis obrigatórias + opcionais):

```env
# OBRIGATÓRIAS
DATABASE_URL=postgresql://postgres:OkqhtgBPqgGnlMHVmBtGhapAMNhZtWDc@tramway.proxy.rlwy.net:52632/railway
SECRET_KEY=j_vkLtaI369fMnQgjP6Qpv0G-UTJ3KJFD8KoO-Ut-1c
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_URL=https://vai-de-pix.vercel.app
VITE_API_URL=https://vai-de-pix.vercel.app/api

# OPCIONAIS MAS RECOMENDADAS
ENVIRONMENT=production
LOG_LEVEL=INFO
FRONTEND_URL_PRODUCTION=https://vai-de-pix.vercel.app
ENABLE_RECURRING_JOBS=false
PYTHON_VERSION=3.11

# FRONTEND
VITE_APP_NAME=VAI DE PIX
VITE_APP_VERSION=1.1.1
VITE_DEBUG=false
```

### ❌ NÃO COLOCAR NO VERCEL:

- `PORT` (não necessário em serverless)
- `HOST` (não necessário em serverless)
- `DEBUG=True` (use `LOG_LEVEL=INFO`)

---

## 🎯 CHECKLIST PARA CONFIGURAR NO VERCEL

1. ✅ Acesse: https://vercel.com/dashboard
2. ✅ Selecione seu projeto
3. ✅ Vá em: **Settings** → **Environment Variables**
4. ✅ Adicione cada variável da lista acima
5. ✅ Marque os ambientes: **Production**, **Preview**, **Development**
6. ✅ **⚠️ IMPORTANTE**: Substitua `vai-de-pix.vercel.app` pela URL REAL do seu projeto!
7. ✅ Salve e faça um novo deploy

---

## 🔍 COMO DESCOBRIR A URL DO SEU PROJETO

1. Acesse: https://vercel.com/dashboard
2. Clique no seu projeto
3. Vá em **Settings** → **Domains**
4. Copie a URL que aparece (ex: `vai-de-pix-abc123.vercel.app`)
5. Use essa URL em `FRONTEND_URL` e `VITE_API_URL`

---

## ⚠️ ATENÇÕES IMPORTANTES

1. **URLs devem ser reais**: Não use `vai-de-pix.vercel.app`, use a URL real do seu projeto
2. **VITE_API_URL deve terminar em `/api`**: Ex: `https://seu-projeto.vercel.app/api`
3. **VITE_DEBUG deve ser `false` em produção**: Não coloque `true` em Production
4. **SECRET_KEY deve ser única**: Não compartilhe a mesma chave entre projetos
5. **DATABASE_URL deve ter `?sslmode=require`**: Se não tiver, adicione no final

---

**Última atualização**: 2025-01-24

