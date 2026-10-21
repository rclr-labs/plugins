// Package anonimo pseudonimiza a IR. Estagio SOBRE a IR, nunca um sed na
// saida renderizada -- por isso ele cobre os tres formatos de graca.
//
// Cobre identificador, rota, tabela E SEGMENTO DE CAMINHO. Cobrir so
// identificador deixaria a arvore emitindo app/Services/<NomeDoCliente>,
// que e exatamente o que --anonimo existe para impedir.
//
// Mas pseudonimizar todo segmento destruiria o mapa, entao vale a mesma
// filosofia do resto do desenho: allowlist FECHADO de segmentos canonicos de
// framework passa verbatim; o que esta fora e pseudonimizado.
//
// LIMITE DECLARADO: isto protege o pacote em transito. O mapa reverso fica na
// maquina, e quem tem shell ali pode le-lo. Prometer mais seria mentir.
package anonimo

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"

	"github.com/rclr-labs/croqui/internal/modelo"
)

var canonicos = map[string]bool{
	"app": true, "src": true, "lib": true, "routes": true, "config": true,
	"tests": true, "test": true, "database": true, "migrations": true,
	"public": true, "resources": true, "Http": true, "Controllers": true,
	"Models": true, "Jobs": true, "Console": true, "Commands": true,
	"Events": true, "Listeners": true, "Middleware": true, "Providers": true,
	"pages": true, "api": true, "components": true, "prisma": true,
	"cmd": true, "internal": true, "pkg": true, ".": true,
}

func Canonico(seg string) bool { return canonicos[seg] }

type Mapa struct {
	idents map[modelo.Ident]modelo.Ident
	segs   map[modelo.Seg]modelo.Seg
	rotas  map[modelo.Rota]modelo.Rota
	tabs   map[modelo.Tabela]modelo.Tabela
}

func novoMapa() *Mapa {
	return &Mapa{
		idents: map[modelo.Ident]modelo.Ident{},
		segs:   map[modelo.Seg]modelo.Seg{},
		rotas:  map[modelo.Rota]modelo.Rota{},
		tabs:   map[modelo.Tabela]modelo.Tabela{},
	}
}

func (m *Mapa) ident(v modelo.Ident) modelo.Ident {
	if v == "" {
		return v
	}
	if p, ok := m.idents[v]; ok {
		return p
	}
	p := modelo.Ident(fmt.Sprintf("Classe_%02d", len(m.idents)+1))
	m.idents[v] = p
	return p
}

func (m *Mapa) seg(v modelo.Seg) modelo.Seg {
	if v == "" || Canonico(string(v)) {
		return v
	}
	if p, ok := m.segs[v]; ok {
		return p
	}
	p := modelo.Seg(fmt.Sprintf("Seg_%02d", len(m.segs)+1))
	m.segs[v] = p
	return p
}

func (m *Mapa) rota(v modelo.Rota) modelo.Rota {
	if v == "" {
		return v
	}
	if p, ok := m.rotas[v]; ok {
		return p
	}
	p := modelo.Rota(fmt.Sprintf("/rota_%02d", len(m.rotas)+1))
	m.rotas[v] = p
	return p
}

func (m *Mapa) tabela(v modelo.Tabela) modelo.Tabela {
	if v == "" {
		return v
	}
	if p, ok := m.tabs[v]; ok {
		return p
	}
	p := modelo.Tabela(fmt.Sprintf("tabela_%02d", len(m.tabs)+1))
	m.tabs[v] = p
	return p
}

// Aplicar devolve uma IR nova; o original nao e mutado.
func Aplicar(c *modelo.Croqui) (*modelo.Croqui, *Mapa) {
	m := novoMapa()
	out := &modelo.Croqui{
		Camadas: c.Camadas, Symlinks: c.Symlinks, Truncado: c.Truncado,
		Recusados: c.Recusados, Stacks: c.Stacks,
	}
	out.Nome = m.seg(c.Nome)

	for _, e := range c.Entradas {
		n := modelo.Entrada{Tipo: e.Tipo}
		for _, s := range e.Alvo {
			n.Alvo = append(n.Alvo, m.seg(s))
		}
		out.Entradas = append(out.Entradas, n)
	}
	for _, r := range c.Rotas {
		out.Rotas = append(out.Rotas, modelo.RotaDecl{
			Verbo: r.Verbo, Caminho: m.rota(r.Caminho),
			Controlador: m.ident(r.Controlador), Metodo: m.ident(r.Metodo)})
	}
	for _, id := range c.Controladores {
		out.Controladores = append(out.Controladores, m.ident(id))
	}
	for _, e := range c.Entidades {
		n := modelo.Entidade{Classe: m.ident(e.Classe), Tabela: m.tabela(e.Tabela)}
		for _, f := range e.Campos {
			n.Campos = append(n.Campos, m.ident(f))
		}
		out.Entidades = append(out.Entidades, n)
	}
	for _, j := range c.Jobs {
		out.Jobs = append(out.Jobs, m.ident(j))
	}
	for _, j := range c.Comandos {
		out.Comandos = append(out.Comandos, m.ident(j))
	}
	for _, j := range c.Eventos {
		out.Eventos = append(out.Eventos, m.ident(j))
	}
	for _, p := range c.Pastas {
		n := modelo.Pasta{Arquivos: p.Arquivos}
		if p.Exts != nil {
			n.Exts = map[modelo.Seg]int{}
			for k, v := range p.Exts {
				n.Exts[k] = v // extensao e tecnica, nao identidade de cliente
			}
		}
		for _, s := range p.Caminho {
			n.Caminho = append(n.Caminho, m.seg(s))
		}
		out.Pastas = append(out.Pastas, n)
	}
	for _, a := range c.Arestas {
		out.Arestas = append(out.Arestas, modelo.Aresta{
			De: m.ident(a.De), Para: m.ident(a.Para), Tipo: a.Tipo})
	}
	return out, m
}

// Salvar grava o mapa reverso FORA do repo, com 0600. O caminho nao vai para
// o pacote: so para a saida do terminal de quem rodou.
func (m *Mapa) Salvar(raizDoRepo string) (string, error) {
	base := os.Getenv("XDG_STATE_HOME")
	if base == "" {
		h, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		base = filepath.Join(h, ".local", "state")
	}
	dir := filepath.Join(base, "croqui")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", err
	}
	soma := sha256.Sum256([]byte(raizDoRepo))
	p := filepath.Join(dir, hex.EncodeToString(soma[:8])+".mapa")

	var b []byte
	b = append(b, "# mapa reverso do croqui. NAO compartilhe.\n"...)
	b = append(b, fmt.Sprintf("# repo: %s\n", raizDoRepo)...)
	for orig, pseudo := range m.idents {
		b = append(b, fmt.Sprintf("ident\t%s\t%s\n", pseudo, orig)...)
	}
	for orig, pseudo := range m.segs {
		b = append(b, fmt.Sprintf("seg\t%s\t%s\n", pseudo, orig)...)
	}
	for orig, pseudo := range m.rotas {
		b = append(b, fmt.Sprintf("rota\t%s\t%s\n", pseudo, orig)...)
	}
	for orig, pseudo := range m.tabs {
		b = append(b, fmt.Sprintf("tabela\t%s\t%s\n", pseudo, orig)...)
	}
	if err := os.WriteFile(p, b, 0o600); err != nil {
		return "", err
	}
	return p, nil
}
