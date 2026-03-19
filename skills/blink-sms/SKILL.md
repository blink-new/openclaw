---
name: blink-sms
description: >
  Send SMS text messages to any phone number from the workspace's
  provisioned Twilio phone number. Use when asked to text someone,
  send a notification via SMS, deliver a confirmation code, appointment
  reminder, order status, or any alert by text message. Requires the
  workspace to have a provisioned phone number (check with blink phone list).
  Charges 0.1 credits per message.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"] } }
---

# Blink SMS

Send SMS text messages from your workspace's phone number to any mobile number worldwide.

## Send an SMS

```bash
blink sms send "+14155551234" "Your appointment is confirmed for tomorrow at 2pm."
```

## Send from a specific number (when workspace has multiple)

```bash
blink sms send "+14155551234" "Your order #1042 has shipped!" --from "+19143720262"
```

## International numbers

```bash
blink sms send "+447911123456" "Your verification code is 492817."
blink sms send "+61412345678" "Your order is ready for pickup."
blink sms send "+4915123456789" "Ihr Termin ist morgen um 14 Uhr bestätigt."
```

## Get JSON output (for scripting)

```bash
RESULT=$(blink sms send "+14155551234" "Hello" --json)
ID=$(echo "$RESULT" | python3 -c "import json,sys; print(json.loads(sys.stdin.read())['message_id'])")
```

## Check workspace phone numbers first

```bash
blink phone list
```

## Phone number format

Always use E.164 format:
- US/Canada: `+14155551234`
- UK: `+447911123456`
- Australia: `+61412345678`
- Germany: `+4915123456789`

## Command signature

```
blink sms send <to> <message> [options]
  --from <number>   Specific sender number (default: workspace primary)
  --json            Machine-readable JSON output
```

## Response format (--json)

```json
{
  "message_id": "sms_a1b2c3d4",
  "twilio_sid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "queued",
  "to": "+14155551234",
  "from": "+19143720262",
  "segment_count": 1,
  "credits_charged": 0.1
}
```

## Billing

0.1 credits per SMS (flat rate regardless of length up to ~480 chars).
Messages over 160 characters are split into multiple segments internally by the carrier, but the credit charge stays at 0.1 for typical messages.
Credits are charged immediately when the SMS is sent.

To send SMS, your workspace needs a phone number. If you don't have one:
```bash
blink phone buy --label "SMS"
```
