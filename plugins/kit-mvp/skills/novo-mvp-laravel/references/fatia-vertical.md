# A fatia vertical

Uma fatia é um pedaço da jornada que funciona **ponta a ponta**: a pessoa abre o navegador, faz a coisa, e funciona. Nunca "o banco todo" nem "todas as telas".

## Por que fatia vertical e não camada

Construir por camada (todas as migrations, depois todos os models, depois todas as telas) significa que **nada funciona até o final**. Você não tem como mostrar o MVP a ninguém, não tem como descobrir que a modelagem estava errada, e não tem como medir progresso — só a sensação de progresso.

Construir por fatia significa que você sempre tem **N jornadas completas e as outras ainda não começadas**. É o antídoto direto para escopo inflando: nunca existe meia tela pronta.

## A ordem

```
migration -> model + factory -> rota -> controller -> Form Request -> view -> testes
```

**A ordem não é negociável**, e um item dela surpreende: `controller` vem **antes** do `Form Request`. Escrever o controller primeiro mostra quais campos realmente chegam na requisição; aí a validação cobre o que existe, em vez de um contrato imaginado que depois não bate com o formulário.

## Exemplo completo — fatia "registrar pedido"

### 1. Migration

```bash
php artisan make:migration cria_tabela_pedidos
```

```php
public function up(): void
{
    Schema::create('pedidos', function (Blueprint $table) {
        $table->id();
        $table->foreignId('cliente_id')->constrained('clientes');
        $table->string('descricao');
        $table->integer('quantidade');
        $table->decimal('preco_unitario', 10, 2);
        $table->decimal('total', 10, 2);
        $table->timestamps();
    });
}
```

Note: `decimal`, não `float`, para dinheiro. `float` acumula erro de arredondamento e um MVP de vendas com total errado perde a conversa sobre a ideia.

### 2. Model + factory

```php
// app/Models/Pedido.php
class Pedido extends Model
{
    protected $table = 'pedidos';          // explícito, sempre

    protected $fillable = ['cliente_id', 'descricao', 'quantidade', 'preco_unitario', 'total'];

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }
}
```

```php
// database/factories/PedidoFactory.php
public function definition(): array
{
    return [
        'cliente_id'     => Cliente::factory(),
        'descricao'      => fake()->sentence(3),
        'quantidade'     => fake()->numberBetween(1, 10),
        'preco_unitario' => fake()->randomFloat(2, 10, 500),
        'total'          => 0,
    ];
}
```

A factory não é opcional: é ela que torna os testes curtos. Sem factory, cada teste precisa montar o mundo à mão.

### 3. Rota

```php
// routes/web.php
Route::get('/pedidos',       [PedidoController::class, 'index'])->name('pedidos.index');
Route::get('/pedidos/criar', [PedidoController::class, 'create'])->name('pedidos.create');
Route::post('/pedidos',      [PedidoController::class, 'store'])->name('pedidos.store');
```

URL em português (o usuário vê); método no padrão RESTful do Laravel (`index`, `create`, `store`) porque é o que qualquer dev reconhece de imediato.

### 4. Controller (fino)

```php
class PedidoController extends Controller
{
    public function index()
    {
        // paginate(), nunca all(); with() para não gerar N+1 na listagem
        $pedidos = Pedido::with('cliente')->latest()->paginate(15);

        return view('pedidos.index', compact('pedidos'));
    }

    public function create()
    {
        return view('pedidos.create', ['clientes' => Cliente::orderBy('nome')->get()]);
    }

    public function store(GravarPedidoRequest $request, RegistrarPedido $acao)
    {
        $pedido = $acao->executar($request->validated());

        return redirect()
            ->route('pedidos.index')
            ->with('sucesso', "Pedido #{$pedido->id} registrado.");
    }
}
```

### 5. Form Request

```bash
php artisan make:request GravarPedidoRequest
```

```php
class GravarPedidoRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'cliente_id'     => ['required', 'exists:clientes,id'],
            'descricao'      => ['required', 'string', 'max:255'],
            'quantidade'     => ['required', 'integer', 'min:1'],
            'preco_unitario' => ['required', 'numeric', 'min:0'],
        ];
    }
}
```

