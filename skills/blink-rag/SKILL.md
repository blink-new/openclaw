---
name: blink-rag
description: >
  Search a Blink project's knowledge base using semantic search or AI-synthesized answers.
  Upload documents to build a searchable knowledge base.
  Use when you need to answer questions from a corpus of documents,
  FAQs, or any structured knowledge. Requires BLINK_PROJECT_ID secret.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID", "BLINK_PROJECT_ID"] } }
---

# Blink RAG — Knowledge Base

Semantic search over your Blink project's document collection using `blink rag`.
Upload documents once, search them forever. AI-enhanced search synthesizes an answer from relevant chunks.

## Setup (one-time)
```bash
blink secrets set BLINK_PROJECT_ID proj_xxx
```
Get your project ID from **blink.new → your project → Settings**.

## Search the knowledge base
```bash
blink rag search $BLINK_PROJECT_ID "how does the refund policy work"
```

## AI-synthesized answer (recommended for Q&A)
```bash
blink rag search $BLINK_PROJECT_ID "what are the pricing tiers" --ai
```

## Search with more results
```bash
blink rag search $BLINK_PROJECT_ID "billing and payments" --ai --limit 10
```

## Upload a document
```bash
blink rag upload $BLINK_PROJECT_ID ./docs/faq.md
```

## Upload to a specific collection
```bash
blink rag upload $BLINK_PROJECT_ID ./docs/refund-policy.pdf --collection coll_xxx
```

## List collections
```bash
blink rag collections $BLINK_PROJECT_ID
```

## Command signatures
```
blink rag search <project_id> <query> [--ai] [--limit N]
blink rag upload <project_id> <file> [--collection <collection_id>]
blink rag collections <project_id>
```
