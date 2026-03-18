---
name: blink-realtime
description: >
  Push live events to connected clients in a Blink app via WebSocket channels.
  Use to trigger UI refreshes, send notifications, broadcast data updates,
  or push any real-time event to app users. Requires BLINK_PROJECT_ID and BLINK_PROJECT_KEY.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID", "BLINK_PROJECT_ID", "BLINK_PROJECT_KEY"] } }
---

# Blink Realtime

Push live events to your Blink app's connected clients via WebSocket pub/sub.
App clients subscribed to a channel instantly receive the event.

## Setup (one-time)
```bash
blink secrets set BLINK_PROJECT_ID proj_xxx
blink secrets set BLINK_PROJECT_KEY blnk_sk_xxx
```

## Trigger a UI refresh
```bash
bash scripts/publish.sh "updates" '{"type":"refresh"}'
```

## Push a new data event
```bash
bash scripts/publish.sh "orders" '{"type":"new_order","id":"ord_123","total":49.99}'
```

## Send a notification to all connected users
```bash
bash scripts/publish.sh "notifications" '{"message":"System maintenance in 5 minutes","level":"warning"}'
```

## Broadcast agent status
```bash
bash scripts/publish.sh "agent-status" '{"status":"completed","task":"weekly report","result":"sent to 142 users"}'
```

## Script signature
```
publish.sh <channel> <json_data>
```
- `channel` — channel name (app clients subscribe to this)
- `json_data` — JSON payload to broadcast
