#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
file="$root/scripts/workflows/deploy-review.js"
[[ -f "$file" ]] || { echo "FAIL: $file does not exist" >&2; exit 1; }

# See the matching comment in test-build-workflow-syntax.sh: wrap the body
# in an async function before checking syntax, since the raw file mixes
# module and function syntax that only the Workflow runtime understands.
# The wrapped copy is written into a temp dir with a `.js` filename because
# `node --check` on newer Node versions refuses to determine module format
# for an extensionless file (plain `mktemp` output).
wrapped_dir="$(mktemp -d)"
trap 'rm -rf "$wrapped_dir"' EXIT
wrapped="$wrapped_dir/deploy-review.check.js"
{
  echo '(async () => {'
  sed -E 's/^export const meta/const meta/' "$file"
  echo '})();'
} > "$wrapped"
node --check "$wrapped"

grep -q "export const meta" "$file" || { echo "FAIL: missing meta export" >&2; exit 1; }
grep -q "agentType: 'dev-squad:code-reviewer'" "$file" || { echo "FAIL: missing dev-squad:code-reviewer agentType" >&2; exit 1; }
grep -q "security-review" "$file" || { echo "FAIL: missing security-review skill invocation" >&2; exit 1; }
grep -q "blocksDeploy" "$file" || { echo "FAIL: missing blocksDeploy in return value" >&2; exit 1; }
grep -q "name: 'squad-deploy-review'" "$file" || { echo "FAIL: missing name: 'squad-deploy-review'" >&2; exit 1; }
grep -q "FINDINGS_SCHEMA" "$file" || { echo "FAIL: missing FINDINGS_SCHEMA" >&2; exit 1; }
grep -q "VERDICT_SCHEMA" "$file" || { echo "FAIL: missing VERDICT_SCHEMA" >&2; exit 1; }
echo "PASS: deploy-review.js syntax and required dimensions"
