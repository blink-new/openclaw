---
name: blink-fetch
description: >
  Make HTTP requests to any external URL via the Blink proxy.
  Handles CORS, auth headers, and returns the response body.
  Use when you need to call an external API, download a page, or
  make any outbound HTTP request.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"] } }
---

# Blink Fetch

Make HTTP requests to any URL via the Blink proxy. Supports all HTTP methods,
custom headers, and JSON bodies. No project key needed — uses your workspace key.

## GET request
```bash
bash scripts/fetch.sh "https://api.github.com/users/octocat"
```

## POST request with JSON body
```bash
bash scripts/fetch.sh "https://api.example.com/data" POST '{"name":"Alice","email":"alice@example.com"}'
```

## Request with custom headers
```bash
bash scripts/fetch.sh "https://api.example.com/protected" GET '{}' "Authorization: Bearer sk-xxx"
```

## GET a webpage
```bash
bash scripts/fetch.sh "https://news.ycombinator.com"
```

## Scripting — get JSON response
```bash
bash scripts/fetch.sh "https://api.github.com/repos/openclaw/openclaw" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['stargazers_count'])"
```

## Script signatures
```
fetch.sh <url> [METHOD] [json_body] [header_key_value]
```
- `url` — the URL to fetch (required)
- `METHOD` — GET (default), POST, PUT, PATCH, DELETE
- `json_body` — JSON string for POST/PUT/PATCH requests (default: none)
- `header_key_value` — single extra header as "Key: Value" (default: none)
