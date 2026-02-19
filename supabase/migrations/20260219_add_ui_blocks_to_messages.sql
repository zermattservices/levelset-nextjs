-- Add ui_blocks JSONB column to ai_messages for persisting rich UI card data.
-- UI blocks are structured card payloads (employee cards, rating summaries, etc.)
-- that the mobile app renders inline in the chat. Without persistence, they are
-- lost when the user reloads conversation history.

ALTER TABLE ai_messages
  ADD COLUMN IF NOT EXISTS ui_blocks JSONB;
