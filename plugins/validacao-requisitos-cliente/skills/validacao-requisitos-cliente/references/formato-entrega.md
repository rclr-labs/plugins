# TEMPLATES.md — Formatos de saída

Cinco artefatos. Copie a estrutura, substitua o que está entre `<>` e remova as notas em itálico.

---

## Template 1 — `01_dossie_pre_reuniao.md`

```markdown
# Dossiê pré-reunião — <cliente> · <chamado/slug>

**Reunião:** <data e hora> · **Participante:** <nome> · **Cliente presente:** <nomes/papéis>
**Gerado em:** <AAAA-MM-DD> · **Fonte da checklist:** <do time | padrão embutida>

## Entradas consideradas
| Entrada | Onde está | Legibilidade | Observações |
|---|---|---|---|
| Chamado | 00_entrada/chamado.md | ok | <…> |
| Documentação do sistema | <arquivo> | parcial | <o que não foi encontrado> |
| Checklist do time | <arquivo ou ausente> | — | <substitui a padrão?> |

## Resumo executivo (1 página)

**A dor:** <1–2 frases>
**Pedido literal do cliente:** "<citação>"
**Pedido real vs. imaginado:** <o que ele precisa> × <a solução que ele já imaginou, e por quê isso importa>
**As 5 perguntas que decidem a reunião:** 1) … 2) … 3) … 4) … 5) …
**Maiores riscos / efeitos colaterais:** <3 bullets, do mais grave para o menos>
**Não pode sair da reunião sem resposta:** <bullets>

## Mapa de contexto do sistema
| Item | O que sabemos | Fonte | Confiança |
|---|---|---|---|
| Módulo/fluxo afetado | <…> | <arquivo §seção> | FATO |
| Entidades e estados | <…> | <…> | FATO |
| Integrações no caminho | <…> | <…> | FATO/INFERÊNCIA |
| Regras de negócio documentadas | <…> | <…> | FATO |
| Limitações e dívidas conhecidas | <…> | <…> | FATO |
| O que não encontramos | <…> | — | LACUNA |

## Decomposição do pedido
| Camada | Conteúdo | Origem |
|---|---|---|
| Pedido explícito | <…> | <trecho> |
| Necessidade real | <…> | FATO/INFERÊNCIA |
| Desejo / solução imaginada | <…> | <trecho> |
| Critério de sucesso | <…> | FATO/LACUNA |
| Restrições | <…> | <trecho> |

## Fatos, inferências, lacunas, conflitos e dúvidas
| # | Afirmação | Rótulo | Fonte / base | Vira pergunta? |
|---|---|---|---|---|
| 1 | <…> | FATO | <arquivo> | não |
| 2 | <…> | LACUNA | — | P1 |

## Varredura dos 14 eixos (obrigatória)
*Todos os 14 eixos aparecem, atingidos ou não — é a prova de que a varredura foi feita. Eixo não registrado = varredura não feita. Gravidade: alta (retrabalho, perda de dado, quebra de contrato/lei ou cobrança) · média (retrabalho localizado ou ruído operacional) · baixa (cosmético).*

| # | Eixo | Status | Gravidade | Achado (o que muda · quem sente · como descobriríamos tarde) | Pergunta de confirmação |
|---|---|---|---|---|---|
| 1 | Dados | <ATINGIDO/NÃO ATINGIDO> | <alta/média/baixa/—> | <…> | <…> |
| 2 | Fluxos existentes | <…> | <…> | <…> | <…> |
| 3 | Integrações | <…> | <…> | <…> | <…> |
| 4 | Permissões | <…> | <…> | <…> | <…> |
| 5 | Relatórios/indicadores | <…> | <…> | <…> | <…> |
| 6 | Outros clientes/contratos | <…> | <…> | <…> | <…> |
| 7 | Privacidade/regulação | <…> | <…> | <…> | <…> |
| 8 | Retrocompatibilidade | <…> | <…> | <…> | <…> |
| 9 | Operação/suporte | <…> | <…> | <…> | <…> |
| 10 | Volume/performance/custo | <…> | <…> | <…> | <…> |
| 11 | Experiência | <…> | <…> | <…> | <…> |
| 12 | Segurança | <…> | <…> | <…> | <…> |
| 13 | Comercial/faturamento | <…> | <…> | <…> | <…> |
| 14 | Manutenção | <…> | <…> | <…> | <…> |

## Inconsistências
| # | O que diz uma fonte | O que diz a outra | Fontes | Vira pergunta |
|---|---|---|---|---|

## Perguntas priorizadas
### P1 — bloqueantes
| # | Pergunta (voz do participante) | Por que perguntamos | O que é uma resposta boa | Se vier vaga |
|---|---|---|---|---|
| P1-1 | "<…>" | <…> | <…> | <repergunta> |

### P2 — importantes
<mesma tabela>
### P3 — desejáveis
<mesma tabela>

## Pontos a explorar com mais cuidado
<3–7 bullets: assuntos em que uma resposta plausível esconde um problema — com o motivo>

## Sinais de alerta a observar na reunião
- <ex.: se ele disser "isso é simples", voltar ao caso concreto>
- <ex.: ausência do decisor>

## Plano B da reunião
- Se o tempo acabar: <quais P1 priorizar>
- Se uma resposta travar: <o que seguir fazendo>
- Se surgir pedido novo: <registrar como emergente, não prometer>
```

