# 🔗 DATABASE_URL DO RAILWAY - CONFIGURAÇÃO

## 📝 SUA URL DO POSTGRESQL

**URL Interna (Railway):**
```
postgresql://postgres:OkqhtgBPqgGnlMHVmBtGhapAMNhZtWDc@postgres.railway.internal:5432/railway
```

---

## ✅ COMO CONFIGURAR NO RAILWAY

### OPÇÃO 1: Referência Automática (RECOMENDADO)

No serviço do **Backend**, em **Variables**, adicione:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**Vantagens:**
- ✅ Automático - Railway injeta a URL correta
- ✅ Atualiza automaticamente se o banco mudar
- ✅ Mais seguro - não expõe credenciais

---

### OPÇÃO 2: URL Manual

Se a referência automática não funcionar, use a URL manual:

No serviço do **Backend**, em **Variables**, adicione:

```env
DATABASE_URL=postgresql://postgres:OkqhtgBPqgGnlMHVmBtGhapAMNhZtWDc@postgres.railway.internal:5432/railway
```

**⚠️ IMPORTANTE:**
- Esta é a URL **interna** do Railway
- Funciona apenas dentro da rede do Railway
- Não use esta URL no Vercel (use `DATABASE_PUBLIC_URL` se disponível)

---

## 🔍 ONDE ENCONTRAR NO RAILWAY

### Método 1: Via Interface Web

1. **Acesse a página de variáveis do seu serviço:**
   ```
   https://railway.com/project/403d6713-86e0-4137-ae91-22422d32e6cd/service/7441b5d4-321e-41e0-afec-055851b9da06/variables?environmentId=06828dff-9390-4b17-becb-e44206b79edf
   ```

2. **Nessa página, procure por `DATABASE_URL` na lista de variáveis**

3. **Clique em `DATABASE_URL` para ver/copiar o valor**

### Método 2: Via Dashboard

1. **Acesse:** https://railway.app
2. **Abra seu projeto**
3. **Clique no serviço PostgreSQL** (Postgres)
4. **Vá em "Variables"**
5. **Procure por `DATABASE_URL`**
6. **Clique para ver/copiar**

---

## 🚨 IMPORTANTE: Limpar Parâmetros

Se a URL tiver parâmetros extras como `?db_type=postgresql`, **REMOVA**:

**❌ ERRADO:**
```
postgresql://postgres:senha@host:5432/railway?db_type=postgresql
```

**✅ CORRETO:**
```
postgresql://postgres:OkqhtgBPqgGnlMHVmBtGhapAMNhZtWDc@postgres.railway.internal:5432/railway
```

**💡 Dica:** O código agora remove automaticamente, mas é melhor garantir que está limpa!

---

## 🧪 TESTAR CONEXÃO

### No Railway (Shell)

1. Railway → Deployments → 3 pontos → Open in Shell
2. Execute:

```bash
cd backend
python -c "from database import engine; conn = engine.connect(); print('✅ Conexão OK!'); conn.close()"
```

### Via Health Check

```bash
curl https://seu-backend.up.railway.app/api/health
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

## 📋 CHECKLIST

- [ ] PostgreSQL criado no Railway
- [ ] `DATABASE_URL` encontrada em Variables do PostgreSQL
- [ ] URL copiada (ou usando `${{Postgres.DATABASE_URL}}`)
- [ ] URL limpa (sem `?db_type=postgresql`)
- [ ] Configurada no serviço do Backend
- [ ] Health check retorna `database: "connected"`

---

## 🔐 SEGURANÇA

**⚠️ NUNCA:**
- Compartilhe a URL com credenciais publicamente
- Faça commit da URL no Git
- Use a URL interna no Vercel (use `DATABASE_PUBLIC_URL`)

**✅ SEMPRE:**
- Use `${{Postgres.DATABASE_URL}}` quando possível
- Mantenha credenciais em variáveis de ambiente
- Use URLs públicas apenas quando necessário

---

## 🎯 RESUMO

**Sua URL:**
```
postgresql://postgres:OkqhtgBPqgGnlMHVmBtGhapAMNhZtWDc@postgres.railway.internal:5432/railway
```

**Configuração recomendada:**
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**Configuração manual (se necessário):**
```env
DATABASE_URL=postgresql://postgres:OkqhtgBPqgGnlMHVmBtGhapAMNhZtWDc@postgres.railway.internal:5432/railway
```

---

**✅ Pronto! Use essa URL para configurar o backend no Railway!**

