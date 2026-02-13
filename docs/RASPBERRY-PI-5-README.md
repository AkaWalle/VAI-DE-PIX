# 🍓 Vai de Pix - Branch Raspberry Pi 5

Esta branch contém todas as configurações e otimizações necessárias para rodar o projeto **Vai de Pix** em um Raspberry Pi 5.

## 📁 Arquivos Adicionados/Modificados

### Novos Arquivos

1. **`RASPBERRY-PI-5-SETUP.md`** - Guia completo de instalação e configuração
2. **`backend/Dockerfile.arm64`** - Dockerfile otimizado para arquitetura ARM64
3. **`backend/gunicorn_config.rpi5.py`** - Configuração do Gunicorn otimizada para RPi 5
4. **`docker-compose.rpi5.yml`** - Docker Compose com limites de recursos para RPi 5

### Arquivos Modificados

1. **`scripts/setup-raspberry-pi.sh`** - Atualizado para usar configurações otimizadas

## 🚀 Início Rápido

### 1. Instalação Automatizada

```bash
git checkout raspberry-pi-5
chmod +x scripts/setup-raspberry-pi.sh
./scripts/setup-raspberry-pi.sh
```

### 2. Executar o Projeto

```bash
./start-vai-de-pix.sh
```

### 3. Usando Docker (Opcional)

```bash
docker-compose -f docker-compose.rpi5.yml up -d
```

## 🔧 Otimizações Implementadas

### Backend

- **Workers reduzidos**: 2 workers (ao invés de 4+)
- **Memória limitada**: Configurações conservadoras
- **Timeout aumentado**: 180s para requisições longas
- **Preload desabilitado**: Economiza memória inicial
- **Worker connections reduzido**: 500 (ao invés de 1000)

### Docker

- **Plataforma ARM64**: Imagens específicas para RPi 5
- **Limites de recursos**: CPU e memória limitados
- **Health checks**: Configurados para RPi 5

### PostgreSQL

- **Configurações otimizadas**: Para hardware limitado
- **Limites de recursos**: 512MB RAM máximo

## 📊 Requisitos de Sistema

- **Raspberry Pi 5** (4GB RAM mínimo, 8GB recomendado)
- **Raspberry Pi OS** (64-bit)
- **32GB+** de armazenamento (SSD recomendado)
- **Conexão com internet** para instalação

## 📚 Documentação

Consulte **`RASPBERRY-PI-5-SETUP.md`** para:
- Instalação passo a passo
- Configuração de serviços systemd
- Otimizações de performance
- Troubleshooting
- Configuração de segurança
- Backup e manutenção

## 🔄 Diferenças da Branch Main

1. **Configurações de produção otimizadas** para hardware limitado
2. **Dockerfiles específicos** para ARM64
3. **Scripts de setup** atualizados
4. **Documentação específica** para Raspberry Pi 5

## ⚠️ Notas Importantes

- Esta branch é experimental e pode precisar de ajustes
- Performance será menor que em servidores dedicados
- Recomendado para uso pessoal ou pequenos grupos
- Monitore temperatura e recursos do RPi 5

## 🐛 Problemas Conhecidos

- Build do frontend pode ser lento (use `NODE_OPTIONS="--max-old-space-size=2048"`)
- PostgreSQL pode precisar de ajustes de memória
- Docker pode consumir muitos recursos (use apenas se necessário)

## 📝 Próximos Passos

1. Testar instalação em RPi 5 real
2. Ajustar configurações conforme necessário
3. Documentar problemas encontrados
4. Criar testes específicos para ARM64

---

**Branch**: `raspberry-pi-5`  
**Última atualização**: Janeiro 2025

