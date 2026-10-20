---
description: Valida o plano MCP e emite os comandos gh issue create (não cria nada).
argument-hint: "[--plan plano-mcp.md] [--repo owner/name]"
allowed-tools: Bash(node:*), Read, Edit
---

Rode:
`node "${CLAUDE_PLUGIN_ROOT}/skills/plano-mcp/scripts/mcpx.mjs" issues --gh ${ARGUMENTS:---plan plano-mcp.md}`

Se a validação falhar, **corrija o plano** (formato em `references/templates-issues.md` da skill `plano-mcp`) e rode de novo. Não escreva as issues à mão para contornar o validador.

Quando passar, mostre a tabela de issues e os comandos emitidos. Deixe explícito que **nenhuma issue foi criada**: os comandos são para o usuário revisar e rodar. Não rode `gh issue create` por conta própria.
