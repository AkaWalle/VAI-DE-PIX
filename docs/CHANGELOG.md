# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

## [2.0.0] - 2025-11-21

### Adicionado
- ✅ Cálculo de saldo derivado de transações (sempre calculado, nunca armazenado)
- ✅ Soft delete em todas as entidades principais
- ✅ Filtros avançados em transações (tags, busca por texto)
- ✅ Exportação CSV completa
- ✅ Job automático de transações recorrentes (APScheduler)
- ✅ Rate limiting rigoroso em rotas críticas
- ✅ Exception handlers globais
- ✅ Sanitização de inputs (prevenção XSS)
- ✅ Validação de limites máximos
- ✅ Endpoint de reconciliação de saldo
- ✅ Testes E2E completos (12 testes)
- ✅ Script de recálculo de saldos
- ✅ CI/CD completo (GitHub Actions)
- ✅ Dockerfile otimizado multi-stage
- ✅ Docker Compose para desenvolvimento
- ✅ Configuração Railway para deploy
- ✅ Documentação completa de deploy

### Modificado
- ✅ Saldo de contas sempre calculado a partir de transações
- ✅ Todos os DELETE agora são soft delete
- ✅ BaseRepository com filtro automático de deleted_at
- ✅ AccountService com cálculo derivado de saldo
- ✅ TransactionRepository com novos filtros (tag_ids, search)
- ✅ Reports router com exportação CSV
- ✅ Main.py com exception handlers globais
- ✅ Auth router com rate limiting
- ✅ Schemas com validação e sanitização

### Segurança
- ✅ Rate limiting: 5/min register, 10/min login
- ✅ Exception handlers sem vazar stack trace em produção
- ✅ Sanitização de inputs com bleach
- ✅ Validação de limites (amount ≤ 999999.99, description ≤ 500)
- ✅ Security headers (OWASP ASVS Nível 3)

### Testes
- ✅ 12 testes E2E completos
- ✅ Testes de autenticação, transações, exportação, recorrências
- ✅ Script de recálculo de saldos testado

### DevOps
- ✅ CI/CD pipeline completo
- ✅ Build Docker otimizado
- ✅ Deploy automático Railway
- ✅ Docker Compose com PostgreSQL + Redis

## [1.1.0] - 2025-01-XX

### Adicionado
- Error Boundary completo do React para captura de erros
- Lazy loading de rotas para melhor performance
- Scripts de validação e setup de ambiente (validate_env.py, setup_env.py)
- CI/CD básico com GitHub Actions (lint, type-check, build)
- Rate limiting preparado (slowapi)
- Validação melhorada de inputs com Pydantic validators
- Sanitização de inputs (remoção de caracteres perigosos)
- Scripts úteis no package.json (lint:fix, type-check, clean, format)
- Documentação completa de setup no README
- Componente PageLoader para lazy loaded routes

### Corrigido
- Typo no nome do arquivo `theme-providerr.tsx` → `theme-provider.tsx`
- CORS muito permissivo em desenvolvimento (agora baseado em ambiente)
- Validação de inputs inconsistente (agora usando Pydantic validators)
- Arquivo de exemplo de ambiente padronizado (env.example → .env.example)

### Modificado
- Otimização do Vite config (removido force: true desnecessário)
- CORS configurado baseado em ambiente (dev/prod)
- Validação de email usando EmailStr do Pydantic
- Estrutura de validação melhorada com validators customizados
- Documentação do README expandida com instruções completas

### Segurança
- CORS restrito em produção
- Validação rigorosa de inputs
- Sanitização de caracteres perigosos
- Estrutura de rate limiting preparada

### Performance
- Lazy loading de todas as rotas
- Code splitting otimizado
- Bundle inicial reduzido

## [1.0.1] - 2025-01-XX

### Adicionado
- Documentação de melhorias e pontos de atenção
- Tratamento básico de erros no frontend
- Configuração de reotimização forçada do Vite

### Corrigido
- Importação do módulo `automations` inexistente no backend
- Cache desatualizado do Vite causando erros 504
- Tela branca causada por falta de tratamento de erros

### Alterado
- Porta do frontend alterada para 5000 (configurável)
- Configuração do Vite para forçar reotimização de dependências

## [1.0.0] - 2025-11-17

### Adicionado
- Sistema completo de controle financeiro pessoal
- Autenticação de usuários
- Gestão de transações (receitas e despesas)
- Sistema de metas financeiras
- Sistema de caixinhas (envelopes)
- Relatórios e análises financeiras
- Dashboard interativo com gráficos
- Configurações de perfil e categorias
- Sistema de automações (estrutura básica)
- API REST completa com FastAPI
- Frontend React com TypeScript
- Interface responsiva com Tailwind CSS

### Segurança
- Autenticação JWT
- Proteção de rotas
- Validação de dados

---

## Tipos de Mudanças

- **Adicionado** para novas funcionalidades
- **Modificado** para mudanças em funcionalidades existentes
- **Descontinuado** para funcionalidades que serão removidas
- **Removido** para funcionalidades removidas
- **Corrigido** para correção de bugs
- **Segurança** para vulnerabilidades

