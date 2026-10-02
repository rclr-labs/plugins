---
name: matriz-de-testes
description: Use when the user wants to analyze a large corpus of documents (requirements, user stories, meeting transcripts, specs) to determine critical tests and generate test coverage matrices. Triggers on "matriz de cobertura", "matriz de testes", "gerar casos de teste a partir dos documentos", "quais são os testes críticos", "pairwise", "ciclo de execução de testes", "test coverage matrix from documents". Produces Matriz de Cobertura (md+docx), Ciclo de Execução and an auditable HTML traceability report.
---

# Matriz de Testes

Pipeline de 5 fases que transforma um corpus grande de documentos em matrizes de
teste com rastreabilidade por CT. Pensado para corpus que **não cabe em contexto**:
o contexto principal nunca carrega texto de documento — subagentes leem os
documentos e escrevem linhas estruturadas em disco, e todo raciocínio cruzado
acontece em Python determinístico sobre esses arquivos.

Scripts em `scripts/`, todos com invocação sem argumentos que mostra uso e
próximos passos. Rode cada um da raiz do diretório de trabalho do engajamento.

## Fase 0 — Config do engajamento

Procure `matriz.config.json` no diretório de trabalho. Se não existir, copie
`assets/config.exemplo.json` e preencha com `AskUserQuestion`: `cliente`,
`sistema`, `modulos`, `prefixos` (funcionalidade → sigla de 3 letras),
`ambientes` (em ordem: o 1º é usado para ciclo Funcional, o 2º para Regressão, o
último para Smoke), `data_referencia`.

`recomendar_automacao` (default `false`) liga a recomendação de automação:
9ª coluna na Matriz, tag `@automatizavel` e seção de backlog ordenado no
`rastreabilidade.html`. Como ela acrescenta uma coluna — e o conjunto de colunas
é varrido via API — pergunte antes de ligar em um engajamento que já tenha matriz
publicada. Ver `references/automacao.md`.

Se as funcionalidades ainda não forem conhecidas, deixe `prefixos` vazio, rode as
Fases 1 e 2, e preencha a partir das funcionalidades que os achados revelarem.
`reduce_cts.py` reporta toda funcionalidade sem prefixo como pendência — ela não
entra na matriz em silêncio.

## Fase 1 — Extração

```bash
python3 <skill>/scripts/extract_corpus.py <dir-documentos> --out corpus
```

Converte docx, xlsx, pptx, pdf, html e texto em markdown numerado por linha
(`L142: …`), que é o que dá ao subagente um âncora citável. Emite
`corpus/manifest.toon` com agregados e `corpus/manifest.json`.

**Leia a lista `unparseable[]` na saída e mostre ao usuário.** Vídeo, imagem e
PDF escaneado não são lidos — se um deles for material relevante (uma gravação de
entrevista, por exemplo), o usuário precisa decidir se transcreve antes de
seguir. Descarte silencioso é como um corpus de 400 documentos perde exatamente a
entrevista que importava.

## Fase 2 — Mapeamento (subagentes → ledger em disco)

Divida `corpus/docs/*.md` em lotes de 8 a 12 documentos. Despache **no máximo 4
subagentes concorrentes**. Cada subagente escreve **seu próprio arquivo** —
`ledger/achados/lote-NN.jsonl` — nunca um arquivo compartilhado: subagentes
escrevem via Write, que substitui o arquivo inteiro, então lotes concorrentes se
sobrescreveriam. Um arquivo por lote também torna a retomada verificável: relance
só os lotes cujo `.jsonl` não existe.

Antes de despachar, leia `references/rubrica-prioridade.md` e
`references/tecnicas-de-teste.md` — o prompt do subagente depende dos dois. Se
`recomendar_automacao` estiver `true` no config, leia também
`references/automacao.md`.

**Se `prefixos` já estiver preenchido no config**, inclua no prompt a lista de
nomes canônicos de funcionalidade e instrua o subagente a usá-los literalmente:

> O campo `funcionalidade` tem que ser **exatamente** um destes valores:
> `<lista das chaves de prefixos>`. Se o requisito não pertencer a nenhum,
> escreva o nome que o documento usa e siga — será tratado como pendência.

