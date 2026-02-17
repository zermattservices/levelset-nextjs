#!/bin/bash
# Post-edit hook: remind to update both EN and ES locale files
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if echo "$FILE_PATH" | grep -q '/locales/en/'; then
  CORRESPONDING=$(echo "$FILE_PATH" | sed 's|/locales/en/|/locales/es/|')
  echo "Reminder: also update the Spanish locale file at $CORRESPONDING"
elif echo "$FILE_PATH" | grep -q '/locales/es/'; then
  CORRESPONDING=$(echo "$FILE_PATH" | sed 's|/locales/es/|/locales/en/|')
  echo "Reminder: also update the English locale file at $CORRESPONDING"
fi
