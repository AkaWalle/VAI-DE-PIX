# 🔧 Resolver Projetos Duplicados no Vercel

## ⚠️ Problema Identificado

Você está vendo **duas pastas** no Vercel:
1. **"VAI DE PIX"** - Pasta antiga (não recebe atualizações)
2. **"VAI-DE-PIX-main"** - Pasta atual (recebe atualizações)

Isso pode causar confusão e problemas de deploy.

---

## 🔍 Como Verificar Qual Projeto Está Ativo

### 1. Verificar no Vercel Dashboard

1. Acesse: https://vercel.com/dashboard
2. Veja qual projeto tem **deploys recentes**
3. Veja qual projeto tem **commits mais recentes**

### 2. Verificar URL do Projeto

O projeto correto deve ter a URL:
- ✅ `https://vai-de-pix.vercel.app` (ou similar)

### 3. Verificar Deploys

1. Vá em cada projeto
2. Veja em **Deployments**
3. O projeto com **deploys mais recentes** é o ativo

---

## ✅ Solução: Usar Apenas Um Projeto

### Opção 1: Manter "VAI-DE-PIX-main" (Recomendado)

Se "VAI-DE-PIX-main" está recebendo os commits:

1. **Verifique se é o projeto correto**:
   - Tem deploys recentes?
   - Tem a URL correta?
   - Tem as variáveis de ambiente configuradas?

2. **Se for o correto**:
   - ✅ Continue usando este projeto
   - ❌ Delete ou ignore o projeto "VAI DE PIX"

### Opção 2: Renomear o Projeto

1. No Vercel Dashboard:
   - Vá em **Settings** → **General**
   - Renomeie o projeto para **"vai-de-pix"** (sem espaços)
   - Isso evita confusão

### Opção 3: Conectar ao Projeto Correto

Se você quer usar "VAI DE PIX" em vez de "VAI-DE-PIX-main":

1. **No Vercel Dashboard**:
   - Vá em **Settings** → **Git**
   - Verifique qual repositório está conectado
   - Se estiver conectado ao repositório errado, desconecte

2. **Conecte ao repositório correto**:
   - Vá em **Settings** → **Git**
   - Clique em **Connect Git Repository**
   - Selecione o repositório correto: `AkaWalle/VAI-DE-PIX`

---

## 🔧 Verificar Configuração do Git

### Verificar Remote do Git

Execute no terminal:
```powershell
git remote -v
```

Deve mostrar:
```
origin  https://github.com/AkaWalle/VAI-DE-PIX.git (fetch)
origin  https://github.com/AkaWalle/VAI-DE-PIX.git (push)
```

### Se o Remote Estiver Errado

1. **Remover remote atual**:
   ```powershell
   git remote remove origin
   ```

2. **Adicionar remote correto**:
   ```powershell
   git remote add origin https://github.com/AkaWalle/VAI-DE-PIX.git
   ```

3. **Verificar**:
   ```powershell
   git remote -v
   ```

---

## 🎯 Passos Recomendados

### 1. Identificar o Projeto Ativo

- ✅ Qual projeto tem deploys recentes?
- ✅ Qual projeto tem a URL correta?
- ✅ Qual projeto tem variáveis de ambiente configuradas?

### 2. Verificar Configuração

- ✅ Verificar se o Git está conectado ao repositório correto
- ✅ Verificar se o Vercel está fazendo deploy do branch correto
- ✅ Verificar se as variáveis de ambiente estão configuradas

### 3. Limpar Projetos Duplicados

- ❌ **Delete o projeto antigo** que não está recebendo atualizações
- ✅ **Mantenha apenas o projeto ativo**

### 4. Renomear o Projeto (Opcional)

- ✅ Renomeie para **"vai-de-pix"** (sem espaços, tudo minúsculo)
- ✅ Isso evita confusão e problemas

---

## 🔍 Verificar Qual Projeto Está Recebendo Commits

### No Vercel Dashboard:

1. **Vá em cada projeto**
2. **Veja em Deployments**:
   - Qual tem commits mais recentes?
   - Qual tem deploys mais recentes?

3. **Veja em Settings → Git**:
   - Qual repositório está conectado?
   - Qual branch está configurado?

---

## ⚠️ Problemas Comuns

### Problema 1: Dois Projetos Conectados ao Mesmo Repositório

**Solução**:
- ✅ Mantenha apenas um projeto conectado
- ❌ Delete ou desconecte o outro

### Problema 2: Projeto Antigo Não Recebe Atualizações

**Solução**:
- ✅ Verifique se está conectado ao repositório correto
- ✅ Verifique se o branch está configurado corretamente
- ❌ Se não for necessário, delete o projeto antigo

### Problema 3: Nomes Diferentes Causam Confusão

**Solução**:
- ✅ Renomeie o projeto para um nome consistente
- ✅ Use **"vai-de-pix"** (sem espaços, tudo minúsculo)

---

## 📝 Checklist

- [ ] Identificar qual projeto está ativo
- [ ] Verificar se está conectado ao repositório correto
- [ ] Verificar se está fazendo deploy do branch correto
- [ ] Verificar se as variáveis de ambiente estão configuradas
- [ ] Renomear o projeto para evitar confusão
- [ ] Delete o projeto antigo (se não for necessário)

---

## 🆘 Se Precisar de Ajuda

1. **Verifique no Vercel Dashboard**:
   - Qual projeto tem deploys recentes?
   - Qual projeto tem a URL correta?

2. **Verifique o Git**:
   - Qual repositório está conectado?
   - Qual branch está configurado?

3. **Teste os deploys**:
   - Faça um commit
   - Veja qual projeto recebe o deploy

---

## ✅ Resumo

- ⚠️ **Dois projetos** podem causar confusão
- ✅ **Mantenha apenas um** projeto ativo
- ✅ **Renomeie** para evitar confusão
- ✅ **Delete** o projeto antigo se não for necessário

