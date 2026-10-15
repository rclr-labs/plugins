# RUBRICA_QUALIFICACAO.md — Qualidade do documento de requisitos

Instrumento de **desenvolvimento**, não de avaliação de desempenho formal. Objetivo: dar nota comparável ao longo do tempo e, principalmente, dizer **o que fazer diferente na próxima**.

## Como pontuar

1. Dê **nota inteira de 0 a 5 por critério**, com o descritor correspondente (a nota global pode ter 1 decimal — ela vem da média ponderada).
2. **Nota global 0–100** = Σ (nota ÷ 5 × peso) dos 6 critérios.

| # | Critério | Peso | O que mede |
|---|---|---|---|
| C1 | Completude e aderência ao pedido | 20 | O documento responde ao chamado inteiro — e ao problema real, não só à solução pedida |
| C2 | Clareza e ausência de ambiguidade | 15 | Dá para ler e saber exatamente o que fazer, sem interpretar |
| C3 | Testabilidade (critérios de aceite) | 20 | Cada requisito pode ser verificado por um teste objetivo |
| C4 | Riscos, efeitos colaterais e não-funcionais | 15 | Impactos em volta, exceções, volume, segurança, operação |
| C5 | Rastreabilidade e evidências | 15 | Dá para ligar requisito → origem → decisão/quem falou |
| C6 | Estrutura, escopo e fora de escopo | 15 | Organização, escopo declarado, premissas, questões abertas |

---

## Descritores

### C1 · Completude e aderência ao pedido (peso 20)
| Nota | Descritor |
|---|---|
| 0 | Não trata o pedido, ou trata outro assunto |
| 1 | Cita o pedido, mas não cobre nenhum caso de uso concreto |
| 2 | Cobre o caminho feliz central; ignora a maior parte das necessidades levantadas |
| 3 | Cobre o essencial do pedido; faltam partes relevantes do chamado ou do problema real |
| 4 | Cobre o pedido e a necessidade real; lacunas pontuais e identificadas |
| 5 | Cobre pedido, necessidade real, exceções centrais e critério de sucesso, sem lacuna relevante |

### C2 · Clareza e ausência de ambiguidade (peso 15)
| Nota | Descritor |
|---|---|
| 0 | Texto ininteligível ou contraditório |
| 1 | Frases genéricas ("melhorar o processo") que não permitem qualquer decisão |
| 2 | Ideia compreensível, mas termos vagos ("rápido", "amigável", "intuitivo") sem definição |
| 3 | Compreensível; alguns pontos admitem duas leituras diferentes |
| 4 | Claro; 1–2 ambiguidades menores que não mudam o esforço |
| 5 | Sem ambiguidade: atores, gatilhos, estados e resultados nomeados; termos de negócio definidos |

### C3 · Testabilidade (peso 20)
| Nota | Descritor |
|---|---|
| 0 | Nenhum requisito com forma verificável |
| 1 | Requisitos como "deve funcionar bem" — impossível testar |
| 2 | Alguns requisitos verificáveis; a maioria sem critério de aceite |
| 3 | Maioria dos requisitos centrais com critério de aceite; casos-limite sem |
| 4 | Todos os requisitos relevantes com critério de aceite testável; faltam 1–2 exceções |
| 5 | Todo requisito com critério de aceite objetivo, incluindo exceções, erro e dado vazio; dá para escrever o teste a partir do documento |

### C4 · Riscos, efeitos colaterais e não-funcionais (peso 15)
| Nota | Descritor |
|---|---|
| 0 | Nenhuma menção a impacto |
| 1 | Menciona risco de forma genérica, sem consequência |
| 2 | Reconhece 1–2 impactos óbvios; ignora relatórios, permissões, dados, operação |
| 3 | Cobre os impactos principais do fluxo afetado; não-funcionais superficiais |
| 4 | Cobre impactos, exceções e alguns não-funcionais com número/limite |
| 5 | **Os 14 eixos** do catálogo de [REFERENCE.md](execucao.md) §6 varridos e registrados (atingido/não atingido), com gravidade, mitigação e pergunta de confirmação para cada atingido |

### C5 · Rastreabilidade e evidências (peso 15)
| Nota | Descritor |
|---|---|
| 0 | Não se sabe de onde saiu nada |
| 1 | Origem citada de forma vaga ("segundo o cliente") |
| 2 | Liga ao chamado, mas não a trechos da reunião nem a decisões |
| 3 | Liga cada requisito à origem (chamado/pergunta) na maioria dos casos |
| 4 | Rastreabilidade completa requisito → origem; decisões registradas com quem decidiu |
| 5 | Rastreabilidade completa + citação literal das falas e decisões + distinção explícita entre fato, inferência e pendência |

