package extrair

import (
	"path/filepath"
	"regexp"
	"strings"

	"github.com/rclr-labs/croqui/internal/andar"
	"github.com/rclr-labs/croqui/internal/modelo"
)

// Mesma invariante de posicao do laravel.go: toda regra casa DECLARACAO.
// Decorator, chamada de registro de rota e bloco `model` do Prisma sao
// posicoes declarativas; `const x = "..."` nao e, e nenhuma regra aponta
// para ela. nodets_test.go afirma o negativo.
var (
	reNestController = regexp.MustCompile(`@Controller\s*\(\s*(?:['"]([^'"]{0,120})['"])?\s*\)[\s\S]{0,200}?class\s+([A-Za-z_][A-Za-z0-9_]*)`)
	reNestMetodo     = regexp.MustCompile(`@(Get|Post|Put|Patch|Delete|Options|Head)\s*\(\s*(?:['"]([^'"]{0,120})['"])?\s*\)\s*(?:async\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(`)
	reExpress        = regexp.MustCompile(`(?:app|router)\.(get|post|put|patch|delete|options|head)\s*\(\s*['"]([^'"]{0,120})['"]`)
	rePrismaModel    = regexp.MustCompile(`(?m)^\s*model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{`)
	reTypeORMEntity  = regexp.MustCompile(`@Entity\s*\([^)]{0,120}\)[\s\S]{0,120}?class\s+([A-Za-z_][A-Za-z0-9_]*)`)
)

func nodets(raiz string, r *andar.Resultado, c *modelo.Croqui) {
	if s, err := modelo.NovaSeg("node"); err == nil {
		c.Stacks = append(c.Stacks, modelo.Stack{Nome: s})
	}
	for _, rel := range r.Arquivos {
		s := filepath.ToSlash(rel)
		ext := filepath.Ext(s)
		switch {
		case strings.HasSuffix(s, ".prisma"):
			for _, m := range rePrismaModel.FindAllStringSubmatch(le(raiz, rel), -1) {
				if id, err := modelo.NovoIdent(m[1]); err == nil {
					c.Entidades = append(c.Entidades, modelo.Entidade{Classe: id})
				}
			}
		case ext == ".ts" || ext == ".tsx" || ext == ".js" || ext == ".mjs":
			corpo := semComentarios(le(raiz, rel))
			nestRotas(corpo, c)
			expressRotas(corpo, c)
			for _, m := range reTypeORMEntity.FindAllStringSubmatch(corpo, -1) {
				if id, err := modelo.NovoIdent(m[1]); err == nil {
					c.Entidades = append(c.Entidades, modelo.Entidade{Classe: id})
				}
			}
		}
		if strings.HasPrefix(s, "pages/api/") || strings.HasPrefix(s, "app/api/") {
			if segs, err := segmentos(s); err == nil {
				c.Entradas = append(c.Entradas, modelo.Entrada{Tipo: modelo.EntradaHTTP, Alvo: segs})
			}
		}
	}
}

func nestRotas(corpo string, c *modelo.Croqui) {
	ctrl := reNestController.FindStringSubmatch(corpo)
	if ctrl == nil {
		return
	}
	id, err := modelo.NovoIdent(ctrl[2])
	if err != nil {
		return
	}
	c.Controladores = append(c.Controladores, id)
	base := "/" + strings.TrimPrefix(ctrl[1], "/")
	for _, m := range reNestMetodo.FindAllStringSubmatch(corpo, -1) {
		caminho := base
		if m[2] != "" {
			caminho = strings.TrimSuffix(base, "/") + "/" + strings.TrimPrefix(m[2], "/")
		}
		v, e1 := modelo.NovoVerbo(m[1])
		p, e2 := modelo.NovaRota(caminho)
		met, e3 := modelo.NovoIdent(m[3])
		if e1 != nil || e2 != nil || e3 != nil {
			continue
		}
		c.Rotas = append(c.Rotas, modelo.RotaDecl{Verbo: v, Caminho: p, Controlador: id, Metodo: met})
		c.Arestas = append(c.Arestas, modelo.Aresta{De: id, Para: met, Tipo: modelo.ArestaRotaControlador})
	}
}

func expressRotas(corpo string, c *modelo.Croqui) {
	for _, m := range reExpress.FindAllStringSubmatch(corpo, -1) {
		v, e1 := modelo.NovoVerbo(m[1])
		p, e2 := modelo.NovaRota(m[2])
		if e1 != nil || e2 != nil {
			continue
		}
		c.Rotas = append(c.Rotas, modelo.RotaDecl{Verbo: v, Caminho: p})
	}
}
