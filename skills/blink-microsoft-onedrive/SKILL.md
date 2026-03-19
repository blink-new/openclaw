---
name: blink-microsoft-onedrive
description: >
  Access, upload, and manage files in Microsoft OneDrive. Use when asked to list
  files, search documents, share links, or manage folders in OneDrive. Requires
  a linked Microsoft connection.
metadata:
  { "blink": { "requires_env": ["BLINK_API_KEY", "BLINK_AGENT_ID"], "connector": "microsoft_onedrive" } }
---

# Blink Microsoft OneDrive

Access and manage OneDrive files via Microsoft Graph API. Provider key: `microsoft_onedrive`.

## List root files
```bash
blink connector exec microsoft_onedrive /me/drive/root/children GET \
  '{"$select":"name,id,size,lastModifiedDateTime,webUrl","$top":"30"}'
```

## Search files
```bash
blink connector exec microsoft_onedrive "/me/drive/root/search(q='report')" GET
```

## Get file details
```bash
blink connector exec microsoft_onedrive /me/drive/items/{itemId} GET
```

## Create folder
```bash
blink connector exec microsoft_onedrive /me/drive/root/children POST '{
  "name": "New Folder",
  "folder": {},
  "@microsoft.graph.conflictBehavior": "rename"
}'
```

## Get sharing link
```bash
blink connector exec microsoft_onedrive /me/drive/items/{itemId}/createLink POST \
  '{"type":"view","scope":"anonymous"}'
```

## List folder contents
```bash
blink connector exec microsoft_onedrive /me/drive/items/{folderId}/children GET
```

## Delete item
```bash
blink connector exec microsoft_onedrive /me/drive/items/{itemId} DELETE
```

## Common use cases
- "What files do I have in OneDrive?" → list root/children
- "Find the Q4 report" → search with query
- "Share the presentation with a link" → createLink
- "Create a folder called Projects" → POST new folder
- "Delete the old draft" → DELETE item
