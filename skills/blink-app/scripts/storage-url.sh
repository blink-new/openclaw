#!/usr/bin/env bash
# Get public CDN URL for a file in the linked project's storage
# Usage: storage-url.sh <storage_path>
set -euo pipefail
PATH_ARG="${1:-}"
[ -z "$PATH_ARG" ] && echo "Usage: storage-url.sh <storage_path>" && exit 1
[ -z "${BLINK_PROJECT_ID:-}" ] && echo "Error: BLINK_PROJECT_ID not set." && exit 1
[ -z "${BLINK_PROJECT_KEY:-}" ] && echo "Error: BLINK_PROJECT_KEY not set." && exit 1

BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink storage url "$PATH_ARG"
