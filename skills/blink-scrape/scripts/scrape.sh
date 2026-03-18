#!/usr/bin/env bash
# Scrape a webpage and optionally extract data with AI
# Usage: scrape.sh <url> [--text] [--extract <instructions>] [--json]
set -euo pipefail
URL="${1:-}"
[ -z "$URL" ] && echo "Usage: scrape.sh <url> [--text] [--extract <instructions>] [--json]" && exit 1

shift  # consume url, pass remaining flags to blink scrape
blink scrape "$URL" "$@"
