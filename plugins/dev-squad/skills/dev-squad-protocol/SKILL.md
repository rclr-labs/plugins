---
name: dev-squad-protocol
description: Use when running a product/feature through the dev-squad pipeline (after /squad-new or /squad-advance) — defines the Plan-Design-Build-Test-Deploy-Maintain stage sequence, artifact locations, gate modes, and which agent or workflow to invoke at each stage.
---

# Dev Squad Protocol

This is the protocol the orchestrating session follows when running
`/squad-new` or `/squad-advance`. It implements the AI-native SDLC playbook
stages: Plan → Design → Build → Test → Deploy → Maintain.

## State

All state lives in `.squad/squad.config.json` at the target repo's root:

```json
{
  "product": "<slug>",
  "stage": "plan",
  "gate_mode": "full",
  "max_parallel_devs": 4,
  "pending_gate": null
}
```

`stage` is one of `plan`, `design`, `build`, `test`, `deploy`, `maintain`,
`done`. `gate_mode` is `full` or `critical-only` (see below).
`max_parallel_devs` caps how many Dev/QA pairs the `squad-build` workflow
runs concurrently. `pending_gate` is set/cleared by `/squad-advance`: it
holds a `{description, since}` object describing what a paused gate is
waiting on, or `null` when nothing is pending.

### Per-task tracking

`squad-build` also maintains one `.squad/tasks/<id>.json` file per task
from `.squad/plan.md`:

```json
{
  "id": "T2",
  "title": "...",
  "status": "pending",
  "acceptance_criteria": "...",
  "depends_on": [],
  "dev": null,
  "qa": null
}
```

`status` is `pending` (written when the plan is broken down, before any Dev
starts), `done` (QA passed), `qa_failed`, or `dev_failed`. `dev`/`qa` are
`null` until each stage finishes, then hold the Dev's summary/branch/
commit/worktree_path and the QA verdict/findings respectively. This exists
because the workflow's own return value (`results`/`allPassed`/
`failedTasks`) only exists in memory for the duration of one Workflow
invocation — if the session or machine dies mid-Build (crashed OS, killed
process), that in-memory state is gone even though each Dev's git commits
survive. `.squad/tasks/` is the durable record: `/squad-status` reads it to
show real per-task progress, and a Dev/QA pair recovering from a crash
should trust it over re-deriving status from `git log`/worktree diffing.
One file per task (not one shared file) is deliberate — tasks in the same
batch run concurrently, and multiple agents read-modify-writing a single
JSON file would race.

## Stage sequence

1. **plan** — Interactive. Use `superpowers:brainstorming` with the human to
   produce `.squad/intent.md`. Do not advance until the human explicitly
   accepts it (or delegate acceptance to the `product-owner` agent, then
   confirm with the human).
2. **design** — Invoke the `product-owner` agent to draft `.squad/spec.md`
   from the accepted intent. If it lists open questions, invoke the
   `tech-lead` agent to answer them before re-offering the spec. Human
   approves `.squad/spec.md` before advancing — this gate is never skipped,
   in either gate mode.
3. **build** — Run the `squad-build` workflow
   (`${CLAUDE_PLUGIN_ROOT}/scripts/workflows/build.js`) via the Workflow
   tool. It breaks `.squad/spec.md` into `.squad/plan.md` (each task
   carrying a `depends_on` list) and runs Dev→QA in a pipeline, one pair
   per task. Tasks are grouped into dependency waves — a task only starts
   once every id in its own `depends_on` has finished an earlier wave —
   and each wave is merged into a build-time `integration_branch` (tracked
   in `.squad/squad.config.json`) before the next wave's worktrees are cut,
   so a dependent task's worktree actually contains its prerequisite's
   code. Within a wave, tasks still run `max_parallel_devs` at a time.
   QA in this stage runs tests scoped to each task's diff, not the full
   suite (see `agents/qa-engineer.md`) — the full suite runs once, later,
   in `squad-deploy-review`. Workflow scripts cannot read files
   themselves, so the orchestrating session must read `max_parallel_devs`
   from `.squad/squad.config.json` and pass it to the workflow via
   `args: {maxParallelDevs: <value>}` when invoking `squad-build`.
