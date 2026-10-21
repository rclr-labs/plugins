// Package guarda e o gate final do pipeline, sobre o texto JA renderizado.
//
// PAPEL: defesa em profundidade contra bug meu -- nunca a garantia de
// primeira linha. A garantia e forma (internal/modelo) mais posicao
// (internal/extrair). O guarda existe porque regra de extracao defeituosa e
// possivel, e porque os casos com cara de identificador passam pela forma.
package guarda

import "regexp"

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
	{"base64-longo", regexp.MustCompile(`\b[A-Za-z0-9+/]{40,}={0,2}\b`)},
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
	return out
}
