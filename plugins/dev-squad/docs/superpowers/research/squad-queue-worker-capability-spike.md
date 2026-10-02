# squad-queue-worker — Scheduled-cloud-agent-equivalent capability spike (T1)

Date: 2026-09-24
Run from: a Build-stage Dev subagent (this task, T1), worktree
`/tmp/squad-queue-worker-worktrees/task-t1` (branch `task-t1`, from
`origin/main` @ `cddd1b4`).

## Purpose

Per `.squad/spec.md`'s Security section (lines 504-543), the whole
`squad-queue-worker` product rests on an unverified premise: that a
`CronCreate` scheduled session has the same Bash/filesystem/git access as an
interactive session — specifically the ability to (1) `cd` into arbitrary
allowed repo paths and run git commands, (2) invoke
`~/.claude/hooks/check-memory-pressure.sh`, and (3) call the same
Workflow-tool primitives (`agent()`, `pipeline()`, `phase()`) that the
`squad-build` workflow itself calls. This task does not run inside a real
`CronCreate` scheduled session (this harness has no such session type
available to it); it instead spikes the **closest achievable stand-in** —
a Build-stage Dev subagent — and reports what that stand-in can and cannot
do, so the gap between "Dev subagent capability" and "what a scheduled
session would need" is explicit.

## (a) cd / git / agent() availability

**cd + git: CONFIRMED as plain Bash calls.**

```
$ cd /tmp/squad-queue-worker-worktrees/task-t1 && pwd
/tmp/squad-queue-worker-worktrees/task-t1
$ git log -1 --oneline
cddd1b4 squad: accepted spec, advance squad-queue-worker to build
$ git status --short
(clean)
```

`cd`-ing into an arbitrary allowed-root-shaped path (a worktree under
`/tmp/squad-queue-worker-worktrees/`, outside this repo's own default
working directory) and running `git log`/`git status` both worked as
ordinary `Bash` tool calls, no elevated permission prompt, no sandbox
denial. This confirms the filesystem/git portion of the premise for the
capability level this Dev subagent actually has.

**agent(): UNCONFIRMED — not available to this invocation.**

This Dev subagent's actual tool list (as dispatched) is: `Read`, `Write`,
`Edit`, `Bash`, `StructuredOutput`, `advisor`. There is no `agent()`,
`pipeline()`, or `phase()` callable in this context, and no generic
"Workflow" or "Task"/"Agent" tool either — this session's own instructions
explicitly say "NEVER use the TaskCreate or Agent tools." Grepping
`dev-squad/scripts/workflows/build.js` in this worktree confirms
`phase()`, `agent()`, and `pipeline()` are called there (e.g. `build.js:98,
99, 113, 131, 146, 156, 185, 216`), but that file is a *workflow script*
run by the Workflow tool at the orchestrator level (the session that calls
`squad-build`), not by a Dev subagent spawned inside it. A Dev subagent
(this task's own execution context) is a leaf of that orchestration, not a
peer with access to the same primitives — it receives a task description
and reports a structured result back; it does not itself get to call
`agent()` to spawn further subagents or `pipeline()`/`phase()` to
orchestrate.

So: for the specific invocation type actually tested (Build-stage Dev
subagent), leg (a)'s cd/git half is CONFIRMED and its `agent()`/Workflow-
primitive half is UNCONFIRMED. Whether a `CronCreate` scheduled session
gets a different, richer tool list that *does* include Workflow-tool
primitives is exactly the question this spike cannot answer — no
`CronCreate` session was available to run inside for this spike. That gap
is the actual finding, not a procedural miss: the premise "the scheduled
session must ... have access to the Workflow-tool primitives ... the
`squad-build` workflow itself calls" cannot be verified true from a Dev
subagent, because a Dev subagent by design is not the primitive-calling
layer.

## (b) check-memory-pressure.sh literal stdout

Script: `~/.claude/hooks/check-memory-pressure.sh` (present,
executable, `-rwxr-xr-x`, 2504 bytes).

Current kernel-reported pressure level at time of run:

```
$ sysctl -n kern.memorystatus_vm_pressure_level
1
```

Running the hook directly (no stdin, as a plain Bash invocation — not
through the `PreToolUse` hook machinery itself):

```
$ ~/.claude/hooks/check-memory-pressure.sh
$ echo $?
0
```

Literal stdout: **empty (zero bytes)**. Exit code: **0**.

This is the correct, documented shape for the current pressure level, not
a broken invocation. Per the script's own source (read as part of this
spike): it only emits a `jq`-built JSON `hookSpecificOutput` block on
stdout when `kern.memorystatus_vm_pressure_level >= 2` (`ask` at level 2,
`deny` at level >= 4); at the observed level 1 ("normal"), it falls
through both `if` branches and exits 0 with nothing printed. So "no
output, exit 0" is itself the literal, correct stdout shape to record for
a normal-pressure host — a would-be worker parsing this script's output
must treat empty-stdout+exit-0 as "no restriction," not as an error.

## (c) Verdict

**UNCONFIRMED.**

- cd/git as plain Bash calls from within an allowed-root-shaped path:
  confirmed working, at the Dev-subagent capability level tested.
- `check-memory-pressure.sh` invocation and literal output shape: captured
  and understood (empty stdout / exit 0 at normal pressure).
- Workflow-tool primitives (`agent()`, `pipeline()`, `phase()`) being the
  *same* ones `squad-build` calls, available to the tested invocation:
  **not confirmed** — this Dev subagent's own tool list has none of them,
  and by design (leaf worker vs. orchestrator) is not expected to. No
  `CronCreate` scheduled session was available to this spike to test the
  actual target invocation type directly.

Per the spec's own instruction ("If it fails, Build stops and this spec
returns to Design with whatever constraint the failure revealed"), this
result means: **Build should halt for `squad-queue-worker` and the product
should return to Design.** The concrete constraint this spike surfaces for
Design to react to: verify Workflow-tool primitive availability from
*inside an actual `CronCreate` scheduled session* (not a Build-stage Dev
subagent, which structurally cannot call them) before finalizing the
dispatch mechanism — if a `CronCreate` session turns out to be leaf-only
the same way a Dev subagent is, the dispatch design in this spec (having
the scheduled session directly call `agent()`/`pipeline()`/`phase()` to
run `squad-build` itself) does not hold, and a different, non-Workflow-
tool dispatch mechanism (e.g. the scheduled session shelling out to
whatever CLI/script `squad-advance` itself invokes, if one exists outside
the Workflow tool) needs to be designed instead.
