#!/usr/bin/env bash
# Set or update a secret in this agent's vault (or another agent's with --agent flag)
# Usage: set.sh <key> <value> [--agent <agent_id>]
set -euo pipefail
KEY="${1:-}"
VALUE="${2:-}"
[ -z "$KEY" ] && echo "Usage: set.sh <key> <value> [--agent <agent_id>]" && exit 1
[ -z "$VALUE" ] && echo "Error: value is required" && exit 1

shift 2  # consume key + value, pass remaining flags (--agent) to blink
blink secrets set "$KEY" "$VALUE" "$@"
