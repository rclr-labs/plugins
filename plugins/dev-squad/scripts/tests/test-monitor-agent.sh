#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/monitor.md" name description tools
grep -q "intent.md" "$root/agents/monitor.md" || { echo "FAIL: monitor.md doesn't produce a new intent.md" >&2; exit 1; }
grep -q ".squad/maintain/" "$root/agents/monitor.md" || { echo "FAIL: monitor.md doesn't write to .squad/maintain/" >&2; exit 1; }
echo "PASS: monitor agent"
