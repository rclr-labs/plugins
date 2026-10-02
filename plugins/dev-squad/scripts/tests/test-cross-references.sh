#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

fail=0
for wf in "$root"/scripts/workflows/*.js; do
  for at in $(grep -oE "agentType: '[^']+'" "$wf" | sed -E "s/agentType: '([^']+)'/\1/"); do
    case "$at" in
      dev-squad:*)
        name="${at#dev-squad:}"
        agent_file="$root/agents/$name.md"
        if [[ ! -f "$agent_file" ]]; then
          echo "FAIL: $wf references agentType '$at' but $agent_file does not exist" >&2
          fail=1
          continue
        fi
        if ! grep -Eq "^name: ${name}\$" "$agent_file"; then
          echo "FAIL: $agent_file does not declare name: $name in its frontmatter" >&2
          fail=1
        fi
        ;;
      *)
        echo "FAIL: $wf uses unqualified agentType '$at' — must be prefixed 'dev-squad:$at'" >&2
        fail=1
        ;;
    esac
  done
done

# An agent whose prompt tells it to invoke another agent needs the Agent tool
# granted in its own frontmatter, scoped to the agent(s) it names. Without it
# the instruction is a dead path that no syntax or frontmatter check catches —
# the delegating agent simply has no way to call anything.
for f in "$root"/agents/*.md "$root"/commands/*.md "$root"/skills/*/SKILL.md; do
  [[ -f "$f" ]] || continue
  frontmatter="$(awk '/^---$/{c++; next} c==1' "$f")"
  body="$(awk '/^---$/{c++; next} c>=2' "$f")"
  for ref in $(grep -oE 'dev-squad:[a-z0-9-]+' "$f" | sort -u); do
    name="${ref#dev-squad:}"
    if [[ ! -f "$root/agents/$name.md" ]]; then
      echo "FAIL: $f references '$ref' but $root/agents/$name.md does not exist" >&2
      fail=1
      continue
    fi
    # Only agent definitions can be granted tools; a command or skill is run by
    # the orchestrating session, which already has agent-spawning ability.
    case "$f" in
      "$root"/agents/*) ;;
      *) continue ;;
    esac
    grep -q "$ref" <<<"$body" || continue
    if ! grep -Eq "^tools:.*Agent(\(|[[:space:]]*(,|$))" <<<"$frontmatter"; then
      echo "FAIL: $f tells the agent to invoke '$ref' but its frontmatter grants no Agent tool" >&2
      fail=1
      continue
    fi
    if grep -Eq "^tools:.*Agent\(" <<<"$frontmatter" && ! grep -q "Agent([^)]*${ref}" <<<"$frontmatter"; then
      echo "FAIL: $f invokes '$ref' but its scoped Agent(...) grant does not include it" >&2
      fail=1
    fi
  done
done

[[ "$fail" -eq 0 ]] || exit 1
echo "PASS: all agentType references are plugin-qualified and resolve to a declared agent"
echo "PASS: every agent that delegates to another agent is granted a matching Agent tool"
