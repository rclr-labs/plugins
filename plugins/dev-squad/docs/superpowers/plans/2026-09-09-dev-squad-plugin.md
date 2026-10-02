# Dev Squad Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `dev-squad`, a distributable Claude Code plugin that runs a feature/MVP through the Plan → Design → Build → Test → Deploy → Maintain SDLC stages using a squad of agent personas, with deterministic security gates and AXI-compliant tooling.

**Architecture:** Interactive stages (Plan, Design) are run directly via commands and existing skills; parallelizable stages (Build+Test, Deploy) run as Workflow-tool scripts that spawn the plugin's own agent personas via `agentType`. A protocol skill documents the full state machine; two deterministic (non-LLM) scripts and a hook enforce the security floor that must never depend on an agent noticing something.

**Tech Stack:** Claude Code plugin conventions (`.claude-plugin/plugin.json`, `commands/`, `agents/`, `skills/`, `hooks/`), bash for deterministic scripts, plain JavaScript for Workflow scripts, Python 3 (stdlib only) for JSON handling inside bash scripts.

**Spec:** `docs/superpowers/specs/2026-09-09-dev-squad-design.md`

## Global Constraints

- Plugin name is `dev-squad` (kebab-case), per the spec's §2.
- No hardcoded absolute paths, usernames, or emails anywhere in the plugin. Every intra-plugin path reference uses `${CLAUDE_PLUGIN_ROOT}`.
- Bash scripts must run on both macOS (BSD userland) and Linux (GNU userland): use `grep -E`/`-i`, never `grep -P` (not available on BSD grep).
- Workflow scripts (`scripts/workflows/*.js`) are plain JavaScript, not TypeScript: no type annotations, no `import`/`require`, no filesystem or Node.js API access, no `Date.now()`/`Math.random()`/argless `new Date()`.
- Artifacts for the product being worked on live under `.squad/` at the *target* repo's root (the repo the plugin is installed into) — never inside the plugin's own directory tree.
- Every markdown component (`agents/*.md`, `commands/*.md`, `skills/*/SKILL.md`) has YAML frontmatter with at least a `description` field.
- Security findings are never optional to fix, unlike quality findings (per spec §6) — every agent whose job touches the Deploy or pre-prod gate must say this explicitly rather than leaving it implicit.

---

## Task 1: Plugin scaffold

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `agents/.gitkeep`, `commands/.gitkeep`, `skills/.gitkeep`, `scripts/.gitkeep`, `hooks/.gitkeep` (removed once each directory has real content — see later tasks)
- Test: `scripts/tests/test-scaffold.sh`

**Interfaces:**
- Produces: the directory skeleton every later task writes into, and `.claude-plugin/plugin.json` with `name: "dev-squad"`.

- [ ] **Step 1: Write the failing test**

```bash
mkdir -p "<repo-root>/scripts/tests"
cat > "<repo-root>/scripts/tests/test-scaffold.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

for dir in agents commands skills scripts hooks; do
  if [[ ! -d "$root/$dir" ]]; then
    echo "FAIL: missing directory $dir" >&2
    exit 1
  fi
done

if [[ ! -f "$root/.claude-plugin/plugin.json" ]]; then
  echo "FAIL: missing .claude-plugin/plugin.json" >&2
  exit 1
fi

python3 - "$root/.claude-plugin/plugin.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
assert data.get("name") == "dev-squad", f"expected name=dev-squad, got {data.get('name')!r}"
PY

echo "PASS: scaffold present"
EOF
chmod +x "<repo-root>/scripts/tests/test-scaffold.sh"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/tests/test-scaffold.sh`
Expected: FAIL with "missing directory agents" (or similar — the directories don't exist yet)

- [ ] **Step 3: Create the scaffold**

```bash
cd "<repo-root>"
mkdir -p .claude-plugin agents commands skills scripts/workflows scripts/tests hooks
cat > .claude-plugin/plugin.json <<'EOF'
{
  "name": "dev-squad",
  "version": "0.1.0",
  "description": "A development squad (Product Owner, Tech Lead, Devs, QA, Code Reviewer, Release Manager, a pre-prod Security Agent, and a Maintain monitor) that runs features through the Plan-Design-Build-Test-Deploy-Maintain SDLC stages.",
  "license": "MIT",
  "keywords": ["sdlc", "agile", "multi-agent", "security"]
}
EOF
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash scripts/tests/test-scaffold.sh`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .claude-plugin agents commands skills scripts hooks
git commit -m "$(cat <<'EOF'
Scaffold dev-squad plugin directory structure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SF3g1a2EjrWQKAVcuFLVUa
EOF
)"
```

---

## Task 2: Secret-scan hook

**Files:**
- Create: `scripts/secret-scan.sh`
- Create: `scripts/hook-secret-scan.sh`
- Create: `hooks/hooks.json`
- Test: `scripts/tests/test-secret-scan.sh`

**Interfaces:**
- Produces: `scripts/secret-scan.sh` (exit 0 = clean, exit 2 = block), invoked directly by tests and indirectly via `scripts/hook-secret-scan.sh` from the `PreToolUse` hook.

- [ ] **Step 1: Write the failing test**

```bash
cat > "<repo-root>/scripts/tests/test-secret-scan.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
scan="$root/scripts/secret-scan.sh"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cd "$work"
git init -q
git config user.email test@example.com
git config user.name test

# Case 1: clean file -> allowed
echo "hello world" > clean.txt
git add clean.txt
if ! "$scan"; then
  echo "FAIL: clean commit was blocked" >&2
  exit 1
fi

# Case 2: AWS key in a staged file -> blocked
echo "AKIAABCDEFGHIJKLMNOP" > secret.txt
git add secret.txt
if "$scan"; then
  echo "FAIL: AWS-key-looking content was NOT blocked" >&2
  exit 1
fi
git reset -q secret.txt

# Case 3: staged .env file -> blocked
echo "SOME_VAR=1" > .env
git add .env
if "$scan"; then
  echo "FAIL: staged .env was NOT blocked" >&2
  exit 1
fi
git reset -q .env

# Case 4: staged .env.example -> allowed
echo "SOME_VAR=1" > .env.example
git add .env.example
if ! "$scan"; then
  echo "FAIL: staged .env.example was blocked" >&2
  exit 1
fi

echo "PASS: secret-scan.sh"
EOF
chmod +x "<repo-root>/scripts/tests/test-secret-scan.sh"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/tests/test-secret-scan.sh`
Expected: FAIL (No such file or directory: scripts/secret-scan.sh)

- [ ] **Step 3: Implement `scripts/secret-scan.sh`**

```bash
cat > "<repo-root>/scripts/secret-scan.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

# Blocks a git commit when the staged diff looks like it contains a secret.
# Exit 0: nothing suspicious, allow the commit.
# Exit 2: secret detected, block (Claude Code PreToolUse hook convention).

PATTERNS=(
  'AKIA[0-9A-Z]{16}'
  '-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'
  '(api|secret|access)[_-]?(key|token)[[:space:]]*[:=][[:space:]]*"[A-Za-z0-9/+_=-]{16,}"'
)

staged_diff="$(git diff --cached --unified=0 2>/dev/null || true)"
staged_files="$(git diff --cached --name-only 2>/dev/null || true)"

if [[ -z "$staged_diff" && -z "$staged_files" ]]; then
  exit 0
fi

for pattern in "${PATTERNS[@]}"; do
  if grep -Eiq -- "$pattern" <<<"$staged_diff"; then
    echo "secret-scan: blocked commit — staged diff matches pattern: $pattern" >&2
    exit 2
  fi
done

