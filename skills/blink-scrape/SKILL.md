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

Fetch web pages and extract structured information using `blink scrape`. No project key needed.

## Get clean text from a page
```bash
blink scrape "https://example.com" --text
```

## Extract specific data with AI
```bash
blink scrape "https://news.ycombinator.com" --extract "top 10 story titles and their URLs"
```

## Extract product prices
```bash
blink scrape "https://shop.example.com/products" --extract "all product names and prices"
```

## Extract contact information
```bash
blink scrape "https://company.example.com/contact" --extract "email addresses and phone numbers"
```

## Get raw HTML/JSON response
```bash
blink scrape "https://api.example.com/data"
```

## Machine-readable JSON output
```bash
blink scrape "https://example.com" --extract "main headline" --json
```

## Command signature
```
blink scrape <url> [--text] [--extract <instructions>] [--json]
```
- `url` — the page to scrape (required)
- `--text` — return clean text (strip HTML tags)
- `--extract <instructions>` — use AI to extract specific data
- `--json` — return JSON output

## Tips
- For structured data (tables, lists, prices): use `--extract`
- For article text: use `--text`
- For APIs that return JSON: no flags needed
- AI extraction uses `google/gemini-3-flash` (fast + accurate for extraction tasks)
