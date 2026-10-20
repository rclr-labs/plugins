---
description: Só o veredito: o repositório está pronto para expor um servidor MCP de leitura?
argument-hint: "[caminho do repo]"
allowed-tools: Bash(node:*), Read, Grep
---

Rode:
`node "${CLAUDE_PLUGIN_ROOT}/skills/plano-mcp/scripts/mcpx.mjs" scan --root ${ARGUMENTS:-.}`

Depois carregue `references/rubrica-prontidao.md` da skill `plano-mcp` e pontue os **6 eixos** (`0`/`1`/`2`), cada um com evidência (`arquivo:linha`). Leia no máximo 3 arquivos do repo para confirmar sinais.

Responda em no máximo 12 linhas:
1. Veredito (`PRONTO` / `COM RESSALVAS` / `NÃO PRONTO`) e total `n/12`.
2. Tabela dos eixos com nota e evidência.
3. Bloqueios, 1 linha cada, com o que destrava.
4. As lacunas que exigem resposta humana, com dono sugerido.

Lembre: eixo 2 (identidade) em `0` é **NÃO PRONTO**, qualquer que seja o total. Não escreva plano nem issue neste comando.
