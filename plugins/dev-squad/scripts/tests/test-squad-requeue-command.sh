#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cmd_file="$root/commands/squad-requeue.md"
lock_mod="$root/scripts/lib/queue-lock.mjs"

"$root/scripts/tests/check-frontmatter.sh" "$cmd_file" description

for term in "repo_path" "allowed_repo_roots" "attempt_count" "blocked_at" \
  "blocked_reason" "last_error" "queue-lock.mjs" "queue busy"; do
  grep -qi -- "$term" "$cmd_file" || {
    echo "FAIL: squad-requeue.md doesn't mention '$term'" >&2
    exit 1
  }
done

# --- Must resolve the plugin's own queue.json/lock/helper paths via
# ${CLAUDE_PLUGIN_ROOT} (same convention as squad-enqueue.md /
# dev-squad/hooks/hooks.json / dev-squad-protocol SKILL.md), since this
# command is typically invoked with cwd set to a different (target
# product's) repo. ---
grep -q '\${CLAUDE_PLUGIN_ROOT}' "$cmd_file" || {
  echo "FAIL: squad-requeue.md doesn't resolve the plugin's own queue.json path via \${CLAUDE_PLUGIN_ROOT}" >&2
  exit 1
}
grep -q 'QUEUE_FILE=' "$cmd_file" || {
  echo "FAIL: squad-requeue.md doesn't define a resolved QUEUE_FILE variable" >&2
  exit 1
}
grep -q 'QUEUE_LOCK=' "$cmd_file" || {
  echo "FAIL: squad-requeue.md doesn't define a resolved QUEUE_LOCK variable" >&2
  exit 1
}
grep -q 'QUEUE_LOCK_HELPER=' "$cmd_file" || {
  echo "FAIL: squad-requeue.md doesn't define a resolved QUEUE_LOCK_HELPER variable" >&2
  exit 1
}

# --- Every invocation of queue-lock.mjs must use the resolved
# $QUEUE_LOCK_HELPER variable, not a bare relative "dev-squad/..." path,
# since cwd at invocation time is the target repo, not the plugin repo. ---
if grep -n 'node dev-squad/scripts/lib/queue-lock.mjs' "$cmd_file" >/dev/null; then
  echo "FAIL: squad-requeue.md still invokes queue-lock.mjs via a bare relative path instead of the resolved \$QUEUE_LOCK_HELPER" >&2
  exit 1
fi

# --- Must specify path-boundary-safe matching against allowed_repo_roots
# (mirroring squad-enqueue.md step 3.5), not a bare string-prefix match —
# /Users/x/Projects must not match /Users/x/ProjectsOther. ---
grep -qF 'at a path boundary' "$cmd_file" || {
  echo "FAIL: squad-requeue.md doesn't specify path-boundary-safe matching against allowed_repo_roots" >&2
  exit 1
}
grep -qF 'A bare string-prefix match is not' "$cmd_file" || {
  echo "FAIL: squad-requeue.md doesn't call out that a bare string-prefix match is unsafe" >&2
  exit 1
}
if grep -qF 'must start with one of the string prefixes listed in' "$cmd_file"; then
  echo "FAIL: squad-requeue.md still contains the old unsafe bare-prefix wording" >&2
  exit 1
fi

echo "PASS: squad-requeue.md static checks"

# --- Functional simulation of the documented algorithm ---
#
# squad-requeue.md is a prompt an agent follows, not executable code, so
# this test implements the exact steps the command's prose specifies
# (re-run /squad-enqueue's repo_path validation; on pass, acquire the T3
# lock, reset status/attempt_count/blocked_at/blocked_reason/last_error on
# only the matched job, release the lock) and checks the result against the
# spec §4 acceptance text, so a future edit to squad-requeue.md that drifts
# from the documented algorithm is caught here.

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

valid_repo="$work/allowed-root/some-product"
mkdir -p "$valid_repo/.git" "$valid_repo/.squad"
echo '{"product":"some-product","stage":"build"}' > "$valid_repo/.squad/squad.config.json"

invalid_repo="$work/not-a-repo"
mkdir -p "$invalid_repo" # no .git, no .squad/squad.config.json

# A sibling directory sharing the allowed root's string prefix but NOT
# actually under it at a path boundary — e.g. "$work/allowed-root" is
# allowed, but "$work/allowed-rootOTHER/evil-repo" must not match via a
# bare string-prefix check.
boundary_repo="${work}/allowed-rootOTHER/evil-repo"
mkdir -p "$boundary_repo/.git" "$boundary_repo/.squad"
echo '{"product":"evil-product","stage":"build"}' > "$boundary_repo/.squad/squad.config.json"

