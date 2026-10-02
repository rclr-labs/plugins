export const meta = {
  name: 'squad-build',
  description: 'Tech Lead breaks the spec into tasks; each task is implemented by a Dev and verified by QA in a pipeline',
  phases: [
    { title: 'Plan tasks', detail: 'Tech Lead breaks .squad/spec.md into .squad/plan.md' },
    { title: 'Build', detail: 'one Dev per task, in parallel' },
    { title: 'Test', detail: 'QA verifies each task right after its Dev finishes' },
  ],
}

const BREAKDOWN_SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          acceptance_criteria: { type: 'string' },
          depends_on: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'title', 'description', 'acceptance_criteria', 'depends_on'],
      },
    },
  },
  required: ['tasks'],
}

const DEV_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    task_id: { type: 'string' },
    summary: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    branch: { type: 'string' },
    commit: { type: 'string' },
    worktree_path: { type: 'string' },
  },
  required: ['task_id', 'summary', 'files_changed', 'branch', 'worktree_path'],
}

const INTEGRATION_SCHEMA = {
  type: 'object',
  properties: {
    branch: { type: 'string' },
  },
  required: ['branch'],
}

const MERGE_SCHEMA = {
  type: 'object',
  properties: {
    merged: { type: 'array', items: { type: 'string' } },
    conflict: { type: ['string', 'null'] },
  },
  required: ['merged', 'conflict'],
}

// Orders tasks into dependency waves (topological batches): a task enters a
// wave only once every id in its own depends_on has already been placed in
// an earlier wave. Each wave is still chunked by maxParallelDevs below, so
// this only adds ordering where a real dependency exists — independent
// tasks still run in the same wave together, same as before.
function buildWaves(tasks) {
  const placed = new Set()
  const remaining = [...tasks]
  const waves = []
  while (remaining.length > 0) {
    const ready = remaining.filter((t) => (t.depends_on ?? []).every((d) => placed.has(d) || !tasks.some((x) => x.id === d)))
    // A missing `ready` batch means a dependency cycle (or a depends_on id
    // that never resolves) — take everything left as one final wave rather
    // than looping forever; the Devs' own conflict-reporting rule catches
    // the fallout if this is a real cycle.
    const wave = ready.length > 0 ? ready : remaining
    waves.push(wave)
    wave.forEach((t) => placed.add(t.id))
    for (const t of wave) {
      const idx = remaining.indexOf(t)
      remaining.splice(idx, 1)
    }
  }
  return waves
}

const QA_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    task_id: { type: 'string' },
    pass: { type: 'boolean' },
    findings: { type: 'array', items: { type: 'string' } },
  },
  required: ['task_id', 'pass', 'findings'],
}

// Read at "Plan tasks" time, before deciding whether to re-derive the plan at
// all — a resumed invocation (after a worker crash/retry) must not re-invoke
// the Tech Lead or reset any task back to "pending"; it reconstructs
// breakdown.tasks straight from the existing .squad/tasks/*.json ledger
// instead. `dev`/`qa` mirror recordStatus's own written shape so a prior
// terminal task's result can be carried forward without re-running its
// pipeline (see the wave loop below).
const RESUME_CHECK_SCHEMA = {
  type: 'object',
  properties: {
    resumed: { type: 'boolean' },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
          description: { type: 'string' },
          acceptance_criteria: { type: 'string' },
          depends_on: { type: 'array', items: { type: 'string' } },
          dev: {
            type: ['object', 'null'],
            properties: {
              summary: { type: 'string' },
              branch: { type: ['string', 'null'] },
              commit: { type: ['string', 'null'] },
              worktree_path: { type: ['string', 'null'] },
              files_changed: { type: 'array', items: { type: 'string' } },
            },
          },
          qa: {
            type: ['object', 'null'],
            properties: {
              pass: { type: 'boolean' },
              findings: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        required: ['id', 'title', 'status', 'acceptance_criteria', 'depends_on'],
      },
    },
  },
  required: ['resumed', 'tasks'],
}

