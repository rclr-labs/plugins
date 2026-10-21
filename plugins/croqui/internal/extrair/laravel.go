package extrair

import (
	"path/filepath"
	"regexp"
	"strings"

	"github.com/rclr-labs/croqui/internal/andar"
	"github.com/rclr-labs/croqui/internal/modelo"
)

// Todas as regras casam POSICAO DE DECLARACAO. Ver a invariante em
// extrair.go. RE2 nao tem lookbehind, entao onde o sensei usava
// (?<!...) aqui vira grupo de captura mais checagem.
var (
	// Route::get('/x', [Classe::class, 'metodo'])
	reRotaArray = regexp.MustCompile(
		`Route::(get|post|put|patch|delete|options|head)\s*\(\s*['"]([^'"]{0,120})['"]\s*,\s*\[\s*([A-Za-z_][A-Za-z0-9_]*)::class\s*,\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]`)
	// Route::get('/x', 'Classe@metodo')
	reRotaArroba = regexp.MustCompile(
		`Route::(get|post|put|patch|delete|options|head)\s*\(\s*['"]([^'"]{0,120})['"]\s*,\s*['"]([A-Za-z_][A-Za-z0-9_]*)@([A-Za-z_][A-Za-z0-9_]*)['"]`)
	// RE2 nao tem lookbehind, entao "class nao precedido de :, $, > ou
	// caractere de palavra" vira grupo de captura negado. Sem isso, `\bclass`
	// casaria PedidoController::class e $obj->class.
	// Grupo 1 e o caractere anterior (descartado); grupo 2 e o nome.
	reClasse   = regexp.MustCompile(`(^|[^:A-Za-z0-9_$>])(?:final\s+|abstract\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)`)
	reTabela   = regexp.MustCompile(`\$table\s*=\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]`)
	reFillable = regexp.MustCompile(`\$fillable\s*=\s*\[([^\]]{0,600})\]`)
	reCampo    = regexp.MustCompile(`['"]([A-Za-z_][A-Za-z0-9_]*)['"]`)
)

func laravel(raiz string, r *andar.Resultado, c *modelo.Croqui) {
	if v, err := modelo.NovaSeg("laravel"); err == nil {
		c.Stacks = append(c.Stacks, modelo.Stack{Nome: v})
	}
	for _, rel := range r.Arquivos {
		s := filepath.ToSlash(rel)
		switch {
		case strings.HasPrefix(s, "routes/") && strings.HasSuffix(s, ".php"):
			rotasLaravel(le(raiz, rel), c)
			if alvo, err := modelo.NovaSeg(filepath.Base(s)); err == nil {
				c.Entradas = append(c.Entradas, modelo.Entrada{
					Tipo: modelo.EntradaHTTP, Alvo: []modelo.Seg{"routes", alvo}})
			}
		case strings.HasPrefix(s, "app/Http/Controllers/") && strings.HasSuffix(s, ".php"):
			c.Controladores = append(c.Controladores, classesDe(le(raiz, rel))...)
		case strings.HasPrefix(s, "app/Models/") && strings.HasSuffix(s, ".php"):
			entidadeLaravel(le(raiz, rel), c)
		case strings.HasPrefix(s, "app/Jobs/"):
			c.Jobs = append(c.Jobs, classesDe(le(raiz, rel))...)
		case strings.HasPrefix(s, "app/Console/Commands/"):
			c.Comandos = append(c.Comandos, classesDe(le(raiz, rel))...)
		case strings.HasPrefix(s, "app/Events/"), strings.HasPrefix(s, "app/Listeners/"):
			c.Eventos = append(c.Eventos, classesDe(le(raiz, rel))...)
		case s == "artisan":
			c.Entradas = append(c.Entradas, modelo.Entrada{
				Tipo: modelo.EntradaCLI, Alvo: []modelo.Seg{"artisan"}})
		}
	}
}

func classesDe(corpo string) []modelo.Ident {
	var out []modelo.Ident
	for _, m := range reClasse.FindAllStringSubmatch(semComentarios(corpo), -1) {
		if id, err := modelo.NovoIdent(m[2]); err == nil {
			out = append(out, id)
		}
	}
	return out
}

func rotasLaravel(corpo string, c *modelo.Croqui) {
	limpo := semComentarios(corpo)
	add := func(verbo, caminho, ctrl, metodo string) {
		v, err1 := modelo.NovoVerbo(verbo)
		p, err2 := modelo.NovaRota(caminho)
		id, err3 := modelo.NovoIdent(ctrl)
		m, err4 := modelo.NovoIdent(metodo)
		if err1 != nil || err2 != nil || err3 != nil || err4 != nil {
			return // fora da forma: descarta em silencio, nao adivinha
		}
		c.Rotas = append(c.Rotas, modelo.RotaDecl{Verbo: v, Caminho: p, Controlador: id, Metodo: m})
		c.Arestas = append(c.Arestas, modelo.Aresta{De: id, Para: m, Tipo: modelo.ArestaRotaControlador})
	}
	for _, m := range reRotaArray.FindAllStringSubmatch(limpo, -1) {
		add(m[1], m[2], m[3], m[4])
	}
	for _, m := range reRotaArroba.FindAllStringSubmatch(limpo, -1) {
		add(m[1], m[2], m[3], m[4])
	}
}

func entidadeLaravel(corpo string, c *modelo.Croqui) {
	limpo := semComentarios(corpo)
	cls := reClasse.FindStringSubmatch(limpo)
	if cls == nil {
		return
	}
	id, err := modelo.NovoIdent(cls[2])
	if err != nil {
		return
	}
	e := modelo.Entidade{Classe: id}
	if m := reTabela.FindStringSubmatch(limpo); m != nil {
		if tb, err := modelo.NovaTabela(m[1]); err == nil {
			e.Tabela = tb
			c.Arestas = append(c.Arestas, modelo.Aresta{
				De: id, Para: modelo.Ident(tb), Tipo: modelo.ArestaEntidadeTabela})
		}
	}
	if m := reFillable.FindStringSubmatch(limpo); m != nil {
		for _, cm := range reCampo.FindAllStringSubmatch(m[1], -1) {
			if f, err := modelo.NovoIdent(cm[1]); err == nil {
				e.Campos = append(e.Campos, f)
			}
		}
	}
	c.Entidades = append(c.Entidades, e)
}
