# Cobertura da reunião — chamado #4821 (Cliente Exemplo Ltda.)

> ⚠️ EXEMPLO SINTÉTICO gerado pela fase `avaliar` da skill.

**Reunião:** 2026-10-13 14:00 · **Duração:** 42 min · **Transcrição:** 00_entrada/transcricao.md
**Itens planejados:** 8 P1 + 5 P2 + 3 P3 do dossiê
**Checklist — fonte de verdade:** do time (8 itens, **sem marcadores** → todos tratados como `[E]`) · **complemento:** `CHECKLIST_ENTREVISTA.md` (62 itens: 45 `[E]` · 12 `[I]` · 5 `[T]`) → placares **separados**
**Participante:** Júlia

## Placar

| Métrica | Resultado |
|---|---|
| **P1 do dossiê cobertos** (resposta suficiente) | **0/8 (0%)** · aproveitável 6/8 (75%) |
| **Checklist do time** (8 itens) | **1/8 (13%)** · aproveitável 4/8 (50%) |
| **Complemento embutido `[E]`** (45 itens) | 5/45 (11%) · aproveitável 20/45 (44%) |
| **Complemento embutido `[I]`** (12 itens) | 0/12 · `[T]` (5 itens) não avaliados |
| P2 do dossiê cobertos | 0/5 (0%) · aproveitável 2/5 (40%) |
| Itens emergentes (não planejados) | 2 |
| Decisões registradas | **0** |
| Pendências com dono e prazo | **0** |

> Leitura: a reunião foi cordial e cobriu o "caminho feliz" do pedido, mas **nenhum ponto bloqueante saiu respondido de forma suficiente** — e a lacuna mais cara (efeito contratual) foi mencionada pelo próprio cliente e não explorada.

## Matriz de cobertura — pontos do dossiê

| # | Item planejado | P | Status | Evidência (trecho/timestamp) | Qualidade |
|---|---|---|---|---|---|
| P1-1 | Escopo: base inteira ou carteiras acompanhadas | P1 | Parcial | [00:08] "12 mil contratos na base, mas os que a gente acompanha de perto são uns 400" — recorte do relatório não foi definido | número veio, decisão não |
| P1-2 | Métrica, granularidade e período do SLA | P1 | Não coberto | — (nenhuma pergunta sobre métrica, período ou serviço) | — |
| P1-3 | Efeito no RMC / cláusula 7.2 (multa) | P1 | **Não coberto** | [00:15] Sandra: "isso depois vai no relatório mensal que a gente manda pro cliente, então tem que estar certinho" — mencionado e abandonado; a fala seguinte [00:16] muda de assunto | menção do cliente não explorada |
| P1-4 | Quem mais consome o número | P1 | Parcial | [00:25] "só a gestão de contratos, a diretoria recebe" | resposta não verificada; Compliance não mencionado |
| P1-5 | Contratos sem janela de SLA (~18%) | P1 | Parcial | [00:19] "tem contrato antigo que nem tem SLA cadastrado. A gente ignora" | regra informal aceita sem definir o que aparece no relatório |
| P1-6 | Destinatário do e-mail e visibilidade por carteira | P1 | Parcial | [00:17] "seria bom toda segunda-feira de manhã" | frequência sim; destinatário e recorte não |
| P1-7 | Volume e limites (50k linhas / 20 MB) | P1 | Parcial | [00:08] volume citado; limites nunca perguntados | — |
| P1-8 | Por que o painel existente não é usado | P1 | Parcial | [00:29] Sandra: "o painel existe, mas ninguém usa. É ruim de filtrar" | pista forte, não aprofundada |
| P2-1 | Prazo real e consequência | P2 | Parcial | [00:31] "seria bom até o fim do mês, a diretoria está cobrando" | sem consequência declarada |
| P2-2 | Quem aprova mudança de escopo | P2 | Parcial | [00:35] "depois a gente vê. O diretor não está aqui hoje" | perguntado, sem resposta |
| P2-3 | Como a planilha circula hoje | P2 | Não coberto | [00:05] descrito o processo, não o canal/formato | — |
| P2-4 | Semanal é suficiente ou precisa alerta? | P2 | Não coberto | — | — |
| P2-5 | Feriados no cálculo do SLA | P2 | Não coberto | — | — |

