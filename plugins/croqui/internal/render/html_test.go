package render_test

import (
	"strings"
	"testing"

	"github.com/rclr-labs/croqui/internal/modelo"
	"github.com/rclr-labs/croqui/internal/render"
)

// A promessa "sem rede" tem que valer na hora de ABRIR, nao so de gerar.
// Mermaid exigiria biblioteca de CDN, por isso o SVG e desenhado aqui.
func TestHTMLNaoTemReferenciaDeRedeNemScript(t *testing.T) {
	s, err := render.HTML(croquiExemplo(), opcoes(3))
	if err != nil {
		t.Fatal(err)
	}
	for _, proibido := range []string{"http://", "https://", "<script", "fetch(", "@import", "XMLHttpRequest"} {
		if strings.Contains(s, proibido) {
			t.Errorf("o .html contem %q: a promessa de offline quebra ao abrir", proibido)
		}
	}
}

func TestHTMLTemSVGDesenhadoEmCasa(t *testing.T) {
	s, _ := render.HTML(croquiExemplo(), opcoes(3))
	if !strings.Contains(s, "<svg") {
		t.Error("faltou o SVG")
	}
	if !strings.Contains(s, "Pedido") {
		t.Error("o SVG nao desenhou os nos do grafo")
	}
}

func TestHTMLDeclaraOModeloDeAmeaca(t *testing.T) {
	s, _ := render.HTML(croquiExemplo(), opcoes(2))
	for _, exigido := range []string{"sem IA", "Não contém", "não é call graph", "Recusados"} {
		if !strings.Contains(s, exigido) {
			t.Errorf("o .html tem que declarar o mesmo que o .md; faltou %q", exigido)
		}
	}
}

// Abuso (d): o repo injeta pelo proprio nome. Sao DUAS propriedades
// distintas, e misturar as duas num teste so nao prova nenhuma.

// Propriedade 1 -- a forma impede que nome hostil exista. Nenhum extrator
// consegue produzir isto, porque o construtor rejeita.
func TestFormaImpedeQueNomeHostilSequerExista(t *testing.T) {
	for _, hostil := range []string{
		"<b>x</b>", "<script>", `" onload="x`, "javascript:void", "a<svg/onload=1",
	} {
		if _, err := modelo.NovaSeg(hostil); err == nil {
			t.Errorf("NovaSeg aceitou nome hostil %q", hostil)
		}
		if _, err := modelo.NovoIdent(hostil); err == nil {
			t.Errorf("NovoIdent aceitou nome hostil %q", hostil)
		}
	}
}

// Propriedade 2 -- o template escapa mesmo assim. Aqui o valor e forcado por
// CAST, de proposito: isto simula um campo futuro que burle a forma, ou um
// bug meu num construtor novo. E defesa em profundidade, nao a garantia.
func TestTemplateEscapaMesmoComValorForcadoPorCast(t *testing.T) {
	c := croquiExemplo()
	c.Nome = modelo.Seg(`<b>mau</b>" onload="x`)
	s, err := render.HTML(c, opcoes(1))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(s, "<b>mau</b>") {
		t.Error("o valor hostil saiu como marcacao viva")
	}
	if strings.Contains(s, `onload="x`) {
		t.Error("o valor hostil escapou para dentro de atributo")
	}
	if !strings.Contains(s, "&lt;b&gt;mau") {
		t.Error("o valor deveria aparecer escapado, nao desaparecer")
	}
}

// E o nome legitimo com ponto e hifen, que a forma permite, tem que
// atravessar intacto.
func TestNomeLegitimoComPontoEHifenAtravessa(t *testing.T) {
	c := croquiExemplo()
	nome, err := modelo.NovaSeg("acme.chamados-api")
	if err != nil {
		t.Fatal(err)
	}
	c.Nome = nome
	s, _ := render.HTML(c, opcoes(1))
	if !strings.Contains(s, "acme.chamados-api") {
		t.Error("nome legitimo nao apareceu")
	}
}

// O SVG entra no template via template.HTML, que e bypass explicito do
// escape. A justificativa era "os valores ja passaram pelas formas
// fechadas" -- verdadeira no caminho do extrator, e insuficiente como
// defesa em profundidade, que e o papel que este teste cobra.
func TestSVGEscapaRotuloForcadoPorCast(t *testing.T) {
	c := croquiExemplo()
	c.Entidades = []modelo.Entidade{{
		Classe: modelo.Ident(`</text><script>mau</script>`),
		Tabela: modelo.Tabela(`x"/><rect onload="mau`),
	}}
	s, err := render.HTML(c, opcoes(3)) // nivel 3 para o SVG existir
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(s, "<script>mau") {
		t.Error("rotulo hostil injetou script no SVG")
	}
	if strings.Contains(s, `onload="mau`) {
		t.Error("rotulo hostil injetou atributo no SVG")
	}
	// Assertiva negativa aponta para a CARGA hostil, nunca para fragmento
	// generico de marcacao: o proprio SVG gera </text><line e </text></svg>
	// legitimos, e afirmar sobre eles mede o template, nao o ataque.
	if strings.Contains(s, "</text><script") {
		t.Error("rotulo hostil fechou a tag text e saiu do contexto")
	}
	// E a prova de que o escape ocorreu, nao que o valor desapareceu.
	if !strings.Contains(s, "&lt;/text&gt;&lt;script&gt;mau") {
		t.Error("o rotulo deveria aparecer escapado dentro do SVG")
	}
}
