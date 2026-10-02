#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
file="$root/scripts/workflows/build.js"
[[ -f "$file" ]] || { echo "FAIL: $file does not exist" >&2; exit 1; }

work="$(cd "$(mktemp -d)" && pwd -P)"
trap 'rm -rf "$work"' EXIT

# ---- Fixture "product repo" -------------------------------------------
# A real git repo (not this dev-squad repo) so the leftover-worktree prune
# (scenario 10) exercises real `git worktree` commands, not a simulation.
repo="$work/product-repo"
mkdir -p "$repo"
git -C "$repo" init -q -b main
git -C "$repo" config user.email test@example.com
git -C "$repo" config user.name "Test"
echo "root" > "$repo/README.md"
git -C "$repo" add README.md
git -C "$repo" commit -q -m "root commit"

# Pre-crash branch + leftover worktree for the still-pending task (task-c).
git -C "$repo" branch task-c-branch
leftover="$work/leftover-worktree"
git -C "$repo" worktree add -q "$leftover" task-c-branch

mkdir -p "$repo/.squad/tasks"
echo "# plan" > "$repo/.squad/plan.md"

cat > "$repo/.squad/tasks/task-a.json" <<'EOF'
{
  "id": "task-a",
  "title": "Task A",
  "status": "done",
  "description": "Do A",
  "acceptance_criteria": "A works",
  "depends_on": [],
  "dev": {
    "summary": "did A",
    "branch": "task-a-branch",
    "commit": "aaaaaaa",
    "worktree_path": "/nonexistent/task-a-worktree",
    "files_changed": ["a.js"]
  },
  "qa": { "pass": true, "findings": [] }
}
EOF

cat > "$repo/.squad/tasks/task-b.json" <<'EOF'
{
  "id": "task-b",
  "title": "Task B",
  "status": "done",
  "description": "Do B",
  "acceptance_criteria": "B works",
  "depends_on": [],
  "dev": {
    "summary": "did B",
    "branch": "task-b-branch",
    "commit": "bbbbbbb",
    "worktree_path": "/nonexistent/task-b-worktree",
    "files_changed": ["b.js"]
  },
  "qa": { "pass": true, "findings": [] }
}
EOF

# task-c: still pending, no "description" field (simulates a task JSON
# written before this fix), AND already names a pre-crash worktree_path —
# this is scenario 10's setup.
cat > "$repo/.squad/tasks/task-c.json" <<EOF
{
  "id": "task-c",
  "title": "Task C",
  "status": "pending",
  "acceptance_criteria": "C works",
  "depends_on": [],
  "dev": {
    "worktree_path": "$leftover",
    "branch": "task-c-branch"
  }
}
EOF

sha_a_before="$(shasum -a 256 "$repo/.squad/tasks/task-a.json" | awk '{print $1}')"
sha_b_before="$(shasum -a 256 "$repo/.squad/tasks/task-b.json" | awk '{print $1}')"

