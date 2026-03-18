#!/usr/bin/env bash
# List RAG collections in the linked project
set -euo pipefail
[ -z "${BLINK_PROJECT_ID:-}" ] && echo "Error: BLINK_PROJECT_ID not set." && exit 1
[ -z "${BLINK_PROJECT_KEY:-}" ] && echo "Error: BLINK_PROJECT_KEY not set." && exit 1

BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink rag collections "$BLINK_PROJECT_ID"
