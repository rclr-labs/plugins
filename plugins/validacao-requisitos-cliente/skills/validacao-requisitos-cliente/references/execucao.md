# REFERENCE.md — Execução detalhada

Complementa [SKILL.md](../SKILL.md). Aqui está o **como**; os formatos de saída estão em [TEMPLATES.md](formato-entrega.md).

---

## 0. Abertura de um caso

1. **Identifique a fase.** Existe `00_entrada/transcricao*` → `avaliar`. Existe `00_entrada/documento-participante*` → `qualificar`. Existe `00_entrada/chamado*` → `preparar`. Ambíguo → pergunte.
2. **Nomeie o caso.** `validacao-clientes/<AAAA-MM-DD>-<slug>/` — slug curto do chamado (ex.: `2026-10-14-relatorio-sla-contrato`). Crie a raiz e `00_entrada/` se não existirem.
3. **Inventarie as entradas** com uma linha cada: o que veio, o que falta, o que está ilegível. Registre isso no topo do artefato da fase (bloco "Entradas consideradas").
4. **Contrato da checklist:**
   - Sem `00_entrada/checklist*`: a embutida ([CHECKLIST_ENTREVISTA.md](checklist-entrevista.md)) é a **fonte de verdade**.
   - Com a do time: ela é a **fonte de verdade** e a embutida vira **complemento**.
   - **Nunca some as duas.** Matrizes e denominadores separados ("checklist do time: 6/8 · complemento embutido: 5/45").
   - Checklist do time **sem marcadores** `[E]/[I]/[T]`: todos os itens contam como `[E]`; registre essa decisão no relatório.
   - **Contagem publicada:** o marcador do próprio item vence o do bloco (um `[T]` dentro de bloco `[E]` conta como `[T]`), e os totais por marcador saem no relatório de cobertura.
5. **Nunca edite** nada em `00_entrada/` — é a prova do que o cliente e o time falaram.
6. **Entradas, formatos, nomes de arquivo e dados sensíveis:** ver [ENTRADAS.md](entradas.md). Sem transcrição, `avaliar` para; sem documento do participante, `qualificar` para; sem documentação, marque "não verificado".

---

## 1. Fase `preparar` — dossiê pré-reunião

Objetivo: o participante entra na reunião sabendo **o que já sabemos, o que não sabemos, o que pode quebrar e o que perguntar**, sem depender do líder ao lado.

**1.1 Normalizar o chamado.** Extraia: quem pediu (nome/área/papel), data, canal, sistema/módulo citado, pedido literal (uma frase, entre aspas quando possível), prazo declarado e a urgência real (frequentemente diferente), pessoas envolvidas.

**1.2 Mapa de contexto (máx. 1 página).** Da documentação: o que o sistema faz no trecho afetado, entidades e estados envolvidos, integrações que tocam o fluxo, regras de negócio documentadas, limitações conhecidas e dívidas técnicas. **Cada linha com a fonte** (arquivo + seção). O que você não achou entra como lacuna, não como "provavelmente não existe".

**1.3 Decompor o pedido.** Sempre as cinco camadas:

| Camada | Pergunta que responde |
|---|---|
| Pedido explícito | O que o cliente escreveu, literalmente |
| Necessidade real | Que dor/objetivo de negócio está por trás |
| Desejo / solução imaginada | Como o cliente acha que deve ser feito (e por quê) |
| Critério de sucesso | Como o cliente vai dizer "funcionou" |
| Restrições | Prazo, orçamento, contrato, tecnologia, regulação, outros times |

Se "necessidade real" e "solução imaginada" apontarem para lugares diferentes, **isso é o achado mais importante do dossiê** — destaque.

**1.4 Classificar cada afirmação.**

| Rótulo | Uso | Exigência |
|---|---|---|
| `FATO` | Está na documentação ou no chamado | Citar fonte |
| `INFERÊNCIA` | Conclusão razoável sua | Dizer em que se baseia e o que a confirmaria |
| `LACUNA` | Informação que não existe em lugar nenhum | Virar pergunta P1/P2 |
| `CONFLITO` | Duas fontes dizem coisas diferentes | Citar as duas e virar pergunta P1 |
| `DÚVIDA` | Ambiguidade de interpretação | Virar pergunta com as duas leituras |

