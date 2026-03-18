---
name: blink-agent
description: >
  List and manage Blink Claw agents in the workspace. Check agent status,
  set the active agent context, and bootstrap other agents with secrets.
  Enables the "agent manager" pattern where one agent configures others.
  Use when you need to orchestrate multiple agents or inspect the workspace.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"] } }
---

# Blink Agent Management

List and manage Claw agents in the workspace. Zero configuration — `BLINK_AGENT_ID`
is already injected in every Claw machine.

## List all agents in the workspace
```bash
bash scripts/list.sh
```
Output: table of agent IDs, names, statuses, sizes, and models.

## Check your own status
```bash
bash scripts/status.sh
```

## Check another agent's status
```bash
bash scripts/status.sh clw_a1b2c3d4
```

## Set active agent for a session
```bash
eval $(bash scripts/use.sh clw_a1b2c3d4)
# Now blink secrets commands target that agent
```

## Agent manager pattern — bootstrap another agent
```bash
# 1. List agents to find the worker agent IDs
bash scripts/list.sh

# 2. Set credentials on the worker agent
blink secrets set --agent clw_worker GITHUB_TOKEN ghp_xxx
blink secrets set --agent clw_worker DATABASE_URL postgres://...

# 3. Verify secrets were set
blink secrets list --agent clw_worker
```

## Script signatures
```
list.sh
status.sh [agent_id]
use.sh <agent_id>    — outputs shell export; use with eval
```

## Tips
- `bash scripts/list.sh --json` returns machine-readable JSON
- An agent can manage its own secrets directly with `blink-secrets` skill
- All commands use `BLINK_API_KEY` (workspace key) — no extra setup needed
