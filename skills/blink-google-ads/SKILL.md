---
name: blink-google-ads
description: >
  Manage Google Ads campaigns, ad groups, ads, budgets, and reporting via the
  Google Ads API. Use when asked to list ad accounts, run GAQL reports, create
  campaigns, manage budgets, or pull spend / impressions / conversions data.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"], "connector": "composio_googleads" } }
---

# Blink Google Ads

Manage Google Ads through the Composio-backed `composio_googleads` connector.
All requests are routed via `https://googleads.googleapis.com/` — Composio
injects the `developer-token` header server-side from the auth config, so you
never need to pass it manually.

**Provider key**: `composio_googleads`
**API version**: `v23` (track Composio's `get_current_user_endpoint` for the
next bump — v18 has been sunset, v21 still works as of Apr 2026)

## Setup the user must complete first

Before any write call works on a customer account:

1. The Google Ads account must be **fully activated** — i.e. billing set up
   AND at least one campaign created in the Google Ads UI. Brand-new accounts
   that haven't passed the "first campaign" wizard return `403
   CUSTOMER_NOT_ENABLED` on every read/write API call.
2. The connected Google account must have *Standard* or *Admin* access to the
   customer (read-only access is not enough for mutate operations).
3. If the user has multiple ad accounts, they should call
   `customers:listAccessibleCustomers` first to find the right `customer_id`
   to operate on (the response is a flat list of `customers/<id>` strings —
   strip the prefix to get the 10-digit customer id).

---

## List accessible ad accounts

```bash
blink connector exec composio_googleads v23/customers:listAccessibleCustomers GET
# → {"resourceNames":["customers/7024248698","customers/9725988311"]}

# Capture the first id:
CUSTOMER_ID=$(blink connector exec composio_googleads v23/customers:listAccessibleCustomers GET --json \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['resourceNames'][0].split('/')[-1])")
```

---

## Run a GAQL report (campaigns, ad groups, keywords, conversions, spend)

Google Ads queries are written in **GAQL** (Google Ads Query Language) — like
SQL but read-only and limited to one resource per query.

```bash
# Top 10 campaigns by impressions in the last 30 days
blink connector exec composio_googleads v23/customers/$CUSTOMER_ID/googleAds:search POST '{
  "query": "SELECT campaign.id, campaign.name, campaign.status, metrics.impressions, metrics.clicks, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.impressions DESC LIMIT 10"
}'

# Spend by ad group last 7 days
blink connector exec composio_googleads v23/customers/$CUSTOMER_ID/googleAds:search POST '{
  "query": "SELECT ad_group.name, metrics.cost_micros, metrics.conversions FROM ad_group WHERE segments.date DURING LAST_7_DAYS"
}'

