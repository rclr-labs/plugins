# docs — revisão de documentação

Modo para texto técnico: README, runbook, ADR, manual, comentário de API, material de treinamento.

O critério não é escrita bonita. É: **alguém consegue agir a partir disto, e o que está escrito ainda é verdade?**

## 1. Verdade — a dimensão que mais apodrece

Documentação erra de um jeito que código não erra: ela **envelhece sozinha**, sem ninguém tocar nela.

- **Comando que não roda mais** — flag renomeada, subcomando removido, caminho mudado
- **Caminho de arquivo que não existe** — o defeito mais comum em repositório que foi reorganizado. Verifique todos
- **Link quebrado**, interno ou externo
- **Versão, número ou nome desatualizado** — dependência, endpoint, nome de serviço
- **Exemplo que não bate com a assinatura real** da função ou do endpoint
- **Instrução que pressupõe estado não declarado** — "rode o script" sem dizer de onde, com qual permissão, com o quê instalado

Quando puder verificar, **verifique**: abra o arquivo citado, confira a flag no `--help`, rode o comando. Documentação é o único artefato em que a checagem mecânica pega a maior parte dos defeitos.

## 2. Alegação sem fonte

- **Número sem origem** — percentual, benchmark, "reduz em X%". Ou tem fonte e data, ou sai
- **Afirmação sobre ferramenta de terceiro** sem link para a documentação dela
- **Precisão fabricada** — número exato onde não houve medição ("três vezes mais rápido", "dois em cada três"). É pior que a estimativa honesta, porque parece medido
- **Afirmação sobre o mercado** — "quase todo mundo faz", "ninguém implementa" — sem dado
- **Generalização universal** — "sempre", "nunca", "todo", onde o autor quis dizer "normalmente"

## 3. Acionabilidade

- **Pré-requisito não declarado**: o que precisa existir antes do primeiro passo?
- **Critério de sucesso ausente**: como o leitor sabe que funcionou? Saída esperada, não "deve funcionar"
- **Caminho de erro ausente**: o que fazer quando o passo 3 falha
- **Dono ausente** em processo: "o time" não é dono; pessoa é
- **Decisão sem o porquê** — registro de decisão que lista a escolha e omite a alternativa descartada e o motivo. É o que faz a decisão ser retomada do zero em seis meses

## 4. Estrutura

- **A informação que o leitor procura primeiro está primeiro?** Documento que abre com histórico e esconde o comando no fim falha nisso
- **Título que não diz o conteúdo** — "Observações", "Diversos", "Informações gerais"
- **Parágrafo onde cabia tabela** — duas ou mais dimensões comparadas em prosa obrigam o leitor a montar a tabela de cabeça
- **Nível errado de público** — misturar instrução de operação com explicação conceitual sem separar
- **Duplicação entre documentos**: dois lugares com a mesma instrução divergem. Um é a fonte; o outro aponta

## 5. Segurança e privacidade no texto

- **Segredo em exemplo** — token, senha, string de conexão, mesmo "fictício" com cara de real
- **Dado de cliente** em documento que vai para repositório público: razão social, nome de sistema interno, identificador de chamado, trecho de reunião
- **IP, host e caminho interno** em documento publicado
- **Exemplo que ensina o inseguro** — comando com `--insecure`, `verify=False` ou credencial em linha de comando, sem a ressalva

## O que **não** reportar aqui

- Preferência de estilo, voz ou tamanho de frase, quando o texto está claro
- Formatação que o renderizador resolve
- Ausência de seção que o documento não se propõe a ter

## Como reportar neste modo

Além do formato do `SKILL.md`:

- **Separe o que você verificou do que você suspeita.** "Caminho `x/y.md` não existe (verificado)" é diferente de "este comando talvez tenha mudado de flag".
- **Para alegação sem fonte, o achado é a falta da fonte** — não discuta se o número está certo. A correção é "cite a fonte e a data, ou remova".
- Em material de treinamento, acrescente uma verificação: **o documento e o slide/exercício correspondente dizem a mesma coisa?** Divergência entre os dois é o defeito que o aluno percebe na hora.
