# Templates de issues

Carregue ao escrever o `plano-mcp.md`. O formato abaixo é **exatamente** o que `mcpx issues` valida — o validador é literal, não interpreta variação.

## Formato exigido

````markdown
# Plano MCP — <produto>

> Veredito: PRONTO COM RESSALVAS (8/12) · escopo: leitura, stdio, 2 ferramentas

## Issue 1 — Contrato das ferramentas e ADR de transporte
- **Labels:** mcp, contrato
- **Depende de:** —
- **Estimativa:** S
### Contexto
Por que esta fatia existe, e o que já é FATO sobre o repo (com `arquivo:linha`).
### Critério de aceite
- [ ] Item verificável, não "está bom"
- [ ] Outro item verificável
### Evidência exigida
Como se prova que terminou: saída de comando, ID conferido na interface, arquivo criado.
````

Regras do validador — cada uma falha o comando e nada é gerado:

| Exigência | Detalhe |
|---|---|
| Cabeçalho da issue | `## Issue N — Título` com **travessão** (`—`), não hífen |
| Campos | `- **Labels:**` e `- **Estimativa:**` são obrigatórios; `- **Depende de:**` é opcional (`—` quando não há) |
| Posição dos campos | **antes** do primeiro `###` da issue |
| Seções | `### Contexto`, `### Critério de aceite`, `### Evidência exigida` — as três, com texto |
| Critério de aceite | ≥1 item no formato `- [ ] ...` |
| Dependência | só para issue que **existe** e tem número **menor** (a ordem tem que fechar) |
| Título | sem `TODO`, `TBD` ou reticências |

Seção extra (`### Fora de escopo`, `### Risco`) é permitida e vai para o corpo da issue.

## As 7 fatias de referência

Ordem pensada como **tracer bullet**: cada fatia atravessa o sistema inteiro e deixa algo verificável de pé. Corte da última para a primeira; nunca corte a evidência.

| # | Fatia | Entrega verificável |
|---|---|---|
| 1 | **Contrato + ADR** | Contrato das 2 ferramentas e decisão de transporte/identidade escritos. Zero código. |
| 2 | **Esqueleto conectado** | Servidor sobe em stdio, o cliente **descobre** uma ferramenta trivial e a chama. `stdout` limpo. |
| 3 | **Adaptador com identidade** | Chamada à camada de serviço como o usuário autenticado, atrás de uma interface — com adaptador de fixtures gêmeo. |
| 4 | **Primeira ferramenta ponta a ponta** | `listar_*` responde com **dado real** do ambiente de teste; ID conferido no produto. |
| 5 | **Segunda ferramenta encadeada** | `obter_*` a partir de um ID devolvido pela listagem — detalhe vem da ferramenta, nunca inferido do título. |
| 6 | **Casos-limite** | Os três erros distintos + limite de página + descrição extensa, cada um com teste. |
| 7 | **O que falta para produção** | Documento: escrita, transporte remoto, autenticação de cliente, auditoria, limites. **Não implementa.** |

A fatia 1 parece burocracia e é a que mais economiza: é onde "meus chamados" e "em aberto" deixam de ser suposição.

## Issue 1 — modelo preenchível

````markdown
## Issue 1 — Contrato das ferramentas e ADR de transporte
- **Labels:** mcp, contrato, doc
- **Depende de:** —
- **Estimativa:** S
### Contexto
FATO (fonte: `<arquivo:linha>`): a camada de serviço `<nome>` já expõe a leitura que queremos.
FATO (fonte: `<arquivo:linha>`): identidade vem de `<mecanismo>`.
LACUNA: "<termo do usuário>" não tem definição no código — precisa do time.
Esta issue fecha o contrato antes de qualquer código, porque mudar contrato depois de 3 ferramentas custa as 3.
### Critério de aceite
- [ ] Contrato das 2 ferramentas escrito: nome, entradas tipadas, saída, paginação
- [ ] Os três erros (vazio / inexistente / negado) definidos por ferramenta
- [ ] "<termo 1>" e "<termo 2>" definidos com os **estados reais** do produto
- [ ] ADR curto registrado: transporte, identidade, escopo, o que falta para produção
- [ ] Nenhum endpoint, campo ou estado inventado — toda afirmação com fonte
### Evidência exigida
O arquivo de contrato e o ADR no repositório, com os `arquivo:linha` citados.
### Fora de escopo
Qualquer linha de código de servidor.
````

## Labels sugeridas

`mcp` (todas) · `contrato` · `leitura` · `identidade` · `teste` · `doc` · `bloqueio` (quando destrava a prontidão).

## Estimativas

`S` ≤ meio dia · `M` ~1 dia · `L` > 1 dia. Fatia `L` provavelmente são duas fatias — divida.

## Quando o veredito é NÃO PRONTO

O plano muda de forma: as issues são de **destravamento**, com o bloqueio mais barato primeiro, e **nenhuma** issue de servidor MCP entra antes de o bloqueio fechar. Exemplo de título: `Issue 1 — Autorização por dono do recurso em <rota>` com label `bloqueio`. A issue 7 passa a ser "reavaliar prontidão", não "o que falta para produção".
