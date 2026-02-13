# Libera portas 5000 (frontend) e 8000 (backend) no firewall para rede privada.
# Execute como Administrador: botão direito no script -> "Executar com PowerShell como administrador"
# Ou: PowerShell (Admin) -> .\liberar-portas-rede.ps1

$rule1 = "Vai de Pix - Frontend (5000)"
$rule2 = "Vai de Pix - Backend (8000)"

# Remove regras antigas se existirem (evita duplicata)
netsh advfirewall firewall delete rule name="$rule1" 2>$null
netsh advfirewall firewall delete rule name="$rule2" 2>$null

netsh advfirewall firewall add rule name="$rule1" dir=in action=allow protocol=TCP localport=5000 profile=private
netsh advfirewall firewall add rule name="$rule2" dir=in action=allow protocol=TCP localport=8000 profile=private

Write-Host "Regras adicionadas. Portas 5000 e 8000 liberadas para rede privada." -ForegroundColor Green
