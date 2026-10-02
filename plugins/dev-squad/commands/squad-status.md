---
description: Show a compact, AXI-style status of the active product — current stage, artifacts present, and any pending gate.
---

Read `.squad/squad.config.json` (if missing, report that plainly and
suggest `/squad-new` — do not error out with a stack trace).

Print output in this compact form, not prose, not JSON:

```
squad status: product=<product>, stage=<stage>, gate_mode=<gate_mode>
artifacts[N]{name,present}:
  intent.md,<yes|no>
  spec.md,<yes|no>
  plan.md,<yes|no>
pending_gate: <none | description of what's waiting on human approval>
```

Read `pending_gate` directly from `.squad/squad.config.json` rather than
inferring it — print its `description` field on the `pending_gate:` line,
or `none` if `pending_gate` is `null`.

If `.squad/tasks/*.json` exists (written by the `squad-build` workflow —
see the `dev-squad-protocol` skill's "Per-task tracking" section), read
every file in it and print a tasks section after `pending_gate:`:

```
tasks[N]{id,status}:
  T1,done
  T2,done
  T3,pending
```

One line per file, `id`/`status` straight from the JSON, in task-number
order. If `.squad/tasks/` doesn't exist (Build hasn't run since this
feature landed, or hasn't started yet), omit the tasks section entirely —
don't print an empty or fabricated one. If `stage` is `build` or later and
a task's `status` is still `pending`, don't just report it as "not
started": cross-check for a matching git worktree/branch (`git worktree
list`, `git log main..<branch> --oneline`) before saying so — the file may
predate a crash that happened after the Dev committed but before
`recordStatus` ran.

If a stage is currently blocked (e.g. Release Manager blocked a deploy, or
a gate is waiting on approval), say exactly what's blocking it and what
input would unblock it — never just "blocked."
