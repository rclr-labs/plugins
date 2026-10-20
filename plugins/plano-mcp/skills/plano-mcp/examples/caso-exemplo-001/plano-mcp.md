# Plano MCP — ACME

> ⚠️ EXEMPLO SINTÉTICO. `ACME` é o sistema fictício usado nos exemplos da casa.

> Veredito: PRONTO COM RESSALVAS (10/12) · escopo do ciclo: leitura, stdio, 2 ferramentas
> Prontidão e lacunas em `01_prontidao.md`. Ferramentas: `listar_atendimentos`, `obter_atendimento`.

## Issue 1 — Contrato das ferramentas e ADR de transporte
- **Labels:** mcp, contrato, doc
- **Depende de:** —
- **Estimativa:** S
### Contexto
FATO (fonte: `src/services/atendimentos.ts:51`): `AtendimentoService` já aplica autorização e é chamável sem passar pelo controller — é a camada que o adaptador vai reutilizar.
FATO (fonte: `src/middleware/auth.ts:14`): identidade vem de JWT; `req.user` é a fonte do usuário.
LACUNA: "meus atendimentos" e "em aberto" não têm definição no código. Sem fechá-las, a ferramenta devolve a lista errada com cara de certa.
Fechar o contrato antes do código porque mudar contrato depois de duas ferramentas custa as duas.
### Critério de aceite
- [ ] Contrato de `listar_atendimentos` e `obter_atendimento` escrito: nome, entradas tipadas, saída, paginação
- [ ] Os três erros (vazio / inexistente / negado) definidos por ferramenta
- [ ] "meus" e "em aberto" definidos com os estados reais de `src/models/atendimento.ts`
- [ ] `usuario` **não** aparece como entrada de nenhuma ferramenta
- [ ] ADR curto registrado: stdio, identidade por token, escopo de leitura, o que falta para produção
### Evidência exigida
Arquivo de contrato e ADR no repositório, com os `arquivo:linha` citados e as duas definições de domínio confirmadas por Produto.
### Fora de escopo
Qualquer linha de código de servidor.

## Issue 2 — Esqueleto do servidor conectado ao cliente
- **Labels:** mcp, leitura
- **Depende de:** 1
- **Estimativa:** S
### Contexto
Antes de integrar com o ACME, provar que o canal funciona: servidor sobe em stdio e o cliente MCP **descobre** e chama uma ferramenta trivial. Isso separa falha de protocolo de falha de integração — sem esta fatia, as duas se confundem pelo resto do plano.
FATO: stack é Node (`package.json`), então o SDK TypeScript é o caminho natural.
### Critério de aceite
- [ ] Servidor sobe em transporte stdio sem erro
- [ ] O cliente MCP lista a ferramenta trivial (ela aparece na descoberta)
- [ ] A ferramenta trivial responde a uma chamada real do cliente
- [ ] `stdout` carrega **apenas** o protocolo; todo log vai para `stderr`
- [ ] Versão do SDK fixada e registrada no ADR
### Evidência exigida
Saída do cliente MCP mostrando a ferramenta na listagem e a resposta da chamada; trecho do log em `stderr`.

## Issue 3 — Adaptador da camada de serviço com identidade do token
- **Labels:** mcp, identidade
- **Depende de:** 2
- **Estimativa:** M
### Contexto
FATO (fonte: `src/services/atendimentos.ts:33`): o isolamento por `contrato_id` já é aplicado no serviço — o adaptador precisa chamar por esse caminho, nunca pelo repositório direto.
A ressalva do eixo 5 (homologação sem ID conferível) se resolve aqui: um adaptador de fixtures **atrás da mesma interface** do adaptador HTTP mantém as fatias 4 e 5 testáveis, com a verificação contra a API real declarada como pendente.
### Critério de aceite
- [ ] Interface única com duas implementações: HTTP real e fixtures
- [ ] A identidade é propagada do token em toda chamada; nenhuma chamada usa credencial de serviço compartilhada
- [ ] Nenhum acesso a `src/repositories/` contornando `AtendimentoService`
- [ ] Nenhuma credencial em código, repositório ou log
- [ ] Teste do adaptador de fixtures passando em `npm run test`
### Evidência exigida
`npm run test` verde e o diff mostrando que a única porta de entrada do dado é a camada de serviço.
### Risco
Se o token de homologação não existir ainda, o adaptador HTTP fica sem verificação real — declarar como pendente, **nunca** simular sucesso.

