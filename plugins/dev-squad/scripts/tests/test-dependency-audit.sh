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

# summarize_pip_json: zero vulnerabilities
out="$(echo '[]' | (source "$audit"; summarize_pip_json))"
[[ "$out" == "dependency-audit: manager=pip, vulnerabilities=0" ]] || { echo "FAIL: got '$out'" >&2; exit 1; }

# summarize_pip_json: some vulnerabilities
out="$(echo '[{"name": "foo", "version": "1.0"}]' | (source "$audit"; summarize_pip_json))"
[[ "$out" == "dependency-audit: manager=pip, vulnerabilities=1" ]] || { echo "FAIL: got '$out'" >&2; exit 1; }

# main: no manifest -> clean deterministic message, exit 0
out="$("$audit" "$work/empty-proj")"
[[ "$out" == "dependency-audit: manager=none, result=no-manifest-found" ]] || { echo "FAIL: got '$out'" >&2; exit 1; }

echo "PASS: dependency-audit.sh"
