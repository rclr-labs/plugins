// Package render transforma a IR em pacote. Os tres renderizadores saem da
// MESMA IR; o .md e o ARTEFATO DE REGISTRO -- a superficie que uma pessoa le
// antes de o pacote sair da maquina. Por isso o formato e escolhido por
// legibilidade humana, nao por facilidade de parse.
package render

import (
	"fmt"
	"strings"

	"github.com/rclr-labs/croqui/internal/modelo"
	"github.com/rclr-labs/croqui/internal/tokens"
)

type Opcoes struct {
	Nivel   int
	Budget  int
	Versao  string
	Data    string
	Anonimo bool
}

func (o Opcoes) nivel() int {
	if o.Nivel < 1 {
		return 1
	}
	if o.Nivel > 3 {
		return 3
	}
	return o.Nivel
}

func MD(c *modelo.Croqui, o Opcoes) (string, error) {
	n := o.nivel()
	corpo := secoes(c, n)
	cab := cabecalho(c, o, n, tokens.Estimar(corpo))
	saida := cab + corpo

	if o.Budget > 0 && tokens.Estimar(saida) > o.Budget {
		for nn := n - 1; nn >= 1; nn-- {
			corpo = secoes(c, nn)
			cab = cabecalho(c, o, nn, tokens.Estimar(corpo))
			tent := cab + corpo + marcadorTruncado(n, nn, o.Budget)
			if tokens.Estimar(tent) <= o.Budget || nn == 1 {
				return tent, nil
			}
		}
	}
	return saida, nil
}

func marcadorTruncado(pedido, entregue, budget int) string {
	return fmt.Sprintf(
		"\n---\n\n> **Pacote truncado.** Nível %d foi pedido; nível %d foi entregue para "+
			"caber no orçamento de %d tokens. O que ficou fora: %s.\n",
		pedido, entregue, budget, oQueFicouFora(entregue))
}

func oQueFicouFora(entregue int) string {
	switch entregue {
	case 1:
		return "inventário de rotas, entidades, jobs e comandos, e o grafo"
	case 2:
		return "o grafo"
	}
	return "nada"
}

func cabecalho(c *modelo.Croqui, o Opcoes, n, tks int) string {
	var b strings.Builder
	fmt.Fprintf(&b, "# Mapa da aplicação — %s\n\n", c.Nome)
	fmt.Fprintf(&b, "> Gerado por `croqui %s` em %s, **sem IA e sem rede**, a partir da estrutura do repositório. Nível %d de 3 · ~%s tokens.\n>\n",
		o.Versao, o.Data, n, humano(tks))
	b.WriteString("> **Contém:** nomes de classe, rota, tabela, job e comando deste repositório; contagens; e relações derivadas de convenção do framework.\n>\n")
	b.WriteString("> **Não contém:** valor de configuração, segredo, credencial, conteúdo de `.env`, literal de código, nem qualquer linha de código-fonte.\n>\n")
	if len(c.Recusados) > 0 {
		fmt.Fprintf(&b, "> **Recusados na leitura:** %s.\n>\n", listaBacktick(c.Recusados))
	} else {
		b.WriteString("> **Recusados na leitura:** nenhum arquivo sensível encontrado.\n>\n")
	}
	fmt.Fprintf(&b, "> **symlinks ignorados: %d** (nunca seguidos).\n>\n", c.Symlinks)
	b.WriteString("> O grafo é derivado de **convenção e de import, em nível de módulo**: **não é call graph** e não vem de execução.\n")
	if o.Anonimo {
		b.WriteString(">\n> **Pseudonimizado** (`--anonimo`): classe, rota, tabela e segmento de caminho foram substituídos. O mapa reverso ficou na máquina de quem gerou.\n")
	}
	b.WriteString("\n")
	return b.String()
}

