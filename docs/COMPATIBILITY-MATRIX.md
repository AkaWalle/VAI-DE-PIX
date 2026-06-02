# Matriz de Compatibilidade — Importação Bancária

Gerada automaticamente com base em `samples/inventory.json`.

| Banco | CSV | PDF | OFX | Status |
|--------|--------|--------|--------|--------|
| Itau | ✅ | ✅ | ✅ | Completo |
| Inter | ✅ | ✅ | ✅ | Completo |
| Nubank | ❌ | ❌ | ✅ | OFX only |
| Bradesco | ❌ | ❌ | ✅ | OFX only |
| Santander | ❌ | ❌ | ✅ | OFX only |
| Caixa | ❌ | ❌ | ✅ | OFX only |
| Banco do Brasil | ❌ | ❌ | ✅ | OFX only |
| Sicredi | ❌ | ❌ | ✅ | OFX only |
| Sicoob | ❌ | ❌ | ✅ | OFX only |
| Btg | ❌ | ❌ | ✅ | OFX only |
| C6 | ❌ | ❌ | ✅ | OFX only |

## Amostras mapeadas

- **inter** / csv: `extrato_conta_corrente`
- **inter** / ofx: `ofx_standard`
- **inter** / pdf: `unknown`
- **inventory.json** / csv: `unknown`
- **itau** / csv: `extrato_conta_corrente`
- **itau** / csv: `converted_pdf`
- **itau** / pdf: `unknown`