while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  case "$f" in
    *.env.example) ;;
    *.env|*.env.*)
      echo "secret-scan: blocked commit — staged env file: $f" >&2
      exit 2
      ;;
  esac
done <<<"$staged_files"

exit 0
EOF
chmod +x "<repo-root>/scripts/secret-scan.sh"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash scripts/tests/test-secret-scan.sh`
Expected: PASS

- [ ] **Step 5: Implement the hook wrapper and wire up `hooks.json`**

```bash
cat > "<repo-root>/scripts/hook-secret-scan.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"
command="$(python3 -c '
import json, sys
try:
    data = json.loads(sys.stdin.read())
    print(data.get("tool_input", {}).get("command", ""))
except Exception:
    print("")
' <<<"$payload")"

if [[ "$command" != *"git commit"* ]]; then
  exit 0
fi

exec "$(dirname "$0")/secret-scan.sh"
EOF
chmod +x "<repo-root>/scripts/hook-secret-scan.sh"

cat > "<repo-root>/hooks/hooks.json" <<'EOF'
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hook-secret-scan.sh",
          "timeout": 15
        }
      ]
    }
  ]
}
EOF
```

- [ ] **Step 6: Add and run a test for the hook wrapper**

```bash
cat >> "<repo-root>/scripts/tests/test-secret-scan.sh" <<'EOF'

# Wrapper: non-commit command is always allowed, even with a staged secret
echo "AKIAABCDEFGHIJKLMNOP" > secret2.txt
git add secret2.txt
if ! echo '{"tool_input":{"command":"ls -la"}}' | "$root/scripts/hook-secret-scan.sh"; then
  echo "FAIL: wrapper blocked a non-commit command" >&2
  exit 1
fi

# Wrapper: git commit command with a staged secret is blocked
if echo '{"tool_input":{"command":"git commit -m test"}}' | "$root/scripts/hook-secret-scan.sh"; then
  echo "FAIL: wrapper did not block git commit with a staged secret" >&2
  exit 1
fi

echo "PASS: hook-secret-scan.sh wrapper"
EOF
bash "<repo-root>/scripts/tests/test-secret-scan.sh"
```

Expected: both `PASS` lines print, script exits 0.

- [ ] **Step 7: Commit**

```bash
cd "<repo-root>"
git add scripts/secret-scan.sh scripts/hook-secret-scan.sh hooks/hooks.json scripts/tests/test-secret-scan.sh
git commit -m "$(cat <<'EOF'
Add deterministic secret-scan PreToolUse hook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SF3g1a2EjrWQKAVcuFLVUa
EOF
)"
```

---

## Task 3: Dependency-audit script

**Files:**
- Create: `scripts/dependency-audit.sh`
- Test: `scripts/tests/test-dependency-audit.sh`

**Interfaces:**
- Produces: `scripts/dependency-audit.sh`, callable as `scripts/dependency-audit.sh [dir]`, printing one compact summary line to stdout. Consumed by `agents/qa-engineer.md` (Task 6) and `agents/security-preprod.md` (Task 7).

- [ ] **Step 1: Write the failing test**

```bash
cat > "<repo-root>/scripts/tests/test-dependency-audit.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
audit="$root/scripts/dependency-audit.sh"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# detect_manager: npm
mkdir "$work/npm-proj" && echo '{"name":"x"}' > "$work/npm-proj/package.json"
manager="$(source "$audit"; detect_manager "$work/npm-proj")"
[[ "$manager" == "npm" ]] || { echo "FAIL: expected npm, got $manager" >&2; exit 1; }

# detect_manager: pip
mkdir "$work/pip-proj" && echo 'requests' > "$work/pip-proj/requirements.txt"
manager="$(source "$audit"; detect_manager "$work/pip-proj")"
[[ "$manager" == "pip" ]] || { echo "FAIL: expected pip, got $manager" >&2; exit 1; }

# detect_manager: none
mkdir "$work/empty-proj"
manager="$(source "$audit"; detect_manager "$work/empty-proj")"
[[ "$manager" == "none" ]] || { echo "FAIL: expected none, got $manager" >&2; exit 1; }

# summarize_npm_json: zero vulnerabilities
out="$(echo '{"metadata":{"vulnerabilities":{"low":0,"high":0}}}' | (source "$audit"; summarize_npm_json))"
[[ "$out" == "dependency-audit: manager=npm, vulnerabilities=0" ]] || { echo "FAIL: got '$out'" >&2; exit 1; }

# summarize_npm_json: some vulnerabilities
out="$(echo '{"metadata":{"vulnerabilities":{"low":1,"high":2}}}' | (source "$audit"; summarize_npm_json))"
[[ "$out" == "dependency-audit: manager=npm, vulnerabilities=3 (low=1,high=2)" ]] || { echo "FAIL: got '$out'" >&2; exit 1; }

# main: no manifest -> clean deterministic message, exit 0
out="$("$audit" "$work/empty-proj")"
[[ "$out" == "dependency-audit: manager=none, result=no-manifest-found" ]] || { echo "FAIL: got '$out'" >&2; exit 1; }

echo "PASS: dependency-audit.sh"
EOF
chmod +x "<repo-root>/scripts/tests/test-dependency-audit.sh"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/tests/test-dependency-audit.sh`
Expected: FAIL (No such file or directory: scripts/dependency-audit.sh)

- [ ] **Step 3: Implement `scripts/dependency-audit.sh`**

```bash
cat > "<repo-root>/scripts/dependency-audit.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

detect_manager() {
  local dir="${1:-.}"
  if [[ -f "$dir/package.json" ]]; then
    echo npm
  elif [[ -f "$dir/requirements.txt" || -f "$dir/pyproject.toml" ]]; then
    echo pip
  else
    echo none
  fi
}

summarize_npm_json() {
  # NOTE: `python3 - <<PY` would redirect python's own stdin to the heredoc,
  # losing the piped audit JSON. Read the code into a variable instead, so
  # stdin passes through untouched to `python3 -c`.
  local code
  IFS= read -r -d '' code <<'PY' || true
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    print("dependency-audit: manager=npm, result=unparseable-output")
    sys.exit(0)
meta = data.get("metadata", {}).get("vulnerabilities", {}) or {}
total = sum(meta.values())
if total == 0:
    print("dependency-audit: manager=npm, vulnerabilities=0")
else:
    parts = ",".join(f"{k}={v}" for k, v in meta.items() if v)
    print(f"dependency-audit: manager=npm, vulnerabilities={total} ({parts})")
PY
  python3 -c "$code"
}

summarize_pip_json() {
  local code
  IFS= read -r -d '' code <<'PY' || true
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    print("dependency-audit: manager=pip, result=unparseable-output")
    sys.exit(0)
count = len(data) if isinstance(data, list) else 0
print(f"dependency-audit: manager=pip, vulnerabilities={count}")
PY
  python3 -c "$code"
}

main() {
  local dir="${1:-.}"
  local manager
  manager="$(detect_manager "$dir")"

  case "$manager" in
    npm)
      (cd "$dir" && npm audit --json 2>/dev/null || true) | summarize_npm_json
      ;;
    pip)
      if command -v pip-audit >/dev/null 2>&1; then
        (cd "$dir" && pip-audit -f json 2>/dev/null || true) | summarize_pip_json
      else
        echo "dependency-audit: manager=pip, result=pip-audit-not-installed"
      fi
      ;;
    none)
      echo "dependency-audit: manager=none, result=no-manifest-found"
      ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
