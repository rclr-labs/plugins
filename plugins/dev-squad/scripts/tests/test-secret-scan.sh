#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
scan="$root/scripts/secret-scan.sh"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cd "$work"
git init -q
git config user.email test@example.com
git config user.name test

# Case 1: clean file -> allowed
echo "hello world" > clean.txt
git add clean.txt
if ! "$scan"; then
  echo "FAIL: clean commit was blocked" >&2
  exit 1
fi
git commit -qm init

# Case 2: AWS key in a staged file -> blocked
echo "AKIAABCDEFGHIJKLMNOP" > secret.txt
git add secret.txt
if "$scan"; then
  echo "FAIL: AWS-key-looking content was NOT blocked" >&2
  exit 1
fi
git reset -q secret.txt

# Case 3: staged .env file -> blocked
echo "SOME_VAR=1" > .env
git add .env
if "$scan"; then
  echo "FAIL: staged .env was NOT blocked" >&2
  exit 1
fi
git reset -q .env

# Case 4: staged .env.example -> allowed
echo "SOME_VAR=1" > .env.example
git add .env.example
if ! "$scan"; then
  echo "FAIL: staged .env.example was blocked" >&2
  exit 1
fi

# Case 5: nothing staged, but a tracked file is modified with a secret and
# the command is `git commit -am ...` -> blocked (unstaged diff scanned)
echo "AKIAABCDEFGHIJKLMNOP" >> clean.txt
if "$scan" "git commit -am test"; then
  echo "FAIL: git commit -am with an unstaged secret was NOT blocked" >&2
  exit 1
fi
git checkout -q -- clean.txt

# Case 6: multi-line command string where `git commit -a` is NOT the first
# line -> the -a/--all flag must still be detected and the unstaged diff
# scanned (regression test for the newline-splitting fix).
echo "AKIAABCDEFGHIJKLMNOP" >> clean.txt
if "$scan" "$(printf 'cd foo\ngit commit -am test')"; then
  echo "FAIL: multi-line git commit -am with an unstaged secret was NOT blocked" >&2
  exit 1
fi
git checkout -q -- clean.txt

# Case 7: a tracked .env file modified (not staged) and committed via
# `git commit -am ...` -> blocked by the filename rule even though its
# content matches no secret pattern.
echo "SOME_VAR=1" > .env
git add .env
git commit -qm "add env"
echo "SOME_OTHER_VAR=2" >> .env
if "$scan" "git commit -am test"; then
  echo "FAIL: git commit -am with an unstaged modified .env was NOT blocked" >&2
  exit 1
fi
git checkout -q -- .env

# Case 8: provider token prefixes are caught unquoted, in the shape they
# actually appear in an env-style assignment (the original pattern set only
# matched a quoted `api_key = "..."`, so every one of these slipped through).
# A isca do Slack é MONTADA em partes, por dois motivos somados: um literal de
# alta entropia aqui casaria o próprio padrão e o scanner — corretamente —
# bloquearia o commit deste arquivo de teste; e ela não pode mais conter
# `1234567890`, que passou a ser marcador de falsidade (ver MARCADORES_SINTETICOS
# no scanner). Com o valor antigo este caso provaria o oposto do que afirma.
slack_alta="xoxb-$(printf '7Q2Xk9PL')$(printf 'z4MnB1vC')"
declare -a provider_secrets=(
  "ANTHROPIC_API_KEY=sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  "OPENAI_API_KEY=sk-proj-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  "GH_TOKEN=ghp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  "GITHUB_TOKEN=github_pat_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  "GITLAB_TOKEN=glpat-AAAAAAAAAAAAAAAAAAAA"
  "GOOGLE_KEY=AIzaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  "STRIPE_KEY=sk_live_AAAAAAAAAAAAAAAAAAAA"
  "SLACK_TOKEN=$slack_alta"
  "SENDGRID_KEY=SG.AAAAAAAAAAAAAAAAAAAA.BBBBBBBBBBBBBBBBBBBB"
)
for secret in "${provider_secrets[@]}"; do
  printf '%s\n' "$secret" > provider.txt
  git add provider.txt
  if "$scan"; then
    echo "FAIL: provider token was NOT blocked: ${secret%%=*}" >&2
    exit 1
  fi
  git reset -q provider.txt
