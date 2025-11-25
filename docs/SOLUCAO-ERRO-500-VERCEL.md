# 🔧 Solução para Erro 500 no Vercel

## ❌ Erro Encontrado

```
500: INTERNAL_SERVER_ERROR
Code: FUNCTION_INVOCATION_FAILED
```

## ✅ Correções Aplicadas

### 1. **vercel.json Atualizado**

O arquivo `vercel.json` foi atualizado para incluir a configuração das serverless functions Python:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "api/**/*.py": {
      "runtime": "python3.9"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.py"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2. **Verificações Necessárias**

#### ✅ Variáveis de Ambiente

Certifique-se de que todas as variáveis estão configuradas no Vercel:

- `DATABASE_URL` - Connection string PostgreSQL
- `SECRET_KEY` - Chave secreta (32+ caracteres)
- `ALGORITHM` - `HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES` - `30`
- `FRONTEND_URL` - URL do frontend
- `VITE_API_URL` - URL da API
- `ENVIRONMENT` - `production`
- `LOG_LEVEL` - `INFO`

#### ✅ Dependências Python

Verifique se `api/requirements.txt` contém todas as dependências:

```txt
fastapi==0.104.1
mangum==0.17.0
sqlalchemy==1.4.53
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
python-dotenv==1.0.0
pydantic==2.9.2
httpx==0.25.2
bcrypt==4.1.2
alembic==1.13.1
email-validator==2.3.0
requests==2.32.5
psycopg2-binary==2.9.9
```

#### ✅ Estrutura de Arquivos

Certifique-se de que a estrutura está correta:

```
/
├── api/
│   ├── index.py          # Serverless function handler
│   ├── requirements.txt  # Dependências Python
│   └── vercel.json       # Configuração Python
├── backend/              # Código do backend
├── vercel.json           # Configuração principal
└── ...
```

## 🚀 Próximos Passos

### 1. Fazer Commit e Push

```bash
git add vercel.json
git commit -m "fix: configurar serverless functions Python no Vercel"
git push
```

### 2. Aguardar Deploy Automático

O Vercel fará deploy automaticamente após o push.

### 3. Verificar Logs

Se ainda houver erro, verifique os logs:

```bash
vercel logs https://seu-projeto.vercel.app
```

### 4. Testar Endpoints

Após o deploy, teste:

- **Health Check**: `https://seu-projeto.vercel.app/api/health`
- **API Root**: `https://seu-projeto.vercel.app/api`
- **Docs**: `https://seu-projeto.vercel.app/api/docs`

## 🔍 Problemas Comuns

### Erro: "Module not found"

**Solução**: Verifique se todas as dependências estão em `api/requirements.txt`

### Erro: "Database connection failed"

**Solução**: 
1. Verifique se `DATABASE_URL` está configurada no Vercel
2. Verifique se a connection string está correta
3. Verifique se o banco está acessível

### Erro: "Import error"

**Solução**: Verifique se os imports em `api/index.py` estão corretos e se o caminho do backend está correto.

## 📝 Checklist Final

- [ ] `vercel.json` atualizado com configuração Python
- [ ] Todas as variáveis de ambiente configuradas
- [ ] `api/requirements.txt` completo
- [ ] `api/index.py` existe e está correto
- [ ] Commit e push realizados
- [ ] Deploy concluído
- [ ] Endpoints testados

---

**Última atualização**: 2025-01-24