EOF
chmod +x "<repo-root>/scripts/dependency-audit.sh"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash scripts/tests/test-dependency-audit.sh`
Expected: PASS

Note: real `npm audit`/`pip-audit` invocation against a live project is environment-dependent (network/registry access) and is intentionally not asserted here beyond the "no manifest" and JSON-summarization paths, both of which are fully deterministic and offline.

- [ ] **Step 5: Commit**

```bash
cd "<repo-root>"
git add scripts/dependency-audit.sh scripts/tests/test-dependency-audit.sh
git commit -m "$(cat <<'EOF'
Add dependency-audit script for the Test stage

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SF3g1a2EjrWQKAVcuFLVUa
EOF
)"
```

---

## Task 4: Frontmatter test helper + Design-stage agents

**Files:**
- Create: `scripts/tests/check-frontmatter.sh`
- Create: `agents/product-owner.md`
- Create: `agents/tech-lead.md`
- Test: `scripts/tests/test-design-agents.sh`

**Interfaces:**
- Produces: `scripts/tests/check-frontmatter.sh <file> <field> [<field> ...]` (exit 0 = all fields present, exit 1 = missing one, prints which). Reused by Tasks 5-9 and 13-14.
- Produces: `agents/product-owner.md`, `agents/tech-lead.md` — consumed via `agentType: 'tech-lead'` in `scripts/workflows/build.js` (Task 11) and by name from `skills/dev-squad-protocol/SKILL.md` (Task 9) and `commands/squad-new.md` (Task 10).

- [ ] **Step 1: Write the failing test**

```bash
cat > "<repo-root>/scripts/tests/check-frontmatter.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
file="$1"; shift
if [[ ! -f "$file" ]]; then
  echo "FAIL: $file does not exist" >&2
  exit 1
fi
frontmatter="$(awk '/^---$/{c++; next} c==1' "$file")"
if [[ -z "$frontmatter" ]]; then
  echo "FAIL: $file has no YAML frontmatter" >&2
  exit 1
fi
for field in "$@"; do
  if ! grep -Eq "^${field}:" <<<"$frontmatter"; then
    echo "FAIL: $file frontmatter missing required field '$field'" >&2
    exit 1
  fi
done
echo "PASS: $file has required frontmatter fields: $*"
EOF
chmod +x "<repo-root>/scripts/tests/check-frontmatter.sh"

cat > "<repo-root>/scripts/tests/test-design-agents.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/product-owner.md" description tools
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/tech-lead.md" description tools
grep -q "Security" "$root/agents/product-owner.md" || { echo "FAIL: product-owner.md doesn't mention the mandatory Security section" >&2; exit 1; }
grep -q "gdpr-lgpd-compliance-auditor" "$root/agents/tech-lead.md" || { echo "FAIL: tech-lead.md doesn't route PII items to the compliance auditor" >&2; exit 1; }
echo "PASS: design-stage agents"
EOF
chmod +x "<repo-root>/scripts/tests/test-design-agents.sh"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/tests/test-design-agents.sh`
Expected: FAIL (agents/product-owner.md does not exist)

- [ ] **Step 3: Write `agents/product-owner.md`**

```bash
cat > "<repo-root>/agents/product-owner.md" <<'EOF'
---
description: Drafts and accepts SDLC artifacts on behalf of the product owner — turns an accepted intent.md into spec.md, and reviews intent.md for acceptance. Use during the Plan and Design stages of the dev-squad protocol.
tools: Read, Write, Grep, Glob
---

You are the Product Owner in the dev-squad protocol (see the
`dev-squad-protocol` skill for the full stage sequence).

**Plan stage (accepting an intent):** Read `.squad/intent.md`. Check it
states a clear problem, a target user, and a definition of "done" a
non-technical stakeholder could verify. If any of those is missing or
vague, list exactly what's missing and stop — do not accept it. If it's
complete, state that it is accepted.

**Design stage (drafting a spec):** Read the accepted `.squad/intent.md` and
write `.squad/spec.md`. The spec MUST include these sections, in order:

1. **Summary** — one paragraph restating the intent as a concrete plan.
2. **User-facing behavior** — what changes for the user, described
   concretely enough that QA can write acceptance tests from it.
3. **Out of scope** — what this explicitly does not cover, to prevent scope
   creep during Build.
4. **Security** (mandatory, never omit): authentication/authorization model
   for anything new, classification of any personal or sensitive data
   touched (none / internal / personal / sensitive), and how secrets or
   config for this feature will be managed. If truly none of these apply,
   say so explicitly per item — do not leave the section out.
5. **Open questions for the Tech Lead** — anything you are not qualified to
   decide (data model, infra, technical risk).

If anything in the intent is technically risky (touches auth, external
data, infra, or you are unsure of feasibility), list it under Open
Questions rather than guessing — the Tech Lead reviews those before the
spec is offered back to the human product owner for acceptance.
EOF
```

- [ ] **Step 4: Write `agents/tech-lead.md`**

```bash
cat > "<repo-root>/agents/tech-lead.md" <<'EOF'
---
description: Reviews technically risky spec items, breaks an accepted spec into independent implementation tasks, and approves the resulting plan. Use during Design (risk consult) and Build (task breakdown) stages of the dev-squad protocol.
tools: Read, Write, Grep, Glob, Bash
---

You are the Tech Lead / Architect in the dev-squad protocol.

**Design stage (risk consult):** Read `.squad/spec.md`'s "Open Questions"
section. For each item, give a concrete technical answer or an explicit
recommendation with trade-offs — never leave one unanswered. If an item
involves handling personal data, say so explicitly so it can be routed to
the `gdpr-lgpd-compliance-auditor` agent before the spec is accepted.

**Build stage (task breakdown):** Read the accepted `.squad/spec.md`. Break
it into implementation tasks that:

- are independent enough to implement in parallel without touching the same
  files (call this out explicitly if two tasks must share a file — merge
  them into one task instead of leaving a conflict for two devs to hit)
- each have a testable acceptance criterion taken from the spec's
  "User-facing behavior" section
- are ordered only where a real dependency exists (say why, otherwise treat
  as parallel)

Write the full breakdown as `.squad/plan.md`, one `##` section per task with
its id, description, files it's expected to touch, and acceptance criteria.
"Nothing is implemented without an accepted plan" — a dev must never start a
task that isn't in this file.
EOF
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bash scripts/tests/test-design-agents.sh`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd "<repo-root>"
git add scripts/tests/check-frontmatter.sh scripts/tests/test-design-agents.sh agents/product-owner.md agents/tech-lead.md
git commit -m "$(cat <<'EOF'
Add Product Owner and Tech Lead agent personas

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SF3g1a2EjrWQKAVcuFLVUa
EOF
)"
```

---

## Task 5: Build-stage agent (Dev)

**Files:**
- Create: `agents/dev.md`
- Test: `scripts/tests/test-dev-agent.sh`

**Interfaces:**
- Produces: `agents/dev.md`, consumed via `agentType: 'dev'` in `scripts/workflows/build.js` (Task 11).

- [ ] **Step 1: Write the failing test**

```bash
cat > "<repo-root>/scripts/tests/test-dev-agent.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/dev.md" description tools
grep -q "AXI" "$root/agents/dev.md" || { echo "FAIL: dev.md doesn't mention AXI for CLI work" >&2; exit 1; }
echo "PASS: dev agent"
EOF
chmod +x "<repo-root>/scripts/tests/test-dev-agent.sh"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/tests/test-dev-agent.sh`
Expected: FAIL (agents/dev.md does not exist)

- [ ] **Step 3: Write `agents/dev.md`**

