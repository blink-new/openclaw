#!/usr/bin/env bash
# Transcribe audio via Blink AI (Whisper)
# Usage: transcribe.sh <file_or_url> [language] [model]
#   file_or_url: local file path (/data/audio.mp3) OR public https:// URL
# Examples:
#   transcribe.sh /data/recording.mp3
#   transcribe.sh /data/meeting.wav en
#   transcribe.sh https://example.com/podcast.mp3 fr
set -euo pipefail
INPUT="${1:-}"; LANGUAGE="${2:-}"; MODEL="${3:-fal-ai/whisper}"
[ -z "$INPUT" ] && echo "Usage: transcribe.sh <file_or_url> [language] [model]" && exit 1

BODY=$(python3 - "$INPUT" "$LANGUAGE" "$MODEL" << 'PYEOF'
import json, sys, os, base64, mimetypes

inp, lang, model = sys.argv[1], sys.argv[2], sys.argv[3]
d = {'model': model}
if lang:
    d['language'] = lang

if inp.startswith('http://') or inp.startswith('https://'):
    d['audio_url'] = inp
else:
    # Local file: read and base64 encode
    if not os.path.isfile(inp):
        print(f"Error: file not found: {inp}", file=sys.stderr); sys.exit(1)
    mime, _ = mimetypes.guess_type(inp)
    d['audio_data'] = base64.b64encode(open(inp, 'rb').read()).decode()
    d['audio_mime'] = mime or 'audio/mp3'

print(json.dumps(d))
PYEOF
)

curl -sf -X POST \
  -H "Authorization: Bearer ${BLINK_API_KEY}" \
  -H "x-blink-agent-id: ${BLINK_AGENT_ID}" \
  -H "Content-Type: application/json" \
  "${BLINK_APIS_URL:-https://core.blink.new}/v1/ai/transcribe" \
  -d "$BODY"
