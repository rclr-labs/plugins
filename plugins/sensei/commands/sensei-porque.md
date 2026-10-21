---
description: Explica como o `sensei` mede a economia de tokens e por que ela é conservadora.
allowed-tools: Bash(node:*), Read
---

Rode:
`node "${CLAUDE_PLUGIN_ROOT}/skills/sensei/scripts/sensei.mjs" why`

Se o usuário quiser auditar, leia também `skills/sensei/references/contabilidade.md`. Responda em no máximo 20 linhas: o que entra na conta, o que fica de fora (raciocínio, tempo, cache) e por que o baseline é conservador. Não use números de exemplo como se fossem medições reais.
