---
name: blink-meta-ads
description: >
  Manage Meta Ads (Facebook + Instagram) — ad accounts, campaigns, ad sets,
  ads, custom audiences, and insights via the Graph API. Use when asked to
  launch a Facebook/Instagram ad, list Meta ad spend, build a custom audience,
  or pull Meta campaign reports.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"], "connector": "composio_meta_ads" } }
---

# Blink Meta Ads

Manage Meta Ads (covers Facebook + Instagram + Messenger placements) via the
Composio-backed `composio_meta_ads` connector. Routes to the Facebook Graph
API at `https://graph.facebook.com/v23.0/`.

**Provider key**: `composio_meta_ads`
**Base URL**: `https://graph.facebook.com/v23.0/` (override via
`META_ADS_BASE_URL` env var on `blink-apis` when Meta deprecates the version)
**Auth**: API_KEY (System User Access Token) — Composio prompts the user for
the token at connect time, no Meta App Review required

## Setup the user must complete first

The user generates their own **System User Access Token** in Meta Business
Manager and pastes it into the Composio Connect Link. Skips Meta App Review
entirely.

1. Go to https://business.facebook.com → **Business Settings** → **Users** →
   **System Users**
2. Click **Add** → name it `Blink Integration` → role: **Admin** → Create
3. Click on the new System User → **Add Assets** → tab **Ad Accounts** → tick
   the accounts to give Blink access to → permission: **Manage Performance**
   (or **Manage Campaigns** for write access)
4. Click **Generate New Token** → pick the Meta app → **Token expiration:
   Never** → tick scopes: `ads_management`, `ads_read`, `business_management`
   → Generate
5. Copy the token (Meta only shows it once) → paste into the Blink Connect
   dialog

Total time: ~5 minutes, one-time.

> ⚠️ Almost every write path needs an **ad account ID** in the form
> `act_<digits>`. Get yours via `me/adaccounts`. The leading `act_` prefix is
> required by Meta — omit it and the API returns 400.

---

## Identity check

```bash
blink connector exec composio_meta_ads "me?fields=id,name" GET
# → returns the System User's id + name (whatever the user typed when generating it).
```

---

## List ad accounts the token can manage

```bash
blink connector exec composio_meta_ads "me/adaccounts?fields=name,account_id,account_status,currency,timezone_name" GET
```

`account_status` integer key:
- `1` ACTIVE, `2` DISABLED, `3` UNSETTLED, `7` PENDING_RISK_REVIEW,
  `8` PENDING_SETTLEMENT, `9` IN_GRACE_PERIOD, `100` PENDING_CLOSURE,
  `101` CLOSED, `201` ANY_ACTIVE, `202` ANY_CLOSED.

Capture the `id` (which already includes the `act_` prefix):

```bash
AD_ACCOUNT_ID=$(blink connector exec composio_meta_ads "me/adaccounts?fields=id" GET --json \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['data'][0]['id'])")
# AD_ACCOUNT_ID will already look like "act_1234567890" — use as-is.
```

---

## Campaigns

```bash
# List campaigns under one ad account
blink connector exec composio_meta_ads "$AD_ACCOUNT_ID/campaigns?fields=name,objective,status,daily_budget,lifetime_budget,created_time" GET

# Create a paused campaign
# Objectives (Outcome-Driven Ad Experiences): OUTCOME_TRAFFIC, OUTCOME_AWARENESS,
# OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_APP_PROMOTION
blink connector exec composio_meta_ads "$AD_ACCOUNT_ID/campaigns" POST '{
  "name": "Spring launch",
  "objective": "OUTCOME_TRAFFIC",
  "status": "PAUSED",
  "special_ad_categories": []
}'
# → returns {"id":"23854xxxxx"} — the campaign id.

# Update / activate
blink connector exec composio_meta_ads CAMPAIGN_ID POST '{"name":"Spring launch v2","status":"ACTIVE"}'

# Delete (irreversible)
blink connector exec composio_meta_ads CAMPAIGN_ID DELETE
```

