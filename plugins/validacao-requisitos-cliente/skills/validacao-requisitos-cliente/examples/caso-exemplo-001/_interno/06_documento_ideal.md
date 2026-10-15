> ⛔ **DOCUMENTO INTERNO — NÃO COMPARTILHAR COM O PARTICIPANTE.**
> Uso exclusivo do líder/mentor, para coaching e para calibrar o padrão de qualidade.
> Compartilhar este conteúdo (ou qualquer resumo dele) com quem escreve o documento de
> requisitos anula o objetivo de desenvolvimento do programa.

# Documento de requisitos — versão ideal (interna) — chamado #4821

**Cliente:** Cliente Exemplo Ltda. · **Sistema:** METEO · **Base:** chamado + documentação + transcrição + documento do participante (v0.1)
**Reunião de validação:** 2026-10-13 · **Gerado em:** 2026-10-14
**Status:** hipótese sênior — 7 pontos ainda dependem do cliente (Apêndice B)

## 1. Contexto e objetivo
A gestão de contratos monta manualmente um relatório de cumprimento de SLA (~2 dias/mês), cruzando prints do "Painel SLA" com a lista de contratos da carteira. Além do custo operacional, o processo não dá suporte à decisão de agir sobre contratos em risco durante o período.
**Resultado esperado:** eliminar a montagem manual **e** permitir que o gestor identifique e trate contratos em risco de estouro de SLA dentro do período de apuração.
**Fora de escopo:** alterar a fórmula de cálculo do SLA, alterar a janela de atendimento e o tratamento de feriados, alterar o Relatório Mensal de Conformidade (RMC).

## 2. Personas e casos de uso
| Persona | Hoje | Depois | Frequência |
|---|---|---|---|
| Gestor de contrato | print + planilha manual | consulta painel/relatório restrito à própria carteira | semanal |
| Analista de contratos | monta a planilha | apoia a análise; não monta mais | semanal |
| Diretoria | recebe a planilha | recebe resumo executivo | mensal |
| Compliance | gera o RMC a partir de `SlaSnapshot` | **inalterado** | mensal |

**UC-01** Consultar cumprimento por contrato/serviço no período.
**UC-02** Identificar contratos em risco antes do fechamento do período.
**UC-03** Exportar e compartilhar o recorte.
**UC-04** Receber o recorte automaticamente na segunda-feira.

## 3. Requisitos funcionais

### RF-01 — Relatório de cumprimento de SLA
- **Ator:** `GestorContrato`, `Administrador` · **Gatilho:** acesso ao relatório · **Resultado:** lista de contratos com % de cumprimento no período, por serviço.
- **Regras:** cumprimento = eventos atendidos dentro de `JanelaAtendimento` ÷ eventos totais do serviço no período, sobre `SlaSnapshot`; período padrão = semana anterior (segunda a domingo); granularidade exibida = contrato, com expansão por serviço.
- **Critérios de aceite:**
  - [ ] Dado um contrato com 3 serviços e 100 eventos no período, o relatório exibe o % de cada serviço e o % consolidado do contrato, iguais ao cálculo do `SlaSnapshot` (tolerância 0).
  - [ ] O relatório informa o **carimbo de geração do snapshot** utilizado.
  - [ ] Contrato sem eventos no período é exibido como "sem eventos", não como 0%.
- **Exceções:** contrato sem `JanelaAtendimento` (RF-05); serviço sem eventos; snapshot do dia ausente por falha do job (RF-06).
- **Origem:** chamado · [00:11] "abrir e ver quem está estourando"

### RF-02 — Visão de risco (decisão, não só listagem)
- **Descrição:** destacar contratos com risco de estouro no período corrente, ordenados por proximidade do limite, com o serviço responsável. *(atende à necessidade real; o pedido original pedia apenas o relatório)*
- **Critérios de aceite:**
  - [ ] Dado o período em curso, contratos com consumo ≥ 80% da janela elegível aparecem em destaque, ordenados do maior para o menor.
  - [ ] Cada linha indica a ação esperada e o responsável (campo `responsavel_id`).
- **Origem:** INFERÊNCIA a partir de [00:11] + [00:22] — **validar (P1-4)**

