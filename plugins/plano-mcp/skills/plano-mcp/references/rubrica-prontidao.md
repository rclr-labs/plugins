# Rubrica de prontidão

Carregue para pontuar os eixos, interpretar um sinal ambíguo do `scan` ou justificar um veredito. O `SKILL.md` já cobre o caminho comum.

Pontue cada eixo `0` (ausente) · `1` (parcial) · `2` (presente). **Toda nota carrega evidência** (`arquivo:linha`, nome de rota, nome de diretório). Nota sem evidência vale `0`.

## Eixo 1 — Camada de serviço reutilizável

| Nota | Critério |
|---|---|
| `2` | Regra de negócio isolada e chamável (`services/`, `usecases/`, `domain/`, `application/`) sem passar pelo controller |
| `1` | Regra existe mas vive no controller/handler: dá para chamar, com acoplamento a HTTP |
| `0` | Regra espalhada em view/template, ou só existe no banco (procedure, trigger) |

Em `0`, o adaptador MCP não tem o que reutilizar — e reescrever a regra no servidor MCP é **duplicar a autoridade do dado**. Isso vira bloqueio, não ressalva.

## Eixo 2 — Identidade · **bloqueio absoluto**

| Nota | Critério |
|---|---|
| `2` | Autenticação por token **e** autorização verificada **no recurso** (dono/conta, não só sessão) |
| `1` | Autenticação existe; autorização é por papel global ou não confere o dono do recurso (risco de IDOR) |
| `0` | Nenhum sinal de autenticação, ou acesso por chave compartilhada/superusuário |

`0` aqui → **NÃO PRONTO**, qualquer que seja o total. A ferramenta MCP age como **o usuário autenticado**; sem identidade, ela age como superusuário e todo escopo vira teatro.

Sinais do `scan` que contam: `jwt`, `lib-auth`, `middleware`, `header`, `oauth`, `usuario-na-request`, `autorizacao`.

## Eixo 3 — Superfície de leitura

| Nota | Critério |
|---|---|
| `2` | Leitura com **filtro** e **paginação** explícitos (`limit`/`offset`/`cursor` no código) |
| `1` | Leitura existe sem paginação, ou paginação sem limite máximo |
| `0` | Nenhuma rota de leitura detectada, ou só leitura "tudo de uma vez" |

`superficie[0]: nenhum` **não** é automaticamente `0` — pode ser GraphQL, gRPC, RPC interno ou um framework que o regex não cobre. **Pergunte antes de pontuar.** Tela e login não provam API.

## Eixo 4 — Isolamento entre contas

| Nota | Critério |
|---|---|
| `2` | Multi-conta com chave de isolamento aplicada na consulta (`tenant_id`, `account_id`, `organization_id`) |
| `1` | Chave existe no modelo, mas a aplicação depende do caller para filtrar |
| `0` | Sistema single-tenant (então `2` por não se aplicar — **declare isso**), ou multi-conta sem isolamento verificável |

Cuidado com o `0` ambíguo: "não se aplica" e "aplica e está quebrado" têm a mesma aparência no scan e consequências opostas. Resolva com pergunta, nunca com inferência.

## Eixo 5 — Ambiente verificável

| Nota | Critério |
|---|---|
| `2` | Dev/homologação com dado realista **e** um registro cujo ID você pode conferir na interface |
| `1` | Ambiente existe, dado é sintético ou esparso |
| `0` | Só produção, ou nenhum ambiente acessível |

Em `0`/`1`, o caminho é o **adaptador de fixtures atrás da mesma interface** do adaptador real: a ferramenta fica testável e a verificação contra a API real permanece **pendente e declarada**. Nunca simule sucesso.

## Eixo 6 — Evidência

| Nota | Critério |
|---|---|
| `2` | Comando de teste detectado **e** forma de provar a execução (log do produto, registro, auditoria) |
| `1` | Um dos dois |
| `0` | Nenhum dos dois |

Sem evidência, "funcionou" é afirmação do modelo. A chamada da ferramenta + o registro conferido no produto são o que fecha uma issue.

## Vereditos

| Condição | Veredito | O que o plano é |
|---|---|---|
| Eixo 2 = `0` | **NÃO PRONTO** | Destravar identidade. Nada mais. |
| Total ≥ 9, nenhum eixo `0` | **PRONTO** | As 7 fatias de `templates-issues.md` |
| Total 5–8, ou um `0` fora do eixo 2 | **PRONTO COM RESSALVAS** | Cada ressalva vira issue, antes da fatia que depende dela |
| Total ≤ 4 | **NÃO PRONTO** | Plano de destravamento, com o bloqueio mais barato primeiro |

## Falsos positivos comuns do `scan`

A varredura é **regex de linha sobre o arquivo inteiro**, sem análise semântica. Erra assim:

| Sinal | Falso positivo típico | Como confirmar |
|---|---|---|
| `identidade` | O "jwt" estava num comentário, num teste, ou no próprio código de um scanner | abra `arquivo:linha` e veja se é código de produção |
| `risco: sql-dinamico` | Template de query com constante interna, não com entrada do usuário | a variável vem de request? |
| `risco: acesso-direto-dado-sensivel` | String de teste, fixture, ou migration | é caminho executado em produção? |
| `superficie` | Arquivo de rotas de teste ou de mock | o arquivo está no caminho de build? |
| `camada_servico` | Diretório chamado `services/` que só tem cliente HTTP de terceiro | abra um arquivo e veja se há regra de negócio |

Regra: **o scan levanta a hipótese; o arquivo decide.** Três leituras de arquivo são suficientes para pontuar — se precisar de mais, o que falta é pergunta ao time, não leitura.

## O que não pontuar

- Qualidade do código, cobertura de teste, arquitetura. Não é auditoria; é prontidão para **expor leitura com identidade**.
- Volume de rotas. 200 rotas sem identidade pontuam pior que 3 com.
- Presença de SDK MCP no repo. Significa que alguém começou, não que o produto esteja pronto.
