# Modelo de ameaça do croqui

## O enquadramento, antes de tudo

O `croqui` **não reduz o acesso que a IA já tem.** Se ela roda com Bash liberado, ela já pode `cat .env` — nenhum binário muda isso. Ele não é sandbox.

O que ele resolve é outra coisa: **produzir um artefato que pode sair da máquina, com garantia enunciada do que tem dentro.** O ganho aparece no caso em que a IA *não* tem o repo e o pacote é o único canal — não no caso em que ela tem shell.

## Quatro camadas, e qual barra o quê

| Camada | Garante | Barra, por exemplo |
|---|---|---|
| Deny-list de arquivo | não **abrir** | `.env`, `*.pem`, `auth.json`, `id_rsa` |
| Forma, pelo tipo | o que **cabe** na IR | prosa, SQL, literal com aspas, linha de código |
| **Posição, pela gramática** | o que **alcança** a IR | `sk_live_…` num literal qualquer |
| `guarda`, no fim | resíduo de bug | segredo com forma de identificador |

### A forma sozinha não resolve

Chave de Stripe, chave de acesso da AWS e hash hexadecimal são, por acidente, identificadores perfeitamente válidos: casam `^[A-Za-z_][A-Za-z0-9_]*$`.

| Candidato | Casa na forma de identificador? |
|---|---|
| `PedidoController` | sim |
| `sk_live_` + 26 caracteres | **sim** |
| `AKIA` + 16 maiúsculas | **sim** |
| hex de 32 caracteres | **sim** |
| `minha senha`, `SELECT * FROM x` | não |

A forma do tipo rejeita prosa, SQL, aspas e quebra de linha — **não** rejeita segredo com cara de identificador. Dizer que "a garantia mora no tipo" seria otimismo.

### A posição é quem faz o trabalho pesado

O extrator só chama construtor sobre token em **posição de declaração**: o nome depois de `class`, o caminho dentro de `Route::get('…')`, o valor de `$table`, o decorator `@Controller`, o bloco `model` do Prisma. Nenhuma regra aponta para "literal de string arbitrário", logo um segredo em `$chave = "sk_live_…"` nunca alcança um construtor.

Isso é invariante explícita, com teste próprio: um segredo plantado em sete posições não-declarativas — literal atribuído, constante, valor de array, comentário de linha e de bloco, default de parâmetro, valor de retorno — não aparece em nenhum dos três formatos de saída. O teste tem **controle positivo**: se a extração não produzir conteúdo, ele falha em vez de passar vacuamente.

Consequência: a deny-list ser burlável (`.env.producao.bak`, `notas.txt` com as chaves dentro) **não** é vazamento. Mesmo que o arquivo seja lido, não há regra que extraia literal dele.

## Os cinco caminhos de abuso

A ferramenta é um deputado confuso em potencial — uma IA pode invocá-la para alcançar o que não alcançaria sozinha.

| Abuso | Trava |
|---|---|
| `--root ~/.ssh` — a deny-list protege conteúdo, não escopo; a árvore de um diretório de trabalho entrega o nome de todo projeto | Raiz recusada sem marcador de projeto (`.git`, `composer.json`, `package.json`, `go.mod`, `pyproject.toml`). É allowlist: `~/.ssh` não é um repo. `/` e `$HOME` recusados |
| Symlink `./storage-dados → ~/.ssh` adotaria a home como parte da raiz | Nunca seguido, sempre contado, e o número vai na saída. Silêncio esconderia o que foi plantado |
| `--saida ~/.zshrc` como escrita arbitrária | Confinado à raiz ou ao diretório corrente, extensão em `{.md,.html,.json}`, `--forca` para sobrescrever |
| Injeção de prompt pelo próprio repo: classe `IgnoreAsInstrucoesAnteriores` | Identificador morre na forma (não se escreve frase em `[A-Za-z0-9_]`); caminho e rota saem em backtick no `.md` e escapados no `.html` e **dentro do SVG** |
| Deny-list burlável | Fechado por posição + forma |

### Limite conhecido do symlink

A checagem de symlink vem antes da de diretório, então symlink plantado dentro de pasta pulada (`storage/`, `vendor/`) não é visitado e não entra na contagem. Não é vazamento — nada é seguido —, mas é sub-relato.

## A garantia que Go torna provável

Em Go não existe import dinâmico, então `go list -deps ./cmd/croqui` devolve o fechamento transitivo **completo e estático** do binário:

