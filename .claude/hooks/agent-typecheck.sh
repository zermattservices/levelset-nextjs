#!/bin/bash
# Post-edit hook: typecheck agent files when they're modified
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if echo "$FILE_PATH" | grep -q 'apps/agent/'; then
  cd "$CLAUDE_PROJECT_DIR" && pnpm --filter agent typecheck 2>&1 | tail -20
fi
