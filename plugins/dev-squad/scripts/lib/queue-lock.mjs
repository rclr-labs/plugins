#!/usr/bin/env node
/**
 * queue-lock.mjs — advisory lock helper for dev-squad/state/queue.json
 * (spec section 5 of the squad-queue-worker product).
 *
 * All writers to queue.json (`/squad-enqueue`, `/squad-requeue`, and every
 * write the scheduled dispatcher makes) MUST go through this module rather
 * than a bare read-modify-write, to avoid lost updates on a git-tracked
 * shared-state file.
 *
 * CLI contract:
 *
 *   node dev-squad/scripts/lib/queue-lock.mjs acquire <lockDirPath>
 *   node dev-squad/scripts/lib/queue-lock.mjs release <lockDirPath>
 *
 * Exit codes:
 *   0 — lock acquired (acquire) or released (release) successfully.
 *   1 — acquire failed: lock is held by another process, is not stale
 *       (mtime younger than 2 minutes), and all retries were exhausted.
 *       The caller applies its own busy policy per spec §5: interactive
 *       commands (/squad-enqueue, /squad-requeue) report "queue busy, try
 *       again" and make no write; the scheduled dispatcher skips the write
 *       for this invocation (except its step-10 completion write, which
 *       instead retries with backoff for the rest of its execution budget).
 *   2 — usage error (missing/invalid command or lockDirPath argument), or
 *       any other unexpected filesystem/environment error (e.g. the lock
 *       path's parent directory doesn't exist, a permissions error). Exit 1
 *       means specifically and only "held, not stale, retries exhausted" —
 *       callers branching their busy policy on exit 1 must not see it for
 *       an unrelated failure.
 *
 * Acquire semantics:
 *   - `mkdir` is atomic on a POSIX filesystem, so lock acquisition is a
 *     single syscall with no separate check-then-act race.
 *   - Attempt `mkdir` in a retry loop: 5 attempts, ~200ms apart. Real
 *     writes to queue.json are a few milliseconds, so contention this
 *     brief is the only case that should ever need a retry at all.
 *   - Stale-lock recovery: if still held after the retry loop, stat the
 *     lock directory's mtime. If it is older than 2 minutes (a hard
 *     ceiling chosen to be safely above worst-case write latency, not
 *     tuned to any specific measured value), treat it as abandoned by a
 *     crashed process: remove it and re-acquire (one more `mkdir`
 *     attempt). If that recovery mkdir also fails (e.g. lost the race to
 *     another process), the acquire fails (exit 1).
 *   - This module reasons about a single local machine only — no
 *     multi-host contention. An abandoned lock can only mean a process
 *     died mid-write.
 *
 * Release semantics:
 *   - Plain `rmdir` on the lock directory. Always call this after the
 *     write completes, success or failure, on every code path that
 *     acquired the lock — never leave the lock held on an error path.
 *   - Idempotent-ish: releasing a lock directory that does not exist
 *     still exits 0 (nothing to do), so a caller that raced a stale-lock
 *     removal against itself does not get spurious failures.
 *
 * This module has no dependency on queue.json's contents or schema — it
 * only manages the lock directory named by its `lockDirPath` argument.
 * Callers pass `dev-squad/state/queue.json.lock` (or an absolute path to
 * it) as that argument.
 */

import { mkdirSync, rmdirSync, statSync } from "node:fs";

const ACQUIRE_ATTEMPTS = 5;
const ACQUIRE_RETRY_DELAY_MS = 200;
const STALE_LOCK_MS = 2 * 60 * 1000; // 2 minutes

function sleepSync(ms) {
  // True blocking sleep with no busy-wait CPU burn — this module runs on
  // a memory-pressure-sensitive machine by design, so spinning on Date.now()
  // for up to ~800ms per contending caller is worth avoiding.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function tryMkdir(lockDirPath) {
  try {
    mkdirSync(lockDirPath);
    return true;
  } catch (err) {
    if (err && err.code === "EEXIST") return false;
    throw err;
  }
}

function lockAgeMs(lockDirPath) {
  const stat = statSync(lockDirPath);
  return Date.now() - stat.mtimeMs;
}

/**
 * Attempt to acquire the lock at lockDirPath.
 * Returns true if acquired, false if busy/not-stale/retries exhausted.
 */
export function acquire(lockDirPath) {
  for (let attempt = 0; attempt < ACQUIRE_ATTEMPTS; attempt++) {
    if (tryMkdir(lockDirPath)) return true;
    if (attempt < ACQUIRE_ATTEMPTS - 1) {
      sleepSync(ACQUIRE_RETRY_DELAY_MS);
    }
  }

  // Still held after the retry loop — check for staleness.
  let age;
  try {
    age = lockAgeMs(lockDirPath);
  } catch (err) {
    if (err && err.code === "ENOENT") {
      // Lock disappeared between our last failed mkdir and this stat
      // (another process released it). Try once more.
      return tryMkdir(lockDirPath);
    }
    throw err;
  }

  if (age > STALE_LOCK_MS) {
    try {
      rmdirSync(lockDirPath);
    } catch (err) {
      if (err && err.code !== "ENOENT") throw err;
    }
    return tryMkdir(lockDirPath);
  }

  return false;
}

/**
 * Release the lock at lockDirPath. Idempotent if already released.
 */
export function release(lockDirPath) {
  try {
    rmdirSync(lockDirPath);
  } catch (err) {
    if (err && err.code !== "ENOENT") throw err;
  }
}

function main() {
  const [, , command, lockDirPath] = process.argv;

  if (!command || !lockDirPath || (command !== "acquire" && command !== "release")) {
    process.stderr.write(
      "usage: node queue-lock.mjs acquire|release <lockDirPath>\n"
    );
    process.exit(2);
  }

  // Exit 1 must mean exactly "held, not stale, retries exhausted" per the
  // documented contract — any other failure (e.g. a bad path whose parent
  // doesn't exist, a permissions error) is a usage/environment problem, not
  // a busy lock, so it must not be conflated with exit 1. Callers (T4/T5/T6/
  // T7) branch their busy policy on exit 1 specifically.
  try {
    if (command === "acquire") {
      const ok = acquire(lockDirPath);
      process.exit(ok ? 0 : 1);
    } else {
      release(lockDirPath);
      process.exit(0);
    }
  } catch (err) {
    process.stderr.write(
      `queue-lock.mjs: unexpected error: ${err && err.message ? err.message : err}\n`
    );
    process.exit(2);
  }
}

// Only run the CLI when invoked directly (not when imported for tests).
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("/queue-lock.mjs") ||
    process.argv[1] === "queue-lock.mjs");
if (isMain) {
  main();
}
