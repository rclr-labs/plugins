# Plano MCP

Aponta para um repositório que já existe e responde duas perguntas antes de qualquer linha de código: **esse produto está pronto para expor um servidor MCP?** e **qual é a menor sequência de issues que leva até lá?**

Varre o repo em script determinístico, dá um **veredito de prontidão em 6 eixos com evidência**, escreve o **contrato das ferramentas de leitura** e emite um **plano de issues em fatias verticais** — cada uma com critério de aceite verificável e evidência exigida.

**Planeja, não implementa.** E não cria issue nenhuma: emite os comandos `gh` para você revisar e rodar.

## Por que existe

Plano de MCP feito de improviso erra sempre nos mesmos quatro pontos:

- **Inventa superfície.** Endpoint, campo e estado que ninguém viu no código entram no plano como se existissem. Aqui, toda afirmação é marcada `FATO (fonte: arquivo:linha)` · `INFERÊNCIA` · `LACUNA` — e lacuna vira **pergunta com dono**, não suposição.
- **Pula identidade.** A ferramenta acaba agindo como superusuário. Aqui, identidade é o **eixo 2 da rubrica e um bloqueio absoluto**: nota `0` reprova o repo qualquer que seja o total.
- **Começa pela escrita.** O primeiro ciclo é **somente leitura, stdio, 2 ferramentas**. Escrita exige idempotência, confirmação e auditoria — vira a última fatia, declarada como pendente.
- **Aceita "funcionou" sem prova.** Cada issue carrega **evidência exigida**: a chamada da ferramenta mais o ID conferido no produto. Resposta escrita pelo modelo sem chamada de ferramenta não fecha issue.

## Instalação

### Opção 1 — script (Claude Code + DSH)

```bash
git clone https://github.com/rclr-labs/plugins.git
cd plugins
./instalar.sh plano-mcp
```

`instalar.sh` é o script do marketplace e copia a skill para `~/.claude/skills/`. No Windows: `.\instalar.ps1 plano-mcp`.

O plugin também traz o próprio instalador, que cria **symlink** em vez de copiar (atualiza junto com o repo) e cobre o `~/.agents/skills` do DeepSeek Harness:

```bash
./plugins/plano-mcp/skills/plano-mcp/scripts/install.sh --scope user
```

Cria symlinks em `~/.claude/skills/plano-mcp` (Claude Code) e `~/.agents/skills/plano-mcp` (DeepSeek Harness). Só no projeto atual: `--scope project`. Sem symlink (Windows sem dev mode): `--copy`. Para remover: `--uninstall`.

> Ao contrário do `revisao-enxuta`, este instalador **não** tem `--bin`: o `mcpx` é feito para ser chamado pelo agente a partir da skill, não digitado à mão. Se você quiser o atalho de todo modo, aponte um symlink seu para `skills/plano-mcp/scripts/mcpx.mjs`.

### Opção 2 — plugin Claude Code

Depois de publicado no marketplace `rclr-labs/plugins`:

```text
/plugin marketplace add rclr-labs/plugins
/plugin install plano-mcp@rclr-labs
```

Para experimentar antes de instalar:

```bash
claude plugin validate ./plugin/plano-mcp
claude --plugin-dir ./plugin/plano-mcp
```

### Opção 3 — manual

Copie `skills/plano-mcp/` para `~/.claude/skills/plano-mcp/`. Abra uma nova sessão para o catálogo atualizar.

Verifique com `node skills/plano-mcp/scripts/mcpx.mjs doctor`.

## Uso

### No agente

- `/plano-mcp` — avalia o repo atual e escreve `plano-mcp.md`.
- `/plano-mcp ~/dev/acme` — avalia outro repo.
- `/mcp-prontidao` — só o veredito, sem plano.
- `/mcp-issues --repo owner/name` — valida o plano e emite os comandos `gh`.
- "esse repo está pronto para um MCP?", "quero expor nosso sistema para o assistente", "faz um plano de issues pra implementar MCP" também disparam a skill.

### CLI `mcpx`

```bash
node skills/plano-mcp/scripts/mcpx.mjs                      # dado vivo do repo atual
node skills/plano-mcp/scripts/mcpx.mjs scan --root ~/dev/x  # inventário
node skills/plano-mcp/scripts/mcpx.mjs scan --json          # para CI/dashboard
node skills/plano-mcp/scripts/mcpx.mjs issues --plan plano-mcp.md --repo owner/name --gh
node skills/plano-mcp/scripts/mcpx.mjs doctor               # ambiente e instalação
```

O fluxo é sempre: **scan → prontidão → contrato → plano → issues**.

## O veredito

Seis eixos, nota `0`/`1`/`2`, **cada um com evidência** (`arquivo:linha`). Nota sem evidência vale `0`.

