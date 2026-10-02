#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
skill="$root/skills/dev-squad-protocol/SKILL.md"
"$root/scripts/tests/check-frontmatter.sh" "$skill" name description

for term in "squad-build" "squad-deploy-review" "gate_mode" "critical-only" "product-owner" "tech-lead" "release-manager" "security-preprod" "monitor"; do
  grep -q -- "$term" "$skill" || { echo "FAIL: SKILL.md doesn't mention '$term'" >&2; exit 1; }
done

# "full" is short/generic, so match it as a whole word to avoid a false
# positive from substring matches inside unrelated words.
grep -qw "full" "$skill" || { echo "FAIL: SKILL.md doesn't mention 'full'" >&2; exit 1; }

echo "PASS: dev-squad-protocol skill"