**1.5 Varredura de efeitos colaterais (obrigatória e auditável).** Percorra **os 14 eixos** da seção 6, um a um, e registre no dossiê o bloco "Varredura": `ATINGIDO` (com o que muda · quem sente · como detectaríamos tarde · pergunta de confirmação · gravidade) ou `NÃO ATINGIDO` (uma linha). **Os 14 eixos aparecem sempre** — é isso que prova que a varredura foi feita, e não improvisada. Gravidade: **alta** (retrabalho, perda de dado, quebra de contrato/lei ou cobrança) · **média** (retrabalho localizado ou ruído operacional) · **baixa** (cosmético). Efeito colateral **sem pergunta de confirmação não está mapeado** — é comentário: gere a pergunta.

**1.6 Derivar as perguntas.** Uma pergunta por lacuna/conflito/dúvida relevante + as perguntas da checklist. Prioridade:

- **P1 — bloqueante:** sem resposta o requisito não existe (ex.: qual o dado de origem, quem aprova, o que fazer no caso-limite crítico).
- **P2 — importante:** muda esforço/arquitetura, mas há caminho alternativo.
- **P3 — desejável:** melhora qualidade, pode ficar para depois.

Cada pergunta: **texto na voz do participante · por que perguntamos · o que é uma resposta boa · o que fazer se vier resposta vaga**. Ordene por P1 primeiro — a reunião sempre acaba antes do fim da lista.

**1.7 Escrever o dossiê** no Template 1. O resumo executivo (1 página) precisa responder, em bullets: qual é a dor, qual é o pedido real vs. o imaginado, os 3 maiores riscos/efeitos colaterais, **as perguntas que decidem a reunião** (as P1 de maior gravidade; se houver menos de 5, liste todas) e o que NÃO pode sair da reunião sem resposta.

---

## 2. Fase `esqueleto` — documento a preencher na reunião

Gere o Template 2 com `❓ TBD` em tudo que depende do cliente. Regras:

1. Pré-preencha com fatos documentados e marque a fonte; nunca deixe o participante achar que fato é requisito validado.
2. Todo requisito nasce com **critério de aceite** e **rastreabilidade** (chamado/item de origem). Sem critério de aceite → `❓ TBD (não fechar sem critério)`.
3. Mantenha seções explícitas para **não-escopo**, **premissas**, **questões em aberto** e **decisões tomadas em reunião** (com data e quem decidiu).
4. No fim do arquivo, inclua o bloco **"Antes de sair da reunião"**: os itens que, se ficarem em branco, obrigam uma segunda reunião.
5. Entregue ao participante o esqueleto e o dossiê — **nunca** a rubrica de qualificação (fase 4) nem o documento ideal (fase 5).

---

## 3. Fase `avaliar` — cobertura da reunião

Objetivo: medir, com evidência, **o que a reunião cobriu dos pontos que definimos e do checklist**.

1. **Segmentar** a transcrição por falante e tema, com marcação `[hh:mm]` quando existir.
2. **Matriz de cobertura** (Template 3): cada item do dossiê e cada item de **cada** checklist recebe um dos cinco status:

| Status | Critério objetivo |
|---|---|
| `Coberto` | Pergunta feita **e** resposta suficiente para escrever o requisito |
| `Parcial` | Perguntou, mas a resposta não permite escrever o requisito (vaga, incompleta, sem dono) |
| `Não coberto` | Não foi perguntado, ou foi mencionado sem resposta |
| `Emergente` | Apareceu sem estar no plano (registre — é ganho da reunião) |
| `Não verificável` | A pergunta foi feita, mas a transcrição está ilegível ou truncada naquele ponto |

