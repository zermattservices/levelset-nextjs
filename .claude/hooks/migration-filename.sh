#!/bin/bash
# Pre-write hook: validate migration filenames match YYYYMMDD_description.sql
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if echo "$FILE_PATH" | grep -q 'supabase/migrations/'; then
  BASENAME=$(basename "$FILE_PATH")
  if ! echo "$BASENAME" | grep -qE '^[0-9]{8}_[a-z_]+\.sql$'; then
    echo "Migration filename must match YYYYMMDD_description.sql pattern (got: $BASENAME)" >&2
    exit 2
  fi
fi