---

## Template 2 — `02_esqueleto_requisitos.md`

Documento **a ser preenchido pelo participante** durante/depois da reunião. `❓ TBD` marca o que só o cliente responde. Notas em itálico são instruções — apague-as na versão final.

```markdown
# Documento de Requisitos — <título curto do caso>

**Cliente:** <…> · **Chamado de origem:** <id/link> · **Reunião de validação:** <data>
**Participante:** <nome> · **Status:** rascunho | em revisão | validado
**Versão:** 0.1 · **Última atualização:** <data>

## 1. Contexto e objetivo
<problema de negócio, quem sofre, desde quando, por que agora>
**Resultado esperado:** <1 frase>
**Fora de escopo:** <explícito>

## 2. Personas e casos de uso
| Persona/papel | O que faz hoje | O que fará depois | Frequência |
|---|---|---|---|

## 3. Requisitos funcionais
### RF-01 — <nome curto>
- **Descrição:** <…>
- **Ator:** <…> · **Gatilho:** <…> · **Resultado:** <…>
- **Regras de negócio:** <…>
- **Critérios de aceite:**
  - [ ] Dado <contexto>, quando <ação>, então <resultado observável>
- **Exceções e casos-limite:** <dado vazio, duplicado, sem permissão, erro…>
- **Origem:** <chamado §x | pergunta P1-n da reunião @hh:mm>
- **Pendências:** ❓ TBD — <pergunta>, dono <…>, prazo <…>

*(repetir por requisito)*

## 4. Requisitos não funcionais
| # | Categoria | Requisito | Número/limite | Como verificar |
|---|---|---|---|---|

## 5. Integrações e dependências
| Sistema/pessoa | Sentido | O que troca | Contrato/risco | Dono |
|---|---|---|---|---|

## 6. Dados
| Dado | Origem | Volume estimado | Sensível? | Retenção | Histórico existente |
|---|---|---|---|---|---|

## 7. Permissões e segurança
<quem vê/faz o quê; restrições; trilha de auditoria; LGPD>

## 8. Riscos e efeitos colaterais
| # | Risco/efeito | Quem é afetado | Probabilidade | Impacto | Mitigação | Status |
|---|---|---|---|---|---|---|

## 9. Premissas
- <o que assumimos como verdade — e o que acontece se for falso>

## 10. Questões em aberto
| # | Questão | Por que importa | Dono | Prazo | Status |
|---|---|---|---|---|---|

## 11. Decisões tomadas
| Data | Decisão | Quem decidiu | Evidência (fala/trecho) |
|---|---|---|---|

## 12. Critérios de sucesso e aceite
| Métrica | Hoje | Meta | Como medir | Quem valida |
|---|---|---|---|---|

## 13. Rastreabilidade
| Requisito | Origem (chamado/pergunta/checklist) | Evidência |
|---|---|---|

## 14. Glossário
| Termo | Definição acordada com o cliente |
|---|---|

---
## ⏱️ Antes de sair da reunião
- [ ] Todo RF tem critério de aceite
- [ ] Fora de escopo dito em voz alta
- [ ] Casos-limite centrais definidos
- [ ] Efeitos colaterais varridos (dados, relatórios, permissões, contrato, operação)
- [ ] Toda pendência com dono e prazo
- [ ] Recapitulação confirmada pelo cliente
```

