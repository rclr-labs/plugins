# review · PowerShell

Carregado junto com `review.md`. **Em conflito, este arquivo vence.**

PowerShell tem duas armadilhas estruturais que explicam a maior parte dos defeitos: **erro que não interrompe** e **operador que não devolve booleano**. Comece por elas.

## 1. Erro que não interrompe

- **`try/catch` que não pega nada.** A maioria dos cmdlets gera erro *não-terminante*: o `catch` não dispara e o script segue. Ou `-ErrorAction Stop` na chamada, ou `$ErrorActionPreference = 'Stop'` no escopo — sem um dos dois, o `try` é decorativo
- **`catch` vazio ou só com `Write-Host`** — engole a falha e devolve sucesso a quem chamou
- **Comando nativo (`.exe`, `git`, `robocopy`) sem checar `$LASTEXITCODE`.** Código de saída diferente de zero **não** gera exceção em PowerShell
- **`exit` dentro de função** encerra a sessão inteira quando o script é *dot-sourced*; `throw` é o correto para propagar
- **Script sem código de saída explícito** — chamado por agendador ou pipeline, "falhou mas saiu 0" é o pior resultado possível

## 2. Comparação e tipo

- **`-eq` sobre array devolve os elementos que casam, não `$true`/`$false`.** `if ($lista -eq 'x')` é verdadeiro quando o array contém `'x'`, e isso costuma ser acidente
- **`$null` do lado direito** — `if ($x -eq $null)` falha quando `$x` é array. A forma correta é `$null -eq $x`
- **Sem `Set-StrictMode -Version Latest`** — propriedade inexistente devolve `$null` em vez de erro, e o defeito aparece três passos adiante
- **Coerção silenciosa** em comparação de string com número (`'10' -lt '9'` é verdadeiro: comparação textual)
- **Parâmetro sem tipo nem validação** — `[ValidateSet]`, `[ValidateNotNullOrEmpty]`, `[ValidateRange]` transformam erro de uso em mensagem clara

## 3. Pipeline e performance

- **`$resultado += $item` dentro de laço** — recria o array a cada iteração. Em milhares de itens é quadrático. Use `[System.Collections.Generic.List[object]]` ou deixe o pipeline streamar
- **Coletar quando dava para streamar** — `$todos = Get-ChildItem -Recurse` sobre árvore grande carrega tudo em memória antes do primeiro processamento
- **`Where-Object` depois de cmdlet que tem filtro nativo** — `Get-ChildItem -Filter` e `Get-WinEvent -FilterHashtable` filtram na origem; o `Where-Object` filtra depois de trazer tudo
- **`Write-Host` em função que produz dado** — não vai para o pipeline e não é capturável. `Write-Output` para dado, `Write-Verbose`/`Write-Information` para mensagem de progresso

## 4. Operação destrutiva

- **`Remove-Item -Recurse -Force` com caminho construído por variável.** Se a variável vier vazia, o caminho vira a raiz. Valide antes
- **Função destrutiva sem `SupportsShouldProcess`** — sem `[CmdletBinding(SupportsShouldProcess)]` e `if ($PSCmdlet.ShouldProcess(...))`, não há `-WhatIf` nem `-Confirm`, e não há ensaio possível
- **`-Path` onde devia ser `-LiteralPath`** — nome de arquivo com `[`, `]` ou `*` é interpretado como curinga e o alvo errado é afetado
- **`Test-Path` seguido de ação** — entre a checagem e o uso o estado muda; trate o erro da ação em vez de testar antes

## 5. Credencial e execução dinâmica

- **`ConvertTo-SecureString -AsPlainText -Force`** com literal no script: é senha em texto claro com uma camada de teatro
- **Senha em parâmetro `[string]`** — fica no histórico, na linha de comando e no log de processo. Use `[pscredential]` ou `[securestring]`
- **`Invoke-Expression`** com qualquer parte vinda de fora: é a injeção de comando do PowerShell. Quase sempre há cmdlet equivalente
- **`& $comando $args` montado por concatenação** — passe array de argumentos, não string
- **`-ExecutionPolicy Bypass` dentro do próprio script** ou credencial em `-ArgumentList` de `Start-Process`

## 6. Portabilidade e ambiente

- **Codificação de saída difere entre 5.1 e 7.** `Out-File` e `>` gravavam UTF-16LE por padrão no 5.1 e UTF-8 no 7. Arquivo consumido por outro sistema precisa de `-Encoding` explícito
- **Caminho montado com `\` literal** em vez de `Join-Path`
- **`$PSScriptRoot` ausente** — script que depende do diretório de trabalho do chamador quebra quando o agendador o invoca de outro lugar
- **Alias em script** (`ls`, `cat`, `%`, `?`) — resolvem diferente entre plataformas e sessões; em script, o nome completo
- **Módulo importado sem versão** — `Import-Module X` pega o que estiver instalado; `-RequiredVersion` ou `#Requires -Modules @{...}`
- **`#Requires -Version` ausente** em script que usa recurso de 7.x

## 7. Forma do cmdlet

- **Verbo fora da lista aprovada** (`Get-Verb`) — quebra a descoberta e sinaliza função que faz mais de uma coisa
- **Sem `[CmdletBinding()]`** — perde `-Verbose`, `-Debug` e tratamento comum de erro
- **Sem bloco `process`** em função que recebe do pipeline: processa só o último item
- **Comentário de ajuda ausente** em função exportada por módulo (`.SYNOPSIS`, `.PARAMETER`, `.EXAMPLE`)

## 8. O que **não** reportar

- Preferência entre `ForEach-Object` e `foreach` quando o volume é pequeno
- Ausência de `[OutputType()]`
- Estilo de chave e indentação

## Padrões da equipe

> Preencher com o que vale **nesta** casa: módulo interno obrigatório, forma padrão de log, convenção de código de saída, política de execução no parque, caminho de credencial (cofre, não arquivo), prefixo de função por módulo. O que estiver aqui **vence** as regras acima.
