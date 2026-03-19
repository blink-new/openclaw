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

Manage the encrypted secrets vault using `blink secrets`. Zero configuration on Claw machines
— `BLINK_AGENT_ID` is already set.

## List all secret key names
```bash
blink secrets list
```

## Set or update a secret
```bash
blink secrets set GITHUB_TOKEN ghp_xxx
blink secrets set OPENAI_KEY sk-xxx
blink secrets set DATABASE_URL postgres://user:pass@host/db
```

## Delete a secret
```bash
blink secrets delete OLD_API_KEY
```

## Cross-agent management (set secrets on another agent)
```bash
blink secrets set --agent clw_other OPENAI_KEY sk-xxx
blink secrets list --agent clw_other
blink secrets delete --agent clw_other OLD_KEY
```

## Rotate a key
```bash
blink secrets set GITHUB_TOKEN ghp_new_value
# Old value is replaced — no need to delete first
```

## Command signatures
```
blink secrets list [--agent <agent_id>]
blink secrets set <key> <value> [--agent <agent_id>]
blink secrets delete <key> [--agent <agent_id>]
```
All secrets are stored encrypted (AES-256-GCM) and never returned in plaintext via the API.
After setting, the secret is immediately available as `$KEY_NAME` in all shell commands.
