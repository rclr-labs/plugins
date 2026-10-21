// Package tokens estima custo em tokens. E estimativa declarada, nao medida:
// o pacote diz o numero para o usuario decidir se cabe na colagem, e erra
// por cima de proposito.
package tokens

import "unicode/utf8"

// divisor vem do mesmo metodo do sensei (chars/ratio): ~3.6 caracteres por
// token em mistura de prosa pt-BR com identificador de codigo.
const divisor = 3.6

func Estimar(s string) int {
	if s == "" {
		return 0
	}
	n := utf8.RuneCountInString(s)
	t := int(float64(n)/divisor + 0.5)
	if t < 1 {
		return 1
	}
	return t
}
