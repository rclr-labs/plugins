---
name: squad-queue-worker
description: Use for each scheduled (CronCreate) invocation that services dev-squad/state/queue.json — checks memory pressure, claims the oldest queued job (if any), dispatches the squad-build workflow for it, and records the outcome. Not for interactive use; /squad-enqueue, /queue-status, and /squad-requeue are the human-facing surface for this same queue.
---

# squad-queue-worker

This skill defines exactly what **one scheduled invocation** does. It
implements spec section 3's algorithm verbatim, tied to section 6's
resume-safety prerequisite and section 8's stage-advancement scope. Follow
these steps in order, every invocation, with no deviation and no looping
past step 12.

All state lives in `dev-squad/state/queue.json`, in **this** repo (the
dev-squad plugin repo) — not in any target product's own repo. Every write
to it goes through the advisory lock CLI:

```
node dev-squad/scripts/lib/queue-lock.mjs acquire <lockDirPath>
node dev-squad/scripts/lib/queue-lock.mjs release <lockDirPath>
```

`lockDirPath` is `dev-squad/state/queue.json.lock`. Exit code `0` means
acquired/released; `1` means held, not stale, retries exhausted — apply
this step's own busy policy (below) rather than retrying indefinitely; `2`
is a usage/environment error, never treat it as "busy."

**Every write in this skill follows the same read-modify-write discipline,
stated once here rather than re-derived per step: `acquire` the lock, then
re-read `dev-squad/state/queue.json` fresh from disk (never write back the
snapshot this invocation read back in step 1 or any earlier step), mutate
only the named job's fields in that freshly-read copy, write the result,
then `release`.** This matters because another writer — most plausibly a
human running `/squad-enqueue` — can append a job to the file at any point
between this invocation's step 1 read and a later step's write; writing
back an in-memory snapshot taken before the lock was held would silently
discard that append (the exact lost-update scenario §5's lock exists to
prevent, and what acceptance scenario 11 asserts must not happen). Steps 2,
8, and 10, and the shared worker-failure logic below, all follow this rule
— it is not repeated in full at each of those points.

## The `progressEvidence(repo_path, product_name)` function

Defined once here, reused **verbatim** by both step 2 (the staleness
sweep) and step 7 (pre-claim re-validation) — do not re-implement it
separately in either place. Given a job's `repo_path`:

Determine the newest of:
- that job's own `claimed_at` timestamp (if set);
- the mtime of any file under `<repo_path>/.squad/tasks/`;
- the mtime of `<repo_path>/.squad/squad.config.json`;
- the newest commit timestamp across all branches/worktrees in that repo —
  run `git -C <repo_path> worktree list`, then for each worktree listed,
  `git -C <that worktree path> log -1 --format=%cI` on its checked-out
  branch, and take the max;
- the newest file mtime inside any of those worktrees' working
  directories.

Return that newest timestamp. `now - progressEvidence(...)` is the
staleness figure both steps compare against `staleness_window_minutes`.
Task-file mtime alone is not sufficient signal (a single long-running task
in a wave looks identical to a crashed invocation for its entire
duration) — commit/worktree activity is what actually distinguishes
"still working" from "dead," which is why this function looks past
`.squad/tasks/` and `squad.config.json` mtimes to real git activity.

## The 12 steps

1. **Read** `dev-squad/state/queue.json`. If the file is missing, or its
   `jobs` array is empty, stop here — nothing to do this invocation.

2. **Staleness sweep**, over every job in `jobs` whose `status ==
   "running"`:
   - Compute `progressEvidence(job.repo_path, job.product_name)`.
   - If `now - progressEvidence(...) > staleness_window_minutes`: this is
     a **worker failure**. Increment `job.attempt_count` by 1.
     - If `job.attempt_count < job.max_attempts`: set `job.status =
       "queued"`, clear `job.claimed_at` and `job.last_progress_at` (both
       `null`), and record a short, human-authored summary (never raw
       captured stdout/stderr) in `job.last_error`, e.g. `"Build workflow
       stale; no commit/worktree progress in <N>m (attempt
       <attempt_count>/<max_attempts>)"`.
     - Else (`job.attempt_count >= job.max_attempts`): set `job.status =
       "blocked"`, `job.blocked_at = now`, and `job.blocked_reason`
       summarizing the failure and attempt count, e.g. `"Blocked after
       <max_attempts> stale worker attempts; last seen progress
       <progressEvidence timestamp>. Investigate and run /squad-requeue
       <id> to retry."`
   - After the sweep, if any job's fields changed, write the whole queue
     file through the lock (`acquire` → re-read → apply the changes just
     computed → write → `release`). If the lock cannot be acquired within
     its own retry budget, **skip the write for this invocation entirely**
     — leave every `running` job exactly as it was found — rather than
     partially applying the sweep. This is not lossy: the next interval
     re-evaluates staleness from scratch.