| # | Eixo | Pergunta |
|---|---|---|
| 1 | Camada de serviço | Existe regra de negócio chamável sem reimplementar? |
| 2 | **Identidade** | Há autenticação por token **e** autorização no recurso? |
| 3 | Superfície de leitura | Existe leitura com filtro e paginação? |
| 4 | Isolamento | Dá para garantir que a leitura não cruza contas? |
| 5 | Ambiente verificável | Existe homologação com dado real e ID conferível? |
| 6 | Evidência | Há comando de teste e como provar a execução? |

| Condição | Veredito |
|---|---|
| Eixo 2 = `0` | **NÃO PRONTO** — qualquer que seja o total |
| Total ≥ 9, nenhum eixo `0` | **PRONTO** |
| Total 5–8, ou um `0` fora do eixo 2 | **PRONTO COM RESSALVAS** (cada ressalva vira issue) |
| Total ≤ 4 | **NÃO PRONTO** |

Em NÃO PRONTO, o plano muda de forma: as issues são de **destravamento**, e nenhuma issue de servidor MCP entra antes de o bloqueio fechar.

## As 7 fatias

Tracer bullet: cada fatia atravessa o sistema e deixa algo verificável de pé.

| # | Fatia | Entrega |
|---|---|---|
| 1 | Contrato + ADR | Contrato das ferramentas e decisão de transporte/identidade. Zero código. |
| 2 | Esqueleto conectado | Servidor em stdio, ferramenta descoberta e chamada, `stdout` limpo. |
| 3 | Adaptador com identidade | Chamada à camada de serviço como o usuário autenticado, com gêmeo de fixtures. |
| 4 | Primeira ferramenta | `listar_*` com dado real; ID conferido no produto. |
| 5 | Segunda ferramenta | `obter_*` encadeada a partir de um ID devolvido. |
| 6 | Casos-limite | Os três erros distintos, limite de página, descrição extensa — com teste. |
| 7 | O que falta para produção | Escrita, remoto, authz de cliente, auditoria. **Documenta, não implementa.** |

Corte da última para a primeira. Nunca corte a evidência.

## O validador

`mcpx issues` é literal de propósito: ou o plano tem o formato completo, ou **nada é gerado**.

Exige por issue: campos `Labels` e `Estimativa`; seções `Contexto`, `Critério de aceite` e `Evidência exigida`; ao menos um item `- [ ]` verificável; dependência apontando para issue existente e de número menor; título sem placeholder. Formato exato em [`references/templates-issues.md`](skills/plano-mcp/references/templates-issues.md).

Saída compacta no estilo TOON, agregados pré-calculados, estado vazio explícito, `help[]` com o próximo passo, e exit `0` sucesso / `1` erro / `2` uso incorreto. Nenhum prompt interativo.

## Estrutura

```text
plano-mcp/
├── .claude-plugin/plugin.json
├── commands/               # /plano-mcp, /mcp-prontidao, /mcp-issues
├── skills/plano-mcp/
│   ├── SKILL.md            # protocolo (~1,2k tokens)
│   ├── references/         # rubrica, contrato, templates (sob demanda)
│   ├── examples/           # caso resolvido ponta a ponta
│   └── scripts/
│       ├── mcpx.mjs        # scan | issues | doctor
│       ├── install.sh
│       └── lib/            # repo, plan, out
└── tests/                  # unit + e2e (node --test)
```

## Dados e privacidade

- Nenhuma chamada de rede. Nada sai da máquina; sem telemetria.
- O `scan` lê apenas o **nome** de variáveis de ambiente — nunca o valor. Há teste que falha se um valor de segredo aparecer na saída.
- Os corpos das issues são gravados em `.plano-mcp/issues/` (ou `--out`). Nada é publicado: os comandos `gh` ficam para você rodar.

## Limitações

- O `scan` é regex de linha, não análise semântica: **sinal é pista, não veredito**. Falsos positivos típicos estão em [`references/rubrica-prontidao.md`](skills/plano-mcp/references/rubrica-prontidao.md).
- Não cobre toda forma de expor API: GraphQL, gRPC e RPC interno podem não aparecer na superfície. `superficie[0]` significa "não sei onde está a API", não "não existe".
- Prontidão não é auditoria de qualidade: mede capacidade de **expor leitura com identidade**, não cobertura de teste nem arquitetura.
- O plano depende do que está no repositório. O que só existe na cabeça do time vira `LACUNA` — e lacuna não respondida vira issue errada.

## Publicação (marketplace rclr-labs)

Layout esperado: `plugins/plano-mcp/{.claude-plugin/plugin.json,README.md,commands/,skills/plano-mcp/}`. Antes de publicar:

```bash
claude plugin validate ./plugin/plano-mcp
node --test plugin/plano-mcp/tests/*.test.mjs
```

Licença MIT.
