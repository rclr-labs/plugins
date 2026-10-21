package extrair_test

import (
	"testing"

	"github.com/rclr-labs/croqui/internal/andar"
	"github.com/rclr-labs/croqui/internal/extrair"
	"github.com/rclr-labs/croqui/internal/modelo"
)

func laravelFalso(t *testing.T) *modelo.Croqui {
	t.Helper()
	d := t.TempDir()
	escreve(t, d, "composer.json", `{"require":{"laravel/framework":"^11.0"}}`)
	escreve(t, d, "artisan", "#!/usr/bin/env php")
	escreve(t, d, "routes/api.php", `<?php
Route::get('/pedidos', [PedidoController::class, 'index']);
Route::post('/pedidos', [PedidoController::class, 'store']);
Route::delete('/pedidos/{id}', 'PedidoController@destroy');`)
	escreve(t, d, "app/Http/Controllers/PedidoController.php",
		`<?php class PedidoController extends Controller { public function index() {} }`)
	escreve(t, d, "app/Models/Pedido.php", `<?php
class Pedido extends Model {
    protected $table = 'pedidos';
    protected $fillable = ['cliente_id', 'total'];
}`)
	escreve(t, d, "app/Jobs/NotificaPedido.php", `<?php class NotificaPedido implements ShouldQueue {}`)
	escreve(t, d, "app/Console/Commands/FechaMes.php", `<?php class FechaMes extends Command {}`)

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
	return c
}

func TestLaravelDetectaCamada(t *testing.T) {
	c := laravelFalso(t)
	var achou bool
	for _, cam := range c.Camadas {
		if cam == modelo.CamadaLaravel {
			achou = true
		}
	}
	if !achou {
		t.Errorf("camada laravel nao detectada, camadas=%v", c.Camadas)
	}
}

func TestLaravelExtraiRotasNasDuasSintaxes(t *testing.T) {
	c := laravelFalso(t)
	if len(c.Rotas) != 3 {
		t.Fatalf("rotas=%d, queria 3: %+v", len(c.Rotas), c.Rotas)
	}
	var viuArray, viuArroba bool
	for _, r := range c.Rotas {
		if r.Caminho == "/pedidos" && r.Verbo == "GET" && r.Controlador == "PedidoController" && r.Metodo == "index" {
			viuArray = true
		}
		if r.Verbo == "DELETE" && r.Metodo == "destroy" {
			viuArroba = true
		}
	}
	if !viuArray {
		t.Error("nao extraiu a sintaxe [Classe::class, 'metodo']")
	}
	if !viuArroba {
		t.Error("nao extraiu a sintaxe 'Classe@metodo'")
	}
}

func TestLaravelExtraiEntidadeComTabelaEArestas(t *testing.T) {
	c := laravelFalso(t)
	var ent *modelo.Entidade
	for i := range c.Entidades {
		if c.Entidades[i].Classe == "Pedido" {
			ent = &c.Entidades[i]
		}
	}
	if ent == nil {
		t.Fatalf("entidade Pedido nao extraida: %+v", c.Entidades)
	}
	if ent.Tabela != "pedidos" {
		t.Errorf("tabela=%q, queria pedidos", ent.Tabela)
	}
	if len(ent.Campos) != 2 {
		t.Errorf("campos=%v, queria 2 do fillable", ent.Campos)
	}
	var viu bool
	for _, a := range c.Arestas {
		if a.Tipo == modelo.ArestaEntidadeTabela && a.De == "Pedido" {
			viu = true
		}
	}
	if !viu {
		t.Error("faltou aresta entidade->tabela")
	}
}

func TestLaravelExtraiJobsEComandos(t *testing.T) {
	c := laravelFalso(t)
	if len(c.Jobs) != 1 || c.Jobs[0] != "NotificaPedido" {
		t.Errorf("jobs=%v", c.Jobs)
	}
	if len(c.Comandos) != 1 || c.Comandos[0] != "FechaMes" {
		t.Errorf("comandos=%v", c.Comandos)
	}
}

