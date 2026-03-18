#!/bin/sh
PROVIDER="microsoft_outlook"
ENDPOINT="$1"
METHOD="${2:-GET}"
BODY="$3"
ACCOUNT_ID="$4"
BASE_URL="${BLINK_APIS_URL:-https://core.blink.new}"

PAYLOAD="{\"method\":\"$ENDPOINT\",\"http_method\":\"$METHOD\""
[ -n "$ACCOUNT_ID" ] && PAYLOAD="$PAYLOAD,\"account_id\":\"$ACCOUNT_ID\""
[ -n "$BODY" ] && PAYLOAD="$PAYLOAD,\"params\":$BODY"
PAYLOAD="$PAYLOAD}"

curl -sf -X POST "$BASE_URL/v1/connectors/$PROVIDER/execute" \
  -H "Authorization: Bearer $BLINK_API_KEY" \
  -H "Content-Type: application/json" \
  -H "x-blink-agent-id: $BLINK_AGENT_ID" \
  -d "$PAYLOAD"
