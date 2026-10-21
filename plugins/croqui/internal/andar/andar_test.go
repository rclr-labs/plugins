package andar_test

import (
	"os"
	"path/filepath"
	"slices"
	"testing"

	"github.com/rclr-labs/croqui/internal/andar"
)

// repoFalso monta um repo-fixture com marcador de projeto.
func repoFalso(t *testing.T) string {
	t.Helper()
	d := t.TempDir()
	escreve(t, d, "composer.json", `{"name":"acme/chamados"}`)
	escreve(t, d, "app/Models/Pedido.php", "<?php class Pedido {}")
	escreve(t, d, ".env", "APP_KEY=base64:naodeveriaserlido")
	escreve(t, d, "vendor/terceiro/x.php", "<?php // dependencia")
	return d
}

func escreve(t *testing.T, raiz, rel, corpo string) {
	t.Helper()
	p := filepath.Join(raiz, rel)
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(p, []byte(corpo), 0o644); err != nil {
		t.Fatal(err)
	}
}

// Abuso (a): a deny-list protege conteudo; nada protegia escopo. A defesa e
// "isto nao e um repo" -- allowlist de marcador, nao lista negra de caminho.
func TestRaizRecusaDiretorioSemMarcadorDeProjeto(t *testing.T) {
	d := t.TempDir()
	escreve(t, d, "id_rsa", "chave-falsa")
	if _, err := andar.Raiz(d); err == nil {
		t.Fatal("aceitou diretorio sem marcador de projeto")
	}
}

func TestRaizAceitaRepoComMarcador(t *testing.T) {
	if _, err := andar.Raiz(repoFalso(t)); err != nil {
		t.Fatalf("recusou repo com composer.json: %v", err)
	}
}

func TestRaizRecusaBarraEHome(t *testing.T) {
	if _, err := andar.Raiz("/"); err == nil {
		t.Error("aceitou /")
	}
	if h, err := os.UserHomeDir(); err == nil {
		if _, err := andar.Raiz(h); err == nil {
			t.Error("aceitou $HOME")
		}
	}
}

// Abuso (b): symlink que adotaria a home como parte da raiz.
func TestNaoSegueSymlinkEReporta(t *testing.T) {
	d := repoFalso(t)
	fora := t.TempDir()
	escreve(t, fora, "segredo/chave.txt", "nao deveria aparecer")
	if err := os.Symlink(fora, filepath.Join(d, "storage-dados")); err != nil {
		t.Skipf("symlink indisponivel: %v", err)
	}
	r, err := andar.Caminhar(d, 10000)
	if err != nil {
		t.Fatal(err)
	}
	if r.Symlinks != 1 {
		t.Errorf("symlinks reportados = %d, queria 1 (silencio esconde o que foi plantado)", r.Symlinks)
	}
	for _, a := range r.Arquivos {
		if filepath.Base(a) == "chave.txt" {
			t.Fatalf("seguiu o symlink e adotou %s", a)
		}
	}
}

func TestEnvEntraEmRecusadosNaoEmArquivos(t *testing.T) {
	r, err := andar.Caminhar(repoFalso(t), 10000)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Contains(r.Recusados, ".env") {
		t.Errorf(".env deveria ser reportado como recusado, recusados=%v", r.Recusados)
	}
	if slices.Contains(r.Arquivos, ".env") {
		t.Error(".env nao pode entrar na lista de arquivos a ler")
	}
}

func TestVendorEPulado(t *testing.T) {
	r, _ := andar.Caminhar(repoFalso(t), 10000)
	for _, a := range r.Arquivos {
		if filepath.Dir(a) == filepath.Join("vendor", "terceiro") {
			t.Errorf("vendor/ deveria ser pulado, achei %s", a)
		}
	}
}

// Precisao da deny-list: a linha "recusados na leitura" e sinal de confianca
// mostrado ao usuario, e recusar ferramenta de CI como se fosse segredo
// corroi esse sinal. Rodar contra o proprio repo de plugins pegou isto.
func TestDenyListNaoRecusaFerramentaComSecretNoNome(t *testing.T) {
	d := t.TempDir()
	escreve(t, d, "composer.json", "{}")
	for _, nome := range []string{
		"secret-scan.sh", "secrets-doc.md", "credential_helper.go", "SecretsManager.php",
	} {
		escreve(t, d, nome, "conteudo de ferramenta")
	}
	r, err := andar.Caminhar(d, 10000)
	if err != nil {
		t.Fatal(err)
	}
	if len(r.Recusados) != 0 {
		t.Errorf("recusou ferramenta como se fosse segredo: %v", r.Recusados)
	}
}

func TestDenyListSegueRecusandoArquivoDeSegredoDeVerdade(t *testing.T) {
	d := t.TempDir()
	escreve(t, d, "composer.json", "{}")
	for _, nome := range []string{
		"secrets", "secrets.json", "credentials", "credentials.yml",
		".secrets", ".env", ".env.producao", "chave.pem", "id_rsa", "auth.json",
	} {
		escreve(t, d, nome, "segredo")
	}
	r, err := andar.Caminhar(d, 10000)
	if err != nil {
		t.Fatal(err)
	}
	if len(r.Recusados) != 10 {
		t.Errorf("recusados=%d, queria 10: %v", len(r.Recusados), r.Recusados)
	}
}