// Regressao dos dois bugs que os testes acima pegaram na primeira rodada.
//
// Bug 1: reClasse exigia `class` em inicio de linha, entao
// `<?php class X {}` numa unica linha nao casava -- jobs e comandos saiam
// vazios. Tirar o ^ e usar \bclass nao resolve porque \b casa em
// `Foo::class`: RE2 nao tem lookbehind, logo o caractere anterior vira
// grupo de captura negado.
//
// Bug 2: app/Http/Controllers/ nao era lido. No teste golden o controller
// aparecia so porque a rota o nomeia; sem rota, nada era extraido -- e foi o
// controle positivo do teste de posicao que denunciou.
func TestClasseNumaLinhaSoEExtraida(t *testing.T) {
	d := t.TempDir()
	escreve(t, d, "composer.json", `{"require":{"laravel/framework":"^11.0"}}`)
	escreve(t, d, "artisan", "#!/usr/bin/env php")
	escreve(t, d, "app/Jobs/UmaLinha.php", `<?php class UmaLinha implements ShouldQueue {}`)
	escreve(t, d, "app/Http/Controllers/SemRotaController.php",
		`<?php class SemRotaController extends Controller {}`)

	raiz, _ := andar.Raiz(d)
	r, _ := andar.Caminhar(raiz, 10000)
	c, _ := extrair.De(raiz, r)

	if len(c.Jobs) != 1 || c.Jobs[0] != "UmaLinha" {
		t.Errorf("classe em linha unica nao extraida: jobs=%v", c.Jobs)
	}
	// Controller sem rota registrada e sinal proprio, e precisa aparecer.
	if len(c.Controladores) != 1 || c.Controladores[0] != "SemRotaController" {
		t.Errorf("controller sem rota nao extraido: %v", c.Controladores)
	}
}

func TestClassNaoCasaEmColonColonClassNemEmPropriedade(t *testing.T) {
	d := t.TempDir()
	escreve(t, d, "composer.json", `{"require":{"laravel/framework":"^11.0"}}`)
	escreve(t, d, "artisan", "#!/usr/bin/env php")
	escreve(t, d, "app/Jobs/Real.php", `<?php
class Real implements ShouldQueue {
    public function handle() {
        $alvo = PedidoController::class;
        $x = $obj->class;
        $y = $classDeOutraCoisa;
    }
}`)
	raiz, _ := andar.Raiz(d)
	r, _ := andar.Caminhar(raiz, 10000)
	c, _ := extrair.De(raiz, r)

	if len(c.Jobs) != 1 {
		t.Fatalf("queria exatamente 1 classe, achei %v", c.Jobs)
	}
	if c.Jobs[0] != "Real" {
		t.Errorf("classe errada: %v", c.Jobs)
	}
}

// Rodar contra o skeleton OFICIAL do Laravel (laravel/laravel) mostrou que a
// rota do proprio skeleton nao era extraida: ela usa closure, nao
// controlador. E o padrao do Laravel 11/12 e uso comum em app real.
func TestRotaComClosureEExtraidaSemControlador(t *testing.T) {
	d := t.TempDir()
	escreve(t, d, "composer.json", `{"require":{"laravel/framework":"^12.0"}}`)
	escreve(t, d, "artisan", "#!/usr/bin/env php")
	escreve(t, d, "routes/web.php", `<?php
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});
Route::post('/webhook', fn () => resposta());
Route::get('/pedidos', [PedidoController::class, 'index']);`)

	raiz, _ := andar.Raiz(d)
	r, _ := andar.Caminhar(raiz, 10000)
	c, _ := extrair.De(raiz, r)

	if len(c.Rotas) != 3 {
		t.Fatalf("rotas=%d, queria 3 (duas closures e uma com controlador): %+v", len(c.Rotas), c.Rotas)
	}
	var raiz0, webhook, comCtrl bool
	for _, rt := range c.Rotas {
		switch {
		case rt.Caminho == "/" && rt.Verbo == "GET" && rt.Controlador == "":
			raiz0 = true
		case rt.Caminho == "/webhook" && rt.Verbo == "POST" && rt.Controlador == "":
			webhook = true
		case rt.Caminho == "/pedidos" && rt.Controlador == "PedidoController" && rt.Metodo == "index":
			comCtrl = true
		}
	}
	if !raiz0 {
		t.Error("closure com function() nao extraida")
	}
	if !webhook {
		t.Error("closure com fn() nao extraida")
	}
	if !comCtrl {
		t.Error("rota com controlador perdeu o controlador")
	}
}

// Manifesto marca a STACK, nao e ponto de entrada. composer.json aparecendo
// como entrada "http" era erro de categoria, visivel no pacote do skeleton.
func TestManifestoNaoEPontoDeEntrada(t *testing.T) {
	c := laravelFalso(t)
	for _, e := range c.Entradas {
		alvo := string(e.Alvo[len(e.Alvo)-1])
		if alvo == "composer.json" || alvo == "package.json" || alvo == "Makefile" {
			t.Errorf("%s nao e ponto de entrada, e marcador de stack: %+v", alvo, e)
		}
	}
	// E a stack tem que continuar sendo detectada por ele.
	var viuPhp bool
	for _, s := range c.Stacks {
		if s.Nome == "php" {
			viuPhp = true
		}
	}
	if !viuPhp {
		t.Errorf("composer.json tem que marcar a stack php: %+v", c.Stacks)
	}
}
