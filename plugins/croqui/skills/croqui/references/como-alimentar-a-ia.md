# Como alimentar a IA com o pacote

## Escolha o nível pela pergunta

| A pergunta é sobre | Nível |
|---|---|
| o que o sistema é, que stack, por onde entra | 1 |
| onde mora tal responsabilidade, que entidades existem | 2 |
| como um fluxo atravessa o sistema | 3 |

## Declare o nível junto com o pacote

Sempre. Nível 1 não carrega rota; afirmar algo sobre rota a partir dele é inventar. A IA não sabe o que ficou fora se ninguém disser.

## O grafo não é call graph

Ele vem de convenção de framework e de aresta de import, em nível de módulo. **Conclusão sobre ordem de chamada, sobre o que chama o quê em runtime, ou sobre caminho de execução não se tira dele.** O próprio pacote diz isso no corpo; repita ao colar.

## Pergunta que o pacote não sustenta

Responda **"o croqui não carrega isso"** e diga o que carregaria — ler o arquivo, rodar o teste, olhar o log. Nunca preencha com inferência: o valor do pacote é que o que está nele é verificável, e inferência silenciosa destrói exatamente isso.

O pacote não tem: corpo de função, valor de configuração, cobertura de teste, desempenho, histórico git, nem regra de negócio que não esteja em nome de classe.

## Cobertura por camada

O pacote declara as camadas que ativaram. Se só o `generico` ativou, há estrutura e pontos de entrada, mas não rota nem entidade — e a resposta sobre comportamento tem que dizer isso em vez de inferir a partir de nome de pasta.

## Antes de colar

Leia o `.md`. A garantia é por construção, mas a revisão humana é parte do desenho — não a pule por causa dela.
