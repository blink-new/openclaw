---
name: blink-linkedin
description: >
  Full LinkedIn automation — publish posts to personal feed or Company Pages,
  comment, react, browse feed, search profiles, and check messages. Uses Blink
  OAuth for writes and session cookies for reads. Use when asked to post,
  comment, like, read anything on LinkedIn, or manage a LinkedIn Company Page.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"], "connector": "linkedin" } }
---

# Blink LinkedIn

Full LinkedIn automation via two complementary methods:

| Action | Method | Scope needed |
|---|---|---|
| View profile | `blink linkedin me` | w_member_social |
| Publish personal post | `blink linkedin post` | w_member_social |
| Delete post | `blink linkedin delete` | w_member_social |
| Like a post | `blink linkedin like` | w_member_social |
| Unlike a post | `blink linkedin unlike` | w_member_social |
| Comment on post | `blink linkedin comment` | w_member_social |
| Upload image/video | `blink linkedin upload-media` | w_member_social |
| **List Company Pages** | **`blink linkedin org-list`** | w_organization_social + rw_organization_admin |
| **Post to Company Page** | **`blink linkedin org-post`** | w_organization_social |
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

## Publish a personal post

```bash
blink linkedin post "Excited to share our latest update! #Innovation"
blink linkedin post "Internal update" --visibility CONNECTIONS

# Capture URN for later use:
POST_URN=$(blink linkedin post "Hello LinkedIn" --json | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
```

---

## Company Page posting (org scopes required)

**Precondition:** the user must have ticked **"Company Page access"** when connecting LinkedIn — that grants `w_organization_social` + `rw_organization_admin` on top of the default member scopes. If the user only connected with default scopes, prompt them to reconnect with Company Page access before retrying.

`org-post` requires only `w_organization_social`. `org-list` additionally requires `rw_organization_admin` to query the ACL API. See [Scope check](#scope-check).

### List Company Pages you admin

```bash
blink linkedin org-list

# JSON output for scripting:
ORG_ID=$(blink linkedin org-list --json | python3 -c "import json,sys; orgs=json.load(sys.stdin); print(orgs[0]['orgId'] if orgs else '')")
```

> **Role note:** `org-list` returns pages where the connected member is an `ADMINISTRATOR` (requires `rw_organization_admin`). Members with `CONTENT_ADMIN` or `DIRECT_SPONSORED_CONTENT_POSTER` roles can post but won't appear here — if you know the numeric org ID already, pass it directly to `org-post` (only `w_organization_social` is needed).
>
> **Pagination note:** `org-list` returns the first page of results only. If you admin many Company Pages, use `--json` to inspect the full list.

### Post to a Company Page

```bash
blink linkedin org-post 12345678 "Announcing our new product! #Innovation"
blink linkedin org-post "$ORG_ID" "Weekly company update" --visibility CONNECTIONS

# Capture URN:
POST_URN=$(blink linkedin org-post "$ORG_ID" "Hello from Company Page" --json | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
```

### End-to-end Company Page workflow

```bash
# 1. Get the org ID
ORG_ID=$(blink linkedin org-list --json | python3 -c "
import json,sys
orgs = json.load(sys.stdin)
if not orgs:
    print('', end='')
else:
    print(orgs[0]['orgId'])
")

if [ -z "$ORG_ID" ]; then
  echo "No Company Pages found. Reconnect LinkedIn with Company Page access."
  exit 1
fi

# 2. Post to Company Page
blink linkedin org-post "$ORG_ID" "Your post content here"
```

### Common errors when posting as an org

| HTTP | Cause | Fix |
|---|---|---|
| 403 `ACCESS_DENIED` | Token lacks `w_organization_social`, or member can't post to that org | Verify scope; if posting as CONTENT_ADMIN/DIRECT_SPONSORED_CONTENT_POSTER, ensure you have the correct org ID |
| 422 `INVALID_URN_TYPE` | Wrong author URN type | `org-post` sets `urn:li:organization:{id}` automatically |
| 401 `INVALID_ACCESS_TOKEN` | Token expired (~60 days) | Reconnect from Integrations settings |

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

# Step 3: Post with media (uses ugcPosts legacy endpoint for media)
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
- "Post to our Company Page" → `blink linkedin org-list` → `blink linkedin org-post <id> "..."`
- "Like Andrew's post about AI" → `lk.py feed` to find it, then `blink linkedin like`
- "Comment on the top post in my feed" → `lk.py feed -n 1`, extract URN, `blink linkedin comment`
- "Search for VPs of Sales at Series B startups" → `lk.py search "VP Sales Series B"`
- "Post this image" → `blink linkedin upload-media <url>` then post with asset URN

---

## Scope check

Before using org commands, verify the connection has the right scopes:

```bash
blink connector status linkedin --json | python3 -c "
import json,sys
d = json.load(sys.stdin)
scope = d.get('data', {}).get('metadata', {}).get('scope', '')
has_w = 'w_organization_social' in scope
has_rw = 'rw_organization_admin' in scope
# org-post needs w_organization_social only
# org-list additionally needs rw_organization_admin
print('org-post:', '✓' if has_w else '✗ missing w_organization_social')
print('org-list:', '✓' if (has_w and has_rw) else '✗ missing ' + ('' if has_w else 'w_organization_social ') + ('' if has_rw else 'rw_organization_admin'))
if not has_w:
    print('→ Reconnect LinkedIn with Company Page access enabled')
"
```

---

## URN formats

Post URNs (work with `like`, `unlike`, and `comment`):
- `urn:li:share:123` — returned when you create a post (personal or org)
- `urn:li:ugcPost:123` — legacy post URN format
- `urn:li:activity:123` — from LinkedIn feed URLs

Author URN (used to identify the posting entity — not a post URN):
- `urn:li:organization:123` — Company Page author (pass the numeric ID to `org-post`)
