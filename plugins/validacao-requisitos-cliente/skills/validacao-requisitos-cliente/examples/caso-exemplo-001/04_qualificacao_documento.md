# Qualificação do documento de requisitos — chamado #4821 (Cliente Exemplo Ltda.)

> ⚠️ EXEMPLO SINTÉTICO gerado pela fase `qualificar` da skill.
> Este relatório é para o **líder/mentor**. O participante recebe apenas o bloco "Feedback ao participante" (sem nada derivado de `_interno/`).

**Documento avaliado:** 00_entrada/documento-participante.md (v0.1) · **Participante:** Júlia
**Data da reunião:** 2026-10-13 · **Condições:** 42 min, decisor ausente, cliente chegou com solução pronta, transcrição disponível
**Avaliado em:** 2026-10-14 · **Rubrica:** RUBRICA_QUALIFICACAO.md

## Nota

| Critério | Peso | Nota (0–5) | Pontos | Evidência |
|---|---|---|---|---|
| C1 Completude e aderência | 20 | 2 | 8 | cobre o caminho feliz (RF-01 a RF-03); não trata a necessidade real declarada ("ver quem está estourando" → decisão), nem o painel existente, nem consumidores |
| C2 Clareza | 15 | 3 | 9 | estrutura compreensível, mas "carregar rápido" e "dados corretos" admitem qualquer leitura |
| C3 Testabilidade | 20 | 1 | 4 | único critério de aceite do documento é "rápido e correto"; RF-02 e RF-03 sem critério algum |
| C4 Riscos e não-funcionais | 15 | 2 | 6 | cita o relatório mensal e os contratos sem SLA nas "observações", sem consequência nem regra; nenhum requisito não-funcional |
| C5 Rastreabilidade | 15 | 1 | 3 | nenhum requisito aponta origem, pergunta ou trecho da reunião |
| C6 Estrutura e escopo | 15 | 2 | 6 | tem objetivo e três requisitos; "fora de escopo: não sei ainda" e nenhuma questão em aberto registrada |
| **Global** | **100** | | **36** | **Faixa: Insuficiente (0–39)** |

**Travas acionadas:** C3 ≤ 1 · 8 perguntas P1 em aberto · 3 de 3 requisitos centrais sem critério de aceite testável → **não é documento de requisitos ainda**; é anotação de reunião com boa intenção.

## ✅ O que está bom
- **Objetivo declarado com a dor, não só a solução:** "hoje o processo é manual e demora dois dias por mês" — ancora o requisito no problema.
- **Os três requisitos do chamado foram capturados** (relatório, exportação, envio semanal), sem perder nenhum pedido explícito.
- **Registrou as próprias dúvidas** nas observações ("não entendi bem o que é" o relatório mensal; contratos sem SLA; painel sem uso). Reconhecer o que não sabe é o comportamento certo — o erro foi deixar isso como nota de rodapé em vez de questão em aberto com dono.

## ⚠️ O que está ruim / frágil
- **Critério de aceite não testável** — critério C3. *Efeito:* ninguém consegue dizer quando o requisito está pronto; o time vai adivinhar. *Como corrigir:* "dado um contrato X e o período Y, o relatório mostra Z% no serviço W, calculado a partir do snapshot de D".
- **"SLA de cada contrato" não define o número** — critério C1. *Efeito:* o requisito é inespecificável; cada leitor implementa uma coisa. *Como corrigir:* voltar ao cliente com a planilha de outubro e perguntar qual coluna é a principal.
- **Fora de escopo entregue como "não sei ainda"** — critério C6. *Efeito:* escopo aberto por definição. *Como corrigir:* registrar ao menos o que **não** entra (ex.: cálculo de SLA em si não muda).
- **Observações valiosas sem tratamento** — critério C5. *Efeito:* a menção contratual do cliente e o painel abandonado ficam registrados sem virar pergunta, decisão ou pendência. *Como corrigir:* transformar cada observação em linha da tabela de questões em aberto, com dono e prazo.
- **Zero requisito não-funcional** — critério C4. *Efeito:* o primeiro envio com 12 mil contratos provavelmente estoura o limite de anexo.

