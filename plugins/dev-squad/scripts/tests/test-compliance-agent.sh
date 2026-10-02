#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/gdpr-lgpd-compliance-auditor.md" name description tools
grep -q "GDPR" "$root/agents/gdpr-lgpd-compliance-auditor.md" || { echo "FAIL: gdpr-lgpd-compliance-auditor.md doesn't mention GDPR" >&2; exit 1; }
grep -q "LGPD" "$root/agents/gdpr-lgpd-compliance-auditor.md" || { echo "FAIL: gdpr-lgpd-compliance-auditor.md doesn't mention LGPD" >&2; exit 1; }
grep -qi "Oculus" "$root/agents/gdpr-lgpd-compliance-auditor.md" && { echo "FAIL: gdpr-lgpd-compliance-auditor.md leaked project-specific content" >&2; exit 1; }
echo "PASS: gdpr-lgpd-compliance-auditor agent"
