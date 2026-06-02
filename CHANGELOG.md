# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2025-01-XX

### 🎉 Release Inicial - Production Ready

Primeira versão estável e completa do VAI DE PIX, pronta para produção. [REMOVIDO: suporte kiosk Raspberry Pi 5 — removido na limpeza 2025.]

### ✨ Adicionado

#### Funcionalidades Principais
- ✅ Sistema completo de autenticação (JWT, registro, login)
- ✅ Gestão completa de transações financeiras (CRUD)
- ✅ Sistema de metas financeiras com acompanhamento de progresso
- ✅ Sistema de caixinhas (envelopes) para organização
- ✅ Dashboard interativo com gráficos e análises
- ✅ Relatórios detalhados (resumo, fluxo de caixa, categorias)
- ✅ Sistema de categorias personalizáveis
- ✅ Gestão de contas bancárias
- ✅ Sistema de automações e transações recorrentes
- ✅ Configurações de perfil e preferências

#### Infraestrutura
- ✅ Backend FastAPI completo com PostgreSQL
- ✅ Frontend React + TypeScript + Tailwind CSS
- ✅ Servidor de produção unificado (API + Frontend estático)
- [REMOVIDO] Suporte completo para Raspberry Pi 5
- [REMOVIDO] Modo kiosk configurável
- [REMOVIDO] Docker e Docker Compose
- ✅ Scripts de automação para deploy

#### Documentação
- ✅ README.md profissional e completo
- ✅ ARCHITECTURE.md com diagramas e explicações
- ✅ CONTRIBUTING.md com guia de contribuição
- [REMOVIDO] SETUP-RASPBERRY-PI.md com passo a passo completo
- ✅ Documentação de API (Swagger/OpenAPI)

#### Segurança
- ✅ Autenticação JWT com tokens seguros
- ✅ Hash de senhas com bcrypt
- ✅ Validação de inputs (Pydantic + Zod)
- ✅ Sanitização de dados de entrada
- ✅ Rate limiting configurado
- ✅ CORS configurado por ambiente
- ✅ Proteção de rotas no frontend

#### Performance
- ✅ Lazy loading de rotas
- ✅ Code splitting otimizado
- ✅ Cache de requisições (React Query)
- [REMOVIDO] Otimizações para Raspberry Pi 5
- ✅ Build otimizado de produção

### 🔧 Corrigido

#### Bugs Críticos
- ✅ Rota catch-all interceptando requisições da API
- ✅ HTTPException sendo tratado como erro de banco
- ✅ Detecção automática de URL da API quando acessado via IP
- ✅ Redirecionamento após login/registro
- ✅ Ordem de registro de rotas no FastAPI

#### Melhorias
- ✅ Tratamento de erros melhorado
- ✅ Logs de debug adicionados
- ✅ Validação de ambiente de produção
- ✅ Verificação de frontend buildado antes de servir
- ✅ Middleware de proteção de rotas da API

### 🔄 Modificado

- ✅ Estrutura de pastas organizada profissionalmente
- ✅ Scripts de automação melhorados
- ✅ Configuração de ambiente simplificada
- ✅ Documentação completamente reescrita
- ✅ Código limpo e bem comentado

### 🗑️ Removido

- ✅ Documentação duplicada e desatualizada
- ✅ Scripts de teste obsoletos
- ✅ Arquivos temporários e de backup
- ✅ Componentes não utilizados

### 📚 Documentação

- ✅ README.md completamente reescrito
- ✅ Guias de instalação atualizados
- ✅ Documentação de arquitetura criada
- ✅ Guia de contribuição profissional
- ✅ Changelog completo

### 🍓 Raspberry Pi 5 [REMOVIDO]

- [REMOVIDO] Suporte completo para Pi 5
- [REMOVIDO] Scripts de setup automatizados
- [REMOVIDO] Configuração de modo kiosk
- [REMOVIDO] Otimizações de performance
- [REMOVIDO] Documentação específica

### 🔐 Segurança

- ✅ Tokens JWT com expiração
- ✅ Senhas criptografadas (bcrypt)
- ✅ Validação rigorosa de inputs
- ✅ Sanitização de dados
- ✅ Rate limiting ativo
- ✅ CORS configurado corretamente

### ⚡ Performance

- ✅ Build otimizado
- ✅ Lazy loading implementado
- ✅ Cache de requisições
- ✅ Otimizações de banco de dados
- [REMOVIDO] Configurações para Raspberry Pi

---

## [Unreleased]

### Planejado

- [ ] Suporte para múltiplos idiomas
- [ ] Integração com bancos via API
- [ ] App mobile (React Native)
- [ ] Exportação para PDF
- [ ] Notificações push
- [ ] Modo offline completo

---

**Nota:** Este changelog documenta todas as mudanças desde o início do projeto até a versão 1.0.0.
