package render_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/rclr-labs/croqui/internal/andar"
	"github.com/rclr-labs/croqui/internal/extrair"
	"github.com/rclr-labs/croqui/internal/guarda"
	"github.com/rclr-labs/croqui/internal/render"
)

// Montados em runtime: repo publico com push protection.
func plantados() []string {
	return []string{
		"sk" + "_live_" + "1234567890abcdefghijklmnop",
		"postgres://" + "admin" + ":" + "senha123" + "@db.interno/app",
		"base64:" + "aGVsbG8gbXVuZG8gc2VjcmV0byAxMjM0NTY3OA==",
	}
}

// repoComSegredoEmTodaParte planta cada segredo em toda posicao plausivel.
func repoComSegredoEmTodaParte(t *testing.T) string {
	t.Helper()
	d := t.TempDir()
	s := plantados()
	esc := func(rel, corpo string) {
		p := filepath.Join(d, rel)
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(corpo), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	esc("composer.json", `{"require":{"laravel/framework":"^11.0"}}`)
	esc("artisan", "#!/usr/bin/env php")
	esc(".env", "APP_KEY="+s[2]+"\nDB_URL="+s[1])
	esc("auth.json", `{"http-basic":{"repo.acme":{"password":"`+s[0]+`"}}}`)
	esc("routes/api.php", `<?php
// token antigo: `+s[0]+`
Route::get('/pedidos', [PedidoController::class, 'index']);`)
	esc("app/Http/Controllers/PedidoController.php", `<?php
class PedidoController extends Controller {
    private $k = "`+s[0]+`";
    const DB = "`+s[1]+`";
    public $a = ["key" => "`+s[2]+`"];
    public function __construct($x = "`+s[0]+`") {}
}`)
	esc("app/Models/Pedido.php", `<?php
class Pedido extends Model {
    protected $table = 'pedidos';
    protected $conexao = "`+s[1]+`";
}`)
	esc("config/servicos.php", `<?php return ["stripe" => "`+s[0]+`"];`)
	esc("database/migrations/2026_01_01_cria.php", `<?php /* `+s[2]+` */`)
	esc("tests/Fixtures/chaves.php", `<?php return "`+s[0]+`";`)
	return d
}

// geraTodosOsFormatos e a TABELA que as tarefas seguintes estendem. Nao
// duplique o teste de vazamento por formato: acrescente uma entrada no mapa
// de retorno aqui, e os dois testes abaixo passam a cobri-lo.
func geraTodosOsFormatos(t *testing.T, dir string) map[string]string {
	t.Helper()
	raiz, err := andar.Raiz(dir)
	if err != nil {
		t.Fatal(err)
	}
	r, err := andar.Caminhar(raiz, 10000)
	if err != nil {
		t.Fatal(err)
	}
	c, err := extrair.De(raiz, r)
	if err != nil {
		t.Fatal(err)
	}
	o := render.Opcoes{Nivel: 3, Versao: "0.1.0", Data: "21/10/2026"}

	md, err := render.MD(c, o)
	if err != nil {
		t.Fatal(err)
	}
	js, err := render.JSON(c, o)
	if err != nil {
		t.Fatal(err)
	}
	ht, err := render.HTML(c, o)
	if err != nil {
		t.Fatal(err)
	}
	return map[string]string{"md": md, "json": js, "html": ht}
}

func TestNenhumSegredoPlantadoApareceEmFormatoAlgum(t *testing.T) {
	saidas := geraTodosOsFormatos(t, repoComSegredoEmTodaParte(t))
	if len(saidas) < 3 {
		t.Fatal("a tabela de formatos ficou incompleta")
	}
	for formato, texto := range saidas {
		for i, s := range plantados() {
			if strings.Contains(texto, s) {
				t.Errorf("formato %s vazou o segredo plantado #%d", formato, i)
			}
		}
		if a := guarda.Conferir(texto); len(a) > 0 {
			t.Errorf("formato %s: guarda acusou %+v", formato, a)
		}
	}
}

// Controle positivo: sem isto, o teste acima passaria por nao extrair nada.
func TestAExtracaoRealmenteProduziuConteudo(t *testing.T) {
	saidas := geraTodosOsFormatos(t, repoComSegredoEmTodaParte(t))
	for formato, texto := range saidas {
		if !strings.Contains(texto, "PedidoController") {
			t.Errorf("formato %s nao tem conteudo; o teste de vazamento seria vacuo", formato)
		}
		if !strings.Contains(texto, "pedidos") {
			t.Errorf("formato %s nao extraiu a tabela", formato)
		}
	}
}
