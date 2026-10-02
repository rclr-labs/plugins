#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/qa-engineer.md" name description tools
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/code-reviewer.md" name description tools
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/release-manager.md" name description tools
grep -q "dependency-audit.sh" "$root/agents/qa-engineer.md" || { echo "FAIL: qa-engineer.md doesn't call dependency-audit.sh" >&2; exit 1; }
grep -q "security-exceptions.md" "$root/agents/release-manager.md" || { echo "FAIL: release-manager.md doesn't require security exceptions to be logged" >&2; exit 1; }
echo "PASS: test/deploy-stage agents"
