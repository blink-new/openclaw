---
name: blink-pipedrive
description: >
  Access Pipedrive CRM deals, contacts, and activities. Use when asked about
  sales pipeline, customer contacts, deal status, or activity tracking. Requires
  a linked Pipedrive connection.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"], "connector": "pipedrive" } }
---

# Blink Pipedrive

Access the user's linked Pipedrive CRM. Provider key: `pipedrive`.

## List deals
```bash
blink connector exec pipedrive /deals GET '{"status":"open","limit":20}'
```

## Get a specific deal
```bash
blink connector exec pipedrive /deals/{id} GET
```

## Create a deal
```bash
blink connector exec pipedrive /deals POST '{"title":"New deal","value":5000,"currency":"USD"}'
```

## Update a deal
```bash
blink connector exec pipedrive /deals/{id} PUT '{"status":"won"}'
```

## List contacts (persons)
```bash
blink connector exec pipedrive /persons GET '{"limit":20}'
```

## Search contacts
```bash
blink connector exec pipedrive /persons/search GET '{"term":"john","fields":"name,email"}'
```

## List organizations
```bash
blink connector exec pipedrive /organizations GET '{"limit":20}'
```

## List activities
```bash
blink connector exec pipedrive /activities GET '{"done":0,"limit":20}'
```

## Create an activity
```bash
blink connector exec pipedrive /activities POST '{"subject":"Follow-up call","type":"call","due_date":"2024-03-01","deal_id":"{dealId}"}'
```

## Common use cases
- "What deals are in my pipeline?" → GET /deals?status=open
- "Add a new deal for Acme Corp" → POST /deals
- "Find contact john@example.com" → GET /persons/search?term=john
- "Mark deal X as won" → PUT /deals/{id} with status=won
- "Schedule a follow-up call for deal Y" → POST /activities
