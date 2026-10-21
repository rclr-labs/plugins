# sql — revisão de consulta

Modo para a consulta em si: **ela responde a pergunta certa, e a que custo?**

> **Diferença para `review/sql.md`:** este modo revisa uma consulta trazida para análise — ad hoc, de relatório, de migration, a que apareceu lenta em produção. O `review/sql.md` entra quando um **arquivo** `.sql` passa por code review junto com as regras gerais. Se o usuário colou uma consulta, é este modo. Se ele apontou um arquivo num PR, é `review`.

## 1. Semântica — antes de performance

Consulta rápida com resultado errado é pior que consulta lenta. Nesta ordem:

- **`NULL` muda tudo.** `NOT IN (subconsulta que retorna NULL)` devolve vazio, não "todos". `<>` não casa `NULL`. `COUNT(coluna)` ignora `NULL`, `COUNT(*)` não
- **`JOIN` que multiplica linha** — cardinalidade do lado direito maior que 1 inflando `SUM`/`COUNT`. É o defeito que mais passa despercebido em relatório financeiro
- **`LEFT JOIN` anulado por filtro no `WHERE`** — condição sobre a tabela da direita fora do `ON` transforma o `LEFT` em `INNER`
- **`GROUP BY` incompleto** ou agregação sobre coluna não agrupada
- **`DISTINCT` escondendo duplicação** em vez de corrigir o `JOIN` que a causou
- **Intervalo de data meio aberto** — `BETWEEN` com data e hora deixa o último dia de fora; `>= inicio AND < fim` é a forma segura
- **Fuso e conversão implícita** entre `date`, `datetime` e texto
- **Paginação sem `ORDER BY` determinístico** — sem desempate estável, a mesma consulta devolve linha repetida entre páginas

## 2. Mutação — o que não tem volta

- **`UPDATE` ou `DELETE` sem `WHERE`.** Sempre S0 até prova em contrário
- **`WHERE` que não filtra o que o autor pensa** — condição em `OR` sem parênteses é o caso clássico
- **Sem transação** quando há duas escritas que precisam valer juntas
- **Transação longa demais**, segurando lock durante trabalho que podia ficar fora dela
- **Migration destrutiva**: `DROP`, `TRUNCATE`, `ALTER` que perde dado, `NOT NULL` sem default em tabela com linhas, ausência de caminho de volta
- **`MERGE`/upsert** sem chave única que o sustente — duplica em concorrência

## 3. Plano e custo

- **Predicado não-SARGable** — função sobre a coluna filtrada (`WHERE YEAR(data) = 2026`, `WHERE UPPER(nome) = ...`), que impede o uso do índice. A forma equivalente por intervalo costuma resolver
- **Conversão implícita** no predicado — comparar `varchar` com `int`, ou tipos de *collation* diferentes, invalida o índice silenciosamente
- **`SELECT *`** em consulta de aplicação: carrega coluna grande sem necessidade e quebra quando o schema muda
- **Curinga à esquerda** (`LIKE '%x'`) sobre tabela grande
- **Consulta dentro de laço** na aplicação (N+1) — se a consulta vem de código, aponte
- **Sem limite** em consulta exploratória sobre tabela grande
- **Subconsulta correlacionada** onde `JOIN` ou função de janela resolve em uma passada
- **`OFFSET` alto** em paginação profunda: o custo cresce com o deslocamento; paginação por chave é a saída

## 4. Concorrência e leitura suja

- **`NOLOCK` / `READ UNCOMMITTED`** — não é "otimização": permite ler linha que será desfeita, e até pular ou duplicar linha durante movimentação de página. Em relatório que vira número oficial, é achado
- **Cursor** onde operação em conjunto resolve
- **Check-then-act** entre duas consultas sem proteção — "existe?" seguido de `INSERT` é condição de corrida

## 5. Dado sensível

- Consulta que seleciona mais coluna sensível do que a saída precisa
- Filtro de conta/tenant ausente — ver `sec.md`
- Consulta que vai para log com valor literal de dado pessoal

## Como reportar neste modo

Além do formato do `SKILL.md`:

- **Diga em qual das cinco categorias** o achado cai — semântica, mutação, plano, concorrência, dado sensível. Ajuda quem lê a saber se é risco de resultado errado ou de lentidão
- **Quando propuser reescrita, mostre a consulta corrigida.** Aqui a correção é o próprio SQL, não uma descrição dela
- **Não afirme ganho de performance sem plano de execução.** O honesto é: "predicado não-SARGable na coluna X; confirme com o plano antes de medir ganho"
- Se o dialeto não estiver declarado e a regra depender dele, **pergunte** em vez de assumir. `MERGE`, `LIMIT`/`TOP`, função de data e *hint* variam entre PostgreSQL, SQL Server, Oracle, MySQL e DB2