```bash
cat > "<repo-root>/agents/dev.md" <<'EOF'
---
description: Implements one isolated task from .squad/plan.md against its acceptance criteria. Instantiated once per task, in parallel with other Devs, during the Build stage of the dev-squad protocol.
tools: Read, Write, Edit, Bash, Grep, Glob
---

You are a Dev in the dev-squad protocol, implementing exactly one task from
`.squad/plan.md`. You will be told which task id.

1. Read `.squad/spec.md` for full context and the task's section in
   `.squad/plan.md` for its acceptance criteria.
2. If the task touches a CLI surface (a command users or other tools will
   invoke), apply the AXI principles recorded in this project's CLAUDE.md:
   compact list output, minimal default fields, structured errors with
   clear exit codes, definitive empty states.
3. Implement only this task — do not touch files outside what it describes.
   If you discover the task actually requires touching a file another task
   owns, stop and report the conflict instead of proceeding.
4. Write or update tests that exercise the acceptance criteria before
   considering the task done.
5. Commit your work with a message naming the task id.
6. Report: the task id, a summary of what changed, the list of files
   changed, the branch name you committed to, and the commit hash.

Never mark a task done if its acceptance criteria aren't met by a test you
can point to.
EOF
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash scripts/tests/test-dev-agent.sh`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd "<repo-root>"
git add agents/dev.md scripts/tests/test-dev-agent.sh
git commit -m "$(cat <<'EOF'
Add Dev agent persona for the Build stage

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SF3g1a2EjrWQKAVcuFLVUa
EOF
)"
```

---

## Task 6: Test/Deploy-stage agents (QA, Code Reviewer, Release Manager)

**Files:**
- Create: `agents/qa-engineer.md`
- Create: `agents/code-reviewer.md`
- Create: `agents/release-manager.md`
- Test: `scripts/tests/test-test-deploy-agents.sh`

**Interfaces:**
- Produces: `agents/qa-engineer.md` (consumed via `agentType: 'qa-engineer'` in `scripts/workflows/build.js`, Task 11), `agents/code-reviewer.md` (consumed via `agentType: 'code-reviewer'` in `scripts/workflows/deploy-review.js`, Task 12), `agents/release-manager.md` (consumed by `commands/squad-advance.md`, Task 13).

- [ ] **Step 1: Write the failing test**

```bash
cat > "<repo-root>/scripts/tests/test-test-deploy-agents.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/qa-engineer.md" description tools
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/code-reviewer.md" description tools
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/release-manager.md" description tools
grep -q "dependency-audit.sh" "$root/agents/qa-engineer.md" || { echo "FAIL: qa-engineer.md doesn't call dependency-audit.sh" >&2; exit 1; }
grep -q "accepted as-is" "$root/agents/release-manager.md" || { echo "FAIL: release-manager.md doesn't say security findings can't be waived" >&2; exit 1; }
echo "PASS: test/deploy-stage agents"
EOF
chmod +x "<repo-root>/scripts/tests/test-test-deploy-agents.sh"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/tests/test-test-deploy-agents.sh`
Expected: FAIL (agents/qa-engineer.md does not exist)

- [ ] **Step 3: Write `agents/qa-engineer.md`**

```bash
cat > "<repo-root>/agents/qa-engineer.md" <<'EOF'
---
description: Verifies one Dev's completed task against its acceptance criteria — runs tests, reviews the diff, reports pass/fail with findings. Runs immediately after each Dev finishes, during the Test stage of the dev-squad protocol.
tools: Read, Bash, Grep, Glob
---

You are QA in the dev-squad protocol. You are given one task's acceptance
criteria and the Dev's report of what they changed.

1. Check out the Dev's branch/worktree.
2. Run the project's test suite (or the tests the Dev added, if there is no
   broader suite yet) and confirm they actually pass — never take the Dev's
   "done" claim as sufficient on its own.
3. Read the diff and check it matches the acceptance criteria — not just
   "does it run" but "does it do what the spec described."
4. If dependency manifests changed in this diff, run
   `${CLAUDE_PLUGIN_ROOT}/scripts/dependency-audit.sh` against the repo and
   include its output line in your report verbatim.
5. Report: task id, pass/fail, and a list of concrete findings (empty list
   if none). A finding must name the specific behavior that's wrong, not a
   vague "could be improved."

Fail the task if the acceptance criteria aren't met, even if the code runs
without errors.
EOF
```

- [ ] **Step 4: Write `agents/code-reviewer.md`**

```bash
cat > "<repo-root>/agents/code-reviewer.md" <<'EOF'
---
description: Reviews a diff for correctness bugs and reuse/simplification/efficiency issues, as the quality dimension of the Deploy stage review in the dev-squad protocol.
tools: Read, Grep, Glob, Bash
---

You are the Code Reviewer in the dev-squad protocol, reviewing the diff for
the given ref. Look for:

- Correctness bugs: concrete input/state that produces a wrong result or a
  crash. Cite the exact failure scenario, not a hypothetical.
- Reuse and simplification: duplicated logic that should call something
  existing, unnecessary abstraction, dead code.
- Efficiency: real, demonstrable inefficiency (not micro-optimization
  speculation).

Report each finding with the file, line, a one-sentence summary, and the
concrete failure scenario or the reason it's not worth the complexity. Do
not report style preferences that don't affect correctness or maintenance
cost. Return an empty findings list if the diff is clean — do not
manufacture findings to have something to say.
EOF
```

- [ ] **Step 5: Write `agents/release-manager.md`**

```bash
cat > "<repo-root>/agents/release-manager.md" <<'EOF'
---
description: Authorizes merges and production deploys — the final human-facing gate of the Deploy stage in the dev-squad protocol. Enforces commit-push-deploy ordering and blocks on any unresolved finding.
tools: Read, Bash, Grep, Glob
---

You are the Release Manager in the dev-squad protocol. You do not write
code or find new issues — you check that everything already found is
actually resolved, then authorize the next irreversible step.

Before authorizing a merge:

- Every quality finding from the Code Reviewer is either fixed or
  explicitly accepted by the human (never silently dropped).
- Every security finding from the security-review pass is fixed — security
  findings are never "accepted as-is," unlike quality findings.
- `dependency-audit.sh` output for this cycle, if it ran, shows no
  unresolved high/critical result.

Before authorizing a production deploy, in addition to the above:

- Confirm all relevant changes are committed and pushed to the remote —
  never authorize a deploy against uncommitted or unpushed work.
- Confirm the pre-prod Security Agent has run against this cycle's changes
  and reported no unresolved finding. If it hasn't run yet, run it before
  deciding — never skip it for a production target.

State explicitly whether you are authorizing or blocking, and if blocking,
exactly what must change before you'll reconsider.
EOF
```

- [ ] **Step 6: Run test to verify it passes**

Run: `bash scripts/tests/test-test-deploy-agents.sh`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd "<repo-root>"
git add agents/qa-engineer.md agents/code-reviewer.md agents/release-manager.md scripts/tests/test-test-deploy-agents.sh
git commit -m "$(cat <<'EOF'
Add QA, Code Reviewer, and Release Manager agent personas

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SF3g1a2EjrWQKAVcuFLVUa
EOF
)"
```

---

## Task 7: Pre-prod Security Agent

**Files:**
- Create: `agents/security-preprod.md`
- Test: `scripts/tests/test-security-preprod-agent.sh`

**Interfaces:**
- Produces: `agents/security-preprod.md`, invoked by name from `commands/squad-advance.md` (Task 13) before any production deploy.

- [ ] **Step 1: Write the failing test**

