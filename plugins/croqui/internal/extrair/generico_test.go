package extrair_test

import (
	"testing"

	"github.com/rclr-labs/croqui/internal/andar"
	"github.com/rclr-labs/croqui/internal/extrair"
	"github.com/rclr-labs/croqui/internal/modelo"
)

func repoGenerico(t *testing.T) *modelo.Croqui {
	t.Helper()
	d := t.TempDir()
	escreve(t, d, "go.mod", "module exemplo.com/acme\n\ngo 1.24\n")
	escreve(t, d, "Makefile", "test:\n\tgo test ./...\n")
	escreve(t, d, "cmd/servidor/main.go", "package main\n\nimport \"exemplo.com/acme/internal/loja\"\n")
	escreve(t, d, "internal/loja/loja.go", "package loja\n")
	escreve(t, d, "internal/loja/pedido.go", "package loja\n")
	raiz, err := andar.Raiz(d)
	if err != nil {
		t.Fatal(err)
	}
	r, err := andar.Caminhar(raiz, 10000)
	if err != nil {
		t.Fatal(err)
	}
	c, err := extrair.De(raiz, r)
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func TestGenericoAgregaPorPastaNaoEnumeraArquivo(t *testing.T) {
	c := repoGenerico(t)
	var loja *modelo.Pasta
	for i := range c.Pastas {
		if len(c.Pastas[i].Caminho) == 2 && c.Pastas[i].Caminho[1] == "loja" {
			loja = &c.Pastas[i]
		}
	}
	if loja == nil {
		t.Fatalf("pasta internal/loja nao agregada: %+v", c.Pastas)
	}
	if loja.Arquivos != 2 {
		t.Errorf("arquivos=%d, queria 2", loja.Arquivos)
	}
	if loja.Exts[".go"] != 2 {
		t.Errorf("exts=%v, queria .go=2", loja.Exts)
	}
}

func TestGenericoDetectaEntradaPorManifesto(t *testing.T) {
	c := repoGenerico(t)
	var viuCLI bool
	for _, e := range c.Entradas {
		if e.Tipo == modelo.EntradaCLI {
			viuCLI = true
		}
	}
	if !viuCLI {
		t.Errorf("go.mod + cmd/ deveria dar entrada CLI, entradas=%+v", c.Entradas)
	}
}

func TestGenericoSempreAtivaComoUltimaCamada(t *testing.T) {
	c := repoGenerico(t)
	if len(c.Camadas) == 0 || c.Camadas[len(c.Camadas)-1] != modelo.CamadaGenerico {
		t.Errorf("generico tem que ser a ultima camada, camadas=%v", c.Camadas)
	}
}
