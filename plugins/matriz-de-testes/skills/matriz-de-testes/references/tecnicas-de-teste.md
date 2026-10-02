# Seleção de técnica de teste

A técnica é declarada por achado no campo `tecnica` durante a Fase 2. O
`reduce_cts.py` gera as combinações a partir dela — o subagente classifica a
**forma** do requisito, o script produz as **combinações**. Essa divisão é
deliberada: um LLM pedindo para enumerar combinações devolve um conjunto
plausível mas não-cobridor, e nada detecta.

Se `tecnica` vier ausente, `_inferir_tecnica()` decide pela presença dos campos
de forma (`transicoes` → `regras` → `dominio` → nº de parâmetros).

## Tabela de seleção

| Sinal no requisito | `tecnica` | Campos que o achado precisa | Gera |
|---|---|---|---|
| ≥2 parâmetros independentes, cada um com ≥2 valores | `pairwise` | `parametros: {nome: [valores]}` | 1 CT por linha do array de cobertura |
| 1 campo de entrada com domínio de valores | `equivalencia` | `dominio: {campo, validos[], invalidos[], limites[], aceita_branco}` | 1 CT por classe + limites + branco |
| Fluxo com estados, sessões ou transições | `transicao_estado` | `transicoes: [{de, para, evento, observacao}]` | 1 CT por transição |
| Regras de negócio com condições compostas | `tabela_decisao` | `regras: [{id, condicoes: {}, resultado}]` | 1 CT por regra |
| Comportamento único, sem variação | `caso_unico` | — | 1 CT |

## Quando pairwise NÃO é a resposta

Pairwise é uma das cinco técnicas, não o motor. Aplicá-lo fora de lugar produz
matriz grande e cobertura ruim:

- **Campo com domínio** (`identificador válida / inexistente / caracteres especiais /
  branco`) é partição de equivalência. Pairwise não tem o que combinar — é um
  parâmetro só. Na entrega original isso é `CON-CT001..004`.
- **Sessões simultâneas** (`abrir A → abrir B → alternar → fechar B`) é transição
  de estado: a ordem é o teste. Pairwise embaralha a ordem e perde o ponto.
  Na entrega original isso é `ATE-CT001..006`.
- **Dois parâmetros apenas**: pairwise com 2 parâmetros é o produto cartesiano
  (todos os pares = todas as combinações). A redução só aparece com ≥3
  parâmetros. O campo `observacoes` do CT mostra isso honestamente:
  `pairwise t=2 (15 de 15 combinacoes)` = nenhuma redução.

O caso onde pairwise é um ganho real sobre a entrega original: `FIL-CT005..009`
testava um insumo por CT (one-factor-at-a-time), sem nunca cruzar insumo com
limiar. Com `insumo × limiar` em array de cobertura, todos os pares são
exercitados.

## Prioridade dentro de um array pairwise

Um achado de prioridade Alta **não** torna Alta as 15 linhas do array. Apenas o
subconjunto com cobertura **t=1** (cada valor de cada parâmetro aparece ao menos
uma vez) fica Alta `@smoke`; as combinações restantes viram Média `@regressao`.

Motivo: a Seção 2 da Matriz de Cobertura exige que o smoke contenha "apenas o
essencial". Sem essa regra, uma funcionalidade com integração externa gera 15
CTs de smoke e a suíte de smoke passa a ser a suíte inteira.

O subconjunto é calculado por set cover guloso em `_subconjunto_t1()` e
reordenado para o início, então os CTs de smoke ficam nos primeiros sequenciais
(`FIL-CT001..005`). A cobertura pairwise integral continua garantida — ela só
mora na regressão.

Em partição de equivalência vale o análogo: só a classe `valido` entra no smoke
(`smoke_apenas_classe_valida: true` no config). Classes `invalido`, `limite` e
`branco` são "tratamento de exceção" e "variação do fluxo principal", que a
Seção 2 classifica como Média.

## Força da cobertura

`forca_cobertura` no config: `2` = pairwise (todos os pares), `3` = todas as
triplas. t=3 cresce rápido — 5×3×3 vai de 16 CTs para 45. Use t=3 só onde falha
de interação tripla tem custo real (cálculo financeiro, controle de acesso).
