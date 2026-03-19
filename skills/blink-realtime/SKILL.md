---
name: blink-realtime
description: >
  Push live events to connected clients in a Blink app via WebSocket channels.
  Use to trigger UI refreshes, send notifications, broadcast data updates,
  or push any real-time event to app users. Requires BLINK_PROJECT_ID secret.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID", "BLINK_PROJECT_ID"] } }
---

# Blink Realtime

Push live events to your Blink app's connected clients via WebSocket pub/sub using `blink realtime publish`.
App clients subscribed to a channel instantly receive the event.

## Setup (one-time)
```bash
blink secrets set BLINK_PROJECT_ID proj_xxx
```
Get your project ID from **blink.new → your project → Settings**.

## Trigger a UI refresh
```bash
blink realtime publish $BLINK_PROJECT_ID "updates" '{"type":"refresh"}'
```

## Push a new data event
```bash
blink realtime publish $BLINK_PROJECT_ID "orders" '{"type":"new_order","id":"ord_123","total":49.99}'
```

## Send a notification to all connected users
```bash
blink realtime publish $BLINK_PROJECT_ID "notifications" '{"message":"System maintenance in 5 minutes","level":"warning"}'
```

## Broadcast agent status
```bash
blink realtime publish $BLINK_PROJECT_ID "agent-status" '{"status":"completed","task":"weekly report","result":"sent to 142 users"}'
```

## Command signature
```
blink realtime publish <project_id> <channel> <json_data>
```
- `project_id` — your Blink project ID (from `$BLINK_PROJECT_ID`)
- `channel` — channel name (app clients subscribe to this)
- `json_data` — JSON payload to broadcast
