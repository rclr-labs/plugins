---
description: Avalia o repositório e produz o plano de issues para implementar um servidor MCP sobre ele.
argument-hint: "[caminho do repo] [--produto nome]"
allowed-tools: Bash(node:*), Read, Write, Glob, Grep
---

Siga a skill `plano-mcp` (carregue-a se ainda não estiver no contexto). Alvo: $ARGUMENTS

Regras:
1. Rode `scan` antes de ler qualquer arquivo; leia a saída uma vez.
2. Dê o **veredito de prontidão** (6 eixos, com evidência) **antes** de escrever qualquer issue.
3. Marque toda afirmação como `FATO (fonte: arquivo:linha)` · `INFERÊNCIA` · `LACUNA`. Não invente endpoint, campo, estado ou permissão.
4. Primeiro ciclo é **somente leitura**, identidade do token, escopo estreito.
5. Escreva o plano em `plano-mcp.md` e valide com `issues --plan` antes de responder.
6. Não implemente o servidor. Se pedirem código, entregue o plano primeiro.
