#!/usr/bin/env bash
set -euo pipefail

detect_manager() {
  local dir="${1:-.}"
  if [[ -f "$dir/package.json" ]]; then
    echo npm
  elif [[ -f "$dir/requirements.txt" || -f "$dir/pyproject.toml" ]]; then
    echo pip
  else
    echo none
  fi
}

summarize_npm_json() {
  # NOTE: `python3 - <<PY` would redirect python's own stdin to the heredoc,
  # losing the piped audit JSON. Read the code into a variable instead, so
  # stdin passes through untouched to `python3 -c`.
  local code
  IFS= read -r -d '' code <<'PY' || true
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    print("dependency-audit: manager=npm, result=unparseable-output")
    sys.exit(0)
meta = data.get("metadata", {}).get("vulnerabilities", {}) or {}
total = sum(meta.values())
if total == 0:
    print("dependency-audit: manager=npm, vulnerabilities=0")
else:
    parts = ",".join(f"{k}={v}" for k, v in meta.items() if v)
    print(f"dependency-audit: manager=npm, vulnerabilities={total} ({parts})")
PY
  python3 -c "$code"
}

summarize_pip_json() {
  local code
  IFS= read -r -d '' code <<'PY' || true
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    print("dependency-audit: manager=pip, result=unparseable-output")
    sys.exit(0)
count = len(data) if isinstance(data, list) else 0
print(f"dependency-audit: manager=pip, vulnerabilities={count}")
PY
  python3 -c "$code"
}

main() {
  local dir="${1:-.}"
  local manager
  manager="$(detect_manager "$dir")"

  case "$manager" in
    npm)
      if command -v npm >/dev/null 2>&1; then
        (cd "$dir" && npm audit --json 2>/dev/null || true) | summarize_npm_json
      else
        echo "dependency-audit: manager=npm, result=npm-not-installed"
      fi
      ;;
    pip)
      if command -v pip-audit >/dev/null 2>&1; then
        (cd "$dir" && pip-audit -f json 2>/dev/null || true) | summarize_pip_json
      else
        echo "dependency-audit: manager=pip, result=pip-audit-not-installed"
      fi
      ;;
    none)
      echo "dependency-audit: manager=none, result=no-manifest-found"
      ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
