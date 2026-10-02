#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cmd="$root/commands/squad-enqueue.md"

"$root/scripts/tests/check-frontmatter.sh" "$cmd" description

# Documentation-contract checks: this command is a markdown prompt followed
# by an agent, not executable code, so this test (like
# test-squad-advance-command.sh / test-squad-status-command.sh) verifies the
# prompt documents every behavior the spec's acceptance scenario 6 and the
# happy path require — it does not execute the prompt end-to-end.

for term in \
  "product" \
  "stage" \
  "allowed_repo_roots" \
  "QUEUE_LOCK_HELPER.*acquire" \
  "QUEUE_LOCK_HELPER.*release" \
  "queue.json.lock" \
  "queue busy, try again" \
  "duplicate" \
  "attempt_count" \
  "max_attempts" \
  "claimed_at" \
  "last_progress_at" \
  "completed_at" \
  "last_error" \
  "blocked_at" \
  "blocked_reason" \
  "enqueued_at" \
; do
  grep -qi -- "$term" "$cmd" || { echo "FAIL: squad-enqueue.md doesn't mention '$term'" >&2; exit 1; }
done

# Duplicate guard must cover both queued and running statuses, not just one.
grep -qi "queued.*running\|running.*queued" "$cmd" || {
  echo "FAIL: squad-enqueue.md's duplicate guard doesn't clearly cover both 'queued' and 'running'" >&2
  exit 1
}

# Must refuse and report the *actual* current stage on a non-build stage,
# not a generic error.
grep -qi 'stage.*"build"' "$cmd" || {
  echo "FAIL: squad-enqueue.md doesn't check stage == \"build\"" >&2
  exit 1
}

# Must distinguish lock exit codes 0/1/2 rather than treating any non-zero
# exit as "busy" (per queue-lock.mjs's own documented contract).
grep -qi "exit 1" "$cmd" || { echo "FAIL: squad-enqueue.md doesn't handle lock exit 1" >&2; exit 1; }
grep -qi "exit 2" "$cmd" || { echo "FAIL: squad-enqueue.md doesn't handle lock exit 2 separately from exit 1" >&2; exit 1; }

# Must explicitly state no write happens on any refusal path.
grep -qi "no write\|not touch\|does not modify\|make no write" "$cmd" || {
  echo "FAIL: squad-enqueue.md doesn't state that refusal paths make no write to queue.json" >&2
  exit 1
}

# Must always release the lock, not just on the success path.
grep -qi "always run" "$cmd" || {
  echo "FAIL: squad-enqueue.md doesn't state the lock is always released" >&2
  exit 1
}

# Must re-read the file after acquiring the lock (read-modify-write per spec
# §2), not just reuse an earlier read.
grep -qi "re-read" "$cmd" || {
  echo "FAIL: squad-enqueue.md doesn't re-read queue.json after acquiring the lock" >&2
  exit 1
}

# Must establish how it locates the PLUGIN repo's own dev-squad/state/queue.json
# when invoked with cwd/repo_path pointing at a different (target product's)
# repo -- via the same ${CLAUDE_PLUGIN_ROOT} convention already used by this
# plugin's hooks and skill (dev-squad/hooks/hooks.json,
# dev-squad/skills/dev-squad-protocol/SKILL.md).
grep -q '\${CLAUDE_PLUGIN_ROOT}' "$cmd" || {
  echo "FAIL: squad-enqueue.md doesn't resolve the plugin's own queue.json path via \${CLAUDE_PLUGIN_ROOT}" >&2
  exit 1
}

# Every reference to queue.json, queue.json.lock, and queue-lock.mjs must use
# a resolved absolute-path variable (QUEUE_FILE/QUEUE_LOCK/QUEUE_LOCK_HELPER),
# not a bare relative "dev-squad/..." path, since cwd at invocation time is
# the target repo, not the plugin repo. Every remaining bare occurrence must
# be confined to step 0 (the resolution step itself) or plain prose
# describing/naming the path, not a literal command invocation.
if grep -n 'node dev-squad/scripts/lib/queue-lock.mjs' "$cmd" >/dev/null; then
  echo "FAIL: squad-enqueue.md still invokes queue-lock.mjs via a bare relative path instead of the resolved \$QUEUE_LOCK_HELPER" >&2
  exit 1
fi
grep -q 'QUEUE_FILE=' "$cmd" || {
  echo "FAIL: squad-enqueue.md doesn't define a resolved QUEUE_FILE variable" >&2
  exit 1
}
grep -q 'QUEUE_LOCK=' "$cmd" || {
  echo "FAIL: squad-enqueue.md doesn't define a resolved QUEUE_LOCK variable" >&2
  exit 1
}
grep -q 'QUEUE_LOCK_HELPER=' "$cmd" || {
  echo "FAIL: squad-enqueue.md doesn't define a resolved QUEUE_LOCK_HELPER variable" >&2
  exit 1
}

echo "PASS: squad-enqueue command"
