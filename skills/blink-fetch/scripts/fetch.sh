#!/usr/bin/env bash
# Fetch any URL via Blink proxy
# Usage: fetch.sh <url> [METHOD] [json_body] [header_key_value]
set -euo pipefail
URL="${1:-}"
METHOD="${2:-GET}"
BODY="${3:-}"
HEADER="${4:-}"

[ -z "$URL" ] && echo "Usage: fetch.sh <url> [METHOD] [json_body] [header]" && exit 1

if [ -n "$BODY" ] && [ -n "$HEADER" ]; then
  blink fetch "$URL" --method "$METHOD" --body "$BODY" --header "$HEADER"
elif [ -n "$BODY" ]; then
  blink fetch "$URL" --method "$METHOD" --body "$BODY"
elif [ -n "$HEADER" ]; then
  blink fetch "$URL" --method "$METHOD" --header "$HEADER"
else
  blink fetch "$URL" --method "$METHOD"
fi
