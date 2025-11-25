# 🔧 Correção do Deploy Vercel - Backend Serverless

## ✅ Problemas Corrigidos

### 1. **api/index.py** - Imports Robustos
- ✅ Adicionado tratamento de erros completo
- ✅ Configuração correta de paths e working directory
- ✅ Health check básico adicionado (`/api/health`)
- ✅ Handler Mangum configurado corretamente com `lifespan="off"`

### 2. **requirements.txt** (Raiz)
- ✅ Criado arquivo completo na raiz com todas as dependências
- ✅ Incluído `mangum==0.17.0` para serverless
- ✅ Versões fixas para compatibilidade
- ✅ Removido `uvicorn` e `waitress` (não necessários em serverless)

### 3. **vercel.json** - Configuração Python
- ✅ Adicionado `functions` com runtime Python 3.11
- ✅ Configurado `PYTHON_VERSION=3.11` em env
- ✅ Mantidas rotas de rewrite para `/api/*`

## 📋 Variáveis de Ambiente no Vercel

Configure as seguintes variáveis no painel do Vercel:

### Variáveis Obrigatórias:

1. **DATABASE_URL**
   - Valor: URL do PostgreSQL do Railway
   - Exemplo: `postgresql://user:password@host:port/database`
   - Como obter: Painel Railway → Database → Connect → PostgreSQL URL

2. **SECRET_KEY**
   - Valor: Chave secreta para JWT (gerar com: `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
   - Exemplo: `sua-chave-secreta-aqui-32-caracteres`

3. **ENVIRONMENT**
   - Valor: `production`
   - Define ambiente de produção

4. **ENABLE_RECURRING_JOBS**
   - Valor: `false`
   - Desabilita scheduler (não funciona em serverless)

### Variáveis Opcionais (mas recomendadas):

5. **FRONTEND_URL**
   - Valor: URL do seu frontend no Vercel
   - Exemplo: `https://seu-projeto.vercel.app`

6. **FRONTEND_URL_PRODUCTION**
   - Valor: URL alternativa do frontend (se houver)

### Como Configurar no Vercel:

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Adicione cada variável:
   - **Name**: Nome da variável (ex: `DATABASE_URL`)
   - **Value**: Valor da variável
   - **Environment**: Selecione `Production`, `Preview`, e `Development`
5. Clique em **Save**

## 🚀 Comandos para Deploy

### 1. Testar Localmente (Opcional mas Recomendado)

```bash
# Instalar Vercel CLI (se ainda não tiver)
npm i -g vercel

# Testar localmente
vercel dev
```

Acesse:
- Frontend: http://localhost:3000
- API Health: http://localhost:3000/api/health
- API Docs: http://localhost:3000/api/docs

### 2. Deploy para Produção

```bash
# Fazer commit das alterações
git add .
git commit -m "fix: corrige deploy Vercel serverless - backend FastAPI"

# Push para triggerar deploy automático
git push origin main
```

Ou deploy manual:

```bash
vercel --prod
```

## ✅ Checklist de Teste Pós-Deploy

Após o deploy, teste os seguintes endpoints:

### 1. Health Check
```bash
curl https://seu-projeto.vercel.app/api/health
```
**Esperado**: `{"status": "healthy", "service": "VAI DE PIX API", ...}`

### 2. API Root
```bash
curl https://seu-projeto.vercel.app/api
```
**Esperado**: `{"message": "VAI DE PIX API", "version": "1.0.0", ...}`

### 3. Documentação
```bash
# Abrir no navegador
https://seu-projeto.vercel.app/api/docs
```
**Esperado**: Swagger UI carregando

### 4. Teste de Autenticação
```bash
# Registrar usuário
curl -X POST https://seu-projeto.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Teste", "email": "teste@example.com", "password": "senha123"}'
```

### 5. Verificar Logs no Vercel
1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Deployments** → Clique no último deploy
4. Vá em **Functions** → `api/index.py`
5. Verifique se não há erros

## 🔍 Troubleshooting

### Erro 500 em todas as rotas `/api/*`

**Possíveis causas:**
1. ❌ Variáveis de ambiente não configuradas
   - ✅ Verifique se `DATABASE_URL` está configurada
   - ✅ Verifique se `SECRET_KEY` está configurada

2. ❌ Dependências faltando
   - ✅ Verifique se `requirements.txt` está na raiz
   - ✅ Verifique logs do build no Vercel

3. ❌ Erro de import
   - ✅ Verifique logs em **Functions** → `api/index.py`
   - ✅ O erro deve mostrar o traceback completo

### Erro: "ModuleNotFoundError"

**Solução:**
- Verifique se todas as dependências estão em `requirements.txt` na raiz
- Verifique se o runtime está configurado como Python 3.11 no `vercel.json`

### Erro: "DATABASE_URL not found"

**Solução:**
- Configure `DATABASE_URL` nas variáveis de ambiente do Vercel
- Certifique-se de que está configurada para **Production**, **Preview** e **Development**

### Frontend carrega mas API retorna 500

**Solução:**
1. Verifique logs do Vercel em **Functions**
2. Verifique se `api/index.py` está na pasta correta
3. Verifique se `vercel.json` tem a configuração de `functions`

## 📝 Estrutura Final

```
projeto/
├── api/
│   └── index.py          # Handler serverless (CORRIGIDO)
├── backend/
│   ├── main.py           # App FastAPI
│   ├── requirements.txt  # Dependências do backend
│   └── ...
├── requirements.txt      # Dependências para Vercel (NOVO)
├── vercel.json           # Config Vercel (ATUALIZADO)
└── ...
```

## 🎯 Próximos Passos

1. ✅ Configure variáveis de ambiente no Vercel
2. ✅ Faça deploy: `git push`
3. ✅ Teste endpoints: `/api/health`, `/api/docs`
4. ✅ Verifique logs se houver erros
5. ✅ Teste autenticação completa

## 📞 Suporte

Se ainda houver problemas:
1. Verifique logs completos no Vercel
2. Teste localmente com `vercel dev`
3. Verifique se todas as variáveis de ambiente estão configuradas
4. Verifique se o `DATABASE_URL` do Railway está acessível

---

**Status**: ✅ Correções aplicadas - Pronto para deploy

