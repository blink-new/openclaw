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
bash scripts/generate.sh "A serene mountain lake at golden hour, photorealistic"
```

## Generate with a specific model
```bash
bash scripts/generate.sh "A futuristic city skyline" "fal-ai/nano-banana-pro"
```

## Generate multiple images at once
```bash
bash scripts/generate.sh "A cozy coffee shop interior" "fal-ai/nano-banana" 4
```

## Generate in WebP format (smaller file size)
```bash
bash scripts/generate.sh "Product photo of a red sneaker on white background" "fal-ai/nano-banana" 1 "webp" 85
```

## Edit an existing image (image-to-image)
```bash
bash scripts/edit.sh "Make this look like a watercolor painting" "https://example.com/photo.jpg"
```

## Edit with high-quality model
```bash
bash scripts/edit.sh "Add snow to this landscape" "https://example.com/landscape.jpg" "fal-ai/nano-banana-pro/edit"
```

## Models available
| Model | Best for |
|-------|---------|
| `fal-ai/nano-banana` | Default. Fast text→image. |
| `fal-ai/nano-banana-pro` | Higher quality text→image. |
| `fal-ai/nano-banana/edit` | Edit/transform existing images. |
| `fal-ai/nano-banana-pro/edit` | High-quality image editing. |

## Response format
Returns JSON with image URLs:
```json
{
  "result": { "data": [{ "url": "https://fal.media/files/...", "width": 1024, "height": 1024 }] },
  "usage": { "creditsCharged": 2.5, "costUSD": 0.006 }
}
```

## Common use cases
- "Generate a logo for my startup" → generate with clear prompt
- "Create a product image on a white background" → generate
- "Turn this photo into an oil painting" → edit with style prompt
- "Make 4 variations of this design" → generate with n=4
- "Create a banner image for my Discord" → generate with aspect ratio guidance in prompt
