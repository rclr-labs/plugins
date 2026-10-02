#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/security-preprod.md" name description tools
grep -q "dev-squad:gdpr-lgpd-compliance-auditor" "$root/agents/security-preprod.md" || { echo "FAIL: doesn't invoke the plugin-qualified compliance auditor" >&2; exit 1; }
grep -q "dependency-audit.sh" "$root/agents/security-preprod.md" || { echo "FAIL: doesn't re-check dependency-audit.sh" >&2; exit 1; }
grep -qi "block" "$root/agents/security-preprod.md" || { echo "FAIL: doesn't state it blocks the deploy on findings" >&2; exit 1; }
echo "PASS: security-preprod agent"