## 🕳️ O que faltou
| # | O que faltou | Onde deveria estar | Impacto | Prioridade |
|---|---|---|---|---|
| 1 | Efeito do número no Relatório Mensal de Conformidade e na cláusula 7.2 (multa) | seção de riscos/integrações | risco contratual com o cliente | P1 |
| 2 | Regra para contratos sem janela de SLA (~18%) | regras de negócio + exceções | 18% da base invisível ou inconsistente | P1 |
| 3 | Destinatário do e-mail e recorte de visibilidade por carteira | requisitos + permissões | vazamento entre carteiras / LGPD | P1 |
| 4 | Volume, limite de 50k linhas e 20 MB de anexo | não-funcionais | entrega não funciona no tamanho real | P1 |
| 5 | Dado pessoal em `EventoAtendimento.descricao` na exportação | privacidade | incidente de LGPD | P1 |
| 6 | Métrica de sucesso mensurável | critérios de sucesso | impossível validar a entrega | P2 |
| 7 | Quem age sobre o "estourando" e quando | casos de uso | o relatório informa, mas ninguém resolve | P2 |
| 8 | Operação: monitoramento do job e como desligar | riscos/operação | falha silenciosa | P3 |

## 🔍 O que não foi explorado
| # | Pergunta não feita / não registrada | Por que importa | Dono | Prazo |
|---|---|---|---|---|
| 1 | "Isso depois vai no relatório mensal que vocês mandam pro cliente — me conta mais sobre isso." (pista dada em [00:15]) | pode alterar o cálculo e criar obrigação contratual | Compliance via Carlos | ❓ |
| 2 | "O painel existe e ninguém usa. O que falta nele?" ([00:29]) | pode transformar "novo relatório" em "corrigir o painel" | Sandra | ❓ |
| 3 | "Qual o volume por semana e o que fazer se passar de 50 mil linhas?" | viabilidade da exportação | TI | ❓ |
| 4 | "O que fica de fora desta entrega?" | contenção de escopo | Carlos | ❓ |
| 5 | "Como isso é desligado se der problema?" | operação/rollback | TI | ❓ |

## 🛠️ Lacuna de método × lacuna de conteúdo
**Método (ensinar agora, sem depender do cliente):**
- Todo requisito sai com critério de aceite no formato "dado / quando / então".
- Toda observação da reunião vira linha em "questões em aberto" com dono e prazo — nada mora em "observações".
- Fechar a reunião com a lista de pendências lida em voz alta.
- Nunca prometer prazo em nome do time.

**Conteúdo (só o cliente responde — não entregar a resposta):**
- Métrica, período e granularidade do SLA.
- Escopo: base inteira ou carteiras.
- Efeito no RMC / cláusula 7.2.
- Destinatário e visibilidade.
- Volume real e comportamento acima do limite.

## 🎯 Plano de desenvolvimento (máx. 3)
1. **Reescrever os três requisitos com critério de aceite testável** — *feito quando:* nenhum critério usar "rápido", "correto", "amigável" ou "bom".
2. **Converter as 3 observações em questões abertas com dono e prazo** e enviá-las ao cliente até 48h após a reunião — *feito quando:* as 3 tiverem dono nomeado e data.
3. **Antes da próxima reunião, varrer o bloco H (impactos) da checklist** e trazer a resposta de "quem mais consome esse número?" — *feito quando:* a próxima transcrição tiver ao menos 3 perguntas do bloco H.

## 📋 Checklist para "pronto"
- [ ] Os 3 requisitos com critério de aceite testável (sai de C3 ≤1)
- [ ] Métrica/período/granularidade definidos → RF-01 especificável
- [ ] Efeito no RMC/cláusula 7.2 respondido ou formalmente pendente com dono
- [ ] Regra dos contratos sem janela definida
- [ ] Destinatário e visibilidade definidos
- [ ] Volume e limites tratados em NFR
- [ ] Fora de escopo declarado
- [ ] Questões em aberto registradas com dono e prazo
- [ ] Rastreabilidade requisito → origem

---

---

## 📨 Mensagem ao participante

Este arquivo é **interno** (líder/mentor): notas, evidências, travas e plano. A versão que **pode ser enviada** a quem escreveu o documento está em `05_feedback_participante.md`, gerada a partir deste relatório e do `03_cobertura_reuniao.md` — **sem nada do `_interno/`** e sem citar o Apêndice A do documento ideal.
