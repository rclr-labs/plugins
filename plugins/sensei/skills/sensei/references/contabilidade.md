# Contabilidade de tokens

Carregue quando o usuário perguntar "quanto economizou", "por que" ou quiser auditar os números. O resumo está no `sensei stats`; este arquivo explica a conta.

## O que é contado

Contamos **tokens de contexto** que a revisão precisa carregar ou escrever: bundle, SKILL.md, leituras extras, slices, relatório e saídas de ferramenta. Não contamos tokens de raciocínio internos do modelo (invisíveis), tempo, chamadas de rede nem custo de CI. Portanto a economia é de tráfego de contexto, não da fatura inteira.

Estimador: `chars / ratio`, com ratio 3.25 (código), 3.35 (diff), 3.8 (markdown), 4.0 (prosa), 3.0 (JSON). Precisão aproximada de ±10%; o percentual de economia é mais estável que o valor absoluto.

## Baseline declarado (revisão convencional completa)

| Etapa | Constante | Como entra |
|---|---|---|
| ler cada arquivo alterado por inteiro | cap 40k tok/arquivo, 400k total | `baseline.fullFilesTokens` |
| ler imports de 1º grau | cap 30 arquivos | `baseline.importsTokens` |
| ler até 5 call sites por símbolo alterado | 120 tok por call site | `baseline.callersBaselineTokens` |
| varrer padrões de risco por arquivo fonte | 450 tok/arquivo, máx 20 | `baseline.patternBaselineTokens` |
| relatório verboso | 300 + 100 tok/achado | `baseline.report` |
| prompt do usuário | 80 tok | `baseline.prompt` |

`baseline.total = fullFiles + imports + callers + patterns + report + prompt`

O baseline é **conservador de propósito**: não inclui 2 hops de dependência, suíte de testes inteira, múltiplas passadas de agente nem ida-e-volta de correção. Uma revisão "completa" de verdade costuma gastar mais.

## Real medido no run

| Componente | Origem |
|---|---|
| `diff` | header + lista de arquivos + diff enviado no bundle |
| `signals` | bloco de sinais determinísticos |
| `orient` | índice de callers + testes + comando |
| `report` | 30 + 42 tok/achado, ou o arquivo real se `--report` foi usado |
| `skill` | tamanho do SKILL.md carregado |
| `reads` | arquivos declarados em `--reads` (cap 40k cada) |
| `slices` | contexto extra via `sensei slice`, somado do log do run |
| `tool` | 140 tok fixos (resumo do collect + recibo do record) |
| `prompt` | 80 tok |
| `fanout` | `(--agents - 1) × (diff + signals + orient)` — zero fora do modo `fundo` |

`actual.total = diff + signals + orient + report + skill + reads + slices + tool + prompt + fanout`

## Atribuição por mecanismo

`saved = baseline.total - actual.total`

- `diff_slicing = fullFiles - diff` (arquivos inteiros evitados)
- `signal_prefilter = patterns - signals` (varredura trocada por regex determinística)
- `caller_index = callers - orient` (índice de contagens no lugar de ler call sites)
- `dependency_pruning = imports` (imports de 1º grau não lidos)
- `report_compression = report_baseline - report_real` (relatório compacto)
- `extra_reads = -(reads + slices)` (custo de contexto extra)
- `protocol_overhead = -(skill + tool)` (custo do protocolo)
- `fanout_especialistas = -(passadas - 1) × (diff + signals + orient)` (modo `fundo`: cada especialista e o verificador releem o bundle)

A soma dos oito é exatamente `saved`; o `record` falha se não fechar (`atribuicao inconsistente`).

## Por que economiza (leitura rápida)

1. **Escopo**: o modelo lê hunks com contexto, não arquivos inteiros. É a maior alavanca em repos normais.
2. **Pré-filtro**: o que é determinístico (regex, contagem de call sites, lista de testes) roda no script, de graça em tokens.
3. **Índice em vez de conteúdo**: saber que `searchUsers` tem 7 callers custa ~5 tokens; ler os 7 custa centenas.
4. **Saída compacta**: 1–2 linhas por achado, sem resumo, elogio ou repetição do diff.
5. **Sem re-leitura**: linhas e snippets já vêm numerados; `slice` só quando falta uma guarda.

Custos que entram contra: o SKILL.md (~0.8k), as saídas do CLI e qualquer leitura extra. Em diffs minúsculos a economia pode ser zero ou negativa — o `stats` mostra isso sem esconder.

## O preço do modo `fundo`

O modo `fundo` despacha um especialista por dimensão e um verificador independente. Cada um **relê o bundle**, então o custo de contexto é aproximadamente `passadas × bundle`, não `bundle`.

Com 4 especialistas + 1 verificador sobre um bundle de 15k, o real medido passa de ~16k para ~75k: a economia vira **−400%** e o `stats` mostra isso na linha `fanout_especialistas`. Não é defeito de medição — é o preço da arquitetura, e ele precisa aparecer para que a decisão de usá-la seja consciente.

Informe o número real de passadas no `record --agents N`. Omitir o `--agents` registra o run como passada única e **subestima o custo**, que é a única forma de a conta mentir.

## Quando os números enganam

- **Diff pequeno em arquivos pequenos**: o protocolo custa ~1k; pode não compensar.
- **Diff gigante truncado**: o bundle omite contexto; a economia sobe, a cobertura cai. O manifest marca `truncated` e o bundle lista os omitidos.
- **Mudança de baseline**: mude a versão em `lib/accounting.mjs` (`M.version`) se alterar constantes; registros antigos ficam comparáveis pelo campo `v` do ledger.
- **`--report`**: mede o arquivo real, então relatórios longos reduzem a economia declarada.

## Onde ficam os dados

- `~/.sensei/metrics.jsonl`: um registro por revisão, só números/metadados, sem código.
- `~/.sensei/runs/<id>/bundle.md` e `manifest.json`: últimos 30 runs.
- `SENSEI_HOME` muda a raiz (útil para CI e testes).
- Apagar histórico: remova `metrics.jsonl` (os runs podem ficar).

## Comandos úteis

- `sensei stats` — acumulado, mecanismos, tendência mensal, repos, páginas equivalentes
- `sensei stats --days 30 --last 5` — janela + últimas revisões
- `sensei stats --json` — para dashboard/CI
- `sensei stats --price 3` — estimativa em US$ a US$3/Mtok (opcional; não é a fatura real)
- `sensei why` — resumo da metodologia no terminal

## Como explicar em 3 frases

"Cada revisão lê o diff com contexto em vez do repositório inteiro, e roda a parte determinística em script. Medimos os tokens de contexto do protocolo e comparamos com o baseline declarado de uma revisão completa; a diferença é atribuída por mecanismo. O número é uma estimativa conservadora de tráfego de contexto, não a fatura do modelo."
