# croqui

Mapeia um repositório e gera um pacote colável numa IA **que não tem acesso ao código**. Determinístico, sem IA e sem rede.

```
croqui                                  # inventário do repo atual
croqui pacote --nivel 2                 # gera croqui.md para colar numa IA
croqui pacote --budget 8000             # corta no orçamento de token
croqui pacote --anonimo                 # pseudonimiza classe, rota, tabela e caminho
croqui pacote --formato json            # mesma IR, em JSON, para pipeline
croqui visual                           # gera croqui.html, que abre offline
croqui grafo                             # só o fence mermaid, em stdout
```

## O que ele responde, e o que os vizinhos respondem

| Ferramenta | Pergunta |
|---|---|
| [`sensei repo`](../sensei) | por onde este time começa |
| [`plano-mcp`](../plano-mcp) | este repo está pronto para expor um MCP |
| **`croqui`** | **o que esta aplicação faz** |

## O pacote declara o próprio conteúdo

Todo pacote abre com o que contém, o que **não** contém, os arquivos recusados na leitura, os symlinks ignorados, o nível, a contagem de tokens, e que o grafo não é call graph. Sem essa declaração alguém cola o arquivo achando que é outra coisa.

**Contém:** nomes de classe, rota, tabela, job e comando; contagens; relações derivadas de convenção.
**Não contém:** valor de configuração, segredo, credencial, conteúdo de `.env`, literal de código, nem linha de código-fonte.

Detalhe do modelo de ameaça, das quatro camadas e dos cinco caminhos de abuso: [`skills/croqui/references/modelo-de-ameaca.md`](skills/croqui/references/modelo-de-ameaca.md).

**Não é sandbox.** Ele não reduz o acesso que a IA já tem — se ela tem Bash, já pode `cat .env`. Ele produz um artefato que pode sair, com garantia do que tem dentro.

## Instalação

```sh
curl -fsSL https://raw.githubusercontent.com/rclr-labs/plugins/main/plugins/croqui/scripts/install.sh | sh
```

Ou compile da fonte, que é o artefato de registro:

```sh
git clone https://github.com/rclr-labs/plugins && cd plugins/plugins/croqui
make fechamento && make build
```

## A rede do instalador não é a rede da ferramenta

O instalador baixa o binário e confere o checksum — ele usa rede. O **binário instalado não**:

```sh
go list -deps ./cmd/croqui | grep -xE 'net|net/http|net/smtp|os/exec' || echo "sem rede, sem subprocesso"
```

Em Go não existe import dinâmico, então esse fechamento é completo e estático. O binário não consegue abrir socket nem executar subprocesso — só ler arquivo. `make fechamento` falha o build se isso mudar, e o CI roda esse alvo em todo push.

`go.mod` não tem nenhum `require`, logo não existe `go.sum`: não há dependência de terceiro para auditar.

## Cobertura

| Camada | Extrai |
|---|---|
| `laravel` | rotas (incluindo closure) → controller → model → `$table`, jobs, commands, eventos |
| `nodets` | Nest (`@Controller`/`@Get`), Express (`app.get`), Prisma (`model`), TypeORM (`@Entity`) |
| `generico` | pastas agregadas, pontos de entrada reais, manifesto de stack |

`generico` ativa sempre e é honesto por construção: repositório fora das duas primeiras camadas tem mapa de **estrutura**, não de comportamento — e o pacote diz isso em vez de inventar rota.

## Licença

MIT.
