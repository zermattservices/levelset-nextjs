-- Add Spanish translation columns to position_big5_labels and infractions_rubric tables

-- Add Spanish translations to position_big5_labels
ALTER TABLE position_big5_labels
  ADD COLUMN IF NOT EXISTS position_es TEXT,
  ADD COLUMN IF NOT EXISTS label_1_es TEXT,
  ADD COLUMN IF NOT EXISTS label_2_es TEXT,
  ADD COLUMN IF NOT EXISTS label_3_es TEXT,
  ADD COLUMN IF NOT EXISTS label_4_es TEXT,
  ADD COLUMN IF NOT EXISTS label_5_es TEXT;

-- Add Spanish translations to infractions_rubric
ALTER TABLE infractions_rubric
  ADD COLUMN IF NOT EXISTS action_es TEXT;

-- Add comments for documentation
COMMENT ON COLUMN position_big5_labels.position_es IS 'Spanish translation of position name';
COMMENT ON COLUMN position_big5_labels.label_1_es IS 'Spanish translation of first Big 5 label';
COMMENT ON COLUMN position_big5_labels.label_2_es IS 'Spanish translation of second Big 5 label';
COMMENT ON COLUMN position_big5_labels.label_3_es IS 'Spanish translation of third Big 5 label';
COMMENT ON COLUMN position_big5_labels.label_4_es IS 'Spanish translation of fourth Big 5 label';
COMMENT ON COLUMN position_big5_labels.label_5_es IS 'Spanish translation of fifth Big 5 label';
COMMENT ON COLUMN infractions_rubric.action_es IS 'Spanish translation of infraction action';

-- Populate position_es column with existing Spanish translations from CSV data
UPDATE position_big5_labels
SET position_es = 'Anfitrión'
WHERE position = 'Host' AND position_es IS NULL;

UPDATE position_big5_labels
SET position_es = 'Embolsado'
WHERE position = 'Bagging' AND position_es IS NULL;

UPDATE position_big5_labels
SET position_es = 'Bebidas 1/3'
WHERE position = 'Drinks 1/3' AND position_es IS NULL;

UPDATE position_big5_labels
SET position_es = 'Bebidas 2'
WHERE position = 'Drinks 2' AND position_es IS NULL;

UPDATE position_big5_labels
SET position_es = 'Empanizador'
WHERE position = 'Breader' AND position_es IS NULL;

UPDATE position_big5_labels
SET position_es = 'Papas'
WHERE position = 'Fries' AND position_es IS NULL;

UPDATE position_big5_labels
SET position_es = 'Maquinas'
WHERE position = 'Machines' AND position_es IS NULL;

UPDATE position_big5_labels
SET position_es = 'Primaria'
WHERE position = 'Primary' AND position_es IS NULL;

UPDATE position_big5_labels
SET position_es = 'Secundaria'
WHERE position = 'Secondary' AND position_es IS NULL;

