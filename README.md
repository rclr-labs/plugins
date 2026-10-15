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

## Licença

Uso livre pelos clientes e parceiros da RCLR Labs.