### RF-03 — Exportação
- **Descrição:** exportar o recorte corrente em CSV/Excel, respeitando o recorte de visibilidade do usuário. Limite atual da plataforma: 50.000 linhas.
- **Critérios de aceite:**
  - [ ] Exportação de até 50.000 linhas conclui em ≤ 60 s.
  - [ ] Acima de 50.000 linhas, o sistema oferece exportação particionada por carteira/período em vez de abortar.
  - [ ] A exportação **não inclui** `EventoAtendimento.descricao` (campo livre com dado pessoal).
  - [ ] Exportação de outro usuário não é acessível por link direto.
- **Origem:** chamado · [00:13]

### RF-04 — Envio agendado semanal
- **Descrição:** enviar por e-mail, toda segunda-feira às 07:00, o relatório do recorte do destinatário.
- **Critérios de aceite:**
  - [ ] Cada destinatário recebe **somente** a própria carteira; gestor com 2 carteiras recebe 1 e-mail consolidado das suas.
  - [ ] Anexo ≤ 20 MB; acima disso, o e-mail traz resumo + link autenticado (não envia anexo truncado).
  - [ ] O e-mail exibe o carimbo de geração do snapshot.
  - [ ] Falha no envio gera alerta para a operação em ≤ 30 min e não deixa o destinatário sem aviso.
- **Origem:** [00:17]

### RF-05 — Contratos sem cadastro de SLA
- **Descrição:** contratos sem `JanelaAtendimento` (contratos anteriores a 2019, ~18% da base) aparecem em seção própria "sem cadastro de SLA", com contagem e link para o cadastro — nunca somem do relatório.
- **Critérios de aceite:**
  - [ ] Contrato sem janela não é contabilizado como 0% nem como 100%.
  - [ ] O relatório mostra a contagem de contratos sem cadastro e permite exportar a lista para regularização.
- **Origem:** [00:19] "a gente ignora" — **validar regra (P1-5)**

### RF-06 — Monitoramento do job de SLA (condicionado)
- **Descrição:** expor data/hora da última execução bem-sucedida do `calc_sla`; falha gera alerta à operação.
- **Critérios de aceite:** [ ] ausência de snapshot do dia é sinalizada em ≤ 1h após a janela de execução.
- **Origem:** doc §Operação — risco de dado velho silencioso

## 4. Requisitos não funcionais
| # | Categoria | Requisito | Número/limite | Verificação |
|---|---|---|---|---|
| NFR-01 | Desempenho | Relatório da carteira (400 contratos) carrega | ≤ 10 s p95 | teste de carga |
| NFR-02 | Volume | Base total: 12.000 contratos; carteiras acompanhadas: ~400 | exportação particionada acima de 50k linhas | teste com base cheia |
| NFR-03 | Consistência | Dado exibido deriva de `SlaSnapshot` (defasagem ≤ 24h) | carimbo visível | inspeção |
| NFR-04 | Privacidade | Nenhum dado pessoal sai da plataforma por exportação/e-mail | `descricao` excluída; avaliação de privacidade registrada | revisão de segurança |
| NFR-05 | Segurança | Visibilidade estritamente por `responsavel_id` | teste com dois gestores | teste de autorização |
| NFR-06 | Operação | Rollback sem novo deploy | feature flag no fluxo de envio | checklist de operação |
| NFR-07 | Compatibilidade | A semântica de `SlaSnapshot` **não muda** (RMC depende) | zero alteração no job | revisão com Compliance |

## 5. Integrações e dependências
| Sistema/pessoa | Sentido | O que troca | Risco | Dono |
|---|---|---|---|---|
| `calc_sla` | fornece | `SlaSnapshot` (03:00) | falha silenciosa → RF-06 | TI |
| RMC (Compliance) | consome | mesmo snapshot, com efeito de multa (cl. 7.2) | **alto** — mudança de semântica exige aval | Compliance |
| E-mail corporativo | envia | anexo ≤ 20 MB | médio → link | TI |
| Cadastro de contratos | fornece | `JanelaAtendimento` | 18% sem cadastro → RF-05 | Gestão de contratos |

## 6. Dados
| Dado | Origem | Volume | Sensível | Retenção | Histórico |
|---|---|---|---|---|---|
| Cumprimento de SLA | `SlaSnapshot` | 12k contratos × serviços × semana | não | manter 24 meses (confirmar) | snapshots existentes |
| `EventoAtendimento.descricao` | campo livre | — | **sim (nome/CPF)** | não exportar, não enviar | — |
| Carteira (`responsavel_id`) | cadastro de contratos | 400 contratos ativos | não | — | — |

