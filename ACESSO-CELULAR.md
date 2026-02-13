# Acesso ao Vai de Pix pelo celular

## 1. Celular na mesma rede que o PC

- Conecte o **celular no mesmo Wi‑Fi** que o PC (ou na mesma rede Ethernet, se aplicável).
- Desative **dados móveis** no celular para forçar o uso do Wi‑Fi.

## 2. Liberar firewall no PC (uma vez)

As portas 5000 e 8000 precisam estar liberadas para a rede:

1. Abra **PowerShell como Administrador** (botão direito no menu Iniciar → “Windows PowerShell (Admin)”).
2. Vá até a pasta do projeto e execute:
   ```powershell
   cd "C:\Users\wallace.ventura\Desktop\Vai de pix\scripts"
   .\liberar-portas-rede.ps1
   ```
3. Se pedir para permitir execução de scripts:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```
   Depois rode o script de novo.

## 3. Qual IP usar no celular

No PC, o comando abaixo mostra os IPs. No celular, teste **cada um** no navegador até um funcionar:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.' } | Select-Object IPAddress, InterfaceAlias
```

**Exemplos de IPs (podem mudar):**

| Interface | IP típico        | Quando usar no celular      |
|-----------|-------------------|-----------------------------|
| Wi-Fi     | 192.168.100.197   | Celular no **mesmo Wi‑Fi**  |
| Ethernet  | 192.168.1.70      | Celular na mesma rede cabeada |
| Ethernet  | 192.168.0.70      | Outra rede (ex.: outro roteador) |

No navegador do **celular**, teste (trocando pelo seu IP real):

- http://192.168.100.197:5000/
- http://192.168.1.70:5000/
- http://192.168.0.70:5000/

Use o IP que aparecer como **Wi‑Fi** ou **Ethernet** (não use 192.168.176.1, que é do WSL/Docker).

## 4. Se o app abrir mas a API não responder

O frontend precisa falar com o backend no **mesmo IP** e na porta **8000**. No celular, se der erro de rede ao logar:

1. No **PC**, abra http://localhost:5000
2. Abra o DevTools (F12) → aba **Console**
3. Cole e execute (trocando `SEU_IP` pelo IP que funcionou no celular, ex.: 192.168.100.197):
   ```js
   localStorage.setItem('vai-de-pix-api-url', 'http://SEU_IP:8000/api');
   ```
4. No **celular**, acesse de novo **http://SEU_IP:5000/** e tente logar.

Observação: o `localStorage` é por “origem” (IP:porta). Se no celular você usa http://192.168.100.197:5000, esse valor não é compartilhado com o PC. Nesse caso, no próprio celular você precisaria definir a URL da API (por exemplo, se no futuro existir uma tela de configuração no app). Por enquanto, o app tenta detectar sozinho: ao abrir no celular em http://IP:5000, ele pode usar http://IP:5000/api (errado). Se isso acontecer, a solução definitiva é o backend ter a URL configurável (ex.: variável de ambiente no build ou tela de configuração).

## 5. Resumo rápido

1. PC e celular no **mesmo Wi‑Fi**.
2. Rodar **liberar-portas-rede.ps1** como **Administrador** no PC.
3. Descobrir o **IP do PC** (Wi‑Fi ou Ethernet).
4. No celular abrir **http://SEU_IP:5000/**.
5. Se a API falhar, configurar a URL da API (passo 4 acima ou ajuste no projeto).
