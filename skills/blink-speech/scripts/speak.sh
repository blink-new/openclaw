#!/usr/bin/env bash
# Generate speech audio from text via Blink AI (OpenAI TTS)
# Usage: speak.sh <text> [voice] [model] [format]
# Outputs raw mp3 bytes to stdout — redirect to a file: speak.sh "hello" > out.mp3
set -euo pipefail
TEXT="${1:-}"; VOICE="${2:-alloy}"; MODEL="${3:-tts-1}"; FORMAT="${4:-mp3}"
[ -z "$TEXT" ] && echo "Usage: speak.sh <text> [voice] [model] [format]" && exit 1
BODY=$(python3 -c "
import json, sys
print(json.dumps({'text': sys.argv[1], 'voice': sys.argv[2], 'model': sys.argv[3], 'format': sys.argv[4]}))
" "$TEXT" "$VOICE" "$MODEL" "$FORMAT")
RESPONSE=$(curl -sf -X POST \
  -H "Authorization: Bearer ${BLINK_API_KEY}" \
  -H "x-blink-agent-id: ${BLINK_AGENT_ID}" \
  -H "Content-Type: application/json" \
  "${BLINK_APIS_URL:-https://core.blink.new}/v1/ai/speech" \
  -d "$BODY")
# Decode base64 audio to stdout so caller can redirect to a file
echo "$RESPONSE" | python3 -c "import json,sys,base64; d=json.load(sys.stdin); sys.stdout.buffer.write(base64.b64decode(d['audio_base64']))"
