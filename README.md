# 💰 Vai de Pix

**Sistema Completo de Controle Financeiro Pessoal**

Um sistema moderno e intuitivo para gerenciar suas finanças pessoais com
análises inteligentes, automações e interface responsiva.

![Version](https://img.shields.io/badge/version-1.1.1-blue.svg)
![React](https://img.shields.io/badge/React-18.3.1-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4.17-blue.svg)
![Vite](https://img.shields.io/badge/Vite-5.4.19-purple.svg)

## 🚀 Começando

### Pré-requisitos

- **Node.js** >= 18.0.0
- **Python** >= 3.9
- **npm**, **yarn** ou **pnpm**
- **pip** (gerenciador de pacotes Python)

## 📦 Instalação

### Frontend

```bash
# Verificar versão do Node.js
node -v

# Instalar dependências
npm install
# ou
yarn install
# ou
pnpm install
```

### Backend

```bash
# Navegar para o diretório backend
cd backend

# Criar ambiente virtual (recomendado)
python -m venv venv

# Ativar ambiente virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
# Opção 1: Usar script automático (recomendado)
python scripts/setup_env.py

# Opção 2: Copiar manualmente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Validar configuração
python scripts/validate_env.py
```

## 🛠 Uso

### Configuração de Ambiente

#### Variáveis de Ambiente do Backend (.env)

```env
# Database Configuration
DATABASE_URL=sqlite:///./vai_de_pix.db  # SQLite para desenvolvimento
# ou
# DATABASE_URL=postgresql://user:password@localhost:5432/vai_de_pix  # PostgreSQL

# Security
SECRET_KEY=your-super-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Server Configuration
PORT=8000
HOST=0.0.0.0
DEBUG=True

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5000
```

#### Variáveis de Ambiente do Frontend (.env.local)

```env
# API Configuration
VITE_API_URL=http://localhost:8000/api

# App Configuration
VITE_APP_NAME=VAI DE PIX
VITE_APP_VERSION=1.0.0
```

### Desenvolvimento

#### Iniciar Backend

```bash
cd backend
# Com ambiente virtual ativado
python main.py
```

**Backend disponível em:**

- **API:** http://localhost:8000
- **Documentação:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/api/health

#### Iniciar Frontend

```bash
# Na raiz do projeto
npm run dev
# ou
yarn dev
# ou
pnpm dev
```

**Frontend disponível em:**

- **Local:** http://localhost:5000/
- **Rede:** http://192.168.x.x:5000/

### Build para Produção

```bash
# Gerar build otimizada
npm run build

# Visualizar build localmente
npm run preview
```

### Verificação de Código

```bash
# Executar linter
npm run lint
```

## 🔧 Configuração

### Credenciais de Teste

**Usuários Pré-configurados:**

- **Email:** `joao@exemplo.com` | **Senha:** `123456`
- **Email:** `maria@exemplo.com` | **Senha:** `123456`

**Ou crie uma nova conta:**

- Qualquer email válido
- Senha mínima de 6 caracteres

### Funcionalidades Principais

#### 🔐 Sistema de Autenticação

- ✅ **Login/Cadastro** - Sistema completo com validação
- ✅ **Proteção de Rotas** - Acesso seguro às funcionalidades
- ✅ **Persistência de Sessão** - Mantém login após refresh
- ✅ **Logout Seguro** - Botão de sair no sidebar

#### 💳 Gestão de Transações

- ✅ **Criar Transações** - Receitas e despesas com categorização
- ✅ **Filtros Avançados** - Por tipo, categoria, período
- ✅ **Importação/Exportação** - CSV com dados filtrados
- ✅ **Validações** - Formulários com verificação completa

#### 🎯 Metas Financeiras

- ✅ **Criar Metas** - Objetivos com prazo e categoria
- ✅ **Acompanhar Progresso** - Barra de progresso visual
- ✅ **Adicionar Valores** - Contribuições para metas
- ✅ **Remover Metas** - Com confirmação destrutiva

#### 📦 Sistema de Caixinhas (Envelopes)

- ✅ **Criar Caixinhas** - Organização por categoria/objetivo
- ✅ **Gerenciar Saldos** - Adicionar e retirar valores
- ✅ **Cores Personalizadas** - Visual organizado
- ✅ **Remover Caixinhas** - Com confirmação destrutiva

#### 📊 Análises e Relatórios

- ✅ **Dashboard Interativo** - Visão geral com gráficos
- ✅ **Relatórios Detalhados** - Análises por período
- ✅ **Tendências** - Padrões e previsões inteligentes
- ✅ **Exportação** - Relatórios em JSON/CSV

#### ⚙️ Configurações do Sistema

- ✅ **Perfil do Usuário** - Editar informações pessoais
- ✅ **Gerenciar Contas** - Bancos, cartões, investimentos
- ✅ **Gerenciar Categorias** - Personalizar com cores e ícones
- ✅ **Temas** - Claro, escuro ou automático
- ✅ **Backup de Dados** - Exportar configurações

#### 🤖 Automações Inteligentes

- ✅ **Transações Recorrentes** - Salários, contas mensais
- ✅ **Alertas de Orçamento** - Notificações por categoria
- ✅ **Lembretes de Metas** - Contribuições periódicas
- ✅ **Webhooks** - Integrações externas
- ✅ **Ativar/Desativar** - Controle individual de regras

## 🤝 Contribuindo

Consulte o arquivo [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes sobre nosso
código de conduta e processo de submissão de pull requests.

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais
detalhes.

---

**💰 VAI DE PIX - Sua vida financeira na palma da mão!**
