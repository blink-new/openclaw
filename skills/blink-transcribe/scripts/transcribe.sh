#!/usr/bin/env bash
# Transcribe audio via Blink AI (Whisper)
# Usage: transcribe.sh <audio_url> [language] [model]
set -euo pipefail
AUDIO_URL="${1:-}"; LANGUAGE="${2:-}"; MODEL="${3:-fal-ai/whisper}"
[ -z "$AUDIO_URL" ] && echo "Usage: transcribe.sh <audio_url> [language] [model]" && exit 1
BODY=$(python3 -c "
import json, sys
d = {'audio_url': sys.argv[1], 'model': sys.argv[3]}
if sys.argv[2]: d['language'] = sys.argv[2]
print(json.dumps(d))
" "$AUDIO_URL" "$LANGUAGE" "$MODEL")
curl -sf -X POST \
  -H "Authorization: Bearer ${BLINK_API_KEY}" \
  -H "x-blink-agent-id: ${BLINK_AGENT_ID}" \
  -H "Content-Type: application/json" \
  "${BLINK_APIS_URL:-https://core.blink.new}/v1/ai/transcribe" \
  -d "$BODY"
