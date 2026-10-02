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
   deploy), before pausing write a `pending_gate` object into
   `.squad/squad.config.json` describing what's waiting, e.g.
   `{"description": "Approve .squad/spec.md before Build proceeds", "since": "<ISO-8601 timestamp via date -u +%Y-%m-%dT%H:%M:%SZ>"}`,
   then present the resulting artifact to the human and wait for explicit
   approval before writing the new `stage` value. Once approval is given,
   write the new `stage` value and clear `pending_gate` back to `null` in
   the same update. Otherwise (no gate applies), write the new `stage`
   value and continue automatically only if the stage's own steps reported
   success — on any failure, stop and report it instead of advancing.
4. Never advance into `deploy` targeting production without the
   `security-preprod` agent having run for this cycle's changes, and
   never authorize the actual deploy while that run (or the
   `release-manager` agent it feeds into) still has a finding that is
   neither fixed nor logged as an explicitly-authorized exception in
   `.squad/maintain/security-exceptions.md` for this cycle.
