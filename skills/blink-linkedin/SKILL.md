---
name: blink-linkedin
description: >
  Publish LinkedIn posts, delete posts, and view profile information.
  Use when asked to post on LinkedIn, share professional updates, or
  check profile details. Requires a linked LinkedIn connection.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"], "connector": "linkedin" } }
---

# Blink LinkedIn

Manage the user's LinkedIn presence using the `blink linkedin` CLI.

## What works today

| Feature | Command | Status |
|---|---|---|
| View profile | `blink linkedin me` | ✅ |
| Publish text post | `blink linkedin post "..."` | ✅ |
| Post with image | `blink linkedin upload-media` + connector exec | ✅ |
| Post with video | `blink linkedin upload-media` + connector exec | ✅ |
| Delete own post | `blink linkedin delete <urn>` | ✅ |
| Read own posts | — | ❌ needs r_member_social (LinkedIn restricted scope) |
| Read/add comments | — | ❌ needs LinkedIn Partner API |
| Like / unlike | — | ❌ needs LinkedIn Partner API |

---

## Get profile

```bash
blink linkedin me

# For scripting — get person ID:
PERSON_ID=$(blink linkedin me --json | python3 -c "import json,sys; print(json.load(sys.stdin)['sub'])")
```

---

## Publish a text post

```bash
blink linkedin post "Excited to share our latest update! #Innovation"

# Connections-only:
blink linkedin post "Internal update" --visibility CONNECTIONS

# Capture the post URN for later (e.g. to delete it):
POST_URN=$(blink linkedin post "Hello LinkedIn" --json | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
```

---

## Post with an image

```bash
# Step 1: Upload image to LinkedIn, get asset URN
ASSET_URN=$(blink linkedin upload-media "https://example.com/photo.jpg" --json | python3 -c "import json,sys; print(json.load(sys.stdin)['asset_urn'])")

# Step 2: Get your person ID
PERSON_ID=$(blink linkedin me --json | python3 -c "import json,sys; print(json.load(sys.stdin)['sub'])")

# Step 3: Post with the image
blink connector exec linkedin ugcPosts POST "{
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

---

## Post with a video

```bash
# Step 1: Upload video to LinkedIn, get asset URN
ASSET_URN=$(blink linkedin upload-media "https://example.com/demo.mp4" --type video --json | python3 -c "import json,sys; print(json.load(sys.stdin)['asset_urn'])")

# Step 2: Get your person ID
PERSON_ID=$(blink linkedin me --json | python3 -c "import json,sys; print(json.load(sys.stdin)['sub'])")

# Step 3: Post with the video
blink connector exec linkedin ugcPosts POST "{
  \"author\": \"urn:li:person:$PERSON_ID\",
  \"lifecycleState\": \"PUBLISHED\",
  \"specificContent\": {
    \"com.linkedin.ugc.ShareContent\": {
      \"shareCommentary\": {\"text\": \"Watch our latest demo!\"},
      \"shareMediaCategory\": \"VIDEO\",
      \"media\": [{\"status\": \"READY\", \"media\": \"$ASSET_URN\"}]
    }
  },
  \"visibility\": {\"com.linkedin.ugc.MemberNetworkVisibility\": \"PUBLIC\"}
}"
```

---

## Delete a post

```bash
blink linkedin delete "urn:li:ugcPost:1234567890"
```

The post URN is returned when you create a post via `blink linkedin post --json`.

---

## Media upload notes

- Image formats: JPEG, PNG, GIF (max 5MB)
- Video formats: MP4 (max 200MB, H.264)
- Videos may take a few seconds to process before the post appears

---

## Key notes on URNs

- Post URN is returned by `blink linkedin post --json` as the `id` field
- URNs must be URL-encoded in path segments: `urn:li:ugcPost:123` → `urn%3Ali%3AugcPost%3A123`
- Person ID is available from `blink linkedin me --json` as the `sub` field

---

## Common use cases

- "Post an update on LinkedIn" → `blink linkedin post "..."`
- "What's my LinkedIn profile?" → `blink linkedin me`
- "Share this image on LinkedIn" → upload-media then connector exec ugcPosts
- "Delete my LinkedIn post" → `blink linkedin delete "<urn>"`
- "Post this video" → upload-media --type video then connector exec ugcPosts
