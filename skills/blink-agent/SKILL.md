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

List and manage Claw agents in the workspace using `blink agent`. Zero configuration —
`BLINK_AGENT_ID` is already injected in every Claw machine.

## List all agents in the workspace
```bash
blink agent list
```
Output: table of agent IDs, names, statuses, sizes, and models.

## Check your own status
```bash
blink agent status
```

## Check another agent's status
```bash
blink agent status --agent clw_a1b2c3d4
```

## Set active agent for a session
```bash
eval $(blink agent use clw_a1b2c3d4 --export)
# Now blink secrets commands target that agent
```

## Agent manager pattern — bootstrap another agent
```bash
# 1. List agents to find the worker agent IDs
blink agent list

# 2. Set credentials on the worker agent
blink secrets set --agent clw_worker GITHUB_TOKEN ghp_xxx
blink secrets set --agent clw_worker DATABASE_URL postgres://...

# 3. Verify secrets were set
blink secrets list --agent clw_worker
```

## Machine-readable output
```bash
blink agent list --json
blink agent status --json
```

## Command signatures
```
blink agent list [--json]
blink agent status [--agent <agent_id>] [--json]
blink agent use <agent_id> [--export]     — use with eval to set active agent
```
- All commands use `BLINK_API_KEY` (workspace key) — no extra setup needed
- An agent can manage its own secrets directly with the `blink-secrets` skill