## 7. Permissões e segurança
- `GestorContrato`: somente contratos da própria carteira, em tela, exportação e e-mail.
- `Administrador`: todos os contratos.
- Diretoria: visão consolidada, sem dado pessoal.
- Toda exportação gera registro de auditoria (quem, quando, recorte).

## 8. Riscos e efeitos colaterais
| # | Risco/efeito | Afetado | Prob. | Impacto | Mitigação |
|---|---|---|---|---|---|
| 1 | Mudança de cálculo/agregação altera o RMC e a multa contratual | Cliente, Compliance | média | **alto** | NFR-07: não alterar a semântica do snapshot; validar com o dono da cláusula 7.2 |
| 2 | Exportação/e-mail vaza dado pessoal | Solicitantes, cliente | média | alto | NFR-04 + RF-03 |
| 3 | Relatório acima dos limites de linha/anexo | Gestão | alta | médio | RF-03 particionado + RF-04 link |
| 4 | Contratos sem cadastro escondem risco | Gestão | alta | médio | RF-05 |
| 5 | Job falha e o e-mail sai com dado velho | Todos | média | médio | RF-06 + carimbo |
| 6 | Duplicidade com o painel existente | Produto | média | médio | decidir P1-8 antes de construir |
| 7 | Feriado fora do cálculo contamina o número | Cliente | média | médio | fora de escopo nesta entrega — registrar como dívida conhecida |

## 9. Premissas
- O cálculo documentado permanece (janela por serviço, job diário, sem feriado).
- Semana de referência = segunda a domingo (validar P1-2).
- O RMC continua consumindo `SlaSnapshot` sem alteração.

## 10. Questões em aberto
| # | Questão | Dono | Prazo | Impacto se não respondida |
|---|---|---|---|---|
| P1-1 | Base inteira ou carteiras? | Carlos | antes do desenvolvimento | volume/limite de exportação |
| P1-2 | Métrica, período e granularidade | Carlos | antes do desenvolvimento | requisito inespecificável |
| P1-3 | Efeito no RMC / cláusula 7.2 | Compliance | antes do desenvolvimento | risco contratual |
| P1-5 | Regra dos contratos sem cadastro | Sandra | antes do desenvolvimento | 18% invisível |
| P1-6 | Destinatários e visibilidade | TI + Carlos | antes do desenvolvimento | LGPD/permissão |
| P1-7 | Volume por semana e comportamento acima do limite | TI | antes do desenvolvimento | entrega não funciona |
| P1-8 | Corrigir o painel em vez de criar relatório novo? | Produto + Sandra | antes do desenvolvimento | retrabalho/duplicidade |
| P2-5 | Feriado entra no cálculo? | Carlos | pode ser dívida registrada | contaminação do número |

## 11. Decisões tomadas
| Data | Decisão | Quem decidiu | Evidência |
|---|---|---|---|
| — | Nenhuma decisão formalizada na reunião de 2026-10-13 | — | [00:37–00:41] |
| 2026-10-14 | Não calcular nem alterar SLA nesta entrega; apenas consumir o snapshot | proposta técnica, a validar com Compliance | doc §RMC |

## 12. Critérios de sucesso e aceite
| Métrica | Hoje | Meta | Como medir | Quem valida |
|---|---|---|---|---|
| Tempo de montagem manual | ~2 dias/mês | 0 dias/mês | registro da gestão | Carlos |
| Contratos em risco tratados no período | não medido | ≥ 90% dos destacados | relatório de uso | Carlos |
| Aderência do dado ao snapshot | manual/erro | 100% (tolerância 0) | conferência automatizada | TI |

## 13. Rastreabilidade
| Requisito | Origem | Evidência |
|---|---|---|
| RF-01 | chamado + reunião | [00:11] |
| RF-02 | inferência validada com o cliente | [00:11], [00:22] |
| RF-03 | chamado + doc §Exportação | [00:13] |
| RF-04 | reunião | [00:17] |
| RF-05 | reunião + doc §Contratos | [00:19] |
| RF-06 | doc §Operação | — |
| NFR-04 | doc §Dados e privacidade | — |
| NFR-07 | doc §RMC | [00:15] |

