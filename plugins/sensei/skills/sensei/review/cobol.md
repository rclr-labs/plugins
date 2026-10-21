# review · COBOL

Carregado junto com `review.md`. **Em conflito, este arquivo vence.**

COBOL falha de um jeito próprio: quase sempre em silêncio. Campo de tamanho fixo trunca sem avisar, ponto no lugar errado encerra um escopo que ninguém queria encerrar, e I/O sem verificação de status continua como se tivesse dado certo. Por isso a ordem aqui começa em outro lugar.

## 1. Verificação de resultado — antes de tudo

**Toda operação que pode falhar tem retorno, e retorno não verificado é achado.**

- **`FILE STATUS` não declarado ou não testado** depois de `OPEN`, `READ`, `WRITE`, `REWRITE`, `DELETE`, `CLOSE`. Programa que segue adiante com status `35` ou `39` processa lixo
- **`AT END` / `NOT AT END` ausente** em leitura sequencial; **`INVALID KEY`** ausente em acesso indexado
- **`SQLCODE`/`SQLSTATE` não testado depois de cada `EXEC SQL`.** Testar só `SQLCODE = 0` e ignorar positivos (`+100` = não encontrado) é o erro mais comum; tratar `+100` como erro fatal é o segundo
- **`-911` / deadlock sem tratamento** em programa que atualiza — sem retry ou rollback explícito, a unidade de trabalho fica indefinida
- **`ON SIZE ERROR` ausente** em `DIVIDE`, `COMPUTE` e `MULTIPLY`. Sem ele, estouro e divisão por zero produzem resultado indefinido, não abend
- **`ON OVERFLOW` ausente** em `STRING` e `UNSTRING`
- **`EXEC CICS` sem `RESP`** (ou `NOHANDLE` sem verificação posterior): condição não tratada vira abend em produção

## 2. Dado: tamanho, sinal e tipo

- **Truncamento de alta ordem no `MOVE`** — origem `PIC 9(7)` para destino `PIC 9(5)` perde os dígitos mais significativos **sem aviso**. Confira todo `MOVE` entre numéricos de tamanhos diferentes
- **`MOVE` entre grupos com layouts diferentes** — move byte a byte, desalinha campo e corrompe o registro inteiro
- **Campo numérico recebendo não-numérico** — sem teste de classe (`IF campo IS NUMERIC`), `COMP-3` com conteúdo inválido causa data exception no primeiro uso aritmético, longe da origem
- **Sinal perdido** — `PIC 9` em vez de `PIC S9`; valor negativo vira positivo sem erro
- **`COMP-3` e `DISPLAY` misturados** em redefinição ou em arquivo lido com layout de outro programa
- **`ROUNDED` ausente** onde o cálculo é financeiro, e arredondamento divergindo entre programas que apuram o mesmo número
- **Reference modification** (`campo(i:n)`) com índice ou tamanho calculado, sem garantia de limite
- **`REDEFINES` usado para conversão de tipo** — depende do formato interno e quebra na mudança de compilador ou plataforma

## 3. Fluxo e escopo

- **Ponto no lugar errado.** O ponto encerra todas as estruturas abertas. Um ponto extra no meio de um `IF` faz o resto virar código incondicional — e compila. Prefira terminadores explícitos (`END-IF`, `END-PERFORM`, `END-EVALUATE`) e ponto só no fim do parágrafo
- **`PERFORM ... THRU`** com parágrafo intermediário acrescentado depois: o novo parágrafo passa a ser executado por todos os `THRU` que o abrangem. É a armadilha clássica de manutenção
- **`GO TO` saindo de `PERFORM`** — deixa a pilha inconsistente. `GO TO DEPENDING ON` sem tratar valor fora da faixa cai no próximo comando, em silêncio
- **`IF` aninhado além de dois níveis** onde `EVALUATE` expressa a mesma regra de forma plana
- **`EVALUATE` sem `WHEN OTHER`** — entrada não prevista passa sem nenhum tratamento
- **Comparação com literal** onde um **nível 88** diria o que o valor significa. `IF ST-CLIENTE = 'A'` contra `IF CLIENTE-ATIVO`: a segunda sobrevive à mudança do código de status

## 4. Tabelas

- **`SEARCH ALL` sobre tabela não ordenada** ou sem `ASCENDING KEY` declarada: resultado silenciosamente errado, não erro
- **Subscrito fora do limite do `OCCURS`** — sem `SSRANGE` ativo, lê ou grava memória vizinha
- **`OCCURS DEPENDING ON`** cujo contador não é validado antes do uso
- **Índice (`INDEXED BY`) e subscrito numérico misturados** sobre a mesma tabela
- **Tabela cheia sem tratamento** — laço que insere até estourar o `OCCURS`

## 5. Estado entre execuções

- **`WORKING-STORAGE` assumida zerada.** Em chamada subsequente de programa já carregado, ela **mantém o valor anterior**. Em CICS pseudo-conversacional, isso é defeito de dado entre transações, não bug de inicialização
- **`INITIALIZE` apagando campo com `VALUE`** que o programa esperava preservado
- **Acumulador não zerado** no início do processamento de cada grupo/quebra de controle
- **`LINKAGE SECTION` acessada sem o parâmetro ter sido passado** — abend 0C4 na primeira referência

## 6. Copybook e contrato

- **Mudança de copybook sem o levantamento de quem recompila.** Acrescentar campo no meio do layout invalida todo programa que lê o arquivo com a versão antiga. O achado é a **ausência da lista de impacto**, não a mudança
- **Layout de arquivo divergente entre programas** que leem o mesmo dataset
- **Tamanho de registro alterado** sem conversão dos arquivos existentes

## 7. Data

- **Ano com dois dígitos** em campo novo ou em comparação
- **Aritmética de data sem função intrínseca** (`FUNCTION INTEGER-OF-DATE`, `DATE-OF-INTEGER`) — cálculo manual erra bissexto e virada de mês
- **Data como numérico comparada como texto** (ou o inverso), em formato não ordenável (`DDMMAAAA`)

## 8. O que **não** reportar

- Estilo de indentação, uso de área A/B, preferência por `MOVE` contra `COMPUTE` em caso trivial
- `GO TO` em código legado estável e isolado, sem defeito concreto — a reescrita tem risco próprio e isso é decisão de arquitetura, não achado de review
- Nomenclatura de parágrafo que segue o padrão do sistema, ainda que você acharia outro melhor

## Padrões da equipe

> Preencher com o que vale **neste** sistema, e que nenhuma regra genérica cobre: convenção de prefixo por copybook, faixa de parágrafo reservada, rotina padrão de erro, tratamento de `SQLCODE` da casa, tabela de códigos de retorno, regra de recompilação. O que estiver aqui **vence** as regras acima, pelo mesmo princípio de precedência.
