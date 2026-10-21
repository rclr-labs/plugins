package main

import (
	"os"
	"path/filepath"
	"testing"
)

// Abuso (c): --saida ~/.zshrc como primitiva de escrita arbitraria.
func TestDestinoRecusaCaminhoForaDaRaizEDoCwd(t *testing.T) {
	raiz := t.TempDir()
	fora := filepath.Join(t.TempDir(), "alvo.md")
	if _, err := destino(fora, raiz, ".md", false); err == nil {
		t.Error("aceitou caminho fora da raiz e do diretorio corrente")
	}
}

func TestDestinoRecusaExtensaoForaDaLista(t *testing.T) {
	raiz := t.TempDir()
	if _, err := destino(filepath.Join(raiz, "x.sh"), raiz, ".md", false); err == nil {
		t.Error("aceitou extensao .sh")
	}
	if _, err := destino(filepath.Join(raiz, "x.zshrc"), raiz, ".md", false); err == nil {
		t.Error("aceitou .zshrc")
	}
}

func TestDestinoAceitaDentroDaRaizComExtensaoCerta(t *testing.T) {
	raiz := t.TempDir()
	p, err := destino(filepath.Join(raiz, "croqui.md"), raiz, ".md", false)
	if err != nil {
		t.Fatalf("recusou caminho legitimo: %v", err)
	}
	if filepath.Base(p) != "croqui.md" {
		t.Errorf("destino=%s", p)
	}
}

func TestDestinoNaoSobrescreveSemForca(t *testing.T) {
	raiz := t.TempDir()
	p := filepath.Join(raiz, "croqui.md")
	if err := os.WriteFile(p, []byte("ja existe"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := destino(p, raiz, ".md", false); err == nil {
		t.Error("sobrescreveu sem --forca")
	}
	if _, err := destino(p, raiz, ".md", true); err != nil {
		t.Errorf("--forca deveria permitir: %v", err)
	}
}
