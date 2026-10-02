#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cmd="$root/commands/queue-status.md"

"$root/scripts/tests/check-frontmatter.sh" "$cmd" description

grep -q "dev-squad/state/queue.json" "$cmd" || { echo "FAIL: doesn't read dev-squad/state/queue.json" >&2; exit 1; }

# --- Must resolve the plugin's own queue.json path via ${CLAUDE_PLUGIN_ROOT}
# (same convention as squad-enqueue.md / dev-squad/hooks/hooks.json /
# dev-squad-protocol SKILL.md), since this command is typically invoked with
# cwd set to a different (target product's) repo. ---
grep -q '\${CLAUDE_PLUGIN_ROOT}' "$cmd" || {
  echo "FAIL: queue-status.md doesn't resolve the plugin's own queue.json path via \${CLAUDE_PLUGIN_ROOT}" >&2
  exit 1
}
grep -q 'QUEUE_FILE=' "$cmd" || {
  echo "FAIL: queue-status.md doesn't define a resolved QUEUE_FILE variable" >&2
  exit 1
}

# --- Must not read the queue file via a bare relative path invocation
# (i.e. actually reading it) outside the resolution step / prose naming it. ---
if grep -nE '^Read `dev-squad/state/queue\.json`' "$cmd" >/dev/null; then
  echo "FAIL: queue-status.md still reads queue.json via a bare relative path instead of the resolved \$QUEUE_FILE" >&2
  exit 1
fi

# --- AXI rule 5: definitive empty state (zero jobs prints jobs=0, not nothing) ---
grep -q "jobs=0" "$cmd" || { echo "FAIL: doesn't specify the zero-jobs empty state (jobs=0)" >&2; exit 1; }

# --- Summary line counts ---
for field in "jobs=" "running=" "queued=" "blocked=" "done="; do
  grep -q -- "$field" "$cmd" || { echo "FAIL: summary line missing '$field'" >&2; exit 1; }
done

# --- jobs table schema: id,product,status,attempts ---
grep -q "jobs\[N\]{id,product,status,attempts}" "$cmd" || { echo "FAIL: doesn't define the jobs[N]{id,product,status,attempts} table" >&2; exit 1; }

# --- Acceptance scenario 5: a blocked job shows attempts=3 and its full,
# untruncated blocked_reason/blocked_at ---
grep -q "attempt_count" "$cmd" || { echo "FAIL: doesn't source 'attempts' from attempt_count" >&2; exit 1; }
grep -q "blocked_reason" "$cmd" || { echo "FAIL: doesn't print blocked_reason" >&2; exit 1; }
grep -q "blocked_at" "$cmd" || { echo "FAIL: doesn't print blocked_at" >&2; exit 1; }
grep -qi "untruncated" "$cmd" || { echo "FAIL: doesn't state blocked_reason/blocked_at are printed untruncated" >&2; exit 1; }

# --- help[] line naming /squad-requeue <id> (literal, parameterized template
# — must appear verbatim, not only as a concrete-id substitution, since
# acceptance scenario 5's own precondition is "given a blocked job") ---
grep -q "help\[\]" "$cmd" || { echo "FAIL: doesn't end output with a help[] line" >&2; exit 1; }
grep -qF "/squad-requeue <id>" "$cmd" || { echo "FAIL: help[] line doesn't name the literal template '/squad-requeue <id>'" >&2; exit 1; }
grep -qi "always print the literal" "$cmd" || { echo "FAIL: doesn't require the template line to print verbatim even when a blocked job is present" >&2; exit 1; }

# --- Acceptance scenario 5's concrete example row: blocked,3 ---
grep -qF "blocked,3" "$cmd" || { echo "FAIL: doesn't show an example blocked job row with attempts=3" >&2; exit 1; }

echo "PASS: queue-status command"