## Issue 4 — `listar_atendimentos` ponta a ponta
- **Labels:** mcp, leitura
- **Depende de:** 3
- **Estimativa:** M
### Contexto
A primeira fatia que entrega valor visível: o assistente pergunta, a ferramenta chama o ACME, o dado volta e é conferível. Vale mais que o resto do plano junto.
### Critério de aceite
- [ ] A ferramenta é descoberta pelo cliente MCP e responde com dado real do ambiente de teste
- [ ] `limite` tem máximo e default pequeno; a resposta informa se há mais resultados
- [ ] Página **não** é apresentada como total
- [ ] Vazio, inexistente e negado produzem três respostas distintas
- [ ] Falha da API é comunicada como falha, nunca como lista vazia
### Evidência exigida
A chamada MCP registrada e **o ID devolvido conferido na interface do ACME**. Resposta escrita pelo modelo sem chamada de ferramenta não conta.

## Issue 5 — `obter_atendimento` encadeada
- **Labels:** mcp, leitura
- **Depende de:** 4
- **Estimativa:** S
### Contexto
O encadeamento é o que prova que o assistente está usando o produto e não a própria memória da conversa: o detalhe vem da segunda ferramenta, a partir de um ID devolvido pela primeira.
### Critério de aceite
- [ ] `obter_atendimento` aceita um ID vindo de `listar_atendimentos` e devolve o detalhe
- [ ] O detalhe vem da ferramenta — nenhum campo é inferido do título da listagem
- [ ] ID inexistente e ID de outra conta produzem erros **diferentes**
- [ ] Descrição extensa é truncada com indicação explícita de truncamento
### Evidência exigida
Transcrição da conversa mostrando as duas chamadas em sequência, com o ID igual nas duas e conferido no produto.

## Issue 6 — Casos-limite e revisão adversarial
- **Labels:** mcp, teste
- **Depende de:** 5
- **Estimativa:** M
### Contexto
Revisor diferente de quem implementou, rodando os casos que a implementação tende a não imaginar. O que for achado por conhecimento do produto (e não por teste) indica teste faltando.
### Critério de aceite
- [ ] Executados: nenhum resultado · ID inválido · ID de outra conta · mais registros que o limite · descrição extensa · API fora do ar
- [ ] Cada caso tem teste automatizado ou justificativa escrita de por que não é automatizável
- [ ] Conteúdo vindo do ACME é tratado como dado: texto de atendimento que pareça instrução não altera o comportamento da ferramenta
- [ ] Nenhum caso "aprovado de longe" sem execução
### Evidência exigida
Saída dos testes e o registro, por caso, do que foi achado **por teste** × **por conhecimento do produto**.

## Issue 7 — O que falta para produção
- **Labels:** mcp, doc
- **Depende de:** 6
- **Estimativa:** S
### Contexto
Fechar o ciclo dizendo com precisão o que **não** está pronto, para que ninguém promova um protótipo de leitura em stdio a integração de produção por otimismo.
### Critério de aceite
- [ ] Documento lista: escrita (idempotência, confirmação, auditoria), transporte remoto, autenticação de cliente externo, limites de taxa e observabilidade
- [ ] As ressalvas dos eixos 5 e 6 da prontidão aparecem resolvidas ou reafirmadas como pendentes
- [ ] Gatilho de reavaliação definido, com dono nomeado (pessoa, não "o time")
### Evidência exigida
Documento no repositório, referenciado no ADR da Issue 1.
### Fora de escopo
Implementar escrita ou publicar o servidor remotamente.
