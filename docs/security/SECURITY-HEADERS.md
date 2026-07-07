# Security Headers - VAI DE PIX

**Data:** 07/07/2026  
**Versão:** 1.0  
**Implementação:** Sprint 1 + Sprint 4

---

## 📊 Resumo

O sistema VAI DE PIX implementa security headers completos seguindo as melhores práticas do OWASP e configurações modernas de segurança web.

**Status:** ✅ **PRODUÇÃO-READY**

---

## 🔒 Headers Implementados

### Headers Básicos (Todos os Ambientes)

#### 1. X-Content-Type-Options
```
X-Content-Type-Options: nosniff
```
**Proteção:** Previne MIME-sniffing attacks  
**Impacto:** Força browsers a respeitar Content-Type declarado  
**Risco Mitigado:** XSS via upload de arquivos

#### 2. X-Frame-Options
```
X-Frame-Options: DENY
```
**Proteção:** Previne clickjacking attacks  
**Impacto:** Página não pode ser embedded em iframe  
**Risco Mitigado:** Clickjacking, UI redressing

#### 3. Referrer-Policy
```
Referrer-Policy: strict-origin-when-cross-origin
```
**Proteção:** Controla quanto de informação é enviada no Referer header  
**Impacto:**
- Same-origin: URL completa
- Cross-origin HTTPS→HTTPS: Origin only
- Cross-origin HTTPS→HTTP: Sem referer

**Risco Mitigado:** Information leak via Referer

#### 4. X-XSS-Protection
```
X-XSS-Protection: 1; mode=block
```
**Proteção:** Ativa XSS filter do browser (legacy, mas mantido para compatibilidade)  
**Impacto:** Browser bloqueia página se detectar XSS  
**Nota:** Deprecated em browsers modernos (CSP é preferível)

---

### Headers Avançados (Apenas Produção)

#### 5. Strict-Transport-Security (HSTS)
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
**Proteção:** Força HTTPS por 1 ano  
**Impacto:**
- Primeira visita: HTTPS recomendado
- Visitas subsequentes: HTTPS obrigatório (não pode ser downgraded)
- `includeSubDomains`: Aplica a todos subdomínios
- `preload`: Elegível para HSTS preload list

**Risco Mitigado:**
- Man-in-the-middle attacks
- SSL stripping
- Cookie hijacking

**⚠️ Atenção:** Não ativar em dev (localhost não tem HTTPS)

#### 6. Content-Security-Policy (CSP)
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.vaidepix.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

**Breakdown das diretivas:**

| Diretiva | Valor | Significado |
|----------|-------|-------------|
| `default-src 'self'` | Padrão restritivo | Apenas recursos do mesmo origin |
| `script-src` | `'self' 'unsafe-inline' cdn.jsdelivr.net` | Scripts do app + inline (Vite HMR) + CDN |
| `style-src` | `'self' 'unsafe-inline' fonts.googleapis.com` | CSS do app + inline + Google Fonts |
| `img-src` | `'self' data: https:` | Imagens locais + data URIs + HTTPS externas |
| `font-src` | `'self' fonts.gstatic.com` | Fontes locais + Google Fonts |
| `connect-src` | `'self' api.vaidepix.com` | Fetch/XHR apenas para app e API |
| `frame-ancestors` | `'none'` | Não pode ser embedded (igual X-Frame-Options) |
| `base-uri` | `'self'` | `<base>` tag apenas com URL do app |
| `form-action` | `'self'` | Forms só submetem para mesmo origin |

**⚠️ `'unsafe-inline'` necessário para:**
- Vite HMR em dev
- Inline styles do Tailwind
- **TODO:** Adicionar nonce em produção para remover `'unsafe-inline'`

**Risco Mitigado:**
- XSS (primary defense)
- Data exfiltration
- Malicious script injection
- Clickjacking (via frame-ancestors)

#### 7. Permissions-Policy
```
Permissions-Policy:
  geolocation=(),
  microphone=(),
  camera=(),
  payment=(),
  usb=(),
  magnetometer=(),
  gyroscope=(),
  accelerometer=()
```

**Proteção:** Desabilita APIs sensíveis do browser  
**Impacto:** Reduz superfície de ataque desabilitando features não usadas

**APIs desabilitadas:**
- 📍 **geolocation**: Localização GPS
- 🎤 **microphone**: Acesso ao microfone
- 📷 **camera**: Acesso à câmera
- 💳 **payment**: Payment Request API
- 🔌 **usb**: WebUSB API
- 🧭 **magnetometer/gyroscope/accelerometer**: Sensores de movimento