done
rm -f provider.txt

# Case 9: single-quoted and backtick-quoted secret assignments are caught —
# the original generic pattern required double quotes.
for quoted in "api_key = 'AAAAAAAAAAAAAAAAAAAA'" 'secret_token: `AAAAAAAAAAAAAAAAAAAA`' 'password = "correct-horse-battery"'; do
  printf '%s\n' "$quoted" > quoted.txt
  git add quoted.txt
  if "$scan"; then
    echo "FAIL: quoted secret assignment was NOT blocked: $quoted" >&2
    exit 1
  fi
  git reset -q quoted.txt
done
rm -f quoted.txt

# Case 10: ordinary source code that merely mentions these words is allowed —
# widening the patterns must not make the hook block normal commits.
cat > ordinary.js <<'JS'
const apiKey = process.env.API_KEY
const secretToken = config.get('secretToken')
function readPassword(input) { return input.trim() }
JS
git add ordinary.js
if ! "$scan"; then
  echo "FAIL: ordinary source referencing key/token/password names was blocked" >&2
  exit 1
fi
git reset -q ordinary.js
rm -f ordinary.js

# Case 11: REMOVER uma linha que casa um padrão é permitido. O propósito do
# scanner é impedir segredo de ENTRAR; ele aplicava os padrões ao diff inteiro,
# linhas `-` incluídas, e por isso bloqueava tirar conteúdo do repositório. O
# caso que isso quebra de pior não é higiene: é alguém tentando REMOVER um
# segredo commitado por engano — exatamente a correção que tem de ser fácil.
# Achado de verdade: destrastrear node_modules, cujo código de parsing de PEM
# (no `jose` e no driver do `mongodb`) carrega o cabeçalho de chave privada
# como string, para comparar prefixo e montar envelope.
#
# As iscas destes casos são MONTADAS em partes, nunca escritas como literal: um
# literal aqui casaria os próprios padrões e o scanner bloquearia o commit
# deste arquivo de teste. Os casos 2, 8 e 9 acima são mais antigos que o hook e
# carregam literais; não vale reescrevê-los sem motivo, mas caso novo monta.
pem_abre='-----BEGIN'
pem_fecha='PRIVATE KEY-----'
aws_falsa="AKIA$(printf 'A%.0s' $(seq 16))"
aws_outra="AKIA$(printf 'Z%.0s' $(seq 16))"

printf 'const header = "%s %s"\n' "$pem_abre" "$pem_fecha" > pem.js
git add pem.js
git commit -qm "baseline: arquivo com texto de PEM já no histórico"
git rm -q pem.js
if ! "$scan"; then
  echo "FAIL: remover uma linha com padrão de chave privada foi bloqueado" >&2
  exit 1
fi
git reset -q
git checkout -q -- pem.js

# Case 12: ADICIONAR a mesma linha continua bloqueado. Sem este caso, o
# Case 11 passaria com o scanner inteiro desligado — a recusa precisa de prova
# positiva, não só a permissão.
printf 'const k = "%s %s"\n' "$pem_abre" "$pem_fecha" > pem-novo.js
git add pem-novo.js
if "$scan"; then
  echo "FAIL: adicionar uma linha com chave privada NÃO foi bloqueada" >&2
  exit 1
fi
git reset -q pem-novo.js
rm -f pem-novo.js

# Case 13: hunk misto — uma linha de segredo sai e outra, diferente, entra.
# Tem de bloquear pela que ENTRA. É o caso que pega um filtro de adições
# implementado grosso, que descartasse o hunk todo por conter remoção.
printf '%s\n' "$aws_falsa" > misto.txt
git add misto.txt
git commit -qm "baseline misto"
printf '%s\n' "$aws_outra" > misto.txt
git add misto.txt
if "$scan"; then
  echo "FAIL: hunk que remove um segredo e adiciona outro NÃO foi bloqueado" >&2
  exit 1
