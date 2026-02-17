# Como exportar configurações do Cursor para outro PC

## Onde ficam as configurações (Windows)

- **Pasta principal:** `%APPDATA%\Cursor\User\`  
  Caminho completo: `C:\Users\<seu_usuario>\AppData\Roaming\Cursor\User\`

### Arquivos e pastas importantes

| Item | Descrição |
|------|-----------|
| `settings.json` | Configurações do editor (tema, fonte, formatação, etc.) |
| `keybindings.json` | Atalhos de teclado personalizados |
| `snippets/` | Snippets de código |
| `globalStorage/` | Dados de extensões (opcional; pode ser grande) |

**Não é necessário exportar:** `History/` (histórico local) e `workspaceStorage/` (dados por workspace).

---

## Opção 1: Script de exportação (recomendado)

No **PC de origem**, execute o script que foi criado:

```powershell
.\scripts\exportar-config-cursor.ps1
```

Isso gera uma pasta `Cursor-Config-Export` na sua Área de Trabalho com tudo que importa.

No **outro PC**:

1. Instale o Cursor e abra pelo menos uma vez (para criar a pasta `User`).
2. Copie o conteúdo de `Cursor-Config-Export` para:
   `C:\Users\<usuario>\AppData\Roaming\Cursor\User\`
3. Substitua os arquivos quando perguntado.
4. Reinicie o Cursor.

---

## Opção 2: Cópia manual

### No PC atual (exportar)

1. Abra o Explorador e na barra de endereço digite: `%APPDATA%\Cursor\User`
2. Copie para um pendrive ou nuvem:
   - `settings.json`
   - `keybindings.json`
   - A pasta `snippets` inteira

### No outro PC (importar)

1. Instale o Cursor e abra uma vez.
2. Abra no Explorador: `%APPDATA%\Cursor\User`
3. Cole os arquivos e a pasta `snippets` que você copiou, substituindo se existir.

---

## Opção 3: Sincronização pela conta Cursor

Se você usa a mesma conta Cursor nos dois PCs:

1. No Cursor: **File** (ou **Cursor**) → **Preferences** → **Settings Sync** (ou ícone de engrenagem na barra de atividades).
2. Ative a sincronização e escolha o que sincronizar (Settings, Keybindings, Extensions, Snippets, etc.).
3. No outro PC, faça login na mesma conta e ative o Settings Sync; as configurações serão aplicadas.

---

## Extensões

A lista de extensões não fica em arquivo texto simples. Para ter as mesmas extensões no outro PC:

- **Com Settings Sync:** ative a opção de sincronizar “Extensions”.
- **Sem sync:** anote as extensões que você usa e instale manualmente no outro PC, ou use o script que também pode gerar uma lista (quando disponível).

---

## Resumo rápido

| Método | Vantagem |
|--------|----------|
| **Script** | Um comando, exporta settings + keybindings + snippets |
| **Cópia manual** | Não depende de script; só 3 itens para copiar |
| **Settings Sync** | Sincronização contínua entre PCs com a mesma conta |

Para uma única vez “levar as config para outro PC”, o script ou a cópia manual são suficientes. Para manter os dois PCs sempre iguais, use Settings Sync.
