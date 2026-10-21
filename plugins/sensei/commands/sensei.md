---
description: Revisão técnica roteada por modo — review, sec, sql ou docs.
argument-hint: "<review|sec|sql|docs> [arquivo] [--lang <linguagem>]"
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*)
---

Siga a skill `sensei` (carregue-a se ainda não estiver no contexto). Argumentos: $ARGUMENTS

Regras:
1. Identifique o modo pelo argumento. Sem argumento e sem contexto claro, **liste os modos e pergunte** — não escolha sozinho.
2. Carregue **apenas** o arquivo do modo. Em `review`, carregue também `review/<linguagem>.md` quando existir; a regra da linguagem vence a geral em conflito.
3. Abra a resposta com o modo e as camadas aplicadas. Se não havia arquivo da linguagem detectada, diga em uma linha.
4. Todo achado com gatilho + impacto + correção, severidade S0/S1/S2. Refute antes de reportar.
5. Não edite código nesta revisão.