3. **Evidência obrigatória:** trecho citado (com timestamp). **Sem trecho, a classificação é `Não coberto`** — nunca "provavelmente coberto". `Não verificável` **não** é atalho para "sem evidência": use só quando a transcrição falha.
4. **Denominadores publicados:** o placar informa o total de itens de **cada** checklist, o total por marcador (`[E]/[I]/[T]`) e o recorte dos P1 do dossiê. Contagem que não possa ser reproduzida a partir das matrizes não entra no placar. **Checklists diferentes têm placares separados** — nunca some a do time com o complemento embutido.
5. **Qualidade da pergunta**, além da cobertura: induzida (sugere a resposta), fechada demais (sim/não sem explorar), empilhada (3 perguntas numa), de solução (pulou o problema). Liste as 3 melhores e as 3 a refazer.
6. **Sinais de risco** a marcar quando aparecerem: contradição entre falas; decisão tomada sem base; promessa de prazo/escopo por alguém do time; escopo crescendo sem dono; "sempre foi assim"; culpa em outro time; ausência do decisor; tema sensível evitado; pergunta feita e nunca respondida.
7. **Percentual de cobertura** por bloco de cada checklist e para o conjunto dos pontos P1 do dossiê (P1 é o número que importa: 100% dos P1 é o mínimo aceitável).
8. **Top lacunas** com impacto: o que acontece se essa lacuna chegar até o desenvolvimento (retrabalho, dado errado, contrato, cobrança).
9. **Feedback de condução** (separado da nota da fase 4): o que o participante fez bem, o que perdeu, o que faria diferente. Fale de comportamento observável na transcrição, com o trecho.

---

## 4. Fase `qualificar` — nota e feedback do documento

1. Aplique [RUBRICA_QUALIFICACAO.md](rubrica-qualificacao.md): nota 0–5 por critério, **nota global 0–100**, faixa.
2. Cada nota cita o trecho do documento que a justifica (ou a ausência dele).
3. Cruze com a fase 3: lacuna de cobertura que virou requisito vago no documento é agravante; pergunta não feita na reunião **e** não sinalizada como aberta no documento é falha dupla — o participante não precisa saber tudo, mas precisa saber o que não sabe.
4. Gere **dois artefatos separados** e nunca os misture:
   - `04_qualificacao_documento.md` (**interno**, Template 4): notas, evidências, travas, plano, checklist de "pronto".
   - `05_feedback_participante.md` (**seguro de compartilhar**, Template 5): só o que o participante pode ler.
5. Feedback estruturado, sempre nesta ordem: **o que está bom → o que está ruim → o que faltou → o que não foi explorado → plano de desenvolvimento**.
6. Separe as lacunas em dois tipos e trate diferente:

| Tipo | Exemplo | Como tratar |
|---|---|---|
| **Lacuna de método** | Não escreveu critério de aceite; juntou três assuntos num requisito | Ensine o método e mostre como fazer na próxima — pode ser direto |
| **Lacuna de conteúdo** | Falta saber o volume real de chamados do contrato X | **Não entregue a resposta.** Aponte a pergunta, o dono e o prazo — a resposta vem do cliente, não de você |

7. **Regra de ouro do feedback:** o feedback fecha o buraco **metodológico** e devolve o buraco **de conteúdo** como pergunta endereçada. Nunca entregue o texto que o participante deveria ter escrito a partir do documento ideal, e nunca cite o Apêndice A do ideal.

---

## 5. Fase `ideal` — documento ideal (interno, ⛔)

1. Escreva o Template 6 com o padrão sênior: todo requisito com critério de aceite testável, casos-limite e exceções explícitas, efeitos colaterais com mitigação, não-funcionais com número, perguntas abertas **com proposta de resposta** e dono, rastreabilidade completa, log de decisões e premissas.
2. Salve **somente** em `_interno/06_documento_ideal.md`, com o cabeçalho de confidencialidade. O ideal não fica no mesmo arquivo — nem na mesma pasta compartilhada — que o participante recebe: se a pasta do caso for compartilhada, mova `_interno/` para fora dela antes de gerar.
3. **Re-varra os 14 eixos** para tudo que emergiu na reunião: o ideal cobre o que a reunião revelou, não só o que o dossiê previa.
4. Inclua **"Diferenças-chave vs. documento do participante"** (calibração interna) e **"Perguntas que ainda dependem do cliente"**.
5. **Antes de escrever qualquer mensagem sobre a fase 5, releia a regra 1 de [SKILL.md](../SKILL.md).** O Apêndice A serve para o líder decidir **o que cobrar** — nunca é citado, copiado ou transformado em resposta pronta para o participante.

