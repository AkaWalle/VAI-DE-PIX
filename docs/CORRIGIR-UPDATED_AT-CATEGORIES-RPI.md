# 🔧 Corrigir Erro: coluna updated_at não existe na tabela categories

## ❌ Erro

```
ERRO: coluna "updated_at" da relação "categories" não existe
```

## ✅ Solução

No Raspberry Pi, execute:

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate

# Atualizar código
git pull origin raspberry-pi-5

# Executar migrações
alembic upgrade head
```

## 🔍 Verificar se Funcionou

```bash
# Verificar estrutura da tabela categories
psql -U vai_de_pix_user -d vai_de_pix -c "\d categories"
```

Deve mostrar a coluna `updated_at` na lista.

## 🧪 Testar Novamente

Após executar as migrações, tente registrar um usuário novamente:

1. Acesse `http://192.168.10.130:8000/docs`
2. Teste o endpoint `POST /api/auth/register`
3. Ou tente pelo frontend em `http://192.168.10.130:8000`

## 📝 Comandos Completos

```bash
# 1. Parar servidor (se rodando)
pkill -f gunicorn

# 2. Atualizar e executar migrações
cd ~/vai-de-pix/backend
source venv/bin/activate
git pull origin raspberry-pi-5
alembic upgrade head

# 3. Reiniciar servidor
cd ~/vai-de-pix
./start-vai-de-pix.sh
```

---

**Última atualização**: Janeiro 2025

