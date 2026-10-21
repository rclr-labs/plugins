package extrair_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/rclr-labs/croqui/internal/andar"
	"github.com/rclr-labs/croqui/internal/extrair"
)

// Montado em runtime de proposito: o repo e publico e tem push protection.
// NAO "simplifique" para um literal unico.
func segredoFalso() string {
	return "sk" + "_live_" + "1234567890abcdefghijklmnop"
}

// Esta e a camada que barra segredo com cara de identificador. A forma do
// tipo nao barra (ver modelo.TestFormaAdmiteSegredoComCaraDeIdentificador):
// quem barra e o fato de nenhuma regra de extracao apontar para literal
// arbitrario. Cada posicao abaixo e nao-declarativa e precisa continuar fora.
func TestSegredoEmPosicaoNaoDeclarativaNaoAlcancaAIR(t *testing.T) {
	s := segredoFalso()
	d := t.TempDir()
	escreve(t, d, "composer.json", `{"require":{"laravel/framework":"^11.0"}}`)
	escreve(t, d, "app/Http/Controllers/PedidoController.php", `<?php
namespace App\Http\Controllers;

class PedidoController extends Controller
{
    private $chave = "`+s+`";                      // literal atribuido
    const TOKEN = "`+s+`";                         // constante
    public $cfg = ["stripe" => "`+s+`"];           // valor de array
    // comentario de linha com `+s+`
    /* comentario de bloco com `+s+` */
    public function __construct($k = "`+s+`") {}   // default de parametro
    public function store() { return "`+s+`"; }    // valor de retorno
}`)
	escreve(t, d, "config/servicos.php", `<?php return ["k" => "`+s+`"];`)
	escreve(t, d, "database/migrations/2026_01_01_cria_pedidos.php",
		`<?php // chave antiga: `+s+`
Schema::create('pedidos', function ($t) { $t->id(); });`)

	raiz, err := andar.Raiz(d)
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

	b, err := json.Marshal(c)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(b), s) {
		t.Fatalf("segredo alcancou a IR -- a camada de posicao vazou")
	}

	// E o controle positivo: a declaracao tem que ter sido extraida, senao o
	// teste passaria por nao extrair nada.
	if !strings.Contains(string(b), "PedidoController") {
		t.Fatal("nao extraiu a declaracao; o teste acima seria vacuo")
	}
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
