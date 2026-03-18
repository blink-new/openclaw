#!/usr/bin/env bash
# Upload video and create LinkedIn post in one step
# Usage: post-with-video.sh <text> <video_url> [visibility=PUBLIC] [account_id]
# Visibility options: PUBLIC, CONNECTIONS, LOGGED_IN (LinkedIn values)
set -euo pipefail
TEXT="${1:-}"
VIDEO_URL="${2:-}"
VISIBILITY="${3:-PUBLIC}"
ACCOUNT="${4:-}"
[ -z "$TEXT" ] || [ -z "$VIDEO_URL" ] && echo "Usage: post-with-video.sh <text> <video_url> [visibility] [account_id]" && exit 1

# Step 1: upload video
UPLOAD_RESP=$(bash "$(dirname "$0")/upload-video.sh" "$VIDEO_URL" "$ACCOUNT")
VIDEO_URN=$(python3 -c "import json,sys; print(json.loads(sys.stdin.read())['data']['asset_urn'])" <<< "$UPLOAD_RESP")
[ -z "$VIDEO_URN" ] && echo "Error: upload failed: $UPLOAD_RESP" && exit 1

# Step 2: get person ID (from /userinfo)
USERINFO=$(bash "$(dirname "$0")/call.sh" /userinfo GET '{}' "$ACCOUNT")
PERSON_ID=$(python3 -c "import json,sys; print(json.loads(sys.stdin.read())['data']['sub'])" <<< "$USERINFO")

# Step 3: create post
POST_BODY=$(python3 -c "
import json, sys
text, video_urn, person_id, visibility = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
print(json.dumps({
  'author': f'urn:li:person:{person_id}',
  'lifecycleState': 'PUBLISHED',
  'specificContent': {
    'com.linkedin.ugc.ShareContent': {
      'shareCommentary': {'text': text},
      'shareMediaCategory': 'VIDEO',
      'media': [{'status': 'READY', 'media': video_urn}]
    }
  },
  'visibility': {'com.linkedin.ugc.MemberNetworkVisibility': visibility}
}))
" "$TEXT" "$VIDEO_URN" "$PERSON_ID" "$VISIBILITY")
bash "$(dirname "$0")/call.sh" /ugcPosts POST "$POST_BODY" "$ACCOUNT"
