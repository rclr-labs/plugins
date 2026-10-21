# Rubrica de revisão

Carregue este arquivo só quando a severidade estiver ambígua, a mudança for de segurança/dados ou o usuário pedir profundidade. O SKILL.md já cobre o caso comum.

## Severidade

| Nível | Critério | Merge |
|---|---|---|
| **S0** | Explorável por atacante, perda/corrupção de dados, segredo real exposto, auth/authz ausente em rota nova, quebra de contrato público sem migração | Bloqueia |
| **S1** | Bug real em caminho provável, migration perigosa, erro engolido em fluxo crítico, validação ausente com impacto concreto | Corrige antes |
| **S2** | Edge improvável, risco menor, dívida que pode morder depois | Follow-up |

S3 não existe neste protocolo: se não muda comportamento de forma relevante, não reporte.

### Teste de realidade (antes de reportar)

1. **Gatilho**: qual entrada/estado/sequência ativa o problema?
2. **Impacto**: o que quebra, vaza, corrompe ou fica lento?
3. **Refutação**: existe guarda, validação, tipo, middleware, teste ou caller que impede?
4. **Correção mínima**: qual a menor mudança que resolve a causa?

Se qualquer resposta for vaga, descarte ou rebaixe para S2 com confiança média.

### As três saídas da refutação

Guarda encontrada **não** significa achado descartado. Decida assim:

| O que você encontrou | Desfecho |
|---|---|
| Guarda que torna o **gatilho inalcançável neste caminho** — validação antes da linha perigosa, no mesmo fluxo, cobrindo o caso | **Descarta** em silêncio. O defeito não existe |
| Guarda **parcial ou removível**: outro ponto de entrada que não passa por ela; teste no lugar de validação de runtime; convenção em vez de enforcement; defesa a montante de um padrão que continua perigoso (SQL concatenado "protegido" por validação) | **Rebaixa para S2**, com a dependência declarada. A proteção está a um refactor de sumir |
| Guarda **suposta, não vista** — você não a encontrou no bundle nem no slice | **Não descarta.** Reporta com confiança média e declara a suposição |

O erro que esta tabela evita é o falso negativo educado: ver qualquer guarda em qualquer lugar e ficar quieto.

## Confiança

- **alta**: viu o caminho completo no bundle/slice; sem suposição sobre código não lido.
- **média**: falta uma peça (ex.: comportamento de framework) e você declara a suposição.
- **baixa**: não reporte, exceto S0 com impacto plausível e verificação barata sugerida.

Não infle confiança para parecer útil. Um falso positivo custa mais tokens e confiança do que um achado omitido.

## Dimensões (nesta ordem)

### 1. Correção e edge cases
- off-by-one em índices, slices, paginação e loops (`<` vs `<=`)
- `null`/`undefined`/`None` em caminho novo; optional chaining que esconde ausência
- `await` faltando, promise flutuante, callback em `forEach` assíncrono
- erro capturado e engolido, retry sem limite, fallback que mascara falha
- coleção vazia, string vazia, zero, negativo, overflow, datas/timezone
- recurso não fechado (arquivo, conexão, lock) em caminho de erro

### 2. Segurança
- toda rota/handler novo tem autenticação e autorização **no recurso certo** (IDOR: id do path vs sessão)
- SQL/NoSQL/OS/SQL raw: parâmetro, nunca concatenação/interpolação
- SSRF, path traversal, open redirect, upload sem validação de tipo/tamanho
- segredo hardcoded, log de segredo, resposta com stack trace/PII
- JWT verificado com algoritmo fixo; TLS ligado; hash forte para segredo
- CORS/CSRF/cookies (httpOnly, secure, sameSite), mass assignment, deserialização insegura
- XSS: `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, template sem escape

### 3. Dados e concorrência
- transação cobre todas as escritas relacionadas; rollback em erro
- idempotência em retry/webhook/fila; dupla execução não duplica efeito
- race condition em check-then-act; lock/versão onde importa
- migration: `NOT NULL` sem default, backfill, lock de tabela, rollback possível
- `DELETE`/`UPDATE` sem `WHERE`; cascade inesperado; retenção

### 4. Contrato e API
- shape de resposta e status codes; erro não vaza interno
- compatibilidade retroativa; campo removido/renomeado; versão
- validação de entrada no boundary; tipo coercivo (`String(req.params.id)`)
- mensagens e códigos de erro que o cliente já consome

### 5. Performance
- N+1 evidente (query dentro de loop), `SELECT *` em tabela grande
- loop/consulta sem limite, paginação ausente, carregar tudo em memória
- I/O síncrono ou trabalho pesado no caminho da request
- só reporte se o custo for concreto no diff, não por preferência

### 6. Testes do comportamento alterado
- o comportamento novo/alterado tem teste que falharia antes da correção?
- teste verifica comportamento, não implementação
- falta caso negativo/erro quando o diff mexe em validação
- não exija teste para mudança trivial de config/doc

## Armadilhas por stack

- **TS/JS**: `==`, `any`, JSON.parse sem try, Date/UTC, floating promise, `for...in`, `this` perdido, `Array.sort` mutando.
- **Python**: default mutável, `except` bare, `is` com literal, blocking em async, `%`/f-string em SQL, `pickle`/`yaml.load`.
- **SQL**: interpolação, `LIKE` sem escapar `%`, `UPDATE` sem `WHERE`, índice ausente em coluna de filtro, lock em migration.
- **Go**: erro ignorado (`_`), goroutine sem cancelamento, `defer` em loop, contexto não propagado.
- **Shell/CI**: variável sem quote, `set -e` ausente, segredo em log, permissão ampla em workflow.
- **Config/infra**: TLS desligado, CORS `*`, porta/segredo default, permissão IAM ampla.

## Anti-padrões de relatório

- elogio, resumo do diff, repetição do óbvio
- preferência de estilo/nome/arquitetura sem bug concreto
- "considere", "talvez", "seria bom", "pode ser que"
- sugestão de desligar validação/TLS/authz para fazer passar
- mais de 8 achados: priorize por severidade e confiança
- citar linha que não existe no bundle (verifique com `sensei slice`)

## Exemplos

Bom:
`[S1] src/api.ts:25 — DELETE concatena req.params.id no SQL. Gatilho: id com aspas. Impacto: injection/delete indevido. Correção: db.query("DELETE ... WHERE id = ?", [id]). (confiança: alta)`

Ruim:
`[S2] src/api.ts — seria interessante usar ORM e tipar melhor.`

O segundo não tem gatilho, impacto nem correção; não reporte.
