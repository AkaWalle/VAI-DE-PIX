# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

## [1.1.1] - 2025-01-XX

### Adicionado

- Reorganização completa da estrutura de pastas do projeto
- Documentação padronizada em `docs/`
- Scripts organizados em `scripts/`
- Arquivo CONTRIBUTING.md

### Modificado

- Estrutura de pastas seguindo best practices 2025
- Todos os arquivos Markdown padronizados
- README.md atualizado com nova estrutura

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

- Sistema completo de autenticação
- Gestão de transações financeiras
- Sistema de metas e objetivos
- Sistema de caixinhas (envelopes)
- Dashboard interativo com gráficos
- Relatórios e análises detalhadas
- Sistema de automações
- Configurações personalizáveis

---

**Nota:** Datas específicas serão atualizadas conforme as releases são
publicadas.
