# ✅ Vai de Pix Rodando no Raspberry Pi 5 - Guia Completo

## 🎉 Status: Funcionando!

O servidor está rodando corretamente na porta **8000**.

## 🚀 Como Iniciar

```bash
cd ~/vai-de-pix
./start-vai-de-pix.sh
```

## 🌐 Acessar o Sistema

### No Raspberry Pi (local):
```
http://localhost:8000
```

### De outros dispositivos na rede:
```
http://192.168.10.130:8000
```
*(Substitua pelo IP do seu Raspberry Pi)*

## 🔑 Login Padrão

- **Email**: `admin@vaidepix.com`
- **Senha**: `123456`

## 📚 Endpoints Úteis

- **Frontend**: `http://[IP]:8000`
- **API Docs**: `http://[IP]:8000/docs`
- **Health Check**: `http://[IP]:8000/api/health`

## 🛑 Parar o Servidor

```bash
# Encontrar o PID
ps aux | grep gunicorn

# Parar
kill <PID>
```

## 📝 Ver Logs

```bash
tail -f backend/logs/*.log
```

## 🔧 Resolver Conflito Git (se necessário)

Se aparecer erro de conflito ao fazer `git pull`:

```bash
cd ~/vai-de-pix

# Salvar mudanças locais
git stash

# Atualizar
git pull origin raspberry-pi-5
```

## ✅ Checklist de Funcionamento

- [x] Gunicorn instalado
- [x] Servidor iniciando
- [x] Workers rodando (2 workers)
- [x] Banco de dados conectado
- [x] Aplicação iniciada

## 🎯 Próximos Passos

1. Acessar `http://192.168.10.130:8000` de outro dispositivo
2. Fazer login com as credenciais padrão
3. Configurar o sistema conforme necessário

---

**Última atualização**: Janeiro 2025

