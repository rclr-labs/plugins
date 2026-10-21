// Package guarda e o gate final do pipeline, sobre o texto JA renderizado.
//
// PAPEL: defesa em profundidade contra bug meu -- nunca a garantia de
// primeira linha. A garantia e forma (internal/modelo) mais posicao
// (internal/extrair). O guarda existe porque regra de extracao defeituosa e
// possivel, e porque os casos com cara de identificador passam pela forma.
package guarda

import (
	"math"
	"regexp"
	"strings"
)

type Achado struct {
	Regra   string // id da regra, NUNCA o valor casado
	Posicao int    // offset em bytes, para quem investiga
}

// Padroes que casam segredo com forma de identificador -- justamente o que a
// forma do tipo aceita. Escritos como regex, nao como chave de verdade.
var regras = []struct {
	id string
	re *regexp.Regexp
}{
	{"stripe", regexp.MustCompile(`sk_(live|test)_[A-Za-z0-9]{16,}`)},
	{"aws-access-key", regexp.MustCompile(`AKIA[0-9A-Z]{16}`)},
	{"github-token", regexp.MustCompile(`gh[pousr]_[A-Za-z0-9]{32,}`)},
	{"slack-token", regexp.MustCompile(`xox[baprs]-[A-Za-z0-9-]{10,}`)},
	{"google-api-key", regexp.MustCompile(`AIza[0-9A-Za-z_\-]{30,}`)},
	{"private-key-pem", regexp.MustCompile(`-----BEGIN [A-Z ]*PRIVATE KEY-----`)},
	{"url-com-credencial", regexp.MustCompile(`[a-z][a-z0-9+.\-]{2,}://[^/\s:@]+:[^/\s@]+@`)},
	{"hex-longo", regexp.MustCompile(`\b[0-9a-f]{32,}\b`)},
}

// base64-longo tem regra propria porque a classe de caracteres do base64
// inclui "/", o que fazia TODO caminho de arquivo com 40+ caracteres casar.
// Isso abortou o croqui rodando contra o proprio repo de plugins, em
// "plugins/sensei/skills/sensei/scripts/lib" -- 40 caracteres exatos.
//
// Dois discriminadores independentes, ambos medidos e nao chutados:
//
//  1. entropia de Shannon: caminho chega a 3.91 bit/char; base64 real comeca
//     em 4.48. O limiar de 4.2 deixa ~0.28 de margem para cada lado.
//  2. contagem de barras: caminho aninhado tem 3 ou mais; base64 de 40
//     caracteres tem ~0.6 esperadas, entao 2 e um teto generoso.
//
// Dois candidatos, porque o PADDING e sinal proprio: caminho de arquivo e
// celula de tabela nunca terminam em "=". Com padding o limiar de
// comprimento cai; sem padding ele fica alto e a entropia decide.
//
// O limiar unico de 40 sem padding deixava passar base64 de 38 caracteres --
// e a regra original tinha esse buraco sem ninguem notar, porque nenhum
// fixture da suite era base64. Quem barrava era a camada de posicao.
var (
	reBase64ComPadding = regexp.MustCompile(`[A-Za-z0-9+/]{24,}={1,2}`)
	reBase64SemPadding = regexp.MustCompile(`[A-Za-z0-9+/]{40,}`)
)

const (
	entropiaMinBase64 = 4.2
	maxBarrasBase64   = 2
)

func base64Suspeito(texto string) []Achado {
	var out []Achado
	vistos := map[int]bool{}
	for _, re := range []*regexp.Regexp{reBase64ComPadding, reBase64SemPadding} {
		for _, loc := range re.FindAllStringIndex(texto, -1) {
			cand := texto[loc[0]:loc[1]]
			if strings.Count(cand, "/") > maxBarrasBase64 {
				continue // e caminho, nao blob
			}
			if entropia(cand) < entropiaMinBase64 {
				continue // diversidade baixa demais para ser byte aleatorio
			}
			if vistos[loc[0]] {
				continue // as duas regras casaram o mesmo trecho
			}
			vistos[loc[0]] = true
			out = append(out, Achado{Regra: "base64-longo", Posicao: loc[0]})
		}
	}
	return out
}

// entropia de Shannon em bits por caractere.
func entropia(s string) float64 {
	if s == "" {
		return 0
	}
	var freq [256]int
	for i := 0; i < len(s); i++ {
		freq[s[i]]++
	}
	n := float64(len(s))
	var h float64
	for _, f := range freq {
		if f == 0 {
			continue
		}
		p := float64(f) / n
		h -= p * math.Log2(p)
	}
	return h
}

// Conferir devolve os achados. Achado nunca carrega o valor casado: o
// relatorio do guarda nao pode virar o vazamento que ele impede.
func Conferir(texto string) []Achado {
	var out []Achado
	for _, r := range regras {
		for _, loc := range r.re.FindAllStringIndex(texto, -1) {
			out = append(out, Achado{Regra: r.id, Posicao: loc[0]})
		}
	}
	out = append(out, base64Suspeito(texto)...)
	return out
}
