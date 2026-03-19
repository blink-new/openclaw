---
name: blink-transcribe
description: >
  Transcribe audio files to text using Blink AI (Whisper). Accepts any public
  audio URL (mp3, wav, ogg, m4a, webm). Returns transcribed text with
  timestamps and speaker detection. Use when asked to transcribe audio,
  convert speech to text, or extract text from voice recordings.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"] } }
---

# Blink Transcribe (Speech-to-Text)

Transcribe audio files using Blink AI (Whisper). No API key setup needed —
charged to your Blink workspace credits.

## Transcribe a local file (most common — agent has the file on disk)
```bash
blink ai transcribe /data/recording.mp3
blink ai transcribe /tmp/voice_note.wav
blink ai transcribe /data/meeting.m4a --language en
```

## Transcribe a public URL
```bash
blink ai transcribe "https://example.com/podcast.mp3"
blink ai transcribe "https://example.com/lecture.mp3" --language fr
```

## Save transcript to file
```bash
blink ai transcribe "https://example.com/meeting.mp3" | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['text'])" > /data/transcript.txt
```

## Get transcript with timestamps
```bash
RESULT=$(blink ai transcribe "https://example.com/audio.mp3")
echo "$RESULT" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('=== Transcript ===')
print(data['text'])
print()
print('=== Segments ===')
for seg in (data.get('segments') or []):
    print(f\"[{seg['start']:.1f}s - {seg['end']:.1f}s] {seg['text']}\")
"
```

## Supported audio formats
mp3, wav, ogg, m4a, webm, flac, aac — local files or public HTTPS URLs

## Common use cases
- "Transcribe this Zoom recording" → transcribe audio URL
- "Convert this voice note to text" → transcribe, print text
- "What did they say in this podcast episode?" → transcribe + summarize
- "Transcribe my meeting notes" → transcribe, save to file
