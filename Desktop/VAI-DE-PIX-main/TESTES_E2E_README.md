# 🧪 TESTES E2E - VAI DE PIX

## 📋 Visão Geral

Testes end-to-end completos usando **pytest** + **FastAPI TestClient** para validar fluxos completos da aplicação.

## 🚀 Instalação

```bash
cd backend
pip install -r requirements-test.txt
```

## 🧪 Executar Testes

### Todos os Testes E2E
```bash
cd backend
pytest tests/e2e/ -v
```

### Teste Específico
```bash
pytest tests/e2e/test_auth_e2e.py -v
pytest tests/e2e/test_transactions_e2e.py -v
pytest tests/e2e/test_export_e2e.py -v
pytest tests/e2e/test_recurring_e2e.py -v
pytest tests/e2e/test_balance_reconciliation_e2e.py -v
```

### Com Makefile
```bash
make test-e2e
```

## 📝 Testes Implementados

### 1. Autenticação (`test_auth_e2e.py`)
- ✅ `test_register_creates_default_data` - Verifica criação automática de contas e categorias
- ✅ `test_login_returns_valid_jwt` - Valida JWT retornado
- ✅ `test_login_with_invalid_credentials` - Testa falha com credenciais inválidas
- ✅ `test_protected_route_requires_auth` - Verifica proteção de rotas

### 2. Transações (`test_transactions_e2e.py`)
- ✅ `test_create_income_increases_balance` - Receita aumenta saldo
- ✅ `test_create_expense_decreases_balance` - Despesa diminui saldo
- ✅ `test_create_transfer_creates_two_legs` - Transferência cria duas pernas
- ✅ `test_soft_delete_removes_from_listing` - Soft delete remove da listagem
- ✅ `test_restore_transaction` - Restore traz transação de volta

### 3. Exportação (`test_export_e2e.py`)
- ✅ `test_export_csv_format` - Exportação CSV com formato correto
- ✅ `test_export_json_format` - Exportação JSON funciona

### 4. Recorrências (`test_recurring_e2e.py`)
- ✅ `test_recurring_transaction_execution` - Execução manual de transação recorrente

### 5. Reconciliação (`test_balance_reconciliation_e2e.py`)
- ✅ `test_recalculate_balance_endpoint` - Endpoint de recálculo funciona

## 🔧 Configuração

Os testes usam banco de dados SQLite em memória (`test_e2e.db`) que é criado e destruído a cada teste.

## 📊 Cobertura

- ✅ Autenticação completa
- ✅ CRUD de transações
- ✅ Transferências (duas pernas)
- ✅ Soft delete e restore
- ✅ Exportação CSV/JSON
- ✅ Transações recorrentes
- ✅ Reconciliação de saldo

## 🐛 Troubleshooting

### Erro: "No module named 'playwright'"
```bash
pip install playwright
playwright install chromium
```

### Erro: "Database locked"
- Certifique-se de que não há outras conexões ao banco de teste
- Os testes criam e destroem o banco automaticamente

### Erro: "Fixture not found"
- Verifique se `conftest.py` está na pasta `tests/e2e/`
- Certifique-se de que todas as fixtures estão definidas

---

**💰 VAI DE PIX - Testes E2E completos e funcionando!**

