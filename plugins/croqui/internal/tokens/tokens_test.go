package tokens_test

import (
	"strings"
	"testing"

	"github.com/rclr-labs/croqui/internal/tokens"
)

func TestEstimarEMonotonicoENaoZeraTextoCurto(t *testing.T) {
	if tokens.Estimar("") != 0 {
		t.Error("vazio tem que ser 0")
	}
	if tokens.Estimar("ola") < 1 {
		t.Error("texto curto nao pode estimar 0")
	}
	curto := tokens.Estimar("ola mundo")
	longo := tokens.Estimar(strings.Repeat("ola mundo ", 100))
	if longo <= curto {
		t.Error("estimativa tem que crescer com o texto")
	}
}

func TestEstimarContaRuneNaoByte(t *testing.T) {
	// acento em UTF-8 ocupa 2 bytes; contar byte inflaria a estimativa de
	// prosa em portugues, que e a lingua do pacote.
	if tokens.Estimar("ação") > tokens.Estimar("acaoo") {
		t.Error("estimativa esta contando byte em vez de rune")
	}
}
