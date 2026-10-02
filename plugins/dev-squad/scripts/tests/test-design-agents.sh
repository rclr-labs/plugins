#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/product-owner.md" name description tools
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/tech-lead.md" name description tools
grep -q "Security" "$root/agents/product-owner.md" || { echo "FAIL: product-owner.md doesn't mention the mandatory Security section" >&2; exit 1; }
grep -q "dev-squad:gdpr-lgpd-compliance-auditor" "$root/agents/tech-lead.md" || { echo "FAIL: tech-lead.md doesn't invoke the plugin-qualified compliance auditor" >&2; exit 1; }
echo "PASS: design-stage agents"
