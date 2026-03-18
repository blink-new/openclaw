#!/usr/bin/env bash
# Search the Blink project's knowledge base
# Usage: search.sh <query> [--ai] [--limit N]
set -euo pipefail
QUERY="${1:-}"
[ -z "$QUERY" ] && echo "Usage: search.sh <query> [--ai] [--limit N]" && exit 1
[ -z "${BLINK_PROJECT_ID:-}" ] && echo "Error: BLINK_PROJECT_ID not set. Run: blink secrets set BLINK_PROJECT_ID proj_xxx" && exit 1
[ -z "${BLINK_PROJECT_KEY:-}" ] && echo "Error: BLINK_PROJECT_KEY not set." && exit 1

shift  # consume query, pass remaining flags (--ai, --limit) to blink
BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink rag search "$BLINK_PROJECT_ID" "$QUERY" "$@"
