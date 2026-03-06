-- Add Spanish translation columns to disc_actions and infractions tables
-- disc_actions.action_es: Spanish translation of disciplinary action type
-- infractions.infraction_es: Spanish translation of infraction name (copied from rubric at creation time)

ALTER TABLE disc_actions
  ADD COLUMN IF NOT EXISTS action_es TEXT;

ALTER TABLE infractions
  ADD COLUMN IF NOT EXISTS infraction_es TEXT;

COMMENT ON COLUMN disc_actions.action_es IS 'Spanish translation of disciplinary action type';
COMMENT ON COLUMN infractions.infraction_es IS 'Spanish translation of infraction name, copied from infractions_rubric.action_es at creation time';
