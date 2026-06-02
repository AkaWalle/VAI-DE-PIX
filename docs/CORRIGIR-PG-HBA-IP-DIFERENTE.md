# 🔧 Corrigir pg_hba.conf para IP Diferente

## 🐛 Problema

```
FATAL: nenhuma entrada em pg_hba.conf para o hospedeiro "10.250.250.2", 
usuário "vai_de_pix_user", banco de dados "postgres", encriptação SSL
```

**Causas:**
1. O IP `10.250.250.2` não está na faixa `192.168.6.0/24` configurada
2. Está tentando conectar ao banco `postgres` em vez de `vai_de_pix`

## ✅ Solução

### Opção 1: Adicionar regra para o IP específico

Execute no servidor onde o PostgreSQL está instalado:

```bash
# Adicionar regra para o IP 10.250.250.2
sudo nano /etc/postgresql/17/main/pg_hba.conf
```

Adicione no final do arquivo:

```
# Permitir conexão do IP 10.250.250.2
host    vai_de_pix    vai_de_pix_user    10.250.250.2/32    md5
host    postgres      vai_de_pix_user    10.250.250.2/32    md5
```

Salve: `Ctrl+O`, `Enter`, `Ctrl+X`

### Opção 2: Permitir toda a rede 10.250.250.0/24

Se você estiver em uma rede diferente:

```bash
sudo nano /etc/postgresql/17/main/pg_hba.conf
```

Adicione:

```
# Permitir conexões da rede 10.250.250.0/24
host    vai_de_pix    vai_de_pix_user    10.250.250.0/24    md5
host    postgres      vai_de_pix_user    10.250.250.0/24    md5
```

### Opção 3: Permitir qualquer IP (menos seguro, mas mais fácil)

```bash
sudo nano /etc/postgresql/17/main/pg_hba.conf
```

Adicione:

```
# Permitir conexões de qualquer IP (CUIDADO: menos seguro)
host    vai_de_pix    vai_de_pix_user    0.0.0.0/0    md5
host    postgres      vai_de_pix_user    0.0.0.0/0    md5
```

## 🔄 Reiniciar PostgreSQL

Após adicionar a regra:

```bash
sudo systemctl restart postgresql
```

## 🔍 Verificar regras adicionadas

```bash
sudo grep vai_de_pix_user /etc/postgresql/17/main/pg_hba.conf
```

Deve mostrar todas as regras para esse usuário.

## 📋 Configuração Recomendada

Para ter acesso completo, adicione estas regras:

```bash
sudo nano /etc/postgresql/17/main/pg_hba.conf
```

Adicione no final:

```
# Permitir conexões remotas para vai_de_pix
# Rede 192.168.6.0/24
host    vai_de_pix    vai_de_pix_user    192.168.6.0/24    md5
host    postgres      vai_de_pix_user    192.168.6.0/24    md5

# Rede 10.250.250.0/24
host    vai_de_pix    vai_de_pix_user    10.250.250.0/24    md5
host    postgres      vai_de_pix_user    10.250.250.0/24    md5
```

## ⚠️ Importante: Banco de Dados Correto

No DBeaver, use:
- **Database**: `vai_de_pix` (não `postgres`)

Se quiser acessar ambos, adicione regras para os dois bancos como mostrado acima.

## 🧪 Testar

Após reiniciar:

```bash
# Verificar se PostgreSQL reiniciou
sudo systemctl status postgresql

# Verificar regras
sudo tail -10 /etc/postgresql/17/main/pg_hba.conf
```

Tente conectar novamente no DBeaver.

---

**Última atualização**: Janeiro 2025

