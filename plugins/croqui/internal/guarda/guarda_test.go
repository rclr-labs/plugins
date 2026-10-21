package guarda_test

import (
	"strings"
	"testing"

	"github.com/rclr-labs/croqui/internal/guarda"
)

// Montados em runtime: repo publico com push protection. NAO simplifique
// para literal unico.
func segredos() map[string]string {
	return map[string]string{
		"stripe-live": "sk" + "_live_" + "1234567890abcdefghijklmnop",
		"aws-key":     "AKIA" + "IOSFODNN7EXAMPLE",
		"github-pat":  "ghp_" + "0123456789abcdefghijklmnopqrstuvwxyz",
		"hex-longo":   "a3f1c9e74b2d8056a3f1c9e74b2d8056",
		"url-banco":   "postgres://" + "admin" + ":" + "senha123" + "@localhost/app",
	}
}

// O guarda e a retaguarda: ele pega exatamente os casos que a FORMA nao pega,
// porque tem cara de identificador.
func TestGuardaPegaSegredoComCaraDeIdentificador(t *testing.T) {
	for nome, s := range segredos() {
		achados := guarda.Conferir("texto antes " + s + " texto depois")
		if len(achados) == 0 {
			t.Errorf("guarda nao pegou %s", nome)
		}
	}
}

func TestGuardaNaoAcusaNomeDeCodigoLegitimo(t *testing.T) {
	limpo := "| `PedidoController` | `store` | `pedidos` |\n`NotificaPedido` `FechaMes` /api/pedidos/{id}"
	if a := guarda.Conferir(limpo); len(a) != 0 {
		t.Errorf("falso positivo em nome legitimo: %+v", a)
	}
}

// Achado nao pode repetir o valor: senao o relatorio do guarda vira o
// vazamento que ele existe para impedir.
func TestAchadoNaoRepeteOValor(t *testing.T) {
	s := segredos()["stripe-live"]
	for _, a := range guarda.Conferir(s) {
		if strings.Contains(a.Regra, s) {
			t.Error("o achado repetiu o segredo")
		}
	}
}

// Falso positivo achado rodando contra repo REAL, nao contra fixture: a
// classe de caracteres do base64 inclui "/", logo todo caminho de arquivo
// com 40+ caracteres parecia base64. O primeiro caso abaixo e literal: foi
// o que abortou o croqui no proprio repo de plugins.
func TestBase64NaoCasaCaminhoDeArquivo(t *testing.T) {
	caminhos := []string{
		"plugins/sensei/skills/sensei/scripts/lib",
		"app/Http/Controllers/Api/V2/PedidoController",
		"internal/render/templates/partials/cabecalho",
		"database/migrations/2026_01_01_000000_cria_pedidos",
		"resources/views/componentes/formulario/campos/selecao",
	}
	for _, p := range caminhos {
		for _, a := range guarda.Conferir("| `" + p + "` | 7 |") {
			if a.Regra == "base64-longo" {
				t.Errorf("caminho tratado como base64: %q", p)
			}
		}
	}
}

// E o outro lado: base64 de verdade tem que continuar sendo pego. Limiar
// escolhido medindo entropia de Shannon -- caminho chega a 3.91 bit/char,
// base64 real comeca em 4.48, entao 4.2 separa com margem para os dois lados.
func TestBase64DeVerdadeSeguePego(t *testing.T) {
	reais := []string{
		"aGVsbG8gbXVuZG8gc2VjcmV0byAxMjM0NTY3OA==",
		"dGhpcyBpcyBhIHZlcnkgc2VjcmV0IGtleSBmb3IgcHJvZHVjdGlvbg==",
		"7mJ2nQ8xKvL4pR9sT1wY3zB6cD0eF5gH8iJ2kL4mN6o=",
	}
	for _, s := range reais {
		var pego bool
		for _, a := range guarda.Conferir("chave: " + s) {
			if a.Regra == "base64-longo" {
				pego = true
			}
		}
		if !pego {
			t.Errorf("base64 real nao pego: %q", s)
		}
	}
}
