#!/usr/bin/env bash
set -euo pipefail

# Blocks a git commit when the staged diff looks like it contains a secret.
# Exit 0: nothing suspicious, allow the commit.
# Exit 2: secret detected, block (Claude Code PreToolUse hook convention).

# NOTE: the scan loop below uses `grep -Ei`, so every pattern here is matched
# case-insensitively. High-confidence provider prefixes are listed individually
# because they can be matched unquoted with no false-positive risk; the generic
# assignment pattern at the end still requires a quoted value, since an unquoted
# `apiKey: someLongVariableName` is far more often a reference than a literal.

# Os dois padrões que a regra de síntese trata de forma especial são nomeados
# aqui e REFERENCIADOS na lista abaixo, nunca escritos duas vezes: a regra
# compara o padrão que casou com estes valores, e uma cópia divergente faria a
# comparação falhar em silêncio — a allowlist simplesmente pararia de valer,
# sem erro na tela.
#
# PADRAO_ESTRUTURAL: o cabeçalho PEM, único item do conjunto que é string FIXA
# e pública. Casá-lo não diz nada sobre entropia.
# PADRAO_GENERICO: a atribuição genérica, que aceita qualquer valor citado de
# 16+ caracteres depois de um nome tipo api_key — e por isso casa palavra em
# inglês tanto quanto credencial.
PADRAO_ESTRUTURAL='-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'
PADRAO_GENERICO='(api|secret|access|private)[_-]?(key|token)[[:space:]]*[:=][[:space:]]*["'"'"'`][A-Za-z0-9/+_=-]{16,}["'"'"'`]'

PATTERNS=(
  'AKIA[0-9A-Z]{16}'                                  # AWS access key id
  "$PADRAO_ESTRUTURAL"
  'sk-ant-[A-Za-z0-9_-]{20,}'                         # Anthropic
  'sk-(proj-)?[A-Za-z0-9]{32,}'                       # OpenAI
  'gh[pousr]_[A-Za-z0-9]{30,}'                        # GitHub PAT / OAuth / refresh
  'github_pat_[A-Za-z0-9_]{30,}'                      # GitHub fine-grained PAT
  'glpat-[A-Za-z0-9_-]{20,}'                          # GitLab PAT
  'AIza[0-9A-Za-z_-]{35}'                             # Google API key
  '(sk|rk)_live_[0-9A-Za-z]{16,}'                     # Stripe live key
  'xox[baprs]-[A-Za-z0-9-]{10,}'                      # Slack token
  'SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}'        # SendGrid
  'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.'    # signed JWT
  "$PADRAO_GENERICO"
  '(password|passwd)[[:space:]]*[:=][[:space:]]*["'"'"'`][^"'"'"'`[:space:]]{12,}["'"'"'`]'
)

# The intercepted command string, e.g. "git commit -am 'msg'". Optional —
# direct callers (tests, manual runs) may invoke this script with no
# arguments, in which case only the staged diff is scanned.
cmd="${1:-}"

# `git commit -a`/`-am`/`--all` stages tracked-file modifications as part of
# the commit itself, bypassing whatever was (or wasn't) `git add`-ed. Detect
# that flag so we also scan the unstaged diff in that case.
has_commit_all_flag() {
  local c="$1" word words
  read -ra words <<<"${c//$'\n'/ }"
  for word in ${words[@]+"${words[@]}"}; do
    case "$word" in
      --all) return 0 ;;
    esac
    case "$word" in
      -[a-zA-Z]*)
        [[ "$word" == *a* ]] && return 0
        ;;
    esac
  done
  return 1
}

# Só as linhas ADICIONADAS entram no scan de conteúdo, e deleções de arquivo
# ficam fora da regra de nome. Remoção não pode introduzir segredo, e aplicar
# os padrões ao diff inteiro — linhas `-` incluídas — bloqueava tirar conteúdo
# do repositório. O caso que isso quebrava de pior não era higiene de
# node_modules: era REMOVER um segredo commitado por engano, que é a correção
# que mais precisa ser fácil. Um hunk misto segue bloqueado pela linha que
# entra, e o `+++` é descartado porque é cabeçalho de arquivo, não conteúdo.
#
# É `awk` com `substr`, e não `grep`, por um motivo medido: o `grep` desta
# máquina é o ugrep, que REJEITA `^\+\+\+` em BRE como erro de sintaxe — e com
# um `|| true` no fim do pipe isso virava diff vazio, ou seja "nada
# suspeito". Fail-OPEN num controle de segurança, pior que o defeito original.
# O awk não tem ambiguidade de BRE/ERE, não usa regex nenhuma aqui, e sai 0
# com ou sem casamento, então não precisa de `|| true` para mascarar nada.
apenas_adicoes() { awk 'substr($0,1,1)=="+" && substr($0,1,3)!="+++"'; }

