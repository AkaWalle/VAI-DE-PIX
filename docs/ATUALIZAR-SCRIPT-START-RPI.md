# 🔄 Atualizar Script start-vai-de-pix.sh no Raspberry Pi

## 🐛 Problema

O script `start-vai-de-pix.sh` no Raspberry Pi ainda mostra `localhost:8000` nas mensagens principais, em vez do IP do Raspberry Pi.

## ✅ Solução

O script foi corrigido no repositório. Você precisa atualizar o script local no Raspberry Pi.

## 📋 Opção 1: Recriar o Script (Recomendado)

Execute no Raspberry Pi:

```bash
# 1. Parar servidor atual
pkill -f gunicorn

# 2. Atualizar código
cd ~/vai-de-pix
git pull origin raspberry-pi-5

# 3. Recriar o script (copiar do scripts/)
cp scripts/start-vai-de-pix-rpi5.sh start-vai-de-pix.sh
chmod +x start-vai-de-pix.sh

# 4. Reiniciar servidor
./start-vai-de-pix.sh
```

## 📋 Opção 2: Editar o Script Manualmente

Se preferir editar manualmente:

```bash
# 1. Parar servidor
pkill -f gunicorn

# 2. Editar o script
nano ~/vai-de-pix/start-vai-de-pix.sh

# 3. Procurar por estas linhas (por volta da linha 282):
#    echo "🌐 ACESSO LOCAL:"
#    echo "   http://localhost:$PORT"
#    echo ""
#    if [ -n "$LOCAL_IP" ]; then
#        echo "📱 ACESSO PELA REDE (use no celular/outros dispositivos):"
#        echo "   http://$LOCAL_IP:$PORT"
#        echo ""
#    fi
#    echo "📚 API Docs: http://localhost:$PORT/docs"
#    echo "🏥 Health: http://localhost:$PORT/api/health"

# 4. Substituir por:
#    if [ -n "$LOCAL_IP" ]; then
#        echo "🌐 ACESSO PELA REDE (use este IP em outros dispositivos):"
#        echo "   http://$LOCAL_IP:$PORT"
#        echo ""
#        echo "📚 API Docs: http://$LOCAL_IP:$PORT/docs"
#        echo "🏥 Health: http://$LOCAL_IP:$PORT/api/health"
#    else
#        echo "🌐 ACESSO LOCAL:"
#        echo "   http://localhost:$PORT"
#        echo ""
#        echo "📚 API Docs: http://localhost:$PORT/docs"
#        echo "🏥 Health: http://localhost:$PORT/api/health"
#    fi
#    echo ""
#    echo "💻 ACESSO LOCAL (no próprio Raspberry Pi):"
#    echo "   http://localhost:$PORT"

# 5. Salvar (Ctrl+O, Enter, Ctrl+X)

# 6. Reiniciar servidor
./start-vai-de-pix.sh
```

## ✅ Verificar se Funcionou

Após atualizar e reiniciar, você deve ver:

```
🌐 ACESSO PELA REDE (use este IP em outros dispositivos):
   http://192.168.10.130:8000

📚 API Docs: http://192.168.10.130:8000/docs
🏥 Health: http://192.168.10.130:8000/api/health

💻 ACESSO LOCAL (no próprio Raspberry Pi):
   http://localhost:8000
```

## 📝 Resumo dos Comandos (Opção 1 - Recomendada)

```bash
pkill -f gunicorn
cd ~/vai-de-pix
git pull origin raspberry-pi-5
cp scripts/start-vai-de-pix-rpi5.sh start-vai-de-pix.sh
chmod +x start-vai-de-pix.sh
./start-vai-de-pix.sh
```

---

**Última atualização**: Janeiro 2025

