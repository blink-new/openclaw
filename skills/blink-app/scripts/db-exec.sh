#!/usr/bin/env bash
# Execute a SQL file against the linked Blink project's database
# Usage: db-exec.sh <file.sql>
set -euo pipefail
FILE="${1:-}"
[ -z "$FILE" ] && echo "Usage: db-exec.sh <file.sql>" && exit 1
[ -z "${BLINK_PROJECT_ID:-}" ] && echo "Error: BLINK_PROJECT_ID not set." && exit 1
[ -z "${BLINK_PROJECT_KEY:-}" ] && echo "Error: BLINK_PROJECT_KEY not set." && exit 1

BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink db exec "$BLINK_PROJECT_ID" "$FILE"
