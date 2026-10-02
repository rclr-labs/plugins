# Recomendação de automação

Opcional, desligada por default. Liga com `"recomendar_automacao": true` no
`matriz.config.json` — está desligada porque acrescenta uma 9ª coluna à Matriz
de Cobertura, e o conjunto de colunas é varrido por script via API no
a ferramenta de gestão (ver `formato-entrega.md`).

O corpus do cliente não traz rubrica de automação pronta, diferente da Seção 2
para prioridade. O que ele traz é vocabulário, e é nele que esta rubrica se
ancora:

- taxonomia de níveis do Draft de Processos de Testes: *"Tipo de teste:
  funcional, regressão, API, E2E, integração"*
- campo de rastreabilidade já previsto: *"link da automação futura, se
  aplicável"*
- o roteiro de entrevista do QA pensa em **Pirâmide de Testes** (*"Automação E2E
  - ok e mobile"*, *"API?"*)
- e as perguntas que o Draft deixa abertas: *"Onde a automação realmente gera
  valor agora? O que seria quick win de automação e o que seria esforço
  maior?"* — é isso que o ranking responde.

## Sinais derivados (determinísticos, sem reexecutar a Fase 2)

| Sinal | Origem | Peso |
|---|---|---|
| frequência | `@smoke` = roda a cada build · `@regressao` = por release · sem tag = ad hoc | 3 · 2 · 1 |
| repetição | nº de CTs irmãos do mesmo achado | o próprio nº |
| nível | `integracoes` + técnica, pela pirâmide | define o esforço |

A repetição é o sinal mais forte e o menos óbvio: um array pairwise de 15 linhas
é o mesmo fluxo executado 15 vezes com dados diferentes, que é exatamente a
forma que automação data-driven cobre bem. Automatizar esse array é um item de
backlog, não quinze — por isso o backlog agrupa por achado.

## Bloqueios (marcados na Fase 2, só o documento sabe)

Campo `automacao` no achado. Cada `true` exige evidência com número de linha,
como as flags de prioridade:

| Flag | Significa |
|---|---|
| `oraculo_dificil` | o resultado esperado não é assertável por código (julgamento visual, interpretação) |
| `massa_custosa` | gerar os dados de entrada é caro ou manual |
| `dependencia_hardware` | exige dispositivo, sensor ou equipamento físico |
| `ui_instavel` | a interface muda com frequência; o teste quebraria a cada sprint |
| `requer_ambiente_especial` | ambiente que não existe no pipeline |

Se a Fase 2 rodou sem esse campo, a saída diz `bloqueios: nao coletados` — a
recomendação continua válida, mas é cega para impedimento técnico. Não deixe
isso implícito num relatório para cliente.

## Regra de decisão

1. Qualquer **veto** (`layout_visual` ou `exploratorio`, flags que já existem na
   rubrica de prioridade) → `manual`
2. Qualquer **bloqueio** marcado → `manual`, com o bloqueio como motivo
3. Senão, o nível mais baixo da pirâmide em que o CT é testável:

| Condição | Nível | Esforço |
|---|---|---|
| `integracoes` não vazio | API | baixo |
| técnica `transicao_estado` | E2E | alto |
| técnica `pairwise`, `equivalencia` ou `tabela_decisao` | integração | médio |
| `caso_unico` sem integração | E2E | alto |

### Bloqueio é absoluto — decisão tomada, não pendência

`oraculo_dificil` veta a automação **inteiramente**, mesmo quando o achado
declara `integracoes`. Isso foi questionado e mantido deliberadamente.

O argumento contra: oráculo visual impede assertar pixels em E2E, mas não
impede assertar a requisição e a resposta no nível de API — então um requisito
de plotagem que passa por um servidor de mapas seria automatizável em API. Em
execução real sobre o corpus Cliente Exemplo isso moveu 18 de 38 CTs para `manual` apesar
de haver integração declarada.

O argumento que prevaleceu: a regra erra **subrecomendando**, e esse é o lado
seguro de errar num entregável de cliente. Prometer automação que depois se
mostra difícil custa mais que deixar CTs como manual e alguém levantar a mão.

Não "conserte" isso sem decisão explícita de quem conduz o engajamento.

`caso_unico` cai em E2E deliberadamente: sem parâmetros nem integração
declarada não há base para supor que seja testável abaixo da UI, e a suposição
conservadora é a mais cara — o que o empurra para baixo no ranking em vez de
prometer um quick win que não existe.

## Ranking

```
score = frequência × nº de CTs do grupo ÷ peso do esforço
```

Pesos de esforço: API 1 · integração 2 · E2E 3.

**O esforço é um proxy do nível, não estimativa em horas.** A skill não conhece o
time nem o stack. A saída rotula `baixo/médio/alto`, nunca duração.

## O que aparece na entrega

- **Matriz de Cobertura**: 9ª coluna `Automação` com o nível (`API`, `integração`,
  `E2E`, `manual`)
- **coluna Tipo de Testes**: tag `@automatizavel` nos CTs recomendados, ao lado
  de `@smoke` e `@regressao`
- **rastreabilidade.html**: seção *Backlog de automação*, agrupada por achado e
  ordenada por score, com nível, esforço, nº de CTs, faixa de CT ID e motivo;
  mais o bloco de não-recomendados com a razão de cada um

## Regras do validador

- **R10** (erro): `@automatizavel` só em CT com nível diferente de `manual`
- **R11** (aviso): bloqueio marcado `true` sem trecho de evidência
- **R12** (erro, exige `--corpus`): o trecho citado existe de fato no documento
  de origem. Vale para toda evidência, não só de automação — ver abaixo.

## Por que R12 importa aqui

Um bloqueio de automação é a flag mais fácil de marcar por intuição: "testar
mapa é difícil" é verdade genérica, e um subagente pode marcar
`oraculo_dificil` sem que o documento diga nada disso. As regras 1 a 11 checam
coerência interna do ledger e passariam batido.

R12 é a única regra que confere o ledger contra a realidade: normaliza o trecho
citado e procura no markdown extraído da fonte. Rode sempre com `--corpus`
quando o corpus ainda estiver em disco:

```bash
validate.py --ledger ledger --config matriz.config.json --corpus corpus
```
