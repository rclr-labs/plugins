#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/commands/squad-status.md" description
grep -q "squad.config.json" "$root/commands/squad-status.md" || { echo "FAIL: doesn't read squad.config.json" >&2; exit 1; }
grep -q "pending_gate" "$root/commands/squad-status.md" || { echo "FAIL: doesn't define the pending_gate output field" >&2; exit 1; }
echo "PASS: squad-status command"
