# repo — análise do repositório e recomendações para o time

Modo para a pergunta "por onde este time começa?". Produz um **plano de adoção priorizado**, ancorado no que o repositório mostra — não uma lista de boas práticas.

## A regra que governa este modo

**Toda recomendação cita um número do inventário.** Recomendação sem evidência medida é opinião com cara de diagnóstico, e é exatamente o que faz um plano desses virar PDF que ninguém abre.

Se o inventário não sustenta a recomendação, ou você mede antes, ou a recomendação não entra.

## 1. Inventariar

```
node "<SKILL_DIR>/scripts/sensei.mjs" repo --root <caminho> [--commits 200]
```

Leia a saída **uma vez**. Ela traz: linguagens com contagem e se há camada no `sensei`, **tamanho real das mudanças** (mediana, p90, % acima de 400 linhas), candidatos a path filter, superfície sensível, hotspots por número de toques, CI, comando de teste, template de PR, documentos de contexto e linters.

Leia no máximo **3 arquivos** além do inventário, e só para confirmar um sinal. Este modo não audita código — ele lê o **formato** do repositório.

## 2. A ordem de adoção — e por que ela não é negociável

A sequência vem da evidência, não de preferência. Cada degrau só é barato porque o de baixo existe:

| # | Degrau | Gatilho no inventário | Por que vem nesta posição |
|---|---|---|---|
| **1** | **Tamanho da mudança** | `acima de 400: ≥20%` ou `dentro de 200: <50%` | Abaixo de 200 linhas a detecção de defeito é alta; acima de 400 ela desaba. **Revisor melhor não conserta PR grande** — ele só comenta mais num texto que ninguém lê |
| **2** | **Gates determinísticos** | `ci=nenhum`, `linter=nenhum`, `teste=nao detectado` | Sem CI, a parte determinística do revisor não tem onde rodar, e tudo vira comentário |
| **3** | **Escopo do revisor** | `path_filter_candidatos`, `superficie_sensivel` | Escopo escrito antes de ligar qualquer revisor. Sem ele, o volume mata a adesão |
| **4** | **Encaixe do revisor** | `linguagens` com/sem camada, política de dado | Local, bot no PR, ou sob demanda — a escolha depende do que existe |
| **5** | **Pipeline** | `ci` presente | Determinístico bloqueia, probabilístico comenta |
| **6** | **Base de conhecimento** | `docs=nenhum`, ausência de ADR | Decisão não registrada volta do zero |

**Se o degrau 1 disparou, ele é a recomendação número um — e dizê-lo custa a sua simpatia.** O time quer ouvir qual ferramenta instalar; a resposta honesta costuma ser "quebrem os PRs primeiro". Diga assim mesmo, com o número na mão.

## 3. O que recomendar em cada ausência

| Falta no inventário | Recomendação | Como verificar que funcionou |
|---|---|---|
| Comando de teste | Definir **um** comando canônico, no manifesto do projeto | `sensei repo` passa a detectá-lo |
| CI | Pipeline mínimo com os gates do Encontro 4, em modo `warn` | Primeiro PR com o job verde |
| Template de PR | Template com a **atestação de uso de IA** | PR novo já nasce com os campos |
| Linter/formatter | Formatter primeiro, linter depois — nessa ordem | Zero comentário de estilo no próximo review |
| Camada de linguagem no `sensei` | Escrever `review/<linguagem>.md`, começando pelos **padrões da equipe** | Revisão passa a citar regra da casa, não só genérica |
| Documento de contexto | `CLAUDE.md` com as regras do repo | O agente para de perguntar o que já estava escrito |
| ADR | `docs/adr/` com o template da biblioteca | Primeira decisão registrada |

Para linguagem **sem camada** com volume relevante, a recomendação tem duas partes: o que fazer agora (revisar com as regras gerais e **declarar** isso) e o que fazer depois (escrever a camada). Não prometa cobertura que não existe.

## 4. Hotspots e superfície sensível

Os arquivos mais tocados são onde a revisão rende mais — e onde o defeito recorrente mora. Cruze com o risco:

- **Hotspot de risco alto** (auth, pagamento, migration, fila) → candidato a `/sensei fundo` por padrão, e a teste antes de qualquer refatoração
- **Hotspot de risco normal com muitos toques** → candidato a decomposição: arquivo que muda toda semana costuma estar fazendo coisas demais
- **Superfície sensível sem teste** → é a recomendação de maior retorno do plano, e quase nunca é a que o time pede

## 5. Reportar

Abra com o veredito em uma linha, depois o plano. Formato:

```
repo · <nome> · <N> arquivos · <linguagens> · <X>% dos commits acima de 400 linhas

PRIORIDADE 1 — <o que fazer>
  Evidência: <número do inventário>
  Por quê: <consequência concreta, não princípio>
  Primeiro passo: <ação de um dia, não de um trimestre>
  Dono: <pessoa — nunca "o time">
  Verificação: <como saber que funcionou>
```

Regras do relatório:

- **No máximo 5 prioridades.** Plano com 12 itens é plano que não começa
- **Ordenadas pela sequência da seção 2**, não por facilidade
- **Dono é pessoa.** "O time" não é dono; é a forma educada de dizer "ninguém"
- **Primeiro passo cabe em um dia.** Se não cabe, não é primeiro passo — é objetivo
- **Diga o que está bom.** Repositório que já tem CI, teste e template merece ouvir isso, e isso dá crédito ao resto do plano
- **Declare o que você não olhou:** este modo lê o formato do repositório, não a qualidade do código. Arquitetura, cobertura real de teste e dívida técnica ficam fora, e dizer isso evita que o plano seja lido como auditoria

## 6. O que **não** recomendar

- **Ferramenta que o inventário não justifica.** Sugerir revisor de IA para um repo sem CI nem teste é vender o degrau 4 para quem está no 1
- **Reescrita, migração de framework, mudança de arquitetura.** Fora do escopo deste modo, e normalmente fora do escopo de quem pediu
- **Meta sem baseline.** "Subir a cobertura para 80%" sem saber a de hoje é número inventado
- **Mais de uma mudança de processo por vez.** O time absorve uma; duas viram zero
- **Nada que dependa de contratar.** O plano tem que ser executável pelo time que existe

## O que este modo não resolve

- **Não mede qualidade de código.** Mede formato: existe CI, existe teste, existe escopo, o tamanho cabe no limite
- **Não conhece o produto.** Prioridade de negócio não sai de contagem de arquivo
- **Não substitui o diagnóstico com o time.** O inventário diz o que existe; só a conversa diz o que dói
