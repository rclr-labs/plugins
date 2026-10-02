#!/usr/bin/env bash
set -euo pipefail
dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fail=0
for t in "$dir"/test-*.sh; do
  [[ "$(basename "$t")" == "test-all.sh" ]] && continue
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
