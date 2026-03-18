#!/usr/bin/env bash
# List all Claw agents in the workspace
# Usage: list.sh [--json]
set -euo pipefail
blink agent list "$@"
