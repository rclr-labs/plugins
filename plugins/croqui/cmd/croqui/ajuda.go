package main

import (
	"fmt"
	"io"
)

// Help proprio, nao o default do flag. Principio 10 do AXI: conciso, por
// subcomando. O default do Go lista flag em ordem alfabetica, sem dizer o
// que a ferramenta faz nem que subcomandos existem -- e sai com 2, o codigo
// reservado para flag desconhecida. Pedir ajuda nao e erro.
const comumFlags = `  --root <caminho>    raiz do repositorio (padrao: diretorio atual)
  --anonimo           pseudonimiza classe, rota, tabela e segmento de caminho
  --saida <arquivo>   destino; precisa ficar dentro da raiz ou do cwd
  --forca             sobrescreve arquivo existente
`

func ajuda(sub string, out io.Writer) {
	switch sub {
	case "pacote":
		fmt.Fprint(out, `croqui pacote — gera o pacote de contexto para colar numa IA

  croqui pacote [--nivel 1|2|3] [--budget N] [--formato md|json] [--stdout]

  --nivel 1           identidade, stack, pontos de entrada, contagens
  --nivel 2           + rotas, controladores, entidades, tabelas, jobs (padrao)
  --nivel 3           + grafo
  --budget N          teto de tokens; desce o nivel para caber, com marcador
  --formato json      mesma estrutura em JSON, para pipeline
  --stdout            escreve em stdout em vez de arquivo
`+comumFlags+`
exemplo:
  croqui pacote --nivel 2 --budget 8000

Escreve o caminho, nao o pacote: leia o arquivo antes de colar em qualquer lugar.
`)

	case "visual":
		fmt.Fprint(out, `croqui visual — gera o mapa visual em HTML que abre offline

  croqui visual [--nivel 1|2|3]

  --nivel 3           inclui o grafo (SVG desenhado pela propria ferramenta)
`+comumFlags+`
exemplo:
  croqui visual --nivel 3

Sem script, sem fonte externa, sem requisicao: abre offline. O .html e olhado,
nao lido -- o .md de `+"`croqui pacote`"+` e a superficie de revisao.
`)

	case "grafo":
		fmt.Fprint(out, `croqui grafo — imprime so o fence mermaid, em stdout

  croqui grafo [--root <caminho>] [--anonimo]

exemplo:
  croqui grafo >> NOTAS.md

Derivado de convencao e de import, em nivel de modulo: nao e call graph.
`)

	default:
		fmt.Fprint(out, `croqui — mapa de aplicacao para alimentar uma IA sem dar acesso ao repo

Le a estrutura do repositorio e gera um pacote portatil. Deterministico,
sem IA e sem rede: nao abre .env nem credencial, e declara no proprio
pacote o que contem e o que nao contem.

  croqui                      inventario do repo (dado vivo, nao help)
  croqui pacote               gera croqui.md para colar numa IA
  croqui visual               gera croqui.html, que abre offline
  croqui grafo                so o fence mermaid, em stdout

  --nivel 1|2|3       1 identidade · 2 + inventario (padrao) · 3 + grafo
  --budget N          teto de tokens; desce o nivel para caber
  --anonimo           pseudonimiza classe, rota, tabela e caminho
  --root <caminho>    raiz do repositorio (padrao: diretorio atual)

exemplo:
  croqui                              ve o que tem neste repo
  croqui pacote --nivel 2             o caso comum
  croqui visual --nivel 3             para mostrar ao time

  croqui <subcomando> --help          detalhe de um subcomando

Nao e sandbox: nao reduz o acesso que a IA ja tem. Ele produz um artefato
que pode sair da maquina, com garantia do que tem dentro.
`)
	}
}
