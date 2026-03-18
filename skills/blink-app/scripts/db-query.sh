#!/usr/bin/env bash
# Query the linked Blink project's database
# Usage: db-query.sh <sql>
# Requires: BLINK_PROJECT_ID and BLINK_PROJECT_KEY env vars (set as agent secrets)
set -euo pipefail
SQL="${1:-}"
[ -z "$SQL" ] && echo "Usage: db-query.sh <sql>" && exit 1
[ -z "${BLINK_PROJECT_ID:-}" ] && echo "Error: BLINK_PROJECT_ID not set. Run: blink secrets set BLINK_PROJECT_ID proj_xxx" && exit 1
[ -z "${BLINK_PROJECT_KEY:-}" ] && echo "Error: BLINK_PROJECT_KEY not set. Run: blink secrets set BLINK_PROJECT_KEY blnk_sk_xxx" && exit 1

BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink db query "$BLINK_PROJECT_ID" "$SQL"
