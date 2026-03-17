# 💰 VAI DE PIX

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![Node](https://img.shields.io/badge/Node-20.x-green.svg)

**Sistema Completo de Controle Financeiro Pessoal com Interface Kiosk para Raspberry Pi**

[🚀 Começar](#-instalação-rápida) • [📖 Documentação](#-documentação) • [🤝 Contribuir](CONTRIBUTING.md) • [🍓 Raspberry Pi](SETUP-RASPBERRY-PI.md)

</div>

---

## 📸 Preview

> **💡 Em breve:** Screenshot ou GIF da aplicação rodando no totem Raspberry Pi 5

## 🎯 O que é?

**VAI DE PIX** é um sistema completo de gestão financeira pessoal desenvolvido para funcionar como **totem kiosk** em Raspberry Pi 5, mas também pode ser usado em qualquer dispositivo via navegador.

### ✨ Features Principais

- 💳 **Gestão Completa de Transações** - Receitas, despesas, categorização inteligente
- 🎯 **Metas Financeiras** - Defina objetivos e acompanhe progresso em tempo real
- 📦 **Sistema de Caixinhas (Envelopes)** - Organize seu dinheiro por categoria/objetivo
- 📊 **Dashboard Interativo** - Gráficos, relatórios e análises detalhadas
- 🤖 **Automações Inteligentes** - Transações recorrentes, alertas e lembretes
- 🔐 **Autenticação Segura** - JWT, criptografia de senhas, proteção de rotas
- 📱 **Interface Responsiva** - Funciona perfeitamente em desktop, tablet e mobile
- 🍓 **Modo Kiosk Raspberry Pi** - Transforme seu Pi 5 em totem 24/7

## 🛠 Stack Tecnológica

### Frontend
- **React 18.3** + **TypeScript 5.8** - Interface moderna e type-safe
- **Vite 7.2** - Build tool ultra-rápido
- **Tailwind CSS 3.4** - Estilização utility-first
- **Zustand** - Gerenciamento de estado leve
- **React Router 6** - Roteamento SPA
- **Recharts** - Gráficos e visualizações
- **Radix UI** - Componentes acessíveis

### Backend
- **FastAPI 0.104** - API REST moderna e rápida
- **PostgreSQL** - Banco de dados relacional robusto
- **SQLAlchemy 1.4** - ORM Python
- **Alembic** - Migrações de banco de dados
- **JWT** - Autenticação stateless
- **Pydantic** - Validação de dados
- **Uvicorn/Gunicorn** - Servidor ASGI de produção

### Infraestrutura
- **Docker** - Containerização
- **Docker Compose** - Orquestração local
- **Raspberry Pi 5** - Hardware kiosk
- **PostgreSQL** - Banco de dados

## 🚀 Instalação Rápida

### Opção 1: Desenvolvimento Local (5 minutos)

```bash
# 1. Clonar repositório
git clone https://github.com/AkaWalle/VAI-DE-PIX.git
cd VAI-DE-PIX
git checkout raspberry-pi-5

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Edite com suas configurações
python init_db.py
python main.py  # http://localhost:8000

# 3. Frontend (novo terminal)
cd ..
npm install
npm run dev  # http://localhost:5000
```

### Opção 2: Docker (1 comando)

```bash
docker-compose up -d
```

Acesse:
- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### Opção 3: Raspberry Pi 5 Kiosk (Comando Único)

```bash
# No Raspberry Pi 5
git clone https://github.com/AkaWalle/VAI-DE-PIX.git
cd VAI-DE-PIX
git checkout raspberry-pi-5
chmod +x scripts/setup-raspberry-pi.sh
./scripts/setup-raspberry-pi.sh
```

**Pronto!** O sistema estará rodando em modo kiosk 24/7. Veja [SETUP-RASPBERRY-PI.md](SETUP-RASPBERRY-PI.md) para detalhes completos.

## ⚙️ Variáveis de Ambiente

### Backend (`backend/.env`)

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/vai_de_pix

# Security
SECRET_KEY=your-super-secret-key-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Server
PORT=8000
ENVIRONMENT=production

# Frontend (CORS)
FRONTEND_URL=http://localhost:5000
```

### Frontend (`.env.local`)

```env
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=VAI DE PIX
VITE_APP_VERSION=1.0.0
```

## 📚 Documentação

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Arquitetura do sistema e estrutura de pastas
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Como contribuir com o projeto
- **[SETUP-RASPBERRY-PI.md](SETUP-RASPBERRY-PI.md)** - Guia completo para Raspberry Pi 5
- **[CHANGELOG.md](CHANGELOG.md)** - Histórico de versões e mudanças

## 🎮 Como Usar

### Credenciais de Teste

- **Email:** `admin@vaidepix.com`
- **Senha:** `123456`

Ou crie uma nova conta diretamente na interface.

### Funcionalidades

1. **Dashboard** - Visão geral das finanças com gráficos interativos
2. **Transações** - Adicione receitas e despesas com categorização
3. **Metas** - Defina objetivos financeiros e acompanhe progresso
4. **Caixinhas** - Organize dinheiro por categoria/objetivo
5. **Relatórios** - Análises detalhadas por período, categoria, etc.
6. **Configurações** - Gerencie contas, categorias e perfil

## 🧪 Testes

```bash
# Frontend
npm run test

# Backend
cd backend
pytest

# E2E
npm run test:e2e
```

## 📦 Estrutura do Projeto

```
VAI-DE-PIX/
├── backend/              # API FastAPI + PostgreSQL
│   ├── routers/         # Endpoints da API
│   ├── models/          # Modelos SQLAlchemy
│   ├── repositories/    # Camada de acesso a dados
│   ├── services/        # Lógica de negócio
│   └── alembic/         # Migrações de banco
├── src/                  # Frontend React + TypeScript
│   ├── components/      # Componentes React
│   ├── pages/           # Páginas da aplicação
│   ├── services/        # Serviços de API
│   └── stores/          # Estado global (Zustand)
├── scripts/             # Scripts de automação
├── docs/                 # Documentação adicional
└── docker-compose.yml   # Orquestração Docker
```

Veja [ARCHITECTURE.md](ARCHITECTURE.md) para detalhes completos.

## 🐛 Troubleshooting

### Problema: Porta 8000 já em uso

```bash
# Linux/Mac
sudo lsof -ti:8000 | xargs kill -9

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Problema: Frontend não conecta à API

1. Verifique se o backend está rodando: `curl http://localhost:8000/api/health`
2. Verifique `VITE_API_URL` no `.env.local`
3. Limpe cache: `npm run clean && npm install`

### Problema: Erro de migração do banco

```bash
cd backend
alembic upgrade head
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Veja [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) para:

- Como fazer fork e criar branches
- Padrões de código e commits
- Processo de Pull Request
- Como reportar bugs

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja [LICENSE](LICENSE) para detalhes.

## 👨‍💻 Autor

**Wallace Ventura**

- GitHub: [@AkaWalle](https://github.com/AkaWalle)
- Projeto: [VAI-DE-PIX](https://github.com/AkaWalle/VAI-DE-PIX)

## 🙏 Agradecimentos

- Comunidade React e FastAPI
- Mantenedores das bibliotecas open-source utilizadas
- Contribuidores do projeto

---

<div align="center">

**💰 VAI DE PIX - Sua vida financeira na palma da mão!**

[⭐ Dê uma estrela](https://github.com/AkaWalle/VAI-DE-PIX) se este projeto te ajudou!

</div>
