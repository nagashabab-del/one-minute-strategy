#!/usr/bin/env bash
set -euo pipefail

ALIAS_DOMAIN="${1:-one-minute-strategy-saas-poc-staging.vercel.app}"

echo "Deploying preview to Vercel..."
DEPLOY_OUTPUT="$(npx vercel --yes 2>&1)"
echo "$DEPLOY_OUTPUT"

if command -v rg >/dev/null 2>&1; then
  PREVIEW_URL="$(printf '%s\n' "$DEPLOY_OUTPUT" | rg -o 'https://[^ ]+\.vercel\.app' | tail -n1)"
else
  PREVIEW_URL="$(printf '%s\n' "$DEPLOY_OUTPUT" | grep -Eo 'https://[^ ]+\.vercel\.app' | tail -n1)"
fi

if [ -z "$PREVIEW_URL" ]; then
  echo "Failed to detect preview URL from Vercel output." >&2
  exit 1
fi

echo "Assigning stable staging alias..."
npx vercel alias set "$PREVIEW_URL" "$ALIAS_DOMAIN"

echo "Done."
echo "Staging URL: https://$ALIAS_DOMAIN"