phase('Plan tasks')
const resumeCheck = await agent(
  'Check whether .squad/plan.md exists AND at least one file matching .squad/tasks/*.json exists in the current repo. If neither exists (this is a fresh Build, no prior attempt), return exactly {"resumed": false, "tasks": []} and do not read or write anything else — do not create either file. If both exist, this is a resume after a prior attempt: read every .squad/tasks/<id>.json file exactly as currently written on disk, without modifying any of them, and return {"resumed": true, "tasks": [...]} where each entry mirrors that file\'s JSON content: id, title, status, description (older task files may predate this field — if absent, fall back to that file\'s acceptance_criteria value so nothing downstream ever needs a literal "undefined"), acceptance_criteria, depends_on, dev (the file\'s recorded dev object verbatim if present, else null), qa (the file\'s recorded qa object verbatim if present, else null). Do not re-derive, rewrite, or touch .squad/plan.md or any .squad/tasks/*.json file in this step — this is a read-only reconnaissance step.',
  { agentType: 'dev-squad:recorder', phase: 'Plan tasks', label: 'resume:check', schema: RESUME_CHECK_SCHEMA }
)

// Keyed by task id, holds each task's prior recorded state (status/dev/qa)
// when resuming, so the wave loop below can skip already-terminal tasks and
// the worktree-pruning step can find a still-pending task's leftover
// worktree_path. Empty (no entries) on a fresh, non-resumed Build.
const priorRecords = new Map()

let breakdown
if (resumeCheck.resumed && resumeCheck.tasks.length > 0) {
  for (const t of resumeCheck.tasks) priorRecords.set(t.id, t)
  breakdown = {
    tasks: resumeCheck.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || t.acceptance_criteria || '',
      acceptance_criteria: t.acceptance_criteria,
      depends_on: t.depends_on ?? [],
    })),
  }
} else {
  breakdown = await agent(
    'Read .squad/spec.md and .squad/intent.md in the current repo. Break the spec into independent, isolated implementation tasks suitable for parallel execution by separate engineers. For each task, name depends_on: the ids of other tasks that must be merged first (empty array if truly independent) — be conservative, only real dependencies, since each one serializes part of the Build stage. Write the full breakdown as .squad/plan.md (markdown, one ## section per task, including its depends_on) before returning. Also write one .squad/tasks/<id>.json per task (create .squad/tasks/ first if missing), each containing exactly {"id": "<id>", "title": "<title>", "status": "pending", "description": "<description>", "acceptance_criteria": "<acceptance_criteria>", "depends_on": [<ids>]} — this is the durable per-task progress ledger the Build stage updates as each task finishes, so a crash mid-Build (or between sessions) can be recovered from without re-deriving the plan from git history. Return the same breakdown as structured data: an id, title, description, acceptance_criteria, and depends_on per task.',
    { agentType: 'dev-squad:tech-lead', phase: 'Plan tasks', schema: BREAKDOWN_SCHEMA }
  )
}

// Build-time integration branch: tasks in a later wave that depend on an
// earlier wave's tasks need those tasks' code actually present when their
// own worktree is cut, not just "done" in memory. Without this, a Dev
// worktree branched from main/default never sees an earlier wave's merged
// work — the exact failure hit in practice (a dependent task's worktree cut
// from main, missing its prerequisites, correctly refused by the Dev, and
// redone by hand outside the pipeline). ensureIntegrationBranch checks the
// branch out once up front so wave 1's worktrees already branch from it.
async function ensureIntegrationBranch() {
  const result = await agent(
    'Read .squad/squad.config.json. If it already has a non-null "integration_branch": if that branch is already checked out at the repo root (e.g. left over from a prior attempt that crashed), that is fine — do not treat it as an error, just confirm it and continue. If it does not exist yet, create it from the current default branch and check it out at the repo root. If `git worktree list` shows it already checked out in a DIFFERENT worktree (not the repo root) — a leftover from a prior crashed attempt — run `git worktree remove --force` on that leftover worktree first, then check the branch out at the repo root as normal; do not error out and do not attempt a second simultaneous checkout of the same branch. Otherwise (no "integration_branch" recorded yet) derive a name from the "product" field as "<product>-integration", create it from the current default branch, check it out, and write it back into .squad/squad.config.json as "integration_branch". Report the branch name.',
    { phase: 'Build', label: 'integration:setup', schema: INTEGRATION_SCHEMA }
  )
  integrationBranchName = result.branch
  return result
}