Nunca `$request->all()` no `create()` — o controller usa `$request->validated()`, que devolve só o que passou pelas regras acima.

### 6. View

Uma tela por fatia, feia e funcional. Mostre a mensagem de sucesso e os erros de validação — sem isso a pessoa não sabe se funcionou.

```blade
{{-- resources/views/pedidos/create.blade.php --}}
@if ($errors->any())
    <ul>@foreach ($errors->all() as $erro)<li>{{ $erro }}</li>@endforeach</ul>
@endif

<form method="POST" action="{{ route('pedidos.store') }}">
    @csrf
    {{-- campos --}}
    <button type="submit">Registrar pedido</button>
</form>
```

### 7. Testes

**A Action, com cálculo separado da persistência** — é isto que torna o teste unitário barato:

```php
// app/Actions/RegistrarPedido.php
class RegistrarPedido
{
    /** Cálculo puro: sem banco, sem facade. Testável em tests/Unit/. */
    public function calcularTotal(int $quantidade, float $precoUnitario): float
    {
        return round($quantidade * $precoUnitario, 2);
    }

    /** Persistência: toca o banco. Testável em tests/Feature/. */
    public function executar(array $dados): Pedido
    {
        $dados['total'] = $this->calcularTotal($dados['quantidade'], $dados['preco_unitario']);

        return Pedido::create($dados);
    }
}
```

**Teste unitário** — cálculo puro, `tests/Unit/`, sem banco:

```php
// tests/Unit/RegistrarPedidoTest.php
use PHPUnit\Framework\TestCase;   // base do PHPUnit: sem container, sem banco

class RegistrarPedidoTest extends TestCase
{
    public function test_calcula_o_total_a_partir_da_quantidade_e_do_preco(): void
    {
        $this->assertSame(30.0, (new RegistrarPedido())->calcularTotal(3, 10.00));
    }

    public function test_arredonda_o_total_em_duas_casas(): void
    {
        $this->assertSame(33.33, (new RegistrarPedido())->calcularTotal(3, 11.11));
    }
}
```

**Teste de feature** — a jornada, `tests/Feature/`, com banco:

```php
// tests/Feature/RegistrarPedidoTest.php
use Tests\TestCase;                                  // base do Laravel: container + facades
use Illuminate\Foundation\Testing\RefreshDatabase;

class RegistrarPedidoTest extends TestCase
{
    use RefreshDatabase;

    public function test_registra_um_pedido_e_calcula_o_total(): void
    {
        $cliente = Cliente::factory()->create();

        $this->post(route('pedidos.store'), [
            'cliente_id'     => $cliente->id,
            'descricao'      => 'Teclado',
            'quantidade'     => 3,
            'preco_unitario' => 10.00,
        ])->assertRedirect(route('pedidos.index'));

        $this->assertDatabaseHas('pedidos', ['descricao' => 'Teclado', 'total' => 30.00]);
    }

    public function test_recusa_pedido_sem_descricao(): void
    {
        $cliente = Cliente::factory()->create();

        $this->post(route('pedidos.store'), [
            'cliente_id'     => $cliente->id,
            'quantidade'     => 1,
            'preco_unitario' => 10.00,
        ])->assertSessionHasErrors('descricao');

        $this->assertDatabaseCount('pedidos', 0);
    }
}
```

## O erro que esta divisão evita

Colocar um teste que usa Eloquent em `tests/Unit/` estendendo `PHPUnit\Framework\TestCase` falha com:

```
Error: A facade root has not been set.
```

A mensagem não diz nada sobre a causa real (não há aplicação Laravel inicializada naquele contexto) e consome uma sessão inteira de diagnóstico. A regra que evita isso é mecânica: **toca o banco → `tests/Feature/` com `Tests\TestCase` e `RefreshDatabase`. Não toca → `tests/Unit/` com a base do PHPUnit.**

## Portão da fatia

Os dois, não um:

1. `php artisan test` verde, com a **saída mostrada**.
2. A tela aberta no navegador, funcionando. Diga qual URL abrir.

Só então marque a fatia em `docs/mvp/03-fatias.md` e **pare** para perguntar se segue para a próxima.
