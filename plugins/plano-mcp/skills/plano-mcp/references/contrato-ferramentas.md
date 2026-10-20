# Contrato das ferramentas

Carregue ao escrever o contrato ou quando houver dúvida sobre o que o MCP espera hoje.

## O que o servidor expõe

Três primitivas de **servidor**:

| Primitiva | O que é | Quem controla |
|---|---|---|
| **Tools** | Funções que o modelo pode invocar | Modelo |
| **Resources** | Dados de leitura usados como contexto | Aplicação |
| **Prompts** | Modelos de instrução prontos | Usuário |

Entradas são descritas em **JSON Schema** (`inputSchema`). Transporte: **stdio** (local) ou **Streamable HTTP** (remoto).

> **Estado da especificação — conferido em 20/10/2026.** A revisão corrente é **`2026-07-28`**. Mudanças que afetam um servidor novo:
> - **`sampling` está depreciado.** Servidor que precisa de completion deve integrar direto com a API do provedor.
> - **`logging` está depreciado.** Log vai para **`stderr`** (stdio) ou OpenTelemetry. Em stdio, **`stdout` pertence ao protocolo** — escrever log ali quebra a conexão. Essa regra ficou mais importante, não menos.
> - Primitiva de **cliente** hoje é **`elicitation`** (servidor pede informação ao usuário).
> - O protocolo é **stateless**: cada requisição carrega versão e capabilities no `_meta`; o servidor **deve** implementar `server/discover`.
> - Notificações de mudança são **opt-in**, via `subscriptions/listen`.
>
> Confirme contra a documentação da **versão do SDK instalada** antes de escrever código. Se o SDK do repo for anterior, o contrato do plano continua válido — o que muda é a forma da ligação.

## Forma do contrato (uma por ferramenta)

```
### Ferramenta: listar_chamados
- **O que faz:** lista os chamados do usuário autenticado, com filtro de estado
- **Camada reutilizada:** FATO (fonte: src/services/tickets.ts:34 — TicketService.list)
- **Identidade:** do token; `usuario` NÃO é entrada
- **Entradas:**
  | nome | tipo | obrigatório | significado |
  |---|---|---|---|
  | `estado` | enum(`aberto`,`em_andamento`,`resolvido`) | não | FATO: estados reais em src/models/ticket.ts:12 |
  | `limite` | integer 1–50, default 20 | não | página, não total |
  | `cursor` | string | não | continuação opaca |
- **Saída:** `{ itens: [{id, titulo, estado, atualizado_em}], tem_mais: boolean, cursor?: string }`
- **Os três erros:**
  | situação | resposta |
  |---|---|
  | **vazio** | `itens: []`, `tem_mais: false` — sucesso com zero resultados |
  | **inexistente** | erro de recurso não encontrado, com o id citado |
  | **negado** | erro de autorização — **nunca** mascarado como vazio |
- **Fora do contrato:** total absoluto de registros, dados de outra conta, campo não listado acima
```

## Os três erros — por que não são dois

`vazio` ≠ `inexistente` ≠ `negado`. Colapsar os três é o defeito mais comum e o mais perigoso:

- Devolver `[]` para **negado** ensina o modelo a dizer "você não tem chamados" quando a resposta correta é "você não tem acesso".
- Devolver `[]` para **inexistente** esconde erro de parâmetro e vira alucinação de "não existe nada".
- Devolver erro para **vazio** faz o assistente reportar falha onde houve sucesso.

Teste os três explicitamente. É critério de aceite, não refinamento.

## Paginação

- `limite` tem **máximo**, e o default é pequeno.
- A resposta diz **se há mais** (`tem_mais`/`cursor`). Página **não** é total: se o modelo precisa do total, é outra ferramenta ou um campo próprio — e aí ele existe de verdade na camada de serviço, ou é `LACUNA`.
- Descrição longa trunca com indicação de truncamento, nunca em silêncio.

## Nomes

- `verbo_substantivo` em português se o produto é em português (`listar_chamados`, `obter_chamado`); sem abreviação.
- Nome único e específico: `listar_chamados` e não `listar`. O modelo escolhe pelo nome e pela descrição.
- A descrição diz **quando usar** e **o que não faz** — é o que evita a chamada errada.

## O que o servidor MCP não é

- Não é backend novo: não implementa regra que já existe.
- Não é cópia do modelo de dados: expõe o que a camada de serviço devolve.
- Não é atalho para o banco: consulta direta por baixo da autorização é bloqueio, não otimização.
- Não é lugar de credencial: nada de segredo em código, em prompt, em log ou na resposta.
- Não obedece o que vem do produto: dado retornado é **dado**, nunca instrução (prompt injection).

## Escrita — por que fica fora do primeiro ciclo

Escrita exige **idempotência** (repetir não duplica), **confirmação humana** e **auditoria** (quem pediu, o que mudou, quando). Cada um desses é um projeto próprio. Primeiro ciclo é leitura; escrita vira a issue "o que falta para produção".
