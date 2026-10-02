#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
lock_mod="$root/scripts/lib/queue-lock.mjs"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
lock_path="$work/queue.json.lock"

# --- Acceptance scenario 11: two concurrent acquire calls against the same
# lock path serialize (neither silently proceeds while the other holds it),
# and after both release, the lock directory no longer exists. ---
#
# Simulate two writers: the first holds the lock, sleeps briefly (standing
# in for a real write), then releases; the second is launched concurrently
# and must block (via the retry loop) until the first releases, rather than
# both reporting success while the lock is simultaneously held.

order_file="$work/order.log"
: > "$order_file"

# Millisecond timestamps via Node (not `date +%s%N`, which is GNU-only and
# silently emits the literal "N" on BSD/macOS `date`, corrupting the numeric
# comparison below under `set -e`).
now_ms() { node -e 'process.stdout.write(String(Date.now()))'; }

(
  node "$lock_mod" acquire "$lock_path"
  echo "A-acquired $(now_ms)" >> "$order_file"
  # Held time only needs to comfortably outlast B's ~100ms head-start delay
  # while staying well inside B's ~800ms (5 x 200ms) retry budget, so B is
  # actually exercising retries rather than winning on its first attempt.
  sleep 0.25
  node "$lock_mod" release "$lock_path"
  echo "A-released $(now_ms)" >> "$order_file"
) &
pid_a=$!

# Give A a moment's head start so it wins the race for the lock.
sleep 0.1

(
  # B's acquire must retry until A releases. A busy result here (B exhausted
  # its retry budget while A still held the lock) is a FAILURE of scenario
  # 11, not an acceptable outcome — the scenario requires both writes to
  # land ("serialized, neither lost"), so B must eventually acquire.
  if node "$lock_mod" acquire "$lock_path"; then
    echo "B-acquired $(now_ms)" >> "$order_file"
    node "$lock_mod" release "$lock_path"
    echo "B-released $(now_ms)" >> "$order_file"
  else
    echo "B-busy $(now_ms)" >> "$order_file"
  fi
) &
pid_b=$!

wait "$pid_a" "$pid_b"

cat "$order_file"

# The lock directory must not exist after both processes finish.
if [[ -d "$lock_path" ]]; then
  echo "FAIL: lock directory still exists after both processes finished" >&2
  exit 1
fi

if ! grep -q "A-acquired" "$order_file"; then
  echo "FAIL: A never acquired the lock" >&2
  exit 1
fi

if ! grep -q "A-released" "$order_file"; then
  echo "FAIL: A never released the lock" >&2
  exit 1
fi

if grep -q "B-busy" "$order_file"; then
  echo "FAIL: B exhausted its retry budget while A held the lock — B's write was lost, not serialized (scenario 11 requires both writes to land)" >&2
  exit 1
fi

if ! grep -q "B-acquired" "$order_file"; then
  echo "FAIL: B never acquired the lock" >&2
  exit 1
fi

if ! grep -q "B-released" "$order_file"; then
  echo "FAIL: B never released the lock" >&2
  exit 1
fi

# B must never have acquired the lock while A still held it — the whole
# point of the lock is that acquisition is mutually exclusive.
a_released_ts="$(awk '/A-released/{print $2}' "$order_file")"
b_acquired_ts="$(awk '/B-acquired/{print $2}' "$order_file")"

if [[ "$b_acquired_ts" -lt "$a_released_ts" ]]; then
  echo "FAIL: B acquired the lock before A released it (no serialization)" >&2
  exit 1
fi

echo "PASS: concurrent acquire calls serialize (both writes land); lock dir removed after both release"

# --- Additional direct unit-level checks on the CLI contract ---

rm -rf "$lock_path"

# acquire on a free lock succeeds (exit 0) and creates the directory.
if ! node "$lock_mod" acquire "$lock_path"; then
  echo "FAIL: acquire on a free lock did not exit 0" >&2
  exit 1
fi
if [[ ! -d "$lock_path" ]]; then
  echo "FAIL: acquire did not create the lock directory" >&2
  exit 1
fi

# release removes the directory and exits 0.
if ! node "$lock_mod" release "$lock_path"; then
  echo "FAIL: release did not exit 0" >&2
  exit 1
fi
if [[ -d "$lock_path" ]]; then
  echo "FAIL: release did not remove the lock directory" >&2
  exit 1
fi

# release on an already-released (non-existent) lock is idempotent (exit 0).
if ! node "$lock_mod" release "$lock_path"; then
  echo "FAIL: release on a non-existent lock did not exit 0 (should be idempotent)" >&2
  exit 1
fi

# acquire while already held (fresh mtime) fails with exit 1 after retries.
mkdir "$lock_path"
set +e
node "$lock_mod" acquire "$lock_path"
held_rc=$?
set -e
if [[ "$held_rc" -ne 1 ]]; then
  echo "FAIL: acquire against an already-held, non-stale lock did not exit 1 (got $held_rc)" >&2
  exit 1
fi
rmdir "$lock_path"

# acquire against a stale lock (mtime older than 2 minutes) recovers and
# succeeds.
mkdir "$lock_path"
# Backdate the lock directory's mtime to 3 minutes ago (portable across
# BSD/GNU touch via Node's utimesSync rather than shelling out to touch).
node -e '
const fs = require("node:fs");
const p = process.argv[1];
const past = new Date(Date.now() - 3 * 60 * 1000);
fs.utimesSync(p, past, past);
' "$lock_path"
if ! node "$lock_mod" acquire "$lock_path"; then
  echo "FAIL: acquire did not recover a stale (>2min old) lock" >&2
  exit 1
fi
node "$lock_mod" release "$lock_path"

# Usage error: missing args -> exit 2.
set +e
node "$lock_mod" acquire >/dev/null 2>&1
usage_rc=$?
set -e
if [[ "$usage_rc" -ne 2 ]]; then
  echo "FAIL: missing lockDirPath argument did not exit 2 (got $usage_rc)" >&2
  exit 1
fi

set +e
node "$lock_mod" bogus-command "$lock_path" >/dev/null 2>&1
usage_rc2=$?
set -e
if [[ "$usage_rc2" -ne 2 ]]; then
  echo "FAIL: unknown command did not exit 2 (got $usage_rc2)" >&2
  exit 1
fi

# Unexpected environment error (parent directory of lockDirPath doesn't
# exist) -> exit 2, never exit 1 — exit 1 must mean only "held, not stale,
# retries exhausted", never an unrelated filesystem error, since callers
# branch their busy policy on exit 1 specifically.
set +e
node "$lock_mod" acquire "$work/does/not/exist/queue.json.lock" >/dev/null 2>&1
env_err_rc=$?
set -e
if [[ "$env_err_rc" -ne 2 ]]; then
  echo "FAIL: acquire against a path with a missing parent dir did not exit 2 (got $env_err_rc)" >&2
  exit 1
fi

echo "PASS: queue-lock.mjs CLI contract (acquire/release, staleness recovery, usage errors, unexpected-error handling)"
