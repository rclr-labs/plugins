package anonimo_test

import (
	"encoding/json"
	"os"
	"strings"
	"testing"

	"github.com/rclr-labs/croqui/internal/anonimo"
	"github.com/rclr-labs/croqui/internal/modelo"
)

// Nomes de cliente ficticios: o repo e publico. "ACME" e o sistema ficticio
// da casa; nunca use nome de empresa real nem de sistema real aqui.
func croquiComNomesDeCliente() *modelo.Croqui {
	return &modelo.Croqui{
		Nome:    "acme-chamados",
		Camadas: []modelo.Camada{modelo.CamadaLaravel},
		Rotas: []modelo.RotaDecl{
			{Verbo: "GET", Caminho: "/acme/chamados", Controlador: "ChamadoAcmeController", Metodo: "index"},
		},
		Controladores: []modelo.Ident{"ChamadoAcmeController"},
		Entidades: []modelo.Entidade{
			{Classe: "ChamadoAcme", Tabela: "tb_chamados_acme", Campos: []modelo.Ident{"cliente_acme_id"}},
		},
		Jobs: []modelo.Ident{"NotificaAcme"},
		Pastas: []modelo.Pasta{
			{Caminho: []modelo.Seg{"app", "Services", "AcmeIntegracao"}, Arquivos: 4},
			{Caminho: []modelo.Seg{"app", "Http", "Controllers"}, Arquivos: 9},
		},
	}
}

// O buraco que isto fecha: pseudonimizar so identificador deixaria a arvore
// de pastas emitindo app/Services/AcmeIntegracao -- nome de sistema interno,
// que e exatamente o que --anonimo existe para impedir.
func TestNenhumNomeDeClienteSobrevive(t *testing.T) {
	c, _ := anonimo.Aplicar(croquiComNomesDeCliente())
	b, err := json.Marshal(c)
	if err != nil {
		t.Fatal(err)
	}
	s := strings.ToLower(string(b))
	for _, proibido := range []string{"acme", "chamado"} {
		if strings.Contains(s, proibido) {
			t.Errorf("%q sobreviveu a pseudonimizacao: %s", proibido, string(b))
		}
	}
}

// Pseudonimizar TUDO destruiria o mapa: Pasta_01/Pasta_02/Pasta_03 nao
// ensina nada. Allowlist fechado de segmentos canonicos passa verbatim.
func TestSegmentoCanonicoDeFrameworkPassaVerbatim(t *testing.T) {
	c, _ := anonimo.Aplicar(croquiComNomesDeCliente())
	var viuAppHttp bool
	for _, p := range c.Pastas {
		if len(p.Caminho) >= 2 && p.Caminho[0] == "app" && p.Caminho[1] == "Http" {
			viuAppHttp = true
		}
	}
	if !viuAppHttp {
		t.Errorf("app/Http deveria passar verbatim: %+v", c.Pastas)
	}
	if !anonimo.Canonico("Controllers") || !anonimo.Canonico("routes") {
		t.Error("Controllers e routes sao canonicos")
	}
	if anonimo.Canonico("AcmeIntegracao") {
		t.Error("nome de dominio nao e canonico e tem que ser pseudonimizado")
	}
}

func TestPseudonimoEEstavelDentroDaExecucao(t *testing.T) {
	c, _ := anonimo.Aplicar(croquiComNomesDeCliente())
	if len(c.Entidades) == 0 || len(c.Rotas) == 0 {
		t.Fatal("estrutura perdida")
	}
	// O mesmo nome original tem que virar o mesmo pseudonimo nos dois lugares:
	// senao as arestas deixam de casar e o grafo vira ruido.
	if c.Rotas[0].Controlador != c.Controladores[0] {
		t.Errorf("mesmo controlador virou pseudonimos diferentes: %q vs %q",
			c.Rotas[0].Controlador, c.Controladores[0])
	}
	if !strings.HasPrefix(string(c.Entidades[0].Classe), "Classe_") {
		t.Errorf("pseudonimo de classe fora do padrao: %q", c.Entidades[0].Classe)
	}
}

func TestEstruturaEPreservada(t *testing.T) {
	o := croquiComNomesDeCliente()
	c, _ := anonimo.Aplicar(o)
	if len(c.Rotas) != len(o.Rotas) || len(c.Entidades) != len(o.Entidades) ||
		len(c.Pastas) != len(o.Pastas) || len(c.Jobs) != len(o.Jobs) ||
		len(c.Controladores) != len(o.Controladores) {
		t.Error("pseudonimizacao nao pode perder item: ela troca nome, nao estrutura")
	}
	if c.Pastas[0].Arquivos != o.Pastas[0].Arquivos {
		t.Error("contagem tem que sobreviver")
	}
}

// O mapa reverso fica FORA do repo, com 0600. Protege o pacote em transito;
// nao protege de quem tem a maquina -- e isso esta declarado, nao prometido
// ao contrario.
func TestMapaReversoVaiParaForaDoRepoCom0600(t *testing.T) {
	estado := t.TempDir()
	t.Setenv("XDG_STATE_HOME", estado)
	repo := t.TempDir()

	_, m := anonimo.Aplicar(croquiComNomesDeCliente())
	caminho, err := m.Salvar(repo)
	if err != nil {
		t.Fatal(err)
	}
	if strings.HasPrefix(caminho, repo) {
		t.Errorf("o mapa reverso nao pode ficar dentro do repo: %s", caminho)
	}
	fi, err := os.Stat(caminho)
	if err != nil {
		t.Fatal(err)
	}
	if fi.Mode().Perm() != 0o600 {
		t.Errorf("modo=%v, queria 0600", fi.Mode().Perm())
	}
}
