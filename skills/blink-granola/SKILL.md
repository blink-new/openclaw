---
name: blink-granola
description: >
  Read the user's Granola meeting notes — list meetings in a time window, fetch
  full notes/summaries/attendees for specific meetings, pull verbatim
  transcripts, and answer natural-language questions across the user's meeting
  corpus. Use whenever the user asks about meeting notes, what was discussed,
  decisions, follow-ups, action items, or transcripts. Requires a linked
  Granola connection (provider key `composio_granola`).
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"], "connector": "composio_granola" } }
---

# Blink Granola

Granola is the user's AI meeting-notes app. The provider key is
`composio_granola`. Granola exposes data over an MCP (JSON-RPC) server, but
the Blink executor wraps that for you — call it like any other connector.

## One-time signup gate (read this first!)

OAuth-connecting Granola in Blink only authenticates the user with Granola's
identity service. Granola's MCP product gates on a **second** signup at
<https://granola.ai/mcp-signup>. Until that's done, every tool call comes
back as a 403 with the message:

```
Unauthorized: user has not created a Granola account yet.
Sign up at https://granola.ai/mcp-signup and then try again.
```

If you see that, surface the signup link to the user and stop — there is
nothing to fix on Blink's side.

## The 4 tools

Tool name goes in the URL slot. The body is the tool's arguments.
HTTP method is always `POST`.

### `list_meetings` — find meetings in a window

```bash
# Fixed windows
blink connector exec composio_granola list_meetings POST '{"time_range":"this_week"}'
blink connector exec composio_granola list_meetings POST '{"time_range":"last_week"}'
blink connector exec composio_granola list_meetings POST '{"time_range":"last_30_days"}'

# Custom window (ISO dates, both required when time_range is custom)
blink connector exec composio_granola list_meetings POST '{"time_range":"custom","custom_start":"2026-04-01","custom_end":"2026-04-30"}'
```

Returns titles + meeting IDs. Use the IDs with `get_meetings` /
`get_meeting_transcript`.

### `query_granola_meetings` — natural-language Q&A (preferred for open-ended questions)

```bash
blink connector exec composio_granola query_granola_meetings POST '{"query":"What follow-ups did we agree on with Acme last week?"}'

# Optionally pin the query to specific meetings (substitute real IDs from list_meetings)
blink connector exec composio_granola query_granola_meetings POST '{"query":"Action items?","document_ids":["<MEETING_UUID_A>","<MEETING_UUID_B>"]}'
```

Returns text with numbered citation links like `[[0]](url)`.
**Preserve those citations verbatim in your reply to the user** — they're how
the user verifies the answer.

### `get_meetings` — full notes for known meeting IDs

```bash
# Up to 10 meeting IDs per call. Returns private notes, AI summary, attendees, metadata.
# Substitute real UUIDs you got from list_meetings — never pass placeholder strings literally.
blink connector exec composio_granola get_meetings POST '{"meeting_ids":["<MEETING_UUID_A>","<MEETING_UUID_B>"]}'
```

### `get_meeting_transcript` — verbatim transcript for one meeting

```bash
blink connector exec composio_granola get_meeting_transcript POST '{"meeting_id":"<MEETING_UUID>"}'
```

Use this only when the user needs exact wording / quotes — for summaries or
action items, `query_granola_meetings` is faster and cheaper.

> **Paid-tier gate.** Transcripts require a paid Granola subscription. Free-tier
> users get back a 402 with the message `Transcripts are only available to paid
> Granola tiers (Upgrade at https://granola.ai/settings, then retry.)`. When you
> see that, surface the upgrade link and **fall back to `query_granola_meetings`
> or `get_meetings`** — both work on free tier and answer most quote-style
> questions well enough.

## Picking the right tool

| User asks for…                                              | Tool                       |
|-------------------------------------------------------------|----------------------------|
| "What did we decide about X?" / "follow-ups from Acme call" | `query_granola_meetings`   |
| "List my meetings this week"                                | `list_meetings`            |
| "Pull the notes for meeting X" (have an ID)                 | `get_meetings`             |
| "Quote what Sarah said about pricing"                       | `get_meeting_transcript`   |

If you don't have a meeting ID and the question is open-ended, prefer
`query_granola_meetings` over `list_meetings → get_meetings` — it's one call
and Granola's server-side ranker is better tuned than your own.

## Common use cases

- "Summarize my last week of meetings" → `query_granola_meetings` with
  `query: "Summarize key topics, decisions, and follow-ups from the last week"`.
- "What was the action item for me from the design review?" →
  `query_granola_meetings` with `query: "What action items were assigned to me in the design review?"`.
- "Show me every meeting I had with Customer X" →
  `query_granola_meetings` with `query: "List all meetings I've had with Customer X and their core topics"`.

## Errors

- **403 with "has not created a Granola account yet"** → user needs to
  complete <https://granola.ai/mcp-signup>. Show the link, stop.
- **402 with "Transcripts are only available to paid Granola tiers"** →
  free-tier user hit `get_meeting_transcript`. Show the upgrade link
  (<https://granola.ai/settings>) and retry the same question with
  `query_granola_meetings` (works on free tier).
- **`blink connector tool-execute composio_granola GRANOLA_MCP_*` returns
  "Unable to retrieve tool with slug"** → this path isn't supported
  (Composio's static catalog trips on Granola's MCP-dynamic schema). Always
  use `blink connector exec` with the lowercase tool name as shown above.
