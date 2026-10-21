// Package modelo define as formas fechadas da representacao intermediaria.
//
// A regra que governa este pacote: NAO EXISTE NovoTextoLivre. Todo campo da
// IR cujo valor venha de entrada tem tipo com construtor que rejeita; todo
// campo de categoria usa constante deste pacote. Consequencia: um extrator
// nao consegue colocar uma linha de codigo, uma frase, um SQL ou um literal
// com aspas na IR -- nao ha campo de destino.
//
// LIMITE: a forma de identificador admite segredo que por acidente parece
// identificador (sk_live_..., AKIA..., hex de 32). Isso e conhecido e
// testado. Quem barra esses casos e a camada de POSICAO, em
// internal/extrair, e na retaguarda internal/guarda.
package modelo

import (
	"fmt"
	"regexp"
	"strings"
)

var (
	reIdent  = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)
	reSeg    = regexp.MustCompile(`^[A-Za-z0-9_.-]+$`)
	reRota   = regexp.MustCompile(`^/[A-Za-z0-9_\-/{}.:]*$`)
	reTabela = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)
)

const (
	tetoIdent  = 80
	tetoSeg    = 64
	tetoRota   = 120
	tetoTabela = 64
)

// Ident e nome de classe, metodo, job, comando ou evento.
type Ident string

// Seg e um segmento de caminho ou um nome de arquivo.
type Seg string

// Rota e um caminho HTTP declarado.
type Rota string

// Tabela e nome de tabela de banco.
type Tabela string

// Verbo e metodo HTTP, de conjunto fechado.
type Verbo string

// ErroForma nao guarda o valor na mensagem: erro costuma ir para log, e
// repetir o valor rejeitado transformaria o erro em canal de vazamento.
type ErroForma struct {
	Tipo  string
	Bytes int
}

func (e *ErroForma) Error() string {
	return fmt.Sprintf("fora da forma de %s: %d bytes rejeitados", e.Tipo, e.Bytes)
}

func novo(s, tipo string, teto int, re *regexp.Regexp) (string, error) {
	if len(s) == 0 || len(s) > teto || !re.MatchString(s) {
		return "", &ErroForma{Tipo: tipo, Bytes: len(s)}
	}
	return s, nil
}

func NovoIdent(s string) (Ident, error) {
	v, err := novo(s, "identificador", tetoIdent, reIdent)
	return Ident(v), err
}

func NovaSeg(s string) (Seg, error) {
	v, err := novo(s, "segmento de caminho", tetoSeg, reSeg)
	return Seg(v), err
}

func NovaRota(s string) (Rota, error) {
	v, err := novo(s, "rota", tetoRota, reRota)
	return Rota(v), err
}

func NovaTabela(s string) (Tabela, error) {
	v, err := novo(s, "tabela", tetoTabela, reTabela)
	return Tabela(v), err
}

var verbos = map[string]Verbo{
	"GET": "GET", "POST": "POST", "PUT": "PUT", "PATCH": "PATCH",
	"DELETE": "DELETE", "HEAD": "HEAD", "OPTIONS": "OPTIONS",
}

func NovoVerbo(s string) (Verbo, error) {
	if v, ok := verbos[strings.ToUpper(s)]; ok {
		return v, nil
	}
	return "", &ErroForma{Tipo: "verbo HTTP", Bytes: len(s)}
}