### C6 · Estrutura, escopo e fora de escopo (peso 15)
| Nota | Descritor |
|---|---|
| 0 | Texto corrido sem seções, sem noção de escopo |
| 1 | Seções desorganizadas; não se sabe o que entra e o que não entra |
| 2 | Estrutura básica; sem fora de escopo, premissas ou questões abertas |
| 3 | Estrutura utilizável; escopo razoável; sem fora de escopo explícito |
| 4 | Bem estruturado, com fora de escopo e questões abertas |
| 5 | Estrutura completa: escopo e não-escopo, premissas, questões abertas com dono, log de decisões, glossário |

---

## Faixas e o que liberam

| Nota global | Faixa | Leitura |
|---|---|---|
| 0–39 | **Insuficiente** | Não é requisito ainda: é anotação de reunião. Refazer com o método |
| 40–59 | **Frágil** | Base existe, mas entregar assim gera retrabalho. Rodada de correção obrigatória |
| 60–74 | **Aceitável com ressalvas** | Serve para começar com acompanhamento próximo do líder nas partes frágeis |
| 75–89 | **Bom** | Pronto para revisão leve antes do desenvolvimento |
| 90–100 | **Pronto para desenvolvimento** | Pode ir para o time; nenhuma pergunta P1 em aberto |

**Trava de segurança:** independentemente da nota global, o documento **não** é considerado pronto se: (a) qualquer critério individual ficou ≤ 1; (b) existe pergunta P1 **do dossiê ou da checklist** sem resposta nem dono; (c) algum requisito central não tem critério de aceite; (d) a varredura dos 14 eixos não está registrada no documento (C4).

## Regras de calibração

- **Não infle por esforço, tamanho ou boa redação.** Documento longo não é documento completo.
- **Não desconte por estilo ou português**, exceto quando a escrita gerar ambiguidade (aí pontua em C2, não em C6).
- **Ausência de seção = 0 naquele critério**, mesmo que o resto esteja bom.
- **Toda nota cita evidência**: o trecho que a justifica ou a ausência dele ("não há nenhum critério de aceite em RF-03…RF-11").
- **Cruze com a cobertura (fase 3):** pergunta feita e respondida na reunião que não virou requisito é falha do documento (desconta em C1/C5). Pergunta **não** feita na reunião e **não** registrada como pendência é falha dupla (desconta em C5/C6).
- **Não mede o participante isolado do contexto:** registre as condições da reunião (tempo, presença do decisor, qualidade das respostas) junto da nota, para comparar maçãs com maçãs.

## Feedback estruturado (saída da fase 4)

A fase 4 gera **dois arquivos**: `04_qualificacao_documento.md` (**interno** — notas, evidências, travas, plano) e `05_feedback_participante.md` (**pode ir para o participante** — só o que ele pode ler). Nada do documento ideal, nem do Apêndice A, entra no arquivo do participante.

Ordem fixa, sempre com evidência:

1. **✅ O que está bom** — 3 a 5 pontos concretos, com o trecho. Comece por aqui e seja específico ("os critérios de aceite de RF-02 estão testáveis").
2. **⚠️ O que está ruim / frágil** — o problema + o critério da rubrica que ele fere + como corrigir. Evite adjetivos: mostre o efeito ("'processar rapidamente' não permite dizer quando está pronto").
3. **🕳️ O que faltou** — lista priorizada do que o documento deveria cobrir e não cobre, com o impacto.
4. **🔍 O que não foi explorado** — perguntas que a reunião não fez e o documento não registra como abertas; aqui entra a maior parte dos efeitos colaterais e casos-limite.
5. **🛠️ Lacuna de método × lacuna de conteúdo** — separe explicitamente: método você ensina agora; conteúdo volta como pergunta ao cliente (com dono e prazo).
6. **🎯 Plano de desenvolvimento** — no máximo 3 ações observáveis para a próxima reunião/documento, com o critério de "feito" de cada uma.
7. **📋 Checklist para "pronto"** — o que exatamente falta para o documento atingir a faixa seguinte.

## Histórico de desenvolvimento (recomendado)

É o instrumento que mede se a dependência dos líderes está caindo. Registre uma linha por qualificação em `validacao-clientes/_historico/qualificacoes.md` — **com as métricas** que o [README.md](../../../README.md) promete:

```md
| Data | Caso | Participante | Condições (min, decisor presente) | Cobertura P1 | Itens [E] cobertos | Nota | Faixa | C1 | C2 | C3 | C4 | C5 | C6 | Rodadas de revisão do líder | Foco da próxima |
|------|------|--------------|-----------------------------------|--------------|--------------------|------|-------|----|----|----|----|----|----|-----------------------------|-----------------|
```

- **Cobertura P1**: do relatório de cobertura (fase 3) — `cobertos / total de P1`.
- **Rodadas de revisão**: quantas vezes o líder devolveu o documento antes de aceitar.
- Sem essas colunas o histórico não prova evolução e o programa não mede o próprio resultado.

Serve para o líder mostrar evolução real e para o time medir se a dependência dos dois líderes está caindo.
