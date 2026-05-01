---
name: blink-reddit-ads
description: >
  Manage Reddit Ads — campaigns, ad groups, creative, audiences, and reports.
  Use when asked to launch a Reddit promoted post, list Reddit ad spend, build
  a custom audience on Reddit, or pull Reddit Ads insights.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"], "connector": "composio_reddit_ads" } }
---

# Blink Reddit Ads

Manage Reddit Ads through the Composio-backed `composio_reddit_ads` connector
(83 native tools available). Reddit Ads is **separate** from regular Reddit
(`composio_reddit`) — it lives on a different host, requires different OAuth
scopes, and has its own connect step in Workspace Settings.

**Provider key**: `composio_reddit_ads`
**Base URL**: `https://ads-api.reddit.com/api/v3/`
**Auth**: Composio-managed OAuth2

## Setup the user must complete first

1. Connect "Reddit Ads" in Workspace Settings → Connectors. Connecting
   regular Reddit (for organic posts) is **not** the same — Reddit Ads needs
   its own connection.
2. The Composio Auth Config must request all of these scopes (Composio's
   names → Reddit's underlying scope names):
   `identity`, `adsread` (`ads:read`), `adsedit` (`ads:edit`),
   `adsconversions`, `history`, `read`. Without `adsread` the Reddit API
   returns **404** (yes — 404, not 403) on every `/api/v3/*` endpoint.
3. The user must be a member of a Reddit Ads **Business Manager** with at
   least one ad account assigned to them. Personal Reddit accounts that have
   never opened Reddit Ads return empty business / ad account lists.
4. After Composio Auth Config scope changes, the user must **disconnect and
   reconnect** the integration so Reddit re-issues the OAuth token with the
   new scopes baked in. Existing tokens are NOT silently upgraded.

---

## Identity check

```bash
blink connector exec composio_reddit_ads me GET
# → returns the authenticated user's Reddit identity
```

---

## Find your ad accounts

Most write paths need an `ad_account_id` (format: `a2_<base36>`). Walk the
graph: user → businesses → ad accounts.

```bash
# Businesses you're a member of
blink connector exec composio_reddit_ads businesses GET

# Ad accounts under a business
blink connector exec composio_reddit_ads businesses/BUSINESS_ID/ad_accounts GET
```

Capture an id once and reuse it:

```bash
AD_ACCOUNT_ID=$(blink connector exec composio_reddit_ads businesses/BUSINESS_ID/ad_accounts GET --json \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['data'][0]['id'])")
```

---

## Campaigns

```bash
# List campaigns in an ad account
blink connector exec composio_reddit_ads ad_accounts/$AD_ACCOUNT_ID/campaigns GET

# Create a paused campaign
# Objective options: TRAFFIC, CONVERSIONS, REACH, VIDEO_VIEWS, APP_INSTALLS, IMPRESSIONS, LEAD_GENERATION
blink connector exec composio_reddit_ads ad_accounts/$AD_ACCOUNT_ID/campaigns POST '{
  "data": {"name":"Spring launch","objective":"TRAFFIC","status":"PAUSED"}
}'

# Update campaign (e.g. activate)
blink connector exec composio_reddit_ads ad_accounts/$AD_ACCOUNT_ID/campaigns/CAMPAIGN_ID POST '{
  "data": {"status":"ACTIVE"}
}'

# Delete (soft-deletes; still appears in historical reports)
blink connector exec composio_reddit_ads ad_accounts/$AD_ACCOUNT_ID/campaigns/CAMPAIGN_ID DELETE
```

---

## Ad groups

```bash
# List all ad groups in an account
blink connector exec composio_reddit_ads ad_accounts/$AD_ACCOUNT_ID/ad_groups GET

# Filter to one campaign
blink connector exec composio_reddit_ads ad_accounts/$AD_ACCOUNT_ID/ad_groups GET '{"campaign_ids":"CAMPAIGN_ID"}'
```

---

## Reports (insights)

```bash
# Daily breakdown for one ad account, last 30 days
blink connector exec composio_reddit_ads ad_accounts/$AD_ACCOUNT_ID/reports POST '{
  "data": {
    "breakdowns":["DATE"],
    "fields":["IMPRESSIONS","CLICKS","SPEND","CONVERSIONS","CTR","CPM","CPC"],
    "starts_at":"2026-04-01T00:00:00Z",
    "ends_at":"2026-04-30T23:59:59Z"
  }
}'

# Per-campaign roll-up
blink connector exec composio_reddit_ads ad_accounts/$AD_ACCOUNT_ID/reports POST '{
  "data": {
    "breakdowns":["CAMPAIGN_ID"],
    "fields":["IMPRESSIONS","SPEND","CLICKS"],
    "starts_at":"2026-04-01T00:00:00Z",
    "ends_at":"2026-04-30T23:59:59Z"
  }
}'
```

`SPEND` is returned in micros of the ad account's currency.

---

## Common 4xx clues

| Status / message | What it means |
|---|---|
| `404` on any `/api/v3/*` path | Token is missing the `adsread` scope. Have the user disconnect + reconnect Reddit Ads in Workspace Settings (Composio re-issues a token with current scope set). |
| `401 UNAUTHORIZED` even after reconnect | The Reddit account isn't enrolled in a Reddit Ads Business Manager, OR Composio's app isn't an approved Reddit Ads API partner for that user's region. Have the user create / join a Business Manager at https://ads.reddit.com first. |
| `400 invalid_objective` | Objective enum mismatch — must be one of TRAFFIC / CONVERSIONS / REACH / VIDEO_VIEWS / APP_INSTALLS / IMPRESSIONS / LEAD_GENERATION (uppercase). |
| Empty `data` array on `businesses` | User exists but isn't a member of any Reddit Ads Business Manager. |

---

## Native Composio tools (all 83 actions)

For pre-built tool calls — custom audiences, batch product upload,
lead-gen forms, creative templates, etc. — use the tool path:

```bash
blink connector tool-execute composio_reddit_ads REDDIT_ADS_GET_ME '{}'
blink connector tool-execute composio_reddit_ads REDDIT_ADS_LIST_AD_ACCOUNTS_FOR_BUSINESS '{"business_id":"BUSINESS_ID"}'
blink connector tool-execute composio_reddit_ads REDDIT_ADS_CREATE_CUSTOM_AUDIENCE '{...}'
```

A list of every Reddit Ads tool slug is in Composio's dashboard under the
`reddit_ads` toolkit.
