---
name: blink-email
description: >
  Send transactional emails to users of a linked Blink project.
  Use to send confirmations, notifications, reports, or any email
  from your agent to app users. Requires BLINK_PROJECT_ID secret.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID", "BLINK_PROJECT_ID"] } }
---

# Blink Email

Send emails via your linked Blink project's notification system using `blink notify email`.

## Setup (one-time)
```bash
blink secrets set BLINK_PROJECT_ID proj_xxx
```
Get your project ID from **blink.new → your project → Settings**.

## Send a plain text email
```bash
blink notify email $BLINK_PROJECT_ID "user@example.com" "Your order is confirmed" "Hi Alice, your order #1234 is confirmed."
```

## Send an HTML email from a file
```bash
blink notify email $BLINK_PROJECT_ID "user@example.com" "Weekly Report" --file ./report.html
```

## Send a notification to multiple users (loop)
```bash
for email in user1@example.com user2@example.com; do
  blink notify email $BLINK_PROJECT_ID "$email" "Important update" "The system will be down for maintenance at 2am."
done
```

## Command signature
```
blink notify email <project_id> <to> <subject> [body] [--file <html_file>]
```
- `project_id` — your Blink project ID (from `$BLINK_PROJECT_ID`)
- `to` — recipient email address
- `subject` — email subject line
- `body` — plain text body (optional if --file provided)
- `--file` — path to HTML file for rich email (optional)