4. **test** — Folded into the `squad-build` workflow's pipeline (QA runs
   immediately after each Dev). Nothing separate to invoke here — this
   stage exists in the state machine for gate-mode purposes only.
5. **deploy** — these steps run in this exact order:
   1. Run the `squad-deploy-review` workflow
      (`${CLAUDE_PLUGIN_ROOT}/scripts/workflows/deploy-review.js`) with
      `args: {ref: "<branch name or commit SHA>"}` — it must be something
      `git checkout` accepts directly, since the workflow's full-suite step
      checks it out; resolve a PR number to its head branch/SHA before
      calling this workflow. This is also where the full project test
      suite runs, once, unconditionally, against the merged diff — a
      failure here blocks the deploy exactly like a security finding does.
   2. Invoke the `release-manager` agent with that workflow's
      `confirmed`/`blocksDeploy`/`suite` result — this authorizes (or
      blocks) the **merge**. A failing `suite` blocks the same as a
      confirmed security finding, but is never eligible for the human
      security-exception path (see `agents/release-manager.md`). Only
      merge if authorized.
   3. Commit and push, per the user's global commit → push → deploy rule.
   4. If this deploy targets **production**: invoke the `security-preprod`
      agent now (after push, before any deploy command), then invoke
      `release-manager` a second time — this time to authorize the
      **deploy command itself** — passing it `security-preprod`'s
      findings. This is a distinct decision from step 2's merge
      authorization; `agents/release-manager.md`'s own two sections
      ("before authorizing a merge" / "before authorizing a production
      deploy") map directly to these two invocations.
   5. Only after the relevant `release-manager` authorization for this
      step does the next irreversible action (merge, or the deploy
      command) proceed.
6. **maintain** — Human-triggered: when the human pastes logs/metrics/an
   alert, invoke the `monitor` agent. Its output is a new `.squad/intent.md`
   — advancing back to `plan` re-enters this same sequence.

## Gate modes

- **`full`**: pause for explicit human approval after every stage above
  (intent, spec, the build+test workflow's result, the deploy-review
  workflow's result, and the deploy authorization itself).
- **`critical-only`**: pause only before `build` (spec approval) and before
  a production deploy. Every other transition proceeds automatically once
  its stage's own internal steps report success.

Regardless of gate mode: never skip the `security-preprod` agent before a
production deploy, never let the `release-manager` agent authorize a
production deploy with a security finding that is neither fixed nor logged
as an explicitly-authorized exception in `.squad/maintain/security-exceptions.md`
for this cycle (see `agents/release-manager.md` for how that log is
written), and never advance past `design` with an incomplete Security
section in `spec.md`.

## AXI compliance

Whenever a stage produces or touches a CLI surface — the product's own CLI,
or an internal squad tool like `/squad-status` — apply these AXI
(https://axi.md/) principles directly; they're inlined here so this plugin
has no dependency on any particular machine's configuration:

**Efficiency**
1. Token-efficient output — compact, TOON-style list/table output instead of JSON.
2. Minimal default schemas — 3-4 fields per list item by default.
3. Content truncation — truncate large text with a size hint and a `--full` escape hatch.

**Robustness**
4. Pre-computed aggregates — include derived fields (totals, pass/fail counts) to avoid round trips.
5. Definitive empty states — explicit "0 results" messaging, never ambiguous blank output.
6. Structured errors & exit codes — no interactive prompts; exit 0 success, 1 error, 2 unknown flags.

**Discoverability**
7. Ambient context — surface relevant state upfront where possible.
8. Content first — a no-argument invocation shows live data, not help text.
9. Contextual disclosure — suggest next steps as parameterized command templates.
10. Consistent help — concise `--help` per subcommand.