`special_ad_categories` is **required** by Meta and must be `[]` for normal
ads, or one of `["HOUSING"]`, `["EMPLOYMENT"]`, `["CREDIT"]`, `["ISSUES_ELECTIONS_POLITICS"]`,
`["ONLINE_GAMBLING_AND_GAMING"]`, `["FINANCIAL_PRODUCTS_SERVICES"]` for
regulated verticals.

---

## Ad sets

```bash
blink connector exec composio_meta_ads "$AD_ACCOUNT_ID/adsets?fields=name,status,daily_budget,targeting,billing_event,optimization_goal" GET
```

---

## Ads + creatives

```bash
# List ads under an account
blink connector exec composio_meta_ads "$AD_ACCOUNT_ID/ads?fields=name,status,creative,effective_status" GET

# Pages the user manages (needed for creative.object_story_spec.page_id)
blink connector exec composio_meta_ads "me/accounts?fields=id,name,access_token" GET
```

---

## Insights (the universal reporting endpoint)

`date_preset` shortcuts: `today`, `yesterday`, `this_month`, `last_month`,
`this_quarter`, `maximum`, `last_3d`, `last_7d`, `last_14d`, `last_28d`,
`last_30d`, `last_90d`. Or pass an explicit `time_range={"since":"2026-04-01","until":"2026-04-30"}`.

`time_increment` controls the bucket size: `1` = daily, `7` = weekly,
`monthly`, or `all_days` (single bucket for the whole range).

```bash
# Account-level last 7 days, by day
blink connector exec composio_meta_ads "$AD_ACCOUNT_ID/insights?fields=impressions,clicks,spend,ctr,cpc,reach,frequency&date_preset=last_7d&time_increment=1" GET

# Per-campaign roll-up last 30 days
blink connector exec composio_meta_ads "$AD_ACCOUNT_ID/insights?fields=campaign_id,campaign_name,impressions,clicks,spend,actions&level=campaign&date_preset=last_30d" GET

# Per-ad insights with breakdowns (age, gender, country, placement, device_platform)
blink connector exec composio_meta_ads "$AD_ACCOUNT_ID/insights?fields=ad_id,ad_name,impressions,clicks,spend&level=ad&date_preset=last_7d&breakdowns=age,gender" GET
```

`spend` is returned as a string in the ad account's currency (already in
units, NOT micros — different from Google/Reddit Ads).

---

## Custom audiences

```bash
blink connector exec composio_meta_ads "$AD_ACCOUNT_ID/customaudiences?fields=name,subtype,approximate_count,description" GET
```

---

## Common 4xx clues

| Status / message | What it means |
|---|---|
| `400 OAuthException #100 "Param adcreative is required"` | Missing required field; Meta lists the exact missing keys at the end of the message. |
| `400 OAuthException #190 "Error validating access token"` | Token expired (only happens if not set to "Never expires"), OR the user changed their Facebook password and Meta invalidated all tokens. User must generate a fresh System User token and reconnect. |
| `403 OAuthException #200 "Permissions error"` | The System User wasn't granted access to that ad account. In Business Manager → Users → System Users → click user → Add Assets → assign the ad account. |
| `400 #100 "Tried accessing nonexisting field"` | Wrong API version. Bump `META_ADS_BASE_URL` env var to the next Graph API version. |
| `400 #80004 "There have been too many calls"` | Meta rate limit. Each business has its own bucket so this only affects the noisy user; back off and retry. |
| `400 missing 'special_ad_categories'` | Required on every campaign create — pass `[]` for normal ads. |

---

## Native Composio tools (50 actions)

Pre-built tool calls — structured create/update flows, batch ad insights,
audience uploads — are also available:

```bash
blink connector tool-execute composio_meta_ads METAADS_LIST_AD_ACCOUNTS '{}'
blink connector tool-execute composio_meta_ads METAADS_GET_INSIGHTS '{"object_id":"act_AD_ACCOUNT_ID","date_preset":"last_7d"}'
```
