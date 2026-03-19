---
name: blink-linkedin
description: >
  Access LinkedIn profile, publish posts, and manage professional content.
  Use when asked to post on LinkedIn, check profile details, or share
  professional updates. Requires a linked LinkedIn connection.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"], "connector": "linkedin" } }
---

# Blink LinkedIn

Access the user's LinkedIn account. Provider key: `linkedin`.

## What works today (w_member_social scope)

| Feature | Status |
|---|---|
| Get profile | ✅ works |
| Create text post | ✅ works |
| Create post with image | ✅ works |
| Create post with video | ✅ works |
| Delete own post | ✅ works |
| List own posts | ❌ needs r_member_social (restricted scope, pending LinkedIn approval) |
| Read comments | ❌ needs LinkedIn Partner API |
| Add comment | ❌ needs LinkedIn Partner API |
| Like / unlike a post | ❌ needs LinkedIn Partner API |

**Use the `blink linkedin` CLI commands** for the clearest interface:

---

## Get your profile

```bash
blink linkedin me
# Or with --json for scripting:
blink linkedin me --json
```

---

## Publish a text post

```bash
blink linkedin post "Excited to share our latest update! #Innovation #AI"

# Connections-only visibility:
blink linkedin post "Internal team update" --visibility CONNECTIONS
```

---

## Post with an image

```bash
# Step 1: Upload image, get asset URN
UPLOAD=$(bash scripts/upload-image.sh "https://example.com/photo.jpg")
ASSET_URN=$(echo "$UPLOAD" | python3 -c "import json,sys; print(json.loads(sys.stdin.read())['data']['asset_urn'])")

# Step 2: Get your person ID
PERSON_ID=$(blink linkedin me --json | python3 -c "import json,sys; print(json.load(sys.stdin)['sub'])")

# Step 3: Post with image
bash scripts/call.sh /ugcPosts POST "{
  \"author\": \"urn:li:person:$PERSON_ID\",
  \"lifecycleState\": \"PUBLISHED\",
  \"specificContent\": {
    \"com.linkedin.ugc.ShareContent\": {
      \"shareCommentary\": {\"text\": \"Check out this image!\"},
      \"shareMediaCategory\": \"IMAGE\",
      \"media\": [{\"status\": \"READY\", \"media\": \"$ASSET_URN\"}]
    }
  },
  \"visibility\": {\"com.linkedin.ugc.MemberNetworkVisibility\": \"PUBLIC\"}
}"
```

Or use the convenience script (one command):
```bash
bash scripts/post-with-image.sh "Check out this image!" "https://example.com/photo.jpg"
```

---

## Post a LOCAL photo to LinkedIn (user uploaded via Telegram/Discord/Slack)

```bash
# Step 1: Upload local file to get a URL (requires blink-image skill)
UPLOAD=$(bash /path/to/blink-image/scripts/upload-file.sh "/data/agents/default/agent/photo.jpg")
URL=$(echo "$UPLOAD" | python3 -c "import json,sys; print(json.loads(sys.stdin.read())['url'])")

# Optional Step 2: Edit the photo (e.g. make it a professional headshot)
EDITED=$(bash /path/to/blink-image/scripts/edit.sh "Professional studio headshot, dark background, clean look" "$URL")
FINAL_URL=$(echo "$EDITED" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d['result']['data'][0]['url'])")

# Step 3: Post to LinkedIn
bash scripts/post-with-image.sh "Excited to share my new professional photo!" "$FINAL_URL"
```

---

## Post with a video

```bash
# Upload video then post
bash scripts/post-with-video.sh "Watch our latest demo!" "https://example.com/demo.mp4"
```

---

## Delete your own post

```bash
POST_URN="urn:li:ugcPost:1234567890"
ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$POST_URN', safe=''))")
bash scripts/call.sh "/ugcPosts/$ENCODED" DELETE
```

---

## Media upload notes

- Image formats: JPEG, PNG, GIF (max 5MB for optimal results)
- Video formats: MP4 (max 200MB, H.264 encoded)
- `w_member_social` scope (already included) covers image and video posts
- Videos may take a few seconds to process before the post appears

---

## Key notes on URNs

- Post URN: `urn:li:ugcPost:1234567890` — returned when you create a post
- URNs must be URL-encoded in path segments: `urn:li:ugcPost:123` → `urn%3Ali%3AugcPost%3A123`
- Get your person ID from `blink linkedin me --json | jq .sub`

---

## Common use cases

- "Post an update on LinkedIn about our product launch" → `blink linkedin post "..."`
- "What's my LinkedIn profile info?" → `blink linkedin me`
- "Share our latest blog post on LinkedIn" → `blink linkedin post "..."` 
- "Post this image to LinkedIn" → use `scripts/post-with-image.sh`
- "Delete my last LinkedIn post" → `bash scripts/call.sh "/ugcPosts/ENCODED_URN" DELETE`
