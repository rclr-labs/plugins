# Convenções de português no código Laravel

Português no código é uma decisão de legibilidade — o time da empresa lê o domínio na língua em que fala dele. Mas o Laravel foi construído assumindo inglês em dois pontos, e ignorar isso gera bug silencioso.

## As três regras duras

### 1. Sem acento e sem cedilha em identificador

| Certo | Errado |
|---|---|
| classe `Endereco` | classe `Endereço` |
| tabela `enderecos` | tabela `endereços` |
| coluna `descricao` | coluna `descrição` |
| método `calcularPreco()` | método `calcularPreço()` |

Acento aparece **só em texto que o usuário lê** — label de formulário, mensagem, título de página. Nunca em nome de arquivo, classe, tabela, coluna, rota ou variável.

**Por quê:** acento em nome de tabela ou coluna depende do charset e do collation do MySQL e da configuração do sistema de arquivos; funciona na máquina de quem criou e quebra na próxima. É um erro que custa horas para diagnosticar e dois segundos para evitar.

### 2. Todo model declara `protected $table`

```php
class Papel extends Model
{
    protected $table = 'papeis';   // sem isso o Laravel procura 'papels'
}
```

**Por quê:** o Laravel deriva o nome da tabela a partir do nome do model usando inflexão **inglesa**. A maioria das palavras em português sobrevive por sorte, porque o plural inglês também só acrescenta `s`:

| Model | O Laravel adivinha | Está certo? |
|---|---|---|
| `Pedido` | `pedidos` | sim, por sorte |
| `Cliente` | `clientes` | sim, por sorte |
| `Papel` | `papels` | **não** — é `papeis` |
| `Animal` | `animals` | **não** — é `animais` |
| `Mes` | `mes` | **não** — é `meses` |

Declarar `$table` em **todos** os models, não só nos irregulares, é o que torna a regra confiável: não dá para lembrar quais palavras o inglês quebra.

### 3. O que o Laravel trouxe fica como está

Não renomeie:

- `id`, `created_at`, `updated_at`, `deleted_at`
- a tabela `users` e as colunas `email`, `password`, `remember_token` do scaffolding de autenticação
- `password_reset_tokens`, `sessions`, `cache`, `jobs` e as outras tabelas de infraestrutura
- nomes de métodos do framework (`boot`, `casts`, `fillable`)

**Por quê:** essas peças são referenciadas por dentro do framework e dos pacotes. Renomear significa sobrescrever configuração em vários lugares e descobrir o que faltou quando algo quebra. A regra prática: **nosso domínio em português; o que o Laravel trouxe, deixa.**

## Rotas e URLs

Rotas em português, porque o usuário as vê:

```php
Route::get('/pedidos', [PedidoController::class, 'index'])->name('pedidos.index');
Route::get('/pedidos/criar', [PedidoController::class, 'create'])->name('pedidos.create');
```

Os nomes dos **métodos** do controller ficam no padrão RESTful do Laravel (`index`, `create`, `store`, `show`, `edit`, `update`, `destroy`) — é o que o `Route::resource()` espera e o que qualquer dev Laravel reconhece de imediato.

## Localização pt_BR

Duas coisas diferentes, e confundi-las é a armadilha:

### `faker_locale` — funciona sozinho

```php
// config/app.php
'faker_locale' => 'pt_BR',
```

As factories passam a gerar nome, CPF, CEP e endereço brasileiros. Ganho real num MVP que vai ser mostrado a um usuário-teste: dado de teste com "John Doe" morando em Springfield faz a pessoa duvidar do produto antes de avaliar a ideia.

**Em Laravel 11+** o `config/app.php` é enxuto e essa chave pode **não existir** — nesse caso, adicione-a, não procure para editar.

### `locale` — NÃO traduz nada sozinho

```php
'locale' => 'pt_BR',   // sem o arquivo de tradução, isto não faz nada visível
```

O Laravel **não embarca** tradução pt_BR. Sem `lang/pt_BR/validation.php`, o framework cai no inglês **sem erro nenhum** — você mexe no locale, vê inglês, e não entende por quê. E `php artisan lang:publish` publica os originais **em inglês**, não traduções.

Para traduzir de fato, é preciso instalar um pacote:

```bash
composer require laravel-lang/lang --dev
php artisan lang:add pt_BR
```

Como isso instala pacote, **pergunte antes**. Se a resposta for não, deixe o `locale` em inglês e registre como dívida declarada no handover — nunca como mistério.
