# Plugins RCLR Labs

Monorepo-marketplace de plugins do Claude Code. Repo **público**.

## Estrutura

```
.claude-plugin/marketplace.json     catálogo: uma entrada por plugin, source relativo
plugins/<plugin>/
├── .claude-plugin/plugin.json      name, version, description, author, keywords
├── README.md
└── skills/<skill>/SKILL.md         + references/ scripts/ assets/ conforme o caso
instalar.sh                          fallback: copia skills para ~/.claude/skills/
```

## Ao adicionar um plugin

1. `plugins/<nome>/` com `.claude-plugin/plugin.json` e `skills/<skill>/SKILL.md`
2. Uma entrada em `.claude-plugin/marketplace.json` com `source: "./plugins/<nome>"`
3. Uma seção no `README.md` dizendo o que faz e com que frases dispara
4. `./instalar.sh` encontra o plugin novo sozinho — não tem lista para manter

## Regras deste repo

**O repo é público.** Nada de dado de cliente: razão social, nome de sistema interno,
ID de card ou de requisito, citação de reunião, ou crítica a entregável de cliente.
Os exemplos usam `Cliente Exemplo Ltda.` e o sistema fictício `METEO`. Se um
engajamento real for a base de um exemplo, anonimize antes do commit — não depois,
porque o histórico do git é público também.

**Versione o plugin, não o repo.** `version` no `plugin.json` de cada plugin. O
`marketplace.json` não carrega versão nas entradas de source relativo.

**Testes rodam de dentro do plugin.** Nada pode depender de caminho em
`~/.claude/skills/` — a skill tem que funcionar tanto instalada por plugin quanto
copiada pelo `instalar.sh`.
