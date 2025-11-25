# Script para iniciar Backend e Frontend do VAI DE PIX
Write-Host "=== Iniciando Sistema VAI DE PIX ===" -ForegroundColor Cyan
Write-Host ""

# Parar processos antigos
Write-Host "[1/3] Parando processos antigos..." -ForegroundColor Yellow
Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*python*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "OK - Processos parados" -ForegroundColor Green
Write-Host ""

# Verificar Ollama
Write-Host "[2/3] Verificando Ollama..." -ForegroundColor Yellow
try {
    $ollamaCheck = ollama list 2>&1
    if ($ollamaCheck -match "llama3.2") {
        Write-Host "OK - Modelo llama3.2 encontrado" -ForegroundColor Green
    } else {
        Write-Host "AVISO - Modelo llama3.2 nao encontrado" -ForegroundColor Yellow
        Write-Host "  Execute: ollama pull llama3.2" -ForegroundColor Cyan
    }
} catch {
    Write-Host "AVISO - Ollama nao encontrado no PATH" -ForegroundColor Yellow
    Write-Host "  Mas pode estar rodando como servico" -ForegroundColor Cyan
}
Write-Host ""

# Iniciar Backend
Write-Host "[3/3] Iniciando Backend..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; python main.py" -WindowStyle Normal
Write-Host "OK - Backend iniciando em nova janela" -ForegroundColor Green
Write-Host ""

# Aguardar backend iniciar
Write-Host "Aguardando backend iniciar (10 segundos)..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Verificar backend
try {
    $health = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing -TimeoutSec 3
    Write-Host "OK - Backend esta rodando!" -ForegroundColor Green
} catch {
    Write-Host "AVISO - Backend ainda iniciando, aguarde..." -ForegroundColor Yellow
}

Write-Host ""

# Iniciar Frontend
Write-Host "Iniciando Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev" -WindowStyle Normal
Write-Host "OK - Frontend iniciando em nova janela" -ForegroundColor Green
Write-Host ""

Write-Host "=== Sistema Iniciado! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Acesse o sistema em:" -ForegroundColor Cyan
Write-Host "  http://localhost:5000" -ForegroundColor White
Write-Host "  ou" -ForegroundColor Gray
Write-Host "  http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Apos fazer login, voce tera acesso ao sistema completo" -ForegroundColor Cyan
Write-Host ""

