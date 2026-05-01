---
name: blink-linkedin-ads
description: >
  Manage LinkedIn Marketing API — sponsored campaigns, creatives, audiences,
  and ad analytics. Use when asked to launch a LinkedIn ad, list LinkedIn ad
  spend, build a LinkedIn matched audience, or pull LinkedIn campaign reports.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"], "connector": "linkedin_ads" } }
---

# Blink LinkedIn Ads

Manage LinkedIn Sponsored Content via the LinkedIn Marketing REST API. This
is a **separate** connector from `linkedin` (which covers organic posting on
the member's own feed) — same LinkedIn Developer App, different OAuth scopes.

**Provider key**: `linkedin_ads`
**Base URL**: `https://api.linkedin.com/rest/`
**Auth**: Custom OAuth (shares LinkedIn app with the `linkedin` connector but
with different scopes)
**Scopes**: `openid profile email r_ads rw_ads r_ads_reporting`

Blink auto-injects `LinkedIn-Version: 202509` (overridable via
`LINKEDIN_ADS_API_VERSION` env var on `blink-apis`) and
`X-Restli-Protocol-Version: 2.0.0` on every request — never set them manually.

## Setup the user must complete first

1. Connect "LinkedIn Ads" in Workspace Settings → Connectors. The standalone
   `linkedin` connector does NOT grant Ads scopes — connect this one even if
   `linkedin` is already connected.
2. The LinkedIn Developer App must have the **Advertising API** product
   approved (Developer Portal → your app → Products → Advertising API → Access
   request form). Without it the OAuth consent screen rejects with
   `unauthorized_scope_error: Scope "r_ads" is not authorized for your
   application`. Approval is usually fast for Development Tier (~hours);
   Standard Tier takes longer.
3. The connecting member needs at least **VIEWER** access on the ad accounts
   they want Blink to read, or **CAMPAIGN_MANAGER** for write access. Granted
   in LinkedIn Campaign Manager → Account settings → Manage access.

---

## Identity check

```bash
blink connector exec linkedin_ads userinfo GET
# → { "sub": "abc123", "name": "...", "email": "..." }
# `sub` is the member URN suffix — needed for the adAccounts query.
SUB=$(blink connector exec linkedin_ads userinfo GET --json | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['sub'])")
```

---

## List ad accounts the member has access to

LinkedIn rejects `?q=role` style queries on `/rest` endpoints — the only
working shape is `q=search` with a `search` projection.

```bash
blink connector exec linkedin_ads "adAccounts?q=search&search=(reference:(values:List(urn%3Ali%3Aperson%3A$SUB)))" GET
```

---

## List campaigns under an ad account

```bash
ACCOUNT_ID=123456789
blink connector exec linkedin_ads "adAccounts/$ACCOUNT_ID/adCampaigns?q=search" GET
```

---

## Run an analytics report

`adAnalytics` is the universal reporting endpoint. Date range is required.
Granularity options: `DAILY`, `MONTHLY`, `YEARLY`, `ALL`.

```bash
blink connector exec linkedin_ads "adAnalytics?q=analytics&dateRange=(start:(year:2026,month:4,day:24),end:(year:2026,month:5,day:1))&timeGranularity=DAILY&accounts=List(urn%3Ali%3AsponsoredAccount%3A$ACCOUNT_ID)&fields=impressions,clicks,costInUsd,externalWebsiteConversions" GET
```

Report at the campaign level by adding `&campaigns=List(urn%3Ali%3AsponsoredCampaign%3ACAMPAIGN_ID,...)`.

Common metrics you can ask for in `fields=`:
`impressions`, `clicks`, `costInUsd`, `costInLocalCurrency`,
`externalWebsiteConversions`, `oneClickLeads`, `videoViews`, `comments`,
`likes`, `shares`, `follows`, `landingPageClicks`, `reactions`.

---

## Common 4xx clues

| Status / message | What it means |
|---|---|
| `401 UNAUTHORIZED` | Token is missing one of the ads scopes. Have the user disconnect + reconnect LinkedIn Ads. |
| `403 ACCESS_DENIED` | The member exists but doesn't have a role on that ad account. Grant access in Campaign Manager. |
| `426 Upgrade Required` | Wrong `LinkedIn-Version` for the endpoint. Bump `LINKEDIN_ADS_API_VERSION` env var on `blink-apis` (format: `YYYYMM`, e.g. `202604`). |
| `400 ILLEGAL_ARGUMENT "field q is required"` | `/rest` endpoints need a `?q=` parameter on every list call (`q=search` for adAccounts/adCampaigns, `q=analytics` for adAnalytics). |
| Consent screen → `unauthorized_scope_error` | Advertising API product is not approved on the LinkedIn app. Submit the access request form in the Developer Portal. |

---

## Why this is separate from `linkedin`

The two connectors deliberately live in separate `workspace_connections`
rows. Disconnecting one doesn't touch the other, and refresh tokens are
issued separately by LinkedIn for each scope set. If you want to publish to
the member's feed AND manage their ad account, the user connects both — they
each get their own consent screen with the right scopes.

LinkedIn refresh tokens for ads are valid ~365 days and access tokens ~60
days; Blink refreshes automatically on every request when the access token
is within 5 minutes of expiry.
