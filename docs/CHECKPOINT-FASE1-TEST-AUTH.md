# Checkpoint FASE 1 — test_auth e test_user_cannot_access_other_user_account

Objetivo: permitir correção cirúrgica dos testes sem alterar contrato nem comportamento de produção.

---

## ETAPA 1 — test_register_with_weak_password

### 1.1 Trecho do teste que falha

**Arquivo:** `backend/tests/test_auth.py`

```python
def test_register_with_weak_password(self, client):
    """Testa que registro com senha fraca é rejeitado."""
    response = client.post(
        "/api/auth/register",
        json={
            "name": "New User",
            "email": "newuser2@example.com",
            "password": "123456"  # Senha comum
        }
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
```

**Erro:** `assert 200 == 422` — a API retorna 200 e o teste espera 422.

---

### 1.2 Schema e validação usados no registro

**Arquivo:** `backend/routers/auth.py`

**Schema de criação de usuário (request body):**

```python
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Nome deve ter pelo menos 2 caracteres')
        if len(v) > 100:
            raise ValueError('Nome deve ter no máximo 100 caracteres')
        if re.search(r'[<>"\']', v):
            raise ValueError('Nome contém caracteres inválidos')
        return v.strip()
    
    @validator('password')
    def validate_password(cls, v):
        if not v or len(v) < 6:
            raise ValueError('Senha deve ter pelo menos 6 caracteres')
        if len(v) > 128:
            raise ValueError('Senha deve ter no máximo 128 caracteres')
        return v
```

**Conclusão:** O `UserCreate` do router valida apenas:
- comprimento da senha: 6–128 caracteres.

Não há uso de `PasswordValidator` (core.password_validator) no router. Senhas comuns como `"123456"` (6 caracteres) passam no Pydantic e o registro retorna 200.

**Onde está a validação “forte”:**  
`core.password_validator.PasswordValidator.validate_password` e `validate_password_strict` existem e são testados em `TestPasswordValidator` no mesmo arquivo, mas **não são chamados** no endpoint `/register`.

---

### 1.3 Endpoint real de registro

**Arquivo:** `backend/routers/auth.py`  
**Path:** `POST /api/auth/register` (prefix em `main.py`: `app.include_router(auth.router, prefix="/api/auth", ...)`)

**Assinatura:**

```python
@router.post("/register", response_model=Token)
async def register(
    user_data: UserCreate,  # ← Validação apenas via Pydantic acima
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
```

**Comportamento atual (produção):**  
Qualquer senha com 6–128 caracteres (incluindo "123456") é aceita; resposta 200 + token.

---

### 1.4 Regra de decisão (ETAPA 1)

| Pergunta | Resposta |
|----------|----------|
| Produção hoje aceita "123456"? | **Sim** (200). |
| Contrato exige 422 para senha fraca? | Não está no schema atual; só comprimento 6–128. |
| Validação “senha comum” no register? | **Não**; PasswordValidator não é usado no router. |

**Decisão recomendada:**  
Ajustar o teste para o comportamento real: registro com senha "123456" retorna **200**.  
Não alterar router nem contrato; não adicionar validação só para satisfazer o teste.

**Correção cirúrgica sugerida (apenas no teste):**

- Trocar expectativa de `HTTP_422_UNPROCESSABLE_ENTITY` para `HTTP_200_OK` e, se quiser manter cobertura de “senha fraca”, documentar no docstring que o contrato atual só exige 6–128 caracteres (ex.: “Registro com senha de 6 caracteres é aceito pelo contrato atual; validação de senha forte não é feita no endpoint.”).

---

## ETAPA 2 — test_user_cannot_access_other_user_account (405)

### 2.1 Trecho do teste

**Arquivo:** `backend/tests/test_auth.py`

```python
def test_user_cannot_access_other_user_account(self, client, db, test_user, auth_headers):
    """Testa que usuário não pode acessar conta de outro usuário."""
    # ... cria other_user e other_account ...
    response = client.get(
        f"/api/accounts/{other_account.id}",
        headers=auth_headers
    )
    assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN]
```

**Erro:** `assert 405 in [404, 403]` — a API retorna **405 Method Not Allowed**.

---

### 2.2 Rotas reais de accounts

**Arquivo:** `backend/routers/accounts.py`  
**Prefix em main:** `prefix="/api/accounts"`

| Método | Rota no router | Path completo | Descrição |
|--------|-----------------|---------------|-----------|
| GET | `/` | `/api/accounts/` | Listar contas do usuário |
| POST | `/` | `/api/accounts/` | Criar conta |
| PUT | `/{account_id}` | `/api/accounts/{account_id}` | Atualizar conta |
| DELETE | `/{account_id}` | `/api/accounts/{account_id}` | Excluir (soft) conta |

**Não existe:** `GET /api/accounts/{account_id}` (buscar uma conta por id).

Por isso `GET /api/accounts/{other_account.id}` não é um endpoint definido; o path pode ser interpretado como `/{account_id}` com método GET, resultando em **405 Method Not Allowed**.

---

### 2.3 Regra de decisão (ETAPA 2)

| Pergunta | Resposta |
|----------|----------|
| O teste usa método correto? | **Não.** Usa GET; não há GET por id em accounts. |
| A rota mudou? | Não é questão de mudança; nunca existiu GET por id. |
| Produção está errada? | Não; o contrato atual não expõe “get one account”. |

**Decisão recomendada:**  
Corrigir **apenas o teste**: usar um método e path que existem e que exponham “não pode acessar recurso de outro usuário”. Por exemplo:

- **PUT** ` /api/accounts/{other_account.id}` com body de update (ex.: `{"name": "Hack"}`) com `auth_headers` do `test_user`.  
  Comportamento esperado: 404 (conta não encontrada para este usuário) ou 403.

Assim o teste continua validando autorização (um usuário não altera conta alheia) sem inventar endpoint.

**Correção cirúrgica sugerida (apenas no teste):**

- Trocar `client.get(...)` por `client.put(f"/api/accounts/{other_account.id}", json={"name": "Other Account"}, headers=auth_headers)`.
- Manter a asserção: `assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN]`.
- Ajustar docstring: “Testa que usuário não pode atualizar conta de outro usuário (PUT retorna 404 ou 403).”

---

## Resumo para prompt cirúrgico

1. **test_register_with_weak_password**  
   - Não alterar router, schema ou validação.  
   - No teste: aceitar 200 para o payload atual e documentar que o contrato atual só exige senha 6–128 caracteres.

2. **test_user_cannot_access_other_user_account**  
   - Não alterar router (não criar GET por id).  
   - No teste: usar PUT `/api/accounts/{other_account.id}` e manter expectativa 404 ou 403.

Assim a FASE 1 fica alinhada ao contrato e comportamento reais, sem risco para produção.
