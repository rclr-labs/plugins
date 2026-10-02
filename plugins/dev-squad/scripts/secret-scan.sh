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
PATTERNS=(
  'AKIA[0-9A-Z]{16}'                                  # AWS access key id
  '-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'
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
  '(api|secret|access|private)[_-]?(key|token)[[:space:]]*[:=][[:space:]]*["'"'"'`][A-Za-z0-9/+_=-]{16,}["'"'"'`]'
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

staged_diff="$(git diff --cached --unified=0 2>/dev/null || true)"
staged_files="$(git diff --cached --name-only 2>/dev/null || true)"

# `git commit -a`/`-am`/`--all` stages tracked-file modifications as part of
# the commit itself, so when that flag is present we also need to scan the
# unstaged diff and unstaged (but tracked) file names — not just staged ones.
unstaged_diff=""
unstaged_files=""
if has_commit_all_flag "$cmd"; then
  unstaged_diff="$(git diff --unified=0 2>/dev/null || true)"
  unstaged_files="$(git diff --name-only 2>/dev/null || true)"
fi

if [[ -z "$staged_diff" && -z "$staged_files" && -z "$unstaged_diff" && -z "$unstaged_files" ]]; then
  exit 0
fi

for pattern in "${PATTERNS[@]}"; do
  if grep -Eiq -- "$pattern" <<<"$staged_diff"; then
    echo "secret-scan: blocked commit — staged diff matches pattern: $pattern" >&2
    exit 2
  fi
  if [[ -n "$unstaged_diff" ]] && grep -Eiq -- "$pattern" <<<"$unstaged_diff"; then
    echo "secret-scan: blocked commit — unstaged diff (git commit -a/-am/--all) matches pattern: $pattern" >&2
    exit 2
  fi
done

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
