---
name: blink-app
description: >
  Read and write data in a linked Blink project's database and file storage.
  Use to manage app data, query users, update records, upload/download files.
  Requires BLINK_PROJECT_ID and BLINK_PROJECT_KEY secrets to be set first.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID", "BLINK_PROJECT_ID", "BLINK_PROJECT_KEY"] } }
---

# Blink App — Project Database & Storage

Access a linked Blink project's isolated SQLite database and file storage.

## Setup (one-time)
Store your project credentials as agent secrets:
```bash
blink secrets set BLINK_PROJECT_ID proj_xxx
blink secrets set BLINK_PROJECT_KEY blnk_sk_xxx
```
Get these from **blink.new → your project → Settings → API Keys**.

---

## Database

### Query the database
```bash
bash scripts/db-query.sh "SELECT * FROM users LIMIT 10"
```

### Count records
```bash
bash scripts/db-query.sh "SELECT count(*) as total FROM orders WHERE status = 'pending'"
```

### Insert a record
```bash
bash scripts/db-query.sh "INSERT INTO tasks (id, title, done) VALUES ('t_123', 'My task', 0)"
```

### Execute a SQL file
```bash
bash scripts/db-exec.sh schema.sql
```

### List all tables
```bash
bash scripts/db-list.sh
```

### Show rows in a table
```bash
bash scripts/db-list.sh users
```

---

## Storage

### Upload a file
```bash
bash scripts/storage-upload.sh ./report.pdf reports/2024/report.pdf
```

### List files
```bash
bash scripts/storage-list.sh
bash scripts/storage-list.sh images/
```

### Get a public URL for a file
```bash
bash scripts/storage-url.sh images/logo.png
```

### Download a file
```bash
bash scripts/storage-download.sh reports/2024/report.pdf ./local-report.pdf
```

---

## Script signatures
```
db-query.sh <sql>
db-exec.sh <file.sql>
db-list.sh [table]
storage-upload.sh <local_file> [storage_path]
storage-list.sh [prefix]
storage-url.sh <storage_path>
storage-download.sh <storage_path> [output_file]
```
All scripts use `$BLINK_PROJECT_ID` and `$BLINK_PROJECT_KEY` from the agent secrets vault.
