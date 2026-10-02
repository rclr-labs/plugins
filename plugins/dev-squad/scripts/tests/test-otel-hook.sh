#!/usr/bin/env bash
# The telemetry hook is off by default and, when enabled, emits an
# OpenTelemetry-style span with the GenAI tool attributes.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
hook="$root/scripts/hook-otel-span.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
export DEV_SQUAD_DATA_DIR="$WORK/data"
payload='{"tool_name":"Bash","tool_input":{"command":"npm test"},"session_id":"s1"}'

[[ -f "$hook" ]] || { echo "FAIL: $hook missing" >&2; exit 1; }

# disabled by default: nothing is written
printf '%s' "$payload" | bash "$hook"
[[ ! -f "$WORK/data/telemetry/spans.jsonl" ]] || { echo "FAIL: emitted while disabled" >&2; exit 1; }

# enabled: a span with the GenAI attributes is written
printf '%s' "$payload" | DEV_SQUAD_TELEMETRY=1 bash "$hook"
spans="$WORK/data/telemetry/spans.jsonl"
grep -q '"gen_ai.operation.name": "execute_tool"' "$spans" || { echo "FAIL: missing execute_tool" >&2; exit 1; }
grep -q '"gen_ai.tool.name": "Bash"' "$spans" || { echo "FAIL: missing tool name" >&2; exit 1; }
grep -q '"service.name": "dev-squad"' "$spans" || { echo "FAIL: missing service name" >&2; exit 1; }

# a malformed payload never fails the hook
echo 'not json' | DEV_SQUAD_TELEMETRY=1 bash "$hook"

echo "PASS: otel span hook"
