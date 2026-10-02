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
declare -a provider_secrets=(
  "ANTHROPIC_API_KEY=sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  "OPENAI_API_KEY=sk-proj-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  "GH_TOKEN=ghp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  "GITHUB_TOKEN=github_pat_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  "GITLAB_TOKEN=glpat-AAAAAAAAAAAAAAAAAAAA"
  "GOOGLE_KEY=AIzaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  "STRIPE_KEY=sk_live_AAAAAAAAAAAAAAAAAAAA"
  "SLACK_TOKEN=xoxb-1234567890-AAAAAAAAAAAA"
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
