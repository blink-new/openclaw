#!/usr/bin/env bash
# Upload a file to the linked project's storage
# Usage: storage-upload.sh <local_file> [storage_path]
set -euo pipefail
FILE="${1:-}"
STORAGE_PATH="${2:-}"
[ -z "$FILE" ] && echo "Usage: storage-upload.sh <local_file> [storage_path]" && exit 1
[ -z "${BLINK_PROJECT_ID:-}" ] && echo "Error: BLINK_PROJECT_ID not set." && exit 1
[ -z "${BLINK_PROJECT_KEY:-}" ] && echo "Error: BLINK_PROJECT_KEY not set." && exit 1

if [ -n "$STORAGE_PATH" ]; then
  BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink storage upload "$BLINK_PROJECT_ID" "$FILE" --path "$STORAGE_PATH"
else
  BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink storage upload "$BLINK_PROJECT_ID" "$FILE"
fi
