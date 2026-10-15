# CHECKLIST_ENTREVISTA.md — Roteiro de validação com o cliente

Checklist de referência para a reunião de validação, destilada da prática do time sênior. **Se o time tiver a própria checklist** (`00_entrada/checklist*`), ela substitui esta como fonte de verdade — use esta apenas como complemento.

**Marcadores:** `[E]` essencial (não saia sem) · `[I]` importante · `[T]` se houver tempo. *A marca do bloco vale para todos os itens; um item pode ter marca própria — `[T]` — e sai do mínimo viável.*
**Como ler as colunas:** *Resposta boa* = o que precisa existir para o requisito ser escrevível. *Sinal de alerta* = o que fazer quando a resposta vier assim.
**Mínimo viável (30 min):** só os `[E]`. **Reunião de 60–90 min:** `[E]` + `[I]`.

---

## Regras de condução

1. **Problema antes de solução.** Nunca aceite a solução pedida sem entender a dor que ela resolve.
2. **Peça exemplo concreto** com dado real (número, data, nome de contrato) — "em geral" não vira requisito.
3. **Separe fato de opinião**: "isso acontece hoje?" ≠ "você acha que aconteceria?".
4. **Não prometa prazo, preço nem escopo** — nem "isso é rápido", nem "dá pra fazer".
5. **Não induza:** pergunte aberto e só feche depois ("o que mais?"). Evite "não é mesmo?".
6. **Uma pergunta por vez.** Empilhar três perguntas garante que só a última será respondida.
7. **Registre a frase literal** das decisões e dos números; parafrasear perde a nuance.
8. **Confirme o entendimento de volta** ao fim de cada bloco: "então hoje o processo é X, e o problema é Y — correto?".
9. **Nomeie o dono e o prazo** de cada resposta que ficar pendente.
10. **Silêncio é ferramenta:** depois de uma resposta vaga, espere — o cliente completa.

---

## A. Abertura e contexto `[E]`

| # | Pergunta-âncora | Resposta boa | Sinal de alerta |
|---|---|---|---|
| A1 | Qual é o objetivo desta reunião, na sua visão? | Objetivo de negócio declarado, não a solução | Fala só de tela/funcionalidade |
| A2 | Quem decide se isso está aprovado? Quem mais precisa concordar? | Nome + papel, e se o decisor está presente | "Acho que o pessoal de cima" |
| A3 | O que motivou o chamado agora? Aconteceu algo? | Evento concreto (auditoria, reclamação, cliente novo) | "Já era para ter sido feito" |
| A4 | Qual o prazo e o que acontece se passar? | Prazo com consequência real | Prazo sem consequência = provavelmente negociável |

## B. Problema e dor `[E]`

| # | Pergunta-âncora | Resposta boa | Sinal de alerta |
|---|---|---|---|
| B1 | Como esse processo funciona hoje, passo a passo? | Sequência com quem executa cada passo | Pula direto para "o sistema devia…" |
| B2 | Onde exatamente dói? Me mostra um caso real que deu errado. | Caso concreto com data e impacto | Dor descrita em abstrato |
| B3 | Com que frequência acontece e quantas pessoas sofrem? | Número ou ordem de grandeza | "Toda hora" sem número |
| B4 | Qual o custo de não fazer nada? | Perda de receita, multa, retrabalho, risco | "Ninguém aguenta mais" |
| B5 | Existe contorno/manual que vocês usam hoje? | Planilha, processo paralelo, gambiarra nomeada | Contorno escondido = risco de requisito incompleto |

## C. Pedido, desejo e alternativas `[E]`

| # | Pergunta-âncora | Resposta boa | Sinal de alerta |
|---|---|---|---|
| C1 | O que exatamente você quer que o sistema faça? | Pedido em uma frase, com verbo e resultado | Lista de funcionalidades sem objetivo |
| C2 | Por que dessa forma? Já tentaram outra? | Justificativa + alternativa descartada e motivo | "Sempre fizemos assim" |
| C3 | Se resolvêssemos a dor de outro jeito, serviria? | Abertura para alternativas | Solução travada sem justificativa |
| C4 | Quem já tentou resolver isso antes? O que aconteceu? | Histórico conhecido | Silêncio = pode haver histórico ruim no time |