*Status: Coberto · Parcial · Não coberto · Emergente · Não verificável. Sem trecho citado → `Não coberto`; `Não verificável` só para transcrição ilegível/truncada.*

## Matriz de cobertura — checklist do time (8 itens, todos `[E]`)

| # | Item | Marcador | Status | Evidência (trecho/timestamp) | Observação |
|---|---|---|---|---|---|
| 1 | Qual decisão o cliente toma com essa informação? | `[E]` | **Coberto** | [00:11] "abrir e ver quem está estourando o SLA" | decisão declarada |
| 2 | O número tem efeito contratual/multa? Quem mais consome? | `[E]` | **Não coberto** | [00:15] menção ao relatório mensal, não explorada | o item mais crítico da checklist |
| 3 | O que já existe que resolve 80%? Por que não é usado? | `[E]` | Parcial | [00:29] "o painel existe, mas ninguém usa. É ruim de filtrar" | motivo citado, não aprofundado |
| 4 | Volume real e limite aceitável de tempo? | `[E]` | Parcial | [00:08] 12 mil / 400 contratos | limite nunca perguntado |
| 5 | Quais contratos ficam fora da regra? O que fazer com eles? | `[E]` | Parcial | [00:19] "a gente ignora" | sem regra de exibição |
| 6 | Quem pode ver o dado? Tem dado pessoal? | `[E]` | **Não coberto** | — | LGPD não abordada |
| 7 | Como isso é desligado se der problema? | `[E]` | **Não coberto** | — | rollback não abordado |
| 8 | O que fica de fora desta entrega? | `[E]` | **Não coberto** | — | escopo aberto |
| — | **Totais** | | **1 C · 3 P · 4 NC** | | 8 itens |

## Matriz de cobertura — complemento embutido (roll-up por bloco)

*Checklist longa: roll-up por bloco; a matriz item a item fica no arquivo de trabalho da skill.*

| Bloco | Itens `[E]` | Coberto | Parcial | Não coberto | Observação |
|---|---|---|---|---|---|
| A · Abertura e contexto | 4 | 1 | 3 | 0 | objetivo e papéis ok; motivador e decisor frágeis |
| B · Problema e dor | 5 | 2 | 2 | 1 | processo atual ok; custo de não fazer não perguntado |
| C · Pedido, desejo e alternativas | 4 | 1 | 0 | 3 | nenhuma pergunta sobre alternativas |
| D · Fluxo futuro desejado | 4 | 0 | 2 | 2 | quem age e transição não definidos |
| E · Dados e regras | 5 | 0 | 2 | 3 | origem do dado e LGPD nunca abordados |
| G · Exceções e casos-limite | 5 | 0 | 2 | 3 | só o contrato legado |
| H · Impacto e efeitos colaterais | 5 | 0 | 1 | 4 | **o bloco mais crítico — praticamente intocado** |
| K · Sucesso, aceite e medição | 4 | 0 | 1 | 3 | sem métrica |
| L · Escopo, prioridade e mudança | 4 | 0 | 0 | 4 | nada sobre fora de escopo |
| N · Encerramento | 5 | 1 | 2 | 2 | recapitulação ok; pendências sem dono |
| **Total `[E]`** | **45** | **5** | **15** | **25** | |
| `[I]` (F, I, J, M) | 12 | 0 | 0 | 12 | integrações, não-funcionais, operação e riscos não tocados |
| `[T]` | 5 | — | — | — | não avaliados (fora do mínimo viável) |

## Perguntas: feitas, não feitas, mal feitas

**Melhores perguntas da reunião**
1. [00:04] "Me conta como funciona hoje, passo a passo." — abriu o processo real e revelou a montagem manual.
2. [00:20] "Como você vai dizer que isso deu certo?" — tentou estabelecer critério de sucesso.
3. [00:37] Recapitulação antes de encerrar — confirmada pelo cliente.

**Perguntas não feitas (P1/P2)**
| Pergunta perdida | Impacto de não ter perguntado |
|---|---|
| Efeito no RMC / cláusula 7.2 | risco contratual e de multa; pode invalidar o desenho do relatório |
| Métrica/período/granularidade | o requisito não existe: "SLA de cada contrato" não é especificável |
| Volume e limites | solução pode não entregar o anexo (50k linhas / 20 MB) |
| Destinatário e visibilidade | risco de vazamento entre carteiras e de LGPD |
| Fora de escopo e prioridade | escopo aberto; nada impede crescer |
| Operação/rollback e monitoramento do job | falha silenciosa no envio |

