# 🔧 Solução para Erro 404 na API no Vercel

## 🔍 Problema Identificado

Todos os endpoints da API estão retornando **404: NOT_FOUND**:
- `/api/health` → 404
- `/api/docs` → 404
- `/api/auth/register` → 404

## ✅ Solução Aplicada

### 1. Correção do `vercel.json`

O problema estava na configuração do `vercel.json`. A configuração foi ajustada para:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index"
    },
    {
      "source": "/((?!api).*)",
      "destination": "/index.html"
    }
  ],
  "functions": {
    "api/index.py": {
      "runtime": "python3.9",
      "includeFiles": "backend/**"
    }
  }
}
```

**Mudanças importantes:**
- ✅ Removido o `.py` do destino do rewrite (agora é `/api/index` em vez de `/api/index.py`)
- ✅ Configuração específica da função `api/index.py` no `functions`

### 2. Verificação do `api/index.py`

O arquivo `api/index.py` está correto e exporta o handler:

```python
handler = Mangum(app, lifespan="off")
```

---

## 📋 Próximos Passos

### 1. Fazer Commit e Push

```powershell
git add vercel.json api/index.py
git commit -m "fix: corrigir configuração do Vercel para API serverless"
git push
```

### 2. Aguardar Deploy no Vercel

O Vercel fará o deploy automaticamente após o push.

### 3. Verificar Logs do Deploy

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Deployments**
4. Clique no último deploy
5. Verifique os **Logs** para ver se há erros

### 4. Testar Novamente

Após o deploy, teste estas URLs:

- ✅ **API Health**: `https://vai-de-pix.vercel.app/api/health`
- ✅ **API Docs**: `https://vai-de-pix.vercel.app/api/docs`
- ✅ **API Root**: `https://vai-de-pix.vercel.app/api`

---

## 🔍 Se Ainda Não Funcionar

### Verificação 1: Logs do Vercel

1. Acesse os logs do deploy no Vercel
2. Procure por erros relacionados a:
   - Python runtime
   - Dependências não encontradas
   - Imports falhando
   - Banco de dados

### Verificação 2: Estrutura de Arquivos

Certifique-se de que estes arquivos existem:

```
projeto/
├── api/
│   ├── index.py          ✅ Handler serverless
│   └── requirements.txt  ✅ Dependências Python
├── backend/              ✅ Código Python
│   ├── routers/
│   ├── models.py
│   ├── database.py
│   └── ...
├── vercel.json           ✅ Configuração do Vercel
└── package.json          ✅ Dependências Node
```

### Verificação 3: Variáveis de Ambiente

Certifique-se de que todas as variáveis estão configuradas:

- ✅ `DATABASE_URL`
- ✅ `SECRET_KEY`
- ✅ `ALGORITHM`
- ✅ `ACCESS_TOKEN_EXPIRE_MINUTES`
- ✅ `FRONTEND_URL`
- ✅ `VITE_API_URL`

### Verificação 4: Runtime Python

O Vercel pode estar usando uma versão diferente do Python. Verifique nos logs qual versão está sendo usada.

Se necessário, ajuste no `vercel.json`:

```json
{
  "functions": {
    "api/index.py": {
      "runtime": "python3.11",  // ou python3.10, python3.12
      "includeFiles": "backend/**"
    }
  }
}
```

---

## 🆘 Solução Alternativa: Usar Estrutura de Pastas do Vercel

Se o problema persistir, tente usar a estrutura de pastas padrão do Vercel:

### Opção 1: Mover para `api/` com subpastas

```
api/
├── index.py
└── requirements.txt
```

### Opção 2: Usar `api/` como função catch-all

Criar um arquivo `api/[...path].py` para capturar todas as rotas:

```python
# api/[...path].py
from api.index import handler
```

Mas isso requer ajustar a estrutura.

---

## 📝 Notas Importantes

1. **O Vercel detecta automaticamente** arquivos Python em `api/` como funções serverless
2. **O rewrite** redireciona `/api/*` para `/api/index`
3. **O Mangum** converte o evento do Vercel para o formato do FastAPI
4. **O FastAPI** processa as rotas normalmente

---

## 🎉 Após a Correção

Se tudo estiver correto, você deve conseguir:

- ✅ Acessar `/api/health` e receber `{"status": "healthy", "database": "connected"}`
- ✅ Acessar `/api/docs` e ver a documentação Swagger
- ✅ Acessar `/api/auth/register` e criar contas
- ✅ Todas as rotas da API funcionando

---

## 📚 Recursos Úteis

- [Documentação Vercel - Serverless Functions](https://vercel.com/docs/functions)
- [Mangum Documentation](https://mangum.io/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

