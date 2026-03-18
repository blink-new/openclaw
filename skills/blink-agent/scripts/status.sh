#!/usr/bin/env bash
# Show status for this agent or a specific agent
# Usage: status.sh [agent_id]
set -euo pipefail
AGENT_ID="${1:-}"

if [ -n "$AGENT_ID" ]; then
  blink agent status "$AGENT_ID"
else
  blink agent status
fi
