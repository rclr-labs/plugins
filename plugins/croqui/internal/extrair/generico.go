package extrair

import (
	"path/filepath"
	"sort"
	"strings"

	"github.com/rclr-labs/croqui/internal/andar"
	"github.com/rclr-labs/croqui/internal/modelo"
)

// maxPastas limita o que vai para a IR. Agregar em vez de enumerar nao e so
// economia de token: nome de arquivo tambem revela -- "dump-producao.sql",
// "clientes/acme/". Pasta e contagem, nao lista.
const maxPastas = 120

// manifestos marca a STACK. Manifesto NAO e ponto de entrada: composer.json
// aparecendo como entrada "http" era erro de categoria, visivel no pacote do
// skeleton do Laravel. Entrada vem de arquivo pelo qual a aplicacao e de
// fato invocada, listado em entradasReais.
var manifestos = map[string]string{
	"composer.json":  "php",
	"package.json":   "node",
	"go.mod":         "go",
	"pyproject.toml": "python",
	"Dockerfile":     "docker",
}

// entradasReais sao arquivos pelos quais a aplicacao e de fato invocada.
var entradasReais = []struct {
	sufixo string
	tipo   modelo.TipoEntrada
}{
	{"public/index.php", modelo.EntradaHTTP},
	{"manage.py", modelo.EntradaCLI},
	{"wsgi.py", modelo.EntradaHTTP},
	{"asgi.py", modelo.EntradaHTTP},
	{"main.go", modelo.EntradaCLI},
	{"server.js", modelo.EntradaHTTP},
	{"server.ts", modelo.EntradaHTTP},
}

func generico(raiz string, r *andar.Resultado, c *modelo.Croqui) {
	agrega := map[string]*modelo.Pasta{}
	for _, rel := range r.Arquivos {
		dir := filepath.ToSlash(filepath.Dir(rel))
		if dir == "." {
			dir = ""
		}
		p, ok := agrega[dir]
		if !ok {
			segs, err := segmentos(dir)
			if err != nil {
				continue // segmento fora da forma: a pasta nao entra
			}
			p = &modelo.Pasta{Caminho: segs, Exts: map[modelo.Seg]int{}}
			agrega[dir] = p
		}
		p.Arquivos++
		if ext, err := modelo.NovaSeg(strings.TrimPrefix(filepath.Ext(rel), ".")); err == nil && ext != "" {
			p.Exts["."+ext]++
		}
	}

	chaves := make([]string, 0, len(agrega))
	for k := range agrega {
		chaves = append(chaves, k)
	}
	sort.Slice(chaves, func(i, j int) bool {
		if agrega[chaves[i]].Arquivos != agrega[chaves[j]].Arquivos {
			return agrega[chaves[i]].Arquivos > agrega[chaves[j]].Arquivos
		}
		return chaves[i] < chaves[j]
	})
	for i, k := range chaves {
		if i >= maxPastas {
			c.Truncado = true
			break
		}
		c.Pastas = append(c.Pastas, *agrega[k])
	}

	for _, rel := range r.Arquivos {
		s := filepath.ToSlash(rel)
		if stack, ok := manifestos[s]; ok {
			if v, err := modelo.NovaSeg(stack); err == nil {
				c.Stacks = append(c.Stacks, modelo.Stack{Nome: v})
			}
		}
		for _, e := range entradasReais {
			if s != e.sufixo && !strings.HasSuffix(s, "/"+e.sufixo) {
				continue
			}
			if segs, err := segmentos(s); err == nil {
				c.Entradas = append(c.Entradas, modelo.Entrada{Tipo: e.tipo, Alvo: segs})
			}
		}
	}
}

// segmentos converte um caminho de pasta em segmentos validados. Caminho com
// segmento fora da forma nao entra -- nao se adivinha.
func segmentos(dir string) ([]modelo.Seg, error) {
	if dir == "" {
		return []modelo.Seg{"."}, nil
	}
	partes := strings.Split(dir, "/")
	out := make([]modelo.Seg, 0, len(partes))
	for _, p := range partes {
		s, err := modelo.NovaSeg(p)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, nil
}