# ---- Wrap build.js with injected fakes ---------------------------------
harness="$work/harness.mjs"
{
  cat <<'HARNESS_HEAD'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const repo = process.env.FIXTURE_REPO
const calls = []
let undefinedLeak = false

function checkUndefined(label, text) {
  if (typeof text === 'string' && /\bundefined\b/.test(text)) {
    undefinedLeak = true
    console.error(`UNDEFINED LEAK in ${label}: ${text}`)
  }
}

async function phase(name) {
  calls.push({ kind: 'phase', name })
}

async function pipeline(items, ...stages) {
  return Promise.all(items.map(async (item) => {
    let result = item
    for (const stage of stages) {
      result = await stage(result)
    }
    return result
  }))
}

async function agent(prompt, opts = {}) {
  const label = opts.label || opts.phase || 'unlabeled'
  // Only the re-dispatched task's own build/test prompt is what the
  // acceptance criterion cares about (a literal "undefined" standing in for
  // task.description) — other prompts legitimately discuss the word
  // "undefined" in English prose (e.g. the resume:check prompt's own
  // instructions), which is not the bug being guarded against.
  if (label.startsWith('dev:') || label.startsWith('qa:')) {
    checkUndefined(label, prompt)
  }
  calls.push({ kind: 'agent', label, agentType: opts.agentType || null, prompt })

  if (label === 'resume:check') {
    const tasksDir = path.join(repo, '.squad', 'tasks')
    const fs = await import('node:fs')
    const files = fs.readdirSync(tasksDir).filter((f) => f.endsWith('.json'))
    const tasks = files.map((f) => JSON.parse(readFileSync(path.join(tasksDir, f), 'utf8')))
    return { resumed: true, tasks }
  }
  if (label === 'integration:setup') {
    return { branch: 'product-integration' }
  }
  if (label === 'worktrees:prune') {
    // Real prune: parse the leftover worktree path(s) named in the prompt
    // and actually remove them via git, so the later real `git worktree
    // add` for the same branch (in the dev: handler below) only succeeds
    // if this step actually worked.
    const list = execFileSync('git', ['-C', repo, 'worktree', 'list', '--porcelain'], { encoding: 'utf8' })
    const registered = [...list.matchAll(/^worktree (.+)$/gm)].map((m) => m[1])
    // Coupled to this fixture's directory name ("leftover-worktree") — if
    // that name changes, this silently matches nothing and the test fails
    // downstream at the `git worktree add` step instead of here.
    const pathMatches = [...prompt.matchAll(/(\/\S+leftover-worktree)/g)].map((m) => m[1])
    for (const p of pathMatches) {
      if (registered.includes(p)) {
        execFileSync('git', ['-C', repo, 'worktree', 'remove', '--force', p])
      }
    }
    return null
  }
  if (label.startsWith('dev:')) {
    const taskId = label.slice('dev:'.length)
    if (taskId === 'task-c') {
      // Prove the leftover worktree was actually pruned: cutting a new
      // worktree on the SAME branch name would throw "already checked
      // out" if it wasn't.
      const fresh = path.join(repo, `${taskId}-fresh-worktree`)
      execFileSync('git', ['-C', repo, 'worktree', 'add', fresh, 'task-c-branch'])
      return {
        task_id: taskId,
        summary: 'implemented C',
        files_changed: ['c.js'],
        branch: 'task-c-branch',
        commit: 'ccccccc',
        worktree_path: fresh,
      }
    }
    return {
      task_id: taskId,
      summary: `implemented ${taskId}`,
      files_changed: [`${taskId}.js`],
      branch: `${taskId}-branch`,
      commit: '0000000',
      worktree_path: `/tmp/${taskId}-worktree`,
    }
  }
  if (label.startsWith('qa:')) {
    const taskId = label.slice('qa:'.length)
    return { task_id: taskId, pass: true, findings: [] }
  }
  if (label.startsWith('record:')) {
    const marker = 'indentation — do not alter any field or add others:\n\n'
    const start = prompt.indexOf(marker) + marker.length
    const end = prompt.indexOf('\n\nReport back only the single word "written"')
    const jsonText = prompt.slice(start, end)
    checkUndefined(label, jsonText)
    const taskId = label.slice('record:'.length)
    writeFileSync(path.join(repo, '.squad', 'tasks', `${taskId}.json`), jsonText)
    return null
  }
  if (label === 'integration:merge') {
    return { merged: [], conflict: null }
  }
  throw new Error(`unexpected agent call: ${label}`)
}

const args = {}

const workflowResult = await (async () => {
HARNESS_HEAD
  sed -E 's/^export const meta/const meta/' "$file"
  cat <<'HARNESS_TAIL'
})()

writeFileSync(process.env.CALLS_OUT, JSON.stringify({ calls, undefinedLeak, workflowResult }, null, 2))
HARNESS_TAIL
} > "$harness"

FIXTURE_REPO="$repo" CALLS_OUT="$work/calls.json" node "$harness"

calls_json="$work/calls.json"
[[ -f "$calls_json" ]] || { echo "FAIL: harness did not run to completion" >&2; exit 1; }

# ---- Assertions ----------------------------------------------------------
python3 - "$calls_json" "$repo/.squad/tasks/task-c.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
calls = data["calls"]
agent_calls = [c for c in calls if c["kind"] == "agent"]

labels = [c["label"] for c in agent_calls]

assert data["undefinedLeak"] is False, "a prompt contained the literal string 'undefined'"

assert not any(c.get("agentType") == "dev-squad:tech-lead" for c in agent_calls), \
    f"tech-lead was invoked on a resume: {labels}"

dev_labels = [l for l in labels if l.startswith("dev:")]
qa_labels = [l for l in labels if l.startswith("qa:")]
record_labels = [l for l in labels if l.startswith("record:")]

assert dev_labels == ["dev:task-c"], f"expected exactly one dev: call for task-c, got {dev_labels}"
assert qa_labels == ["qa:task-c"], f"expected exactly one qa: call for task-c, got {qa_labels}"
assert record_labels == ["record:task-c"], f"expected recordStatus only for task-c, got {record_labels}"

assert "worktrees:prune" in labels, "expected a worktree-pruning agent call"

task_c = json.load(open(sys.argv[2]))
assert task_c.get("description"), \
    f"task-c.json's rewritten description must be non-empty (fallback from acceptance_criteria), got {task_c.get('description')!r}"

print("PY_ASSERTIONS_OK")
PY

sha_a_after="$(shasum -a 256 "$repo/.squad/tasks/task-a.json" | awk '{print $1}')"
sha_b_after="$(shasum -a 256 "$repo/.squad/tasks/task-b.json" | awk '{print $1}')"

[[ "$sha_a_before" == "$sha_a_after" ]] || { echo "FAIL: task-a.json was modified on resume" >&2; exit 1; }
[[ "$sha_b_before" == "$sha_b_after" ]] || { echo "FAIL: task-b.json was modified on resume" >&2; exit 1; }

grep -q '"status": "done"' "$repo/.squad/tasks/task-c.json" || { echo "FAIL: task-c.json not recorded done" >&2; exit 1; }

echo "PASS: build.js resume-safety (scenarios 9 and 10)"