func secoes(c *modelo.Croqui, n int) string {
	var b strings.Builder
	b.WriteString("## 1. O que é\n\n")
	fmt.Fprintf(&b, "- Camadas detectadas: %s\n", listaCamadas(c.Camadas))
	if len(c.Stacks) > 0 {
		fmt.Fprintf(&b, "- Stack: %s\n", listaStacks(c.Stacks))
	}
	fmt.Fprintf(&b, "- Rotas: %d · Controladores: %d · Entidades: %d · Jobs: %d · Comandos: %d · Eventos: %d\n",
		len(c.Rotas), len(c.Controladores), len(c.Entidades), len(c.Jobs), len(c.Comandos), len(c.Eventos))
	if c.Truncado {
		b.WriteString("- **Varredura truncada:** o repositório excedeu o teto de arquivos ou de pastas.\n")
	}
	b.WriteString("\n## 2. Pontos de entrada\n\n")
	if len(c.Entradas) == 0 {
		b.WriteString("Nenhum ponto de entrada detectado.\n")
	}
	for _, e := range c.Entradas {
		fmt.Fprintf(&b, "- `%s` → `%s`\n", e.Tipo, juntaSegs(e.Alvo))
	}

	if n >= 2 {
		b.WriteString("\n## 3. Rotas\n\n")
		if len(c.Rotas) == 0 {
			b.WriteString("Nenhuma rota declarada encontrada.\n")
		} else {
			b.WriteString("| Verbo | Caminho | Controlador | Método |\n|---|---|---|---|\n")
			// Rota identica repetida e ruido: tres entradas iguais dizem a
			// mesma coisa uma vez. Verbo+caminho diferentes seguem separados.
			vistas := map[modelo.RotaDecl]bool{}
			for _, r := range c.Rotas {
				if vistas[r] {
					continue
				}
				vistas[r] = true
				fmt.Fprintf(&b, "| %s | `%s` | `%s` | `%s` |\n", r.Verbo, r.Caminho, r.Controlador, r.Metodo)
			}
		}
		if len(c.Controladores) > 0 {
			fmt.Fprintf(&b, "\nControladores declarados: %s\n", listaIdents(c.Controladores))
		}
		b.WriteString("\n## 4. Entidades e tabelas\n\n")
		if len(c.Entidades) == 0 {
			b.WriteString("Nenhuma entidade encontrada.\n")
		} else {
			b.WriteString("| Classe | Tabela | Campos declarados |\n|---|---|---|\n")
			for _, e := range c.Entidades {
				fmt.Fprintf(&b, "| `%s` | `%s` | %d |\n", e.Classe, e.Tabela, len(e.Campos))
			}
		}
		b.WriteString("\n## 5. Jobs, comandos e eventos\n\n")
		fmt.Fprintf(&b, "- Jobs: %s\n- Comandos: %s\n- Eventos: %s\n",
			listaIdents(c.Jobs), listaIdents(c.Comandos), listaIdents(c.Eventos))
		if len(c.Pastas) > 0 {
			b.WriteString("\n## 6. Pastas (agregado)\n\n| Pasta | Arquivos |\n|---|---|\n")
			for i, p := range c.Pastas {
				if i >= 20 {
					fmt.Fprintf(&b, "| _+%d pastas não listadas_ | |\n", len(c.Pastas)-20)
					break
				}
				fmt.Fprintf(&b, "| `%s` | %d |\n", juntaSegs(p.Caminho), p.Arquivos)
			}
		}
	}

	if n >= 3 {
		b.WriteString("\n## 7. Grafo\n\n")
		b.WriteString("Derivado de convenção, em nível de módulo. Não é call graph.\n\n")
		b.WriteString(Mermaid(c))
	}
	return b.String()
}

// Mermaid renderiza o grafo em fence. Artifact e GitHub renderizam nativo,
// sem biblioteca -- e por isso o .md nao precisa de rede.
func Mermaid(c *modelo.Croqui) string {
	var b strings.Builder
	b.WriteString("```mermaid\ngraph LR\n")
	if len(c.Arestas) == 0 {
		b.WriteString("  vazio[\"nenhuma aresta derivada\"]\n")
	}
	for i, a := range c.Arestas {
		if i >= 60 {
			b.WriteString("  mais[\"+ arestas não desenhadas\"]\n")
			break
		}
		fmt.Fprintf(&b, "  n%d[\"%s\"] --> m%d[\"%s\"]\n", i, a.De, i, a.Para)
	}
	b.WriteString("```\n")
	return b.String()
}

func humano(n int) string {
	if n < 1000 {
		return fmt.Sprintf("%d", n)
	}
	return fmt.Sprintf("%.1fk", float64(n)/1000)
}

func listaBacktick(ss []modelo.Seg) string {
	out := make([]string, len(ss))
	for i, s := range ss {
		out[i] = "`" + string(s) + "`"
	}
	return strings.Join(out, ", ")
}

func listaIdents(ids []modelo.Ident) string {
	if len(ids) == 0 {
		return "_nenhum_"
	}
	out := make([]string, len(ids))
	for i, s := range ids {
		out[i] = "`" + string(s) + "`"
	}
	return strings.Join(out, ", ")
}

func listaCamadas(cs []modelo.Camada) string {
	out := make([]string, len(cs))
	for i, c := range cs {
		out[i] = string(c)
	}
	return strings.Join(out, ", ")
}

func listaStacks(ss []modelo.Stack) string {
	out := make([]string, len(ss))
	for i, s := range ss {
		out[i] = string(s.Nome)
	}
	return strings.Join(out, ", ")
}

func juntaSegs(ss []modelo.Seg) string {
	out := make([]string, len(ss))
	for i, s := range ss {
		out[i] = string(s)
	}
	return strings.Join(out, "/")
}
