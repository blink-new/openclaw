---
name: blink-secrets
description: >
  Manage the encrypted secrets vault for this agent or other agents in the workspace.
  List, set, and delete secrets. Secrets are available as $KEY_NAME in all shell commands.
  Values are never shown after being saved — only key names are listed.
  Use for credential management, rotating API keys, or bootstrapping other agents.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"] } }
---

# Blink Secrets

Manage the encrypted secrets vault for this agent (or other agents in the workspace).
Zero configuration on Claw machines — `BLINK_AGENT_ID` is already set.

## List all secret key names
```bash
bash scripts/list.sh
```

## Set or update a secret
```bash
bash scripts/set.sh GITHUB_TOKEN ghp_xxx
bash scripts/set.sh OPENAI_KEY sk-xxx
bash scripts/set.sh DATABASE_URL postgres://user:pass@host/db
```

## Delete a secret
```bash
bash scripts/delete.sh OLD_API_KEY
```

## Cross-agent management (set secrets on another agent)
```bash
bash scripts/set.sh --agent clw_other OPENAI_KEY sk-xxx
bash scripts/list.sh --agent clw_other
bash scripts/delete.sh --agent clw_other OLD_KEY
```

## Check what secrets are available
```bash
bash scripts/list.sh
# Output: KEY names only (values are never shown for security)
```

## Rotate a key
```bash
bash scripts/set.sh GITHUB_TOKEN ghp_new_value
# Old value is replaced — no need to delete first
```

## Script signatures
```
list.sh [--agent <agent_id>]
set.sh <key> <value> [--agent <agent_id>]
delete.sh <key> [--agent <agent_id>]
```
All secrets are stored encrypted (AES-256-GCM) and never returned in plaintext via the API.
After setting, the secret is immediately available as `$KEY_NAME` in all shell commands.
