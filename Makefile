.PHONY: help install install-backend install-frontend dev dev-backend dev-frontend test test-unit test-e2e build clean check-architecture

help:
	@echo "💰 VAI DE PIX - Comandos Disponíveis"
	@echo ""
	@echo "Instalação:"
	@echo "  make install              - Instala todas as dependências"
	@echo "  make install-backend      - Instala dependências do backend"
	@echo "  make install-frontend     - Instala dependências do frontend"
	@echo ""
	@echo "Desenvolvimento:"
	@echo "  make dev                  - Inicia backend e frontend"
	@echo "  make dev-backend          - Inicia apenas o backend"
	@echo "  make dev-frontend         - Inicia apenas o frontend"
	@echo ""
	@echo "Testes:"
	@echo "  make test                 - Roda todos os testes"
	@echo "  make test-unit            - Roda testes unitários"
	@echo "  make test-e2e             - Roda testes E2E"
	@echo ""
	@echo "Build:"
	@echo "  make build                - Build para produção"
	@echo "  make clean                - Limpa arquivos gerados"
	@echo ""
	@echo "Arquitetura:"
	@echo "  make check-architecture   - Verifica se routers não acessam ORM direto (fitness function)"

install:
	@echo "📦 Instalando dependências..."
	@make install-backend
	@make install-frontend

install-backend:
	@echo "📦 Instalando dependências do backend..."
	cd backend && pip install -r requirements.txt
	cd backend && pip install -r requirements-test.txt
	@echo "✅ Backend instalado"

install-frontend:
	@echo "📦 Instalando dependências do frontend..."
	npm install
	@echo "✅ Frontend instalado"

dev:
	@echo "🚀 Iniciando desenvolvimento..."
	@echo "⚠️  Execute backend e frontend em terminais separados:"
	@echo "   Terminal 1: make dev-backend"
	@echo "   Terminal 2: make dev-frontend"

dev-backend:
	@echo "🚀 Iniciando backend..."
	cd backend && python main.py

dev-frontend:
	@echo "🚀 Iniciando frontend..."
	npm run dev

test:
	@echo "🧪 Rodando todos os testes..."
	@make test-backend
	@make test-frontend

test-backend:
	@echo "🧪 Rodando testes do backend..."
	cd backend && pytest tests/ -v --tb=short --cov=backend --cov-report=term-missing

test-frontend:
	@echo "🧪 Rodando testes do frontend..."
	npm run test

test-unit:
	@echo "🧪 Rodando testes unitários..."
	cd backend && pytest tests/unit/ -v --tb=short
	npm run test:unit

test-integration:
	@echo "🧪 Rodando testes de integração..."
	cd backend && pytest tests/integration/ -v --tb=short
	npm run test:integration

test-e2e:
	@echo "🧪 Rodando testes E2E..."
	cd backend && pytest tests/e2e/ -v --tb=short
	npm run test:e2e

coverage:
	@echo "📊 Gerando relatório de cobertura..."
	cd backend && pytest tests/ --cov=backend --cov-report=html --cov-report=term-missing
	npm run test:coverage
	@echo "✅ Relatórios gerados em:"
	@echo "   - Backend: backend/htmlcov/index.html"
	@echo "   - Frontend: coverage/index.html"

build:
	@echo "🏗️  Building para produção..."
	npm run build
	@echo "✅ Build concluído"

check-architecture:
	@echo "🔒 Verificando regra: routers não devem acessar ORM diretamente..."
	cd backend && python scripts/architecture_guard.py

clean:
	@echo "🧹 Limpando arquivos gerados..."
	rm -rf node_modules
	rm -rf dist
	rm -rf backend/__pycache__
	rm -rf backend/**/__pycache__
	rm -rf backend/**/*.pyc
	rm -rf backend/.pytest_cache
	rm -rf backend/test*.db
	@echo "✅ Limpeza concluída"