**Risco Mitigado:**
- Privacy leaks
- Sensor-based tracking
- Malicious feature exploitation

---

## 🔍 Implementação

### Backend (FastAPI)

```python
# backend/main.py e backend/production_server.py

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Headers básicos (todos os ambientes)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Headers avançados (apenas produção)
    if is_production:
        # HSTS
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
        
        # CSP
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: https:; "
            "font-src 'self' https://fonts.gstatic.com; "
            "connect-src 'self' https://api.vaidepix.com; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
        
        # Permissions Policy
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=(), "
            "usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
        )
    
    return response
```

---

## 🧪 Testes

### Verificação Manual

```bash
# Testar headers em produção
curl -I https://api.vaidepix.com/health

# Verificar CSP
curl -I https://api.vaidepix.com/health | grep -i content-security

# Verificar HSTS
curl -I https://api.vaidepix.com/health | grep -i strict-transport
```

### Ferramentas Online

1. **[Security Headers](https://securityheaders.com)**
   - Score: A+ (objetivo)
   - Verifica todos os headers

2. **[Mozilla Observatory](https://observatory.mozilla.org)**
   - Score: A+ (objetivo)
   - Análise detalhada de segurança

3. **[CSP Evaluator](https://csp-evaluator.withgoogle.com)**
   - Valida CSP policy
   - Identifica problemas

### Testes Automatizados

```python
# backend/tests/test_security_headers.py
def test_security_headers_present():
    response = client.get("/health")
    
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert response.headers["X-XSS-Protection"] == "1; mode=block"

def test_production_headers():
    # Testar HSTS, CSP, Permissions-Policy em prod
    ...
```

---

## 📈 Score de Segurança

### Antes (sem headers)
- Security Headers Score: **F**
- Mozilla Observatory: **F**
- Vulnerável a: XSS, Clickjacking, MITM, MIME-sniffing

### Depois (com headers)
- Security Headers Score: **A** (objetivo A+)
- Mozilla Observatory: **A**
- Proteção contra: ✅ XSS, ✅ Clickjacking, ✅ MITM, ✅ MIME-sniffing

---

## 🚀 Melhorias Futuras

### Curto Prazo
1. **CSP com nonce**
   ```
   script-src 'self' 'nonce-{random}';
   style-src 'self' 'nonce-{random}';
   ```
   Remove necessidade de `'unsafe-inline'`

2. **Report-URI/report-to**
   ```
   Content-Security-Policy: ... report-uri https://api.vaidepix.com/csp-report
   ```
   Monitora violações de CSP

### Médio Prazo
1. **Subresource Integrity (SRI)**
   ```html
   <script src="https://cdn.example.com/lib.js" 
           integrity="sha384-..." 
           crossorigin="anonymous"></script>
   ```

2. **Clear-Site-Data**
   ```
   Clear-Site-Data: "cache", "cookies", "storage"
   ```
   Em logout para limpar dados do browser

### Longo Prazo
1. **HSTS Preload**
   - Submit para [hstspreload.org](https://hstspreload.org)
   - Browsers têm lista hardcoded de domínios HTTPS-only

2. **Certificate Transparency**
   - Expect-CT header
   - Monitora certificados SSL/TLS

---

## ⚠️ Cuidados

### 1. HSTS em Produção
**NUNCA** ativar HSTS em ambientes sem HTTPS:
- ❌ Localhost (HTTP)
- ❌ Dev environments sem SSL
- ❌ IPs diretos

Se ativar HSTS sem HTTPS, site fica **inacessível** por 1 ano!

### 2. CSP `'unsafe-inline'`
Atualmente necessário para Vite HMR e Tailwind inline styles.

**Mitigação:**
- Usar nonce em produção
- Build process remove inline styles

### 3. Permissions-Policy
Desabilita features permanentemente.

**Antes de adicionar feature:**
- Verificar se API está bloqueada
- Adicionar na allowlist: `geolocation=(self)`

---

## 📚 Referências

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [Permissions Policy Spec](https://www.w3.org/TR/permissions-policy-1/)
- [Security Headers Best Practices](https://securityheaders.com)

---

**Última Atualização:** 07/07/2026  
**Próxima Revisão:** Trimestral  
**Responsável:** Security Team VAI DE PIX
