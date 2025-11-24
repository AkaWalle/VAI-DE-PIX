# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

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

