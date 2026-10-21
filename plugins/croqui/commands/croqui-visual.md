---
description: Gera o mapa visual do repositorio em HTML que abre offline.
argument-hint: "[--root caminho] [--nivel 3] [--anonimo]"
allowed-tools: Bash(croqui:*), Bash(go:*), Read
---

Rode:

`croqui visual $ARGUMENTS`

Depois diga ao usuário o caminho do `.html` e que ele abre sem rede — nenhum script, nenhuma fonte externa, nenhuma requisição.

Lembre que o `.html` **não** é a superfície de revisão: ele é olhado, não lido. Quem for compartilhar o mapa deve ler o `.md` gerado por `/croqui` primeiro.
