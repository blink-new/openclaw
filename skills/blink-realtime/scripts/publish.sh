#!/usr/bin/env bash
# Publish an event to a Blink app's realtime channel
# Usage: publish.sh <channel> <json_data>
set -euo pipefail
CHANNEL="${1:-}"
DATA="${2:-}"

[ -z "$CHANNEL" ] && echo "Usage: publish.sh <channel> <json_data>" && exit 1
[ -z "$DATA" ] && echo "Error: json_data is required" && exit 1
[ -z "${BLINK_PROJECT_ID:-}" ] && echo "Error: BLINK_PROJECT_ID not set. Run: blink secrets set BLINK_PROJECT_ID proj_xxx" && exit 1
[ -z "${BLINK_PROJECT_KEY:-}" ] && echo "Error: BLINK_PROJECT_KEY not set." && exit 1

BLINK_PROJECT_KEY="$BLINK_PROJECT_KEY" blink realtime publish "$BLINK_PROJECT_ID" "$CHANNEL" "$DATA"
