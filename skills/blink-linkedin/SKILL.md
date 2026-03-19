---
name: blink-linkedin
description: >
  Full LinkedIn automation — publish posts, comment, react, browse feed,
  search profiles, and check messages. Uses Blink OAuth for writes and
  session cookies for reads. Use when asked to post, comment, like, or
  read anything on LinkedIn.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"], "connector": "linkedin" } }
---

# Blink LinkedIn

Full LinkedIn automation via two complementary methods:

| Action | Method | Setup |
|---|---|---|
| View profile | `blink linkedin me` | OAuth only |
| Publish post | `blink linkedin post` | OAuth only |
| Delete post | `blink linkedin delete` | OAuth only |
| Like a post | `blink linkedin like` | OAuth only |
| Unlike a post | `blink linkedin unlike` | OAuth only |
| Comment on post | `blink linkedin comment` | OAuth only |
| Upload image/video | `blink linkedin upload-media` | OAuth only |
| Browse feed | `python3 scripts/lk.py feed` | Cookies required |
| Search people | `python3 scripts/lk.py search` | Cookies required |
| View a profile | `python3 scripts/lk.py profile` | Cookies required |
| Check messages | `python3 scripts/lk.py messages` | Cookies required |

---

## Cookie Setup (one-time, for feed reading)

Required for `lk.py` only. Store as agent secrets:

```bash
# 1. Open linkedin.com in Chrome → F12 → Application → Cookies → www.linkedin.com
# 2. Copy li_at and JSESSIONID values, then:
blink secrets set LINKEDIN_LI_AT "AQEDATxxxxx..."
blink secrets set LINKEDIN_JSESSIONID '"ajax:1234567890"'

# Verify:
LINKEDIN_LI_AT="$LINKEDIN_LI_AT" LINKEDIN_JSESSIONID="$LINKEDIN_JSESSIONID" \
  python3 scripts/lk.py whoami
```

Cookies last ~1 year. If feed reading breaks, refresh from browser.

**Dependencies** (install once on the agent):
```bash
pip install linkedin-api
```

---

## Profile

```bash
blink linkedin me
PERSON_ID=$(blink linkedin me --json | python3 -c "import json,sys; print(json.load(sys.stdin)['sub'])")
```

---

## Publish a post

```bash
blink linkedin post "Excited to share our latest update! #Innovation"
blink linkedin post "Internal update" --visibility CONNECTIONS

# Capture URN for later use:
POST_URN=$(blink linkedin post "Hello LinkedIn" --json | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
```

---

## Like / Unlike

```bash
blink linkedin like "urn:li:share:1234567890"
blink linkedin unlike "urn:li:share:1234567890"

# With activity URN from feed URL (linkedin.com/feed/update/urn:li:activity:...):
blink linkedin like "urn:li:activity:1234567890"
```

---

## Comment

```bash
blink linkedin comment "urn:li:share:1234567890" "Great post!"
blink linkedin comment "urn:li:activity:1234567890" "Really insightful, thanks for sharing."
```

---

## Delete a post

```bash
blink linkedin delete "urn:li:share:1234567890"
```

---

## Post with an image or video

```bash
# Step 1: Upload media, get asset URN
ASSET_URN=$(blink linkedin upload-media https://example.com/photo.jpg --json | python3 -c "import json,sys; print(json.load(sys.stdin)['asset_urn'])")

# Step 2: Get your person ID
PERSON_ID=$(blink linkedin me --json | python3 -c "import json,sys; print(json.load(sys.stdin)['sub'])")

# Step 3: Post with media
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

## Browse feed (requires cookies)

```bash
python3 scripts/lk.py feed -n 10

# The feed returns posts with author, timestamp, content snippet
# To engage with a post, extract its URL and get the activity URN:
# URL: https://linkedin.com/feed/update/urn:li:activity:1234567890
# URN: urn:li:activity:1234567890
```

---

## Search people (requires cookies)

```bash
python3 scripts/lk.py search "VP Sales SaaS startup"
python3 scripts/lk.py search "AI researcher London"
```

---

## View a profile (requires cookies)

```bash
python3 scripts/lk.py profile "andrew-chen-b2b78"
# public_id is the part after linkedin.com/in/
```

---

## Check messages (requires cookies)

```bash
python3 scripts/lk.py messages
```

---

## The combo pattern

Read with cookies, write with OAuth:

```bash
# 1. Browse feed to find a post to engage with
python3 scripts/lk.py feed -n 10
# → see post by "Jane Smith" with URL linkedin.com/feed/update/urn:li:activity:9876543210

# 2. Extract URN from the URL
POST_URN="urn:li:activity:9876543210"

# 3. Like and comment using OAuth
blink linkedin like "$POST_URN"
blink linkedin comment "$POST_URN" "Really insightful take on this!"
```

---

## Common use cases

- "Post an update about our launch" → `blink linkedin post "..."`
- "Like Andrew's post about AI" → `lk.py feed` to find it, then `blink linkedin like`
- "Comment on the top post in my feed" → `lk.py feed -n 1`, extract URN, `blink linkedin comment`
- "Search for VPs of Sales at Series B startups" → `lk.py search "VP Sales Series B"`
- "Post this image" → `blink linkedin upload-media <url>` then post with asset URN

---

## URN formats

- `urn:li:share:123` — returned when you create a post
- `urn:li:ugcPost:123` — legacy post URN format
- `urn:li:activity:123` — from LinkedIn feed URLs (works with like/comment)

All three formats work with `like`, `unlike`, and `comment`.
