#!/usr/bin/env bash
# Upload a document to the Blink project's knowledge base
# Usage: upload.sh <file> [--collection <collection_id>]
set -euo pipefail
FILE="${1:-}"
[ -z "$FILE" ] && echo "Usage: upload.sh <file> [--collection <id>]" && exit 1
[ -z "${BLINK_PROJECT_ID:-}" ] && echo "Error: BLINK_PROJECT_ID not set." && exit 1
[ -z "${BLINK_PROJECT_KEY:-}" ] && echo "Error: BLINK_PROJECT_KEY not set." && exit 1

shift  # consume file path, pass remaining flags (--collection) to blink
BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink rag upload "$BLINK_PROJECT_ID" "$FILE" "$@"
