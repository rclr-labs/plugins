# Dev Squad Plugin — Design Spec

Date: 2026-09-09

## 1. Goal

Package a reusable "development squad" — Product Owner, Tech Lead, Devs, QA,
Code Reviewer, Release Manager, a pre-prod Security Agent, and a Maintain-stage
Monitor — as a **distributable Claude Code plugin** that can be installed into
any user's or client's own project repo to run feature/MVP work through the
[AI-native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook)
stages: **Plan → Design → Build → Test → Deploy → Maintain**.

The plugin must contain nothing specific to the author's machine, account, or
identity. All paths use `${CLAUDE_PLUGIN_ROOT}`; no hardcoded usernames,
emails, or absolute paths.

## 2. Packaging

Standard plugin layout (per `plugin-dev:plugin-structure`):

```
dev-squad/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── squad-new.md        # /squad-new — start Plan stage for a new product
│   ├── squad-advance.md    # /squad-advance — move to the next stage
│   └── squad-status.md     # /squad-status — AXI-style status of the active product
├── agents/
│   ├── product-owner.md
│   ├── tech-lead.md
│   ├── dev.md               # generic persona, one task per instantiation
│   ├── qa-engineer.md
│   ├── code-reviewer.md
│   ├── release-manager.md
│   ├── security-preprod.md  # dedicated pre-prod security gate
│   └── monitor.md           # Maintain stage
├── skills/
│   └── dev-squad-protocol/
│       └── SKILL.md         # the stage-by-stage protocol; the orchestrating
│                             # session (acting as Scrum Master) follows this
├── scripts/
│   ├── workflows/            # Workflow scripts for the parallelizable stages
│   │   ├── build.js          # Tech Lead task breakdown + parallel devs
│   │   └── deploy-review.js  # Code Reviewer + security-review, in parallel
│   ├── secret-scan.sh        # used by the PreToolUse hook
│   └── dependency-audit.sh   # detects package manager, runs the right audit
├── hooks/
│   └── hooks.json            # PreToolUse: block commits containing secrets
└── README.md
```

`plugin.json` carries `name: "dev-squad"`, `version`, `description`, `author`
left as a template field the installer fills in (not hardcoded to one person).

Distribution: a public or client-shared git repository; installed the normal
plugin way (marketplace entry or direct repo reference). Publishing to a
marketplace is out of scope for v1 — the repo must simply be
plugin-shaped so it *can* be added to one later.

## 3. Where artifacts live

The plugin is installed into the target project's own repo — that repo *is*
the product. Artifacts live under `.squad/` at the repo root:

```
.squad/
├── squad.config.json   # gate mode, product name, max parallel devs
├── intent.md
├── spec.md
├── plan.md
└── maintain/            # incident log; each entry may spawn a new intent.md
```

If `.squad/` already has an active, unfinished product and `/squad-new` is
run again, the command asks whether to archive the old one
(`.squad/archive/<slug>/`) before starting fresh — no silent overwrite.

If the target repo has no git history yet, `/squad-new` asks the user whether
to `git init` before creating `.squad/` — it never does this silently.

## 4. Roles

| Role | Stage(s) | Mechanism |
|---|---|---|
| Originator + you | Plan | Interactive conversation via `superpowers:brainstorming` → `intent.md` |
| Product Owner | Plan (accepts), Design (drafts) | `agents/product-owner.md`, invoked directly (not via Workflow — needs your review loop) |
| Tech Lead / Architect | Design (risk consult), Build (task breakdown, plan approval) | `agents/tech-lead.md` |
| Devs | Build | `agents/dev.md` persona, instantiated N times by `scripts/workflows/build.js` via `parallel()`, one per independent task, isolated worktree when possible |
| QA / Test Engineer | Test | `agents/qa-engineer.md`, pipelined right after each dev's task completes (review → verify pattern) |
| Code Reviewer | Deploy | `agents/code-reviewer.md`, one dimension of `scripts/workflows/deploy-review.js` |
| Security pass (per-PR) | Deploy | `security-review` skill, the other dimension of `deploy-review.js`, running in parallel with Code Reviewer |
| Release Manager | Deploy (gate) | `agents/release-manager.md` — the actual authorization step; enforces commit → push → deploy ordering |
| **Security Agent (pre-prod)** | Deploy, only before a **production** deploy | `agents/security-preprod.md` — scopes itself to what changed since the last prod deploy (see §6) |
| Scrum Master | All | Not a separate agent — the orchestrating session, following `skills/dev-squad-protocol/SKILL.md` |
| Monitor | Maintain | `agents/monitor.md` — given pasted logs/metrics, diagnoses and drafts a new `intent.md`, closing the loop |

## 5. Stage mechanics

