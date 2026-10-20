# Documento de Requisitos — Relatório de SLA (Cliente Exemplo Ltda.)

> ⚠️ EXEMPLO SINTÉTICO gerado pela fase `esqueleto`. `❓ TBD` = depende do cliente. Notas em itálico são instruções — apague na versão final.

**Cliente:** Cliente Exemplo Ltda. · **Chamado de origem:** #4821 · **Reunião de validação:** 2026-10-13
**Participante:** Júlia · **Status:** rascunho · **Versão:** 0.1 · **Última atualização:** 2026-10-13

## 1. Contexto e objetivo
A gestão de contratos monta manualmente, ~2 dias/mês, um relatório de cumprimento de SLA a partir do "Painel SLA" do ACME (exportação inexistente). *(fato: chamado + doc §Painel SLA)*
**Resultado esperado:** ❓ TBD — *decidir com o cliente: reduzir o trabalho manual ou agir mais rápido sobre estouros?*
**Fora de escopo:** ❓ TBD — *obrigatório sair da reunião com algo declarado.*

## 2. Personas e casos de uso
| Persona/papel | O que faz hoje | O que fará depois | Frequência |
|---|---|---|---|
| Gestor de contrato (`GestorContrato`) | print do painel → planilha manual | ❓ TBD | semanal ❓ |
| Analista de contratos | monta a planilha | ❓ TBD | ❓ TBD |
| Diretoria | recebe a planilha | ❓ TBD | ❓ TBD |
| Compliance | gera o RMC (doc §RMC) | ❓ TBD — **confirmar se é consumidor deste número** | mensal |

## 3. Requisitos funcionais

### RF-01 — Relatório de cumprimento de SLA
- **Descrição:** ❓ TBD — *métrica (%), granularidade (contrato/serviço) e período não definidos: ver P1-2.*
- **Ator:** `GestorContrato` · **Gatilho:** acesso ao relatório · **Resultado:** ❓ TBD
- **Regras de negócio:** janela de atendimento por serviço (fato: doc §Contratos); contratos sem janela cadastrada = ❓ TBD (P1-5); feriados = ❓ TBD (P2-5).
- **Critérios de aceite:**
  - [ ] ❓ TBD (não fechar sem critério testável — "carregar rápido" não vale)
- **Exceções e casos-limite:** contrato sem janela (~18%), serviço sem eventos no período, período sem dias úteis, falha do job `calc_sla`.
- **Origem:** chamado #4821 · [00:11] "abrir e ver quem está estourando"
- **Pendências:** ❓ P1-1, P1-2, P1-5 — dono <a definir>, prazo <a definir>

### RF-02 — Exportação
- **Descrição:** exportar o relatório em formato que permita envio e abertura pela gestão. ❓ TBD — Excel ou CSV? (P1-7)
- **Ator:** `GestorContrato` · **Gatilho:** ação "exportar" no relatório · **Resultado:** arquivo com o recorte visível ao usuário
- **Critérios de aceite:** [ ] ❓ TBD — limite de linhas, tempo máximo, comportamento acima de 50.000 linhas.
- **Exceções:** volume acima do limite de exportação (50k); anexo acima de 20 MB.
- **Origem:** chamado · [00:13] "sim, pra mandar pro pessoal"
- **Pendências:** ❓ P1-7 (volume e limites), P1-6 (visibilidade) — dono <a definir>, prazo <a definir>

### RF-03 — Envio automático semanal
- **Descrição:** enviar o relatório por e-mail toda segunda-feira. ❓ TBD — destinatário e recorte de carteira (P1-6); horário.
- **Ator:** sistema (job de envio) · **Gatilho:** segunda-feira de manhã · **Resultado:** e-mail com o relatório do recorte do destinatário
- **Critérios de aceite:** [ ] ❓ TBD
- **Exceções:** falha no envio (quem é avisado?), destinatário sem permissão, dado pessoal no anexo (LGPD).
- **Origem:** [00:17] "seria bom toda segunda-feira de manhã"
- **Pendências:** ❓ P1-6 (destinatário/visibilidade), P1-7 (limite de anexo) — dono <a definir>, prazo <a definir>

### RF-04 — ❓ TBD (a definir na reunião)
*Espaço para o que emergir: se a conclusão for "corrigir o painel existente", o requisito vira outro.*

## 4. Requisitos não funcionais
| # | Categoria | Requisito | Número/limite | Como verificar |
|---|---|---|---|---|
| NFR-01 | Desempenho | ❓ TBD | ❓ | ❓ |
| NFR-02 | Volume | ❓ tamanho do relatório por semana (P1-7) | ❓ | ❓ |
| NFR-03 | Disponibilidade do dado | snapshot diário às 03:00; defasagem de até 24h (fato: doc) | aceitável? ❓ | ❓ |
| NFR-04 | Segurança/privacidade | dado pessoal em `EventoAtendimento.descricao` não deve sair da plataforma | ❓ | ❓ |

