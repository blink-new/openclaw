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
| Publish post (personal feed) | `blink linkedin post` | OAuth only |
| **Post to Company Page** | `blink connector exec linkedin rest/posts POST` | OAuth + **"Company Page access"** at connect time |
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

`blink linkedin post` always authors as the connected member (`urn:li:person:...`). For posting on behalf of a LinkedIn Company Page the member administers, see the next section.

---

## Post to a Company Page (organization)

**Precondition:** the user must have ticked **"Company Page access"** when connecting LinkedIn — that grants `w_organization_social` + `rw_organization_admin` on top of the default member scopes. If the user only connected with default scopes, prompt them to reconnect with Company Page access before retrying.

Confirm the token has the right scope:

```bash
# Print scopes granted on the active LinkedIn connection
blink connector get linkedin --json | python3 -c "import json,sys; print(json.load(sys.stdin).get('metadata',{}).get('scope',''))"
# Look for w_organization_social in the output
```

If the scope is missing, stop and tell the user:
> "I need Company Page access to post on behalf of your org. Reconnect LinkedIn from Integrations settings and tick **Company Page access** before clicking Connect."

### List the orgs the member can post to

LinkedIn restricts org posting to pages where the member has page role `ADMINISTRATOR`, `DIRECT_SPONSORED_CONTENT_POSTER`, or `CONTENT_ADMIN`. Discover them via the Organization Access Control endpoint:

```bash
ACCESS_TOKEN=$(blink connector get linkedin --json | python3 -c "import json,sys; print(json.load(sys.stdin)['tokens']['access_token'])")

curl -s 'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "LinkedIn-Version: 202604" \
  -H "X-Restli-Protocol-Version: 2.0.0" \
  | python3 -m json.tool
```

Each element has `organization` (the URN to use as `author`) and the member's `role`. Cache this list for the session — the endpoint is slow.

### Publish to the org

`blink linkedin post` does not yet accept an `--author` flag for org URNs. Until that lands in the SDK CLI, use the raw connector exec:

```bash
ORG_URN="urn:li:organization:5515715"   # from organizationAcls above

blink connector exec linkedin rest/posts POST "{
  \"author\": \"$ORG_URN\",
  \"commentary\": \"Excited to announce our latest milestone! 🚀\",
  \"visibility\": \"PUBLIC\",
  \"distribution\": {
    \"feedDistribution\": \"MAIN_FEED\",
    \"targetEntities\": [],
    \"thirdPartyDistributionChannels\": []
  },
  \"lifecycleState\": \"PUBLISHED\",
  \"isReshareDisabledByAuthor\": false
}"
```

The response includes the created post URN in the `x-restli-id` header — capture it the same way as personal posts.

### Org post with image / video

Upload the media first (it's the same flow as personal posting — assets are workspace-scoped, not author-scoped), then reference the asset URN in the org post:

```bash
ASSET_URN=$(blink linkedin upload-media https://example.com/announcement.png --json | python3 -c "import json,sys; print(json.load(sys.stdin)['asset_urn'])")

blink connector exec linkedin rest/posts POST "{
  \"author\": \"$ORG_URN\",
  \"commentary\": \"Behind the scenes at HQ\",
  \"visibility\": \"PUBLIC\",
  \"distribution\": {\"feedDistribution\": \"MAIN_FEED\", \"targetEntities\": [], \"thirdPartyDistributionChannels\": []},
  \"content\": {\"media\": {\"id\": \"$ASSET_URN\", \"title\": \"Behind the scenes\"}},
  \"lifecycleState\": \"PUBLISHED\",
  \"isReshareDisabledByAuthor\": false
}"
```

### Common errors when posting as an org

| HTTP | Cause | Fix |
|---|---|---|
| 403 `ACCESS_DENIED` | Token lacks `w_organization_social`, OR member doesn't admin that org | Verify scope + verify the org URN came from this member's `organizationAcls` |
| 422 `INVALID_URN_TYPE` | Author URN is `person:` instead of `organization:` | Use `urn:li:organization:{id}`, not `urn:li:person:{sub}` |
| 401 `INVALID_ACCESS_TOKEN` | Token expired (LinkedIn tokens last ~60 days) | Reconnect from Integrations settings — refresh tokens for organic LinkedIn are not always issued |

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
- "Post on our company page" → check scope → `organizationAcls` → `blink connector exec linkedin rest/posts POST` with `urn:li:organization:...` author
- "Like Andrew's post about AI" → `lk.py feed` to find it, then `blink linkedin like`
- "Comment on the top post in my feed" → `lk.py feed -n 1`, extract URN, `blink linkedin comment`
- "Search for VPs of Sales at Series B startups" → `lk.py search "VP Sales Series B"`
- "Post this image" → `blink linkedin upload-media <url>` then post with asset URN
- "Post this image on our company page" → upload media → org post via `connector exec` with `content.media.id` set to the asset URN

---

## URN formats

- `urn:li:share:123` — returned when you create a post
- `urn:li:ugcPost:123` — legacy post URN format
- `urn:li:activity:123` — from LinkedIn feed URLs (works with like/comment)

All three formats work with `like`, `unlike`, and `comment`.
