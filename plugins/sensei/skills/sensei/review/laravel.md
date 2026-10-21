# review · Laravel

Carregado **por cima** de `review.md` e de `review/php.md` quando o projeto é Laravel. **Em conflito, este arquivo vence os dois.**

A maior parte do defeito real em Laravel não é de PHP: é de **framework usado contra a própria convenção**. Consulta escondida dentro de laço, atribuição em massa aberta, validação no lugar errado e `env()` fora de `config`. Esta é a ordem.

## 1. Consulta escondida (N+1)

O defeito mais comum e o mais caro, porque não aparece em desenvolvimento com 10 registros.

- **Relação acessada dentro de laço** — `foreach ($pedidos as $p) { $p->cliente->nome; }` dispara uma consulta por iteração. `with('cliente')` na origem
- **Relação acessada no Blade** — `@foreach ($posts as $post) {{ $post->autor->nome }}` é o mesmo defeito, escondido na view, onde ninguém procura
- **`with()` sem as colunas** em relação grande, ou eager loading de relação que a view não usa
- **`count()` sobre relação carregada** — `$p->itens->count()` carrega a coleção inteira; `withCount('itens')` conta no banco
- **`chunk()` com modificação do critério de seleção** — ao alterar a coluna filtrada, registros são **pulados**. `chunkById()`
- **`all()` onde cabia paginação ou cursor** — carrega a tabela em memória

## 2. Atribuição em massa e entrada

- **`Model::create($request->all())`** — passa tudo que veio, inclusive campo que o atacante inventou. `$request->validated()` ou `only([...])`
- **`$guarded = []`** — abre todos os campos à atribuição em massa, inclusive `id`, `role`, `is_admin`, `owner_id`. `$fillable` explícito
- **`$fillable` com campo de autorização** — `role`, `status`, `aprovado_em` dentro do fillable é escalada de privilégio por formulário
- **`$hidden` como única proteção** — esconde na serialização, não impede gravação, e `makeVisible()` ou `toArray()` manual fura
- **API Resource devolvendo o modelo inteiro** em vez de campos escolhidos

## 3. Validação

- **Validação só no `store`, ausente no `update`** — é o caminho que mais passa
- **`$request->validate()` inline em controller grande** onde um FormRequest deixaria a regra reaproveitável e testável
- **`unique` sem ignorar o próprio registro** no update — bloqueia o usuário de salvar sem mudar o campo
- **`unique` sem considerar soft delete** — registro apagado continua reservando o valor
- **Validação de tipo ausente em campo usado em consulta** — `where('id', $request->id)` com `id` não validado
- **`sometimes`/`nullable` usados para silenciar validação** que deveria falhar

## 4. Autorização

- **Rota sem middleware de autenticação** — confira o grupo, não só a rota
- **Policy ou Gate existente mas `authorize()` não chamado** no controller
- **Route model binding sem escopo** — `Route::get('/pedidos/{pedido}')` resolve **qualquer** pedido, de qualquer conta. É IDOR com cara de recurso idiomático. Escopo por relação (`{cliente}/pedidos/{pedido}`) ou verificação explícita na policy
- **Filtro de tenant por *global scope* confiando que ninguém usa `withoutGlobalScopes()`** — audite os usos
- **`Auth::user()` no construtor do controller** — a sessão ainda não está disponível; devolve `null`

## 5. Transação e consistência

- **Duas ou mais escritas relacionadas fora de `DB::transaction()`** — a falha na segunda deixa a primeira aplicada
- **`return` dentro da closure de transação** sem entender que ele não aborta — só `throw` faz rollback
- **Evento/observer disparando efeito dentro da transação** — e-mail enviado antes do commit que depois falha
- **`Model::where(...)->update()` não dispara eventos nem observers.** Se a regra de negócio vive num observer, a atualização em massa a ignora — em silêncio
- **`firstOrCreate` / `updateOrCreate` sem índice único** no banco: em concorrência, duplica

## 6. Fila e trabalho assíncrono

- **Job não idempotente** — reprocessamento duplica efeito. Fila entrega pelo menos uma vez, não exatamente uma
- **`$tries` e `$backoff` não definidos** — ou tenta infinitamente, ou desiste na primeira
- **`failed()` ausente** em job que mexe em dado: a falha some
- **Modelo serializado no job apagado antes do processamento** — `SerializesModels` relança `ModelNotFoundException`
- **Trabalho pesado em listener síncrono** — `ShouldQueue` no listener, ou o request paga
- **Job despachado dentro de transação** — pode ser consumido antes do commit; `dispatch()->afterCommit()`

## 7. Configuração e ambiente

- **`env()` fora de `config/`** — com `config:cache` em produção, `env()` devolve **`null`**. É o defeito que só aparece depois do deploy, e aparece como comportamento absurdo, não como erro
- **Closure em rota com `route:cache`** — quebra o cache de rotas
- **Credencial ou chave em `config` versionado** em vez de variável de ambiente
- **`APP_DEBUG=true`** em caminho que vai para produção: expõe stack trace e configuração

## 8. Migration e schema

- **`down()` ausente, vazio ou que não desfaz** o que o `up()` fez
- **`dropColumn` múltiplo** em SQLite (usado em teste) quebra, mesmo funcionando em MySQL
- **Alteração de coluna** sem `doctrine/dbal` instalado, dependendo da versão
- **Índice ausente em coluna de chave estrangeira** criada por `foreignId` sem `constrained()`
- **`nullable()` esquecido** em coluna adicionada a tabela com linhas

## 9. View e saída

- **`{!! !!}`** com conteúdo vindo de usuário ou de banco — saída não escapada, XSS direto
- **Lógica de negócio no Blade** — condição composta sobre modelo na view, que ninguém testa
- **`@csrf` ausente** em formulário POST

## 10. O que **não** reportar

- Preferência entre Eloquent e Query Builder quando o desempenho é equivalente
- Ausência de Repository/Service quando o projeto não usa esse padrão em lugar nenhum
- Estilo de nome de rota, se o projeto é consistente
- Organização de pastas que diverge do default mas é coerente no projeto

## Padrões da equipe

> Preencher com o que vale **nesta** casa: versão do Laravel e do PHP, se usa Repository/Service/Action, convenção de FormRequest e Policy, pacote padrão de autorização e de fila, política de multi-tenant (global scope, coluna, ou banco por cliente), estratégia de migration em produção. O que estiver aqui **vence** as regras acima.