```bash
cat > "<repo-root>/scripts/tests/test-security-preprod-agent.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/security-preprod.md" description tools
grep -q "gdpr-lgpd-compliance-auditor" "$root/agents/security-preprod.md" || { echo "FAIL: doesn't invoke gdpr-lgpd-compliance-auditor" >&2; exit 1; }
grep -q "dependency-audit.sh" "$root/agents/security-preprod.md" || { echo "FAIL: doesn't re-check dependency-audit.sh" >&2; exit 1; }
grep -qi "block" "$root/agents/security-preprod.md" || { echo "FAIL: doesn't state it blocks the deploy on findings" >&2; exit 1; }
echo "PASS: security-preprod agent"
EOF
chmod +x "<repo-root>/scripts/tests/test-security-preprod-agent.sh"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/tests/test-security-preprod-agent.sh`
Expected: FAIL (agents/security-preprod.md does not exist)

- [ ] **Step 3: Write `agents/security-preprod.md`**

```bash
cat > "<repo-root>/agents/security-preprod.md" <<'EOF'
---
description: Dedicated pre-production security gate — scopes itself to what actually changed since the last prod deploy and blocks the deploy on any finding. Runs only before a production deploy, after push and before the deploy command, in the dev-squad protocol.
tools: Read, Grep, Glob, Bash
---

You are the pre-production Security Agent in the dev-squad protocol. You
run exactly once, right before a production deploy, after the code has
already been committed and pushed.

1. Diff everything changed since the last recorded production deploy (if
   `.squad/maintain/last-deploy.md` doesn't exist yet, diff against the
   first commit).
2. Based on what that diff actually touches, decide which checks apply — do
   not run every check unconditionally:
   - Touches authentication/authorization code → do a focused review of the
     auth flow: who can access what, and under which conditions that check
     could be bypassed.
   - Touches storage of or access to personal/sensitive data → invoke the
     `gdpr-lgpd-compliance-auditor` agent against the diff.
   - Touches deploy/infra config (CORS, environment variables, hosting
     config for Firebase/Cloud Run/Vercel/gcloud) → check for secrets
     committed into config, overly permissive CORS, and publicly exposed
     resources that shouldn't be.
   - Always, regardless of the above: confirm this cycle's secret-scan hook
     and `dependency-audit.sh` results are clean. Re-run
     `${CLAUDE_PLUGIN_ROOT}/scripts/dependency-audit.sh` if you can't find a
     recent result.
3. Report every finding with severity and the concrete exploit scenario.
   Any finding — regardless of severity — blocks this deploy; state that
   explicitly rather than leaving it to the Release Manager to infer.
4. If you authorize the deploy, append the current commit hash and a
   timestamp (via `date -u +%Y-%m-%dT%H:%M:%SZ`) to
   `.squad/maintain/last-deploy.md` so the next run's diff starts here.

Never widen scope beyond what changed — a full audit is the job of a
separate, explicitly-requested security review, not this gate.
EOF
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash scripts/tests/test-security-preprod-agent.sh`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd "<repo-root>"
git add agents/security-preprod.md scripts/tests/test-security-preprod-agent.sh
git commit -m "$(cat <<'EOF'
Add dedicated pre-production Security Agent

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SF3g1a2EjrWQKAVcuFLVUa
EOF
)"
```

---

## Task 8: Maintain-stage agent (Monitor)

**Files:**
- Create: `agents/monitor.md`
- Test: `scripts/tests/test-monitor-agent.sh`

**Interfaces:**
- Produces: `agents/monitor.md`, invoked by name from `skills/dev-squad-protocol/SKILL.md` (Task 9) when the human pastes production logs/metrics.

- [ ] **Step 1: Write the failing test**

```bash
cat > "<repo-root>/scripts/tests/test-monitor-agent.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/agents/monitor.md" description tools
grep -q "intent.md" "$root/agents/monitor.md" || { echo "FAIL: monitor.md doesn't produce a new intent.md" >&2; exit 1; }
echo "PASS: monitor agent"
EOF
chmod +x "<repo-root>/scripts/tests/test-monitor-agent.sh"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/tests/test-monitor-agent.sh`
Expected: FAIL (agents/monitor.md does not exist)

- [ ] **Step 3: Write `agents/monitor.md`**

```bash
cat > "<repo-root>/agents/monitor.md" <<'EOF'
---
description: Diagnoses production incidents from logs/metrics the human pastes in, and drafts a new intent.md to reopen the SDLC cycle. Used in the Maintain stage of the dev-squad protocol.
tools: Read, Write, Grep, Glob
---

You are the Monitor in the dev-squad protocol. You are triggered by a human
pasting production logs, metrics, or an alert — you do not poll anything
yourself.

1. Diagnose what's actually wrong: the specific failing behavior, not just
   "errors increased." Quote the log lines or metric values that support
   your diagnosis.
2. Classify severity. Anything with a plausible security or data-exposure
   angle (auth bypass, data leak, injected input reaching a dangerous sink)
   is always "high," regardless of how it initially presented.
3. Draft `.squad/intent.md` (archiving any existing one under
   `.squad/archive/` first, matching the same rule `/squad-new` follows)
   that states the problem in the same terms Plan-stage intents use: what's
   broken, who it affects, what "fixed" looks like. Mark the priority you
   determined in step 2 at the top.
4. Do not propose or write a fix yourself — your output is the intent that
   re-enters the cycle at Plan, for the human to review before Design
   starts.
EOF
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash scripts/tests/test-monitor-agent.sh`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd "<repo-root>"
git add agents/monitor.md scripts/tests/test-monitor-agent.sh
git commit -m "$(cat <<'EOF'
Add Monitor agent for the Maintain stage

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SF3g1a2EjrWQKAVcuFLVUa
EOF
)"
```

---

## Task 9: Protocol skill

**Files:**
- Create: `skills/dev-squad-protocol/SKILL.md`
- Test: `scripts/tests/test-protocol-skill.sh`

**Interfaces:**
- Consumes: names of all agents from Tasks 4-8, script paths from Tasks 2-3, workflow names from Tasks 11-12 (referenced by path/name even though those files don't exist until later tasks — this is documentation, not executable code, so forward references are fine as long as Tasks 11-12 use the exact same names).
- Produces: `skills/dev-squad-protocol/SKILL.md`, followed by `commands/squad-new.md` and `commands/squad-advance.md` (Tasks 10, 13).

- [ ] **Step 1: Write the failing test**

```bash
mkdir -p "<repo-root>/skills/dev-squad-protocol"
cat > "<repo-root>/scripts/tests/test-protocol-skill.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
skill="$root/skills/dev-squad-protocol/SKILL.md"
"$root/scripts/tests/check-frontmatter.sh" "$skill" name description

for term in "squad-build" "squad-deploy-review" "gate_mode" "full" "critical-only" "product-owner" "tech-lead" "release-manager" "security-preprod" "monitor"; do
  grep -q -- "$term" "$skill" || { echo "FAIL: SKILL.md doesn't mention '$term'" >&2; exit 1; }
done

echo "PASS: dev-squad-protocol skill"
EOF
chmod +x "<repo-root>/scripts/tests/test-protocol-skill.sh"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/tests/test-protocol-skill.sh`
Expected: FAIL (SKILL.md does not exist)

- [ ] **Step 3: Write `skills/dev-squad-protocol/SKILL.md`**

```bash
cat > "<repo-root>/skills/dev-squad-protocol/SKILL.md" <<'EOF'
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
  "gate_mode": "full"
}
```

`stage` is one of `plan`, `design`, `build`, `test`, `deploy`, `maintain`,
`done`. `gate_mode` is `full` or `critical-only` (see below).

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
   tool. It breaks `.squad/spec.md` into `.squad/plan.md` and runs Dev→QA
   in a pipeline, one pair per task.
4. **test** — Folded into the `squad-build` workflow's pipeline (QA runs
   immediately after each Dev). Nothing separate to invoke here — this
   stage exists in the state machine for gate-mode purposes only.
