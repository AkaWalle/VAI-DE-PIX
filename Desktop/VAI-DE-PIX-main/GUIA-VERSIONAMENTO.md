# 🚀 Guia Rápido de Versionamento - VAI DE PIX

Este guia fornece comandos e práticas essenciais para manter o versionamento do projeto organizado.

## 📋 Comandos Essenciais

### Setup Inicial

```bash
# 1. Verificar status do Git
git status

# 2. Adicionar todas as mudanças
git add .

# 3. Fazer commit inicial
git commit -m "chore: organizar repositório e adicionar documentação de versionamento"

# 4. Criar branch de desenvolvimento
git checkout -b develop
git push -u origin develop

# 5. Criar tag de versão
git tag -a v1.0.0 -m "Versão inicial estável"
git push origin v1.0.0
```

### Fluxo de Trabalho Diário

```bash
# 1. Atualizar branch local
git checkout develop
git pull origin develop

# 2. Criar branch para nova feature
git checkout -b feature/nome-da-feature

# 3. Trabalhar e fazer commits
git add .
git commit -m "feat: adicionar nova funcionalidade X"

# 4. Enviar para o repositório
git push -u origin feature/nome-da-feature

# 5. Após revisão, merge em develop
git checkout develop
git merge feature/nome-da-feature
git push origin develop
```

### Convenção de Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
tipo(escopo): descrição curta

corpo opcional explicando o que e por quê

rodapé opcional com referências
```

**Tipos:**
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação (não afeta código)
- `refactor`: Refatoração
- `test`: Testes
- `chore`: Tarefas de manutenção

**Exemplos:**
```bash
git commit -m "feat(transactions): adicionar filtro por categoria"
git commit -m "fix(auth): corrigir validação de senha"
git commit -m "docs: atualizar README com instruções de setup"
git commit -m "chore: atualizar dependências"
```

### Criar Release

```bash
# 1. Atualizar versão no package.json e backend
# 2. Atualizar CHANGELOG.md
# 3. Fazer merge de develop para main
git checkout main
git merge develop
git push origin main

# 4. Criar tag
git tag -a v1.1.0 -m "Release v1.1.0: Novas funcionalidades"
git push origin v1.1.0

# 5. Criar release no GitHub (opcional)
```

### Resolver Conflitos

```bash
# 1. Ver arquivos em conflito
git status

# 2. Resolver manualmente nos arquivos
# 3. Marcar como resolvido
git add arquivo-resolvido.ts

# 4. Continuar merge
git commit -m "merge: resolver conflitos"
```

## 🔍 Comandos Úteis

### Ver Histórico
```bash
# Histórico simplificado
git log --oneline --graph --all

# Histórico de um arquivo
git log --follow -- arquivo.ts

# Ver mudanças
git diff
git diff arquivo.ts
```

### Desfazer Mudanças
```bash
# Desfazer mudanças não commitadas
git restore arquivo.ts
git restore .

# Desfazer último commit (mantém mudanças)
git reset --soft HEAD~1

# Desfazer último commit (remove mudanças)
git reset --hard HEAD~1
```

### Branches
```bash
# Listar branches
git branch -a

# Deletar branch local
git branch -d nome-branch

# Deletar branch remota
git push origin --delete nome-branch
```

## 📊 Estrutura de Branches Recomendada

```
main/master
  └── develop
       ├── feature/nova-funcionalidade
       ├── bugfix/correcao-bug
       └── hotfix/correcao-urgente
```

**Regras:**
- `main`: Apenas código de produção estável
- `develop`: Integração de features
- `feature/*`: Novas funcionalidades
- `bugfix/*`: Correções de bugs
- `hotfix/*`: Correções urgentes (sai direto de main)

## ✅ Checklist Antes de Commitar

- [ ] Código testado localmente
- [ ] Sem erros de linting (`npm run lint`)
- [ ] Sem erros de TypeScript (`npm run type-check`)
- [ ] Mensagem de commit descritiva
- [ ] Arquivos sensíveis não incluídos (.env, .db)
- [ ] Mudanças relevantes documentadas

## 🚨 Problemas Comuns

### "Arquivo muito grande para Git"
```bash
# Adicionar ao .gitignore
echo "arquivo-grande.db" >> .gitignore
git rm --cached arquivo-grande.db
git commit -m "chore: remover arquivo grande do Git"
```

### "Commit acidental em main"
```bash
# Criar branch com o commit
git branch backup-main
git reset --hard origin/main

# Ou mover commit para nova branch
git checkout -b feature/nova-feature
git checkout main
git reset --hard HEAD~1
```

### "Esqueci de fazer commit"
```bash
# Salvar mudanças temporariamente
git stash

# Fazer outras coisas
# ...

# Recuperar mudanças
git stash pop
```

## 📚 Referências

- [Git Documentation](https://git-scm.com/doc)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)

---

**Dica:** Configure aliases úteis no `.gitconfig`:
```bash
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
```

