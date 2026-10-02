---
description: Show a compact, AXI-style status of the squad-queue-worker's job queue — counts by status, a per-job table, and full detail for any blocked job.
---

## 0. Resolve the plugin repo's own state path

This command is typically invoked with `cwd` set to the **target
product's** repo (e.g. Oculus, `ead-content-agents`), not this plugin
repo — the queue file this command reads belongs to the **plugin's own**
`dev-squad/state/`, resolved via `${CLAUDE_PLUGIN_ROOT}` — the same
environment variable this plugin's hooks (`dev-squad/hooks/hooks.json`)
and the `dev-squad-protocol` skill already use to locate their own files
regardless of invoking cwd. Concretely, resolve this absolute path
**before doing anything else** and use it everywhere the corresponding
relative path is written later in this file:

- `QUEUE_FILE="${CLAUDE_PLUGIN_ROOT}/state/queue.json"`

(`${CLAUDE_PLUGIN_ROOT}` already points at this plugin's own `dev-squad/`
directory, so no further `dev-squad/` prefix is added.) Never derive this
path relative to the invoking shell's `cwd` — doing so would silently look
for a `dev-squad/state/queue.json` inside the *target product's* repo
instead of the plugin's own, which does not exist there and would not be
the shared queue every product enqueues into.

## 1. Read the queue file

Read `$QUEUE_FILE` (resolved in step 0; if missing, report that plainly and
state `jobs=0` — do not error out with a stack trace; an absent queue file
means the queue has never been initialized, which is functionally the same
empty state as an existing file with `jobs: []`).

Print output in this compact form, not prose, not JSON:

```
queue status: jobs=<N>, running=<N>, queued=<N>, blocked=<N>, done=<N>
jobs[N]{id,product,status,attempts}:
  job-20260923T140500Z-ead-content-agents,ead-content-agents,blocked,3
  job-20260923T141000Z-agent-factory,agent-factory,queued,0
```

- `jobs=<N>` is the total count of entries in the `jobs` array; `running=`,
  `queued=`, `blocked=`, `done=` are counts of entries with that `status`
  value. Always print all five counts explicitly, even when every one of
  them is `0` — a definitive empty state (AXI rule 5), never blank/omitted
  output. If `jobs` is empty (or the file is missing), still print the
  `queue status:` line with `jobs=0, running=0, queued=0, blocked=0,
  done=0`, then `jobs[0]{id,product,status,attempts}:` with no rows under
  it — do not print nothing.
- The `jobs[N]{id,product,status,attempts}:` table has one row per job, in
  `enqueued_at` order (oldest first), reading `id`, `product_name`,
  `status`, and `attempt_count` straight from `queue.json` — this is the
  minimal 4-field default schema (AXI rule 2); do not add extra columns
  here.
- For every job whose `status` is `blocked`, immediately after that job's
  row, print its full, untruncated `blocked_reason` and `blocked_at`:

```
  blocked_reason: <full text, not truncated>
  blocked_at: <full ISO timestamp>
```

  `blocked_reason`/`blocked_at` are short, human-authored summary strings
  by construction (per the spec's Data classification note — never a raw
  process dump), so printing them in full here is intentional and does not
  conflict with AXI rule 3's content-truncation guidance, which is about
  bulk content, not this small operator-actionable payload.
- End the output with a `help[]` line naming the recovery path for a
  blocked job, whether or not one is currently present (contextual
  disclosure, AXI rule 9). Always print the literal, parameterized
  template line below verbatim — this is the line acceptance criteria
  check for, so it must appear exactly as written even when a blocked job
  is present, not be substituted away:

```
help[]:
  /squad-requeue <id> — reset a blocked job to queued and clear its attempt count
```

  When at least one job is currently `blocked`, additionally print one
  concrete-id convenience line per blocked job right after the template
  line, e.g. `/squad-requeue job-20260923T140500Z-ead-content-agents`
  — in addition to the literal template line above, never instead of it.
</content>
