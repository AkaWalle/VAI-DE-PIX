# Exporta configurações do Cursor para outra máquina
# Uso: executar no PowerShell no PC de origem

$cursorUser = "$env:APPDATA\Cursor\User"
$destBase = "$env:USERPROFILE\Desktop\Cursor-Config-Export"
$destUser = "$destBase\User"

if (-not (Test-Path $cursorUser)) {
    Write-Host "Pasta do Cursor nao encontrada: $cursorUser" -ForegroundColor Red
    exit 1
}

Write-Host "Exportando configuracao do Cursor para: $destBase" -ForegroundColor Cyan

# Criar estrutura
New-Item -ItemType Directory -Path $destUser -Force | Out-Null
New-Item -ItemType Directory -Path "$destUser\snippets" -Force | Out-Null

# Arquivos principais
$files = @("settings.json", "keybindings.json")
foreach ($f in $files) {
    $src = Join-Path $cursorUser $f
    if (Test-Path $src) {
        Copy-Item $src -Destination (Join-Path $destUser $f) -Force
        Write-Host "  Copiado: $f" -ForegroundColor Green
    } else {
        Write-Host "  Nao encontrado: $f" -ForegroundColor Yellow
    }
}

# Snippets
$snippetsSrc = Join-Path $cursorUser "snippets"
if (Test-Path $snippetsSrc) {
    Copy-Item "$snippetsSrc\*" -Destination "$destUser\snippets" -Recurse -Force
    Write-Host "  Copiado: pasta snippets" -ForegroundColor Green
}

# Instruções no destino
$readme = @"
COMO IMPORTAR NO OUTRO PC
=========================

1. Instale o Cursor e abra pelo menos uma vez.
2. No Explorador, abra: %APPDATA%\Cursor\User
   (cole isso na barra de endereco)
3. Copie o conteudo desta pasta 'User' (settings.json, keybindings.json e a pasta snippets) para la.
4. Substitua os arquivos quando perguntado.
5. Reinicie o Cursor.

Exportado em: $(Get-Date -Format "yyyy-MM-dd HH:mm")
"@
$readme | Out-File -FilePath "$destBase\COMO-IMPORTAR.txt" -Encoding UTF8

Write-Host ""
Write-Host "Concluido. Pasta criada na Area de Trabalho: Cursor-Config-Export" -ForegroundColor Green
Write-Host "Copie essa pasta para o outro PC e siga as instrucoes em COMO-IMPORTAR.txt" -ForegroundColor Cyan
