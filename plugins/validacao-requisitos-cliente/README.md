# Validação de Requisitos com o Cliente — como usar (leia-me humano)

Skill para o time conduzir a validação de requisitos de um chamado de cliente **sem depender dos dois líderes**, desenvolvendo quem participa da reunião.

## Para quem é

| Papel | O que usa |
|---|---|
| **Participante da reunião** (júnior) | `preparar` (dossiê + perguntas), `esqueleto` (documento a preencher) |
| **Líder / mentor** | `avaliar`, `qualificar` e `ideal` — o ideal **só para ele** |
| **Time todo** | O histórico de qualificações, para medir se a dependência está caindo |

## Instalação

A pasta é autocontida e **funciona em Windows, Linux e macOS**. Escolha um caminho:

**Opção 1 — como plugin (recomendada, qualquer sistema).** Dentro do Claude Code:

```
/plugin marketplace add rclr-labs/plugins
/plugin install validacao-requisitos-cliente@rclr-labs
```

Atualizações depois chegam com `/plugin update`.

**Opção 2 — script (Linux e macOS).**

```bash
git clone https://github.com/rclr-labs/plugins.git
cd plugins && ./instalar.sh validacao-requisitos-cliente
```

**Opção 3 — Windows (PowerShell, sem git).**

```powershell
$zip = "$env:TEMP/pl​ugins.zip"
Invoke-WebRequest https://github.com/rclr-labs/plugins/archive/refs/heads/main.zip -OutFile $zip
Expand-Archive $zip -DestinationPath "$env:TEMP/rclr-plugins" -Force
$raiz = Get-ChildItem "$env:TEMP/rclr-plugins" -Directory | Select-Object -First 1
New-Item -ItemType Directory -Force "$env:USERPROFILE/.claude/skills" | Out-Null
Copy-Item "$($raiz.FullName)/plugins/validacao-requisitos-cliente/skills/validacao-requisitos-cliente" "$env:USERPROFILE/.claude/skills/" -Recurse -Force
```

**Opção 4 — sem terminal (qualquer sistema).** Botão **Code → Download ZIP**, descompacte e arraste a pasta `plugins/validacao-requisitos-cliente/skills/validacao-requisitos-cliente` para a sua pasta de skills.

Ou copie esta pasta para a pasta de skills do seu agente:

| Ferramenta | Destino |
|---|---|
| Claude Code | `.claude/skills/validacao-requisitos-cliente/` (projeto) ou `~/.claude/skills/…` (global) |
| Cursor | `.cursor/skills/validacao-requisitos-cliente/` ou a pasta de skills configurada |
| Codex / DSH | pasta de skills equivalente do seu ambiente |
| Outro / sem suporte a skills | use os arquivos como roteiro manual — o conteúdo é só Markdown |

Não há nada para compilar, instalar ou configurar. **Não inclua dados reais de cliente na entrega da skill** — os exemplos são fictícios.

## Como usar

Diga ao agente o que você quer, por exemplo:

- `preparar` — "prepare a reunião de validação do chamado 4821" (com o chamado e a documentação na pasta do caso)
- `esqueleto` — "gere o esqueleto do documento de requisitos desse caso"
- `avaliar` — "avalie a cobertura da reunião a partir da transcrição"
- `qualificar` — "qualifique o documento que o <nome> escreveu"
- `ideal` — "gere o documento ideal deste caso" (interno)
- `completo` — faz tudo o que já tem entrada disponível

Se você não disser o subcomando, a skill deduz pela pasta do caso e confirma antes de gerar.

## Comandos (quando instalado como plugin)

| Comando | Fase |
|---|---|
| `/preparar` | dossiê pré-reunião: chamado + documentação + perguntas priorizadas + varredura de efeitos colaterais |
| `/esqueleto` | documento de requisitos que o participante preenche na reunião |
| `/avaliar` | cobertura da transcrição, item a item, com evidência citada |
| `/qualificar` | nota 0–100 + feedback estruturado do documento escrito |
| `/ideal` | documento ideal interno — **só o mentor** |
| `/completo` | encadeia as fases que já têm entrada na pasta do caso |

Em Claude Code o nome completo é `/validacao-requisitos-cliente:preparar`; a forma curta funciona quando não há outro comando com o mesmo nome. O comando leva o caso como argumento: `/preparar 4821`.

**Sem plugin** (Cursor, Codex, DSH, ou a pasta copiada à mão) não existe barra de comandos: peça em linguagem natural, com contexto — *"prepare a reunião de validação do chamado 4821"*, *"avalie a cobertura dessa transcrição"*, *"qualifique o documento que o time escreveu"*.

## O que você precisa fornecer

| Fase que você vai pedir | Entrada |
|---|---|
| `preparar` | o chamado — e, se tiver, a documentação do sistema e a checklist do time |
| `avaliar` | a transcrição da reunião |
| `qualificar` | o documento que o participante escreveu |

Pode colocar os arquivos em `00_entrada/` (nomes previsíveis: `chamado.md`, `documentacao-*.md`, `checklist-do-time.md`, `transcricao.md`, `documento-participante.md`), colar o texto no chat ou apontar o caminho do arquivo. Formatos aceitos, o que acontece quando falta uma entrada e cuidados com dado sensível: [references/entradas.md](skills/validacao-requisitos-cliente/references/entradas.md).

## Onde ficam os arquivos

```
validacao-clientes/<AAAA-MM-DD>-<slug-do-chamado>/
├── 00_entrada/                    # chamado, documentação, checklist, transcrição, documento do participante
├── 01_dossie_pre_reuniao.md       # → participante
├── 02_esqueleto_requisitos.md     # → participante
├── 03_cobertura_reuniao.md        # → líder
├── 04_qualificacao_documento.md   # → líder
├── 05_feedback_participante.md    # → participante (seguro de compartilhar)
└── _interno/                      # ⛔ NUNCA compartilhar
    └── 06_documento_ideal.md
```

Há um caso resolvido de ponta a ponta em `examples/caso-exemplo-001/` (dados fictícios) — é o melhor lugar para ver o formato esperado de cada arquivo.

Se o time já tem a **checklist de entrevista** própria, coloque em `00_entrada/checklist-do-time.md`: ela passa a valer no lugar da padrão embutida.

## As duas regras que não se quebram

1. **`_interno/` não vai para o participante — e a pasta do caso não é entregue inteira.** Para quem escreve o documento, saem apenas `01`, `02` e `05`. Nem arquivo, nem trecho, nem "dica" derivada do `03`, `04` ou `_interno/`. O feedback (`05`) já entrega o que ele precisa. Gere o documento ideal **depois** de encerrar o atendimento ao participante, em outro contexto — não na mesma sessão em que você o está ajudando.
2. **Sem evidência, não conta.** Na avaliação da reunião, cada item coberto cita o trecho da transcrição. Sem trecho, o item é "não coberto" — mesmo que você "lembre" que foi falado.

## O que mede se está funcionando

- % de cobertura dos pontos P1 na reunião (coluna **Cobertura P1** do histórico)
- nota global do documento ao longo do tempo, para o mesmo participante (colunas **Nota/C1–C6**)
- nº de rodadas de revisão do líder por documento (coluna **Rodadas de revisão**)
- nº de perguntas que sobraram para uma segunda reunião (relatório de cobertura)

Todos esses números têm coluna própria em `validacao-clientes/_historico/qualificacoes.md` (formato em `RUBRICA_QUALIFICACAO.md`). Se a nota sobe e as rodadas de revisão caem, a dependência dos líderes está diminuindo.
