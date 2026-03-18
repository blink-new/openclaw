#!/usr/bin/env bash
# List secret key names for this agent (or another agent with --agent flag)
# Usage: list.sh [--agent <agent_id>]
set -euo pipefail
blink secrets list "$@"