// On resume, a task still recorded "pending" (its Dev started before a prior
// crash but never reached recordStatus) can nonetheless already name a
// worktree_path from that pre-crash attempt. That worktree/branch is still
// checked out, so buildTask's fresh worktree cut for the same task would hit
// "second checkout of the same branch will fail". Prune those leftovers
// before dispatching anything. Terminal tasks (done/qa_failed/dev_failed)
// are deliberately left untouched — they are never re-dispatched, so there
// is nothing for their worktree to collide with.
async function pruneLeftoverWorktrees(tasks) {
  const leftovers = tasks
    .map((task) => {
      const prior = priorRecords.get(task.id)
      const worktreePath = prior && prior.status === 'pending' ? prior.dev?.worktree_path : null
      return worktreePath ? { id: task.id, worktreePath } : null
    })
    .filter(Boolean)
  if (leftovers.length === 0) return
  await agent(
    `Run \`git worktree list\` at the repo root. These worktree paths were recorded by a pre-crash Dev attempt for tasks that will be re-dispatched from scratch: ${leftovers.map((l) => `${l.worktreePath} (task ${l.id})`).join(', ')}. For each one, only if it currently appears in \`git worktree list\`, remove it with \`git worktree remove --force <path>\` so a fresh worktree can be cut on the same branch — silently skip any path that is not currently registered (it may already be gone). Do not touch any other worktree. Report back only the single word "pruned" once done.`,
    { agentType: 'dev-squad:recorder', phase: 'Build', label: 'worktrees:prune' }
  )
}

// Runs after each wave: merges every task that passed QA in that wave into
// the integration branch before the next wave's worktrees are cut, so
// dependent tasks actually build on top of their prerequisites. Tasks that
// failed QA are deliberately left unmerged — merging them would carry a
// known-broken change into every later wave's base.
async function integrateWave(waveResults) {
  const branches = waveResults
    .filter((r) => r?.qaResult?.pass && r?.devResult?.branch)
    .map((r) => r.devResult.branch)
  if (branches.length === 0) return { merged: [], conflict: null }
  return agent(
    `Check out the branch recorded in .squad/squad.config.json as "integration_branch" at the repo root, then merge these task branches into it one at a time, in this order, each as a real merge commit (no history rewriting): ${branches.join(', ')}. If a merge conflicts, stop immediately and report exactly which branch conflicted and why — do not attempt to resolve it yourself. Report the branches actually merged and the conflicting branch name (or null if none).`,
    { phase: 'Build', label: 'integration:merge', schema: MERGE_SCHEMA }
  )
}

// Set once ensureIntegrationBranch resolves, below — buildTask closes over
// it rather than receiving it as a pipeline argument (pipeline stages only
// get (prevResult, originalItem, index), not extra context).
let integrationBranchName = null

async function buildTask(task) {
  const dependsClause = (task.depends_on ?? []).length > 0
    ? ` This task depends on ${task.depends_on.join(', ')}, which were merged into the "${integrationBranchName}" branch in an earlier wave. Do not assume your worktree was cut from that branch — explicitly run \`git fetch\` if needed and merge origin/${integrationBranchName} or ${integrationBranchName} into your current branch FIRST, before implementing, so their code is actually present. Stop and report if that merge conflicts.`
    : ''
  return agent(
    `Implement task ${task.id}: ${task.title}\n\n${task.description}\n\nAcceptance criteria: ${task.acceptance_criteria}\n\nRead .squad/spec.md for full context. Implement only this task.${dependsClause} Commit your work with a descriptive message naming the task id when the acceptance criteria are met. Report your branch name, commit hash, and the absolute path of your current worktree (obtained via \`pwd\`) as worktree_path.`,
    { agentType: 'dev-squad:dev', phase: 'Build', label: `dev:${task.id}`, isolation: 'worktree', schema: DEV_RESULT_SCHEMA }
  ).then((devResult) => ({ devResult, task }))
}

// Stage 1 carries the task forward in its own result rather than relying on
// pipeline handing the original item to stage 2 as a second argument — QA has
// no way to verify acceptance criteria it wasn't given.
async function testTask({ devResult, task }) {
  return agent(
    `Verify task ${task.id}: ${task.title} against its acceptance criteria: ${task.acceptance_criteria}\n\nThe dev reported: ${JSON.stringify(devResult)}\n\nThe dev's worktree is at the absolute path reported in their result as \`worktree_path\` — cd into that directory directly to review and test the code in place. Do not check out the branch anywhere else; it is very likely already checked out in that worktree, and a second checkout of the same branch will fail. Report pass/fail and findings.`,
    { agentType: 'dev-squad:qa-engineer', phase: 'Test', label: `qa:${task.id}`, schema: QA_RESULT_SCHEMA }
  ).then((qaResult) => ({ task, devResult, qaResult }))
}

