---
name: blink-microsoft
description: >
  **DEPRECATED**: Use the split skills instead: `blink-microsoft-outlook`,
  `blink-microsoft-calendar`, `blink-microsoft-onedrive`, `blink-microsoft-teams`.
  Each provides focused scopes and better token management.

  Access Microsoft 365 services: Outlook email, Teams messages, OneDrive files,
  and Calendar events. Use when asked to check email, send messages, manage
  files, or schedule meetings via Microsoft. Requires a linked Microsoft connection.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"], "connector": "microsoft" } }
---

# Blink Microsoft (Deprecated)

> **Prefer the split skills** — `blink-microsoft-outlook`, `blink-microsoft-calendar`,
> `blink-microsoft-onedrive`, `blink-microsoft-teams`. Use this skill only when a
> user has linked the legacy `microsoft` (monolithic) connector.

Access Microsoft 365 (Outlook, Teams, OneDrive, Calendar). Provider key: `microsoft`.

## Get user profile
```bash
blink connector exec microsoft /me GET
```

## List Outlook emails (inbox)
```bash
blink connector exec microsoft /me/messages GET \
  '{"$top":"20","$filter":"isRead eq false","$orderby":"receivedDateTime desc"}'
```

## Search emails
```bash
blink connector exec microsoft /me/messages GET \
  '{"$search":"\"project deadline\"","$top":"10"}'
```

## Send an email
```bash
blink connector exec microsoft /me/sendMail POST '{
  "message": {
    "subject": "Hello from your agent",
    "body": {"contentType": "Text", "content": "Message body here"},
    "toRecipients": [{"emailAddress": {"address": "recipient@example.com"}}]
  }
}'
```

## List calendar events
```bash
blink connector exec microsoft /me/events GET \
  '{"$top":"20","$orderby":"start/dateTime"}'
```

## Create a calendar event
```bash
blink connector exec microsoft /me/events POST '{
  "subject": "Team Standup",
  "start": {"dateTime": "2026-03-20T10:00:00", "timeZone": "UTC"},
  "end": {"dateTime": "2026-03-20T10:30:00", "timeZone": "UTC"},
  "attendees": [{"emailAddress": {"address": "colleague@company.com"}, "type": "required"}]
}'
```

## List OneDrive files
```bash
blink connector exec microsoft /me/drive/root/children GET \
  '{"$top":"30","$select":"name,id,size,lastModifiedDateTime,webUrl"}'
```

## List Teams
```bash
blink connector exec microsoft /me/joinedTeams GET
```

## Send Teams message
```bash
blink connector exec microsoft /teams/TEAM_ID/channels/CHANNEL_ID/messages POST \
  '{"body":{"content":"Hello from your agent!"}}'
```
