package croqui

// O exemplo versionado em examples/caso-exemplo-001 nao e so ilustracao: ele
// e golden test contra regressao de FORMATO. Se o pacote mudar de forma sem
// ninguem perceber, o material de aula e o exemplo passam a mostrar uma coisa
// e a ferramenta a fazer outra -- que e exatamente o que a regra contra
// divergencia existe para evitar.
//
// Quando a mudanca for intencional: regenere os tres arquivos e commite
// junto com o codigo, no mesmo commit.

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/rclr-labs/croqui/internal/andar"
	"github.com/rclr-labs/croqui/internal/anonimo"
	"github.com/rclr-labs/croqui/internal/extrair"
	"github.com/rclr-labs/croqui/internal/render"
)

const caso = "examples/caso-exemplo-001"

func gera(t *testing.T, nivel int, anon bool) string {
	t.Helper()
	raiz, err := andar.Raiz(filepath.Join(caso, "acme-chamados"))
	if err != nil {
		t.Fatal(err)
	}
	r, err := andar.Caminhar(raiz, 20000)
	if err != nil {
		t.Fatal(err)
	}
	c, err := extrair.De(raiz, r)
	if err != nil {
		t.Fatal(err)
	}
	o := render.Opcoes{Nivel: nivel, Versao: Versao, Anonimo: anon}
	if anon {
		c, _ = anonimo.Aplicar(c)
	}
	s, err := render.MD(c, o)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

// A data muda todo dia; comparar byte a byte quebraria amanha. Compara a
// ESTRUTURA: as linhas que nao sao a linha de geracao.
func semLinhaDeData(s string) []string {
	var out []string
	for _, l := range strings.Split(s, "\n") {
		if strings.HasPrefix(l, "> Gerado por") {
			continue
		}
		out = append(out, l)
	}
	return out
}

func confere(t *testing.T, arquivo string, gerado string) {
	t.Helper()
	b, err := os.ReadFile(filepath.Join(caso, arquivo))
	if err != nil {
		t.Fatalf("exemplo ausente: %v", err)
	}
	querido, obtido := semLinhaDeData(string(b)), semLinhaDeData(gerado)
	if len(querido) != len(obtido) {
		t.Fatalf("%s: %d linhas no exemplo, %d geradas. Se a mudanca foi intencional, regenere o exemplo e commite junto.",
			arquivo, len(querido), len(obtido))
	}
	for i := range querido {
		if querido[i] != obtido[i] {
			t.Fatalf("%s divergiu na linha %d:\n  exemplo: %q\n  gerado:  %q\nSe a mudanca foi intencional, regenere o exemplo e commite junto.",
				arquivo, i+1, querido[i], obtido[i])
		}
	}
}

func TestExemploNivel3SegueBatendo(t *testing.T) {
	confere(t, "01_pacote.md", gera(t, 3, false))
}

func TestExemploAnonimoSegueBatendo(t *testing.T) {
	confere(t, "03_pacote_anonimo.md", gera(t, 2, true))
}

// O que o caso existe para demonstrar: valor sensivel em posicao
// nao-declarativa nao alcanca o pacote.
func TestExemploNaoCarregaOTokenDoFixture(t *testing.T) {
	for _, f := range []string{"01_pacote.md", "02_visual.html", "03_pacote_anonimo.md"} {
		b, err := os.ReadFile(filepath.Join(caso, f))
		if err != nil {
			t.Fatal(err)
		}
		if strings.Contains(string(b), "ACME_API_TOKEN") {
			t.Errorf("%s carrega o nome do token do fixture", f)
		}
	}
}

// E o .env.example tem que aparecer como recusado -- ele existe no fixture
// justamente para a linha de recusados nao ficar vazia.
func TestExemploReportaOEnvComoRecusado(t *testing.T) {
	b, err := os.ReadFile(filepath.Join(caso, "01_pacote.md"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(b), "`.env.example`") {
		t.Error("o exemplo deveria reportar .env.example como recusado na leitura")
	}
}
