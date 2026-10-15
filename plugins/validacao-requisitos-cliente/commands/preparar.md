---
description: Fase 1 — monta o dossiê pré-reunião a partir do chamado e da documentação do sistema, com o pedido separado em necessidade/desejo/restrição, perguntas priorizadas (P1/P2/P3) e a varredura dos 14 eixos de efeitos colaterais.
argument-hint: [chamado, link ou pasta do caso]
---

Caso: $ARGUMENTS

Siga a skill `validacao-requisitos-cliente` — fase `preparar` (referência de execução, §1).

1. Localize (ou crie) a raiz do caso em `validacao-clientes/<AAAA-MM-DD>-<slug-do-chamado>/`, com `00_entrada/` dentro. Se `$ARGUMENTS` não identificar o chamado, **pergunte antes de gerar**.
2. Reúna as entradas em `00_entrada/`: chamado, documentação do sistema e, se houver, a checklist do time. Leia de onde estiverem e copie para lá — **nunca edite** o que já está em `00_entrada/`.
3. Se existir `00_entrada/checklist*`, ela é a fonte de verdade; sem marcadores `[E]/[I]/[T]`, todos os itens contam como `[E]`.
4. Escreva `01_dossie_pre_reuniao.md` no formato da referência de entrega (Template 1). A varredura dos **14 eixos é obrigatória**: todos aparecem, atingidos ou não, com gravidade e pergunta de confirmação.
5. Feche com 3 a 6 linhas: o que gerou, as lacunas mais graves e a próxima ação. Não cole o dossiê inteiro no chat.