fi
git checkout -q HEAD -- misto.txt
git reset -q

# Case 14: a outra metade do mesmo defeito — a regra de NOME de arquivo também
# olhava deleções, então remover um .env do repositório era bloqueado. Remover
# um .env commitado por engano é a correção certa, e tem de passar.
echo "SOME_VAR=1" > .env.paradeletar
git add .env.paradeletar
git commit -qm "baseline: .env no histórico"
git rm -q .env.paradeletar
if ! "$scan"; then
  echo "FAIL: remover um arquivo .env do repositório foi bloqueado" >&2
  exit 1
fi
git reset -q
git checkout -q -- .env.paradeletar

# Case 15: e adicionar um .env continua bloqueado depois da correção acima.
echo "SOME_VAR=2" > .env.novo
git add .env.novo
if "$scan"; then
  echo "FAIL: adicionar um arquivo .env NÃO foi bloqueado" >&2
  exit 1
fi
git reset -q .env.novo
rm -f .env.novo

# Case 16: fixture SINTÉTICO de chave privada é permitido. O cabeçalho PEM é o
# único padrão do conjunto que é uma string FIXA e pública — casá-lo não diz
# nada sobre entropia, e código legítimo o carrega como literal: parser que
# compara prefixo, e fixture de teste. Foi o que barrou o merge de 526 commits
# do upstream do paperclip, cujos testes trazem
# `const privateKey = "<cabeçalho>\nfixture\n<rodapé>"`.
pem_fim='-----END'
marca='fixture'
printf 'const privateKey = "%s %s\\n%s\\n%s %s"\n' \
  "$pem_abre" "$pem_fecha" "$marca" "$pem_fim" "$pem_fecha" > fixture-pem.ts
git add fixture-pem.ts
if ! "$scan"; then
  echo "FAIL: PEM marcado como fixture sintético foi bloqueado" >&2
  exit 1
fi
git reset -q fixture-pem.ts
rm -f fixture-pem.ts

# Case 17: o MESMO cabeçalho sem marcador de fixture continua bloqueado. Sem
# este caso o 16 passaria com a regra de PEM inteiramente desligada.
printf 'const privateKey = "%s %s\\nMIIEvQIBADANBgkqhkiG9w0BAQ\\n%s %s"\n' \
  "$pem_abre" "$pem_fecha" "$pem_fim" "$pem_fecha" > real-pem.ts
git add real-pem.ts
if "$scan"; then
  echo "FAIL: PEM sem marcador de fixture NÃO foi bloqueado" >&2
  exit 1
fi
git reset -q real-pem.ts
rm -f real-pem.ts

# Case 18: marcador DENTRO do próprio texto casado é permitido, para qualquer
# padrão. Um token real não pode conter a palavra "fixture" — então quando o
# marcador está dentro do casamento, e não apenas na linha, a prova é do
# próprio valor. É o caso dos `xoxb-fixture-token` dos testes do upstream.
slack_fixture="xoxb-${marca}-token"
printf 'const slackToken = "%s"\n' "$slack_fixture" > fixture-slack.ts
git add fixture-slack.ts
if ! "$scan"; then
  echo "FAIL: token cujo proprio valor contem 'fixture' foi bloqueado" >&2
  exit 1
fi
git reset -q fixture-slack.ts
rm -f fixture-slack.ts

# Case 19: o buraco que a allowlist NÃO pode abrir. Um segredo de alta entropia
# com a palavra "example" ao lado continua bloqueado: comentário na linha não
# prova nada sobre o valor, e vazamento real costuma vir acompanhado justamente
# dessas palavras. A allowlist vale para o cabeçalho PEM (string fixa) e para
# marcador dentro do casamento — nunca para marcador solto na linha.
aws_real="AKIA$(printf 'B%.0s' $(seq 16))"
printf '%s  # example key, replace me\n' "$aws_real" > quase.txt
git add quase.txt
if "$scan"; then
  echo "FAIL: segredo de alta entropia com 'example' na linha NAO foi bloqueado" >&2
  exit 1
