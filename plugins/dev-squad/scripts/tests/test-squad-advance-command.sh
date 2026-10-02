#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/commands/squad-advance.md" description

for term in "dev-squad-protocol" "squad.config.json" "gate_mode" "security-preprod" "pending_gate"; do
  grep -qi -- "$term" "$root/commands/squad-advance.md" || { echo "FAIL: squad-advance.md doesn't mention '$term'" >&2; exit 1; }
done

# "production" is a short/generic single word, so match it as a whole word
# to avoid a false positive from substring matches inside unrelated words.
grep -qiw "production" "$root/commands/squad-advance.md" || { echo "FAIL: squad-advance.md doesn't mention 'production'" >&2; exit 1; }

echo "PASS: squad-advance command"
