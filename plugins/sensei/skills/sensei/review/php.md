# review · PHP

Carregado junto com `review.md`. **Em conflito, este arquivo vence.**

Em projeto Laravel, `review/laravel.md` é carregado **por cima** deste — e vence os dois.

PHP falha principalmente por **coerção silenciosa**: comparação que converte tipo, função que devolve `false` onde você esperava `null`, e ausência que se confunde com zero. Comece por aí.

## 1. Comparação e tipo

- **`==` onde devia ser `===`.** A comparação frouxa converte antes de comparar. `in_array('abc', [0, 1])` é `true` sem o terceiro parâmetro `strict`; `'1e2' == '100'` é `true`; `null == 0` é `true`
- **`array_search` e `strpos` devolvem `false`**, que é `== 0`. Testar com `==` faz o índice 0 ser lido como "não achou". Sempre `!== false`
- **`in_array` / `array_keys` / `array_search` sem `strict: true`**
- **`declare(strict_types=1)` ausente** no topo do arquivo: a declaração de tipo vira coerção em vez de contrato. `function f(int $x)` aceita `"5"` e aceita `"5abc"` com aviso
- **`empty()` como teste de ausência** — `0`, `'0'`, `''`, `[]` e `false` são todos *empty*. Para "veio ou não veio", `isset()` ou `?? null`
- **`??` e `?:` trocados** — `?:` dispara em qualquer valor falsy; `??` só em `null`
- **Comparação de float** por igualdade; dinheiro em `float` em vez de inteiro de centavos ou string decimal

## 2. Erro e exceção

- **`catch (\Exception)` não pega `\Error`.** `TypeError`, `ValueError` e `DivisionByZeroError` descendem de `\Error`. Para pegar tudo, `\Throwable`
- **Operador `@`** suprimindo erro: esconde a causa e não impede a falha
- **`json_decode` sem verificação** — devolve `null` tanto para `"null"` quanto para JSON inválido. `JSON_THROW_ON_ERROR` ou `json_last_error()`
- **`catch` vazio** ou que só registra e segue com estado inconsistente
- **`exit` / `die` em código de biblioteca** — mata o processo inteiro e impossibilita teste
- **Função que devolve `false` em erro e valor em sucesso**, sem o chamador distinguir

## 3. Array e string

- **Referência em `foreach` não liberada** — `foreach ($a as &$v) {}` deixa `$v` apontando para o último elemento; o próximo `foreach` sobre o mesmo array corrompe o último item. `unset($v)` logo depois, ou não usar referência
- **`array_merge` dentro de laço** — realoca a cada iteração. Acumule e junte uma vez, ou use `[]=`
- **`strlen`, `substr`, `strtoupper` sobre texto com acento** — quebram UTF-8. As versões `mb_*`, com encoding explícito
- **Chave de array como string numérica** — `'1'` vira `1` silenciosamente, colidindo com uma chave inteira existente
- **`array_map` com `null`** ou com função que depende de índice, onde `foreach` seria mais claro

## 4. Execução dinâmica e entrada

- **`eval`, `extract`, variável variável (`$$nome`), `create_function`** — todos tornam o fluxo indecifrável e são superfície de injeção
- **Superglobal usada direto** — `$_GET`, `$_POST`, `$_REQUEST`, `$_SERVER['HTTP_*']` sem validação. `filter_var` com filtro explícito, ou a camada de validação do framework
- **`include`/`require` com caminho montado por entrada** — inclusão de arquivo remoto ou local
- **`unserialize` sobre dado externo** — use `json_decode`, ou `allowed_classes: false`
- **Senha com `md5`/`sha1`** — `password_hash`/`password_verify`. Ver `sec.md`

## 5. Objeto e contrato

- **`self` onde o correto é `static`** — sem late static binding, a subclasse recebe a instância da classe pai
- **Mudança de assinatura em interface ou classe base** sem o levantamento de quem implementa
- **Propriedade pública mutável** onde havia invariante a proteger
- **Tipo de retorno ausente** em método novo de código que já tipa
- **`__get`/`__call`** escondendo propriedade inexistente, que então falha em runtime longe da causa

## 6. O que **não** reportar

- Estilo PSR-12, chave na mesma linha, aspas simples contra duplas — trabalho do `php-cs-fixer`
- Ausência de tipo em arquivo de código legado que não tipa em lugar nenhum
- Preferência entre `array()` e `[]` quando o arquivo é consistente

## Padrões da equipe

> Preencher com o que vale **nesta** casa: versão mínima de PHP, se `strict_types` é obrigatório, biblioteca padrão de log e de HTTP, camada obrigatória de acesso a dado, convenção de namespace, política de dependência no `composer.json`. O que estiver aqui **vence** as regras acima.
