# review · Python

Carregado junto com `review.md`. **Em conflito, este arquivo vence.**

## 1. Armadilhas da linguagem

- **Argumento default mutável** — `def f(itens=[])` compartilha a mesma lista entre todas as chamadas. `None` + atribuição no corpo
- **Closure de laço com late binding** — função criada dentro de `for` captura a variável, não o valor. Todas acabam com o último
- **`is` com literal** — `x is 0`, `s is "abc"` dependem de cache do interpretador. `==` para valor, `is` só para `None`, `True`, `False` e identidade real
- **Igualdade de float** e dinheiro em `float` — `Decimal` onde o valor é monetário
- **Shadowing de builtin** (`list`, `dict`, `id`, `type`, `input`) — quebra em outro ponto do mesmo escopo
- **Mutação durante iteração** da mesma coleção
- **`except` nu ou `except Exception` sem re-raise** — captura `KeyboardInterrupt`/`SystemExit` e engole o que você não previu
- **`assert` usado como validação** — desaparece com `python -O`. Validação é `if` + `raise`

## 2. Recurso e contexto

- **Arquivo, socket, lock ou conexão sem `with`** — não liberado no caminho de erro
- **Transação sem bloco de contexto** — commit no caminho feliz, sem rollback no de erro
- **`finally` que engole exceção** por conter `return`
- **Pool de conexão sem limite** ou conexão criada por requisição

## 3. Assíncrono

- **`await` faltando** — a corrotina vira objeto não aguardado, o trabalho nunca roda e o aviso aparece só no shutdown
- **Chamada bloqueante dentro de `async`** — `requests`, `time.sleep`, I/O de arquivo, consulta síncrona ao banco travam o event loop inteiro
- **Task criada sem referência** — pode ser coletada antes de terminar
- **`asyncio.gather` sem `return_exceptions`** nem tratamento: a primeira falha cancela o resto em silêncio

## 4. Dado e tipagem

- **`Optional` não tratado** — anotação diz que pode ser `None` e o código acessa atributo direto
- **`dict[chave]` onde `.get` com default era o certo** (ou o inverso: `.get` escondendo chave obrigatória ausente)
- **Anotação que mente** — assinatura diz `list[str]` e a função devolve `None` em algum caminho
- **Datetime ingênuo** — `datetime.now()` sem fuso, comparado com valor que tem fuso. `datetime.now(timezone.utc)`
- **Conversão sem validação** — `int(entrada)` sem tratar `ValueError`

## 5. Execução e desserialização

- **`subprocess` com `shell=True`** e qualquer parte vinda de fora. Lista de argumentos, sem shell
- **`eval`, `exec`, `pickle.loads`, `yaml.load` sem `SafeLoader`** sobre dado externo
- **SQL por f-string, `%` ou `.format`** — parâmetro, sempre. Ver `sec.md`
- **`os.path.join` com entrada do usuário** sem confinar a uma base

## 6. Log e observabilidade

- **`print` em código de produção** — sem nível, sem destino, sem contexto
- **Segredo ou PII em log** — token, corpo inteiro de requisição, exceção com credencial na mensagem
- **`logging.exception` fora de `except`**, ou `logger.error` sem `exc_info` onde o stack importa
- **Logger criado com `logging.getLogger()` sem nome** — perde a hierarquia de configuração

## 7. Dependência e ambiente

- **Versão não fixada** em dependência de produção
- **Import caro no topo** de módulo carregado por CLI ou função serverless
- **Import circular** resolvido por import dentro de função, sem comentário dizendo por quê
- **Variável de ambiente lida sem default nem validação**, falhando tarde

## 8. Teste

- **Mock do que não é fronteira** — mockar a própria função sob teste, ou o ORM em vez do cliente HTTP
- **Teste dependente de ordem** ou de estado global entre testes
- **`assert` sem mensagem** em condição composta, que não diz o que falhou
- **Fixture com efeito fora do escopo** — escreve em caminho real, não limpa

## 9. O que **não** reportar

- Formatação, comprimento de linha, ordem de import — é trabalho do formatter e do linter
- Ausência de type hint em código que não os usa como convenção
- Preferência entre compreensão de lista e laço, quando a legibilidade é equivalente

## Padrões da equipe

> Preencher com o que vale **nesta** casa: biblioteca padrão de log, forma de configuração, camada obrigatória de acesso a dado, convenção de pacote, versão mínima de Python, política de dependência. O que estiver aqui **vence** as regras acima.
