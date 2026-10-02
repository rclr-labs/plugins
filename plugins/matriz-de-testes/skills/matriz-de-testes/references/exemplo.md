# Exemplo de referência: Cliente Exemplo / METEO

Engajamento que originou o formato. Use como gabarito de preenchimento do
config e de calibração do que um achado bem escrito contém.

## Config

`assets/config.exemplo.json` já traz estes valores.

| Campo | Valor |
|---|---|
| `cliente` | Cliente Exemplo Ltda. |
| `sistema` | METEO — Sistema de Meteorologia |
| `ferramenta_gestao` | a ferramenta de gestão |
| `ambientes` | Desenvolvimento · Homologação · Homologação Cliente · Produção |
| `prefixos` | `CONSULTA — Busca por identificador`→VOL · `CONSULTA — Atendimento Simultâneo`→ATE · `FILTRO — Limiar`→PER · `VISUAL — Plotagens`→PLT |

## As quatro funcionalidades e a técnica certa para cada

| Funcionalidade | Prefixo | História | Técnica | Por quê |
|---|---|---|---|---|
| CONSULTA — Busca por identificador | VOL | 1001 | `equivalencia` | Um campo (identificador) com classes: válida, inexistente, caracteres especiais, branco |
| CONSULTA — Atendimento Simultâneo | ATE | 1001 | `transicao_estado` | A ordem é o teste: abrir A → abrir B → alternar → fechar B |
| FILTRO — Limiar | PER | 1002 | `pairwise` | `insumo` (Satélite/Radar/Modelo/Estação/Derivado) × `limiar` (min/max/min+max) |
| VISUAL — Plotagens | PLT | 1003 | `pairwise` | `insumo` × `plotagem` × `persistencia` |

## Achado de referência

Exemplo real do que a Fase 2 deve produzir. Note que **cada flag `true` tem
trecho literal com número de linha** — é isso que o
`rastreabilidade.html` mostra e o que torna a matriz defensável.

```json
{"id":"F-0003","fonte":"ata-reuniao-fluxo-testes.md","locator":"L142-L151",
 "modulo":"METEO","funcionalidade":"FILTRO — Limiar",
 "requisito":["REQ-A1","REQ-A2"],"historia":"1002",
 "criterio_aceite":"Destacar pontos dentro do limiar configurado",
 "tecnica":"pairwise",
 "parametros":{"insumo":["Satélite","Radar","Modelo","Estação","Derivado"],
               "limiar":["min","max","min+max"]},
 "integracoes":["API de satélite"],
 "criticos":{"caminho_feliz":true,"critico_negocio":false,"primeira_entrega":true,
             "alta_prob_falha":false,"integracao_externa":true,"seguranca_compliance":false},
 "medios":{},"baixos":{},
 "evidencia":{"caminho_feliz":"\"define o limiar e vê os pontos destacados\" (L144)",
              "primeira_entrega":"\"funcionalidade nova nesta release\" (L146)",
              "integracao_externa":"\"consome a API do satélite em tempo real\" (L149)"}}
```

Esse achado gera 16 CTs: `FIL-CT001..005` Alta `@smoke @regressao` (subconjunto
t=1, cobrindo os 5 insumos e os 3 limiares) e `FIL-CT006..015` Média
`@regressao` (as combinações restantes).

## Teste de regressão do validador

A Seção 4 da matriz de referência tem 28 CTs feitos à mão, dos quais 5 são Alta com
`@regressao` apenas. Transcrever esses 28 em um `cts.jsonl` e rodar
`validate.py` tem que devolver `exit 1` apontando exatamente:

```
R1-alta-sem-smoke,ATE-CT003
R1-alta-sem-smoke,ATE-CT006
R1-alta-sem-smoke,FIL-CT003
R1-alta-sem-smoke,FIL-CT011
R1-alta-sem-smoke,FIL-CT012
```

Se der `exit 0`, a regra R1 regrediu.

## Documentos do corpus original

Para calibração do porte: algumas dezenas de arquivos, com a maioria parseável.
A mistura típica é transcrições de reunião em volume (o maior bloco), histórias
exportadas da ferramenta de gestão, alguns decks, uma planilha de repositório de
testes e um ou dois relatórios longos em prosa.

O punhado de não-parseáveis costuma ser gravação de vídeo, imagem e arquivo
vazio. O que importa aqui não é a contagem: é que todo arquivo não lido entra
explicitamente no `manifest.toon` com o motivo, **nunca é descartado em
silêncio**. Um corpus em que o manifesto não soma com o que entrou é um corpus
em que ninguém sabe o que a matriz deixou de cobrir.
