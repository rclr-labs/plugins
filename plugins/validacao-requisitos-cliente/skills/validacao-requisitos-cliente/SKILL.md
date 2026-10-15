---
name: validacao-requisitos-cliente
description: Prepara um participante júnior para a reunião de validação de requisitos com o cliente a partir de um chamado, gera o esqueleto do documento de requisitos, avalia a cobertura da transcrição contra os pontos planejados e a checklist de entrevista, qualifica o documento escrito pelo participante com rubrica 0–5 por critério e nota global 0–100 mais feedback estruturado, e produz o documento ideal interno que NÃO é compartilhado. Use when the user mentions "chamado do cliente", "reunião de validação", "preparar reunião com o cliente", "checklist de entrevista", "transcrição da reunião", "documento de requisitos", "qualificar documento de requisitos", "gaps e efeitos colaterais do pedido", or asks to prepare a junior for client requirements elicitation.
---

# Validação de Requisitos com o Cliente

Operacionaliza o ciclo **chamado → preparação → reunião → documento → feedback** para que o participante júnior conduza a validação com pouca dependência dos líderes. A regra que governa tudo: **o participante aprende fazendo; o documento ideal existe para o mentor, nunca para o participante.**

O que a skill precisa e como fornecer: [ENTRADAS.md](references/entradas.md). Detalhe de execução de cada fase: [REFERENCE.md](references/execucao.md). Formatos de saída: [TEMPLATES.md](references/formato-entrega.md). Checklist de entrevista: [CHECKLIST_ENTREVISTA.md](references/checklist-entrevista.md). Escala de qualidade: [RUBRICA_QUALIFICACAO.md](references/rubrica-qualificacao.md). Caso resolvido de ponta a ponta: [examples/caso-exemplo-001/](examples/caso-exemplo-001/).

## Subcomandos

| Subcomando | Fase | Entradas | Produz |
|---|---|---|---|
| `preparar` | 1 · Pré-reunião | chamado + documentação do sistema + checklist | `01_dossie_pre_reuniao.md` |
| `esqueleto` | 2 · Pré-reunião | dossiê (ou as mesmas entradas) | `02_esqueleto_requisitos.md` |
| `avaliar` | 3 · Pós-reunião | transcrição + dossiê + checklist | `03_cobertura_reuniao.md` |
| `qualificar` | 4 · Pós-reunião | documento do participante (+ cobertura) | `04_qualificacao_documento.md` (líder) **+** `05_feedback_participante.md` (participante) |
| `ideal` | 5 · Interno | tudo acima | `_interno/06_documento_ideal.md` |
| `completo` | 1→5 | o que existir | encadeia as fases com entrada disponível |

Sem subcomando explícito, identifique a fase pelo material que o usuário trouxe (chamado → `preparar`; transcrição → `avaliar`; documento pronto → `qualificar`) e **confirme antes de gerar**.

## Quick start

1. Determine a **raiz do caso**: `validacao-clientes/<AAAA-MM-DD>-<slug-do-chamado>/` (pergunte o slug se não for óbvio; crie a pasta).
2. Reúna as entradas em `00_entrada/` — contrato completo em [ENTRADAS.md](references/entradas.md): **chamado** (fase 1), **documentação do sistema** + **checklist do time** (fases 1–3), **transcrição** (fase 3) e **documento do participante** (fase 4). Aceita texto colado, print, link ou arquivo em qualquer pasta — copie para `00_entrada/` para manter o rastro; nunca edite o que está lá.
3. **Contrato da checklist** (detalhe em [REFERENCE.md](references/execucao.md) §0.4):
   - Sem checklist do time → a embutida é a fonte de verdade.
   - Com `00_entrada/checklist*` → a do time é a fonte de verdade; a embutida entra como **complemento**, e as duas são reportadas **separadamente**, nunca somadas.
   - Checklist do time **sem marcadores** `[E]/[I]/[T]`: todos os itens contam como `[E]` — a menos que o arquivo marque explicitamente o contrário.
4. Execute a fase seguindo [REFERENCE.md](references/execucao.md) e escrevendo exatamente a estrutura de [TEMPLATES.md](references/formato-entrega.md).
5. Ao terminar, reporte em 3–6 linhas: o que foi gerado, as lacunas mais graves e a próxima ação. Não cole o dossiê inteiro no chat.

