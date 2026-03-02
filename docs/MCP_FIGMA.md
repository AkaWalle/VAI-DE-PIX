# MCP Figma — Configuração e limitações

## 1. Onde o MCP está configurado

- **Global (Cursor):** `%USERPROFILE%\.cursor\mcp.json`  
  - Contém o servidor **Figma** (`https://mcp.figma.com/mcp`) e Postman.  
  - O Figma MCP usado pelo Cursor é esse (leitura + FigJam).

- **Projeto:** `Vai de pix\.cursor\mcp.json`  
  - Atualmente: `"mcpServers": {}` (vazio).  
  - Não sobrescreve o Figma; o Cursor usa o MCP global.

Para ver/editar o config global:

```
C:\Users\<seu_usuario>\.cursor\mcp.json
```

## 2. API REST do Figma — só leitura

A **API REST oficial** do Figma (`api.figma.com`) **não permite criar ou editar nós** no arquivo.

- **Existe:** `GET /v1/files/:key` e `GET /v1/files/:key/nodes` (ler arquivo e nós).  
- **Não existe:** `POST /v1/files/{file_key}/nodes` ou qualquer endpoint de escrita para criar frames/retângulos/texto.

Referência: [Figma REST API – File endpoints](https://developers.figma.com/docs/rest-api/file-endpoints/) (apenas GET file, GET file nodes, GET image, etc.).

Por isso **não dá para “trocar o MCP por um que use a API REST para criar elementos”**: esse tipo de endpoint não existe.

## 3. Onde a criação é possível: Plugin API

Criar frames, retângulos, texto etc. no Figma só é possível hoje pela **Plugin API**, que roda **dentro do app Figma** (plugin que o usuário executa no arquivo).

- Ex.: `figma.createFrame()`, `figma.createRectangle()`, `figma.createText()`.  
- Documentação: [Figma Plugin API – Node types](https://www.figma.com/plugin-docs/api/nodes/), [createFrame](https://www.figma.com/plugin-docs/api/properties/figma-createframe/).

Nenhum MCP “oficial” conhecido usa essa API para criar telas a partir do Cursor; o MCP em `mcp.figma.com` foca em leitura e FigJam.

## 4. Token (FIGMA_ACCESS_TOKEN) — quando usar

- A API REST (leitura) usa **Personal Access Token** ou OAuth.  
- O MCP em `https://mcp.figma.com/mcp` normalmente usa o fluxo de login do Figma (não obrigatoriamente um `.env` no projeto).  
- Se você for usar a **REST API diretamente** (scripts, outro cliente) para **ler** arquivos/nós:

  - Crie um token em: Figma → Settings → Account → Personal access tokens.  
  - Escopo útil para leitura: `file_content:read`.  
  - Coloque no projeto em `.env` (e não commite o `.env`):

    ```env
    FIGMA_ACCESS_TOKEN=seu_token_aqui
    ```

Isso não altera a conclusão: a API continua só de leitura; o token não habilita criação de nós.

## 5. Opções práticas para “telas no Figma”

1. **Montar no Figma usando a spec**  
   Usar o documento `docs/FIGMA_SPEC.md` e montar as telas manualmente (ou com um designer), seguindo identidade, layout e componentes descritos.

2. **Plugin customizado no Figma**  
   Desenvolver um **plugin** (Plugin API) que:
   - Receba um JSON (exportado a partir de `FIGMA_SPEC.md` ou gerado por script), e  
   - Crie frames, retângulos, texto e estrutura no arquivo aberto.  
   O Cursor não “conversa” com o plugin diretamente; o fluxo seria: Cursor/script gera JSON → usuário abre o plugin no Figma e carrega o JSON.

3. **Manter o MCP Figma atual**  
   Continuar usando o MCP para **ler** arquivos (get_metadata, get_design_context, etc.) e, se quiser, gerar diagramas no **FigJam** com a ferramenta `generate_diagram`. A criação de telas de produto continua manual ou via plugin.

## 6. Resumo

- **Config:** Figma MCP está em `.cursor\mcp.json` (global); o do projeto está vazio.  
- **REST API:** Apenas leitura; não existe endpoint para criar nós.  
- **Criação:** Apenas via Plugin API (plugin rodando dentro do Figma).  
- **Recomendação:** Usar `docs/FIGMA_SPEC.md` para desenhar as telas no Figma; se quiser automação, implementar um plugin que leia um JSON e crie os frames/elementos.

Não é possível “configurar um MCP Figma com criação” apenas trocando para um MCP que use a API REST, porque a própria API não oferece criação de elementos.
