#!/bin/bash
# Pre-write/edit hook: block modifications to .env files containing secrets
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if echo "$FILE_PATH" | grep -qE '\.env(\.[a-z]+)?$'; then
  echo "BLOCKED: Cannot edit .env files. These contain secrets and must be edited manually." >&2
  exit 2
fi