- **Plan**: `/squad-new` kicks off a `superpowers:brainstorming`-style
  conversation with you to produce `intent.md`. Human-only stage — no
  Workflow.
- **Design**: Product Owner agent drafts `spec.md` from the accepted
  `intent.md`. **Mandatory, non-optional sections**: authN/authZ model, data
  classification, secrets/config strategy (see §6). For items the Tech Lead
  flags high-risk (technical or security/PII), Tech Lead and/or
  `gdpr-lgpd-compliance-auditor` are consulted before the spec is offered for
  your acceptance.
- **Build**: `scripts/workflows/build.js` — Tech Lead breaks `spec.md` into
  independent tasks and writes `plan.md`; `parallel()` spawns one Dev agent
  per task. "Nothing is implemented without an accepted plan" — the Tech
  Lead's task breakdown is the accepted plan for that run.
- **Test**: QA pipelines behind each dev's output (pipeline: review →
  adversarial verify, matching the `code-review` skill's pattern).
  `scripts/dependency-audit.sh` runs whenever dependencies changed; its
  output (not an LLM opinion) feeds the Deploy gate.
- **Deploy**: `scripts/workflows/deploy-review.js` runs Code Reviewer and the
  `security-review` skill in parallel over the PR diff. Release Manager gates
  merge/authorization. If the target of this deploy is **production**, the
  pre-prod Security Agent (§6) runs after push and before the deploy command,
  per the user's global commit → push → deploy rule.
- **Maintain**: lightweight — you paste production logs/metrics/alerts to
  the Monitor agent, which diagnoses and drafts a new `intent.md`
  (high priority if security-related), re-entering at Plan.

## 6. Security

| Mechanism | Type | Runs | Behavior |
|---|---|---|---|
| Secret scan | Deterministic hook (`hooks/hooks.json` + `scripts/secret-scan.sh`) | `PreToolUse`, matching `git commit` in Bash | Scans the staged diff for credential-like patterns; blocks the commit (non-zero exit) if found. Always on, not agent-dependent. |
| Dependency audit | Deterministic script | Test stage, when dependency manifests changed | Runs the ecosystem-appropriate audit tool (`npm audit`, `pip-audit`, etc.); structured result feeds the Deploy gate. |
| Security section in `spec.md` | Mandatory checklist | Design | AuthN/authZ model, data classification, secrets/config strategy. Cannot be left blank; drafted proactively, not discovered later. |
| Security review pass | Agent (`security-review` skill) | Deploy, every PR | OWASP-top-10-style review of that PR's diff, parallel to Code Reviewer. Any finding blocks the Release Manager gate — not advisory like quality findings. |
| **Pre-prod Security Agent** | Dedicated agent (`agents/security-preprod.md`) | Deploy, only immediately before a **production** deploy, after push and before the deploy command | Looks at everything changed since the last prod deploy and scopes itself dynamically: touched auth/authz → deep auth review; touched personal data/storage → invokes `gdpr-lgpd-compliance-auditor`; touched infra/CORS/env config on the target host (Vercel/Cloud Run/Firebase/etc.) → infra checklist; always re-confirms secret-scan and dependency-audit are clean for this cycle. Blocks the deploy command on any finding. |

## 7. Gate modes

Chosen in `/squad-new` and stored in `squad.config.json`:

- **`full`** — the orchestrating session pauses for your approval after every
  stage handoff (intent → spec → plan → PR → deploy authorization).
- **`critical-only`** — pauses only before Build (spec.md approval) and
  before a production deploy. Build/Test run without pausing in between in
  both modes; parallel Dev/QA work inside a stage is never gated
  individually.

## 8. AXI compliance

Applies to two things, per the AXI principles now recorded in the user's
global CLAUDE.md:

1. **Any CLI the Devs build as part of the product** — Dev agent prompts
   include the AXI principles as design guidance whenever a task involves
   building a CLI surface.
2. **The squad's own internal tooling** — `/squad-status`,
   `dependency-audit.sh` output, etc. use compact/TOON-style output, minimal
   default fields, structured errors, and definitive empty states.

## 9. Commands

- `/squad-new <product-name>` — Plan stage: brainstorm intent, ask gate mode,
  check/offer git init, scaffold `.squad/`.
- `/squad-advance` — move the active product to its next stage, respecting
  the configured gate mode.
- `/squad-status` — AXI-style compact summary of the active product's current
  stage, artifacts, and any pending gate.

## 10. Out of scope (v1)

- Publishing to a plugin marketplace (repo is plugin-shaped so this can
  happen later without restructuring).
- Multiple concurrent products in a single repo (single active product under
  `.squad/`, with archive-on-restart).
- Full autonomous production monitoring infrastructure — Maintain stage is
  human-triggered (you paste logs/metrics) rather than a running watcher.
