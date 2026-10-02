#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

for dir in agents commands skills scripts hooks; do
  if [[ ! -d "$root/$dir" ]]; then
    echo "FAIL: missing directory $dir" >&2
    exit 1
  fi
done

if [[ ! -f "$root/.claude-plugin/plugin.json" ]]; then
  echo "FAIL: missing .claude-plugin/plugin.json" >&2
  exit 1
fi

python3 - "$root/.claude-plugin/plugin.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
assert data.get("name") == "dev-squad", f"expected name=dev-squad, got {data.get('name')!r}"
PY

echo "PASS: scaffold present"
