---
description: Gera um mapa do repositorio para colar numa IA que nao tem acesso ao codigo.
argument-hint: "[--root caminho] [--nivel 1|2|3] [--budget 8000] [--anonimo]"
allowed-tools: Bash(croqui:*), Bash(go:*), Read
---

Rode o binário. Se `croqui` não estiver no PATH, use `${CLAUDE_PLUGIN_ROOT}/bin/croqui`; se nem isso existir, use `go run ${CLAUDE_PLUGIN_ROOT}/cmd/croqui`:

`croqui pacote $ARGUMENTS`

Depois:

1. Apresente o resultado em no máximo 12 linhas: nível, tokens, contagens, recusados na leitura, symlinks ignorados.
2. **Diga ao usuário para ler o arquivo antes de colar em qualquer lugar.** O pacote é seguro por construção, mas a revisão humana é parte do desenho — não a pule por causa dela.
3. Se o comando abortar com achado do guarda, **não** tente contornar nem editar a saída: reporte o nome da regra e diga que é bug de regra de extração.
4. Se nenhuma rota ou ponto de entrada foi detectado, diga qual camada ativou. Repositório que caiu só no `generico` tem mapa de estrutura, não de comportamento — e isso precisa ser dito, não maquiado.
