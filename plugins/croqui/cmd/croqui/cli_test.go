package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func repoDeTeste(t *testing.T) string {
	t.Helper()
	d := t.TempDir()
	for rel, corpo := range map[string]string{
		"composer.json": `{"require":{"laravel/framework":"^11.0"}}`,
		"artisan":       "#!/usr/bin/env php",
		"routes/api.php": `<?php
Route::get('/pedidos', [PedidoController::class, 'index']);`,
		"app/Models/Pedido.php": `<?php
class Pedido extends Model { protected $table = 'pedidos'; }`,
		".env": "APP_KEY=segredo",
	} {
		p := filepath.Join(d, rel)
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(corpo), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return d
}

// Abuso (a) pela CLI: exit 1 e nada escrito.
func TestRootSemMarcadorSaiCom1ENaoEscreve(t *testing.T) {
	vazio := t.TempDir()
	var out, errOut bytes.Buffer
	if code := rodar([]string{"pacote", "--root", vazio}, &out, &errOut); code != 1 {
		t.Errorf("exit=%d, queria 1", code)
	}
	if ents, _ := os.ReadDir(vazio); len(ents) != 0 {
		t.Error("escreveu arquivo num diretorio recusado")
	}
	// Erro estruturado, com o proximo passo -- nao so "falhou".
	if !strings.Contains(errOut.String(), "help[]") {
		t.Errorf("erro sem linha help[]: %q", errOut.String())
	}
}

// Criterio de aceite 3 da spec: inventario compacto, com a linha que prova
// que a deny-list funcionou.
func TestInventarioSemArgumentoMostraDadoVivoEmAte24Linhas(t *testing.T) {
	d := repoDeTeste(t)
	var out, errOut bytes.Buffer
	if code := rodar([]string{"--root", d}, &out, &errOut); code != 0 {
		t.Fatalf("exit=%d: %s", code, errOut.String())
	}
	s := out.String()
	if n := strings.Count(s, "\n"); n > 24 {
		t.Errorf("inventario com %d linhas, teto e 24", n)
	}
	for _, exigido := range []string{"recusados na leitura", ".env", "symlinks ignorados", "help[]", "superficie"} {
		if !strings.Contains(s, exigido) {
			t.Errorf("inventario sem %q", exigido)
		}
	}
	// Dado vivo, nao help (AXI 8). flag escreve usage em errOut, nao em
	// stdout, entao checar so stdout passaria trivialmente: a propriedade
	// de verdade e que `croqui` puro nao imprime usage em LUGAR nenhum.
	junto := s + errOut.String()
	for _, usage := range []string{"Usage", "usage:", "uso:", "-nivel int"} {
		if strings.Contains(junto, usage) {
			t.Errorf("invocacao sem argumento imprimiu texto de uso (%q): tem que ser dado vivo", usage)
		}
	}
}

func TestFlagDesconhecidaSaiCom2(t *testing.T) {
	var out, errOut bytes.Buffer
	if code := rodar([]string{"pacote", "--inexistente"}, &out, &errOut); code != 2 {
		t.Errorf("exit=%d, queria 2 (convencao AXI)", code)
	}
}

func TestSubcomandoDesconhecidoSaiCom2(t *testing.T) {
	var out, errOut bytes.Buffer
	if code := rodar([]string{"inventar"}, &out, &errOut); code != 2 {
		t.Errorf("exit=%d, queria 2", code)
	}
}

func TestPacoteEscreveDentroDaRaizESaiCom0(t *testing.T) {
	d := repoDeTeste(t)
	var out, errOut bytes.Buffer
	if code := rodar([]string{"pacote", "--root", d, "--nivel", "3"}, &out, &errOut); code != 0 {
		t.Fatalf("exit=%d, queria 0: %s", code, errOut.String())
	}
	b, err := os.ReadFile(filepath.Join(d, "croqui.md"))
	if err != nil {
		t.Fatalf("pacote nao escrito: %v", err)
	}
	s := string(b)
	for _, exigido := range []string{"Não contém", "Pedido", "pedidos", "`.env`", "mermaid"} {
		if !strings.Contains(s, exigido) {
			t.Errorf("pacote sem %q", exigido)
		}
	}
}

func TestVisualEscreveHTMLQueAbreOffline(t *testing.T) {
	d := repoDeTeste(t)
	var out, errOut bytes.Buffer
	if code := rodar([]string{"visual", "--root", d, "--nivel", "3"}, &out, &errOut); code != 0 {
		t.Fatalf("exit=%d: %s", code, errOut.String())
	}
	b, err := os.ReadFile(filepath.Join(d, "croqui.html"))
	if err != nil {
		t.Fatal(err)
	}
	for _, proibido := range []string{"http://", "https://", "<script"} {
		if strings.Contains(string(b), proibido) {
			t.Errorf("o .html gerado contem %q", proibido)
		}
	}
}
