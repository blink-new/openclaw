---
name: blink-speech
description: >
  Generate speech audio from text using Blink AI (OpenAI TTS). Converts text
  to natural-sounding voice audio. Returns an mp3 file you can save and share.
  Use when asked to speak text aloud, create voice messages, narrate content,
  or generate audio from text. Charged to Blink workspace credits.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"] } }
---

# Blink Speech (Text-to-Speech)

Generate natural-sounding speech from text using Blink AI (OpenAI TTS).
No API key needed — charged to your workspace credits.

## Generate speech and save to file
```bash
blink ai speech "Hello! This is your AI agent speaking." --voice alloy --output /data/speech.mp3
```

## Choose a different voice
```bash
blink ai speech "Good morning! Here's your daily briefing." --voice nova --output /data/briefing.mp3
```

## Available voices
| Voice | Character |
|-------|----------|
| `alloy` | Neutral, balanced (default) |
| `echo` | Male, clear |
| `fable` | Storytelling, expressive |
| `onyx` | Deep, authoritative |
| `nova` | Warm, female |
| `shimmer` | Soft, female |

## Read a text file aloud
```bash
TEXT=$(cat /data/report.txt | head -c 4000)
blink ai speech "$TEXT" --voice alloy --output /data/report_audio.mp3
echo "Saved to /data/report_audio.mp3"
```

## Common use cases
- "Read this summary aloud" → generate speech, save file
- "Create a voice message saying X" → speak text, save mp3
- "Narrate this blog post" → read text, generate audio file
- "Make my agent greet users with voice" → generate welcome audio

## Notes
- Max input: 4096 characters per call (split longer text)
- Output is saved as mp3 by default
