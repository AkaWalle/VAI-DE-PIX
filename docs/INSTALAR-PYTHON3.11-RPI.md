# 🐍 Como Instalar Python 3.11 no Raspberry Pi OS

Se o Python 3.11 não estiver disponível nos repositórios padrão, você pode instalá-lo de algumas formas:

## Método 1: Usar Python Disponível (Mais Fácil)

O projeto funciona com **Python 3.9+**, então você pode usar a versão que já vem instalada:

```bash
# Verificar versão do Python
python3 --version

# Se for 3.9 ou superior, está tudo certo!
# O script de setup foi atualizado para usar a versão disponível
```

## Método 2: Instalar Python 3.11 via deadsnakes PPA

```bash
# Adicionar repositório deadsnakes
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update

# Instalar Python 3.11
sudo apt install -y python3.11 python3.11-venv python3.11-dev
```

## Método 3: Compilar Python 3.11 (Avançado)

Se os métodos acima não funcionarem:

```bash
# Instalar dependências de compilação
sudo apt update
sudo apt install -y build-essential zlib1g-dev libncurses5-dev libgdbm-dev libnss3-dev libssl-dev libreadline-dev libffi-dev libsqlite3-dev wget libbz2-dev

# Baixar Python 3.11
cd /tmp
wget https://www.python.org/ftp/python/3.11.7/Python-3.11.7.tgz
tar -xf Python-3.11.7.tgz
cd Python-3.11.7

# Configurar e compilar
./configure --enable-optimizations
make -j$(nproc)
sudo make altinstall

# Verificar instalação
python3.11 --version
```

## Método 4: Usar pyenv (Recomendado para Desenvolvimento)

```bash
# Instalar dependências
sudo apt update
sudo apt install -y make build-essential libssl-dev zlib1g-dev \
    libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm \
    libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev \
    libffi-dev liblzma-dev

# Instalar pyenv
curl https://pyenv.run | bash

# Adicionar ao .bashrc
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(pyenv init -)"' >> ~/.bashrc

# Recarregar shell
source ~/.bashrc

# Instalar Python 3.11
pyenv install 3.11.7
pyenv global 3.11.7

# Verificar
python --version
```

## ⚠️ Nota Importante

**O projeto funciona com Python 3.9+**, então você não precisa necessariamente do Python 3.11. O script de setup foi atualizado para usar automaticamente a versão disponível do Python.

Se você já tem Python 3.9, 3.10 ou 3.11 instalado, pode continuar com o setup normalmente!

## ✅ Verificar Versão Atual

```bash
python3 --version
python3 -m pip --version
```

Se mostrar Python 3.9 ou superior, você está pronto para continuar!

---

**Última atualização**: Janeiro 2025