5. **deploy** — Run the `squad-deploy-review` workflow
   (`${CLAUDE_PLUGIN_ROOT}/scripts/workflows/deploy-review.js`) with
   `args: {ref: "<PR or branch ref>"}`. Then invoke the `release-manager`
   agent with its `confirmed`/`blocksDeploy` result to decide merge
   authorization. If this deploy targets **production**, invoke the
   `security-preprod` agent after push and before the actual deploy
   command — its result feeds back into the Release Manager's decision.
   Only after the Release Manager authorizes does the deploy command
   itself run, following the user's global commit → push → deploy rule.
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
production deploy with unresolved security findings, and never advance past
`design` with an incomplete Security section in `spec.md`.

## AXI compliance

Whenever a stage produces or touches a CLI surface — the product's own CLI,
or an internal squad tool like `/squad-status` — apply the AXI principles
recorded in the user's global CLAUDE.md (token-efficient compact output,
minimal default fields, structured errors, definitive empty states).
EOF
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash scripts/tests/test-protocol-skill.sh`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd "<repo-root>"
git add skills/dev-squad-protocol/SKILL.md scripts/tests/test-protocol-skill.sh
git commit -m "$(cat <<'EOF'
Add dev-squad-protocol skill documenting the stage state machine

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SF3g1a2EjrWQKAVcuFLVUa
EOF
)"
```

---

## Task 10: `/squad-new` command

**Files:**
- Create: `commands/squad-new.md`
- Test: `scripts/tests/test-squad-new-command.sh`

**Interfaces:**
- Produces: `commands/squad-new.md`, the `.squad/squad.config.json` schema (`product`, `stage`, `gate_mode`) that `commands/squad-advance.md` (Task 13) and `commands/squad-status.md` (Task 14) read.

- [ ] **Step 1: Write the failing test**

```bash
cat > "<repo-root>/scripts/tests/test-squad-new-command.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/commands/squad-new.md" description

for term in "squad.config.json" "gate mode" "git init" "brainstorming" "archive"; do
  grep -qi -- "$term" "$root/commands/squad-new.md" || { echo "FAIL: squad-new.md doesn't mention '$term'" >&2; exit 1; }
done

echo "PASS: squad-new command"
EOF
chmod +x "<repo-root>/scripts/tests/test-squad-new-command.sh"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/tests/test-squad-new-command.sh`
Expected: FAIL (commands/squad-new.md does not exist)

- [ ] **Step 3: Write `commands/squad-new.md`**

```bash
cat > "<repo-root>/commands/squad-new.md" <<'EOF'
---
description: Start the Plan stage for a new product — brainstorm intent.md, choose a gate mode, and scaffold .squad/
argument-hint: <product-name>
---

Product name: $ARGUMENTS

1. If `.squad/squad.config.json` already exists and its `stage` is not
   `done`, ask the human whether to archive the existing product to
   `.squad/archive/<old-product>-<date>/` before continuing. Never
   overwrite silently.
2. If the current directory is not a git repository (`git rev-parse
   --is-inside-work-tree` fails), tell the human and ask whether to run
   `git init` before continuing. Do not init silently.
3. Ask the human which gate mode to use: `full` (pause after every stage
   handoff) or `critical-only` (pause only before Build and before a
   production deploy). If they don't have a preference, recommend `full`
   for a first product with this squad, `critical-only` once they're
   comfortable with it.
4. Use the `superpowers:brainstorming` skill with the human to produce the
   intent — a clear problem statement, a target user, and a definition of
   "done." Once agreed, write it to `.squad/intent.md`.
5. Write `.squad/squad.config.json`:
   ```json
   {
     "product": "<product-name from $ARGUMENTS, kebab-case>",
     "stage": "plan",
     "gate_mode": "<full|critical-only>"
   }
   ```
6. Tell the human the intent is written and that `/squad-advance` moves it
   into Design. Follow the `dev-squad-protocol` skill for everything after
   this point.
EOF
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash scripts/tests/test-squad-new-command.sh`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd "<repo-root>"
git add commands/squad-new.md scripts/tests/test-squad-new-command.sh
git commit -m "$(cat <<'EOF'
Add /squad-new command

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SF3g1a2EjrWQKAVcuFLVUa
EOF
)"
```

---

## Task 11: `squad-build` workflow script (Build + Test)

**Files:**
- Create: `scripts/workflows/build.js`
- Test: `scripts/tests/test-build-workflow-syntax.sh`

**Interfaces:**
- Consumes: `agentType: 'tech-lead'`, `agentType: 'dev'`, `agentType: 'qa-engineer'` (Tasks 4-6).
- Produces: a workflow named `squad-build`, invoked by `commands/squad-advance.md` (Task 13) via the Workflow tool with `{scriptPath: "${CLAUDE_PLUGIN_ROOT}/scripts/workflows/build.js"}`. Returns `{breakdown, results}` where `results` is one `{devResult, qaResult}`-shaped pair per task (exact shape below).

- [ ] **Step 1: Write the failing test**

```bash
cat > "<repo-root>/scripts/tests/test-build-workflow-syntax.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
file="$root/scripts/workflows/build.js"
[[ -f "$file" ]] || { echo "FAIL: $file does not exist" >&2; exit 1; }

# Workflow scripts combine `export const meta` (module syntax) with a
# top-level `await` AND a top-level `return` (function syntax) — no plain
# CommonJS script or standard ES module accepts that combination, because
# the Workflow tool wraps the body in an async function itself before
# running it. Reproduce that wrapping so `node --check` can still catch
# real syntax errors (mismatched braces, typos, etc).
wrapped="$(mktemp)"
trap 'rm -f "$wrapped"' EXIT
{
  echo '(async () => {'
  sed -E 's/^export const meta/const meta/' "$file"
  echo '})();'
} > "$wrapped"
node --check "$wrapped"

grep -q "export const meta" "$file" || { echo "FAIL: missing meta export" >&2; exit 1; }
grep -q "agentType: 'tech-lead'" "$file" || { echo "FAIL: missing tech-lead agentType" >&2; exit 1; }
grep -q "agentType: 'dev'" "$file" || { echo "FAIL: missing dev agentType" >&2; exit 1; }
grep -q "agentType: 'qa-engineer'" "$file" || { echo "FAIL: missing qa-engineer agentType" >&2; exit 1; }
echo "PASS: build.js syntax and required agentTypes"
EOF
chmod +x "<repo-root>/scripts/tests/test-build-workflow-syntax.sh"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/tests/test-build-workflow-syntax.sh`
Expected: FAIL (scripts/workflows/build.js does not exist)

- [ ] **Step 3: Write `scripts/workflows/build.js`**

```bash
cat > "<repo-root>/scripts/workflows/build.js" <<'EOF'
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
        },
        required: ['id', 'title', 'description', 'acceptance_criteria'],
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
  },
  required: ['task_id', 'summary', 'files_changed'],
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

phase('Plan tasks')
const breakdown = await agent(
  'Read .squad/spec.md and .squad/intent.md in the current repo. Break the spec into independent, isolated implementation tasks suitable for parallel execution by separate engineers. Write the full breakdown as .squad/plan.md (markdown, one ## section per task) before returning. Return the same breakdown as structured data: an id, title, description, and acceptance_criteria per task.',
  { agentType: 'tech-lead', phase: 'Plan tasks', schema: BREAKDOWN_SCHEMA }
)

