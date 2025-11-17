# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

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

