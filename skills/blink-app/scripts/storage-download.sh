#!/usr/bin/env bash
# Download a file from the linked project's storage
# Usage: storage-download.sh <storage_path> [output_file]
set -euo pipefail
STORAGE_PATH="${1:-}"
OUTPUT="${2:-}"
[ -z "$STORAGE_PATH" ] && echo "Usage: storage-download.sh <storage_path> [output_file]" && exit 1
[ -z "${BLINK_PROJECT_ID:-}" ] && echo "Error: BLINK_PROJECT_ID not set." && exit 1
[ -z "${BLINK_PROJECT_KEY:-}" ] && echo "Error: BLINK_PROJECT_KEY not set." && exit 1

if [ -n "$OUTPUT" ]; then
  BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink storage download "$STORAGE_PATH" "$OUTPUT"
else
  BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink storage download "$STORAGE_PATH"
fi
