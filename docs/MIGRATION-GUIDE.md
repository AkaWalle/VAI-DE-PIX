# 🔄 Guia de Migração - Local para API

## 📋 Status Atual

✅ **Frontend:** Totalmente funcional com dados locais
✅ **Backend:** Estrutura criada (FastAPI + PostgreSQL)
⏳ **Integração:** Preparada para ativação

## 🎯 Como Funciona

### **Modo Atual: Local**
- 💾 Dados salvos no `localStorage` do navegador
- ⚡ Funciona offline
- 🔒 Dados privados (não compartilhados)

### **Modo Futuro: API**
- 🌐 Dados salvos no servidor
- 👥 Permite múltiplos dispositivos
- 🔄 Sincronização automática
- 📊 Backup automático

## 🛠️ Estrutura Preparada

### **1. ✅ Cliente HTTP Criado**
- `src/lib/http-client.ts` - Axios configurado
- `src/lib/api.ts` - Endpoints mapeados
- `src/hooks/use-api.ts` - Hooks customizados

### **2. ✅ Serviços Implementados**
- `src/services/auth.service.ts` - Autenticação
- `src/services/transactions.service.ts` - Transações
- Outros serviços prontos para implementar

### **3. ✅ Stores Preparados**
- `src/stores/auth-store-api.ts` - Auth com API
- Financial store preparado para migração

### **4. ✅ Toggle de Modo**
- Componente em Configurações
- Alterna entre Local/API
- Status da conexão em tempo real

## 🚀 Como Ativar o Modo API

### **Passo 1: Executar Backend**
```bash
# Terminal 1 - Backend
cd backend
python simple_main.py
# Servidor em http://localhost:8000
```

### **Passo 2: Ativar no Frontend**
1. Acesse **Configurações**
2. Procure seção **"Modo de Dados"**
3. Ative **"Usar Backend API"**
4. Página recarregará automaticamente

### **Passo 3: Verificar Status**
- 🟢 **Online:** API funcionando
- 🔴 **Offline:** Backend não disponível
- 🟡 **Verificando:** Testando conexão

## 📊 Endpoints Disponíveis

### **Backend Simples (atual):**
```
GET  /                     # Status da API
GET  /api/health          # Health check
POST /api/auth/login      # Login
POST /api/auth/register   # Registro
GET  /api/categories      # Categorias
GET  /api/accounts        # Contas
GET  /api/transactions    # Transações
POST /api/transactions    # Criar transação
GET  /api/goals           # Metas
POST /api/goals           # Criar meta
```

### **Documentação:**
- **Swagger:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## 🔄 Migração de Dados

### **Automática (Futuro):**
- Botão "Migrar para API" em Configurações
- Exporta dados locais
- Importa para servidor
- Valida integridade

### **Manual (Atual):**
1. **Backup Local:** Configurações → Fazer Backup
2. **Executar Backend:** `python backend/simple_main.py`
3. **Ativar API Mode:** Toggle em Configurações
4. **Recriar Dados:** Usar formulários da aplicação

## ⚡ Vantagens da Migração

### **Modo Local (Atual):**
- ✅ Funciona offline
- ✅ Dados privados
- ✅ Sem dependências
- ❌ Limitado a um dispositivo
- ❌ Sem backup automático

### **Modo API (Futuro):**
- ✅ Múltiplos dispositivos
- ✅ Backup automático
- ✅ Sincronização
- ✅ Dados seguros no servidor
- ❌ Requer conexão
- ❌ Dependência do backend

## 🎯 Próximos Passos

### **Desenvolvimento:**
1. ✅ Estrutura API criada
2. ⏳ Resolver compatibilidade Python 3.13
3. ⏳ Finalizar endpoints complexos
4. ⏳ Implementar migração automática

### **Produção:**
1. ⏳ Deploy backend (Railway/Render)
2. ⏳ Configurar PostgreSQL
3. ⏳ Deploy frontend (Vercel/Netlify)
4. ⏳ Configurar domínio

## 🔧 Troubleshooting

### **API Offline:**
1. Verificar se backend está rodando
2. Confirmar porta 8000 disponível
3. Checar logs do servidor

### **Dados não Sincronizam:**
1. Verificar token de autenticação
2. Confirmar permissões de usuário
3. Validar formato dos dados

### **Performance:**
- Modo Local: Instantâneo
- Modo API: Depende da conexão

---

**💡 Recomendação:** Use modo local para desenvolvimento e testes. Ative API quando o backend estiver estável.
