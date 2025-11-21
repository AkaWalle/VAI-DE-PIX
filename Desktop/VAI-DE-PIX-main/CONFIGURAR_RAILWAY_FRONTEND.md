# 🚀 CONFIGURAR FRONTEND PARA BACKEND NO RAILWAY

## ✅ STATUS: CONFIGURAÇÃO COMPLETA!

O frontend está **100% configurado** para apontar para o backend no Railway.

## 📋 O QUE FOI FEITO

✅ **Atualizado `env.local.example`** - Com instruções para Railway  
✅ **Ajustado `src/lib/api.ts`** - Usa `VITE_API_URL` em produção  
✅ **Atualizado `README.md`** - Com instruções completas  
✅ **Código pronto** - Frontend detecta e usa a URL do Railway automaticamente

## 🎯 PRÓXIMOS PASSOS (VOCÊ)

### 1. Obter URL do Backend no Railway

1. Acesse: https://railway.app
2. Encontre o serviço do backend
3. Copie a URL pública (formato: `https://seu-backend.up.railway.app`)
   - Exemplo: `https://vai-de-pix-production.up.railway.app`

### 2. Configurar no Vercel

#### Opção A: Via Dashboard (Recomendado)

1. Acesse: https://vercel.com/akawalles-projects/vai-de-pix/settings/environment-variables
2. Clique em **"+ Add New"**
3. Configure:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://seu-backend.up.railway.app/api` (substitua pela URL real)
   - **Environment:** ✅ Production, ✅ Preview, ✅ Development
4. Clique em **"Save"**

#### Opção B: Via CLI

```bash
# Adicionar para produção
vercel env add VITE_API_URL production
# Cole: https://seu-backend.up.railway.app/api

# Adicionar para preview
vercel env add VITE_API_URL preview
# Cole: https://seu-backend.up.railway.app/api

# Adicionar para development
vercel env add VITE_API_URL development
# Cole: https://seu-backend.up.railway.app/api
```

### 3. Fazer Re-deploy

Após adicionar a variável:

```bash
# Via CLI
vercel --prod --yes

# Ou via Dashboard
# Vá em Deployments → Clique nos 3 pontos → Redeploy
```

### 4. Testar

1. **Acesse o frontend no Vercel:**
   - URL: https://vai-de-ewqbjdazj-akawalles-projects.vercel.app

2. **Abra o Console do navegador (F12):**
   - Verifique se não há erros de CORS
   - Verifique se as requisições estão indo para o Railway

3. **Teste Login/Registro:**
   - Tente criar uma conta
   - Tente fazer login
   - Verifique se os dados aparecem no banco do Railway

## 🔍 VERIFICAÇÃO

### Como verificar se está funcionando:

1. **Console do navegador (F12):**
   - Network tab → Procure requisições para `/api/auth/register` ou `/api/auth/login`
   - Deve mostrar a URL do Railway na requisição

2. **Teste de Health:**
   - Acesse: `https://seu-backend.up.railway.app/api/health`
   - Deve retornar: `{"status": "healthy", ...}`

3. **Teste de Registro:**
   - No frontend, tente criar uma conta
   - Verifique no Railway se o usuário foi criado no banco

## 📝 EXEMPLO DE CONFIGURAÇÃO

**Variável no Vercel:**
```
Name: VITE_API_URL
Value: https://vai-de-pix-production.up.railway.app/api
Environments: Production, Preview, Development
```

**Resultado:**
- Frontend no Vercel → Chama → Backend no Railway → PostgreSQL no Railway
- ✅ Tudo conectado e funcionando!

## 🚨 TROUBLESHOOTING

### Erro de CORS:
- Verifique se o backend no Railway tem `FRONTEND_URL` configurado com a URL do Vercel
- Exemplo: `FRONTEND_URL=https://vai-de-ewqbjdazj-akawalles-projects.vercel.app`

### Frontend não conecta ao backend:
- Verifique se `VITE_API_URL` está configurada no Vercel
- Verifique se a URL está correta (deve terminar com `/api`)
- Faça re-deploy após adicionar a variável

### Erro 404 nas requisições:
- Verifique se a URL do backend está correta
- Teste a URL diretamente: `https://seu-backend.up.railway.app/api/health`

## ✅ CHECKLIST FINAL

- [ ] URL do backend copiada do Railway
- [ ] `VITE_API_URL` configurada no Vercel (Production, Preview, Development)
- [ ] Re-deploy feito no Vercel
- [ ] Frontend acessível
- [ ] Console do navegador sem erros
- [ ] Login/Registro funcionando
- [ ] Dados aparecendo no banco do Railway

## 🎉 PRONTO!

Após seguir estes passos, seu app estará **100% funcional** com:
- ✅ Frontend no Vercel
- ✅ Backend no Railway
- ✅ PostgreSQL no Railway
- ✅ Tudo conectado e funcionando!

---

**Dúvidas?** Consulte o `README.md` para mais detalhes.

