# 🔄 Guia de Reversão de Versão

Este guia explica como voltar para uma versão anterior do projeto caso algo dê errado durante o desenvolvimento de novas funcionalidades.

## 📋 Índice

1. [Verificar Versões Disponíveis](#verificar-versões-disponíveis)
2. [Voltar para uma Versão Específica](#voltar-para-uma-versão-específica)
3. [Criar Branch de Desenvolvimento Seguro](#criar-branch-de-desenvolvimento-seguro)
4. [Reverter Commits Específicos](#reverter-commits-específicos)
5. [Restaurar Arquivos Específicos](#restaurar-arquivos-específicos)
6. [Cenários Comuns](#cenários-comuns)

---

## 🔍 Verificar Versões Disponíveis

### Ver todas as tags (versões)
```bash
git tag -l
```

### Ver histórico de commits
```bash
git log --oneline --graph --all
```

### Ver detalhes de uma versão específica
```bash
git show v1.1.0
```

---

## ⏮️ Voltar para uma Versão Específica

### Opção 1: Criar Branch a partir de uma Tag (RECOMENDADO)

Esta é a forma mais segura, pois não altera o histórico existente:

```bash
# 1. Verificar tags disponíveis
git tag -l

# 2. Criar uma nova branch a partir da versão estável
git checkout -b feature/chat-automacoes v1.1.0

# 3. Agora você está trabalhando a partir da versão 1.1.0
# Pode desenvolver sua nova funcionalidade sem medo

# 4. Se algo der errado, simplesmente volte para master
git checkout master
```

### Opção 2: Reset Hard (CUIDADO - Perde alterações locais)

⚠️ **ATENÇÃO**: Isso apaga todas as alterações não commitadas!

```bash
# 1. Voltar para uma tag específica
git reset --hard v1.1.0

# 2. Se já tiver feito push, será necessário forçar (NÃO RECOMENDADO)
# git push origin master --force
```

### Opção 3: Checkout Temporário (Apenas Visualização)

Para apenas ver como estava na versão anterior:

```bash
git checkout v1.1.0
# Faça suas verificações
# Depois volte para master
git checkout master
```

---

## 🛡️ Criar Branch de Desenvolvimento Seguro

**RECOMENDADO para desenvolvimento de novas funcionalidades:**

```bash
# 1. Garantir que está na versão estável
git checkout master
git pull origin master

# 2. Criar branch a partir da versão estável
git checkout -b feature/chat-automacoes v1.1.0

# 3. Desenvolver sua funcionalidade
# ... fazer commits ...

# 4. Se algo der errado, simplesmente descartar a branch
git checkout master
git branch -D feature/chat-automacoes

# 5. Se tudo der certo, fazer merge
git checkout master
git merge feature/chat-automacoes
```

---

## ↩️ Reverter Commits Específicos

### Reverter o último commit (mantém alterações)
```bash
git revert HEAD
```

### Reverter um commit específico
```bash
# 1. Encontrar o hash do commit
git log --oneline

# 2. Reverter o commit
git revert <hash-do-commit>
```

### Reverter múltiplos commits
```bash
# Reverter os últimos 3 commits
git revert HEAD~3..HEAD
```

---

## 📁 Restaurar Arquivos Específicos

### Restaurar um arquivo de uma versão específica
```bash
# Restaurar arquivo da versão 1.1.0
git checkout v1.1.0 -- caminho/do/arquivo.tsx

# Restaurar arquivo de um commit específico
git checkout <hash-commit> -- caminho/do/arquivo.tsx
```

### Ver diferenças antes de restaurar
```bash
# Ver diferenças entre versão atual e v1.1.0
git diff v1.1.0 HEAD

# Ver diferenças de um arquivo específico
git diff v1.1.0 HEAD -- caminho/do/arquivo.tsx
```

---

## 🎯 Cenários Comuns

### Cenário 1: "Quebrei algo e quero voltar para a última versão estável"

```bash
# Opção A: Descartar alterações locais não commitadas
git checkout master
git reset --hard origin/master

# Opção B: Voltar para a tag estável
git checkout -b temp-fix v1.1.0
git checkout master
git merge temp-fix
git branch -d temp-fix
```

### Cenário 2: "Quero testar uma nova funcionalidade sem risco"

```bash
# Criar branch de teste a partir da versão estável
git checkout -b test/chat-automacoes v1.1.0

# Desenvolver e testar
# Se der errado:
git checkout master
git branch -D test/chat-automacoes

# Se der certo:
git checkout master
git merge test/chat-automacoes
```

### Cenário 3: "Preciso comparar com a versão anterior"

```bash
# Ver diferenças entre v1.1.0 e v1.0.0
git diff v1.0.0 v1.1.0

# Ver mudanças em um arquivo específico
git diff v1.0.0 v1.1.0 -- src/App.tsx

# Ver lista de arquivos alterados
git diff --name-only v1.0.0 v1.1.0
```

### Cenário 4: "Fiz commit mas ainda não fiz push, quero desfazer"

```bash
# Desfazer último commit (mantém alterações)
git reset --soft HEAD~1

# Desfazer último commit (remove alterações)
git reset --hard HEAD~1
```

---

## 🔐 Boas Práticas

### ✅ FAZER:
1. **Sempre criar branch para novas funcionalidades**
   ```bash
   git checkout -b feature/nova-funcionalidade v1.1.0
   ```

2. **Fazer commits frequentes e pequenos**
   ```bash
   git add .
   git commit -m "feat: adicionar componente de chat"
   ```

3. **Testar antes de fazer merge**
   ```bash
   npm run build
   npm run type-check
   ```

4. **Manter master sempre estável**
   - Nunca commitar diretamente em master
   - Sempre fazer merge via pull request

### ❌ NÃO FAZER:
1. **Nunca fazer `git push --force` em master**
2. **Nunca fazer reset hard sem backup**
3. **Nunca desenvolver diretamente em master**

---

## 📝 Exemplo Prático: Implementar Chat com Automações

```bash
# 1. Garantir que está na versão estável
git checkout master
git pull origin master

# 2. Criar branch a partir da versão estável
git checkout -b feature/chat-automacoes v1.1.0

# 3. Desenvolver a funcionalidade
# ... criar componentes, fazer commits ...

# 4. Se algo der errado durante desenvolvimento:
git checkout master
git branch -D feature/chat-automacoes
git checkout -b feature/chat-automacoes v1.1.0  # Recomeçar

# 5. Se tudo der certo:
git checkout master
git merge feature/chat-automacoes
git push origin master

# 6. Criar nova versão
git tag -a v1.2.0 -m "Versão 1.2.0 - Chat com Automações"
git push origin v1.2.0
```

---

## 🆘 Comandos de Emergência

### Descartar TODAS as alterações locais
```bash
git checkout master
git reset --hard origin/master
git clean -fd  # Remove arquivos não rastreados
```

### Ver o que mudou desde a última versão estável
```bash
git log v1.1.0..HEAD --oneline
```

### Voltar para um commit específico (temporário)
```bash
git checkout <hash-commit>
# Para voltar:
git checkout master
```

---

## 📚 Referências

- [Git Tag Documentation](https://git-scm.com/book/en/v2/Git-Basics-Tagging)
- [Git Branching](https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell)
- [Git Revert vs Reset](https://www.atlassian.com/git/tutorials/undoing-changes)

---

## 💡 Dica Final

**Sempre trabalhe em branches separadas!** Isso permite:
- Desenvolver sem medo de quebrar
- Testar diferentes abordagens
- Comparar versões facilmente
- Reverter facilmente se necessário

```bash
# Workflow recomendado:
git checkout master
git pull origin master
git checkout -b feature/sua-funcionalidade v1.1.0
# ... desenvolver ...
# Se der certo: merge
# Se der errado: delete a branch e recomece
```

