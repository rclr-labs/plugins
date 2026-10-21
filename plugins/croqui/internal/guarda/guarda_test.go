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