## D. Fluxo futuro desejado `[E]`

| # | Pergunta-âncora | Resposta boa | Sinal de alerta |
|---|---|---|---|
| D1 | Depois de pronto, como será o processo passo a passo? | Novo fluxo com atores e gatilhos | "Igual ao de hoje, só que funcionando" |
| D2 | O que dispara o processo e o que encerra? | Estado inicial e estado final claros | Não sabe dizer quando termina |
| D3 | Quem faz o quê na nova versão? | Papéis nomeados | "O sistema faz" (sistema não decide nada sozinho) |
| D4 | Precisa conviver com o processo atual por um tempo? | Período de transição declarado | Migração "do dia para a noite" — risco alto |
| D5 [T] | O que muda para quem só olha (gestão, auditoria, cliente final)? | Impacto nos observadores | Ninguém pensou nos observadores |

## E. Dados e regras de negócio `[E]`

| # | Pergunta-âncora | Resposta boa | Sinal de alerta |
|---|---|---|---|
| E1 | De onde vem cada dado necessário? | Sistema/origem por campo | "Do sistema" sem dizer qual |
| E2 | Quantos registros hoje e por mês? | Número aproximado com base | Número muito baixo com impacto alto (sinal de subestimação) |
| E3 | Quais regras decidem o resultado? (cálculo, prazo, alçada, prioridade) | Regra explícita e exceções | Regra "no feeling" |
| E4 | Que dado pessoal ou sensível está envolvido? | Sim/não com classificação | "Não sei se é dado pessoal" |
| E5 | O que acontece com o histórico já existente? | Decisão: converter, manter, ignorar | Ninguém pensou no histórico |

## F. Integrações e dependências `[I]`

| # | Pergunta-âncora | Resposta boa | Sinal de alerta |
|---|---|---|---|
| F1 | Outros sistemas enviam/recebem esse dado? | Lista de sistemas e sentido do fluxo | "Acho que só o nosso" |
| F2 | Depende de alguém de fora do time? (fornecedor, outro time, TI do cliente) | Dono externo nomeado | Dependência descoberta no meio do desenvolvimento |
| F3 | Existe API/contrato vigente que não pode mudar? | Contrato e versão citados | Não sabe se algo consome |
| F4 | Existe integração manual hoje (e-mail, planilha, importação)? | Processo nomeado | "O pessoal manda por e-mail" (vira requisito esquecido) |

## G. Exceções e casos-limite `[E]`

| # | Pergunta-âncora | Resposta boa | Sinal de alerta |
|---|---|---|---|
| G1 | O que acontece quando o dado não existe ou está incompleto? | Comportamento definido | "Isso não acontece" (quase sempre acontece) |
| G2 | E quando vem duplicado, fora de ordem ou atrasado? | Regra de desempate/idempotência | Silêncio |
| G3 | E quando o cliente não tem o cadastro/contrato/parâmetro? | Regra de exceção | "Aí não dá para fazer nada" avulso |
| G4 | E quando dá erro no meio? Quem é avisado e o que pode repetir? | Fluxo de erro e retomada | "Só não pode dar erro" |
| G5 | Quem não pode ver esse dado? | Restrição de visibilidade explícita | Ninguém pensou em permissão |

## H. Impacto e efeitos colaterais `[E]`

| # | Pergunta-âncora | Resposta boa | Sinal de alerta |
|---|---|---|---|
| H1 | Quem mais usa esse fluxo, dado ou tela hoje? | Lista de áreas/perfis/outros clientes | "Só eu" |
| H2 | Algum relatório, faturamento ou indicador muda por causa disso? | Sim/não com relatório nomeado | Não sabe / "acho que não" |
| H3 | Isso é só para vocês ou vai para todos os clientes? | Escopo de produto definido | Precisa de decisão em outra instância (ex.: produto) |
| H4 | Isso cria obrigação contratual ou de auditoria nova? | Contrato/SLA/auditoria citados | "Depois a gente vê" |
| H5 | O que quebra se isso for ao ar amanhã? | Lista de impactos | "Nada, é isolado" sem análise |

## I. Não-funcionais `[I]`

