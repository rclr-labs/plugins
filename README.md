# Plugins RCLR Labs

Marketplace de plugins para o [Claude Code](https://claude.com/claude-code). São os
artefatos de engenharia e QA que usamos nos engajamentos de consultoria, publicados
para os clientes usarem nos projetos deles.

## Instalação

### Opção 1 — como plugin (recomendada)

Dentro do Claude Code, dois comandos:

```
/plugin marketplace add rclr-labs/plugins
/plugin install matriz-de-testes@rclr-labs
```

Vantagem: nada de copiar pasta, e atualizações chegam com `/plugin update`.

(`rclr-labs` é o marketplace, `matriz-de-testes` é o plugin — daí o `@`. Troque o
nome do plugin para instalar os outros.)

### Opção 2 — script (Linux e macOS)

```bash
git clone https://github.com/rclr-labs/plugins.git
cd plugins
./instalar.sh                      # lista o que há e instala tudo
./instalar.sh matriz-de-testes     # instala só um
```

O script copia as skills para `~/.claude/skills/` — instalação **pessoal**: elas
passam a valer em qualquer projeto que você abrir. Rodar de novo atualiza.
`./instalar.sh --help` explica as opções.

### Opção 3 — Windows (PowerShell)

```powershell
.\instalar.ps1                                 # instala todas
.\instalar.ps1 validacao-requisitos-cliente     # instala só um plugin
.\instalar.ps1 -Listar                          # mostra o que há
```

Mesmo efeito do script bash: copia as skills para `$HOME/.claude/skills/`.

### Opção 4 — sem git, sem terminal

1. No GitHub, botão verde **Code** → **Download ZIP**.
2. Descompacte.
3. Arraste a pasta `plugins/<plugin>/skills/<skill>` para dentro de `~/.claude/skills/`.
   (No Finder: `Shift + Cmd + G`, cole `~/.claude/skills`, Enter.)

## Plugins

### matriz-de-testes

Recebe um volume grande de documentos — requisitos, histórias, atas de reunião,
especificações — determina quais são os testes críticos por rubrica objetiva e gera
a Matriz de Cobertura, as páginas de Ciclo de Execução e um relatório HTML de
rastreabilidade em que **cada caso de teste aponta o documento e a linha que o
originaram**.

Cinco técnicas de teste, escolhidas por forma do requisito: pairwise (array de
cobertura por IPOG, com a cobertura provada por verificador independente), partição
de equivalência com análise de valor limite, transição de estado, tabela de decisão
e caso único. Um validador com 12 regras bloqueia a entrega quando a matriz está
incoerente — critério de aceite sem caso de teste, array pairwise não cobridor,
caso de teste sem documento de origem, citação de evidência que não existe na fonte.

Pensado para corpus que não cabe em contexto: subagentes leem os documentos e
escrevem um ledger em disco, e todo raciocínio cruzado acontece em Python
determinístico sobre esse ledger.

Dispara com frases como *"gerar a matriz de cobertura"*, *"quais são os testes
críticos desses documentos"*, *"montar os casos de teste a partir dos requisitos"*.

### kit-mvp

Da ideia ao MVP funcional em Laravel + MySQL. Corta o escopo, define o modelo de
dados antes da primeira migration, escreve o `CLAUDE.md` do projeto, constrói em
fatias verticais testadas e termina com um documento de handover que o time de
desenvolvimento adota em vez de reescrever.

Dispara com *"quero começar um MVP novo"*; retoma com *"vamos continuar o MVP"*.

### dev-squad

Um time de desenvolvimento — Product Owner, Tech Lead, Devs, QA, Code Reviewer,
Release Manager, agente de segurança pré-produção e monitor de manutenção — que
conduz uma feature pelos estágios Plan → Design → Build → Test → Deploy → Maintain,
com gates entre eles.

Começa com `/squad-new`; avança com `/squad-advance`.

### validacao-requisitos-cliente

Prepara quem vai conduzir a reunião de validação com o cliente. A partir do chamado e da
documentação do sistema, monta o **dossiê pré-reunião** com o pedido separado em
necessidade, desejo e restrição, as perguntas priorizadas (P1 bloqueante) e a **varredura
obrigatória de 14 eixos de efeitos colaterais** — o que o pedido quebra em volta: contrato,
relatório, permissão, dado pessoal, volume, operação.

Depois da reunião, compara a transcrição com os pontos planejados **e** com a checklist de
entrevista item a item, citando o trecho que sustenta cada classificação; e qualifica o
documento escrito pelo participante numa rubrica de 6 critérios ponderados (nota 0–100),
com feedback que separa lacuna de método (ensina agora) de lacuna de conteúdo (vira
pergunta ao cliente). O documento ideal é gerado para o mentor e **nunca** é compartilhado
com quem escreve o requisito.

Fases: `preparar` · `esqueleto` · `avaliar` · `qualificar` · `ideal` · `completo`.

Dispara com *"preparar a reunião do chamado"*, *"avaliar a cobertura da reunião"*,
*"qualificar o documento de requisitos"*, *"quais são os efeitos colaterais desse pedido"*.

Fases por comando: `/preparar` → `/esqueleto` → `/avaliar` → `/qualificar` → `/ideal`
(ou `/completo` para encadear o que já tem entrada).

Apresentação para o cliente (HTML autocontido, com modo apresentação):
[`skills/validacao-requisitos-cliente/assets/apresentacao.html`](plugins/validacao-requisitos-cliente/skills/validacao-requisitos-cliente/assets/apresentacao.html).

### plano-mcp

Aponta para um repositório que já existe e responde duas perguntas **antes** de qualquer
linha de código: esse produto está pronto para expor um servidor MCP, e qual é a menor
sequência de issues que leva até lá.

Varre o repo em script determinístico — stack, superfície de rotas com verbos e sinal de
paginação, sinais de identidade, camada de serviço, riscos, comando de teste — e dá um
**veredito de prontidão em 6 eixos, cada nota com evidência** (`arquivo:linha`). Nota sem
evidência vale zero. **Identidade é bloqueio absoluto:** repo sem autenticação por token e
autorização no recurso é reprovado qualquer que seja o total, porque uma ferramenta MCP sem
identidade age como superusuário e todo escopo vira teatro.

Aprovado o repo, escreve o **contrato das ferramentas de leitura** — entradas tipadas,
paginação e os três erros que quase todo mundo colapsa em um (**vazio ≠ inexistente ≠
negado**) — e o **plano de issues em 7 fatias verticais**, cada uma com critério de aceite
verificável e **evidência exigida**: a chamada da ferramenta mais o ID conferido no produto.
Toda afirmação do plano é marcada `FATO (fonte: arquivo:linha)`, `INFERÊNCIA` ou `LACUNA`, e
lacuna vira pergunta com dono — nunca suposição. O primeiro ciclo é sempre **somente
leitura**; escrita exige idempotência, confirmação e auditoria, e vira a última fatia.

O validador é literal de propósito: plano incompleto **não gera nada**. E nenhuma issue é
criada pelo plugin — ele emite os comandos `gh issue create` para você revisar e rodar.

Dispara com *"esse repo está pronto para um MCP?"*, *"quero expor nosso sistema para o
assistente"*, *"faz um plano de issues pra implementar MCP"*.

Comandos: `/plano-mcp` · `/mcp-prontidao` (só o veredito) · `/mcp-issues` (valida e emite).

### sensei

Revisão técnica **roteada por modo**: o `SKILL.md` decide o modo e carrega **um** arquivo de regras, então o custo de contexto fica proporcional ao que você pediu.

| Modo | Para quê |
|---|---|
| `review` | Código — regras gerais **+** camada da linguagem |
| `sec` | Segurança: só entra achado com caminho de ataque |
| `sql` | Consulta: semântica de `NULL`, cardinalidade de `JOIN`, SARGability, mutação |
| `docs` | Documentação: verdade, fonte, acionabilidade |
| `espec` | Especialistas em paralelo **+** verificador independente |
| `repo` | Analisa o repositório e recomenda ao time por onde começar |

Sem argumento, infere o modo pelo contexto; sem contexto claro, **pergunta** — não escolhe sozinho.

**Revisa o diff, não o repositório.** Para diff (`--staged`, `A..B`, `--pr N`, "o que mudou"), um script monta o pacote: hunks com contexto, ~35 padrões de risco por regex **só nas linhas adicionadas**, contagem de chamadores e testes relacionados. O modelo lê o pacote **uma vez**. E cada revisão registra a própria conta de tokens — inclusive quando ela dá **negativa**, que é o que acontece em diff pequeno.

**Camada por linguagem.** `review.md` vale sempre; quando existe `review/<linguagem>.md`, ele entra por cima e **vence em conflito**. Em PHP são três camadas: geral → `php` → `laravel`. As camadas são específicas de verdade — truncamento de alta ordem no `MOVE` e `PERFORM THRU` com parágrafo novo em COBOL; `try/catch` que não pega erro não-terminante e `-eq` sobre array em PowerShell; N+1 escondido no Blade, `$guarded = []` e `env()` fora de `config` em Laravel. Cada arquivo termina com uma seção **Padrões da equipe**, vazia de propósito: é onde entram as regras da casa, e elas vencem as genéricas.

**O modo `espec`** resolve a fraqueza da passada única — nela, quem levanta a hipótese é quem a refuta, e o mesmo modelo está enviesado a confirmar. Aqui um verificador independente recebe os candidatos **sem o raciocínio** de quem os propôs, com a tarefa de derrubá-los. O custo (~5× o bundle) aparece na conta, na linha `fanout_especialistas`.

Dispara com *"revise esse diff"*, *"code review do que mudou"*, *"revise a segurança disso"*, *"analise nosso repo"*, *"por onde começamos"*.

Comandos: `/sensei <modo>` · `/sensei-stats` · `/sensei-porque`. CLI: `sensei collect | slice | record | stats | repo | why | doctor`.

## Licença

Uso livre pelos clientes e parceiros da RCLR Labs.