fi
git reset -q quase.txt
rm -f quase.txt

# Case 20: o valor que o ENSAIO achou e que os 19 casos acima não pegavam —
# fixture do upstream do paperclip cuja falsidade está na sequência canônica,
# não numa palavra: `xoxb-` seguido de 1234567890 repetido três vezes, em
# server/src/services/chat-question-forms.test.ts. A prova (a) cobre porque a
# sequência está DENTRO do texto casado. Montado em partes só por simetria com
# os vizinhos; aqui o literal passaria, já que contém o marcador.
seq_falsa="$(printf '1234567890%.0s' 1 2 3)"
printf 'initialText = "xoxb-%s"\n' "$seq_falsa" > fixture-seq.ts
git add fixture-seq.ts
if ! "$scan"; then
  echo "FAIL: token com sequencia canonica de falsidade foi bloqueado" >&2
  exit 1
fi
git reset -q fixture-seq.ts
rm -f fixture-seq.ts

# Case 21: valor que é PALAVRA, não credencial, no padrão genérico de
# atribuição. Esse padrão aceita qualquer valor citado de 16+ caracteres depois
# de um nome tipo api_key, e por isso casa fixture de teste como
# "stale-capability" e "selected-secret-canary" — 79 valores distintos no merge
# do upstream do paperclip, nenhum deles com forma de credencial.
for palavra in "api_key = \"stale-capability\"" \
               "secret_token: 'selected-secret-canary'" \
               "ACCESS_TOKEN=\"SENSITIVE_SENTINEL_VALUE\""; do
  printf '%s\n' "$palavra" > palavra.txt
  git add palavra.txt
  if ! "$scan"; then
    echo "FAIL: valor em forma de palavra foi bloqueado: $palavra" >&2
    exit 1
  fi
  git reset -q palavra.txt
done
rm -f palavra.txt

# Case 22: a prova de palavra NÃO vale para o padrão de senha. Senha de
# verdade é frase de palavras — é a forma recomendada — então ali "parece
# palavra" não é prova de nada. O Case 9 já cobre o bloqueio; este caso existe
# para fixar o ESCOPO, que é o que torna a prova (d) defensável.
printf 'password = "%s-%s-%s"\n' correct horse battery > senha.txt
git add senha.txt
if "$scan"; then
  echo "FAIL: senha em forma de frase NAO foi bloqueada (prova (d) escapou do escopo)" >&2
  exit 1
fi
git reset -q senha.txt
rm -f senha.txt

# Case 23: e no mesmo padrão genérico, valor com forma de credencial segue
# barrado. Sem este caso o 21 passaria com a prova (d) aplicada a tudo.
cred="$(printf '7Q2Xk9PL')$(printf 'z4MnB1vCr8Td')"
printf 'api_key = "%s"\n' "$cred" > cred.txt
git add cred.txt
if "$scan"; then
  echo "FAIL: valor com forma de credencial NAO foi bloqueado no padrao generico" >&2
  exit 1
fi
git reset -q cred.txt
rm -f cred.txt

echo "PASS: secret-scan.sh"

# Wrapper: non-commit command is always allowed, even with a staged secret
echo "AKIAABCDEFGHIJKLMNOP" > secret2.txt
git add secret2.txt
if ! echo '{"tool_input":{"command":"ls -la"}}' | "$root/scripts/hook-secret-scan.sh"; then
  echo "FAIL: wrapper blocked a non-commit command" >&2
  exit 1
fi

# Wrapper: git commit command with a staged secret is blocked
if echo '{"tool_input":{"command":"git commit -m test"}}' | "$root/scripts/hook-secret-scan.sh"; then
  echo "FAIL: wrapper did not block git commit with a staged secret" >&2
  exit 1
fi

