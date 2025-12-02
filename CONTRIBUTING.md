# 🤝 Guia de Contribuição

Obrigado por considerar contribuir com o **VAI DE PIX**! Este guia vai te ajudar a começar em 5 minutos.

## 🚀 Começando Rápido

### 1. Fork e Clone

```bash
# Fork o repositório no GitHub, depois:
git clone https://github.com/SEU-USUARIO/VAI-DE-PIX.git
cd VAI-DE-PIX
git checkout raspberry-pi-5
```

### 2. Instalar Dependências

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ..
npm install
```

### 3. Configurar Ambiente

```bash
# Backend
cd backend
cp .env.example .env
# Edite .env com suas configurações

# Frontend
cp env.local.example .env.local
```

### 4. Iniciar Desenvolvimento

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
python main.py

# Terminal 2 - Frontend
npm run dev
```

## 📝 Processo de Contribuição

### 1. Criar Branch

```bash
git checkout -b feature/minha-feature
# ou
git checkout -b fix/corrigir-bug
```

### 2. Desenvolver

- Siga os padrões de código existentes
- Adicione testes para novas funcionalidades
- Mantenha commits pequenos e focados

### 3. Testar

```bash
# Frontend
npm run lint
npm run type-check
npm run test

# Backend
cd backend
pytest
```

### 4. Commit

```bash
git add .
git commit -m "feat: adiciona nova funcionalidade X"
```

**Formato de commit:**
```
tipo(escopo): descrição curta

tipo: feat, fix, docs, style, refactor, test, chore
escopo: frontend, backend, docs, etc.
```

### 5. Push e Pull Request

```bash
git push origin feature/minha-feature
```

Depois, abra um Pull Request no GitHub com:
- Descrição clara do que foi feito
- Screenshots (se aplicável)
- Referência a issues relacionadas

## 📋 Padrões de Código

### TypeScript/React

- Use **TypeScript** para tudo
- Componentes funcionais com hooks
- Props tipadas com interfaces/types
- Nomes descritivos e em inglês

```typescript
// ✅ Bom
interface UserCardProps {
  user: User;
  onEdit: (id: string) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  // ...
}

// ❌ Evitar
export function UserCard(props: any) {
  // ...
}
```

### Python

- Siga **PEP 8**
- Type hints em todas as funções
- Docstrings para funções públicas
- Nomes descritivos

```python
# ✅ Bom
def create_transaction(
    user_id: str,
    amount: float,
    category_id: str
) -> Transaction:
    """Cria uma nova transação para o usuário."""
    # ...

# ❌ Evitar
def create_transaction(user_id, amount, category_id):
    # ...
```

## 🧪 Testes

### Frontend

```bash
# Executar todos os testes
npm run test

# Testes com watch
npm run test:watch

# Coverage
npm run test:coverage
```

### Backend

```bash
cd backend

# Todos os testes
pytest

# Teste específico
pytest tests/test_transactions.py

# Com coverage
pytest --cov=.
```

### E2E

```bash
npm run test:e2e
```

## 📚 Documentação

- Atualize o README se necessário
- Adicione comentários em código complexo
- Documente APIs públicas
- Atualize CHANGELOG.md para mudanças significativas

## 🐛 Reportar Bugs

1. Verifique se o bug já existe nas [Issues](https://github.com/AkaWalle/VAI-DE-PIX/issues)
2. Se não existe, crie uma nova issue com:
   - **Título claro** - "Erro ao criar transação"
   - **Descrição** - O que aconteceu vs. o que deveria acontecer
   - **Passos para reproduzir** - Como reproduzir o bug
   - **Ambiente** - OS, versão do Node/Python, navegador
   - **Screenshots** - Se aplicável
   - **Logs** - Mensagens de erro relevantes

## 💡 Sugerir Features

1. Verifique se a feature já foi sugerida
2. Crie uma issue com:
   - **Título** - Nome da feature
   - **Descrição** - O que a feature faz
   - **Casos de uso** - Quando seria útil
   - **Mockups** - Se tiver ideia visual

## ✅ Checklist antes do PR

- [ ] Código segue os padrões do projeto
- [ ] Testes passam (`npm test` e `pytest`)
- [ ] Linter passa (`npm run lint`)
- [ ] Type check passa (`npm run type-check`)
- [ ] Documentação atualizada (se necessário)
- [ ] Commits seguem o padrão (tipo: descrição)
- [ ] Branch está atualizada com `raspberry-pi-5`

## 🎯 Áreas que Precisam de Ajuda

- 🐛 **Bugs** - Issues marcadas com `bug`
- 🚀 **Features** - Issues marcadas com `enhancement`
- 📖 **Documentação** - Melhorar docs existentes
- 🧪 **Testes** - Aumentar cobertura de testes
- 🎨 **UI/UX** - Melhorias de interface
- 🌍 **Internacionalização** - Traduções

## 💬 Comunicação

- **Issues** - Para bugs e features
- **Discussions** - Para perguntas e discussões
- **Pull Requests** - Para código

## 📄 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a mesma licença MIT do projeto.

---

**Obrigado por contribuir! 🎉**
