package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/rclr-labs/croqui"
	"github.com/rclr-labs/croqui/internal/andar"
	"github.com/rclr-labs/croqui/internal/anonimo"
	"github.com/rclr-labs/croqui/internal/extrair"
	"github.com/rclr-labs/croqui/internal/guarda"
	"github.com/rclr-labs/croqui/internal/render"
)

const maxArquivos = 20000

func main() {
	os.Exit(rodar(os.Args[1:], os.Stdout, os.Stderr))
}

// rodar devolve o exit code em vez de chamar os.Exit, e escreve em io.Writer
// em vez de *os.File: assim o teste exercita a CLI inteira sem derrubar o
// processo E consegue afirmar sobre a saida.
// Exit 0 sucesso, 1 erro, 2 flag desconhecida (convencao AXI).
func rodar(args []string, out, errOut io.Writer) int {
	sub := ""
	if len(args) > 0 && len(args[0]) > 0 && args[0][0] != '-' {
		sub, args = args[0], args[1:]
	}

	// Subcomando desconhecido e erro de USO: exit 2, e antes de qualquer I/O.
	// Validar depois de resolver a raiz fazia `croqui inventar` sair com 1 em
	// diretorio sem marcador de projeto -- a resposta a um erro de uso nao
	// pode depender de onde a pessoa esta.
	if !subcomandos[sub] {
		fmt.Fprintf(errOut, "subcomando desconhecido: %q\n", sub)
		fmt.Fprintf(errOut, "use: croqui | croqui pacote | croqui visual | croqui grafo\n")
		return 2
	}

	fs := flag.NewFlagSet("croqui", flag.ContinueOnError)
	fs.SetOutput(errOut)
	raizFlag := fs.String("root", ".", "raiz do repositorio")
	nivel := fs.Int("nivel", 2, "1 identidade, 2 inventario, 3 com grafo")
	budget := fs.Int("budget", 0, "teto de tokens; corta o nivel para caber")
	anon := fs.Bool("anonimo", false, "pseudonimiza classe, rota, tabela e segmento de caminho")
	saidaFlag := fs.String("saida", "", "arquivo de saida; dentro da raiz ou do cwd")
	formato := fs.String("formato", "md", "md | json")
	paraStdout := fs.Bool("stdout", false, "escreve em stdout em vez de arquivo")
	forca := fs.Bool("forca", false, "sobrescreve arquivo existente")
	if err := fs.Parse(args); err != nil {
		return 2
	}

	raiz, err := andar.Raiz(*raizFlag)
	if err != nil {
		fmt.Fprintf(errOut, "erro: %v\n", err)
		fmt.Fprintf(errOut, "help[]: croqui --root <caminho de um repo com .git, composer.json, package.json ou go.mod>\n")
		return 1
	}
	r, err := andar.Caminhar(raiz, maxArquivos)
	if err != nil {
		fmt.Fprintf(errOut, "erro ao caminhar: %v\n", err)
		return 1
	}
	c, err := extrair.De(raiz, r)
	if err != nil {
		fmt.Fprintf(errOut, "erro ao extrair: %v\n", err)
		return 1
	}

	o := render.Opcoes{
		Nivel: *nivel, Budget: *budget, Versao: croqui.Versao,
		Data: time.Now().Format("02/01/2006"), Anonimo: *anon,
	}
	var caminhoDoMapa string
	if *anon {
		var m *anonimo.Mapa
		c, m = anonimo.Aplicar(c)
		if caminhoDoMapa, err = m.Salvar(raiz); err != nil {
			fmt.Fprintf(errOut, "erro ao salvar o mapa reverso: %v\n", err)
			return 1
		}
	}

	switch sub {
	case "":
		exe, _ := os.Executable()
		fmt.Fprint(out, inventario(c, raiz, exe, croqui.Versao, o.Data))
		return 0

	case "grafo":
		fmt.Fprint(out, render.Mermaid(c))
		return 0

	case "pacote", "visual":
		texto, ext := "", ".md"
		switch {
		case sub == "visual":
			texto, err = render.HTML(c, o)
			ext = ".html"
		case *formato == "json":
			texto, err = render.JSON(c, o)
			ext = ".json"
		default:
			texto, err = render.MD(c, o)
		}
		if err != nil {
			fmt.Fprintf(errOut, "erro ao renderizar: %v\n", err)
			return 1
		}

		// Gate final. Se o guarda acusa, NAO filtra: aborta, porque um achado
		// aqui significa regra de extracao com defeito, e filtrar esconderia
		// o defeito em vez de corrigi-lo.
		if achados := guarda.Conferir(texto); len(achados) > 0 {
			fmt.Fprintf(errOut, "erro: o guarda recusou a saida (%d achados). Nada foi escrito.\n", len(achados))
			for _, a := range achados {
				fmt.Fprintf(errOut, "  regra=%s offset=%d\n", a.Regra, a.Posicao)
			}
			fmt.Fprintf(errOut, "Isto e bug de regra de extracao, nao de filtro. Abra issue com o nome da regra.\n")
			return 1
		}

		if *paraStdout {
			fmt.Fprint(out, texto)
			return 0
		}
		alvo, err := destino(*saidaFlag, raiz, ext, *forca)
		if err != nil {
			fmt.Fprintf(errOut, "erro: %v\n", err)
			return 1
		}
		if err := os.WriteFile(alvo, []byte(texto), 0o644); err != nil {
			fmt.Fprintf(errOut, "erro ao escrever: %v\n", err)
			return 1
		}
		// Imprime o CAMINHO, nao o pacote: mantem a pessoa no circuito --
		// ela abre, le e decide se aquilo pode sair da maquina.
		fmt.Fprintf(out, "escrito: %s\n", alvo)
		fmt.Fprintf(out, "nivel %d · ~%s tokens · recusados na leitura: %d · symlinks ignorados: %d\n",
			o.Nivel, tamanhoDoNivel(c, o, o.Nivel), len(c.Recusados), c.Symlinks)
		if caminhoDoMapa != "" {
			fmt.Fprintf(out, "mapa reverso: %s (0600, fora do repo; NAO compartilhe)\n", caminhoDoMapa)
		}
		fmt.Fprintf(out, "\nhelp[]:\n  leia %s antes de colar numa IA\n", filepath.Base(alvo))
		return 0
	}

	// Inalcancavel: subcomandos ja foi validado no inicio.
	return 2
}

var subcomandos = map[string]bool{
	"":       true, // sem argumento: inventario, dado vivo
	"pacote": true,
	"visual": true,
	"grafo":  true,
}
