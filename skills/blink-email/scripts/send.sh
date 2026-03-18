#!/usr/bin/env bash
# Send an email via the linked Blink project
# Usage: send.sh <to> <subject> [body] [html_file]
set -euo pipefail
TO="${1:-}"
SUBJECT="${2:-}"
BODY="${3:-}"
HTML_FILE="${4:-}"

[ -z "$TO" ] && echo "Usage: send.sh <to> <subject> [body] [html_file]" && exit 1
[ -z "$SUBJECT" ] && echo "Error: subject is required" && exit 1
[ -z "${BLINK_PROJECT_ID:-}" ] && echo "Error: BLINK_PROJECT_ID not set. Run: blink secrets set BLINK_PROJECT_ID proj_xxx" && exit 1
[ -z "${BLINK_PROJECT_KEY:-}" ] && echo "Error: BLINK_PROJECT_KEY not set." && exit 1

if [ -n "$HTML_FILE" ]; then
  BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink notify email "$BLINK_PROJECT_ID" "$TO" "$SUBJECT" --file "$HTML_FILE"
else
  BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink notify email "$BLINK_PROJECT_ID" "$TO" "$SUBJECT" "$BODY"
fi
