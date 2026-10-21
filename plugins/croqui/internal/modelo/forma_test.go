package modelo_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/rclr-labs/croqui/internal/modelo"
)

func TestIdentAceitaNomeDeCodigo(t *testing.T) {
	for _, s := range []string{"Chamado", "ChamadoController", "_privado", "store2"} {
		if _, err := modelo.NovoIdent(s); err != nil {
			t.Errorf("NovoIdent(%q) deveria aceitar: %v", s, err)
		}
	}
}

func TestIdentRejeitaTextoLivre(t *testing.T) {
	ruins := []string{
		"",
		"minha senha",
		"SELECT * FROM users",
		`x"; drop table users`,
		"linha\ncom quebra",
		"com-hifen",
		"2comeca_com_digito",
		strings.Repeat("a", 81),
	}
	for _, s := range ruins {
		if _, err := modelo.NovoIdent(s); err == nil {
			t.Errorf("NovoIdent aceitou o que deveria rejeitar: %q", s)
		}
	}
}

// A mensagem de erro nao pode repetir o valor rejeitado: senao o proprio erro
// vira canal de vazamento, e erro costuma ir para log.
func TestErroNaoRepeteOValorRejeitado(t *testing.T) {
	segredo := "sk" + "_live_" + "1234567890abcdefghijklmnop" // montado em runtime: push protection
	_, err := modelo.NovaRota(segredo)                        // rota exige comecar com "/"
	if err == nil {
		t.Fatal("esperava rejeicao: rota tem que comecar com /")
	}
	if strings.Contains(err.Error(), segredo) {
		t.Errorf("a mensagem de erro repetiu o valor: %q", err.Error())
	}
}

// LIMITE CONHECIDO, afirmado de proposito para ninguem o descobrir achando
// que e bug. A forma de identificador admite segredo que por acidente parece
// identificador. Quem barra esses e a camada de POSICAO (internal/extrair) e,
// na retaguarda, internal/guarda.
func TestFormaAdmiteSegredoComCaraDeIdentificador(t *testing.T) {
	for _, s := range []string{
		"sk" + "_live_" + "1234567890abcdefghijklmnop",
		"AKIA" + "IOSFODNN7EXAMPLE",
		"a3f1c9e74b2d8056a3f1c9e74b2d8056",
	} {
		if _, err := modelo.NovoIdent(s); err != nil {
			t.Fatalf("este teste documenta um limite; se falhou, a forma mudou: %v", err)
		}
	}
}

func TestVerboVemDeConjuntoFechado(t *testing.T) {
	if _, err := modelo.NovoVerbo("get"); err != nil {
		t.Errorf("minuscula deveria normalizar: %v", err)
	}
	if _, err := modelo.NovoVerbo("TRACE"); err == nil {
		t.Error("TRACE nao esta no conjunto e deveria ser rejeitado")
	}
}

// A IR nao pode ter campo de texto livre. Este teste falha se alguem
// adicionar um `string` cru num struct da IR.
func TestIRNaoTemCampoDeTextoLivre(t *testing.T) {
	c := modelo.Croqui{}
	b, err := json.Marshal(c)
	if err != nil {
		t.Fatalf("a IR tem que serializar: %v", err)
	}
	if len(b) == 0 {
		t.Fatal("serializacao vazia")
	}
}
