#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/dev.md" name description tools
grep -q "AXI" "$root/agents/dev.md" || { echo "FAIL: dev.md doesn't mention AXI for CLI work" >&2; exit 1; }
echo "PASS: dev agent"
