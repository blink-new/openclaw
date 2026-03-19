---
name: blink-video
description: >
  Generate videos from text prompts (text-to-video) or animate an existing
  image (image-to-video). Uses fal.ai models (Veo 3.1, Sora 2, Kling 2.6)
  via Blink AI Gateway. Returns a video URL.
  Use when asked to create, animate, or generate any video.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"] } }
---

# Blink Video Generation

Generate videos from text descriptions or animate existing images.
Videos are charged to your Blink workspace credits (billed per second of video).

## Generate a video from text (default: Veo 3.1 fast, 5s)
```bash
blink ai video "Ocean waves crashing on a rocky shore at sunset"
```

## Generate with specific duration
```bash
blink ai video "A hummingbird feeding from a flower in slow motion" --model fal-ai/veo3.1/fast --duration 8s
```

## Generate portrait video (9:16, for Reels/TikTok/Shorts)
```bash
blink ai video "A person walking through autumn leaves" --model fal-ai/veo3.1/fast --duration 6s
```

## Use Sora 2 (OpenAI) for maximum quality
```bash
blink ai video "A cinematic fly-through of a futuristic city at night" --model fal-ai/sora-2/text-to-video/pro --duration 10s
```

## Animate an existing image (image-to-video)
```bash
blink ai animate "Make the clouds move and the water ripple" "https://example.com/landscape.jpg"
```

## Animate with Veo 3.1 (best quality image-to-video)
```bash
blink ai animate "Gentle camera pan across the scene" "https://example.com/photo.jpg" --model fal-ai/veo3.1/image-to-video --duration 6s
```

## Animate a LOCAL file (user uploaded a photo via Telegram/Discord/Slack)
When a user sends you a photo attachment, OpenClaw saves it to disk. `blink ai animate` handles local files directly — no separate upload step needed:
```bash
blink ai animate "Add gentle motion, camera slowly panning right" /data/agents/main/agent/photo.jpg
```

## Animate a local file with specific model and duration
```bash
blink ai animate "Dramatic cinematic movement, slow zoom in" /data/agents/main/agent/photo.jpg \
  --model fal-ai/veo3.1/image-to-video --duration 8s
```

## Find where OpenClaw saved an attachment
```bash
ls -lt /data/agents/main/agent/ | head -10
```

## Models available

### Text-to-Video
| Model | Quality | Default duration |
|-------|---------|-----------------|
| `fal-ai/veo3.1/fast` | ⭐⭐⭐⭐ Fast | 5s — **DEFAULT** |
| `fal-ai/veo3.1` | ⭐⭐⭐⭐⭐ Best | 5–8s |
| `fal-ai/veo3/fast` | ⭐⭐⭐ Previous gen | 5s |
| `fal-ai/veo3` | ⭐⭐⭐⭐ Previous gen | 5–8s |
| `fal-ai/sora-2/text-to-video/pro` | ⭐⭐⭐⭐⭐ OpenAI | 5–20s |
| `fal-ai/kling-video/v2.6/pro/text-to-video` | ⭐⭐⭐⭐ | 5–10s |
| `fal-ai/kling-video/v2.5-turbo/pro/text-to-video` | ⭐⭐⭐ Fast | 5–10s |

### Image-to-Video
| Model | Quality |
|-------|---------|
| `fal-ai/veo3.1/fast/image-to-video` | ⭐⭐⭐⭐ — **DEFAULT for I2V** |
| `fal-ai/veo3.1/image-to-video` | ⭐⭐⭐⭐⭐ |
| `fal-ai/sora-2/image-to-video/pro` | ⭐⭐⭐⭐⭐ |
| `fal-ai/kling-video/v2.6/pro/image-to-video` | ⭐⭐⭐⭐ |
| `fal-ai/kling-video/v2.5-turbo/pro/image-to-video` | ⭐⭐⭐ Fast |

## Duration options: `4s` `5s` `6s` `8s` `10s` `12s` (model-dependent)

## Common use cases
- "Create a 10-second product video" → generate with 16:9 aspect ratio guidance in prompt
- "Animate my logo" → animate with image URL
- "Make a TikTok-style video of X" → generate with portrait guidance in prompt
- "Turn this photo into a video" → animate with describe motion
- "Create a cinematic clip" → use sora-2 or veo3.1 for quality