| # | Pergunta-âncora | Resposta boa | Sinal de alerta |
|---|---|---|---|
| I1 | Qual volume/velocidade é inaceitável? | Número ou limite percebido | "Tem que ser rápido" |
| I2 | Em que horário/fuso isso roda? Existe janela crítica? | Janela declarada | Virada de mês/fechamento descoberto depois |
| I3 [T] | Precisa funcionar em celular, outro idioma, outro formato? | Escopo declarado | Suposição de desktop único |
| I4 [T] | Quanto tempo o dado precisa ficar guardado? | Prazo de retenção | "Para sempre" sem motivo |

## J. Operação, suporte e reversão `[I]`

| # | Pergunta-âncora | Resposta boa | Sinal de alerta |
|---|---|---|---|
| J1 [T] | Quem opera isso no dia a dia e precisa de treinamento? | Papel nomeado | "Aprende usando" |
| J2 | Como saberemos que está funcionando mal, antes do cliente reclamar? | Alerta/monitoração definidos | Só descobre por reclamação |
| J3 | Como desligar/desfazer se der problema? | Plano de rollback ou feature flag | "Não precisa, vai dar certo" |
| J4 | Quem atende o suporte quando abrir chamado sobre isso? | Fluxo de suporte | Ninguém pensou no pós-go-live |

## K. Sucesso, aceite e medição `[E]`

| # | Pergunta-âncora | Resposta boa | Sinal de alerta |
|---|---|---|---|
| K1 | Como você vai dizer que isso deu certo? | Critério observável e mensurável | "Quando parar de me incomodar" |
| K2 | Que número deve mudar e em quanto? | Métrica + meta | Sem métrica |
| K3 | Quem valida a entrega e em quanto tempo? | Nome + prazo de validação | "Depois eu olho" |
| K4 | O que precisa estar funcionando no primeiro dia? | Recorte mínimo declarado | "Tudo, senão não serve" |

## L. Escopo, prioridade e mudança `[E]`

| # | Pergunta-âncora | Resposta boa | Sinal de alerta |
|---|---|---|---|
| L1 | Se só der para fazer metade, qual metade? | Prioridade declarada | "Tudo é prioridade" |
| L2 | O que está explicitamente fora do escopo? | Fora de escopo dito em voz alta | Nada fora = escopo infinito |
| L3 | Quem aprova mudança de escopo depois? | Nome + processo | "A gente combina" |
| L4 | Existe algo desejável que pode ficar para depois? | Lista de "fase 2" | Tudo essencial |

## M. Riscos, premissas e restrições `[I]`

| # | Pergunta-âncora | Resposta boa | Sinal de alerta |
|---|---|---|---|
| M1 | O que precisa ser verdade para isso dar certo? | Premissas declaradas | Premissa implícita |
| M2 | Qual o maior risco, na sua visão? | Risco nomeado | "Nenhum risco" |
| M3 | Existe restrição de tecnologia, fornecedor, orçamento ou regulação? | Restrição explícita | Descoberta no meio |
| M4 [T] | Depende de decisão de alguém que não está aqui? | Dependência nomeada | Surpresa no fim |

## N. Encerramento e próximos passos `[E]`

| # | Pergunta-âncora | Resposta boa | Sinal de alerta |
|---|---|---|---|
| N1 | O que ficou em aberto e quem responde o quê? | Lista com dono por item | "Fica em aberto" sem dono |
| N2 | Até quando cada resposta pendente chega? | Prazo por item | "Assim que possível" |
| N3 | Posso recapitular o que entendi? | Confirmação explícita | Cliente corrige algo no resumo (bom sinal — capturou) |
| N4 | Quem mais precisa saber do que decidimos aqui? | Lista de interessados | Esquecer quem não estava |
| N5 | Qual a próxima data em que nos falamos? | Data marcada | Encerrar sem próximo passo |

---

## Bloco "antes de sair da reunião"

- [ ] Todos os `[E]` respondidos ou com dono e prazo nomeados
- [ ] Critério de sucesso (K1–K2) escrito
- [ ] Fora de escopo (L2) dito em voz alta
- [ ] Efeitos colaterais (H1–H3) varridos
- [ ] Casos-limite centrais (G1–G3) com comportamento definido
- [ ] Recapitulação (N3) confirmada pelo cliente
- [ ] Pendências com dono e data (N1–N2)
