#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
file="$root/scripts/workflows/build.js"
[[ -f "$file" ]] || { echo "FAIL: $file does not exist" >&2; exit 1; }

# Workflow scripts combine `export const meta` (module syntax) with a
# top-level `await` AND a top-level `return` (function syntax) — no plain
# CommonJS script or standard ES module accepts that combination, because
# the Workflow tool wraps the body in an async function itself before
# running it. Reproduce that wrapping so `node --check` can still catch
# real syntax errors (mismatched braces, typos, etc).
# The wrapped copy is written into a temp dir with a `.js` filename because
# `node --check` on newer Node versions refuses to determine module format
# for an extensionless file (plain `mktemp` output).
wrapped_dir="$(mktemp -d)"
trap 'rm -rf "$wrapped_dir"' EXIT
wrapped="$wrapped_dir/build.check.js"
{
  echo '(async () => {'
  sed -E 's/^export const meta/const meta/' "$file"
  echo '})();'
} > "$wrapped"
node --check "$wrapped"

grep -q "export const meta" "$file" || { echo "FAIL: missing meta export" >&2; exit 1; }
grep -q "agentType: 'dev-squad:tech-lead'" "$file" || { echo "FAIL: missing dev-squad:tech-lead agentType" >&2; exit 1; }
grep -q "agentType: 'dev-squad:dev'" "$file" || { echo "FAIL: missing dev-squad:dev agentType" >&2; exit 1; }
grep -q "agentType: 'dev-squad:qa-engineer'" "$file" || { echo "FAIL: missing dev-squad:qa-engineer agentType" >&2; exit 1; }
grep -q "name: 'squad-build'" "$file" || { echo "FAIL: missing name: 'squad-build'" >&2; exit 1; }
grep -q "isolation: 'worktree'" "$file" || { echo "FAIL: missing isolation: 'worktree'" >&2; exit 1; }
grep -q "BREAKDOWN_SCHEMA" "$file" || { echo "FAIL: missing BREAKDOWN_SCHEMA" >&2; exit 1; }
grep -q "DEV_RESULT_SCHEMA" "$file" || { echo "FAIL: missing DEV_RESULT_SCHEMA" >&2; exit 1; }
grep -q "QA_RESULT_SCHEMA" "$file" || { echo "FAIL: missing QA_RESULT_SCHEMA" >&2; exit 1; }
grep -q "maxParallelDevs" "$file" || { echo "FAIL: missing maxParallelDevs" >&2; exit 1; }
grep -q "function buildTask" "$file" || { echo "FAIL: missing buildTask function" >&2; exit 1; }
grep -q "function testTask" "$file" || { echo "FAIL: missing testTask function" >&2; exit 1; }
echo "PASS: build.js syntax and required agentTypes"
