#!/usr/bin/env bash
# Delete a secret from this agent's vault (or another agent's with --agent flag)
# Usage: delete.sh <key> [--agent <agent_id>]
set -euo pipefail
KEY="${1:-}"
[ -z "$KEY" ] && echo "Usage: delete.sh <key> [--agent <agent_id>]" && exit 1

shift  # consume key, pass remaining flags (--agent) to blink
blink secrets delete "$KEY" --yes "$@"
