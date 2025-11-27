# ✅ Configurar DBeaver Corretamente - PostgreSQL

## ❌ Erro Comum

```
Invalid JDBC URL: postgresql://vai_de_pix_user:vai_de_pix_pass@192.168.10.130:5432/vai_de_pix
```

**Causa**: Tentar colocar a URL completa no campo "JDBC URL" do DBeaver.

## ✅ Solução Correta

No DBeaver, **NÃO** use o campo "JDBC URL" diretamente. Preencha os campos individuais:

### Passo a Passo Detalhado

1. **Abrir DBeaver**
   - Clique em "Nova Conexão" (ícone de plugue) ou `Ctrl+Shift+N`

2. **Selecionar PostgreSQL**
   - Escolha "PostgreSQL" na lista
   - Clique em "Próximo"

3. **Configurar na Aba "Principal"** ⭐ **IMPORTANTE**

   **NÃO preencha o campo "JDBC URL"!**
   
   Preencha apenas estes campos:
   
   ```
   Host:     192.168.10.130
   Port:     5432
   Database: vai_de_pix
   Username: vai_de_pix_user
   Password: vai_de_pix_pass
   ```
   
   ✅ Marque "Salvar senha" se quiser

4. **Aba "Driver properties"**
   - Pode deixar padrão (não precisa alterar nada)

5. **Testar Conexão**
   - Clique em "Testar Conexão"
   - Deve aparecer "Conectado" ✅

6. **Finalizar**
   - Clique em "Finalizar"

## 📋 Campos a Preencher

| Campo | Valor | Onde Preencher |
|-------|-------|----------------|
| **Host** | `192.168.10.130` | Aba "Principal" → Campo "Host" |
| **Port** | `5432` | Aba "Principal" → Campo "Port" |
| **Database** | `vai_de_pix` | Aba "Principal" → Campo "Database" |
| **Username** | `vai_de_pix_user` | Aba "Principal" → Campo "Username" |
| **Password** | `vai_de_pix_pass` | Aba "Principal" → Campo "Password" |

## ⚠️ O que NÃO fazer

❌ **NÃO** preencha o campo "JDBC URL" com:
```
postgresql://vai_de_pix_user:vai_de_pix_pass@192.168.10.130:5432/vai_de_pix
```

✅ **DEIXE** o campo "JDBC URL" vazio ou deixe o DBeaver gerar automaticamente

## 🔍 Verificar se Está Correto

Após preencher os campos individuais, o DBeaver automaticamente gerará uma URL como:
```
jdbc:postgresql://192.168.10.130:5432/vai_de_pix
```

**Note a diferença:**
- ❌ URL que você tentou: `postgresql://...` (formato de conexão)
- ✅ URL que o DBeaver gera: `jdbc:postgresql://...` (formato JDBC)

## 🖼️ Visual da Tela do DBeaver

```
┌─────────────────────────────────────────┐
│ Nova Conexão - PostgreSQL               │
├─────────────────────────────────────────┤
│                                         │
│  Aba: Principal                        │
│                                         │
│  Host:     [192.168.10.130      ]     │
│  Port:     [5432                ]     │
│  Database: [vai_de_pix          ]     │
│  Username: [vai_de_pix_user     ]     │
│  Password: [••••••••••          ]     │
│            [✓] Salvar senha            │
│                                         │
│  JDBC URL: [jdbc:postgresql://...]     │
│            ↑ DEIXE O DBEAVER GERAR     │
│                                         │
│  [Testar Conexão]  [Cancelar] [Próximo]│
└─────────────────────────────────────────┘
```

## 🔧 Se Ainda Não Funcionar

### 1. Verificar se PostgreSQL aceita conexões remotas

No Raspberry Pi:
```bash
# Verificar se está escutando
sudo netstat -tlnp | grep 5432

# Deve mostrar algo como:
# tcp  0  0  0.0.0.0:5432  0.0.0.0:*  LISTEN  ...
```

### 2. Verificar configuração do PostgreSQL

```bash
# Verificar listen_addresses
sudo grep listen_addresses /etc/postgresql/*/main/postgresql.conf

# Deve mostrar:
# listen_addresses = '*'  ou  listen_addresses = '0.0.0.0'
```

### 3. Verificar pg_hba.conf

```bash
sudo grep vai_de_pix /etc/postgresql/*/main/pg_hba.conf

# Deve ter uma linha permitindo conexões:
# host    vai_de_pix    vai_de_pix_user    0.0.0.0/0    md5
```

### 4. Testar conexão via linha de comando

Do seu PC (se tiver psql instalado):
```bash
psql -h 192.168.10.130 -U vai_de_pix_user -d vai_de_pix
```

## 📝 Resumo Rápido

1. ✅ Preencha apenas os campos individuais (Host, Port, Database, Username, Password)
2. ❌ NÃO preencha o campo "JDBC URL" manualmente
3. ✅ Deixe o DBeaver gerar a URL JDBC automaticamente
4. ✅ Clique em "Testar Conexão" antes de finalizar

---

**Última atualização**: Janeiro 2025

