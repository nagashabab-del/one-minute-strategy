#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 <release-tag> [output-file]" >&2
  exit 1
fi

for required_cmd in git gh python3; do
  if ! command -v "$required_cmd" >/dev/null 2>&1; then
    echo "Missing required command: $required_cmd" >&2
    exit 1
  fi
done

TAG="$1"
OUTPUT_FILE="${2:-docs/release_verification_${TAG}.md}"
TEMPLATE_FILE="docs/release_verification_template.md"

if [[ ! -f "$TEMPLATE_FILE" ]]; then
  echo "Template file not found: $TEMPLATE_FILE" >&2
  exit 1
fi

GENERATED_AT_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
REPORT_DATE="$(date -u +"%Y-%m-%d")"

REMOTE_URL="$(git remote get-url origin)"
REPOSITORY="$REMOTE_URL"
REPOSITORY="${REPOSITORY#git@github.com:}"
REPOSITORY="${REPOSITORY#https://github.com/}"
REPOSITORY="${REPOSITORY%.git}"

if ! AUTH_STATUS_OUTPUT="$(gh auth status 2>&1)"; then
  AUTH_STATUS_OUTPUT="$(printf "%s\n\n%s" "$AUTH_STATUS_OUTPUT" "NOTE: gh auth status returned non-zero exit code.")"
fi

if ! RELEASE_JSON_OUTPUT="$(gh release view "$TAG" --json url,tagName,name,isDraft,isPrerelease 2>&1)"; then
  echo "Failed to fetch release metadata for tag: $TAG" >&2
  echo "$RELEASE_JSON_OUTPUT" >&2
  exit 1
fi

release_fields="$(
  RELEASE_JSON="$RELEASE_JSON_OUTPUT" python3 - <<'PY'
import json
import os

data = json.loads(os.environ["RELEASE_JSON"])
separator = "\x1f"
print(separator.join([
    str(data.get("url", "")),
    str(data.get("name", "")),
    str(data.get("isDraft", "")).lower(),
    str(data.get("isPrerelease", "")).lower(),
]))
PY
)"
IFS=$'\x1f' read -r RELEASE_URL RELEASE_NAME IS_DRAFT IS_PRERELEASE <<<"$release_fields"
RELEASE_URL="${RELEASE_URL:-}"
RELEASE_NAME="${RELEASE_NAME:-}"
IS_DRAFT="${IS_DRAFT:-unknown}"
IS_PRERELEASE="${IS_PRERELEASE:-unknown}"

if [[ "$IS_DRAFT" == "false" && "$IS_PRERELEASE" == "false" ]]; then
  RELEASE_PUBLISHED="true"
else
  RELEASE_PUBLISHED="false"
fi

origin_head_ref="$(git symbolic-ref -q --short refs/remotes/origin/HEAD || true)"
if [[ -n "$origin_head_ref" ]]; then
  DEFAULT_BRANCH="${origin_head_ref#origin/}"
else
  DEFAULT_BRANCH="main"
fi

REMOTE_HEAD_COMMAND="git ls-remote ${REMOTE_URL} refs/heads/${DEFAULT_BRANCH}"
REMOTE_HEAD_OUTPUT="$(git ls-remote "$REMOTE_URL" "refs/heads/${DEFAULT_BRANCH}" 2>&1 || true)"

remote_head_sha="$(printf "%s\n" "$REMOTE_HEAD_OUTPUT" | awk 'NR==1 {print $1}')"
if [[ "$remote_head_sha" =~ ^[0-9a-f]{40}$ ]]; then
  REMOTE_HEAD_SHORT="${remote_head_sha:0:7}"
else
  REMOTE_HEAD_SHORT="N/A"
fi

if ! LOCAL_HEAD_SHORT="$(git rev-parse --short HEAD 2>/dev/null)"; then
  LOCAL_HEAD_SHORT="N/A"
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

export REPORT_DATE
export GENERATED_AT_UTC
export REPOSITORY
export TAG
export AUTH_STATUS_OUTPUT
export RELEASE_JSON_OUTPUT
export RELEASE_NAME
export RELEASE_URL
export RELEASE_PUBLISHED
export IS_DRAFT
export IS_PRERELEASE
export REMOTE_HEAD_COMMAND
export REMOTE_HEAD_OUTPUT
export LOCAL_HEAD_SHORT
export DEFAULT_BRANCH
export REMOTE_HEAD_SHORT

python3 - "$TEMPLATE_FILE" "$OUTPUT_FILE" <<'PY'
import os
import sys
from pathlib import Path

template_path = Path(sys.argv[1])
output_path = Path(sys.argv[2])

content = template_path.read_text()
replacements = {
    "{{REPORT_DATE}}": os.environ["REPORT_DATE"],
    "{{GENERATED_AT_UTC}}": os.environ["GENERATED_AT_UTC"],
    "{{REPOSITORY}}": os.environ["REPOSITORY"],
    "{{TAG}}": os.environ["TAG"],
    "{{AUTH_STATUS_OUTPUT}}": os.environ["AUTH_STATUS_OUTPUT"],
    "{{RELEASE_JSON_OUTPUT}}": os.environ["RELEASE_JSON_OUTPUT"],
    "{{RELEASE_NAME}}": os.environ["RELEASE_NAME"],
    "{{RELEASE_URL}}": os.environ["RELEASE_URL"],
    "{{RELEASE_PUBLISHED}}": os.environ["RELEASE_PUBLISHED"],
    "{{IS_DRAFT}}": os.environ["IS_DRAFT"],
    "{{IS_PRERELEASE}}": os.environ["IS_PRERELEASE"],
    "{{REMOTE_HEAD_COMMAND}}": os.environ["REMOTE_HEAD_COMMAND"],
    "{{REMOTE_HEAD_OUTPUT}}": os.environ["REMOTE_HEAD_OUTPUT"],
    "{{LOCAL_HEAD_SHORT}}": os.environ["LOCAL_HEAD_SHORT"],
    "{{DEFAULT_BRANCH}}": os.environ["DEFAULT_BRANCH"],
    "{{REMOTE_HEAD_SHORT}}": os.environ["REMOTE_HEAD_SHORT"],
}

for placeholder, value in replacements.items():
    content = content.replace(placeholder, value)

output_path.write_text(content)
PY

echo "Generated release verification report: $OUTPUT_FILE"