---

## 6. Catálogo de efeitos colaterais (varredura da fase 1)

Percorra **os 14 eixos, sempre**, e registre cada um no bloco "Varredura" do dossiê e do relatório de cobertura: `ATINGIDO` (com gravidade e pergunta) ou `NÃO ATINGIDO`. Eixo não registrado = varredura não feita.

| # | Eixo | O que perguntar |
|---|---|---|
| 1 | **Dados** | Campo/entidade novo? Migração, histórico, registros antigos nulos, unicidade, integridade, retenção, backup/restore |
| 2 | **Fluxos existentes** | Quem mais passa por esse caminho? Estados, ordem das etapas, automações, jobs, notificações |
| 3 | **Integrações** | API/payload muda? Versão, limite de taxa, idempotência, retry, fila, contrato com terceiro |
| 4 | **Permissões** | Papel novo? Quem passa a ver o quê? Segregação, auditoria, acesso indevido por objeto |
| 5 | **Relatórios/indicadores** | Algum número muda de significado? Relatório contratual, BI, exportação, fechamento |
| 6 | **Outros clientes/contratos** | É só deste cliente ou vai para a base? Multi-tenant, customização vs. produto, SLA |
| 7 | **Privacidade/regulação** | LGPD, dado pessoal/sensível, consentimento, retenção, transferência, trilha de auditoria |
| 8 | **Retrocompatibilidade** | Cliente antigo, deep link, cache, integração de terceiro, versão publicada |
| 9 | **Operação/suporte** | Quem opera, treinamento, runbook, monitoramento, rollback, feature flag, plantão |
| 10 | **Volume/performance/custo** | Pico, latência, armazenamento, consulta pesada, custo de infra/licença |
| 11 | **Experiência** | Idioma, fuso, formato, mobile, acessibilidade, mensagem de erro, dado vazio |
| 12 | **Segurança** | Superfície nova, upload, entrada de usuário, injeção, autorização por objeto |
| 13 | **Comercial/faturamento** | Cobrança, medição, contrato, promessa feita em reunião, expectativa de prazo |
| 14 | **Manutenção** | Quem entende depois? Documentação, débito técnico, dependência de fornecedor |

---

## 7. Derivação de pergunta (exemplos de referência)

| Origem | Exemplo de lacuna | Pergunta-âncora | P |
|---|---|---|---|
| LACUNA | Não se sabe o volume | "Quantos registros por dia no pico, e qual o pior dia do ano?" | P1 |
| CONFLITO | Doc diz 1 SLA por contrato; chamado diz 1 por serviço | "O relatório deve agrupar por contrato ou por serviço? Os dois já existem?" | P1 |
| DÚVIDA | "Aprovação" pode ser automática | "A aprovação é humana ou automática? Quem pode reprovar e o que acontece depois?" | P1 |
| DESEJO | Cliente pediu tela nova | "Qual decisão você toma nessa tela que hoje não consegue tomar?" | P1 |
| EFEITO COLATERAL | Relatório contratual pode mudar de número | "Esse número aparece em algum relatório enviado ao cliente ou usado em cobrança?" | P1 |
| LACUNA | Caso-limite não citado | "E quando o contrato não tem SLA cadastrado?" | P2 |
| RESTRIÇÃO | Prazo declarado sem base | "O que acontece se ficar pronto 2 semanas depois?" | P2 |

---

## 8. Regras de condução do feedback (coaching sem criar dependência)

- Explique **o critério**, não só o erro: "isto falhou no critério *testabilidade* porque…".
- Cite sempre o trecho do documento/transcrição — feedback sem evidência vira opinião.
- Máximo de **3 prioridades** por rodada; lista longa não muda comportamento.
- Termine com **um compromisso observável**: "na próxima reunião, todo requisito sai com critério de aceite e uma pergunta de caso-limite".
- Nunca compare participantes entre si; compare com o critério e com o histórico da própria pessoa (notas anteriores do mesmo participante, se houver).
- **Não** diga "o ideal seria…" e **não** cole o documento ideal: isso transfere a resposta e recria a dependência dos líderes que o programa quer eliminar.