// Records final per-task status to .squad/tasks/<id>.json (one file per
// task, so concurrent tasks in the same batch never race on a shared file).
// Uses the single-purpose recorder agent rather than the QA agent —
// qa-engineer deliberately has no Write tool (it's a read-only verifier) —
// and runs unisolated (no isolation: 'worktree'), so its cwd is the same
// repo root buildTask's Dev worktrees branch off of, not a worktree of its own.
async function recordStatus({ task, devResult, qaResult }) {
  const status = qaResult ? (qaResult.pass ? 'done' : 'qa_failed') : 'dev_failed'
  const record = {
    id: task.id,
    title: task.title,
    status,
    description: task.description ?? '',
    acceptance_criteria: task.acceptance_criteria,
    depends_on: task.depends_on ?? [],
    dev: devResult ? {
      summary: devResult.summary,
      branch: devResult.branch ?? null,
      commit: devResult.commit ?? null,
      worktree_path: devResult.worktree_path,
      files_changed: devResult.files_changed,
    } : null,
    qa: qaResult ? { pass: qaResult.pass, findings: qaResult.findings } : null,
  }
  await agent(
    `Write the file .squad/tasks/${task.id}.json, relative to your current working directory (create the .squad/tasks/ directory first if it doesn't exist), with exactly this JSON content pretty-printed at 2-space indentation — do not alter any field or add others:\n\n${JSON.stringify(record, null, 2)}\n\nReport back only the single word "written" once done.`,
    { agentType: 'dev-squad:recorder', phase: 'Test', label: `record:${task.id}` }
  )
  return { task, devResult, qaResult }
}

// `args` may arrive already parsed or as a JSON string, so normalize it the
// same way deploy-review.js does — reading `.maxParallelDevs` off a raw string
// silently yields undefined and falls back to the default, ignoring the value
// the protocol skill told the orchestrating session to pass.
const rawArgs = args
let parsedArgs = rawArgs
if (typeof rawArgs === 'string') {
  try {
    parsedArgs = JSON.parse(rawArgs)
  } catch {
    parsedArgs = null
  }
}
const requestedParallelDevs = Number(parsedArgs?.maxParallelDevs)
const maxParallelDevs = Number.isFinite(requestedParallelDevs) && requestedParallelDevs > 0
  ? Math.floor(requestedParallelDevs)
  : 4
await ensureIntegrationBranch()
const waves = buildWaves(breakdown.tasks)
await pruneLeftoverWorktrees(breakdown.tasks)
const TERMINAL_STATUSES = new Set(['done', 'qa_failed', 'dev_failed'])
const results = []
for (const wave of waves) {
  const waveResults = []
  for (let i = 0; i < wave.length; i += maxParallelDevs) {
    const batch = wave.slice(i, i + maxParallelDevs)
    // On resume, any task already terminal (done/qa_failed/dev_failed) from
    // a prior attempt is carried forward as-is — never re-dispatched to a
    // fresh Dev/QA pair, and recordStatus is never called for it again (so
    // its .squad/tasks/<id>.json stays byte-for-byte unchanged). Only
    // still-pending tasks go through the real pipeline.
    const carried = []
    const pending = []
    for (const task of batch) {
      const prior = priorRecords.get(task.id)
      if (prior && TERMINAL_STATUSES.has(prior.status)) {
        carried.push({
          task,
          devResult: prior.dev ? {
            task_id: task.id,
            summary: prior.dev.summary,
            files_changed: prior.dev.files_changed ?? [],
            branch: prior.dev.branch ?? null,
            commit: prior.dev.commit ?? null,
            worktree_path: prior.dev.worktree_path ?? null,
          } : null,
          qaResult: prior.qa ? { task_id: task.id, pass: prior.qa.pass, findings: prior.qa.findings ?? [] } : null,
        })
      } else {
        pending.push(task)
      }
    }
    const batchResults = pending.length > 0 ? await pipeline(pending, buildTask, testTask, recordStatus) : []
    waveResults.push(...carried, ...batchResults)
  }
  // Integrate the whole wave (not just the last chunk) before the next
  // wave starts, so every chunk's merged work is visible to any later
  // wave's tasks that depend on it. Collected in its own array rather than
  // sliced off the tail of `results` — pipeline() can drop an item to null
  // on a stage throw, so `results.length` isn't guaranteed to grow by
  // exactly `wave.length` per wave.
  await integrateWave(waveResults)
  results.push(...waveResults)
}

const allPassed = results.every((r) => r?.qaResult?.pass === true)
const failedTasks = results.filter((r) => r?.qaResult?.pass !== true).map((r) => r?.task?.id)

return { breakdown, results, allPassed, failedTasks }
