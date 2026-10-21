// Package extrair le arquivo e popula a IR.
//
// INVARIANTE DE POSICAO -- a camada que carrega a garantia:
//
// Toda regra de extracao casa POSICAO DE DECLARACAO, nunca literal de string
// arbitrario. O nome depois de `class`, o caminho dentro de Route::get(...),
// o valor de $table, o nome de arquivo de migration. Nenhuma regra aponta
// para "qualquer string entre aspas".
//
// Por que isso importa: a forma do tipo (internal/modelo) rejeita prosa, SQL
// e aspas, mas ACEITA segredo que por acidente parece identificador --
// sk_live_..., AKIA..., hex de 32 sao identificadores validos. Quem barra
// esses e esta invariante: um segredo em `$chave = "sk_live_..."` esta em
// posicao nao-declarativa e nenhuma regra o alcanca.
//
// Ao adicionar regra: se ela puder casar um literal que nao seja nome
// declarado, ela esta errada. posicao_test.go afirma o negativo.
package extrair

import (
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"

	"github.com/rclr-labs/croqui/internal/andar"
	"github.com/rclr-labs/croqui/internal/modelo"
)

const maxBytesPorArquivo = 1 << 20 // 1 MiB: arquivo maior que isso e gerado

func Camadas(r *andar.Resultado) []modelo.Camada {
	var out []modelo.Camada
	tem := func(nome string) bool { return slices.Contains(r.Arquivos, nome) }
	marcaLaravel := tem("artisan") || slices.ContainsFunc(r.Arquivos, func(a string) bool {
		return strings.HasPrefix(filepath.ToSlash(a), "app/Http/")
	})
	if tem("composer.json") && marcaLaravel {
		out = append(out, modelo.CamadaLaravel)
	}
	if tem("package.json") {
		out = append(out, modelo.CamadaNodeTS)
	}
	out = append(out, modelo.CamadaGenerico)
	return out
}

func De(raiz string, r *andar.Resultado) (*modelo.Croqui, error) {
	nome, _ := modelo.NovaSeg(filepath.Base(raiz))
	c := &modelo.Croqui{
		Nome:     nome,
		Camadas:  Camadas(r),
		Symlinks: r.Symlinks,
		Truncado: r.Truncado,
	}
	for _, rel := range r.Recusados {
		if s, err := modelo.NovaSeg(filepath.Base(rel)); err == nil {
			c.Recusados = append(c.Recusados, s)
		}
	}
	for _, cam := range c.Camadas {
		switch cam {
		case modelo.CamadaLaravel:
			laravel(raiz, r, c)
		case modelo.CamadaNodeTS:
			nodets(raiz, r, c)
		case modelo.CamadaGenerico:
			generico(raiz, r, c)
		}
	}
	return c, nil
}

// le devolve o conteudo ou string vazia. Ler nao e emitir: o conteudo so
// alcanca a IR pelas regras de posicao.
func le(raiz, rel string) string {
	b, err := os.ReadFile(filepath.Join(raiz, rel))
	if err != nil || len(b) > maxBytesPorArquivo {
		return ""
	}
	return string(b)
}

// semComentarios remove comentario de linha e de bloco antes de casar regra.
// Nao e seguranca (a posicao ja garante), e reducao de ruido: comentario com
// codigo comentado geraria rota e classe que nao existem mais.
var (
	reComLinha = regexp.MustCompile(`(?m)(//|#).*$`)
	reComBloco = regexp.MustCompile(`(?s)/\*.*?\*/`)
)

func semComentarios(s string) string {
	return reComLinha.ReplaceAllString(reComBloco.ReplaceAllString(s, " "), "")
}