3. **Exit if any job's `status == "running"`** after the sweep (whether it
   was already `running` and not stale, or the sweep's lock-contention
   skip left a stale one `running` for this cycle). Only one job runs
   system-wide at a time — this worker never reasons about N concurrent
   Builds' combined memory footprint.

4. **Check memory pressure** by invoking, literally, the same script used
   for per-subagent dispatch — `~/.claude/hooks/check-memory-pressure.sh`
   — and parsing its stdout. Exactly three cases:
   - **Empty stdout, exit 0** → pressure level 1 (normal) → capacity
     allows.
   - **JSON on stdout with `hookSpecificOutput.permissionDecision ==
     "deny"`** → critical pressure → capacity does **not** allow.
   - **JSON on stdout with `hookSpecificOutput.permissionDecision ==
     "ask"`** → warn-level pressure → treated as capacity does **not**
     allow. No human is present in a scheduled invocation to answer the
     hook's "ask," so this worker defers rather than guessing — this is
     the confirmed v1 policy (spec §7), not a placeholder. This third case
     also covers the script's free-MB fallback path silently, since that
     path only prints when below its own threshold (same `deny` shape).

5. **If capacity does not allow:** exit now. The queue is otherwise
   untouched this invocation (any staleness-sweep write from step 2 still
   stands).

