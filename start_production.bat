@echo off
echo ===============================================
echo 🚀 VAI DE PIX - Iniciando Servidor de Producao
echo ===============================================

cd backend

echo 📦 Ativando ambiente virtual...
call venv\Scripts\activate.bat

echo 🗄️ Inicializando banco de dados...
python init_db.py

echo 🌐 Iniciando servidor...
python production_server.py

pause