const results = await pipeline(
  breakdown.tasks,
  (task) => agent(
    `Implement task ${task.id}: ${task.title}\n\n${task.description}\n\nAcceptance criteria: ${task.acceptance_criteria}\n\nRead .squad/spec.md for full context. Implement only this task. Commit your work with a descriptive message naming the task id when the acceptance criteria are met. Report your branch name and commit hash.`,
    { agentType: 'dev', phase: 'Build', label: `dev:${task.id}`, isolation: 'worktree', schema: DEV_RESULT_SCHEMA }
  ),
  (devResult, task) => agent(
    `Verify task ${task.id}: ${task.title} against its acceptance criteria: ${task.acceptance_criteria}\n\nThe dev reported: ${JSON.stringify(devResult)}\n\nCheck out the dev's branch, review the diff, and run any tests that exist. Report pass/fail and findings.`,
    { agentType: 'qa-engineer', phase: 'Test', label: `qa:${task.id}`, schema: QA_RESULT_SCHEMA }
  ).then((qaResult) => ({ task, devResult, qaResult }))
)

return { breakdown, results }
EOF
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash scripts/tests/test-build-workflow-syntax.sh`
Expected: PASS

- [ ] **Step 5: Manual smoke test (not asserted by the automated test — Workflow scripts can't run outside the Workflow tool runtime)**

In an interactive Claude Code session with this plugin enabled, against a
scratch git repo containing a trivial `.squad/spec.md` (e.g. "add a
function `add(a, b)` that returns their sum, with a unit test"), invoke:

```
Workflow({ scriptPath: "<path-to-plugin>/scripts/workflows/build.js" })
```

Confirm it: writes `.squad/plan.md`, spawns at least one Dev, spawns a QA
agent per Dev, and returns a `results` array shaped like
`[{ task, devResult, qaResult }, ...]`.

- [ ] **Step 6: Commit**

```bash
cd "<repo-root>"
git add scripts/workflows/build.js scripts/tests/test-build-workflow-syntax.sh
git commit -m "$(cat <<'EOF'
Add squad-build workflow for the Build and Test stages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SF3g1a2EjrWQKAVcuFLVUa
EOF
)"
```

---

## Task 12: `squad-deploy-review` workflow script (Deploy)

**Files:**
- Create: `scripts/workflows/deploy-review.js`
- Test: `scripts/tests/test-deploy-review-workflow-syntax.sh`

**Interfaces:**
- Consumes: `agentType: 'code-reviewer'` (Task 6), the `security-review` skill (invoked by prompt, not by `agentType`).
- Produces: a workflow named `squad-deploy-review`, invoked by `commands/squad-advance.md` (Task 13) via the Workflow tool with `{scriptPath: "${CLAUDE_PLUGIN_ROOT}/scripts/workflows/deploy-review.js", args: {ref: "<ref>"}}`. Returns `{confirmed, blocksDeploy}`.

- [ ] **Step 1: Write the failing test**

```bash
cat > "<repo-root>/scripts/tests/test-deploy-review-workflow-syntax.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
file="$root/scripts/workflows/deploy-review.js"
[[ -f "$file" ]] || { echo "FAIL: $file does not exist" >&2; exit 1; }

# See the matching comment in test-build-workflow-syntax.sh: wrap the body
# in an async function before checking syntax, since the raw file mixes
# module and function syntax that only the Workflow runtime understands.
wrapped="$(mktemp)"
trap 'rm -f "$wrapped"' EXIT
{
  echo '(async () => {'
  sed -E 's/^export const meta/const meta/' "$file"
  echo '})();'
} > "$wrapped"
node --check "$wrapped"

grep -q "export const meta" "$file" || { echo "FAIL: missing meta export" >&2; exit 1; }
grep -q "agentType: 'code-reviewer'" "$file" || { echo "FAIL: missing code-reviewer agentType" >&2; exit 1; }
grep -q "security-review" "$file" || { echo "FAIL: missing security-review skill invocation" >&2; exit 1; }
grep -q "blocksDeploy" "$file" || { echo "FAIL: missing blocksDeploy in return value" >&2; exit 1; }
echo "PASS: deploy-review.js syntax and required dimensions"
EOF
chmod +x "<repo-root>/scripts/tests/test-deploy-review-workflow-syntax.sh"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/tests/test-deploy-review-workflow-syntax.sh`
Expected: FAIL (scripts/workflows/deploy-review.js does not exist)

- [ ] **Step 3: Write `scripts/workflows/deploy-review.js`**

```bash
cat > "<repo-root>/scripts/workflows/deploy-review.js" <<'EOF'
export const meta = {
  name: 'squad-deploy-review',
  description: 'Review a PR diff on quality and security dimensions, verify each finding, and report what blocks the deploy',
  phases: [
    { title: 'Review', detail: 'Code Reviewer and security-review, in parallel' },
    { title: 'Verify', detail: 'adversarially verify every finding from both dimensions' },
  ],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'integer' },
          summary: { type: 'string' },
          failure_scenario: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        },
        required: ['file', 'summary', 'severity'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    real: { type: 'boolean' },
    reasoning: { type: 'string' },
  },
  required: ['real', 'reasoning'],
}

const target = args

const DIMENSIONS = [
  {
    key: 'quality',
    prompt: `Review the diff for ${target.ref} for correctness bugs and reuse/simplification/efficiency issues.`,
    agentType: 'code-reviewer',
  },
  {
    key: 'security',
    prompt: `Invoke the security-review skill against the diff for ${target.ref}, covering the OWASP top 10. Return every finding with severity.`,
  },
]

const results = await pipeline(
  DIMENSIONS,
  (d) => agent(d.prompt, { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA, agentType: d.agentType }),
  (review, d) => parallel(
    (review?.findings ?? []).map((f) => () =>
      agent(
        `Adversarially verify this ${d.key} finding against the actual diff for ${target.ref}: ${f.summary}\n${f.failure_scenario ?? ''}\nDefault to not-real if you cannot confirm it against the code.`,
        { label: `verify:${d.key}:${f.file ?? 'finding'}`, phase: 'Verify', schema: VERDICT_SCHEMA }
      ).then((v) => ({ ...f, dimension: d.key, verdict: v }))
    )
  )
)

const confirmed = results.flat().filter(Boolean).filter((f) => f.verdict?.real)
const blocksDeploy = confirmed.some((f) => f.dimension === 'security')

return { confirmed, blocksDeploy }
EOF
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash scripts/tests/test-deploy-review-workflow-syntax.sh`
Expected: PASS

- [ ] **Step 5: Manual smoke test (not asserted by the automated test)**

In an interactive Claude Code session with this plugin enabled, against a
repo with at least one committed change, invoke:

```
Workflow({ scriptPath: "<path-to-plugin>/scripts/workflows/deploy-review.js", args: { ref: "HEAD~1..HEAD" } })
```

Confirm it returns `{ confirmed: [...], blocksDeploy: <boolean> }` and that
`blocksDeploy` is `true` whenever any confirmed finding has
`dimension === 'security'`.

- [ ] **Step 6: Commit**

```bash
cd "<repo-root>"
git add scripts/workflows/deploy-review.js scripts/tests/test-deploy-review-workflow-syntax.sh
git commit -m "$(cat <<'EOF'
Add squad-deploy-review workflow for the Deploy stage

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SF3g1a2EjrWQKAVcuFLVUa
EOF
)"
```

---

## Task 13: `/squad-advance` command

**Files:**
- Create: `commands/squad-advance.md`
- Test: `scripts/tests/test-squad-advance-command.sh`

**Interfaces:**
- Consumes: `.squad/squad.config.json` schema (Task 10), the `dev-squad-protocol` skill (Task 9), workflow names `squad-build` (Task 11) and `squad-deploy-review` (Task 12), the `release-manager` and `security-preprod` agents (Tasks 6-7).

- [ ] **Step 1: Write the failing test**

```bash
cat > "<repo-root>/scripts/tests/test-squad-advance-command.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/commands/squad-advance.md" description

