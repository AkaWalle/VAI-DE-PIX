# 🔍 Como Verificar os Testes do GitHub Actions

## 📍 Acessar o GitHub Actions

### 1. Via Navegador (Recomendado)

1. Acesse: **https://github.com/AkaWalle/VAI-DE-PIX/actions**
2. Você verá uma lista de todas as execuções do workflow
3. Clique na execução mais recente (a do topo)

### 2. Via Interface do GitHub

1. No repositório, clique na aba **"Actions"** (no topo)
2. No menu lateral, selecione **"Test and Deploy"**
3. Veja todas as execuções do workflow

---

## 📊 Entendendo a Interface

### Status dos Jobs

Cada job aparece com um ícone:
- 🟡 **Amarelo (em execução)** - Job rodando
- ✅ **Verde** - Job passou com sucesso
- ❌ **Vermelho** - Job falhou
- ⚪ **Cinza** - Job não executado (aguardando dependências)

### Jobs do Workflow

1. **Lint** - Verifica código (ESLint, TypeScript, Python)
2. **Test Backend** - Testes Python com cobertura
3. **Test Frontend** - Testes Vitest com cobertura
4. **Test E2E** - Testes Playwright
5. **Deploy** - Deploy para Vercel (só roda se todos passarem)

---

## 🔍 Ver Detalhes de um Job

1. Clique no job que deseja ver (ex: "Test Backend")
2. Você verá todos os **steps** (etapas) do job
3. Clique em um step para ver os logs completos

### Exemplo de Logs

```
✓ Install dependencies
✓ Run tests with coverage
✓ Upload coverage to Codecov
```

---

## 🐛 Se um Teste Falhar

### 1. Ver o Erro

1. Clique no job que falhou (ícone vermelho ❌)
2. Expanda o step que falhou
3. Leia a mensagem de erro no final dos logs

### 2. Erros Comuns

#### Backend
- **Dependências faltando**: Adicione em `requirements-test.txt`
- **Teste falhando**: Veja o traceback no log
- **Cobertura baixa**: Adicione mais testes

#### Frontend
- **Dependências faltando**: Execute `npm install`
- **TypeScript errors**: Corrija os erros de tipo
- **Testes falhando**: Veja o output do Vitest

#### E2E
- **Playwright não instalado**: O workflow instala automaticamente
- **Timeout**: Aumente o timeout no `playwright.config.ts`
- **Backend não iniciou**: Verifique se o backend está rodando

---

## 📈 Ver Cobertura

### Codecov

1. Após os testes rodarem, acesse: **https://codecov.io/gh/AkaWalle/VAI-DE-PIX**
2. Veja a cobertura por arquivo
3. Veja o histórico de cobertura

### Relatórios HTML (Local)

Para ver relatórios HTML localmente:

```bash
# Backend
cd backend
pytest tests/ --cov=backend --cov-report=html
# Abra: backend/htmlcov/index.html

# Frontend
npm run test:coverage
# Abra: coverage/index.html
```

---

## 🔔 Notificações

### Email

O GitHub envia email quando:
- ✅ Todos os testes passam
- ❌ Algum teste falha
- 🔄 Um workflow é cancelado

### Configurar Notificações

1. Vá em **Settings** → **Notifications**
2. Configure notificações de Actions

---

## 🚀 Verificar Deploy

### Se Deploy Passou

1. No workflow, veja o job **"Deploy"**
2. Se estiver verde ✅, o deploy foi feito
3. Acesse o link do Vercel no log do deploy

### Se Deploy Falhou

1. Veja o erro no log do job "Deploy"
2. Verifique se os secrets estão configurados:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

---

## 📱 Via CLI (GitHub CLI)

Se tiver `gh` instalado:

```bash
# Ver workflows
gh workflow list

# Ver execuções recentes
gh run list

# Ver detalhes da última execução
gh run view

# Ver logs de um job específico
gh run view --log
```

---

## 🎯 Checklist de Verificação

Após cada push, verifique:

- [ ] Workflow iniciou (aparece na lista)
- [ ] Job "Lint" passou ✅
- [ ] Job "Test Backend" passou ✅
- [ ] Job "Test Frontend" passou ✅
- [ ] Job "Test E2E" passou ✅
- [ ] Job "Deploy" passou ✅ (se for branch main)
- [ ] Cobertura foi enviada para Codecov

---

## 🔗 Links Úteis

- **GitHub Actions**: https://github.com/AkaWalle/VAI-DE-PIX/actions
- **Codecov**: https://codecov.io/gh/AkaWalle/VAI-DE-PIX
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## 💡 Dicas

1. **Sempre verifique os logs** se algo falhar
2. **Execute testes localmente** antes de fazer push
3. **Use `make test`** para rodar tudo localmente
4. **Mantenha cobertura alta** (>90% backend, >85% frontend)

---

**✅ Agora você sabe como verificar os testes do GitHub Actions!**

