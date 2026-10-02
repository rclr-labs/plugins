---
description: Queue a product's Build stage for the scheduled squad-queue-worker instead of running it inline.
---

Implements spec §2 of the `squad-queue-worker` product
(`.squad/spec.md`) exactly. This command only appends a job to
`dev-squad/state/queue.json` — it never runs Build itself and never
modifies the target repo's own `.squad/squad.config.json`.

## 0. Resolve the plugin repo's own state path

This command is typically invoked with `cwd` set to the **target
product's** repo (e.g. Oculus, `ead-content-agents`), not this plugin
repo — `repo_path` in step 1 below is very often a *different* repo than
the one that owns `dev-squad/state/queue.json`. Every reference in this
command to `dev-squad/state/queue.json`, `dev-squad/state/queue.json.lock`,
or `dev-squad/scripts/lib/queue-lock.mjs` below means the **plugin's own**
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
directory, so no further `dev-squad/` prefix is added.) Never derive these
paths relative to `repo_path` or to the invoking shell's `cwd` — doing so
would silently look for (or create) a `dev-squad/state/queue.json` inside
the *target product's* repo instead of the plugin's own, which does not
exist there and would not be the shared queue every product enqueues into.

## 1. Resolve the target repo path

`repo_path` is either given explicitly as this command's argument, or
defaults to the current working directory (`pwd`) if not given. Resolve it
to an absolute path before doing anything else (`cd "$repo_path" && pwd`,
or equivalent) — every check and every stored field below operates on that
resolved absolute path, never a relative one.

## 2. Read the target repo's own squad state

Read `<repo_path>/.squad/squad.config.json`.

- If it does not exist or is not readable: refuse. Report plainly:
  `refused: <repo_path>/.squad/squad.config.json not found — not a dev-squad product repo`.
  Do not touch `queue.json`.
- Read its `product` field — this becomes `product_name` for the new job.
- Read its `stage` field. If `stage != "build"`, refuse and report the
  **actual** stage, not a generic error:
  `refused: <product_name> is at stage "<stage>", not "build" — nothing to enqueue`.
  Do not touch `queue.json`.

## 3. Validate `repo_path`

All of the following must hold, in order, stopping at the first failure
with a specific, plain report (never a generic "invalid repo_path") and
**no write to `queue.json`**:

1. **Absolute.** `repo_path` must start with `/`. If not:
   `refused: repo_path "<repo_path>" is not absolute`.
2. **Exists.** The directory must exist on disk. If not:
   `refused: repo_path "<repo_path>" does not exist`.
3. **Is a git repository.** `<repo_path>/.git` must exist (directory or
   file, the latter for a linked worktree). If not:
   `refused: repo_path "<repo_path>" is not a git repository (no .git)`.
4. **Contains `.squad/squad.config.json`.** Already confirmed readable in
   step 2 — if step 2 failed, this command already stopped there.
5. **Is under an allowed root.** Read `allowed_repo_roots` from
   `$QUEUE_FILE` (this plugin repo's own `dev-squad/state/queue.json`,
   resolved in step 0 — the array of absolute path prefixes — read this
   file plainly first, no lock needed for a read-only check). `repo_path`
   must start with one of those entries **at
   a path boundary** — i.e. either `repo_path == root` exactly, or
   `repo_path` starts with `root` followed immediately by `/`. A bare
   string-prefix match is not enough: `/Users/x/Projects` must not match
   an entry `/Users/x/ProjectsOther` and must not falsely match
   `/Users/x/Projects2/thing`. If no entry matches:
   `refused: repo_path "<repo_path>" is not under any allowed_repo_roots entry`.

Note: `allowed_repo_roots` entries may themselves contain spaces (e.g. a
path with spaces in it, e.g. `Documents - Shared Drive`) — always quote paths in any
shell command used to perform these checks, and compare the resolved
absolute path string directly rather than relying on shell globbing.

## 4. Duplicate guard (first pass)

Still reading `$QUEUE_FILE` (the plugin repo's own `dev-squad/state/queue.json`,
resolved in step 0) plainly (no
lock yet — this is a cheap pre-check before paying for the lock; the
authoritative check happens again after acquiring the lock in step 6,
since a competing enqueue could land in between):

