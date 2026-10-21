package main

import (
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
)

var extensoesPermitidas = []string{".md", ".html", ".json"}

// destino confina a escrita. Sem isto, --saida seria primitiva de escrita
// arbitraria para quem invoca a ferramenta -- o abuso (c) do modelo de
// ameaca. Caminho tem que ficar dentro da raiz do repo ou do diretorio
// corrente, a extensao tem que estar na lista, e arquivo existente exige
// --forca.
func destino(pedido, raiz, extPadrao string, forca bool) (string, error) {
	if pedido == "" {
		return filepath.Join(raiz, "croqui"+extPadrao), nil
	}
	abs, err := filepath.Abs(pedido)
	if err != nil {
		return "", err
	}
	ext := strings.ToLower(filepath.Ext(abs))
	if !slices.Contains(extensoesPermitidas, ext) {
		return "", fmt.Errorf("extensao %q nao permitida; use %s", ext, strings.Join(extensoesPermitidas, ", "))
	}
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	raizAbs, _ := filepath.Abs(raiz)
	if !dentro(abs, raizAbs) && !dentro(abs, cwd) {
		return "", fmt.Errorf("--saida tem que ficar dentro da raiz do repo ou do diretorio corrente")
	}
	if _, err := os.Stat(abs); err == nil && !forca {
		return "", fmt.Errorf("%s ja existe; use --forca para sobrescrever", filepath.Base(abs))
	}
	return abs, nil
}

func dentro(caminho, base string) bool {
	rel, err := filepath.Rel(base, caminho)
	if err != nil {
		return false
	}
	return rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator))
}