Sem isso o subagente inventa nomes descritivos ("Plotagens personalizáveis para
insumos meteorológicos" em vez de "VISUAL — Plotagens") e o
`reduce_cts.py` precisa resolver por aproximação de tokens. A resolução
aproximada funciona e é sempre registrada em `prefixo-por-aproximacao[]` para
você confirmar — mas nome canônico desde a origem elimina a dúvida.

Prompt de cada subagente (adapte os caminhos):

> Leia APENAS estes arquivos: `<lista de caminhos do lote>`. Cada um é markdown
> com linhas prefixadas `LNNN:`.
>
> Extraia requisitos testáveis. Para cada um, escreva uma linha JSON em
> `ledger/achados/lote-NN.jsonl` com este schema:
>
> ```json
> {"id":"F-0001","fonte":"<nome do arquivo>","locator":"L142-L151",
>  "modulo":"","funcionalidade":"","requisito":[],"historia":"",
>  "criterio_aceite":"<frase do requisito, verbo de ação na frente>",
>  "tecnica":"pairwise|equivalencia|transicao_estado|tabela_decisao|caso_unico",
>  "parametros":{"<nome>":["<valores>"]},
>  "dominio":{"campo":"","validos":[],"invalidos":[],"limites":[],"aceita_branco":true},
>  "transicoes":[{"de":"","para":"","evento":"","observacao":""}],
>  "regras":[{"id":"R1","condicoes":{},"resultado":""}],
>  "integracoes":[],
>  "criticos":{"caminho_feliz":false,"critico_negocio":false,"primeira_entrega":false,
>              "alta_prob_falha":false,"integracao_externa":false,"seguranca_compliance":false},
>  "medios":{"variacao_fluxo":false,"excecao_nao_critica":false,"refatoracao":false,
>            "usabilidade":false,"integracao_interna_estavel":false},
>  "baixos":{"exploratorio":false,"legado_estavel":false,"layout_visual":false,
>            "baixa_prob_falha":false,"infraestrutura":false},
>  "automacao":{"oraculo_dificil":false,"massa_custosa":false,
>               "dependencia_hardware":false,"ui_instavel":false,
>               "requer_ambiente_especial":false},
>  "evidencia":{"<flag>":"\"<trecho literal>\" (L144)"}}
> ```
>
> O bloco `automacao` registra **impedimentos técnicos para automatizar** que só
> o documento revela: resultado esperado não assertável por código, massa de
> teste custosa de gerar, dependência de hardware, interface instável, ambiente
> fora do pipeline. Mesma disciplina das outras flags — `true` exige evidência.
> Inclua o bloco apenas se `recomendar_automacao` estiver `true` no config.
>
> Inclua apenas os campos de forma da `tecnica` escolhida (`parametros` para
> pairwise, `dominio` para equivalencia, `transicoes` para transicao_estado,
> `regras` para tabela_decisao, nenhum para caso_unico).
>
> `fonte` é o **nome de arquivo exato**, como ele aparece na lista que você
> recebeu — não o título do documento, não uma versão abreviada. É por esse nome
> que o relatório de rastreabilidade liga o CT de volta ao documento; nome errado
> aponta para um arquivo que ninguém acha.
>
> `locator` é a faixa de linhas no formato `L142-L151`, lida dos prefixos `LNNN:`
> do arquivo.
>
> Quando `tecnica` é `pairwise`, o `criterio_aceite` tem que descrever o
> comportamento **sem nomear nenhum valor que apareça em `parametros`**. Escreva
> "Aplicar plotagem e validar no mapa", não "Aplicar plotagem personalizada e
> validar no mapa" — "personalizada" é um valor do parâmetro `plotagem`, e o CT
> gerado para a combinação `plotagem=padrão` sairia se contradizendo.
>
> **Preencha os campos de forma exaustivamente** — é deles que sai o número de
> CTs, e um campo ralo produz matriz ralinha que passa em todas as validações:
>
> - `equivalencia`: enumere em `dominio` um valor válido, **cada** forma de
>   inválido que o documento cita, os valores de limite, e `aceita_branco`.
>   Um campo de entrada quase sempre rende 4+ classes, não 2.
> - `transicao_estado`: cubra **toda** transição válida do fluxo, mais as
>   inválidas que importam (tentar sair de um estado que não permite). Um fluxo
>   de duas sessões rende 4-6 transições, não 2.
> - `tabela_decisao`: uma regra por combinação de condições que o documento
>   distingue, incluindo a condição de rejeição.
> - `pairwise`: liste **todos** os valores de cada parâmetro que o documento
>   menciona. Não resuma a lista.
>
> Toda flag marcada `true` EXIGE uma entrada em `evidencia` com trecho literal do
> documento e o número de linha. Flag sem evidência é rejeitada pelo validador.
> Não marque flag por intuição — se o documento não embasa, deixe `false`.
>
> Não invente requisito que o documento não contém. Documento sem requisito
> testável: escreva zero linhas e relate zero.
>
> Responda APENAS: `{"lote":"NN","achados":<N>,"arquivo":"<caminho>"}`. Nenhuma
> prosa, nenhum resumo, nenhum trecho de documento.

Essa última instrução é a fronteira que faz o corpus grande caber. Se os
subagentes devolverem conteúdo em vez de contagem, o contexto principal enche e o
pipeline para.

## Fase 3 — Redução

```bash
python3 <skill>/scripts/reduce_cts.py --ledger ledger --config matriz.config.json
```

Agrupa por funcionalidade, resolve prefixos, aplica a técnica declarada, gera os
arrays de cobertura (IPOG, com verificação), aplica a cascata de prioridade e
numera sequencialmente por prefixo. Saída: `ledger/cts.jsonl`.

Mostre ao usuário as linhas `suites:` e `pendencias[]`. Pendência de
funcionalidade sem prefixo significa CTs que **não entraram** na matriz.

## Fase 4 — Renderização

```bash
python3 <skill>/scripts/render_matriz.py          --ledger ledger --config matriz.config.json --out saida
python3 <skill>/scripts/render_ciclo.py           --ledger ledger --config matriz.config.json --out saida --todos-os-tipos
python3 <skill>/scripts/render_rastreabilidade.py --ledger ledger --config matriz.config.json --out saida --corpus corpus
```

Consulte `references/formato-entrega.md` antes de alterar qualquer cabeçalho: os
textos de coluna são varridos por script via API na ferramenta de gestão, não são
decoração.

## Fase 5 — Validação

```bash
python3 <skill>/scripts/validate.py --ledger ledger --config matriz.config.json --corpus corpus
```

Passe `--corpus` sempre que o corpus ainda estiver em disco: ele habilita a R12,
que confere se cada trecho de evidência **existe de fato** no documento citado.
É a única regra que compara o ledger com a realidade — todas as outras checam
coerência interna, e um subagente que inventa citação passa por elas sem ruído.

`exit 0` libera a entrega, `exit 1` bloqueia. Regras 1–6, 10 e 12 são erro;
7–9 e 11 são aviso. Em
reexecução de um engajamento, passe `--baseline <cts.jsonl anterior>` para
travar a estabilidade dos prefixos.

**Nunca entregue com `exit 1`.** Corrija o ledger (Fase 2) ou o config e rode a
Fase 3 de novo. Se o usuário pedir para ignorar um erro, diga qual regra está
sendo afrouxada e o que ela protege.

## Ordem e retomada

As fases são sequenciais, mas cada uma é independente e reexecutável. O ledger é
a fonte de verdade: Fases 3 a 5 rodam quantas vezes forem necessárias sem tocar
nos documentos. Mudança de config (prefixo, rubrica, força da cobertura) só exige
rerodar da Fase 3.

## Testes

```bash
python3 <skill>/scripts/test_pairwise.py   # 7 testes do gerador de arrays
python3 <skill>/scripts/test_pipeline.py   # 14 testes de integracao das 5 fases
```

`test_pairwise.py` cobre o IPOG, incluindo o teste que prova que o verificador
**reprova** um array adulterado — um verificador que sempre passa não verifica
nada.

`test_pipeline.py` monta as próprias fixtures em diretório temporário e afirma os
critérios de aceite como exit codes: R1 reprovando a matriz de referência original com
exatamente 5 violações, R4 detectando um valor de parâmetro inteiro removido, R2
bloqueando critério de aceite órfão, zero CTs mapeados saindo 1 em vez de 0, R9
avisando sobre campo de forma ralo, ids de achado namespacados entre lotes (cada
subagente começa em `F-0001`), e a recomendação de automação nos dois modos —
desligada sem deixar rastro, ligada com nível, tag, ranking e R10.

Rode os dois depois de qualquer mudança em `scripts/`.
