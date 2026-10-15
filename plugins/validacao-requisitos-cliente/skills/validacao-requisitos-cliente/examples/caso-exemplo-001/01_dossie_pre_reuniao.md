# Dossiê pré-reunião — Cliente Exemplo Ltda. · chamado #4821

> ⚠️ EXEMPLO SINTÉTICO gerado pela fase `preparar` da skill — escrito **antes** da reunião (por isso não cita a transcrição).

**Reunião:** 2026-10-13 14:00 · **Participante:** Júlia · **Cliente presente:** Carlos Menezes (Gerente de Contratos), Sandra Prado (Analista de Contratos)
**Gerado em:** 2026-10-13 (manhã) · **Fonte da checklist:** do time — 8 itens, **sem marcadores** → todos tratados como `[E]` · fonte de verdade: `00_entrada/checklist-do-time.md` · complemento: `CHECKLIST_ENTREVISTA.md`

## Entradas consideradas
| Entrada | Onde está | Legibilidade | Observações |
|---|---|---|---|
| Chamado #4821 | 00_entrada/chamado.md | ok | pedido chega como solução pronta |
| Documentação do METEO | 00_entrada/documentacao-meteo.md | ok (trecho) | cobre contratos, SLA, RMC, exportação, perfis, operação |
| Checklist do time | 00_entrada/checklist-do-time.md | ok | 8 itens, sem marcadores → todos `[E]` |
| Planilha "SLA_outubro.xlsx" | não anexada ao caso | — | pedir antes da reunião |

## Resumo executivo

**A dor:** montar o relatório de SLA na mão consome ~2 dias/mês da gestão de contratos.
**Pedido literal:** "um relatório que mostre o SLA de cada contrato, com exportação para Excel e envio automático por e-mail toda segunda-feira".
**Pedido real × imaginado:** a necessidade declarada é *decidir quem está estourando o SLA*; a solução imaginada é *um relatório agendado* (INFERÊNCIA — validar). Se a decisão exige ação rápida, um e-mail semanal pode chegar tarde — e o painel que já existe sugere que o problema pode ser usabilidade, não ausência.
**As 5 perguntas que decidem a reunião** (P1 de maior gravidade): P1-3 (efeito contratual) · P1-2 (métrica/período) · P1-1 (escopo: 12k ou 400) · P1-7 (volume/limites) · P1-8 (por que o painel não é usado).
**Maiores riscos:** (1) o mesmo número alimenta o Relatório Mensal de Conformidade, com multa prevista em contrato; (2) o snapshot de SLA é diário e não há monitoramento do job; (3) a exportação/e-mail esbarra em limites (50k linhas, 20 MB) e em dado pessoal no campo livre `descricao`.
**Não pode sair da reunião sem resposta:** P1-3, P1-2, P1-1, P1-6.

## Mapa de contexto do sistema
| Item | O que sabemos | Fonte | Confiança |
|---|---|---|---|
| SLA por serviço | SLA é definido por **serviço**, com `JanelaAtendimento` própria | documentacao-meteo.md §Módulo Contratos | FATO |
| Snapshot diário | Job `calc_sla` às 03:00 grava `SlaSnapshot`; não há cálculo sob demanda | §Cálculo de SLA | FATO |
| Feriados | A janela considera dias úteis e **não considera feriados** (limitação conhecida) | §Cálculo de SLA | FATO |
| Contratos legados | Contratos anteriores a 2019 podem não ter `JanelaAtendimento` (~18% da base) e o cálculo é ignorado | §Módulo Contratos | FATO |
| Painel existente | "Painel SLA" existe desde 2021, filtra por contrato e período, **não exporta**, uso percebido como baixo | §Painel SLA | FATO |
| RMC | Relatório Mensal de Conformidade, gerado no dia 5, **enviado ao cliente**, consome `SlaSnapshot`; cláusula 7.2 prevê **multa** | §RMC | FATO |
| Exportação | CSV limitado a **50.000 linhas**; e-mail limita anexo a **20 MB** | §Exportação e e-mail | FATO |
| Permissões | `GestorContrato` vê só a própria carteira; um gerente pode ter várias carteiras | §Permissões | FATO |
| Dado pessoal | `EventoAtendimento.descricao` (campo livre) contém nome e CPF | §Dados e privacidade | FATO |
| Operação | Deploy mensal, terça 22h, sem feature flag no módulo; job sem monitoramento | §Operação | FATO |
| Uso real do painel | Não há telemetria — "ninguém usa" é percepção, não dado | — | LACUNA |

## Decomposição do pedido
| Camada | Conteúdo | Origem |
|---|---|---|
| Pedido explícito | Relatório de SLA por contrato + exportação Excel + envio automático semanal | chamado (texto literal) |
| Necessidade real | Reduzir 2 dias/mês de trabalho manual e **agir sobre quem está estourando** | chamado + INFERÊNCIA a validar |
| Desejo/imaginado | Relatório agendado por e-mail (formato decidido pelo cliente antes de validar o problema) | chamado |
| Critério de sucesso | Não precisar mais montar a planilha na mão | chamado — declarado, não mensurável |
| Restrições | "sair ainda este mês" (sem base declarada), aprovação da diretoria (não confirmada) | chamado / LACUNA |

