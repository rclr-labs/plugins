#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/commands/squad-new.md" description

for term in "squad.config.json" "gate mode" "git init" "brainstorming" "archive" "max_parallel_devs" "pending_gate"; do
  grep -qi -- "$term" "$root/commands/squad-new.md" || { echo "FAIL: squad-new.md doesn't mention '$term'" >&2; exit 1; }
done

echo "PASS: squad-new command"