---

## Template 3 — `03_cobertura_reuniao.md`

```markdown
# Cobertura da reunião — <caso>

**Reunião:** <data> · **Duração:** <…> · **Transcrição:** 00_entrada/<arquivo>
**Itens planejados:** <n> pontos do dossiê + <n> itens de checklist (**checklist: <do time | padrão>**)

## Placar
| Métrica | Resultado |
|---|---|
| Cobertura dos pontos P1 do dossiê | <x/n> (<%>) |
| Cobertura dos P2 | <%> |
| Cobertura dos itens [E] da checklist | <%> |
| Itens emergentes (não planejados) | <n> |
| Decisões registradas | <n> |
| Pendências com dono e prazo | <n> |

## Matriz de cobertura — pontos do dossiê
| # | Item planejado | P | Status | Evidência (trecho/timestamp) | Qualidade da resposta |
|---|---|---|---|---|---|
| P1-1 | <…> | P1 | Coberto | "[hh:mm] <fala>" | suficiente |

*Status: Coberto · Parcial · Não coberto · Emergente · Não verificável. Sem trecho citado → `Não coberto`; `Não verificável` só para transcrição ilegível/truncada.*

*Checklist do time **sem marcadores**: todos os itens contam como `[E]` — declare essa decisão aqui.*

## Matriz de cobertura — checklist do time (<n> itens)
*Uma matriz por fonte de checklist. Nunca some a do time com o complemento embutido.*
| # | Item | Marcador | Status | Evidência (trecho/timestamp) | Observação |
|---|---|---|---|---|---|

## Matriz de cobertura — complemento embutido (se houver)
*Checklists longas: publique o roll-up por bloco e mantenha a matriz item a item no apêndice ou em arquivo próprio.*
| Bloco | Itens `[E]` | Itens `[I]` | Itens `[T]` | Coberto | Parcial | Não coberto | Observação |
|---|---|---|---|---|---|---|---|

## Perguntas: feitas, não feitas, mal feitas
**Melhores perguntas da reunião:** <3, com evidência>
**Perguntas não feitas (P1/P2):** <lista com o impacto de não ter perguntado>
**Perguntas a refazer:** <pergunta original → como reformular>
**Padrões a corrigir:** <induzida | fechada demais | empilhada | de solução — com exemplo>

## Itens emergentes
| # | O que apareceu | Quem trouxe | Por que importa | Virou requisito? |
|---|---|---|---|---|

## Sinais de risco observados
| # | Sinal | Evidência | Consequência se não tratado | Ação |
|---|---|---|---|---|

## Lacunas priorizadas
| # | Lacuna | Tipo (método/conteúdo) | Impacto se chegar ao desenvolvimento | Dono | Prazo |
|---|---|---|---|---|---|

## Avaliação da condução (para o participante)
**Funcionou bem:** <…>
**Faltou:** <…>
**Faria diferente:** <…>
```

---

## Template 4 — `04_qualificacao_documento.md` (**interno, para o líder**)

*Não escreva aqui a mensagem ao participante — ela vai no Template 5, em arquivo separado.*

