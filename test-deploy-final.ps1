# Teste Final Pós-Deploy - VAI DE PIX (PowerShell)
# Uso: .\test-deploy-final.ps1 [FRONTEND_URL] [BACKEND_URL]

param(
    [string]$FrontendUrl = "https://vai-de-pix.vercel.app",
    [string]$BackendUrl = "https://seu-backend.up.railway.app"
)

Write-Host "🧪 TESTE FINAL - VAI DE PIX" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend: $FrontendUrl" -ForegroundColor Yellow
Write-Host "Backend:  $BackendUrl" -ForegroundColor Yellow
Write-Host ""

# 1. Testar Frontend
Write-Host "1️⃣ Testando Frontend..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri $FrontendUrl -Method Get -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend responde (HTTP $($response.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend não responde (HTTP $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erro ao testar frontend: $_" -ForegroundColor Red
}

# 2. Testar API Health
Write-Host ""
Write-Host "2️⃣ Testando API Health..." -ForegroundColor Cyan
$apiHealthUrl = "$BackendUrl/api/health"
try {
    $apiResponse = Invoke-RestMethod -Uri $apiHealthUrl -Method Get -TimeoutSec 10
    if ($apiResponse.status -eq "healthy") {
        Write-Host "✅ API Health responde:" -ForegroundColor Green
        $apiResponse | ConvertTo-Json -Depth 3
    } else {
        Write-Host "❌ API Health não responde corretamente:" -ForegroundColor Red
        $apiResponse | ConvertTo-Json
    }
} catch {
    Write-Host "❌ Erro ao testar API Health: $_" -ForegroundColor Red
}

# 3. Testar API Root
Write-Host ""
Write-Host "3️⃣ Testando API Root..." -ForegroundColor Cyan
$apiRootUrl = "$BackendUrl/api"
try {
    $apiRootResponse = Invoke-RestMethod -Uri $apiRootUrl -Method Get -TimeoutSec 10
    if ($apiRootResponse.message -like "*VAI DE PIX*") {
        Write-Host "✅ API Root responde" -ForegroundColor Green
    } else {
        Write-Host "⚠️  API Root pode ter problema:" -ForegroundColor Yellow
        $apiRootResponse | ConvertTo-Json
    }
} catch {
    Write-Host "⚠️  Erro ao testar API Root: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ TESTE CONCLUÍDO" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Acesse $FrontendUrl no browser"
Write-Host "2. Abra Console (F12) e verifique erros"
Write-Host "3. Tente fazer login/registro"
Write-Host "4. Verifique se API funciona corretamente"

