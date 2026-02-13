# Estratégia de backup PostgreSQL – VAI DE PIX

Este documento descreve a estratégia recomendada para backup do banco PostgreSQL em produção, incluindo script de dump diário e política de retenção.

---

## Objetivo

- Garantir recuperação em caso de falha ou perda de dados.
- Manter backups automáticos e previsíveis.
- Definir retenção clara para custo e conformidade.

---

## Política de retenção sugerida

| Tipo        | Frequência | Retenção | Uso principal          |
|------------|------------|----------|------------------------|
| Diário     | 1x/dia     | 7 dias   | Restore do dia         |
| Semanal    | 1x/semana  | 4 semanas| Restore da semana      |
| Mensal     | 1x/mês     | 12 meses | Auditoria / histórico  |

Ajuste conforme espaço em disco e requisitos de compliance.

---

## Script de dump diário

O script abaixo faz dump lógico (pg_dump) em formato custom (compressão e restore com pg_restore). Execute via cron no servidor que tem acesso ao PostgreSQL.

### Pré-requisitos

- `pg_dump` e `pg_restore` no PATH (pacote `postgresql-client` ou equivalente).
- Variável de ambiente `DATABASE_URL` ou variáveis separadas (`PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`).

### Script: `scripts/backup-postgres-daily.sh`

```bash
#!/usr/bin/env bash
# Backup diário PostgreSQL - VAI DE PIX
# Uso: ./scripts/backup-postgres-daily.sh
# Agendar com cron: 0 2 * * * /caminho/para/scripts/backup-postgres-daily.sh

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATE=$(date +%Y-%m-%d_%H%M%S)
DUMP_FILE="${BACKUP_DIR}/vai_de_pix_${DATE}.dump"

mkdir -p "$BACKUP_DIR"

# DATABASE_URL no formato: postgresql://user:pass@host:port/dbname
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERRO: DATABASE_URL não definida"
  exit 1
fi

echo "Iniciando dump em $DUMP_FILE"
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="$DUMP_FILE"

echo "Dump concluído. Removendo backups com mais de $RETENTION_DAYS dias."
find "$BACKUP_DIR" -name "vai_de_pix_*.dump" -mtime +$RETENTION_DAYS -delete

echo "Backup diário finalizado."
```

- **Formato custom**: compactado e restaurado com `pg_restore`.
- **--no-owner / --no-acl**: evita conflitos de usuário no ambiente de restore.
- **Retenção**: `find ... -mtime +$RETENTION_DAYS` remove dumps mais antigos que 7 dias (ajuste `RETENTION_DAYS` conforme a política).

### Restore a partir do dump

```bash
# Restore em um banco vazio (ex.: vai_de_pix_restore)
pg_restore --no-owner --no-acl -d "postgresql://user:pass@host:5432/vai_de_pix_restore" backups/postgres/vai_de_pix_YYYY-MM-DD_HHMMSS.dump
```

---

## Agendamento (cron)

Exemplo: executar todo dia às 02:00.

```cron
0 2 * * * BACKUP_DIR=/var/backups/vai-de-pix RETENTION_DAYS=7 /caminho/para/projeto/scripts/backup-postgres-daily.sh
```

Garanta que `DATABASE_URL` esteja definida no ambiente do cron (ex.: em um `.env` carregado pelo script ou no crontab).

---

## Segurança

- Não versionar `DATABASE_URL` nem scripts que a exponham.
- Manter o diretório de backup com permissões restritas (ex.: 700) e apenas o usuário do app/cron com acesso.
- Em cloud, preferir storage criptografado e acesso via IAM/roles.

---

## Backup em provedores managed

- **Neon / Supabase / Railway / RDS**: usar o backup automático do provedor e, se necessário, complementar com dumps periódicos para um bucket (S3, etc.) com lifecycle (retenção) definida.
- O script acima continua válido para dumps manuais ou em VM própria; para managed DB, seguir também a documentação do provedor.

---

**Última atualização:** Fevereiro 2025
