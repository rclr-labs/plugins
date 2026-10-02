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
