#!/usr/bin/env bash
# Upload an image to LinkedIn and return the asset URN
# Usage: upload-image.sh <image_url> [account_id]
# Returns: JSON with { "data": { "asset_urn": "urn:li:digitalmediaAsset:..." } }
set -euo pipefail
IMAGE_URL="${1:-}"
ACCOUNT="${2:-}"
[ -z "$IMAGE_URL" ] && echo "Usage: upload-image.sh <image_url> [account_id]" && exit 1
BODY=$(python3 -c "
import json, sys
d = {'media_url': sys.argv[1], 'media_type': 'image'}
if sys.argv[2]: d['account_id'] = sys.argv[2]
print(json.dumps(d))
" "$IMAGE_URL" "$ACCOUNT")
curl -sf -X POST \
  -H "Authorization: Bearer ${BLINK_API_KEY}" \
  -H "x-blink-agent-id: ${BLINK_AGENT_ID}" \
  -H "Content-Type: application/json" \
  "${BLINK_APIS_URL:-https://core.blink.new}/api/v1/connectors/linkedin/upload-media" \
  -d "$BODY"
