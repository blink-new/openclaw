---
name: blink-attio
description: >
  Access Attio CRM records, lists, and workspace data. Use when asked about
  contacts, companies, or CRM data in Attio. Requires a linked Attio connection.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"], "connector": "attio" } }
---

# Blink Attio

Access the user's linked Attio CRM workspace. Provider key: `attio`.

## Get workspace info
```bash
blink connector exec attio /self GET
```

## List available objects
```bash
blink connector exec attio /objects GET
```

## Query people records
```bash
blink connector exec attio /objects/people/records/query POST '{"limit":20,"sorts":[{"attribute":"created_at","field":"created_at","direction":"desc"}]}'
```

## Query company records
```bash
blink connector exec attio /objects/companies/records/query POST '{"limit":20}'
```

## Search records
```bash
blink connector exec attio /objects/people/records/query POST '{"filter":{"email_addresses":{"$contains":"example.com"}},"limit":10}'
```

## Get a specific record
```bash
blink connector exec attio /objects/people/records/{record_id} GET
```

## Create a person record
```bash
blink connector exec attio /objects/people/records POST '{"data":{"values":{"name":[{"first_name":"John","last_name":"Doe"}],"email_addresses":[{"email_address":"john@example.com"}]}}}'
```

## List lists
```bash
blink connector exec attio /lists GET
```

## Query list entries
```bash
blink connector exec attio /lists/{list_id}/entries/query POST '{"limit":20}'
```

## Common use cases
- "Find all contacts at Acme Corp in Attio" → POST /objects/people/records/query with company filter
- "Add a new person to Attio" → POST /objects/people/records
- "List all companies in my CRM" → POST /objects/companies/records/query
- "What lists do I have in Attio?" → GET /lists
- "Find contacts with Gmail emails" → POST /objects/people/records/query with email filter
