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

// manifestos mapeia arquivo de manifesto para a stack e o tipo de entrada.
var manifestos = []struct {
	arquivo string
	stack   string
	entrada modelo.TipoEntrada
}{
	{"composer.json", "php", modelo.EntradaHTTP},
	{"package.json", "node", modelo.EntradaHTTP},
	{"go.mod", "go", modelo.EntradaCLI},
	{"pyproject.toml", "python", modelo.EntradaCLI},
	{"Makefile", "make", modelo.EntradaCLI},
	{"Dockerfile", "docker", modelo.EntradaCLI},
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

	for _, m := range manifestos {
		for _, rel := range r.Arquivos {
			if filepath.ToSlash(rel) != m.arquivo {
				continue
			}
			if s, err := modelo.NovaSeg(m.stack); err == nil {
				c.Stacks = append(c.Stacks, modelo.Stack{Nome: s})
			}
			if a, err := modelo.NovaSeg(m.arquivo); err == nil {
				c.Entradas = append(c.Entradas, modelo.Entrada{Tipo: m.entrada, Alvo: []modelo.Seg{a}})
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
