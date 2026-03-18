---
name: blink-rag
description: >
  Search a Blink project's knowledge base using semantic search or AI-synthesized answers.
  Upload documents to build a searchable knowledge base.
  Use when you need to answer questions from a corpus of documents,
  FAQs, or any structured knowledge. Requires BLINK_PROJECT_ID and BLINK_PROJECT_KEY.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID", "BLINK_PROJECT_ID", "BLINK_PROJECT_KEY"] } }
---

# Blink RAG — Knowledge Base

Semantic search over your Blink project's document collection. Upload documents once,
search them forever. AI-enhanced search synthesizes an answer from relevant chunks.

## Setup (one-time)
```bash
blink secrets set BLINK_PROJECT_ID proj_xxx
blink secrets set BLINK_PROJECT_KEY blnk_sk_xxx
```

## Search the knowledge base
```bash
bash scripts/search.sh "how does the refund policy work"
```

## AI-synthesized answer (recommended for Q&A)
```bash
bash scripts/search.sh "what are the pricing tiers" --ai
```

## Search with more results
```bash
bash scripts/search.sh "billing and payments" --limit 10
```

## Upload a document
```bash
bash scripts/upload.sh ./docs/faq.md
```

## Upload to a specific collection
```bash
bash scripts/upload.sh ./docs/refund-policy.pdf --collection coll_xxx
```

## List collections
```bash
bash scripts/collections.sh
```

## Script signatures
```
search.sh <query> [--ai] [--limit N]
upload.sh <file> [--collection <collection_id>]
collections.sh
```
