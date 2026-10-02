#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
skill="$root/skills/squad-queue-worker/SKILL.md"
"$root/scripts/tests/check-frontmatter.sh" "$skill" name description

# Core mechanics named in spec section 3.
for term in \
  "queue.json" \
  "queue-lock.mjs" \
  "progressEvidence" \
  "staleness_window_minutes" \
  "check-memory-pressure.sh" \
  "permissionDecision" \
  "FIFO" \
  "enqueued_at" \
  "allowed_repo_roots" \
  "attempt_count" \
  "max_attempts" \
  "claimed_at" \
  "squad-build" \
  "maxParallelDevs" \
  "stage: \"test\"" \
  "gate_mode" \
  "pending_gate" \
  "at most one job" \
; do
  grep -qF -- "$term" "$skill" || { echo "FAIL: SKILL.md doesn't mention '$term'" >&2; exit 1; }
done

# Scenario 1 — FIFO claim, other job untouched.
grep -qi "oldest" "$skill" || { echo "FAIL: SKILL.md doesn't describe picking the oldest queued job (scenario 1)" >&2; exit 1; }

# Scenario 2 — no dispatch/status change under deny or ask pressure.
# Match the distinctive "permissionDecision == ..." phrase, not the bare
# words "deny"/"ask", which also appear as substrings elsewhere (e.g.
# ".squad/tasks/") and would make this assertion vacuous — same hazard
# test-protocol-skill.sh's `grep -qw "full"` comment documents.
grep -qF 'permissionDecision ==' "$skill" || { echo "FAIL: SKILL.md doesn't document the permissionDecision cases (scenario 2)" >&2; exit 1; }
grep -qF '"deny"`' "$skill" || { echo "FAIL: SKILL.md doesn't document the deny case (scenario 2)" >&2; exit 1; }
grep -qF '"ask"`' "$skill" || { echo "FAIL: SKILL.md doesn't document the ask case (scenario 2)" >&2; exit 1; }
grep -qF "capacity does **not** allow" "$skill" || { echo "FAIL: SKILL.md doesn't describe deny/ask blocking capacity (scenario 2)" >&2; exit 1; }
grep -qF "untouched this invocation" "$skill" || { echo "FAIL: SKILL.md doesn't describe the queue staying untouched on no-capacity (scenario 2)" >&2; exit 1; }

# Scenario 3/4 — staleness sweep attempt-increment / requeue-or-block.
grep -qF "job.attempt_count < job.max_attempts" "$skill" || { echo "FAIL: SKILL.md doesn't state the attempt_count < max_attempts comparison (scenario 3/4)" >&2; exit 1; }
grep -qF "blocked_at" "$skill" || { echo "FAIL: SKILL.md doesn't mention blocked_at (scenario 4)" >&2; exit 1; }
grep -qF "blocked_reason" "$skill" || { echo "FAIL: SKILL.md doesn't mention blocked_reason (scenario 4)" >&2; exit 1; }

# Scenario 7 — terminal state with QA findings still marks done + advances stage.
grep -qF "allPassed" "$skill" || { echo "FAIL: SKILL.md doesn't reference the workflow's allPassed result (scenario 7)" >&2; exit 1; }
grep -qF "regardless of" "$skill" || { echo "FAIL: SKILL.md doesn't state the QA-findings-are-not-a-worker-failure rule (scenario 7)" >&2; exit 1; }
grep -qF 'job.status = "done"' "$skill" || { echo "FAIL: SKILL.md doesn't describe marking the job done (scenario 7)" >&2; exit 1; }

# Scenario 8 — reset-to-queued job with recent progressEvidence is not claimed.
grep -qiF "do not treat this as a" "$skill" || { echo "FAIL: SKILL.md doesn't describe refusing to claim on recent activity (scenario 8)" >&2; exit 1; }
grep -qF "(no attempt_count change)" "$skill" || { echo "FAIL: SKILL.md doesn't state no attempt_count change on recent activity (scenario 8)" >&2; exit 1; }

# §5 lock read-modify-write discipline (no lost updates across concurrent writers).
grep -qF "re-read \`dev-squad/state/queue.json\` fresh from disk" "$skill" || { echo "FAIL: SKILL.md doesn't state the re-read-under-lock discipline (scenario 11 / §5)" >&2; exit 1; }

# §6 resume-safety tie-in and §5 lock-contention policy for the step-10 write.
grep -qi "resume-safety" "$skill" || { echo "FAIL: SKILL.md doesn't tie dispatch to the resume-safety prerequisite (spec §6)" >&2; exit 1; }
grep -qF "retry with backoff" "$skill" || { echo "FAIL: SKILL.md doesn't describe the step-10 backoff-retry lock exception" >&2; exit 1; }

# Step 7 (re-validate before claiming) must specify path-boundary-safe
# matching against allowed_repo_roots (mirroring squad-enqueue.md step 3.5
# / squad-requeue.md step 4), not a bare string-prefix match —
# /Users/x/Projects must not match /Users/x/ProjectsOther.
grep -qF 'a path boundary' "$skill" || {
  echo "FAIL: SKILL.md step 7 doesn't specify path-boundary-safe matching against allowed_repo_roots" >&2
  exit 1
}
grep -qF 'string-prefix match is not enough' "$skill" || {
  echo "FAIL: SKILL.md step 7 doesn't call out that a bare string-prefix match is unsafe" >&2
  exit 1
}
if grep -qF 'still starts with one of `allowed_repo_roots`' "$skill"; then
  echo "FAIL: SKILL.md still contains the old unsafe bare-prefix wording in step 7" >&2
  exit 1
fi

echo "PASS: squad-queue-worker skill static checks"

# --- Functional simulation of step 7's boundary check ---
#
# SKILL.md is a prompt an agent follows, not executable code, so this test
# implements the exact boundary-check algorithm step 7's prose specifies
# (repo_path === root, or repo_path starts with root + "/") and checks a
# sibling directory sharing an allowed root's string prefix is REJECTED,
# proving the fix actually closes the gap — a test that only exercised
# squad-enqueue.md's already-correct wording wouldn't prove anything new.

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

allowed_root="$work/Projects"
mkdir -p "$allowed_root"

boundary_check() {
  node -e "
const root = '$allowed_root';
const repoPath = process.argv[1];
const allowed = (repoPath === root || repoPath.startsWith(root + '/'));
console.log(allowed ? 'ALLOWED' : 'REJECTED');
" "$1"
}

result="$(boundary_check "$allowed_root/some-product")"
[[ "$result" == "ALLOWED" ]] || { echo "FAIL: repo_path directly under allowed root should be ALLOWED, got $result" >&2; exit 1; }

result="$(boundary_check "$allowed_root")"
[[ "$result" == "ALLOWED" ]] || { echo "FAIL: repo_path exactly equal to allowed root should be ALLOWED, got $result" >&2; exit 1; }

result="$(boundary_check "${allowed_root}Other/evil-repo")"
[[ "$result" == "REJECTED" ]] || { echo "FAIL: repo_path under a sibling dir sharing the allowed root's string prefix (Projects vs ProjectsOther) should be REJECTED, got $result" >&2; exit 1; }

result="$(boundary_check "${allowed_root}2/evil-repo")"
[[ "$result" == "REJECTED" ]] || { echo "FAIL: repo_path under a sibling dir sharing the allowed root's string prefix (Projects vs Projects2) should be REJECTED, got $result" >&2; exit 1; }

echo "PASS: squad-queue-worker skill"
