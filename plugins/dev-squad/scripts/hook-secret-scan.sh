#!/usr/bin/env bash
set -euo pipefail

# PreToolUse wrapper: decodes the hook payload, and only for a `git commit`
# runs secret-scan.sh against the repository that commit will actually land
# in. That repository is not always the session's own checkout — the
# squad-build workflow runs each Dev in an isolated worktree, so scanning
# whatever `git diff --cached` returns for the hook process's own directory
# would silently scan the wrong repo and wave the real commit through.

# Resolve the script's own directory BEFORE any `cd` below, so the `exec` at
# the end still finds secret-scan.sh when invoked via a relative path.
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

payload="$(cat)"

# First line is the hook's reported cwd, everything after it is the command
# (which may itself span multiple lines).
extracted="$(python3 -c '
import json, sys
try:
    data = json.loads(sys.stdin.read())
except Exception:
    print("")
    print("")
    sys.exit(0)
print((data.get("cwd") or "").replace("\n", " "))
print(data.get("tool_input", {}).get("command", "") or "")
' <<<"$payload" 2>/dev/null)" || exit 0

hook_cwd="$(head -n1 <<<"$extracted")"
command="$(tail -n +2 <<<"$extracted")"

if [[ "$command" != *"git commit"* ]]; then
  exit 0
fi

# A leading `cd <dir> && ...` / `cd <dir>; ...` in the intercepted command
# wins over the hook's reported cwd — that's the directory the commit runs
# in. Anything unparseable falls back to the hook's cwd, and then to the
# process's own directory.
strip_quotes() {
  local v="$1"
  v="${v%"${v##*[![:space:]]}"}"
  case "$v" in
    \'*\') v="${v#\'}"; v="${v%\'}" ;;
    \"*\") v="${v#\"}"; v="${v%\"}" ;;
  esac
  printf '%s' "$v"
}

target=""
if [[ "$command" =~ ^[[:space:]]*cd[[:space:]]+([^;&|]+)[[:space:]]*(\&\&|\;) ]]; then
  target="$(strip_quotes "${BASH_REMATCH[1]}")"
fi

if [[ -n "$target" && -d "$target" ]]; then
  cd "$target"
elif [[ -n "$hook_cwd" && -d "$hook_cwd" ]]; then
  cd "$hook_cwd"
fi

exec "$script_dir/secret-scan.sh" "$command"