# Wrapper: git commit -am with nothing staged but an unstaged secret in a
# tracked file is blocked — this only passes if the wrapper actually
# forwards the intercepted command string to secret-scan.sh (regression
# test for the exec argument-passing fix). Unstage secret2.txt first so
# this case can't pass merely because something else is already staged.
git reset -q secret2.txt
echo "AKIAABCDEFGHIJKLMNOP" >> clean.txt
if echo '{"tool_input":{"command":"git commit -am test"}}' | "$root/scripts/hook-secret-scan.sh"; then
  echo "FAIL: wrapper did not forward the command and block git commit -am with an unstaged secret" >&2
  exit 1
fi
git checkout -q -- clean.txt

# Wrapper: a multi-line command where `git commit -a` is NOT the first line
# is blocked end-to-end — this exercises the full JSON-decode -> wrapper ->
# secret-scan.sh path, not just secret-scan.sh in isolation (regression test
# for the newline-splitting fix, at the layer where it actually matters).
echo "AKIAABCDEFGHIJKLMNOP" >> clean.txt
if echo '{"tool_input":{"command":"cd foo\ngit commit -am test"}}' | "$root/scripts/hook-secret-scan.sh"; then
  echo "FAIL: wrapper did not block a multi-line git commit -am with an unstaged secret" >&2
  exit 1
fi
git checkout -q -- clean.txt

# Wrapper: the commit's own target repository is scanned, not whatever repo
# the hook process happens to be sitting in. The squad-build workflow commits
# from isolated Dev worktrees, so a `cd <worktree> && git commit` must be
# scanned against that worktree — scanning the session's checkout would wave
# the real secret through.
other_repo="$(mktemp -d)"
git init -q "$other_repo"
git -C "$other_repo" config user.email test@example.com
git -C "$other_repo" config user.name test
echo "AKIAABCDEFGHIJKLMNOP" > "$other_repo/leak.txt"
git -C "$other_repo" add leak.txt

# Nothing staged here in $work, so a scan of the wrong repo would exit 0.
if echo "{\"tool_input\":{\"command\":\"cd $other_repo && git commit -m test\"}}" | "$root/scripts/hook-secret-scan.sh"; then
  echo "FAIL: wrapper did not scan the repo named by the command's leading cd" >&2
  exit 1
fi

# Same, via the payload's cwd field rather than an inline cd.
if echo "{\"cwd\":\"$other_repo\",\"tool_input\":{\"command\":\"git commit -m test\"}}" | "$root/scripts/hook-secret-scan.sh"; then
  echo "FAIL: wrapper did not scan the repo given by the payload cwd" >&2
  exit 1
fi

# A clean target repo still passes, so the cd handling can't block everything.
git -C "$other_repo" reset -q leak.txt
rm -f "$other_repo/leak.txt"
if ! echo "{\"cwd\":\"$other_repo\",\"tool_input\":{\"command\":\"git commit -m test\"}}" | "$root/scripts/hook-secret-scan.sh"; then
  echo "FAIL: wrapper blocked a clean commit in the target repo" >&2
  exit 1
fi
rm -rf "$other_repo"
cd "$work"

echo "PASS: hook-secret-scan.sh wrapper"
echo "PASS: hook-secret-scan.sh scans the commit's target repository"

# Wrapper: python3 missing/failure gracefully allows the command through
(
  # Create a fake python3 that always fails
  fake_bin="$(mktemp -d)"
  cat > "$fake_bin/python3" <<'PYTHON3'
#!/bin/sh
exit 1
PYTHON3
  chmod +x "$fake_bin/python3"

  # Shadow python3 with the failing version
  export PATH="$fake_bin:$PATH"

  # Even with a git commit command and no python3, wrapper should exit 0 (fail-open)
  if ! echo '{"tool_input":{"command":"git commit -m test"}}' | "$root/scripts/hook-secret-scan.sh"; then
    echo "FAIL: wrapper did not gracefully handle python3 failure" >&2
    exit 1
  fi

  # Cleanup
  rm -rf "$fake_bin"
)

echo "PASS: hook-secret-scan.sh python3-failure graceful degradation"
