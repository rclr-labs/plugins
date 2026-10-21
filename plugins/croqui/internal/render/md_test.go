package render_test

import (
	"strings"
	"testing"

	"github.com/rclr-labs/croqui/internal/modelo"
	"github.com/rclr-labs/croqui/internal/render"
)

func croquiExemplo() *modelo.Croqui {
	return &modelo.Croqui{
		Nome:    "acme-chamados",
		Camadas: []modelo.Camada{modelo.CamadaLaravel, modelo.CamadaGenerico},
		Stacks:  []modelo.Stack{{Nome: "laravel"}},
		Entradas: []modelo.Entrada{
			{Tipo: modelo.EntradaHTTP, Alvo: []modelo.Seg{"routes", "api.php"}},
		},
		Rotas: []modelo.RotaDecl{
			{Verbo: "POST", Caminho: "/pedidos", Controlador: "PedidoController", Metodo: "store"},
		},
		Controladores: []modelo.Ident{"PedidoController"},
		Entidades:     []modelo.Entidade{{Classe: "Pedido", Tabela: "pedidos"}},
		Jobs:          []modelo.Ident{"NotificaPedido"},
		Arestas: []modelo.Aresta{
			{De: "Pedido", Para: "pedidos", Tipo: modelo.ArestaEntidadeTabela},
		},
		Recusados: []modelo.Seg{".env", "auth.json"},
		Symlinks:  2,
	}
}

func opcoes(nivel int) render.Opcoes {
	return render.Opcoes{Nivel: nivel, Versao: "0.1.0", Data: "21/10/2026"}
}

// O cabecalho e metade do produto: sem ele alguem cola o arquivo achando que
// e a outra ferramenta.
func TestCabecalhoDeclaraOModeloDeAmeaca(t *testing.T) {
	s, err := render.MD(croquiExemplo(), opcoes(2))
	if err != nil {
		t.Fatal(err)
	}
	for _, exigido := range []string{
		"sem IA", "sem rede", "Contém:", "Não contém:", "valor de configuração",
		"Recusados na leitura:", ".env", "auth.json",
		"symlinks ignorados: 2", "não é call graph", "Nível 2 de 3", "tokens",
	} {
		if !strings.Contains(s, exigido) {
			t.Errorf("cabecalho sem %q", exigido)
		}
	}
}

func TestNiveisSaoCumulativos(t *testing.T) {
	n1, _ := render.MD(croquiExemplo(), opcoes(1))
	n2, _ := render.MD(croquiExemplo(), opcoes(2))
	n3, _ := render.MD(croquiExemplo(), opcoes(3))

	if strings.Contains(n1, "/pedidos") {
		t.Error("nivel 1 nao leva inventario de rota")
	}
	if !strings.Contains(n2, "/pedidos") {
		t.Error("nivel 2 tem que levar rota")
	}
	if strings.Contains(n2, "```mermaid") {
		t.Error("nivel 2 nao leva grafo")
	}
	if !strings.Contains(n3, "```mermaid") {
		t.Error("nivel 3 tem que levar o grafo")
	}
	if !(len(n1) < len(n2) && len(n2) < len(n3)) {
		t.Errorf("niveis tem que crescer: %d %d %d", len(n1), len(n2), len(n3))
	}
}

func TestBudgetCortaEMarcaOTruncamento(t *testing.T) {
	o := opcoes(3)
	o.Budget = 200
	s, err := render.MD(croquiExemplo(), o)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(s, "truncado") {
		t.Error("corte por budget tem que deixar marcador explicito")
	}
}

func TestNomeDeEntidadeSaiEntreBacktick(t *testing.T) {
	s, _ := render.MD(croquiExemplo(), opcoes(2))
	if !strings.Contains(s, "`Pedido`") {
		t.Error("identificador tem que sair entre backtick: delimita injecao no markdown")
	}
}
