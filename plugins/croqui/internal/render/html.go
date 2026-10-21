package render

import (
	"html/template"
	"strings"

	"github.com/rclr-labs/croqui/internal/modelo"
)

// O .html NAO e superficie de revisao: ele e olhado, nao lido. O .md segue
// sendo o artefato de registro. Isto esta escrito aqui para o passo de
// revisao nao desaparecer quando o HTML virar a coisa que as pessoas
// compartilham.
//
// Duas restricoes vindas do modelo de ameaca:
//  1. zero rede ao ABRIR -- nenhum <script>, nenhum <link>, SVG proprio,
//     fontes do sistema, meta CSP por garantia.
//  2. todo nome escapado pelo html/template, inclusive em atributo e title.
var tmplHTML = template.Must(template.New("croqui").Parse(`<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<title>Mapa — {{.Nome}}</title>
<style>
:root{--tinta:#14181f;--papel:#fbfaf7;--fraco:#6b7280;--linha:#d9d6cf;--acento:#1f4e79;}
@media (prefers-color-scheme:dark){:root{--tinta:#e8e6e1;--papel:#14161a;--fraco:#9aa3af;--linha:#2b2f36;--acento:#7fb2e5;}}
*{box-sizing:border-box}
body{margin:0;background:var(--papel);color:var(--tinta);font:14px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:28px}
main{max-width:980px;margin:0 auto}
h1{font-size:25px;margin:0 0 4px;letter-spacing:-.01em}
.ameaca{border:1px solid var(--linha);border-left:3px solid var(--acento);padding:12px 14px;margin:18px 0;font-size:12.5px;color:var(--fraco);background:transparent}
.ameaca b{color:var(--tinta)}
h2{font-size:15px;margin:26px 0 8px;text-transform:uppercase;letter-spacing:.06em;color:var(--fraco)}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{text-align:left;padding:5px 9px;border-bottom:1px solid var(--linha)}
th{color:var(--fraco);font-weight:600;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em}
code,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px}
.rolagem{overflow-x:auto;border:1px solid var(--linha);padding:10px}
.no{fill:transparent;stroke:var(--linha)}
.rot{fill:var(--tinta);font-family:ui-monospace,Menlo,monospace;font-size:11.5px}
.col{fill:var(--fraco);font-size:10.5px;text-transform:uppercase;letter-spacing:.07em}
.aresta{stroke:var(--acento);stroke-width:1.2}
.vazio{fill:var(--fraco);font-size:12px}
footer{margin-top:30px;padding-top:12px;border-top:1px solid var(--linha);color:var(--fraco);font-size:11.5px}
</style></head><body><main>
<h1>Mapa da aplicação — {{.Nome}}</h1>
<p class="mono" style="color:var(--fraco)">croqui {{.Versao}} · {{.Data}} · nível {{.Nivel}} de 3{{if .Anonimo}} · pseudonimizado{{end}}</p>

<div class="ameaca">
<b>Gerado sem IA e sem rede</b>, a partir da estrutura do repositório.<br>
<b>Contém:</b> nomes de classe, rota, tabela, job e comando; contagens; relações derivadas de convenção.<br>
<b>Não contém:</b> valor de configuração, segredo, credencial, conteúdo de <code>.env</code>, literal de código, nem linha de código-fonte.<br>
<b>Recusados na leitura:</b> {{if .Recusados}}{{range $i,$r := .Recusados}}{{if $i}}, {{end}}<code>{{$r}}</code>{{end}}{{else}}nenhum arquivo sensível encontrado{{end}}.<br>
<b>symlinks ignorados:</b> {{.Symlinks}} (nunca seguidos).<br>
O grafo vem de convenção e de import, em nível de módulo: <b>não é call graph</b> e não vem de execução.
</div>

<h2>O que é</h2>
<table><tr><th>Camadas</th><td class="mono">{{.Camadas}}</td></tr>
<tr><th>Rotas</th><td>{{.NRotas}}</td></tr>
<tr><th>Controladores</th><td>{{.NControladores}}</td></tr>
<tr><th>Entidades</th><td>{{.NEntidades}}</td></tr>
<tr><th>Jobs</th><td>{{.NJobs}}</td></tr>
<tr><th>Comandos</th><td>{{.NComandos}}</td></tr></table>

{{if .TemRotas}}<h2>Rotas</h2>
<div class="rolagem"><table><tr><th>Verbo</th><th>Caminho</th><th>Controlador</th><th>Método</th></tr>
{{range .Rotas}}<tr><td>{{.Verbo}}</td><td class="mono">{{.Caminho}}</td><td class="mono">{{.Controlador}}</td><td class="mono">{{.Metodo}}</td></tr>{{end}}
</table></div>{{end}}

{{if .TemEntidades}}<h2>Entidades e tabelas</h2>
<div class="rolagem"><table><tr><th>Classe</th><th>Tabela</th><th>Campos</th></tr>
{{range .Entidades}}<tr><td class="mono">{{.Classe}}</td><td class="mono">{{.Tabela}}</td><td>{{len .Campos}}</td></tr>{{end}}
</table></div>{{end}}

{{if .TemGrafo}}<h2>Grafo</h2>
<div class="rolagem">{{.SVG}}</div>{{end}}

<footer>Este arquivo abre offline: nenhum script, nenhuma fonte ou folha de estilo externa, nenhuma requisição. O <code>.md</code> gerado pelo mesmo comando é a superfície de revisão — leia-o antes de compartilhar.</footer>
</main></body></html>
`))

type dadosHTML struct {
	Nome           modelo.Seg
	Versao, Data   string
	Nivel          int
	Anonimo        bool
	Camadas        string
	Recusados      []modelo.Seg
	Symlinks       int
	NRotas         int
	NControladores int
	NEntidades     int
	NJobs          int
	NComandos      int
	TemRotas       bool
	TemEntidades   bool
	TemGrafo       bool
	Rotas          []modelo.RotaDecl
	Entidades      []modelo.Entidade
	SVG            template.HTML
}

func HTML(c *modelo.Croqui, o Opcoes) (string, error) {
	n := o.nivel()
	d := dadosHTML{
		Nome: c.Nome, Versao: o.Versao, Data: o.Data, Nivel: n, Anonimo: o.Anonimo,
		Camadas: listaCamadas(c.Camadas), Recusados: c.Recusados, Symlinks: c.Symlinks,
		NRotas: len(c.Rotas), NControladores: len(c.Controladores),
		NEntidades: len(c.Entidades), NJobs: len(c.Jobs), NComandos: len(c.Comandos),
		TemRotas: n >= 2 && len(c.Rotas) > 0, TemEntidades: n >= 2 && len(c.Entidades) > 0,
		TemGrafo: n >= 3, Rotas: c.Rotas, Entidades: c.Entidades,
	}
	if d.TemGrafo {
		// SVG e montado por nos a partir de valores que JA passaram pelas
		// formas fechadas do modelo -- nenhum caractere de marcacao sobrevive
		// a Ident/Seg/Rota. Por isso template.HTML aqui e seguro, e o teste
		// TestHTMLEscapaNomeHostil guarda essa afirmacao.
		d.SVG = template.HTML(SVG(c))
	}
	var b strings.Builder
	if err := tmplHTML.Execute(&b, d); err != nil {
		return "", err
	}
	return b.String(), nil
}