Look for any existing job in `jobs[]` whose `repo_path` equals this
command's resolved `repo_path` **and** whose `product_name` equals this
command's `product_name`, and whose `status` is `queued` or `running`
(both count — a `running` job for the same product must not be
double-queued, and a second `queued` entry alongside an existing one is
equally a duplicate). If found, refuse immediately and report the
existing job's identity, without touching the file:
`refused: duplicate job for <product_name> at <repo_path> already exists (id=<id>, status=<status>)`.

`done` and `blocked` jobs for the same `{repo_path, product_name}` are
**not** duplicates — a product can be legitimately re-enqueued after a
prior run finished or after an operator investigates and chooses to
enqueue a fresh job instead of running `/squad-requeue` on the old one.

## 5. Acquire the lock

Run, using the absolute paths resolved in step 0 (never relative paths —
`cwd` at this point is the target repo, not the plugin repo):

```
node "$QUEUE_LOCK_HELPER" acquire "$QUEUE_LOCK"
```

- **Exit 0:** lock acquired — proceed to step 6.
- **Exit 1:** lock is held by another writer and not yet stale. Report
  exactly: `queue busy, try again` — and stop. **Do not write to
  `queue.json`.** Do not retry automatically; this command is
  interactive, so surfacing the busy state and letting the human decide
  to retry is the documented policy (spec §2, §5).
- **Exit 2:** a usage or environment error in the lock helper itself (not
  a busy lock — `queue-lock.mjs`'s own contract distinguishes this from
  exit 1 explicitly). Report the helper's stderr output plainly as an
  unexpected error and stop. Do not write to `queue.json`. Do not report
  "queue busy" for this case — it is a different failure mode and would
  mislead the operator into retrying something that will fail identically
  every time.

## 6. Re-read, re-check, append

Once the lock is held:

1. **Re-read** `$QUEUE_FILE` fresh (do not reuse the copy
   read in steps 3–4 — another writer may have changed it between that
   read and acquiring the lock).
2. **Re-run the duplicate guard** from step 4 against this fresh read. If
   a matching `queued`/`running` job now exists (created by a writer that
   won the race between your first read and the lock), refuse exactly as
   in step 4, release the lock (step 7), and make no write.
3. Construct the new job object:
   - `id`: `job-<UTC timestamp>-<product_name>`, where `<UTC timestamp>`
     is `date -u +%Y%m%dT%H%M%SZ` (e.g. `job-20260923T140500Z-ead-content-agents`).
   - `repo_path`: the resolved absolute path from step 1.
   - `product_name`: from step 2.
   - `status`: `"queued"`.
   - `enqueued_at`: now, `date -u +%Y-%m-%dT%H:%M:%SZ` (ISO-8601 UTC).
   - `attempt_count`: `0`.
   - `max_attempts`: `3`.
   - `claimed_at`: `null`.
   - `last_progress_at`: `null`.
   - `completed_at`: `null`.
   - `last_error`: `null`.
   - `blocked_at`: `null`.
   - `blocked_reason`: `null`.
4. **Append** this object to the end of the `jobs` array. Do not reorder,
   remove, or modify any other existing job entry — every other job in
   the array must be byte-for-byte unchanged.
5. **Write** the updated file back to `$QUEUE_FILE`
   (pretty-printed JSON, matching the existing file's formatting).

## 7. Release the lock

Always run, on every path after the lock was successfully acquired in
step 5 — success or failure of the write itself:

```
node "$QUEUE_LOCK_HELPER" release "$QUEUE_LOCK"
```

Never leave the lock held on an error path.

## 8. Report

On success, print a compact confirmation, not prose:

```
enqueued: id=<id>, product=<product_name>, repo_path=<repo_path>, status=queued
queue: queued=<N>, running=<N>, blocked=<N>, done=<N>
help[]: /queue-status to check progress, /squad-requeue <id> if it later gets blocked
```

where the `queue:` line's counts are computed from the freshly-written
`jobs[]` array (a pre-computed aggregate, not something the operator has
to count themselves).

On any refusal (steps 2–5), the report is the single specific reason line
already specified at that step — no queue file is modified, and nothing
else is printed.