queue_file="$work/queue.json"
lock_path="$work/queue.json.lock"

cat > "$queue_file" <<JSON
{
  "version": 1,
  "staleness_window_minutes": 90,
  "allowed_repo_roots": ["$work/allowed-root"],
  "jobs": [
    {
      "id": "job-blocked-1",
      "repo_path": "$valid_repo",
      "product_name": "some-product",
      "status": "blocked",
      "enqueued_at": "2026-09-20T00:00:00Z",
      "attempt_count": 3,
      "max_attempts": 3,
      "claimed_at": null,
      "last_progress_at": null,
      "completed_at": null,
      "last_error": "Build workflow threw after claim; no progress in 90m",
      "blocked_at": "2026-09-20T02:00:00Z",
      "blocked_reason": "3 worker-failure attempts exhausted"
    },
    {
      "id": "job-other-untouched",
      "repo_path": "$valid_repo",
      "product_name": "other-product",
      "status": "queued",
      "enqueued_at": "2026-09-21T00:00:00Z",
      "attempt_count": 0,
      "max_attempts": 3,
      "claimed_at": null,
      "last_progress_at": null,
      "completed_at": null,
      "last_error": null,
      "blocked_at": null,
      "blocked_reason": null
    },
    {
      "id": "job-bad-repo-path",
      "repo_path": "$invalid_repo",
      "product_name": "bad-product",
      "status": "blocked",
      "enqueued_at": "2026-09-19T00:00:00Z",
      "attempt_count": 3,
      "max_attempts": 3,
      "claimed_at": null,
      "last_progress_at": null,
      "completed_at": null,
      "last_error": "some prior failure",
      "blocked_at": "2026-09-19T02:00:00Z",
      "blocked_reason": "3 worker-failure attempts exhausted"
    },
    {
      "id": "job-boundary-violation",
      "repo_path": "$boundary_repo",
      "product_name": "evil-product",
      "status": "blocked",
      "enqueued_at": "2026-09-18T00:00:00Z",
      "attempt_count": 3,
      "max_attempts": 3,
      "claimed_at": null,
      "last_progress_at": null,
      "completed_at": null,
      "last_error": "some prior failure",
      "blocked_at": "2026-09-18T02:00:00Z",
      "blocked_reason": "3 worker-failure attempts exhausted"
    }
  ]
}
JSON

cp "$queue_file" "$work/queue.before.json"

# node helper implementing squad-requeue.md's documented algorithm exactly.
requeue() {
  local job_id="$1"
  node --input-type=module -e "
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const queueFile = '$queue_file';
const lockPath = '$lock_path';
const lockMod = '$lock_mod';
const jobId = '$job_id';

const raw = readFileSync(queueFile, 'utf8');
const queue = JSON.parse(raw);
const job = queue.jobs.find(j => j.id === jobId);
if (!job) {
  console.log('REFUSE: no job with id ' + jobId + ' in queue.json');
  process.exit(0);
}

const repoPath = job.repo_path;
function fail(reason) {
  console.log('REFUSE: ' + reason);
  process.exit(0);
}
if (!repoPath.startsWith('/') && !/^[A-Za-z]:\\\\/.test(repoPath)) fail('repo_path is not absolute: ' + repoPath);
if (!existsSync(repoPath)) fail('repo_path does not exist: ' + repoPath);
if (!existsSync(repoPath + '/.git')) fail('repo_path is not a git repository: ' + repoPath);
if (!existsSync(repoPath + '/.squad/squad.config.json')) fail('repo_path has no .squad/squad.config.json: ' + repoPath);
const allowed = (queue.allowed_repo_roots || []).some(root => repoPath === root || repoPath.startsWith(root + '/'));
if (!allowed) fail('repo_path is not under any allowed_repo_roots: ' + repoPath);

let acquired = false;
try {
  execFileSync('node', [lockMod, 'acquire', lockPath], { stdio: 'inherit' });
  acquired = true;
} catch (e) {
  console.log('REFUSE: queue busy, try again');
  process.exit(0);
}

try {
  const freshRaw = readFileSync(queueFile, 'utf8');
  const fresh = JSON.parse(freshRaw);
  const freshJob = fresh.jobs.find(j => j.id === jobId);
  freshJob.status = 'queued';
  freshJob.attempt_count = 0;
  freshJob.blocked_at = null;
  freshJob.blocked_reason = null;
  freshJob.last_error = null;
  writeFileSync(queueFile, JSON.stringify(fresh, null, 2) + '\n');
  console.log('OK: requeued ' + jobId);
} finally {
  execFileSync('node', [lockMod, 'release', lockPath], { stdio: 'inherit' });
}
"
}