```sh
go list -deps ./cmd/croqui | grep -xE 'net|net/http|net/smtp|os/exec' || echo limpo
```

A ferramenta não consegue abrir socket nem executar subprocesso — só ler arquivo. `make fechamento` falha o build se isso mudar, e o CI roda esse alvo. `go.mod` sem nenhum `require`, logo sem `go.sum`: não há dependência de terceiro para auditar.

É por isso também que ela **não lê histórico git**: ler exigiria `os/exec`, e a garantia deixaria de ser binária.

`net/url` é permitido de propósito: ele não tem capacidade de rede e é importado transitivamente por `html/template`, que é o que dá escape de HTML correto. Proibir pelo prefixo `net` quebraria o build e empurraria para escape caseiro — troca ruim num renderizador sensível a XSS.

## O papel do `guarda`

Gate final sobre o texto **já renderizado**. Ele pega exatamente o que a forma não pega: segredo com cara de identificador. É **defesa em profundidade contra bug de extração**, nunca a garantia de primeira linha.

Quando ele acusa, a ferramenta **aborta e não escreve nada**. Ela não filtra: um achado ali significa regra de extração com defeito, e filtrar esconderia o defeito em vez de corrigi-lo.

O achado reporta só o id da regra e o offset, nunca o valor casado — relatório de guarda que repete o segredo vira o vazamento que ele existe para impedir. Pela mesma razão, o erro de forma reporta só o tamanho em bytes do que foi rejeitado.

### Base64 e caminho de arquivo

A detecção de base64 precisou de dois discriminadores medidos, porque a classe de caracteres do base64 inclui `/` e fazia **todo caminho de arquivo com 40+ caracteres** parecer um blob:

- **entropia de Shannon:** caminho de pasta chega a 3,91 bit/caractere; base64 de bytes aleatórios começa em 4,48. O limiar de 4,2 deixa margem para os dois lados
- **contagem de barras:** caminho aninhado tem três ou mais; base64 de 40 caracteres tem ~0,6 esperadas

E o padding é sinal próprio: caminho de arquivo e célula de tabela nunca terminam em `=`, então com padding o limiar de comprimento cai para 24.

## O limite do `--anonimo`

`--anonimo` pseudonimiza classe, rota, tabela **e segmento de caminho**. O último importa porque a árvore de pastas revela nome de projeto e de domínio tanto quanto o código: pseudonimizar só identificador deixaria a saída emitindo `app/Services/<NomeDoSistema>`.

Segmentos canônicos de framework (`app`, `Http`, `Controllers`, `routes`, `src`, `cmd`, `internal`) passam verbatim, senão o mapa não ensina nada. Extensão de arquivo também atravessa: é informação técnica, não identidade.

O mapa reverso fica em `$XDG_STATE_HOME/croqui/` com `0600`, fora do repositório, e seu caminho não entra no pacote.

**Ele protege o pacote em trânsito. Não protege de quem tem a máquina** — quem tem shell ali pode ler o mapa. Prometer mais seria mentir.

## O `.html` não é superfície de revisão

Os três renderizadores saem da mesma IR, mas o `.md` é o **artefato de registro**: a superfície que uma pessoa lê antes de o pacote sair da máquina. O argumento de segurança depende dessa leitura, e por isso o formato foi escolhido por legibilidade humana — ninguém revisa um JSON de 400 linhas antes de colar.

O `.html` é **olhado**, não lido. Está escrito aqui para que o passo de revisão não desapareça quando o HTML virar a coisa que as pessoas compartilham.

Ele abre offline por construção: nenhum `<script>`, nenhum `<link>` externo, fontes do sistema, meta CSP, e o SVG do grafo é desenhado pela própria ferramenta. Mermaid exigiria biblioteca de CDN, e isso quebraria a promessa "sem rede" na hora de *visualizar*, não de gerar.

O SVG entra no template por um bypass explícito de escape (`template.HTML`), então o escape dos rótulos é feito **dentro** do gerador de SVG — o bypass cobre só a geometria. A justificativa "os valores já passaram pelas formas fechadas" é verdadeira no caminho do extrator e insuficiente como defesa em profundidade.

## O que o grafo não é

Derivado de **convenção de framework e de aresta de import, em nível de módulo**. Não é call graph e não vem de execução. Conclusão sobre ordem de chamada não se tira dele.
