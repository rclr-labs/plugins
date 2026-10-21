---
description: Mostra quantos tokens o `sensei` economizou ao longo do tempo e por quê.
argument-hint: "[--days 30 | --last 5 | --repo nome | --json]"
allowed-tools: Bash(node:*)
---

Rode:
`node "${CLAUDE_PLUGIN_ROOT}/skills/sensei/scripts/sensei.mjs" stats $ARGUMENTS`

Apresente o resultado em no máximo 14 linhas. Depois explique em 2–3 frases os dois mecanismos que mais economizaram no período. Se o histórico estiver vazio, diga como gerar o primeiro registro (`/sensei review --staged`).