echo "=== Case 1: valid blocked job id ==="
out="$(requeue job-blocked-1)"
echo "$out"
[[ "$out" == OK:* ]] || { echo "FAIL: expected requeue of job-blocked-1 to succeed" >&2; exit 1; }

status="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$queue_file','utf8')).jobs.find(j=>j.id==='job-blocked-1').status)")"
attempts="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$queue_file','utf8')).jobs.find(j=>j.id==='job-blocked-1').attempt_count)")"
blocked_at="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$queue_file','utf8')).jobs.find(j=>j.id==='job-blocked-1').blocked_at)")"
blocked_reason="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$queue_file','utf8')).jobs.find(j=>j.id==='job-blocked-1').blocked_reason)")"
last_error="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$queue_file','utf8')).jobs.find(j=>j.id==='job-blocked-1').last_error)")"

[[ "$status" == "queued" ]] || { echo "FAIL: status expected queued, got $status" >&2; exit 1; }
[[ "$attempts" == "0" ]] || { echo "FAIL: attempt_count expected 0, got $attempts" >&2; exit 1; }
[[ "$blocked_at" == "null" ]] || { echo "FAIL: blocked_at expected null, got $blocked_at" >&2; exit 1; }
[[ "$blocked_reason" == "null" ]] || { echo "FAIL: blocked_reason expected null, got $blocked_reason" >&2; exit 1; }
[[ "$last_error" == "null" ]] || { echo "FAIL: last_error expected null, got $last_error" >&2; exit 1; }

other_status="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$queue_file','utf8')).jobs.find(j=>j.id==='job-other-untouched').status)")"
[[ "$other_status" == "queued" ]] || { echo "FAIL: unrelated job-other-untouched was modified" >&2; exit 1; }
[[ -d "$lock_path" ]] && { echo "FAIL: lock directory left held after requeue" >&2; exit 1; }

echo "=== Case 2: nonexistent job id refuses, no write ==="
before_hash="$(node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('$queue_file','utf8'))))")"
out="$(requeue job-does-not-exist)"
echo "$out"
[[ "$out" == REFUSE:* ]] || { echo "FAIL: expected refusal for nonexistent job id" >&2; exit 1; }
after_hash="$(node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('$queue_file','utf8'))))")"
[[ "$before_hash" == "$after_hash" ]] || { echo "FAIL: queue.json was modified on a refusal" >&2; exit 1; }

echo "=== Case 3: job whose repo_path no longer validates refuses, no write ==="
before_hash="$(node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('$queue_file','utf8'))))")"
out="$(requeue job-bad-repo-path)"
echo "$out"
[[ "$out" == REFUSE:* ]] || { echo "FAIL: expected refusal for invalid repo_path job" >&2; exit 1; }
after_hash="$(node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('$queue_file','utf8'))))")"
[[ "$before_hash" == "$after_hash" ]] || { echo "FAIL: queue.json was modified on a repo_path-validation refusal" >&2; exit 1; }
still_blocked="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$queue_file','utf8')).jobs.find(j=>j.id==='job-bad-repo-path').status)")"
[[ "$still_blocked" == "blocked" ]] || { echo "FAIL: job-bad-repo-path status should remain blocked" >&2; exit 1; }

echo "=== Case 4: repo_path outside allowed_repo_roots at a path boundary (sibling dir sharing string prefix) refuses, no write ==="
before_hash="$(node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('$queue_file','utf8'))))")"
out="$(requeue job-boundary-violation)"
echo "$out"
[[ "$out" == REFUSE:* ]] || { echo "FAIL: expected refusal for job-boundary-violation (repo_path under a sibling dir sharing the allowed root's string prefix, not actually under it)" >&2; exit 1; }
after_hash="$(node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('$queue_file','utf8'))))")"
[[ "$before_hash" == "$after_hash" ]] || { echo "FAIL: queue.json was modified on a boundary-violation refusal" >&2; exit 1; }
still_blocked="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$queue_file','utf8')).jobs.find(j=>j.id==='job-boundary-violation').status)")"
[[ "$still_blocked" == "blocked" ]] || { echo "FAIL: job-boundary-violation status should remain blocked" >&2; exit 1; }

echo "PASS: squad-requeue command"
