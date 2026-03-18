#!/usr/bin/env bash
# List files in the linked project's storage
# Usage: storage-list.sh [prefix]
set -euo pipefail
PREFIX="${1:-}"
[ -z "${BLINK_PROJECT_ID:-}" ] && echo "Error: BLINK_PROJECT_ID not set." && exit 1
[ -z "${BLINK_PROJECT_KEY:-}" ] && echo "Error: BLINK_PROJECT_KEY not set." && exit 1

if [ -n "$PREFIX" ]; then
  BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink storage list "$BLINK_PROJECT_ID" "$PREFIX"
else
  BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink storage list "$BLINK_PROJECT_ID"
fi
