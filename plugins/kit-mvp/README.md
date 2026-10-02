# Kit MVP

> Da ideia ao MVP funcional com Claude Code — **Laravel + MySQL**.

Um skeleton reutilizável para construir MVPs que **funcionam e são entregáveis**: se o MVP provar a ideia, o time de desenvolvimento consegue adotar o código em vez de reescrevê-lo.

Não é um boilerplate e não ensina Laravel. É **condução**: ele corta o escopo, define o modelo de dados antes da primeira migration, escreve o `CLAUDE.md` do projeto, constrói em fatias testadas e termina com um documento de handover.

## Instalação

### Opção 1 — como plugin (recomendada)

Dentro do Claude Code, dois comandos:

```
/plugin marketplace add rclr-labs/kit-mvp
/plugin install kit-mvp@rclr-labs
```

Vantagem: nada de copiar pasta, e atualizações chegam com `/plugin update kit-mvp`.

(`kit-mvp` é o plugin; `rclr-labs` é o marketplace — daí o `@`. Instalada por aqui, a skill aparece como `kit-mvp:novo-mvp-laravel`; pelo script da Opção 2, como `novo-mvp-laravel`. Isso não muda nada no uso: você dispara pelas frases da tabela abaixo, não pelo nome.)

> O repo é **privado**. Para que esses comandos funcionem, seu usuário do GitHub precisa ter sido convidado como colaborador **e** o `git` da sua máquina precisa estar autenticado no GitHub (se você usa o GitHub Desktop ou já clonou repos privados antes, está resolvido). Se der erro de acesso, use a Opção 2.

### Opção 2 — script de instalação

```bash
git clone https://github.com/rclr-labs/kit-mvp.git
cd kit-mvp
./instalar.sh
```

O script copia a skill para `~/.claude/skills/` — instalação **pessoal**: ela passa a valer em qualquer projeto Laravel que você abrir, sem copiar nada de novo. Rodar de novo atualiza. `./instalar.sh --help` explica as opções.

### Opção 3 — sem git, sem terminal

1. No GitHub, botão verde **Code** → **Download ZIP**.
2. Descompacte.
3. Arraste a pasta `skills/novo-mvp-laravel` para dentro de `~/.claude/skills/`.
   (No Finder: `Shift + Cmd + G`, cole `~/.claude/skills`, Enter.)

## Como usar

Abra o Claude Code dentro da pasta do seu projeto Laravel e diga:

| O que você diz | O que acontece |
|---|---|
| "quero começar um MVP novo" | Calibração, escopo, modelo de dados, `CLAUDE.md` e a primeira fatia |
| "vamos continuar o MVP" | Lê onde parou e retoma na próxima fatia, sem recalibrar |
| "fazer o handover do MVP" | Escreve o documento de entrega para o time de desenvolvimento |

### O que ele cria no seu projeto

```
seu-projeto/
├── CLAUDE.md               # convenções e guard rails — lido em toda sessão
└── docs/mvp/
    ├── 01-escopo.md        # ideia, usuário, jornada única, FORA DO ESCOPO
    ├── 02-modelo.md        # tabelas e relações
    ├── 03-fatias.md        # checklist vivo da construção + diário de sessão
    └── 04-handover.md      # entrega para os devs, com dívida declarada
```

## As cinco ideias por trás disso

1. **O `CLAUDE.md` é o artefato de maior valor.** É o único arquivo que o Claude Code relê em *toda* sessão futura. Convenções que moram ali não se perdem; convenções ditas no chat se perdem na terceira sessão.

2. **Fatia vertical, nunca camada.** Uma fatia é um pedaço da jornada que funciona ponta a ponta (`migration → model → rota → controller → Form Request → view → testes`). Você sempre tem N jornadas completas, nunca meia tela — e é isso que impede o escopo de inflar.

3. **Escopo cortado por escrito.** Máximo 3 entidades, 1 fluxo, e uma seção "Fora do escopo" que nomeia o que ficou de fora. O que não está escrito volta sozinho.

4. **Guard rails nomeados, não princípios.** "Não rode `migrate:fresh`" é verificável. "Tenha cuidado com o banco" não é.

5. **A dívida é declarada, não escondida.** Um desenvolvedor sênior aceita "envio de e-mail síncrono, sem fila — dívida nº 3". O que ele rejeita é descobrir isso sozinho em produção.

## Alternativa sem instalar nada

`prompt-avulso/Prompt_MVP_Laravel.md` é a versão de uma página, para colar no início da conversa no Claude.ai ou em outra ferramenta. Funciona, mas não escreve arquivos nem controla os portões — use quando a skill não estiver disponível.

---

RCLR Labs · material da mentoria **IA com foco em MVP**
