# review — regras gerais de code review

Carregado em **todo** `/sensei review`, qualquer que seja a linguagem. Quando existir `review/<linguagem>.md`, ele é carregado junto e **vence este arquivo em caso de conflito**.

## Ordem de leitura

Revise nesta ordem, e pare quando tiver 8 achados:

1. **Correção e casos de borda** — o que o código faz de errado com entrada legítima
2. **Tratamento de erro** — o que acontece quando algo falha
3. **Clareza** — o que o próximo leitor vai entender errado
4. **Duplicação** — o que vai divergir quando alguém mudar um dos lados
5. **Nomes** — só quando o nome **mente** sobre o que a coisa faz

A ordem não é arbitrária: um defeito de correção custa produção; um nome ruim custa uma discussão. Reportar o segundo antes do primeiro é como o revisor perde a atenção de quem lê.

> Segurança tem arquivo próprio. Se a mudança mexe em autenticação, autorização, segredo, entrada de usuário em consulta ou criptografia, diga ao usuário que `/sensei sec` cobre isso com profundidade — e reporte aqui apenas o que for evidente.

## 1. Correção e casos de borda

- Coleção vazia, string vazia, zero, negativo, um único elemento, limite exato
- `null`/`nil`/`None`/`undefined` em caminho novo — e, pior, o acesso "seguro" que esconde a ausência em vez de tratá-la
- Off-by-one em índice, fatia, paginação e laço (`<` contra `<=`)
- Data, fuso e virada de dia/mês/ano; duração negativa
- Número: divisão por zero, arredondamento, dinheiro em ponto flutuante, estouro de precisão
- Concorrência: *check-then-act* sem proteção, estado compartilhado mutável, reentrância
- Idempotência: repetir a operação duplica efeito? Em fila, webhook e retry, isso é obrigatório

## 2. Tratamento de erro

A pergunta é sempre a mesma: **quando isto falhar, quem fica sabendo, e o sistema fica consistente?**

- **Erro engolido** — capturado e não tratado, não registrado, não propagado. É o defeito mais comum e o mais caro de diagnosticar depois
- **Captura larga demais** — pegar tudo quando só se sabe tratar um caso específico
- **Falha silenciosa** — devolver vazio, zero ou default onde houve erro. Faz o chamador acreditar em sucesso
- **Mensagem inútil** — erro que não diz o que falhou nem o que fazer. Mensagem com stack trace ou dado sensível vazando para o usuário é achado de segurança
- **Recurso não liberado** no caminho de erro — arquivo, conexão, lock, transação
- **Retry sem limite** nem espera crescente; retry de operação não idempotente
- **Rollback ausente**: a operação parcial deixa estado inconsistente?

Três respostas precisam ser **distintas**: *não encontrei*, *não existe* e *você não pode*. Colapsar as três é o que faz um sistema responder "nenhum resultado" quando a resposta certa era "sem permissão".

## 3. Clareza

Clareza aqui não é estética — é **quanto tempo o próximo leitor leva para entender**, e quantas chances ele tem de entender errado.

- **Condicional aninhada** além de dois níveis, ou condição booleana composta sem nome
- **Número e string mágicos** — valor literal cujo significado só existe na cabeça de quem escreveu
- **Função que faz duas coisas** — o sinal é a conjunção no nome, ou o parâmetro booleano que escolhe o comportamento
- **Efeito colateral escondido** em função que parece consulta
- **Comentário que explica o quê em vez do porquê.** Comentário que contradiz o código é pior que comentário ausente: um é ruído, o outro é mentira
- **Fluxo invertido** — tratar o caso raro antes do comum, ou o erro depois do sucesso

Estilo e formatação **não entram aqui**: isso é trabalho do formatter, e comentário de formatação em review é ruído puro.

## 4. Duplicação

O critério não é "o código é parecido", é **o que acontece quando alguém mudar um dos lados**.

- **Regra de negócio repetida** em dois lugares: mudar um e esquecer o outro é questão de tempo. Achado real
- **Trecho parecido com propósito diferente**: deixe em paz. Unificar o que coincide hoje mas evolui separado cria acoplamento pior que a duplicação
- **Terceira ocorrência** é o gatilho prático: duas podem ser coincidência, três é padrão
- **Constante duplicada** entre camadas (front e back, código e migration) — divergência silenciosa garantida

## 5. Nomes

Só reporte nome quando ele **mente**:

- `getX` que escreve, `isX` que não devolve booleano, `validate` que corrige, `temp` que persiste
- Plural para coisa singular (e vice-versa)
- Unidade ausente onde ela importa: `timeout`, `tamanho`, `distancia` — segundos? milissegundos? bytes?
- Negação no nome de flag booleana (`naoHabilitado`), que força dupla negação em quem lê

Nome apenas **feio** não é achado. Nome **errado** é.

## Testes do comportamento alterado

- O comportamento novo ou alterado tem teste que **falharia antes** da mudança?
- O teste verifica comportamento ou implementação? Teste acoplado a implementação quebra em refatoração e não pega regressão
- Quando o diff mexe em validação, há caso **negativo**?
- Não exija teste para mudança trivial de config ou documentação

## Como reportar

Formato, severidade, refutação obrigatória e a regra de "não editar" estão no `SKILL.md`. Três lembretes que este arquivo reforça:

- **Máximo 8 achados**, ordenados S0 → S2, sem duplicata.
- **Zero achados é uma resposta legítima.** Escreva "Sem achados" e liste o que você verificou, por dimensão.
- **Confiança média exige declarar a suposição.** "Assumindo que `conn` já está aberto neste ponto" é uma frase honesta; omitir a suposição não é.