```markdown
# Qualificação do documento de requisitos — <caso>

**Documento avaliado:** 00_entrada/<arquivo> · **Participante:** <nome>
**Data da reunião:** <…> · **Condições:** <duração, decisor presente?, qualidade das respostas>
**Avaliado em:** <AAAA-MM-DD> · **Rubrica:** RUBRICA_QUALIFICACAO.md

## Nota

| Critério | Peso | Nota (0–5) | Pontos | Evidência |
|---|---|---|---|---|
| C1 Completude e aderência | 20 | <n> | <n×4> | <trecho/ausência> |
| C2 Clareza | 15 | <n> | <n×3> | <…> |
| C3 Testabilidade | 20 | <n> | <n×4> | <…> |
| C4 Riscos e não-funcionais | 15 | <n> | <n×3> | <…> |
| C5 Rastreabilidade | 15 | <n> | <n×3> | <…> |
| C6 Estrutura e escopo | 15 | <n> | <n×3> | <…> |
| **Global** | **100** | | **<0–100>** | **Faixa: <…>** |

**Travas:** <nenhum critério ≤1 | P1 em aberto: <n> | requisito central sem critério de aceite: <n>>

## ✅ O que está bom
- <ponto + trecho>

## ⚠️ O que está ruim / frágil
- **<problema>** — critério C<n>. *Efeito:* <…>. *Como corrigir:* <…>.

## 🕳️ O que faltou
| # | O que faltou | Onde deveria estar | Impacto | Prioridade |
|---|---|---|---|---|

## 🔍 O que não foi explorado
| # | Pergunta não feita / não registrada | Por que importa | Dono | Prazo |
|---|---|---|---|---|

## 🛠️ Lacuna de método × conteúdo
**Método (ensinar agora):** <…>
**Conteúdo (perguntar ao cliente):** <…>

## 🎯 Plano de desenvolvimento (máx. 3)
1. <ação observável> — *feito quando:* <critério>
2. …

## 📋 Checklist para "pronto"
- [ ] <o que falta para subir de faixa>
```

---

## Template 5 — `05_feedback_participante.md` (**pode ir para o participante**)

*Só o que ele pode ler: notas, evidências do próprio documento e da transcrição, método e próximos passos. Nada do documento ideal, nada do Apêndice A, nenhuma resposta pronta de conteúdo — conteúdo volta como pergunta ao cliente.*

```markdown
# Feedback — <caso>

**Para:** <participante> · **De:** <líder> · **Data:** <AAAA-MM-DD>
**Documento avaliado:** <arquivo> · **Nota:** <0–100> (<faixa>)

## ✅ O que está bom
- <ponto + trecho>

## ⚠️ O que está frágil (com o critério afetado)
- **<problema>** — critério C<n>. *Efeito:* <…>. *Como corrigir:* <…>.

## 🕳️ O que faltou
| # | O que faltou | Onde deveria estar | Impacto | Prioridade |
|---|---|---|---|---|

## 🔍 O que não foi explorado
| # | Pergunta não feita / não registrada | Por que importa | Dono | Prazo |
|---|---|---|---|---|

## 🎯 Plano de desenvolvimento (máx. 3)
1. <ação observável> — *feito quando:* <critério>

## ▶️ O que fazer agora
- <as 2–3 perguntas que ele mesmo envia ao cliente, com dono e prazo>
```

---

## Template 6 — `_interno/06_documento_ideal.md` ⛔

```markdown
> ⛔ **DOCUMENTO INTERNO — NÃO COMPARTILHAR COM O PARTICIPANTE.**
> Uso exclusivo do líder/mentor, para coaching e para calibrar o padrão de qualidade.
> Compartilhar este conteúdo (ou qualquer resumo dele) com quem escreve o documento
> de requisitos anula o objetivo de desenvolvimento do programa.

# Documento de requisitos — versão ideal (interna) — <caso>

**Base:** <chamado + documentação + transcrição + documento do participante>
**Gerado em:** <data> · **Revisão após reunião:** <data>
**Perguntas ainda dependentes do cliente:** <n> *(deve bater com o número de linhas do Apêndice B)*

<mesma estrutura do Template 2, porém completa: todo requisito com critério de aceite
testável, exceções explícitas, efeitos colaterais com mitigação, não-funcionais com
número, rastreabilidade total, log de decisões e premissas>

## Apêndice A — Diferenças-chave vs. documento do participante (calibração interna — **não citar ao participante**)
| # | Tema | No documento do participante | No ideal | Lacuna | Tipo | Como cobrar |
|---|---|---|---|---|---|---|
| 1 | <…> | <…> | <…> | <…> | método/conteúdo | <método → o que ensinar; conteúdo → qual pergunta devolver ao cliente> |

## Apêndice B — Perguntas que ainda dependem do cliente
| # | Pergunta | Por que ninguém respondeu ainda | Dono | Prazo | Resposta proposta (a validar) |
|---|---|---|---|---|---|

## Apêndice C — Padrões a reforçar no time
<2–5 padrões recorrentes vistos neste caso, para virar item de treinamento ou de checklist>
```
