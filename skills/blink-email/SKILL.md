---
name: blink-email
description: >
  Send transactional emails to users of a linked Blink project.
  Use to send confirmations, notifications, reports, or any email
  from your agent to app users. Requires BLINK_PROJECT_ID and BLINK_PROJECT_KEY.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID", "BLINK_PROJECT_ID", "BLINK_PROJECT_KEY"] } }
---

# Blink Email

Send emails via your linked Blink project's notification system.

## Setup (one-time)
```bash
blink secrets set BLINK_PROJECT_ID proj_xxx
blink secrets set BLINK_PROJECT_KEY blnk_sk_xxx
```

## Send a plain text email
```bash
bash scripts/send.sh "user@example.com" "Your order is confirmed" "Hi Alice, your order #1234 is confirmed."
```

## Send an HTML email from a file
```bash
bash scripts/send.sh "user@example.com" "Weekly Report" "" ./report.html
```

## Send a notification to multiple users (loop)
```bash
for email in user1@example.com user2@example.com; do
  bash scripts/send.sh "$email" "Important update" "The system will be down for maintenance at 2am."
done
```

## Script signature
```
send.sh <to> <subject> [body] [html_file]
```
- `to` — recipient email address
- `subject` — email subject line
- `body` — plain text body (optional if html_file provided)
- `html_file` — path to HTML file for rich email (optional)
