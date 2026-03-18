---
name: blink-scrape
description: >
  Scrape web pages and extract structured data using AI.
  Fetches page content via the Blink proxy and optionally uses AI to extract
  specific information. No project key needed — uses workspace key.
  Use when you need to extract data from websites, monitor pages, or gather web content.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"] } }
---

# Blink Scrape

Fetch web pages and extract structured information. No project key needed.

## Get clean text from a page
```bash
bash scripts/scrape.sh "https://example.com" --text
```

## Extract specific data with AI
```bash
bash scripts/scrape.sh "https://news.ycombinator.com" --extract "top 10 story titles and their URLs"
```

## Extract product prices
```bash
bash scripts/scrape.sh "https://shop.example.com/products" --extract "all product names and prices"
```

## Extract contact information
```bash
bash scripts/scrape.sh "https://company.example.com/contact" --extract "email addresses and phone numbers"
```

## Get raw HTML/JSON response
```bash
bash scripts/scrape.sh "https://api.example.com/data"
```

## Machine-readable JSON output
```bash
bash scripts/scrape.sh "https://example.com" --extract "main headline" --json
```

## Script signature
```
scrape.sh <url> [--text] [--extract <instructions>] [--json]
```
- `url` — the page to scrape (required)
- `--text` — return clean text (strip HTML tags)
- `--extract <instructions>` — use AI to extract specific data
- `--json` — return JSON output `{ url, content/extracted }`

## Tips
- For structured data (tables, lists, prices): use `--extract`
- For article text: use `--text`
- For APIs that return JSON: no flags needed
- AI extraction uses `google/gemini-3-flash` (fast + accurate for extraction tasks)