staged_diff="$(git diff --cached --unified=0 2>/dev/null || true)"
staged_diff="$(printf '%s' "$staged_diff" | apenas_adicoes)"
staged_files="$(git diff --cached --name-only --diff-filter=d 2>/dev/null || true)"

# `git commit -a`/`-am`/`--all` stages tracked-file modifications as part of
# the commit itself, so when that flag is present we also need to scan the
# unstaged diff and unstaged (but tracked) file names — not just staged ones.
unstaged_diff=""
unstaged_files=""
if has_commit_all_flag "$cmd"; then
  unstaged_diff="$(git diff --unified=0 2>/dev/null || true)"
  unstaged_diff="$(printf '%s' "$unstaged_diff" | apenas_adicoes)"
  unstaged_files="$(git diff --name-only --diff-filter=d 2>/dev/null || true)"
fi

if [[ -z "$staged_diff" && -z "$staged_files" && -z "$unstaged_diff" && -z "$unstaged_files" ]]; then
  exit 0
fi

# Marcas que alguém escreve DE PROPÓSITO para dizer "este valor é falso".
# Usadas apenas pela regra de síntese abaixo, nunca para afrouxar um padrão.
#
# `1234567890` entra como sequência canônica de falsidade, não como heurística
# de entropia. A tentativa anterior foi exatamente essa — permitir valor de
# baixa entropia (ciclo repetido, corrida sequencial) — e a medição derrubou a
# ideia: 13 das 14 iscas que esta suíte usa para provar BLOQUEIO viravam
# permitidas, porque toda isca honesta é sintética por construção — prefixo de
# provedor seguido de um caractere repetido, ou de uma corrida alfabética. (As
# iscas não são citadas aqui por extenso: um literal neste comentário casaria
# os próprios padrões e bloquearia o commit deste arquivo. Já aconteceu.)
# Uma regra que libera o fixture do upstream e junto quase toda a suíte não é
# allowlist, é desligar o portão. A sequência literal é estreita e
# verificável; a entropia não era.
MARCADORES_SINTETICOS='fixture|synthetic|placeholder|dummy|redacted|example|1234567890'

# Um valor tem forma de PALAVRA — palavras minúsculas, ou MAIÚSCULAS, unidas
# por `-`/`_` — e não de credencial. Serve só ao PADRAO_GENERICO, onde "16+
# caracteres citados" casa fixture de teste tanto quanto segredo.
#
# Fora desse escopo a prova não vale, e o caso que fixa isso é a senha: senha
# de verdade É frase de palavras — é a forma recomendada — então ali "parece
# palavra" não prova nada. É por isso que o padrão de password está fora.
e_palavra() {
  local v="$1"
  [[ "$v" =~ ^[a-z]+([-_][a-z]+)+$ ]] && return 0
  [[ "$v" =~ ^[A-Z]+([-_][A-Z]+)+$ ]] && return 0
  return 1
}

# Extrai o valor citado de um casamento do PADRAO_GENERICO.
#   api_key = "stale-capability"  ->  stale-capability
valor_citado() {
  local m="$1"
  m="${m%[\"\'\`]}"     # tira a aspa final
  m="${m##*[\"\'\`]}"   # tira tudo até a aspa de abertura
  printf '%s' "$m"
}

