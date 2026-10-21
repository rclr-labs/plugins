package main

import (
	"fmt"
	"strings"

	"github.com/rclr-labs/croqui/internal/modelo"
	"github.com/rclr-labs/croqui/internal/render"
	"github.com/rclr-labs/croqui/internal/tokens"
)

// inventario e a saida de `croqui` sem argumento: DADO VIVO, nao help
// (principio 8 do AXI). Formato compacto estilo TOON, agregados
// pre-computados, estado vazio explicito, e help[] como template de proximo
// passo.
//
// A linha "recusados na leitura" e a mais visivel de proposito: ela prova,
// na cara de quem rodou, que a deny-list funcionou.
func inventario(c *modelo.Croqui, raiz, exe, versao, data string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "croqui %s · %s\n", versao, exe)
	b.WriteString("mapeia a estrutura de um repo para um pacote colavel numa IA, sem ler segredo.\n\n")
	fmt.Fprintf(&b, "repo: %s · %s\n", raiz, listaCamadasTxt(c.Camadas))

	fmt.Fprintf(&b, "entradas[%d]{tipo,alvo}:\n", len(c.Entradas))
	if len(c.Entradas) == 0 {
		b.WriteString("  nenhum ponto de entrada detectado\n")
	}
	for i, e := range c.Entradas {
		if i >= 4 {
			fmt.Fprintf(&b, "  +%d nao listadas\n", len(c.Entradas)-4)
			break
		}
		fmt.Fprintf(&b, "  %s,%s\n", e.Tipo, juntaSegsTxt(e.Alvo))
	}

	// Uma linha em vez de seis: formato TOON cabe, e o teto de 24 linhas do
	// inventario e criterio de aceite, nao preferencia.
	fmt.Fprintf(&b, "superficie[6]{tipo,n}: rota,%d controlador,%d entidade,%d tabela,%d job,%d comando,%d\n",
		len(c.Rotas), len(c.Controladores), len(c.Entidades), contaTabelas(c), len(c.Jobs), len(c.Comandos))
	fmt.Fprintf(&b, "grafo: %d arestas (convencao, nivel de modulo)\n", len(c.Arestas))

	if len(c.Recusados) == 0 {
		b.WriteString("recusados na leitura[0]: nenhum arquivo sensivel encontrado\n")
	} else {
		fmt.Fprintf(&b, "recusados na leitura[%d]: %s\n", len(c.Recusados), juntaSegsVirgula(c.Recusados))
	}
	fmt.Fprintf(&b, "symlinks ignorados: %d\n", c.Symlinks)
	if c.Truncado {
		b.WriteString("varredura truncada: repo acima do teto de arquivos ou pastas\n")
	}

	o := render.Opcoes{Versao: versao, Data: data}
	fmt.Fprintf(&b, "pacote: nivel 1 ~%s · nivel 2 ~%s · nivel 3 ~%s tokens\n",
		tamanhoDoNivel(c, o, 1), tamanhoDoNivel(c, o, 2), tamanhoDoNivel(c, o, 3))

	b.WriteString("\nhelp[]:\n")
	b.WriteString("  croqui pacote --nivel 2          gera croqui.md para colar na IA\n")
	b.WriteString("  croqui pacote --anonimo          pseudonimiza classe, rota, tabela e caminho\n")
	b.WriteString("  croqui pacote --budget 8000      corta no orcamento de token\n")
	b.WriteString("  croqui visual                    gera croqui.html (abre offline)\n")
	return b.String()
}

func tamanhoDoNivel(c *modelo.Croqui, o render.Opcoes, n int) string {
	o.Nivel = n
	s, err := render.MD(c, o)
	if err != nil {
		return "?"
	}
	t := tokens.Estimar(s)
	if t < 1000 {
		return fmt.Sprintf("%d", t)
	}
	return fmt.Sprintf("%.1fk", float64(t)/1000)
}

func contaTabelas(c *modelo.Croqui) int {
	visto := map[modelo.Tabela]bool{}
	for _, e := range c.Entidades {
		if e.Tabela != "" {
			visto[e.Tabela] = true
		}
	}
	return len(visto)
}

func listaCamadasTxt(cs []modelo.Camada) string {
	out := make([]string, len(cs))
	for i, c := range cs {
		out[i] = string(c)
	}
	return strings.Join(out, "+")
}

func juntaSegsTxt(ss []modelo.Seg) string {
	out := make([]string, len(ss))
	for i, s := range ss {
		out[i] = string(s)
	}
	return strings.Join(out, "/")
}

func juntaSegsVirgula(ss []modelo.Seg) string {
	out := make([]string, len(ss))
	for i, s := range ss {
		out[i] = string(s)
	}
	return strings.Join(out, ", ")
}