## 14. Glossário
| Termo | Definição |
|---|---|
| SLA | % de eventos atendidos dentro da `JanelaAtendimento` do serviço, no período |
| Snapshot | resultado do job `calc_sla`, gravado às 03:00 |
| RMC | Relatório Mensal de Conformidade, enviado ao cliente no dia 5, com efeito de multa (cl. 7.2) |

---

## Apêndice A — Diferenças-chave vs. documento do participante (calibração interna — **não citar ao participante**)

| # | Tema | No documento da Júlia | No ideal | Tipo | O que cobrar (nunca a resposta pronta) |
|---|---|---|---|---|---|
| 1 | Critério de aceite | "rápido e correto" | "dado… quando… então", tolerância 0, carimbo do snapshot | método | ensinar o formato "dado/quando/então" com um exemplo |
| 2 | Métrica do SLA | "SLA de cada contrato" | % por serviço, semana seg–dom, expansão por contrato | conteúdo | devolver como pergunta (P1-2) |
| 3 | Efeito no RMC | citado em observação, sem consequência | NFR-07 + risco nº 1 com mitigação | conteúdo | devolver como pergunta ao Compliance (P1-3) |
| 4 | Contratos sem cadastro | "o Carlos disse que ignora" | RF-05 com exibição e exportação da lista | conteúdo | devolver como pergunta (P1-5) |
| 5 | Exportação | "deve poder ser exportada" | particionamento em 50k linhas, sem dado pessoal, ≤60 s | método + conteúdo | ensinar limites; perguntar volume |
| 6 | E-mail | "toda segunda de manhã" | recorte por destinatário, limite de anexo, alerta de falha | conteúdo | devolver como pergunta (P1-6) |
| 7 | Necessidade real | relatório (a solução pedida) | RF-02 visão de risco para agir no período | método | ensinar "pergunte qual decisão a informação suporta" |
| 8 | Fora de escopo | "não sei ainda" | seção explícita no ideal | método | ensinar a fechar com "o que não entra" |
| 9 | Questões em aberto | ausente | tabela com dono e prazo | método | ensinar a transformar observação em pendência |
| 10 | Rastreabilidade | ausente | tabela requisito → origem/evidência | método | ensinar a citar origem em cada requisito |

## Apêndice B — Perguntas que ainda dependem do cliente

| # | Pergunta | Por que ninguém respondeu | Dono | Prazo | Resposta proposta (a validar) |
|---|---|---|---|---|---|
| 1 | Base inteira ou carteira? | não foi perguntado | Carlos | 48h | carteira do gestor no relatório; base inteira só para Administrador |
| 2 | Métrica/período/granularidade | não foi perguntado | Carlos | 48h | % por serviço, semana anterior, consolidado por contrato |
| 3 | Efeito no RMC / cláusula 7.2 | menção não explorada [00:15] | Compliance | 1 semana | não alterar o snapshot; consumir como está |
| 4 | Regra para contratos sem cadastro | resposta informal [00:19] | Sandra | 1 semana | seção "sem cadastro" + exportação para regularização |
| 5 | Destinatários e visibilidade | não foi perguntado | TI + Carlos | 1 semana | um e-mail por gestor, apenas a própria carteira |
| 6 | Volume/limites | não foi perguntado | TI | 1 semana | particionar acima de 50k; link acima de 20 MB |
| 7 | Painel existente | pista não aprofundada [00:29] | Produto + Sandra | 2 semanas | corrigir filtros + exportação do painel antes de criar tela nova |

## Apêndice C — Padrões a reforçar no time

1. **Pista do cliente não se ignora:** frases como "isso vai no relatório mensal" ou "o painel existe mas ninguém usa" precisam da repergunta "me conta mais sobre isso".
2. **Observação não é requisito:** toda anotação vira linha em "questões em aberto" com dono e prazo.
3. **Antes de aceitar a solução pedida, perguntar qual decisão ela suporta** — evita construir o segundo produto.
4. **Limites técnicos conhecidos entram no esqueleto antes da reunião** (50k linhas, 20 MB, snapshot diário) — são perguntas que o time pode preparar sozinho.
5. **Nunca prometer prazo em nome do time** — foi o risco mais concreto da reunião ([00:32]).