6. **If capacity allows:** pick the `queued` job with the oldest
   `enqueued_at` (FIFO) from the current in-memory queue state (post-sweep
   if step 2 wrote; as originally read if it didn't). If there is no
   `queued` job, exit — nothing to dispatch this invocation.

7. **Re-validate before claiming.** This is a second, immediate check, not
   just re-checking structural fields:
   - Confirm `job.repo_path` is still under one of `allowed_repo_roots` **at
     a path boundary** — i.e. either `job.repo_path == root` exactly, or
     `job.repo_path` starts with `root` followed immediately by `/`. A bare
     string-prefix match is not enough: `/Users/x/Projects` must not match
     an entry `/Users/x/ProjectsOther` and must not falsely match
     `/Users/x/Projects2/thing`. Also confirm the path still exists on disk.
   - Confirm no other job entry sharing the same `{repo_path,
     product_name}` currently has `status == "running"`.
   - **Re-run `progressEvidence(job.repo_path, job.product_name)` right
     now** (the same function step 2 used). If `now -
     progressEvidence(...) <= staleness_window_minutes` — i.e. the target
     repo shows real activity newer than the staleness window even though
     this job's `status` reads `queued` — **do not treat this as a
     failure**: leave the job exactly as `queued` (no attempt_count change)
     and dispatch nothing this invocation. This
     guards against the worker's own retry path launching a second,
     concurrent Build for a product whose prior attempt (or this
     invocation's own step-2 sweep) may still be genuinely alive. Stop
     this invocation here.
   - If either of the first two checks fails (path no longer under
     `allowed_repo_roots`/no longer exists, or a concurrent `running`
     entry for the same `{repo_path, product_name}` exists): this **is** a
     worker failure for this job — apply the same attempt-increment /
     requeue-or-block logic as step 2, using the current
     `progressEvidence` reading as the staleness basis, through the lock.
     Stop this invocation without dispatching either way.

8. **Claim it.** Following the acquire → re-read → mutate → write →
   release discipline above, set `job.status = "running"`,
   `job.claimed_at = now`, `job.last_progress_at = now` on the
   freshly-re-read copy of the file. Write this immediately, through the
   lock, before doing anything else in the target repo — a crash right
   after this write is still detectable by the next invocation's
   staleness sweep (step 2). If the lock cannot be acquired, treat it the
   same as step 5: exit without claiming, defer to the next interval.
   Never proceed to step 9 without this write having durably landed.

9. **Dispatch.** `cd` into `job.repo_path`. Read
   `.squad/squad.config.json`.
   - **Pre-flight check:** if that file is missing, unreadable, or its
     `stage` field is not exactly `"build"`, this is a worker failure —
     the job's premise no longer holds. Apply the same attempt-increment /
     requeue-or-block logic as step 2, immediately, in this same
     invocation (do not wait for the staleness window to catch a
     synchronously-detected error). Stop.
   - Otherwise, read `max_parallel_devs` from that same file and run the
     Build stage exactly per the `dev-squad-protocol` skill's step 3:
     invoke the `squad-build` workflow
     (`${CLAUDE_PLUGIN_ROOT}/scripts/workflows/build.js`) via the Workflow
     tool, with `args: {maxParallelDevs: <value>}`.
   - **This dispatch step is only safe once the resume-safety fix to
     `dev-squad/scripts/workflows/build.js` (spec §6) has landed.**
     Without it, a worker-failure retry that re-invokes `squad-build`
     against the same `repo_path` would re-run already-finished tasks'
     Dev/QA pairs and risk colliding with leftover worktrees/branches from
     the prior attempt. Do not run this skill's dispatch step against a
     repo whose `build.js` predates that fix.

10. **On the workflow reaching a terminal state** — it returns
    `{breakdown, results, allPassed, failedTasks}` — **regardless of
    whether `allPassed` is true or `failedTasks` is non-empty**: QA/Dev
    findings recorded inside the Build are a normal business outcome, not
    a worker failure, and this worker never inspects or acts on their
    content (spec §8, out-of-scope list).
    - Perform the same stage-advancement bookkeeping `/squad-advance`'s
      step 3 would for the `build → test` transition (`test` is folded
      into Build per the protocol skill — nothing separate to run, but the
      literal `stage` value still advances):
      - Write `stage: "test"` into the target repo's
        `.squad/squad.config.json` — never `stage: "deploy"`. Writing
        `"deploy"` directly would silently cross the `design →
        build`-and-production-deploy gate boundary the protocol never
        skips, by skipping recording of the `test` stage entirely.
      - Write `pending_gate` **only if `gate_mode` is `"full"`** in that
        same config file, describing what's waiting (matching
        `squad-advance` step 3's own conditional exactly — not
        unconditional). Under `gate_mode: "critical-only"`, `build →
        test` is not one of the two always-gated transitions
        (`design → build`, anything → production deploy), so no
        `pending_gate` is written here; the next gate a human's
        `/squad-advance` call handles is `test → deploy`. This worker
        never performs any deploy-stage step itself, regardless of gate
        mode.
    - Then, in `dev-squad/state/queue.json`: following the acquire →
      re-read → mutate → write → release discipline above, set
      `job.status = "done"`, `job.completed_at = now`, clear
      `job.claimed_at` and `job.last_progress_at` (both `null`) — through
      the lock. **If the
      lock cannot be acquired, retry with backoff for the remainder of
      this invocation's own execution budget** rather than skipping the
      write — this is the one write path in this skill that must not be
      dropped on contention, because the target repo's Build has
      genuinely finished and the queue must reflect that (every other
      write path in this skill skips on contention and defers to the next
      interval; this one does not).

11. **On the workflow itself throwing, crashing, or timing out** before
    reaching a terminal state (before step 10's return value is
    available): this is a worker failure, handled synchronously the same
    way as step 9's pre-flight failure — apply the same attempt-increment
    / requeue-or-block logic as step 2, immediately, through the lock, in
    this same invocation.

12. **This invocation dispatches at most one job.** After finishing step
    10 or 11 (or exiting earlier at any of steps 1, 3, 5, 6, 7's
    still-alive case, or 8's lock-contention case), do not loop back to
    pick up a second job. The next scheduled interval handles the next
    one.

## Worker-failure attempt-increment / requeue-or-block logic (shared by steps 2, 7, 9, 11)

Given a job whose worker failure was just detected (staleness sweep,
synchronous pre-flight failure, workflow crash, or a re-validation
structural check failing):

1. Increment `job.attempt_count` by 1.
2. If `job.attempt_count < job.max_attempts` (i.e. the 3rd attempt has not
   yet been consumed): set `job.status = "queued"`, clear `job.claimed_at`
   and `job.last_progress_at`, write a short summary to `job.last_error`.
3. Else: set `job.status = "blocked"`, `job.blocked_at = now`,
   `job.blocked_reason` summarizing what failed and that
   `job.attempt_count`/`job.max_attempts` attempts were exhausted.
4. Write through the lock, per each calling step's own contention policy
   (steps 2/7/9's synchronous failures follow step 2's "skip on
   contention" policy — this is a mid-invocation state transition, not the
   step-10 completion write, so it does not get the backoff-retry
   exception).

`last_error`/`blocked_reason` are always short, human-authored summary
strings — never a raw dump of a crashed process's stdout/stderr or
environment. This file is git-tracked; a raw dump could incidentally
capture secrets that were in scope when a Build step crashed.

## What this skill never does

- Loop to dispatch more than one job per invocation (step 12).
- Advance a target repo's `stage` past the literal value `"test"` — never
  `"deploy"`, and never any deploy-stage step.
- Inspect, act on, or auto-fix QA/Dev failure content recorded inside a
  product's own Build — only whether the Build stage as a whole reached a
  terminal state.
- Dispatch under `deny` or `ask` memory-pressure readings.
- Claim a job whose `progressEvidence` shows genuinely recent activity,
  even if its `status` currently reads `queued`.