## 5. Integrações e dependências
| Sistema/pessoa | Sentido | O que troca | Risco | Dono |
|---|---|---|---|---|
| Job `calc_sla` | fornece | `SlaSnapshot` | sem monitoramento; falha silenciosa | TI ❓ |
| RMC (Compliance) | consome | mesmo número, com multa contratual (cl. 7.2) | **alto** — ver P1-3 | ❓ |
| E-mail corporativo | envia | anexo limitado a 20 MB | médio | TI ❓ |

## 6. Dados
| Dado | Origem | Volume | Sensível? | Retenção | Histórico |
|---|---|---|---|---|---|
| Cumprimento de SLA | `SlaSnapshot` (03:00) | ❓ | não | ❓ | ❓ |
| `descricao` do evento | `EventoAtendimento` (livre) | ❓ | **sim** (nome/CPF) | ❓ | — |

## 7. Permissões e segurança
❓ TBD — hoje `GestorContrato` vê apenas a própria carteira (fato: doc §Permissões). Definir o recorte do relatório e do e-mail (P1-6) e tratar dado pessoal na exportação.

## 8. Riscos e efeitos colaterais
| # | Risco/efeito | Afetado | Prob. | Impacto | Mitigação | Status |
|---|---|---|---|---|---|---|
| 1 | Mudar a agregação do SLA altera o RMC e a multa contratual | Cliente, Compliance | média | **alto** | validar com o dono da cláusula 7.2 antes de implementar | aberto |
| 2 | Exportação leva dado pessoal para fora da plataforma | Solicitantes | média | alto | excluir `descricao` ou mascarar | aberto |
| 3 | Relatório acima de 50k linhas / 20 MB não é entregue | Gestão | alta | médio | recorte + link | aberto |
| 4 | Job sem monitoramento envia dado velho silenciosamente | Todos | média | médio | alerta de falha + carimbo de geração | aberto |
| 5 | Contratos sem janela somem e escondem risco | Gestão | alta | médio | exibir "sem cadastro" | aberto |
| 6 | Construir relatório novo ignorando o painel existente | Produto | média | médio | decidir em P1-8 | aberto |

## 9. Premissas
- O cálculo de SLA documentado (job diário, janela por serviço, sem feriado) continua válido — *confirmar (P2-5)*.
- A gestão continuará usando Excel como formato de trabalho.

## 10. Questões em aberto
| # | Questão | Por que importa | Dono | Prazo | Status |
|---|---|---|---|---|---|
| P1-1 | Base inteira ou carteira? | escopo e volume | Carlos | ❓ | aberto |
| P1-2 | Métrica, granularidade, período | define o requisito | Carlos | ❓ | aberto |
| P1-3 | Efeito no RMC / cláusula 7.2 | risco contratual | Compliance | ❓ | aberto |
| P1-5 | Contratos sem janela | 18% da base | Sandra | ❓ | aberto |
| P1-6 | Destinatário e visibilidade | permissão/LGPD | TI + Carlos | ❓ | aberto |
| P1-7 | Volume e limites | viabilidade | TI | ❓ | aberto |
| P1-8 | Por que o painel não é usado | evita retrabalho | Sandra | ❓ | aberto |

## 11. Decisões tomadas
| Data | Decisão | Quem decidiu | Evidência |
|---|---|---|---|
| 2026-10-13 | Nada formalizado — a reunião terminou sem decisão registrada | — | [00:37–00:39] |

## 12. Critérios de sucesso e aceite
| Métrica | Hoje | Meta | Como medir | Quem valida |
|---|---|---|---|---|
| Tempo de montagem manual | ~2 dias/mês | 0 | ❓ | Carlos |
| ❓ indicador de estouro | ❓ | ❓ | ❓ | ❓ |

## 13. Rastreabilidade
| Requisito | Origem | Evidência |
|---|---|---|
| RF-01 | chamado + reunião | [00:11] |
| RF-02 | chamado | [00:13] |
| RF-03 | chamado + reunião | [00:17] |

## 14. Glossário
| Termo | Definição acordada |
|---|---|
| SLA | ❓ TBD — confirmar se é % de cumprimento na janela |
| RMC | Relatório Mensal de Conformidade, enviado ao cliente no dia 5 |

---
## ⏱️ Antes de sair da reunião
- [ ] Todo RF com critério de aceite testável
- [ ] Fora de escopo declarado
- [ ] Efeito no RMC / cláusula 7.2 esclarecido
- [ ] Regra para contratos sem janela de SLA
- [ ] Destinatário e visibilidade do e-mail
- [ ] Volume e limites de exportação
- [ ] Pendências com dono e prazo
- [ ] Recapitulação confirmada
