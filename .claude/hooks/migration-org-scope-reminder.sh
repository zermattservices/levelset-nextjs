#!/bin/bash
# Post-write hook: remind about org_id scoping when creating migration files with new tables
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if echo "$FILE_PATH" | grep -q 'supabase/migrations/'; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')
  if echo "$CONTENT" | grep -qi 'CREATE TABLE' && ! echo "$CONTENT" | grep -qi 'org_id'; then
    echo "Warning: New table detected without org_id column. Multi-tenant tables MUST include org_id."
  fi
fi