```
00_entrada/                       # material bruto — a skill nunca edita
01_dossie_pre_reuniao.md          # → participante
02_esqueleto_requisitos.md        # → participante
03_cobertura_reuniao.md           # → líder
04_qualificacao_documento.md      # → líder
05_feedback_participante.md       # → participante (seguro de compartilhar)
_interno/06_documento_ideal.md    # ⛔ nunca sai daqui
```

## Regras invioláveis

1. **⛔ `_interno/` nunca é compartilhado — e a pasta do caso nunca é entregue inteira.** O que pode ir para quem escreve o documento: `01`, `02` e `05`. Nada de `03`, `04` ou `_interno/`, nem trecho, nem resumo, nem "dica" derivada.
2. **Separe as sessões.** O documento ideal (fase 5) é gerado em contexto/sessão de líder, **depois** de encerrado o atendimento ao participante. Não gere o ideal e continue ajudando o mesmo participante no mesmo contexto.
3. **O feedback vem de `03` e `04`, não do ideal.** O Apêndice A do documento ideal é calibração interna: o líder pode usá-lo para decidir **o que cobrar**, mas não pode citá-lo, copiá-lo nem transformá-lo em resposta pronta. Diferença de **método** vira ensinamento; diferença de **conteúdo** vira pergunta ao cliente.
4. **Evidência ou não conta.** Na fase 3, toda classificação precisa citar trecho da transcrição (com timestamp quando houver). Sem evidência → `Não coberto` (nunca "provavelmente coberto"); `Não verificável` é reservado para transcrição ilegível ou truncada.
5. **Fato ≠ inferência.** Marque a origem de cada afirmação: `FATO (fonte: …)`, `INFERÊNCIA`, `LACUNA`, `CONFLITO`, `DÚVIDA`. Não invente documentação, números, nomes de sistema ou volumes.
6. **Lacuna vira pergunta, não suposição.** Toda lacuna recebe pergunta, prioridade (P1/P2/P3), dono e o que seria uma resposta boa.
7. **O pedido não é o requisito.** Separe sempre o que o cliente pediu, o que ele precisa, o que ele imagina como solução e o que isso quebra em volta.
8. **Efeitos colaterais são varredura obrigatória, não inspiração.** Os 14 eixos de [REFERENCE.md](references/execucao.md) §6 são percorridos um a um, com o resultado registrado (atingido/não atingido) — inclusive depois da reunião, para o que emergir.
9. **Nota é desenvolvimento, não punição.** Toda nota da rubrica vem com evidência e com o que fazer diferente na próxima; não infle por esforço nem desconte por estilo.
10. **Não prometa nada pelo time.** O dossiê e o esqueleto nunca fixam prazo, preço, compromisso de escopo ou data de entrega.

## Agnóstico por construção

- **Ferramenta de chamado:** nenhuma integração obrigatória (Jira, Taskier, GLPI, e-mail, planilha, print — tudo vale como texto de entrada).
- **Documentação:** Markdown, PDF convertido, wiki exportada, diagrama descrito, código ou transcrição de conversa com o time. Se faltar, marque tudo como "não verificado na documentação" e eleve as perguntas de contexto.
- **Host de LLM:** instrução declarativa; roda em qualquer agente que leia arquivos e escreva arquivos (Claude Code, Cursor, Codex, DSH).
- **Cliente, stack e domínio:** nada específico de um cliente ou de um produto — o caso é sempre definido pelas entradas em `00_entrada/`.

## Erros comuns e resposta

| Situação | O que fazer |
|---|---|
| Sem transcrição | `avaliar` para e explica o que falta; nunca inferir a reunião |
| Sem documento do participante | `qualificar` para; `avaliar` roda normal (só cobertura) |
| Sem checklist do time | usa a embutida e avisa em uma linha |
| Checklist do time sem marcadores | trata todo item como `[E]` e registra essa decisão no relatório |
| Sem documentação do sistema | dossiê marca "não verificado" e prioriza perguntas de contexto |
| Raiz de casos inexistente | cria |
| Pedido vago demais ("melhorar o sistema") | não gere dossiê antes de 3 perguntas de escopo ao usuário: qual sistema, qual dor, quem pediu |
| Só existe a pasta do caso para entregar | **não** entregue a pasta; entregue os arquivos `01`, `02` e `05` |
