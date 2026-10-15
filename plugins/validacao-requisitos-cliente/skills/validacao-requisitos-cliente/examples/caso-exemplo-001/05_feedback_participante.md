# Feedback — chamado #4821 (Cliente Exemplo Ltda.)

> ✅ Arquivo **seguro para o participante**: contém apenas notas, evidências do próprio documento/transcrição, método e próximos passos. Não contém nada derivado do documento ideal.

**Para:** Júlia · **De:** <líder> · **Data:** 2026-10-14
**Documento avaliado:** 00_entrada/documento-participante.md (v0.1) · **Nota:** 36/100 (Insuficiente) · **Meta da próxima:** 60+

## ✅ O que está bom
- **Objetivo ancorado na dor, não na solução:** "hoje o processo é manual e demora dois dias por mês" — é assim que um requisito começa.
- **Os três pedidos do chamado foram capturados** (relatório, exportação, envio semanal), sem perder nada do que o cliente pediu.
- **Você registrou as próprias dúvidas** ("não entendi bem o que é" o relatório mensal; contratos sem SLA; painel sem uso). Reconhecer o que não se sabe é o comportamento certo — o ajuste é dar destino a isso (ver abaixo).
- Na condução: abriu pelo processo atual em vez de discutir a solução e recapitulou no fim com confirmação do cliente.

## ⚠️ O que está frágil (com o critério da rubrica)
| # | Problema | Critério | Efeito | Como corrigir |
|---|---|---|---|---|
| 1 | Critério de aceite não testável ("carregar rápido", "dados corretos") | C3 Testabilidade | ninguém sabe dizer quando o requisito está pronto | use "dado… quando… então…" |
| 2 | "SLA de cada contrato" não define o número | C1 Completude | o requisito é inespecificável; cada um implementa uma coisa | pergunte qual coluna da planilha ele olha primeiro |
| 3 | Observações valiosas sem tratamento (relatório mensal, contratos sem SLA, painel) | C5 Rastreabilidade | pistas de alto valor ficam registradas e se perdem | toda observação vira linha em "questões em aberto" com dono e prazo |
| 4 | "Fora de escopo: não sei ainda" | C6 Estrutura | escopo aberto por definição | declare ao menos o que **não** entra |
| 5 | Nenhum requisito não-funcional | C4 Riscos | o primeiro envio com 12 mil contratos provavelmente estoura o limite do anexo | registre volume e limites |

## 🕳️ O que faltou
| # | O que faltou | Onde deveria estar | Impacto | Prioridade |
|---|---|---|---|---|
| 1 | Efeito do número no relatório mensal enviado ao cliente (com multa contratual) | riscos/integrações | risco contratual | P1 |
| 2 | Regra para contratos antigos sem SLA cadastrado (~18%) | regras de negócio | parte da base invisível | P1 |
| 3 | Quem recebe o e-mail e o que cada um pode ver | requisitos/permissões | vazamento entre carteiras / LGPD | P1 |
| 4 | Volume, limite de linhas e de anexo | não-funcionais | entrega não funciona no tamanho real | P1 |
| 5 | Métrica de sucesso mensurável | critérios de sucesso | impossível validar | P2 |

## 🔍 O que não foi explorado
| # | Pergunta não feita / não registrada | Por que importa | Dono | Prazo |
|---|---|---|---|---|
| 1 | "Isso depois vai no relatório mensal que vocês mandam pro cliente — me conta mais sobre isso." (pista em [00:15]) | pode mudar o cálculo e criar obrigação contratual | Júlia → Carlos/Compliance | 48h |
| 2 | "O painel existe e ninguém usa. O que falta nele?" ([00:29]) | pode transformar "novo relatório" em "corrigir o painel" | Júlia → Sandra | 48h |
| 3 | "Qual o volume por semana e o que fazer se passar de 50 mil linhas?" | viabilidade da exportação | Júlia → TI | 1 semana |
| 4 | "O que fica de fora desta entrega?" | contenção de escopo | Júlia → Carlos | 48h |
| 5 | "Como isso é desligado se der problema?" | operação/rollback | Júlia → TI | 1 semana |

## 🎯 Plano de desenvolvimento (máx. 3)
1. **Reescrever os três requisitos com critério de aceite testável** — *feito quando:* nenhum critério usar "rápido", "correto", "amigável" ou "bom".
2. **Converter as três observações em questões abertas com dono e prazo** e enviá-las ao cliente em até 48h — *feito quando:* as três tiverem dono nomeado e data.
3. **Antes da próxima reunião, varrer o bloco H (impactos) da checklist** — *feito quando:* a próxima transcrição tiver ao menos 3 perguntas desse bloco.

## ▶️ O que fazer agora (você mesmo envia ao cliente)
1. "Qual número exatamente deve aparecer — % de cumprimento, tempo médio, quantidade de estouros? Por serviço ou por contrato?"
2. "Esse número aparece no relatório mensal enviado ao cliente? O que acontece se ele mudar?" (dono: Compliance, via Carlos)
3. "Quem recebe o e-mail e cada um vê só a própria carteira?"

> Nota 36/100 é ponto de partida, não veredito: ela mede o documento, não você. O caminho para 60+ está nas três ações acima.