for term in "dev-squad-protocol" "squad.config.json" "gate_mode" "security-preprod" "production"; do
  grep -qi -- "$term" "$root/commands/squad-advance.md" || { echo "FAIL: squad-advance.md doesn't mention '$term'" >&2; exit 1; }
done

echo "PASS: squad-advance command"
EOF
chmod +x "<repo-root>/scripts/tests/test-squad-advance-command.sh"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/tests/test-squad-advance-command.sh`
Expected: FAIL (commands/squad-advance.md does not exist)

- [ ] **Step 3: Write `commands/squad-advance.md`**

```bash
cat > "<repo-root>/commands/squad-advance.md" <<'EOF'
---
description: Move the active product to its next dev-squad stage, respecting the configured gate mode.
---

Follow the `dev-squad-protocol` skill for the full stage sequence and gate
rules. Concretely, for this invocation:

1. Read `.squad/squad.config.json`. If it doesn't exist, tell the human to
   run `/squad-new` first and stop.
2. Look at `stage`. Run exactly the step the protocol skill defines for the
   current stage, then advance `stage` to the next value in the sequence
   (`plan → design → build → test → deploy → maintain → done`, looping back
   to `plan` after `maintain` produces a new intent).
3. If `gate_mode` is `full`, or this transition is one of the two
   always-gated transitions (`design → build`, anything `→` a production
   deploy), present the resulting artifact to the human and wait for
   explicit approval before writing the new `stage` value. Otherwise, write
   the new `stage` value and continue automatically only if the stage's own
   steps reported success — on any failure, stop and report it instead of
   advancing.
4. Never advance into `deploy` targeting production without the
   `security-preprod` agent having run for this cycle's changes.
EOF
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash scripts/tests/test-squad-advance-command.sh`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd "<repo-root>"
git add commands/squad-advance.md scripts/tests/test-squad-advance-command.sh
git commit -m "$(cat <<'EOF'
Add /squad-advance command

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SF3g1a2EjrWQKAVcuFLVUa
EOF
)"
```

---

## Task 14: `/squad-status` command

**Files:**
- Create: `commands/squad-status.md`
- Test: `scripts/tests/test-squad-status-command.sh`

**Interfaces:**
- Consumes: `.squad/squad.config.json` schema (Task 10).

- [ ] **Step 1: Write the failing test**

```bash
cat > "<repo-root>/scripts/tests/test-squad-status-command.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$root/scripts/tests/check-frontmatter.sh" "$root/commands/squad-status.md" description
grep -q "squad.config.json" "$root/commands/squad-status.md" || { echo "FAIL: doesn't read squad.config.json" >&2; exit 1; }
grep -q "pending_gate" "$root/commands/squad-status.md" || { echo "FAIL: doesn't define the pending_gate output field" >&2; exit 1; }
echo "PASS: squad-status command"
EOF
chmod +x "<repo-root>/scripts/tests/test-squad-status-command.sh"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/tests/test-squad-status-command.sh`
Expected: FAIL (commands/squad-status.md does not exist)

- [ ] **Step 3: Write `commands/squad-status.md`**

```bash
cat > "<repo-root>/commands/squad-status.md" <<'EOF'
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

If a stage is currently blocked (e.g. Release Manager blocked a deploy, or
a gate is waiting on approval), say exactly what's blocking it and what
input would unblock it — never just "blocked."
EOF
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash scripts/tests/test-squad-status-command.sh`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd "<repo-root>"
git add commands/squad-status.md scripts/tests/test-squad-status-command.sh
git commit -m "$(cat <<'EOF'
Add /squad-status command

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SF3g1a2EjrWQKAVcuFLVUa
EOF
)"
```

---

## Task 15: README and full-plugin validation

**Files:**
- Create: `README.md`
- Test: `scripts/tests/test-all.sh` (runs every test script written in Tasks 1-14)

**Interfaces:**
- Consumes: everything from Tasks 1-14 (this task only verifies and documents; it introduces no new interfaces for later tasks since it is the last one).

- [ ] **Step 1: Write the aggregate test runner**

```bash
cat > "<repo-root>/scripts/tests/test-all.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fail=0
for t in "$dir"/test-*.sh; do
  echo "=== $t ==="
  if ! bash "$t"; then
    fail=1
  fi
done
if [[ "$fail" -ne 0 ]]; then
  echo "FAIL: one or more test scripts failed" >&2
  exit 1
fi
echo "PASS: all dev-squad plugin tests"
EOF
chmod +x "<repo-root>/scripts/tests/test-all.sh"
```

- [ ] **Step 2: Run it to verify it fails (README.md doesn't exist yet, but this script has no README dependency — run it now as a checkpoint that everything up to Task 14 still passes)**

Run: `bash scripts/tests/test-all.sh`
Expected: every `=== ... ===` block prints `PASS`, script exits 0. If anything fails here, fix it before continuing — do not add the README on top of a broken plugin.

- [ ] **Step 3: Write `README.md`**

```bash
cat > "<repo-root>/README.md" <<'EOF'
# dev-squad

A Claude Code plugin that runs a feature or MVP through the AI-native SDLC
stages — Plan, Design, Build, Test, Deploy, Maintain — using a squad of
agent personas (Product Owner, Tech Lead, Dev, QA, Code Reviewer, Release
Manager, a dedicated pre-production Security Agent, and a Maintain-stage
Monitor).

## Install

Add this repository to your plugin marketplace list, or reference it
directly, then enable `dev-squad` for your project.

## Use

1. `/squad-new <product-name>` — brainstorm the intent for a new
   product/feature, choose a gate mode, and scaffold `.squad/`.
2. `/squad-advance` — repeatedly, to move the product through each stage.
   The gate mode you chose controls how often you're asked to approve
   before it continues.
3. `/squad-status` — check where the active product is at any time.

See `skills/dev-squad-protocol/SKILL.md` for the full stage-by-stage
protocol, and `docs/superpowers/specs/2026-09-09-dev-squad-design.md` for
the design rationale (security model, AXI compliance, gate modes).

## Security

A secret-scan hook blocks any `git commit` whose staged diff looks like it
contains a credential. A dependency-audit step runs whenever dependency
manifests change. Every spec produced in the Design stage has a mandatory
security section. Every PR gets a security review pass alongside the code
review. A dedicated agent re-checks security specifically before any
production deploy, scoped to what actually changed. See the design spec for
the full table.

## Testing

`bash scripts/tests/test-all.sh` runs every automated test for the plugin's
deterministic scripts, agent/command/skill frontmatter, and workflow script
syntax. Workflow scripts (`scripts/workflows/*.js`) additionally need a
manual smoke test via the Workflow tool — see the comments in each plan
task that introduced them.
EOF
```

- [ ] **Step 4: Run the full suite once more**

Run: `bash scripts/tests/test-all.sh`
Expected: PASS

- [ ] **Step 5: Validate the plugin structure**

Invoke the `plugin-dev:plugin-validator` agent against this repository root
and resolve anything it flags before continuing.

- [ ] **Step 6: Commit**

```bash
cd "<repo-root>"
git add README.md scripts/tests/test-all.sh
git commit -m "$(cat <<'EOF'
Add README and aggregate test runner for the dev-squad plugin

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SF3g1a2EjrWQKAVcuFLVUa
EOF
)"
```
