# review · SQL

Carregado junto com `review.md` quando o **arquivo** revisado é `.sql`, `.prc` ou equivalente — migration, procedure, função, view.

> **Para revisar uma consulta trazida para análise** (ad hoc, de relatório, a que apareceu lenta), o modo é `/sensei sql`: ele cobre semântica de `NULL`, cardinalidade de `JOIN`, SARGability e plano. Este arquivo cobre o que é específico de **SQL versionado no repositório**. Quando o arquivo contém consulta não trivial, aplique os dois.

## 1. Migration — o que não tem volta

- **Destrutivo sem caminho de volta** — `DROP`, `TRUNCATE`, `ALTER` que perde dado ou precisão. O achado é a **ausência do script de reversão**, não a mudança
- **`NOT NULL` sem default em tabela com linhas** — falha na aplicação, ou pior, aplica em ambiente vazio e explode em produção
- **Backfill na mesma transação do DDL** — segura lock de tabela durante a carga inteira
- **Renomear coluna em uso** sem etapa de compatibilidade (adiciona → migra → troca leitura → remove)
- **Índice criado sem concorrência** onde o motor suporta (`CONCURRENTLY`, `ONLINE = ON`) em tabela grande
- **Migration não idempotente** — sem `IF NOT EXISTS` ou guarda equivalente, reexecução falha e deixa estado parcial
- **Ordem de dependência implícita** entre migrations, apoiada no nome do arquivo

## 2. Procedure e função

- **Sem tratamento de erro** — `BEGIN TRY/CATCH` com `THROW`, bloco `EXCEPTION`, ou o equivalente do dialeto. `CATCH` que engole é pior que ausência
- **Transação aberta sem fechamento garantido** em todo caminho de saída, inclusive no de erro
- **`@@TRANCOUNT` / nível de aninhamento não considerado** — `ROLLBACK` interno desfaz a transação externa
- **`SET NOCOUNT ON` ausente** em procedure chamada em laço (SQL Server): o contador de linhas vira tráfego
- **Parâmetro concatenado em SQL dinâmico** — `sp_executesql` com parâmetro, ou *allowlist* para identificador. Ver `sec.md`
- **Retorno indefinido** — procedure que às vezes devolve resultset e às vezes não, forçando o chamador a adivinhar
- **Nome sem qualificação de schema** — resolve diferente conforme o usuário que executa

## 3. Objeto e contrato

- **View ou procedure com `SELECT *`** — o contrato muda sozinho quando a tabela muda
- **Alteração de assinatura** sem levantamento de quem chama
- **Permissão concedida no objeto** (`GRANT`) dentro do mesmo arquivo, sem registro do porquê
- **Colação e tipo divergentes** entre coluna de junção e parâmetro — conversão implícita invalida índice silenciosamente

## 4. Legibilidade de SQL versionado

- **Consulta de 200 linhas sem CTE nomeada** — a nomeação é o comentário que não mente
- **Alias de uma letra** em consulta com cinco ou mais tabelas
- **Lógica de negócio sem comentário do porquê** — a regra `status IN (3, 7, 9)` precisa dizer o que esses números significam, ou usar uma tabela de domínio
- **Formatação que esconde o `WHERE`** — condição na mesma linha de um `JOIN` grande

## 5. O que **não** reportar

- Caixa alta ou baixa em palavra-chave, estilo de vírgula, indentação
- Preferência entre `JOIN` explícito e subconsulta quando ambos estão claros e o plano é equivalente
- Ausência de índice sem evidência de consulta que o usaria

## Padrões da equipe

> Preencher com o que vale **nesta** casa: dialeto e versão, convenção de nome de objeto e de migration, ferramenta de versionamento de schema, política de `NOLOCK`, obrigatoriedade de script de reversão, janela de aplicação. O que estiver aqui **vence** as regras acima.
