#!/usr/bin/env bash
# Output shell export to set active agent — use with eval
# Usage: eval $(bash scripts/use.sh <agent_id>)
set -euo pipefail
AGENT_ID="${1:-}"
[ -z "$AGENT_ID" ] && echo "Usage: use.sh <agent_id>" && exit 1
blink agent use "$AGENT_ID" --export
