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

### Opção 2 — script de instalação

```bash
git clone https://github.com/rclr-labs/plugins.git
cd plugins
./instalar.sh                      # lista o que há e instala tudo
./instalar.sh matriz-de-testes     # instala só um
```

O script copia as skills para `~/.claude/skills/` — instalação **pessoal**: elas
passam a valer em qualquer projeto que você abrir. Rodar de novo atualiza.
`./instalar.sh --help` explica as opções.

### Opção 3 — sem git, sem terminal

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

## Licença

Uso livre pelos clientes e parceiros da RCLR Labs.
