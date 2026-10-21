package croqui

import (
	"os/exec"
	"strings"
	"testing"
)

// Pacotes que dariam a esta ferramenta capacidade de rede ou de subprocesso.
// Caminho EXATO, nunca prefixo. net/url NAO esta aqui de proposito: ele nao
// tem capacidade de rede e e importado transitivamente por html/template, que
// e o que da escape de HTML correto no renderizador. Proibir o prefixo "net"
// quebraria o build e empurraria para escape caseiro -- troca ruim num
// renderizador sensivel a XSS.
var proibidos = map[string]bool{
	"net":      true,
	"net/http": true,
	"net/smtp": true,
	"os/exec":  true,
}

// os/exec aparece neste arquivo _test.go de proposito: arquivo de teste nao
// entra no fechamento do binario, e e assim que a gente consegue perguntar ao
// go pelo fechamento sem dar essa capacidade ao binario.
func TestFechamentoSemRedeNemSubprocesso(t *testing.T) {
	saida, err := exec.Command("go", "list", "-deps", "./cmd/croqui").Output()
	if err != nil {
		t.Fatalf("go list falhou: %v", err)
	}
	var achados []string
	for _, p := range strings.Split(strings.TrimSpace(string(saida)), "\n") {
		if proibidos[p] {
			achados = append(achados, p)
		}
	}
	if len(achados) > 0 {
		t.Errorf("pacote proibido no fechamento do binario: %v", achados)
	}
}

func TestNetUrlSegueLiberado(t *testing.T) {
	if proibidos["net/url"] {
		t.Error("net/url nao pode ser proibido: html/template depende dele")
	}
}