## Fatos, inferências, lacunas, conflitos e dúvidas
| # | Afirmação | Rótulo | Fonte / base | Vira pergunta? |
|---|---|---|---|---|
| 1 | SLA é por serviço e depende de janela de atendimento | FATO | doc §Contratos | não |
| 2 | Existe painel de SLA desde 2021, sem exportação | FATO | doc §Painel SLA | P1-8 |
| 3 | O RMC usa o SLA e embasa multa contratual (cl. 7.2) | FATO | doc §RMC | P1-3 |
| 4 | Não há alerta se o `calc_sla` falhar | FATO | doc §Operação | P1-7 |
| 5 | ~18% dos contratos não têm janela cadastrada | FATO | doc §Contratos | P1-5 |
| 6 | O chamado diz que "só a gestão de contratos" usa; a doc mostra Compliance/RMC consumindo o número | CONFLITO | chamado × doc §RMC | P1-3 / P1-4 |
| 7 | "Exportação para Excel" — a doc só descreve CSV | DÚVIDA | doc §Exportação | P1-7 |
| 8 | Qual métrica e período ("SLA de cada contrato" não define) | LACUNA | — | P1-2 |
| 9 | Quem recebe o e-mail e com qual recorte de carteira | LACUNA | — | P1-6 |
| 10 | Se o relatório cobre a base inteira ou as 400 carteiras | LACUNA | — | P1-1 |
| 11 | Se feriado entra no cálculo do SLA | INFERÊNCIA (a doc diz que não) | doc §Cálculo | P2-5 |

## Varredura dos 14 eixos (obrigatória)
| # | Eixo | Status | Gravidade | Achado (o que muda · quem sente · como descobriríamos tarde) | Pergunta |
|---|---|---|---|---|---|
| 1 | Dados | ATINGIDO | média | exportação/e-mail pode carregar `descricao` com nome/CPF; snapshot diário como única fonte | P1-7 |
| 2 | Fluxos existentes | ATINGIDO | média | painel de SLA já cobre parte do pedido → risco de construir o segundo produto | P1-8 |
| 3 | Integrações | ATINGIDO | alta | RMC/Compliance consome o mesmo `SlaSnapshot`; e-mail corporativo limita anexo a 20 MB | P1-3 / P1-7 |
| 4 | Permissões | ATINGIDO | média | carteira por `responsavel_id`; envio automático pode vazar carteira entre gestores | P1-6 |
| 5 | Relatórios/indicadores | ATINGIDO | **alta** | o mesmo número sai no RMC enviado ao cliente, com multa prevista na cl. 7.2 | P1-3 |
| 6 | Outros clientes/contratos | ATINGIDO | média | se cobrir a base inteira, um gestor pode ver contratos de outros clientes | P1-1 / P1-6 |
| 7 | Privacidade/regulação | ATINGIDO | **alta** | dado pessoal em campo livre saindo da plataforma por anexo de e-mail | P1-7 |
| 8 | Retrocompatibilidade | ATINGIDO | baixa | consumidores do snapshot (RMC) não podem ver a semântica mudar | P1-3 |
| 9 | Operação/suporte | ATINGIDO | média | job sem monitoramento + deploy mensal sem feature flag: falha silenciosa e rollback difícil | P1-7 |
| 10 | Volume/performance/custo | ATINGIDO | **alta** | 12 mil contratos × serviços × período contra o limite de 50k linhas / 20 MB | P1-7 |
| 11 | Experiência | ATINGIDO | baixa | formato de saída (Excel × CSV), idioma, uso real da planilha atual | P2-3 |
| 12 | Segurança | ATINGIDO | média | exportação e e-mail são nova superfície de vazamento; autorização por objeto | P1-6 |
| 13 | Comercial/faturamento | ATINGIDO | **alta** | expectativa de prazo criada com a diretoria; obrigação contratual de SLA | P1-3 / P2-1 |
| 14 | Manutenção | NÃO ATINGIDO | — | nenhuma dívida nova identificada neste recorte | — |

## Inconsistências
| # | O que diz uma fonte | O que diz a outra | Fontes | Vira pergunta |
|---|---|---|---|---|
| 1 | "só a gestão de contratos usa" | Compliance gera o RMC a partir do mesmo snapshot | chamado × doc §RMC | P1-4 |
| 2 | "exportação para Excel" | plataforma exporta CSV, limitado a 50k linhas | chamado × doc §Exportação | P1-7 |
| 3 | "sair ainda este mês" | sem base de esforço, escopo ou aprovação registrados | chamado × — | P2-1 |

