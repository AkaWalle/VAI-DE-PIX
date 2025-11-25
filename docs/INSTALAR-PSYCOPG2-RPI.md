# 🔧 Instalar psycopg2 no Raspberry Pi

O `psycopg2` é necessário para conectar ao PostgreSQL. Siga estes passos:

## ✅ Solução Rápida

No Raspberry Pi, execute:

```bash
cd ~/vai-de-pix/backend

# Ativar ambiente virtual
source venv/bin/activate

# Instalar psycopg2-binary (versão pré-compilada, mais fácil)
pip install psycopg2-binary

# OU instalar psycopg2 (requer compilação)
# Primeiro instalar dependências do sistema:
sudo apt install -y libpq-dev python3-dev gcc
pip install psycopg2

# Verificar instalação
python -c "import psycopg2; print('psycopg2 instalado com sucesso!')"
```

## 🔄 Reinstalar Todas as Dependências

Se preferir reinstalar tudo:

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate

# Atualizar requirements.txt primeiro
git pull origin raspberry-pi-5

# Reinstalar dependências
pip install -r requirements.txt
```

## 📝 Verificar Instalação

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate
python -c "import psycopg2; print('✅ psycopg2 OK')"
```

## 🚀 Continuar Setup

Após instalar o psycopg2:

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate

# Executar migrações
alembic upgrade head

# Voltar para raiz e continuar
cd ~/vai-de-pix
```

---

**Última atualização**: Janeiro 2025

