#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
hooks_file="$root/hooks/hooks.json"

[[ -f "$hooks_file" ]] || { echo "FAIL: $hooks_file does not exist" >&2; exit 1; }

python3 - "$hooks_file" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
assert "hooks" in data, "top-level 'hooks' key missing — bare event-name keys are the wrong schema"
assert isinstance(data["hooks"], dict), "'hooks' must be an object mapping event names to arrays"
assert "PreToolUse" in data["hooks"], "expected a PreToolUse hook"
entry = data["hooks"]["PreToolUse"][0]
assert entry.get("matcher") == "Bash"
cmd = entry["hooks"][0]["command"]
assert cmd.startswith('bash "'), f"command should be quoted and interpreter-prefixed, got: {cmd!r}"
PY

echo "PASS: hooks.json has the correct wrapped schema"