## Perguntas priorizadas
### P1 — bloqueantes
| # | Pergunta (voz do participante) | Por que perguntamos | O que é uma resposta boa | Se vier vaga |
|---|---|---|---|---|
| P1-1 | "O relatório deve cobrir todos os contratos ou só as carteiras que vocês acompanham de perto?" | muda volume, limite de exportação e escopo | uma opção escolhida + o que fazer com o resto | "Então só a base inteira? E os contratos sem serviço ativo?" |
| P1-2 | "Qual número exatamente precisa aparecer: % de cumprimento no período, tempo médio, quantidade de estouros? Por serviço ou por contrato?" | sem isso o requisito não existe | métrica, granularidade e período definidos | "Me mostra na planilha de hoje qual coluna você olha primeiro." |
| P1-3 | "Esse número aparece no relatório mensal que vocês enviam ao cliente e que tem multa contratual? O que acontece se o número mudar?" | efeito contratual — o risco mais caro do pedido | sim/não + quem valida a mudança | "Quem é o dono da cláusula 7.2? Posso falar com ele?" |
| P1-4 | "Quem mais consome esse número além de você e da diretoria?" | define aceite e validação | lista de consumidores | "O Compliance usa esse número para o RMC?" |
| P1-5 | "Nos contratos antigos sem janela de SLA cadastrada, o que deve aparecer: sem informação, fora do relatório ou um alerta de cadastro pendente?" | 18% da base | regra explícita | "Se ficar de fora, quem percebe que o contrato existe?" |
| P1-6 | "Quem recebe o e-mail, e cada um vê só a própria carteira ou todos os contratos?" | permissão e LGPD | destinatário + regra de visibilidade | "Um gestor com duas carteiras recebe um e-mail ou dois?" |
| P1-7 | "Quantas linhas esse relatório costuma ter por semana? E se passar de 50 mil linhas ou 20 MB, o que preferem?" | limites técnicos conhecidos | número + alternativa aceita (link, recorte) | "Posso enviar só um resumo e um link para o detalhe?" |
| P1-8 | "O painel de SLA do METEO não é usado hoje. O que falta nele para resolver o seu problema?" | evita construir de novo o que existe | motivo concreto (filtro, exportação, acesso) | "Se o painel tivesse filtro por carteira e exportação, resolveria?" |

### P2 — importantes
| # | Pergunta | Por que | Resposta boa | Se vaga |
|---|---|---|---|---|
| P2-1 | "Qual a consequência real de passar do fim do mês?" | prazo sem base | consequência concreta | "Se não houver, posso propor uma data depois de entender o esforço." |
| P2-2 | "Quem aprova mudança de escopo? O diretor participa da validação?" | aprovador não confirmado | nome + processo | "Quem decide se o diretor não puder?" |
| P2-3 | "Como a planilha de hoje circula e em que formato?" | formato e origem do pedido de Excel | canal + formato | "Posso ver o arquivo de outubro?" |
| P2-4 | "Semanal é suficiente, ou o problema é saber no momento em que o SLA estoura?" | forma × necessidade | frequência justificada | "O que você faz na segunda que não poderia fazer na terça?" |
| P2-5 | "Feriado deve ser considerado no cálculo do SLA?" | limitação conhecida do cálculo | decisão explícita | "A limitação atual já gerou contestação de cliente?" |

### P3 — desejáveis
| # | Pergunta | Por que |
|---|---|---|
| P3-1 | "Quais colunas da planilha de hoje são indispensáveis?" | aderência ao uso real |
| P3-2 | "Quem vai usar e precisa de treinamento?" | adoção |
| P3-3 | "Qual nome o relatório deve ter e em qual idioma?" | acabamento |

## Pontos a explorar com mais cuidado
1. **O número do SLA tem dono contratual** (cláusula 7.2 / RMC) — não deixar a conversa tratá-lo como relatório interno.
2. **A frase "a gente ignora" os contratos sem cadastro** — regra informal que esconde 18% da base.
3. **O painel existe, mas ninguém usa** — a resposta pode mudar todo o escopo do pedido.
4. **Limites de exportação/e-mail** — o pedido nasceu de uma planilha manual; ninguém dimensionou o volume.
5. **Dado pessoal em campo livre** — exportação para fora da plataforma.
6. **Snapshot diário sem monitoramento** — o relatório pode ser confiável no papel e errado na prática.

## Sinais de alerta a observar na reunião
- Prazo "fim do mês" sem consequência declarada — **não prometer**.
- Aprovação da diretoria fora da sala.
- Respostas "só a gestão usa" sem verificação de consumidores.
- Pedido de funcionalidade nova quando o painel existente resolve parte.

## Plano B da reunião
- **Tempo curto:** priorizar P1-3 → P1-2 → P1-1; registrar o resto como pendência com dono.
- **Resposta travada:** seguir para a próxima P1 e voltar no fim.
- **Pedido novo:** registrar como emergente, sem prometer prazo nem escopo.
