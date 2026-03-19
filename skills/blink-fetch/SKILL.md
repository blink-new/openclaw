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

Make HTTP requests to any URL via the Blink proxy using `blink fetch`.
No project key needed — uses your workspace key.

## GET request
```bash
blink fetch "https://api.github.com/users/octocat"
```

## POST request with JSON body
```bash
blink fetch "https://api.example.com/data" --method POST --body '{"name":"Alice","email":"alice@example.com"}'
```

## Request with custom header
```bash
blink fetch "https://api.example.com/protected" --header "Authorization: Bearer sk-xxx"
```

## GET a webpage
```bash
blink fetch "https://news.ycombinator.com"
```

## Scripting — extract from JSON response
```bash
blink fetch "https://api.github.com/repos/openclaw/openclaw" --json | python3 -c "import json,sys; print(json.load(sys.stdin)['stargazers_count'])"
```

## Command signature
```
blink fetch <url> [--method GET|POST|PUT|PATCH|DELETE] [--body '<json>'] [--header 'Key: Value']
```
- `url` — the URL to fetch (required)
- `--method` — HTTP method (default: GET)
- `--body` — JSON body for POST/PUT/PATCH requests
- `--header` — extra header as "Key: Value" (repeatable)