**Perguntas a refazer**
| Original | Problema | Como reformular |
|---|---|---|
| [00:12] "Você quer exportar em Excel?" | fechada e induzida — o chamado já dizia "sim" | "Como você usa a planilha hoje e para quem ela vai depois?" |
| [00:24] "Quem mais usa esse relatório?" | resposta aceita sem verificação | "Além de você e da diretoria, alguém recebe esse número? O Compliance usa?" |
| [00:27] "Vocês usam o painel?" | sim/não | "O que você tentou fazer no painel e não conseguiu?" |

**Padrões a corrigir**
- Pergunta fechada quando havia resposta aberta disponível (2 ocorrências).
- Menção do cliente sem aprofundamento: [00:15] e [00:29] eram pistas de alto valor — faltou a pergunta "me conta mais sobre isso".

## Itens emergentes (não planejados)
| # | O que apareceu | Quem trouxe | Por que importa | Virou requisito? |
|---|---|---|---|---|
| 1 | O painel de SLA já existe e é percebido como inútil | Sandra [00:29] | pode mudar todo o escopo (corrigir × construir) | registrado como P1-8 |
| 2 | A diretoria é consumidora do relatório | Carlos [00:25] | muda critério de aceite e formato | registrado, não detalhado |

## Sinais de risco observados
| # | Sinal | Evidência | Consequência se não tratado | Ação |
|---|---|---|---|---|
| 1 | **Promessa de prazo feita pelo time** | [00:32] Júlia: "Até o fim do mês sai." | compromisso sem análise de esforço nem escopo | alinhar retirada/comunicação formal |
| 2 | Obrigação contratual mencionada e ignorada | [00:15] "tem que estar certinho" | mudança de número com efeito em multa | abrir conversa com Compliance |
| 3 | Aprovador ausente | [00:35] "o diretor não está aqui hoje" | decisão de escopo sem dono | marcar reunião de validação de escopo |
| 4 | Regra informal para contratos legados | [00:19] "a gente ignora" | 18% da base invisível no relatório | definir exibição "sem cadastro" |
| 5 | Contradição sobre consumidores | [00:25] "só a gestão" × doc §RMC (Compliance consome) | aceite incompleto | confirmar consumidores |
| 6 | Reunião encerrada sem decisão registrada | [00:37–00:41] | nada formalizado; retrabalho na próxima conversa | registrar decisões na próxima reunião |

## Lacunas priorizadas
| # | Lacuna | Tipo | Impacto se chegar ao desenvolvimento | Dono | Prazo |
|---|---|---|---|---|---|
| 1 | Efeito no RMC / cláusula 7.2 | conteúdo | retrabalho e risco contratual | Compliance (via Carlos) | ❓ |
| 2 | Métrica/período/granularidade | conteúdo | requisito inexistente; desenvolvimento adivinha | Carlos | ❓ |
| 3 | Escopo (base × carteira) | conteúdo | volume 30× maior que o previsto | Carlos | ❓ |
| 4 | Destinatário e visibilidade | conteúdo | risco de vazamento/LGPD | TI + Carlos | ❓ |
| 5 | Volume e limites de exportação | conteúdo | entrega não funciona no tamanho real | TI | ❓ |
| 6 | Fora de escopo | método | crescimento descontrolado | Júlia + Carlos | ❓ |
| 7 | Métrica de sucesso | método | impossível validar a entrega | Carlos | ❓ |

## Avaliação da condução (para o participante)
**Funcionou bem:** abriu pelo processo atual em vez de discutir a solução; fez uma pergunta de critério de sucesso; recapitulou e confirmou o entendimento ao final; registrou as próprias dúvidas no documento (sinal de honestidade intelectual).
**Faltou:** não aprofundou duas pistas de alto valor dadas pelo cliente ([00:15] e [00:29]); não varreu o bloco de impacto/efeitos colaterais; não fechou pendências com dono e prazo; prometeu prazo sem base.
**Faria diferente:** usar "me conta mais sobre isso" quando o cliente menciona algo inesperado; terminar com a lista de pendências + dono + data; nunca prometer prazo em nome do time.
