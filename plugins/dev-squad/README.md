# dev-squad

A Claude Code plugin that runs a feature or MVP through the AI-native SDLC
stages — Plan, Design, Build, Test, Deploy, Maintain — using a squad of
agent personas (Product Owner, Tech Lead, Dev, QA, Code Reviewer, Release
Manager, a dedicated pre-production Security Agent, and a Maintain-stage
Monitor), plus a GDPR/LGPD Compliance Auditor that Tech Lead and the
Security Agent invoke whenever a spec item or diff touches personal data.

## Install

This repo is plugin-shaped and can be installed via a plugin marketplace entry
once one exists, or referenced directly by local path today — either way, enable
`dev-squad` for your project once installed.

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

## Telemetry (optional)

A `PostToolUse` hook (`scripts/hook-otel-span.sh`) emits one OpenTelemetry-style
span per Bash tool use to `~/.local/share/dev-squad/telemetry/spans.jsonl`, with
`gen_ai.operation.name=execute_tool` and `gen_ai.tool.name` — the same shape the
F1 squad produces. Off by default; enable with `DEV_SQUAD_TELEMETRY=1`.

## Testing

`bash scripts/tests/test-all.sh` runs every automated test for the plugin's
deterministic scripts, agent/command/skill frontmatter, agent-to-agent tool
grants, and workflow script syntax. CI runs the same command on every pull
request and on pushes to `main` (`.github/workflows/tests.yml`).

Workflow scripts (`scripts/workflows/*.js`) additionally need a manual smoke
test via the Workflow tool — their syntax is checked, their runtime behavior
is not. See the comments in each plan task that introduced them.
