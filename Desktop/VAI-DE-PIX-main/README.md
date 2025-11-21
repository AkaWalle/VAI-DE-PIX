# 💰 VAI DE PIX

**Sistema Completo de Controle Financeiro Pessoal**

Um sistema moderno e intuitivo para gerenciar suas finanças pessoais com análises inteligentes, automações e interface responsiva.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![CI/CD](https://github.com/USERNAME/REPO/workflows/CI/CD%20Pipeline/badge.svg)
![React](https://img.shields.io/badge/React-18.3.1-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4.17-blue.svg)
![Vite](https://img.shields.io/badge/Vite-5.4.19-purple.svg)
![Python](https://img.shields.io/badge/Python-3.11-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green.svg)

## 🌟 Funcionalidades

### 🔐 Sistema de Autenticação
- ✅ **Login/Cadastro** - Sistema completo com validação
- ✅ **Proteção de Rotas** - Acesso seguro às funcionalidades
- ✅ **Persistência de Sessão** - Mantém login após refresh
- ✅ **Logout Seguro** - Botão de sair no sidebar

### 💳 Gestão de Transações
- ✅ **Criar Transações** - Receitas e despesas com categorização
- ✅ **Filtros Avançados** - Por tipo, categoria, período
- ✅ **Importação/Exportação** - CSV com dados filtrados
- ✅ **Validações** - Formulários com verificação completa

### 🎯 Metas Financeiras
- ✅ **Criar Metas** - Objetivos com prazo e categoria
- ✅ **Acompanhar Progresso** - Barra de progresso visual
- ✅ **Adicionar Valores** - Contribuições para metas
- ✅ **Remover Metas** - Com confirmação destrutiva

### 📦 Sistema de Caixinhas (Envelopes)
- ✅ **Criar Caixinhas** - Organização por categoria/objetivo
- ✅ **Gerenciar Saldos** - Adicionar e retirar valores
- ✅ **Cores Personalizadas** - Visual organizado
- ✅ **Remover Caixinhas** - Com confirmação destrutiva

### 📊 Análises e Relatórios
- ✅ **Dashboard Interativo** - Visão geral com gráficos
- ✅ **Relatórios Detalhados** - Análises por período
- ✅ **Tendências** - Padrões e previsões inteligentes
- ✅ **Exportação** - Relatórios em JSON/CSV

### ⚙️ Configurações do Sistema
- ✅ **Perfil do Usuário** - Editar informações pessoais
- ✅ **Gerenciar Contas** - Bancos, cartões, investimentos
- ✅ **Gerenciar Categorias** - Personalizar com cores e ícones
- ✅ **Temas** - Claro, escuro ou automático
- ✅ **Backup de Dados** - Exportar configurações

### 🤖 Automações Inteligentes
- ✅ **Transações Recorrentes** - Salários, contas mensais
- ✅ **Alertas de Orçamento** - Notificações por categoria
- ✅ **Lembretes de Metas** - Contribuições periódicas
- ✅ **Webhooks** - Integrações externas
- ✅ **Ativar/Desativar** - Controle individual de regras

## 🚀 Como Executar

### Pré-requisitos
- **Node.js** >= 18.0.0
- **Python** >= 3.11
- **npm**, **yarn** ou **pnpm**
- **pip** (gerenciador de pacotes Python)
- **Docker** e **Docker Compose** (opcional, para desenvolvimento local)

### 1. Instalação

#### Opção A: Docker Compose (Recomendado para desenvolvimento)
```bash
# Copiar arquivo de exemplo de variáveis de ambiente
cp backend/.env.example backend/.env
# Editar backend/.env com suas configurações

# Iniciar todos os serviços (PostgreSQL + Redis + Backend + Frontend)
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Parar serviços
docker-compose down
```

#### Opção B: Instalação Manual

#### Frontend
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

#### Backend
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

### 2. Configuração de Ambiente

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

### 3. Desenvolvimento

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

### 4. Build para Produção

```bash
# Gerar build otimizada
npm run build

# Visualizar build localmente
npm run preview
```

### 5. Verificação de Código

```bash
# Executar linter
npm run lint
```

### 6. Testes

#### Testes Unitários
```bash
cd backend
pytest tests/ -v
```

#### Testes E2E
```bash
# Instalar dependências de teste
cd backend
pip install -r requirements-test.txt

# Instalar Playwright
playwright install chromium

# Rodar testes E2E
pytest tests/e2e/ -v
# ou usando Makefile
make test-e2e
```

#### Todos os Testes
```bash
make test
# ou
cd backend && pytest tests/ tests/e2e/ -v
```

### 7. Scripts Úteis

#### Recalcular Saldos
```bash
cd backend
# Modo dry-run (simulação)
python scripts/recalculate_all_balances.py --dry-run

# Execução real
python scripts/recalculate_all_balances.py
```

## 🔑 Credenciais de Teste

### Usuários Pré-configurados:
- **Email:** `joao@exemplo.com` | **Senha:** `123456`
- **Email:** `maria@exemplo.com` | **Senha:** `123456`

### Ou crie uma nova conta:
- Qualquer email válido
- Senha mínima de 6 caracteres

## 📱 Como Usar - Guia Detalhado

### 🏠 **Dashboard**
1. **Visão Geral** - Cards com saldo total, receitas e despesas do mês
2. **Gráficos Interativos** - Fluxo de caixa e distribuição por categoria
3. **Progresso de Metas** - Barras de progresso dos objetivos
4. **Transações Recentes** - Últimas 5 movimentações

### 💳 **Transações**

#### **Criar Nova Transação:**
1. Clique em **"Nova Transação"**
2. Preencha os campos obrigatórios:
   - **Tipo:** Receita ou Despesa
   - **Valor:** Use vírgula para decimais (ex: 1.500,00)
   - **Descrição:** Detalhes da transação
   - **Categoria:** Selecione da lista
   - **Conta:** Conta bancária/cartão
3. Campos opcionais:
   - **Data:** Padrão hoje
   - **Tags:** Separe por vírgula
4. Clique em **"Criar Transação"**

#### **Importar/Exportar:**
- **Importar:** Funcionalidade em desenvolvimento
- **Exportar:** Gera CSV com transações filtradas
  - Aplica filtros atuais (tipo, busca)
  - Download automático

#### **Filtros:**
- **"Todas"** - Mostra receitas e despesas
- **"Receitas"** - Apenas entradas
- **"Despesas"** - Apenas saídas
- **Busca** - Digite na barra para filtrar por descrição

### 🎯 **Metas Financeiras**

#### **Criar Meta:**
1. Clique em **"Nova Meta"**
2. Preencha:
   - **Nome:** Ex: "Viagem para Europa"
   - **Valor da Meta:** Objetivo em reais
   - **Data Objetivo:** Prazo para atingir
   - **Categoria:** Tipo de meta
   - **Prioridade:** Baixa, Média ou Alta
   - **Descrição:** Opcional
3. Clique em **"Criar Meta"**

#### **Gerenciar Meta:**
- **Adicionar Valor:** Contribua para a meta
  - Insira valor a adicionar
  - Confirme a data
  - Adicione descrição opcional
- **Remover:** Botão 🗑️ com confirmação

### 📦 **Caixinhas (Sistema de Envelopes)**

#### **Criar Caixinha:**
1. Clique em **"Nova Caixinha"**
2. Configure:
   - **Nome:** Ex: "Emergência", "Viagem"
   - **Saldo Inicial:** Valor atual (opcional)
   - **Meta:** Valor objetivo (opcional)
   - **Cor:** Escolha entre 8 cores
   - **Descrição:** Finalidade da caixinha
3. Clique em **"Criar Caixinha"**

#### **Gerenciar Saldo:**
- **Adicionar:** Deposite valor na caixinha
- **Retirar:** Retire valor (verifica saldo disponível)
- **Transferir:** Entre caixinhas (seção inferior)
- **Remover:** Botão 🗑️ com confirmação

### 📊 **Relatórios**

#### **Visualizar Análises:**
1. **Cards de Resumo:**
   - Total de transações
   - Total de receitas (verde)
   - Total de despesas (vermelho)
   - Saldo líquido

2. **Gráficos:**
   - **Fluxo de Caixa:** Barras de receitas vs despesas
   - **Distribuição:** Pizza das categorias de despesa

3. **Top 5 Categorias:** Ranking de gastos com percentuais

#### **Exportar Relatório:**
1. Selecione período: **3, 6 ou 12 meses**
2. Clique em **"Exportar Relatório"**
3. Download automático em JSON com:
   - Resumo financeiro
   - Dados de fluxo de caixa
   - Detalhes por categoria
   - Todas as transações do período

### 📈 **Tendências**

#### **Análises Disponíveis:**
1. **Cards de Tendências:**
   - **Receitas:** % de crescimento/declínio
   - **Despesas:** % de aumento/redução
   - **Saldo:** Evolução do saldo líquido

2. **Gráficos de Evolução:**
   - **6 meses:** Linhas de receitas e despesas
   - **12 meses:** Área do saldo líquido

3. **Tendências por Categoria:**
   - Variações mensais com badges coloridos
   - Comparação mês atual vs anterior

4. **Previsões para Próximo Mês:**
   - Receitas previstas
   - Despesas previstas
   - Saldo previsto

### ⚙️ **Configurações**

#### **Perfil do Usuário:**
1. Edite **Nome** e **Email**
2. Clique em **"Salvar Alterações"**

#### **Aparência:**
- **Claro:** Tema diurno
- **Escuro:** Tema noturno (padrão)
- **Sistema:** Segue preferência do OS

#### **Gerenciar Contas:**
1. Clique em **"Nova Conta"**
2. Configure:
   - **Nome:** Ex: "Conta Corrente Banco X"
   - **Tipo:** Corrente, Poupança, Investimento, Cartão, Dinheiro
   - **Saldo Inicial:** Valor atual
3. Clique em **"Adicionar"**

#### **Gerenciar Categorias:**
1. Clique em **"Nova Categoria"**
2. Configure:
   - **Nome:** Ex: "Alimentação"
   - **Tipo:** Receita ou Despesa
   - **Ícone:** Emoji representativo
   - **Cor:** Escolha entre 8 opções
3. Clique em **"Adicionar"**

#### **Backup de Dados:**
- Clique em **"Fazer Backup"**
- Download automático com todas as configurações

### 🤖 **Automações**

#### **Criar Automação:**
1. Clique em **"Nova Automação"**
2. Configure:
   - **Nome:** Ex: "Salário Mensal"
   - **Tipo:** Escolha entre 4 tipos
   - **Descrição:** O que a automação faz

3. **Para Transação Recorrente:**
   - **Frequência:** Diário, Semanal, Mensal, Anual
   - **Dia/Data:** Quando executar
   - **Valor:** Quantia da transação
   - **Tipo:** Receita ou Despesa

4. **Para Alerta de Orçamento:**
   - **Categoria:** Qual categoria monitorar
   - **Limite:** Valor máximo antes do alerta

#### **Gerenciar Regras:**
- **Ativar/Desativar:** Use o switch ao lado
- **Editar:** Botão ⚙️ (em desenvolvimento)
- **Remover:** Botão 🗑️ com confirmação

## 🛠️ Tecnologias Utilizadas

### **Frontend:**
- **React 18.3.1** - Framework principal
- **TypeScript 5.8.3** - Tipagem estática
- **Vite 5.4.19** - Build tool e dev server
- **React Router 6.30.1** - Roteamento SPA

### **UI/UX:**
- **Tailwind CSS 3.4.17** - Estilização utilitária
- **shadcn/ui** - Componentes base
- **Radix UI** - Componentes acessíveis
- **Lucide React** - Ícones modernos
- **Recharts** - Gráficos interativos

### **Estado:**
- **Zustand 5.0.8** - Gerenciamento de estado
- **React Query 5.83.0** - Cache e sincronização
- **React Hook Form 7.61.1** - Formulários performáticos

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (shadcn/ui)
│   ├── forms/          # Formulários específicos
│   └── app-sidebar.tsx # Navegação principal
├── pages/              # Páginas da aplicação
│   ├── Auth.tsx        # Login/Cadastro
│   ├── Dashboard.tsx   # Visão geral
│   ├── Transactions.tsx # Gestão de transações
│   ├── Goals.tsx       # Metas financeiras
│   ├── Envelopes.tsx   # Sistema de caixinhas
│   ├── Reports.tsx     # Relatórios e análises
│   ├── Trends.tsx      # Tendências e previsões
│   ├── Settings.tsx    # Configurações
│   └── Automations.tsx # Automações
├── stores/             # Gerenciamento de estado
│   ├── auth-store.ts   # Estado de autenticação
│   └── financial-store.ts # Estado financeiro
├── layouts/            # Layouts da aplicação
├── utils/              # Utilitários e helpers
└── hooks/              # Custom hooks
```

## 🎯 Fluxo de Trabalho Recomendado

### **Configuração Inicial:**
1. ⚙️ **Configurações** → Criar contas bancárias
2. ⚙️ **Configurações** → Adicionar categorias personalizadas
3. 🎯 **Metas** → Definir objetivos financeiros
4. 📦 **Caixinhas** → Criar envelopes de orçamento

### **Uso Diário:**
1. 💳 **Transações** → Registrar receitas e despesas
2. 🏠 **Dashboard** → Acompanhar visão geral
3. 📦 **Caixinhas** → Gerenciar orçamento por categoria

### **Análise Mensal:**
1. 📊 **Relatórios** → Revisar desempenho do mês
2. 📈 **Tendências** → Identificar padrões
3. 🎯 **Metas** → Avaliar progresso dos objetivos

### **Otimização:**
1. 🤖 **Automações** → Configurar regras recorrentes
2. ⚙️ **Configurações** → Ajustar categorias e contas
3. 💾 **Backup** → Exportar dados regularmente

## 🔒 Segurança e Privacidade

- ✅ **Dados Locais** - Armazenados no navegador (localStorage)
- ✅ **Sem Servidor** - Não há transmissão de dados sensíveis
- ✅ **Backup Seguro** - Exportação local
- ✅ **Sessão Segura** - Logout automático

## 🐛 Solução de Problemas

### **CSS não carrega:**
```bash
rm -rf node_modules dist
npm install
npm run build
```

### **Erro de compilação:**
```bash
node -v  # Deve ser >= 18
npm ci
```

## 📈 Roadmap

### **v1.1.0:**
- [ ] Edição inline de transações
- [ ] Importação de bancos (OFX)
- [ ] Modo offline

### **v1.2.0:**
- [ ] Sincronização com Google Drive
- [ ] API REST para mobile
- [ ] Webhooks reais

---

**💰 VAI DE PIX - Sua vida financeira na palma da mão!**