# Search-term report (what people actually typed)
blink connector exec composio_googleads v23/customers/$CUSTOMER_ID/googleAds:search POST '{
  "query": "SELECT search_term_view.search_term, metrics.clicks, metrics.cost_micros FROM search_term_view WHERE segments.date DURING LAST_7_DAYS ORDER BY metrics.clicks DESC LIMIT 50"
}'
```

> **`cost_micros`** is in millionths of the account currency. Divide by
> `1_000_000` to get the actual amount. e.g. `12_500_000` cost_micros = $12.50.

> **Conversion value: prefer `metrics.conversions_value` over `metrics.all_conversions_value`.**
>
> - `conversions_value` — **primary** conversion actions only (the ones
>   marked "Include in 'Conversions'"). Matches the Google Ads UI's "Conv.
>   value" column and what Smart Bidding optimizes against. Use this for
>   ROAS and revenue reporting.
> - `all_conversions_value` — includes **secondary** actions too
>   (view-through, cross-device, store visits). These often double-count the
>   same user action already in `conversions_value`, inflating revenue.
>
> Same rule for the count columns: `metrics.conversions` (primary) vs
> `metrics.all_conversions` (everything). Only use the `all_*` variants if
> the user explicitly asks for secondary conversions.

---

## Create a campaign budget

Campaign budgets are created separately, then referenced when creating a
campaign. `amountMicros` is in micros of the account currency (so
`1_000_000` = 1 unit, e.g. $1.00).

> ⚠️ All JSON request payloads MUST use **camelCase** field names — the
> protobuf field names are snake_case but Google's REST mapping rejects them
> with `400 Invalid JSON payload "Unknown name 'foo'"`. snake_case is only
> valid inside `query` strings (GAQL syntax). This applies to every
> `:mutate` payload below — `amountMicros`, `deliveryMethod`, `explicitShare`,
> `advertisingChannelType`, `campaignBudget`, `manualCpc`, `resourceName`,
> `updateMask`, etc.

```bash
blink connector exec composio_googleads v23/customers/$CUSTOMER_ID/campaignBudgets:mutate POST '{
  "operations": [{
    "create": {
      "name": "Spring launch budget",
      "amountMicros": "10000000",
      "deliveryMethod": "STANDARD",
      "explicitShare": true
    }
  }]
}'
# → returns "resourceName": "customers/123/campaignBudgets/4567" — extract the
#   numeric suffix as your BUDGET_ID for the campaign create call below.
```

---

## Create a paused campaign

```bash
blink connector exec composio_googleads v23/customers/$CUSTOMER_ID/campaigns:mutate POST '{
  "operations": [{
    "create": {
      "name": "Spring launch — search",
      "status": "PAUSED",
      "advertisingChannelType": "SEARCH",
      "campaignBudget": "customers/'$CUSTOMER_ID'/campaignBudgets/BUDGET_ID",
      "manualCpc": {}
    }
  }]
}'
```

---

## Pause / Resume / Remove

> All `update` ops use **camelCase** field names (`resourceName`, `updateMask`)
> — the same gotcha as `explicitShare` above. snake_case returns `400 Invalid
> JSON payload "Unknown name 'resource_name'"`.

```bash
# Pause
blink connector exec composio_googleads v23/customers/$CUSTOMER_ID/campaigns:mutate POST '{
  "operations": [{"update":{"resourceName":"customers/'$CUSTOMER_ID'/campaigns/CAMPAIGN_ID","status":"PAUSED"},"updateMask":"status"}]
}'

# Resume
blink connector exec composio_googleads v23/customers/$CUSTOMER_ID/campaigns:mutate POST '{
  "operations": [{"update":{"resourceName":"customers/'$CUSTOMER_ID'/campaigns/CAMPAIGN_ID","status":"ENABLED"},"updateMask":"status"}]
}'

# Remove (irreversible — it stays in reports but no longer serves)
blink connector exec composio_googleads v23/customers/$CUSTOMER_ID/campaigns:mutate POST '{
  "operations": [{"remove":"customers/'$CUSTOMER_ID'/campaigns/CAMPAIGN_ID"}]
}'
```

---

## Common 4xx clues

| Status / message | What it means |
|---|---|
| `403 CUSTOMER_NOT_ENABLED` | The Google Ads account has no billing or first campaign. The user must finish the Ads onboarding wizard in the Google Ads UI. |
| `403 USER_PERMISSION_DENIED` | The connected Google account doesn't have access to that customer id, or has read-only when the call requires write. |
| `400 Invalid JSON payload "Unknown name 'foo'"` | Field name shape mismatch. Google's REST mapping is **camelCase** for top-level operation fields (`explicitShare`, `resourceName`, `updateMask`) but **snake_case** inside `query` strings. |
| `400 INVALID_VALUE for field 'campaignBudget'` | Budget resource name is wrong — must be the full string `customers/{id}/campaignBudgets/{id}`, not just the numeric id. |
| `404` on `googleAds:search` | The customer id you're targeting is a *manager* account (MCC), not an operating account. Use `listAccessibleCustomers` then filter to non-manager ones. |

---

## Native Composio tools (optional)

For pre-built tool calls instead of raw REST, the tool path exists too:

```bash
blink connector tool-execute composio_googleads GOOGLEADS_LIST_ACCESSIBLE_CUSTOMERS '{}'
blink connector tool-execute composio_googleads GOOGLEADS_SEARCH '{"customer_id":"7024248698","query":"SELECT campaign.id, campaign.name FROM campaign LIMIT 10"}'
```

Use the raw `connector exec` path above for anything Composio doesn't have a
named tool for.
