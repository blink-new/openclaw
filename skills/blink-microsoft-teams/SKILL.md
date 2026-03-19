---
name: blink-microsoft-teams
description: >
  Send messages, list teams and channels in Microsoft Teams via the Microsoft
  Graph API. Use when asked to send Teams messages, check team activity, or list
  channels. Requires a linked Microsoft connection.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"], "connector": "microsoft_teams" } }
---

# Blink Microsoft Teams

Manage Teams messages and channels via Microsoft Graph API. Provider key: `microsoft_teams`.

## List my teams
```bash
blink connector exec microsoft_teams /me/joinedTeams GET
```

## List channels in a team
```bash
blink connector exec microsoft_teams /teams/{teamId}/channels GET
```

## Send channel message
```bash
blink connector exec microsoft_teams /teams/{teamId}/channels/{channelId}/messages POST \
  '{"body":{"content":"Hello team!"}}'
```

## Get channel messages
```bash
blink connector exec microsoft_teams /teams/{teamId}/channels/{channelId}/messages GET \
  '{"$top":"20"}'
```

## Send chat message
```bash
blink connector exec microsoft_teams /chats/{chatId}/messages POST \
  '{"body":{"content":"Hi!"}}'
```

## List my chats
```bash
blink connector exec microsoft_teams /me/chats GET \
  '{"$expand":"members"}'
```

## Get team members
```bash
blink connector exec microsoft_teams /teams/{teamId}/members GET
```

## Common use cases
- "Post a message in the general channel" → send channel message
- "What teams am I in?" → list joinedTeams
- "Send a message to Sarah on Teams" → send chat message
- "What channels are in the Engineering team?" → list channels
- "Get the last 20 messages from the dev channel" → get channel messages
