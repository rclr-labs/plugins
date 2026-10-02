#!/usr/bin/env bash
# PostToolUse hook: emit an OpenTelemetry-style span for a tool use, so the
# dev-squad has the same "what actually ran" record the F1 squad has.
#
# Off by default: set DEV_SQUAD_TELEMETRY=1 to collect. Never fails — a hook
# that blocks a tool would be worse than no telemetry.
set -euo pipefail

[[ "${DEV_SQUAD_TELEMETRY:-0}" == "1" ]] || exit 0

payload="$(cat || true)"

python3 - "$payload" <<'PY' || true
import json
import os
import pathlib
import sys
import time
import uuid

try:
    data = json.loads(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1] else {}
except Exception:
    raise SystemExit(0)

tool = str(data.get("tool_name") or "")
if not tool:
    raise SystemExit(0)

tool_input = data.get("tool_input") or {}
command = str(tool_input.get("command") or "")[:400]

base = pathlib.Path(os.environ.get(
    "DEV_SQUAD_DATA_DIR", pathlib.Path.home() / ".local" / "share" / "dev-squad"))
spans = base / "telemetry" / "spans.jsonl"
now = time.time_ns()

span = {
    "trace_id": uuid.uuid4().hex,
    "span_id": uuid.uuid4().hex[:16],
    "parent_span_id": "",
    "name": f"execute_tool {tool}",
    "kind": "INTERNAL",
    "start_unix_nano": str(now),
    "end_unix_nano": str(now),
    "status_code": "OK",
    "status_message": "",
    "attributes": {
        "gen_ai.operation.name": "execute_tool",
        "gen_ai.tool.name": tool,
        "dev_squad.command": command,
        "dev_squad.session_id": str(data.get("session_id") or ""),
    },
    "events": [],
    "resource": {"service.name": "dev-squad"},
}

try:
    spans.parent.mkdir(parents=True, exist_ok=True)
    with spans.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(span, ensure_ascii=False) + "\n")
except OSError:
    pass
PY

exit 0
