---
name: blink-image
description: >
  Generate images from text prompts, or edit/transform existing images.
  Uses fal.ai models via Blink AI Gateway. Returns image URLs you can
  share, download, or use in further tasks.
  Use when asked to create, draw, generate, or edit any image.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"] } }
---

# Blink Image Generation

Generate images from text descriptions or edit existing images.
All images are charged to your Blink workspace credits.

## Generate an image from text
```bash
blink ai image "A serene mountain lake at golden hour, photorealistic"
```

## Generate with a specific model
```bash
blink ai image "A futuristic city skyline" --model fal-ai/nano-banana-pro
```

## Generate multiple images at once
```bash
blink ai image "A cozy coffee shop interior" --model fal-ai/nano-banana --n 4
```

## Generate with a specific count and model
```bash
blink ai image "Product photo of a red sneaker on white background" --model fal-ai/nano-banana-pro --n 2
```

> Note: Output format (jpeg/webp/png) is determined by the model, not a parameter.

## Edit an existing image (image-to-image)
```bash
blink ai image-edit "Make this look like a watercolor painting" "https://example.com/photo.jpg"
```

## Edit with high-quality model
```bash
blink ai image-edit "Add snow to this landscape" "https://example.com/landscape.jpg" --model fal-ai/nano-banana-pro/edit
```

## Edit a LOCAL file (user uploaded a photo via Telegram/Discord/Slack)
When a user sends you a photo, OpenClaw saves it to disk. Use `blink ai animate` for local files (it handles upload automatically), or use `blink ai image-edit` with a URL:
```bash
# Animate/transform a local file directly (handles upload automatically)
blink ai animate "Make this a professional studio headshot with dark background" /data/agents/main/agent/photo.jpg

# Or use image-edit if you have a public URL
blink ai image-edit "Make this a professional studio headshot with dark background" "https://example.com/photo.jpg"
```

## Find where OpenClaw saved an attachment
OpenClaw downloads attachments to the agent working directory. Check recent files:
```bash
ls -lt /data/agents/main/agent/ | head -10
```

## Models available
| Model | Best for |
|-------|---------|
| `fal-ai/nano-banana` | Default. Fast text→image. |
| `fal-ai/nano-banana-pro` | Higher quality text→image. |
| `fal-ai/nano-banana/edit` | Edit/transform existing images. |
| `fal-ai/nano-banana-pro/edit` | High-quality image editing. |

## Common use cases
- "Generate a logo for my startup" → generate with clear prompt
- "Create a product image on a white background" → generate
- "Turn this photo into an oil painting" → image-edit with style prompt
- "Make 4 variations of this design" → generate with --n 4
- "Create a banner image for my Discord" → generate with aspect ratio guidance in prompt
