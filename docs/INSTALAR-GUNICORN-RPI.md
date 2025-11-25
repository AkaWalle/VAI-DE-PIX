# 🔧 Instalar Gunicorn no Raspberry Pi

Se você receber erro "No module named gunicorn", instale o Gunicorn no ambiente virtual.

## ✅ Solução Rápida

No Raspberry Pi, execute:

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate

# Instalar gunicorn
pip install gunicorn

# OU atualizar requirements.txt e reinstalar tudo
git pull origin raspberry-pi-5
pip install -r requirements.txt
```

## 🔄 Reinstalar Todas as Dependências

```bash
cd ~/vai-de-pix/backend
source venv/bin/activate

# Atualizar requirements.txt
git pull origin raspberry-pi-5

# Reinstalar dependências
pip install -r requirements.txt
```

## 🧪 Verificar Instalação

```bash
# Verificar se gunicorn está instalado
pip list | grep gunicorn

# OU
python -c "import gunicorn; print('✅ Gunicorn instalado!')"
```

## 🚀 Depois, Iniciar Novamente

```bash
cd ~/vai-de-pix
./start-vai-de-pix.sh
```

---

**Última atualização**: Janeiro 2025

