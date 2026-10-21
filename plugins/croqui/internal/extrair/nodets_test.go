package extrair_test

import (
	"testing"

	"github.com/rclr-labs/croqui/internal/andar"
	"github.com/rclr-labs/croqui/internal/extrair"
	"github.com/rclr-labs/croqui/internal/modelo"
)

func nestFalso(t *testing.T) *modelo.Croqui {
	t.Helper()
	d := t.TempDir()
	escreve(t, d, "package.json", `{"dependencies":{"@nestjs/core":"^10.0.0"}}`)
	escreve(t, d, "src/pedidos/pedidos.controller.ts", `
@Controller('pedidos')
export class PedidosController {
  @Get() findAll() {}
  @Post(':id') create() {}
}`)
	escreve(t, d, "src/app.ts", `
const app = express();
app.get('/saude', (req, res) => res.send('ok'));
app.post('/webhook/acme', handler);`)
	escreve(t, d, "prisma/schema.prisma", `
model Pedido {
  id    Int    @id @default(autoincrement())
  total Float
}
model Cliente {
  id Int @id
}`)
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

func TestNodeTSDetectaCamada(t *testing.T) {
	c := nestFalso(t)
	var achou bool
	for _, cam := range c.Camadas {
		if cam == modelo.CamadaNodeTS {
			achou = true
		}
	}
	if !achou {
		t.Errorf("camada nodets nao detectada: %v", c.Camadas)
	}
}

func TestNodeTSExtraiControllerDeDecorator(t *testing.T) {
	c := nestFalso(t)
	var viu bool
	for _, r := range c.Rotas {
		if r.Controlador == "PedidosController" {
			viu = true
		}
	}
	if !viu {
		t.Errorf("nao extraiu @Controller: %+v", c.Rotas)
	}
}

func TestNodeTSExtraiRotaDeExpress(t *testing.T) {
	c := nestFalso(t)
	var viu bool
	for _, r := range c.Rotas {
		if r.Caminho == "/saude" && r.Verbo == "GET" {
			viu = true
		}
	}
	if !viu {
		t.Errorf("nao extraiu app.get: %+v", c.Rotas)
	}
}

func TestNodeTSExtraiModelDoPrisma(t *testing.T) {
	c := nestFalso(t)
	nomes := map[modelo.Ident]bool{}
	for _, e := range c.Entidades {
		nomes[e.Classe] = true
	}
	if !nomes["Pedido"] || !nomes["Cliente"] {
		t.Errorf("models do prisma nao extraidos: %+v", c.Entidades)
	}
}

// A mesma invariante de posicao da Task 4 vale aqui.
func TestNodeTSNaoExtraiSegredoDeLiteral(t *testing.T) {
	s := segredoFalso()
	d := t.TempDir()
	escreve(t, d, "package.json", `{"dependencies":{"express":"^4.0.0"}}`)
	escreve(t, d, "src/app.ts", `
const stripe = "`+s+`";
const chaves = ["`+s+`"];
function f(k = "`+s+`") {}
const app = express();
app.get('/saude', h);`)
	raiz, _ := andar.Raiz(d)
	r, _ := andar.Caminhar(raiz, 10000)
	c, _ := extrair.De(raiz, r)
	for _, rt := range c.Rotas {
		if string(rt.Caminho) == s || string(rt.Controlador) == s {
			t.Fatal("segredo alcancou a IR pelo extrator nodets")
		}
	}
	for _, e := range c.Entidades {
		if string(e.Classe) == s {
			t.Fatal("segredo virou entidade")
		}
	}
	// Controle positivo.
	var viu bool
	for _, rt := range c.Rotas {
		if rt.Caminho == "/saude" {
			viu = true
		}
	}
	if !viu {
		t.Fatal("nao extraiu a rota; o teste acima seria vacuo")
	}
}
