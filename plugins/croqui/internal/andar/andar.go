// Package andar valida a raiz e caminha o repositorio.
//
// Duas travas do modelo de ameaca moram aqui:
//
// Escopo: a raiz e recusada se nao houver marcador de projeto. E allowlist,
// nao lista negra -- ~/.ssh nao e um repo, e e assim que ele e barrado.
//
// Symlink: nunca seguido, sempre contado. Silencio aqui esconderia
// justamente o que um atacante plantou.
package andar

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var (
	ErrSemMarcador  = errors.New("nao parece um repositorio: sem .git, composer.json, package.json, go.mod ou pyproject.toml")
	ErrRaizProibida = errors.New("raiz proibida: / e $HOME nunca sao raiz de projeto")
)

var marcadores = []string{".git", "composer.json", "package.json", "go.mod", "pyproject.toml"}

// negados nunca sao abertos. A existencia deles e reportada -- sinal util,
// risco zero. Esta lista e defesa em profundidade: por ser lista negra ela e
// burlavel por construcao, e quem garante que o conteudo nao sai e a camada
// de posicao em internal/extrair.
var negados = []*regexp.Regexp{
	regexp.MustCompile(`(^|/)\.env($|\.)`),
	regexp.MustCompile(`\.(pem|key|p12|pfx|keystore|jks)$`),
	regexp.MustCompile(`(^|/)id_(rsa|dsa|ecdsa|ed25519)`),
	// "secret"/"credential" so quando e o NOME do arquivo, nao quando e
	// prefixo de nome de ferramenta. O padrao antigo, [._-], recusava
	// secret-scan.sh -- um script de CI, nao um segredo. Em seguranca o custo
	// era zero (errar recusando e a direcao segura, e a garantia e a camada de
	// posicao), mas a linha "recusados na leitura" e sinal de CONFIANCA
	// mostrado ao usuario: chamar ferramenta de arquivo sensivel corroi
	// exatamente o que a ferramenta vende.
	regexp.MustCompile(`(^|/)\.?(credentials?|secrets?)(\.[^/]*)?$`),
	regexp.MustCompile(`(^|/)auth\.json$`), // o do Composer guarda token
	regexp.MustCompile(`(^|/)\.(npmrc|netrc|pgpass)$`),
}

var pular = map[string]bool{
	".git": true, "node_modules": true, "vendor": true, "dist": true,
	"build": true, "out": true, "target": true, ".venv": true, "venv": true,
	"__pycache__": true, ".next": true, "coverage": true, ".gradle": true,
	"bin": true, "obj": true, "storage": true,
}

type Resultado struct {
	Raiz      string
	Arquivos  []string
	Recusados []string
	Symlinks  int
	Truncado  bool
}

// Raiz resolve o caminho real e exige marcador de projeto.
func Raiz(caminho string) (string, error) {
	abs, err := filepath.Abs(caminho)
	if err != nil {
		return "", err
	}
	real, err := filepath.EvalSymlinks(abs)
	if err != nil {
		return "", err
	}
	if real == string(filepath.Separator) {
		return "", ErrRaizProibida
	}
	if h, err := os.UserHomeDir(); err == nil && h != "" {
		if hr, err := filepath.EvalSymlinks(h); err == nil && hr == real {
			return "", ErrRaizProibida
		}
	}
	for _, m := range marcadores {
		if _, err := os.Stat(filepath.Join(real, m)); err == nil {
			return real, nil
		}
	}
	return "", ErrSemMarcador
}

func negado(rel string) bool {
	s := filepath.ToSlash(rel)
	for _, re := range negados {
		if re.MatchString(s) {
			return true
		}
	}
	return false
}

// Caminhar lista os arquivos a ler. WalkDir usa Lstat, logo reporta symlink
// como entrada sem seguir -- a gente conta e descarta.
func Caminhar(raiz string, max int) (*Resultado, error) {
	r := &Resultado{Raiz: raiz}
	err := filepath.WalkDir(raiz, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil // arquivo ilegivel nao aborta a varredura
		}
		rel, rerr := filepath.Rel(raiz, p)
		if rerr != nil || rel == "." {
			return nil
		}
		if d.Type()&fs.ModeSymlink != 0 {
			r.Symlinks++
			return nil
		}
		if d.IsDir() {
			nome := d.Name()
			if pular[nome] || (strings.HasPrefix(nome, ".") && nome != ".github") {
				return fs.SkipDir
			}
			return nil
		}
		if negado(rel) {
			r.Recusados = append(r.Recusados, rel)
			return nil
		}
		if len(r.Arquivos) >= max {
			r.Truncado = true
			return nil
		}
		r.Arquivos = append(r.Arquivos, rel)
		return nil
	})
	return r, err
}
