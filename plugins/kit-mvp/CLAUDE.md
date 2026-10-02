# Kit MVP — manutenção deste repo

Este repo **não é** um projeto Laravel. Ele empacota a skill `novo-mvp-laravel`, que é instalada na máquina de quem constrói MVPs e roda **dentro do projeto Laravel dela**.

## O que é o quê

| Caminho | Papel |
|---|---|
| `skills/novo-mvp-laravel/SKILL.md` | O orquestrador: Passo 0, pré-checagem e Fases 0–5 |
| `skills/novo-mvp-laravel/templates/` | Arquivos que a skill preenche no projeto do usuário |
| `skills/novo-mvp-laravel/references/` | Conteúdo denso que a skill lê sob demanda |
| `.claude-plugin/plugin.json` | Manifesto do plugin (auto-descobre `skills/`) |
| `.claude-plugin/marketplace.json` | Faz deste repo o próprio marketplace (`name: "rclr-labs"`), com `source: "./"` |
| `instalar.sh` | Caminho alternativo: copia a skill para `~/.claude/skills/` |
| `prompt-avulso/` | Condensação de uma página da skill |

## Regras ao editar

- **A skill precisa continuar autocontida.** Nada de referência a arquivo fora de `skills/novo-mvp-laravel/`: ela roda no repo Laravel do usuário, onde este repo não existe. Isso vale para templates, referências e qualquer caminho citado no `SKILL.md`.
- **O `description` do frontmatter é requisito, não metadado.** Ele precisa cobrir as duas famílias de frase — começar ("começar um MVP novo", "criar um MVP") e retomar ("continuar o MVP", "retomar o MVP", "próxima fatia"). Skills carregam por correspondência de descrição; tirar as frases de retomada quebra o segundo ponto de entrada em silêncio.
- **Plugin e marketplace têm nomes diferentes de propósito:** plugin `kit-mvp`, marketplace `rclr-labs`. A instalação é `kit-mvp@rclr-labs` — chave `plugin@marketplace`, confirmada contra `~/.claude/plugins/installed_plugins.json`. Nomes iguais funcionariam, mas tornam o comando ilegível, e `rclr-labs` (mesmo nome da org no GitHub) abre espaço para outros plugins da casa no mesmo marketplace.
- **Versão em três lugares.** Ao publicar mudança, atualize `version` em `.claude-plugin/plugin.json` **e** em `.claude-plugin/marketplace.json` (dentro de `plugins[0]`). Divergência faz `/plugin update` se comportar de forma inesperada.
- **Toda regra técnica carrega o porquê.** O público-alvo pode não ser desenvolvedor: uma proibição sem motivo é ignorada na primeira vez que atrapalha.
- **Português em tudo que a usuária lê.** A `description` do frontmatter fica em inglês com as frases-gatilho em português entre aspas, seguindo o padrão das outras skills da casa.

## Decisões já tomadas (não refazer sem motivo)

- Skill, não boilerplate Laravel: boilerplate amarra numa versão do framework e envelhece.
- Cobertura de testes por **regra estrutural**, sem percentual: medir cobertura em PHP exige PCOV ou Xdebug, e percentual global premia teste decorativo sobre código de cola.
- Teste dividido pelo que a classe toca (`tests/Unit/` para cálculo puro, `tests/Feature/` para o que toca o banco): a regra sem essa divisão quebra com `A facade root has not been set`.
- `locale => pt_BR` **não** traduz validação sozinho — exige `laravel-lang/lang`, e instalar pacote exige permissão.

Spec completo do desenho: repositório interno de consultoria da RCLR Labs.
