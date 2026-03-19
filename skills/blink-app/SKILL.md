---
name: blink-app
description: >
  Read and write data in a linked Blink project's database and file storage.
  Use to manage app data, query users, update records, upload/download files.
  Requires BLINK_PROJECT_ID secret to be set first.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID", "BLINK_PROJECT_ID"] } }
---

# Blink App — Project Database & Storage

Access a linked Blink project's isolated SQLite database and file storage using `blink db` and `blink storage`.

## Setup (one-time)
Store your project ID as an agent secret:
```bash
blink secrets set BLINK_PROJECT_ID proj_xxx
```
Get your project ID from **blink.new → your project → Settings → API Keys**.

---

## Database

### Query the database
```bash
blink db query $BLINK_PROJECT_ID "SELECT * FROM users LIMIT 10"
```

### Count records
```bash
blink db query $BLINK_PROJECT_ID "SELECT count(*) as total FROM orders WHERE status = 'pending'"
```

### Insert a record
```bash
blink db query $BLINK_PROJECT_ID "INSERT INTO tasks (id, title, done) VALUES ('t_123', 'My task', 0)"
```

### Execute a SQL file
```bash
eval $(blink use $BLINK_PROJECT_ID --export)
blink db exec schema.sql
```

### List all tables
```bash
eval $(blink use $BLINK_PROJECT_ID --export)
blink db list
```

### Show rows in a table
```bash
eval $(blink use $BLINK_PROJECT_ID --export)
blink db list users
```

---

## Storage

### Upload a file
```bash
blink storage upload $BLINK_PROJECT_ID ./report.pdf --path reports/2024/report.pdf
```

### List files
```bash
blink storage list $BLINK_PROJECT_ID
blink storage list $BLINK_PROJECT_ID images/
```

### Get a public URL for a file
```bash
blink storage url $BLINK_PROJECT_ID images/logo.png
```

### Download a file
```bash
blink storage download $BLINK_PROJECT_ID reports/2024/report.pdf ./local-report.pdf
```

---

## Command signatures
```
blink db query <project_id> <sql>
blink db exec <file.sql>             # requires: eval $(blink use $BLINK_PROJECT_ID --export)
blink db list [table]                # requires: eval $(blink use $BLINK_PROJECT_ID --export)
blink storage upload <project_id> <local_file> [--path <storage_path>]
blink storage list <project_id> [prefix]
blink storage url <project_id> <storage_path>
blink storage download <project_id> <storage_path> [output_file]
```
All commands use `$BLINK_PROJECT_ID` from the agent secrets vault.
