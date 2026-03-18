#!/usr/bin/env bash
# List tables or rows in the linked project's database
# Usage: db-list.sh [table]
set -euo pipefail
TABLE="${1:-}"
[ -z "${BLINK_PROJECT_ID:-}" ] && echo "Error: BLINK_PROJECT_ID not set." && exit 1
[ -z "${BLINK_PROJECT_KEY:-}" ] && echo "Error: BLINK_PROJECT_KEY not set." && exit 1

if [ -n "$TABLE" ]; then
  BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink db list "$BLINK_PROJECT_ID" "$TABLE"
else
  BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink db list "$BLINK_PROJECT_ID"
fi
