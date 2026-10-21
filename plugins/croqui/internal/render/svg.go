package render

import (
	"fmt"
	"html"
	"strings"

	"github.com/rclr-labs/croqui/internal/modelo"
)

// Layout colunar por camada. A cadeia do Laravel ja e colunar por natureza
// (rota -> controlador -> entidade -> tabela), entao nao precisa algoritmo de
// grafo: coluna por tipo de no, linha por item. Grafo de import arbitrario
// precisaria de layout de verdade, e e o item marcado como cortavel na spec.
const (
	colLargura = 190
	colGap     = 90
	linAltura  = 34
	margem     = 20
	caixaH     = 24
	maxLinhas  = 14
)

// SVG devolve o elemento <svg>, que o html.go injeta via template.HTML --
// bypass explicito do escape. Logo o escape dos ROTULOS e feito aqui, e o
// bypass passa a cobrir somente a geometria que esta funcao gera.
//
// Por que nao confiar so nas formas fechadas: no caminho do extrator elas
// bastam, porque Ident e Seg nao admitem < nem ". Mas um campo novo, ou um
// construtor com bug, burlaria isso em silencio -- e aqui o resultado seria
// injecao de <script> dentro do SVG. Escapar e barato; descobrir depois nao.
func SVG(c *modelo.Croqui) string {
	cols := [][]string{
		rotulosRota(c),
		rotulosControlador(c),
		classesDeEntidade(c),
		tabelasDeEntidade(c),
	}

	maxLin := 0
	for _, cl := range cols {
		if len(cl) > maxLin {
			maxLin = len(cl)
		}
	}
	if maxLin == 0 {
		return `<svg role="img" aria-label="grafo vazio" width="320" height="60">` +
			`<text x="10" y="34" class="vazio">nenhuma aresta derivada</text></svg>`
	}

	w := margem*2 + len(cols)*colLargura + (len(cols)-1)*colGap
	h := margem*2 + maxLin*linAltura + 30

	var b strings.Builder
	fmt.Fprintf(&b, `<svg role="img" aria-label="grafo da aplicacao" width="%d" height="%d" viewBox="0 0 %d %d">`, w, h, w, h)

	titulos := []string{"rota", "controlador", "entidade", "tabela"}
	for ci, cl := range cols {
		x := margem + ci*(colLargura+colGap)
		fmt.Fprintf(&b, `<text x="%d" y="%d" class="col">%s</text>`, x, margem+12, html.EscapeString(titulos[ci]))
		for li, rot := range cl {
			y := margem + 30 + li*linAltura
			fmt.Fprintf(&b, `<rect x="%d" y="%d" width="%d" height="%d" rx="4" class="no"/>`,
				x, y, colLargura, caixaH)
			fmt.Fprintf(&b, `<text x="%d" y="%d" class="rot">%s</text>`, x+8, y+16, html.EscapeString(rot))
			if ci < len(cols)-1 && li < len(cols[ci+1]) {
				x2 := margem + (ci+1)*(colLargura+colGap)
				y2 := margem + 30 + li*linAltura + caixaH/2
				fmt.Fprintf(&b, `<line x1="%d" y1="%d" x2="%d" y2="%d" class="aresta"/>`,
					x+colLargura, y+caixaH/2, x2, y2)
			}
		}
	}
	b.WriteString(`</svg>`)
	return b.String()
}

func rotulosRota(c *modelo.Croqui) []string {
	var out []string
	for i, r := range c.Rotas {
		if i >= maxLinhas {
			break
		}
		out = append(out, fmt.Sprintf("%s %s", r.Verbo, r.Caminho))
	}
	return out
}

func rotulosControlador(c *modelo.Croqui) []string {
	visto := map[modelo.Ident]bool{}
	var out []string
	add := func(id modelo.Ident) {
		if id == "" || visto[id] || len(out) >= maxLinhas {
			return
		}
		visto[id] = true
		out = append(out, string(id))
	}
	for _, r := range c.Rotas {
		add(r.Controlador)
	}
	for _, id := range c.Controladores {
		add(id)
	}
	return out
}

func classesDeEntidade(c *modelo.Croqui) []string {
	var out []string
	for i, e := range c.Entidades {
		if i >= maxLinhas {
			break
		}
		out = append(out, string(e.Classe))
	}
	return out
}

func tabelasDeEntidade(c *modelo.Croqui) []string {
	var out []string
	for i, e := range c.Entidades {
		if i >= maxLinhas || e.Tabela == "" {
			continue
		}
		out = append(out, string(e.Tabela))
	}
	return out
}
