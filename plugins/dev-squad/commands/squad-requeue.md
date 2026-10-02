---
description: Reset a blocked (or otherwise stuck) squad-queue-worker job back to queued, for operator-driven recovery after investigating the original failure.
argument-hint: <job-id>
---

Takes one argument: a job `id` from `dev-squad/state/queue.json`
(`$ARGUMENTS`). This command does **not** investigate or fix whatever
caused the job's prior failures — it only resets its queue state, on the
assumption the operator has already looked into the cause. It never
touches any job other than the one named.

0. **Resolve the plugin repo's own state path.** This command is
   typically invoked with `cwd` set to the **target product's** repo (e.g.
   Oculus, `ead-content-agents`), not this plugin repo — every reference
   below to `dev-squad/state/queue.json`, `dev-squad/state/queue.json.lock`,
   or `dev-squad/scripts/lib/queue-lock.mjs` means the **plugin's own**
   copy of that path, resolved via `${CLAUDE_PLUGIN_ROOT}` — the same
   environment variable this plugin's hooks (`dev-squad/hooks/hooks.json`)
   and the `dev-squad-protocol` skill already use to locate their own files
   regardless of invoking cwd. Concretely, resolve these three absolute
   paths **before doing anything else** and use them everywhere the
   corresponding relative path is written later in this file:

   - `QUEUE_FILE="${CLAUDE_PLUGIN_ROOT}/state/queue.json"`
   - `QUEUE_LOCK="${CLAUDE_PLUGIN_ROOT}/state/queue.json.lock"`
   - `QUEUE_LOCK_HELPER="${CLAUDE_PLUGIN_ROOT}/scripts/lib/queue-lock.mjs"`

   (`${CLAUDE_PLUGIN_ROOT}` already points at this plugin's own `dev-squad/`
   directory, so no further `dev-squad/` prefix is added.) Never derive
   these paths relative to the invoking shell's `cwd` — doing so would
   silently look for a `dev-squad/state/queue.json` inside the *target
   product's* repo instead of the plugin's own, which does not exist there
   and would not be the shared queue every product enqueues into.

1. If no job id argument was given, report that plainly (`usage:
   /squad-requeue <job-id>`) and stop — do not read or write
   `$QUEUE_FILE`.

2. Read `$QUEUE_FILE`. If it doesn't exist, report that
   plainly (nothing to requeue) and stop.

3. Find the job whose `id` matches the argument. If no job with that id
   exists, refuse: report "no job with id `<id>` in queue.json" and stop.
   Do not modify the file.

4. Re-run the same `repo_path` validation `/squad-enqueue` performs against
   that job's `repo_path` (duplicated here in prose, intentionally, so this
   command has no shared code file with `/squad-enqueue` — the two stay
   file-independent):
   - `repo_path` must be an absolute path.
   - It must exist on disk.
   - It must be a git repository (contains a `.git` entry).
   - It must contain a `.squad/squad.config.json` file.
   - It must be under one of the entries in `$QUEUE_FILE`'s top-level
     `allowed_repo_roots` array **at a path boundary** — i.e. either
     `repo_path == root` exactly, or `repo_path` starts with `root`
     followed immediately by `/`. A bare string-prefix match is not
     enough: `/Users/x/Projects` must not match an entry
     `/Users/x/ProjectsOther` and must not falsely match
     `/Users/x/Projects2/thing`.

   If any of these checks fails, refuse: report exactly which check failed
   and the `repo_path` value that failed it, and stop. Do not modify
   `queue.json` in this case — a job whose `repo_path` no longer validates
   should not be silently requeued to dispatch against a path that can
   never succeed.

5. If validation passes, acquire the queue lock, using the absolute paths
   resolved in step 0 (never relative paths — `cwd` at this point is the
   target repo, not the plugin repo):
   `node "$QUEUE_LOCK_HELPER" acquire "$QUEUE_LOCK"`.
   - Exit code `1` (busy, not stale, retries exhausted): report "queue
     busy, try again" and stop. Do not write `queue.json`.
   - Exit code `2` (usage/environment error): report the error and stop.
     Do not write `queue.json`.
   - Exit code `0`: continue to step 6.

6. Re-read `$QUEUE_FILE` (the lock only guarantees exclusive
   access from this point forward — always re-read after acquiring, never
   reuse the copy read in step 2/3, in case another writer changed it while
   this command was validating). Re-locate the job by `id`. On the matched
   job object only, set:
   - `status`: `"queued"`
   - `attempt_count`: `0`
   - `blocked_at`: `null`
   - `blocked_reason`: `null`
   - `last_error`: `null`

   Leave every other field on that job (`repo_path`, `product_name`,
   `enqueued_at`, `max_attempts`, `claimed_at`, `last_progress_at`,
   `completed_at`) and every other job in the `jobs` array completely
   untouched. Write the file back.

7. Release the lock, always, on every path after the lock was successfully
   acquired in step 5 — success or failure of the write itself:
   `node "$QUEUE_LOCK_HELPER" release "$QUEUE_LOCK"`.
   Always run this after step 6, whether the write in step 6 succeeded or
   failed — never leave the lock held.

8. Report the result plainly, e.g.:
   ```
   requeued job-20260923T140500Z-ead-content-agents: status=queued, attempt_count=0
   ```
   or, on any refusal above, the specific reason (missing argument,
   unknown job id, which `repo_path` check failed, or "queue busy, try
   again") — never a silent no-op.