# Decide se UMA linha que casou UM padrão é comprovadamente sintética.
#   $1 = o padrão que casou (um elemento de PATTERNS)
#   $2 = a linha inteira do diff que casou (ainda com o '+' na frente)
# Retorna 0 para PERMITIR esta linha, 1 para BLOQUEAR.
#
# Duas provas possíveis, e a diferença entre elas é o ponto todo:
#   (a) o marcador está DENTRO do texto que casou — um token real não contém
#       a palavra "fixture", então a prova vem do próprio valor. Vale para
#       qualquer padrão.
#   (b) o padrão que casou é o cabeçalho PEM (string fixa, não-secreta) e a
#       linha carrega um marcador. Vale SÓ para esse padrão.
# Qualquer outra situação bloqueia, inclusive segredo de alta entropia com
# "example" num comentário ao lado.
e_sintetica() {
  local padrao="$1" linha="$2" casado rc
  # Sem pipe de propósito: com `| head -n1` o `$?` passa a ser do head e o
  # erro do grep desaparece. Aqui `$?` é do grep, e o primeiro casamento sai
  # por expansão de parâmetro.
  set +e
  casado="$(grep -Eio -- "$padrao" <<<"$linha")"
  rc=$?
  set -e
  if (( rc > 1 )); then
    echo "secret-scan: blocked commit — grep -o failed (rc=$rc) on pattern: $padrao" >&2
    exit 2
  fi
  casado="${casado%%$'\n'*}"

  # (a) o marcador está DENTRO do texto casado: a prova vem do próprio valor,
  #     porque uma credencial real não carrega a palavra "fixture". Vale para
  #     qualquer padrão.
  if [[ -n "$casado" ]] && grep -Eiq -- "$MARCADORES_SINTETICOS" <<<"$casado"; then
    return 0
  fi

  # (b) o padrão que casou é o cabeçalho PEM — string fixa e pública, cujo
  #     casamento não diz nada sobre entropia — e a linha carrega um marcador.
  #     Restrito a esse padrão: para os demais, marcador solto na linha é
  #     contexto, não prova.
  if [[ "$padrao" == "$PADRAO_ESTRUTURAL" ]] \
     && grep -Eiq -- "$MARCADORES_SINTETICOS" <<<"$linha"; then
    return 0
  fi

  # (c) o padrão que casou é a atribuição genérica e o valor citado tem forma
  #     de palavra, não de credencial. Restrito a esse padrão — ver e_palavra.
  if [[ "$padrao" == "$PADRAO_GENERICO" ]] \
     && e_palavra "$(valor_citado "$casado")"; then
    return 0
  fi

  return 1
}

# Varre um diff (só linhas adicionadas) contra todos os padrões.
#   $1 = rótulo para a mensagem de erro, $2 = o diff
# Sai 2 se algum casamento não for comprovadamente sintético.
varre_diff() {
  local rotulo="$1" diff="$2" pattern matches rc linha
  [[ -z "$diff" ]] && return 0
  for pattern in "${PATTERNS[@]}"; do
    # Sem `|| true` no pipe: rc 1 é "não casou", mas rc > 1 é ERRO do grep, e
    # mascarar isso já transformou este portão em fail-OPEN uma vez. Aqui erro
    # de ferramenta bloqueia — fail-CLOSED, que é o único default aceitável
    # num controle de segurança.
    set +e
    matches="$(grep -Ei -- "$pattern" <<<"$diff")"
    rc=$?
    set -e
    if (( rc > 1 )); then
      echo "secret-scan: blocked commit — grep failed (rc=$rc) on pattern: $pattern" >&2
      exit 2
    fi
    (( rc == 1 )) && continue
    while IFS= read -r linha; do
      [[ -z "$linha" ]] && continue
      if ! e_sintetica "$pattern" "$linha"; then
        echo "secret-scan: blocked commit — $rotulo matches pattern: $pattern" >&2
        exit 2
      fi
    done <<<"$matches"
  done
}

varre_diff "staged diff" "$staged_diff"
varre_diff "unstaged diff (git commit -a/-am/--all)" "$unstaged_diff"

# Union staged and (when -a/--all is in play) unstaged tracked file names so
# a tracked .env modified but never `git add`-ed still gets caught when it's
# committed via `git commit -am`.
files_to_check="$staged_files"
if [[ -n "$unstaged_files" ]]; then
  files_to_check="$files_to_check
$unstaged_files"
fi

while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  case "$f" in
    *.env.example) ;;
    *.env|*.env.*)
      echo "secret-scan: blocked commit — env file: $f" >&2
      exit 2
      ;;
  esac
done <<<"$files_to_check"

exit 0
