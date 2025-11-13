-- Add FOH/BOH zone classification to position Big 5 labels and clean position names
ALTER TABLE position_big5_labels
  ADD COLUMN zone TEXT;

-- Remove Spanish translations or trailing descriptors after a slash and trim whitespace
UPDATE position_big5_labels
SET position = trim(both ' ' FROM regexp_replace(position, '\s*/.*$', '', 'gi'));

-- Ensure positions with identical names remain unique by remerging duplicates if any
WITH ranked AS (
  SELECT id,
         org_id,
         location_id,
         position,
         ROW_NUMBER() OVER (PARTITION BY org_id, location_id, position ORDER BY created_at DESC) AS rn
  FROM position_big5_labels
)
DELETE FROM position_big5_labels
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- Categorise each position into FOH or BOH zones
UPDATE position_big5_labels
SET zone = CASE
  WHEN position ILIKE '%BOH%' THEN 'BOH'
  WHEN position ILIKE '%FOH%' THEN 'FOH'
  WHEN position IN (
    'iPOS', 'Host', 'OMD', 'Runner', 'Bagging', 'Drinks 1/3', 'Drinks 2',
    'Drive Thru', 'Front Counter', 'Dining Room', 'Meal Deliveries', 'Window',
    '3H Week', 'Cashier', 'Order Taker'
  ) THEN 'FOH'
  WHEN position IN (
    'Breader', 'Secondary', 'Fries', 'Primary', 'Machines', 'Prep', 'Chutes',
    'Kitchen', 'Dish', 'Kitchen Prep', '3H Week BOH'
  ) THEN 'BOH'
  WHEN position ILIKE 'Trainer %' THEN CASE WHEN position ILIKE '%BOH%' THEN 'BOH' ELSE 'FOH' END
  WHEN position ILIKE 'Leadership %' THEN CASE WHEN position ILIKE '%BOH%' THEN 'BOH' ELSE 'FOH' END
  WHEN position ILIKE '3H Week %' THEN CASE WHEN position ILIKE '%BOH%' THEN 'BOH' ELSE 'FOH' END
  ELSE 'FOH'
END;

-- Legacy 3H Week positions without suffix inherit FOH
UPDATE position_big5_labels
SET zone = 'FOH'
WHERE zone IS NULL AND position ILIKE '3H Week%';

-- Any remaining null zones default to FOH for now
UPDATE position_big5_labels
SET zone = 'FOH'
WHERE zone IS NULL;

ALTER TABLE position_big5_labels
  ALTER COLUMN zone SET NOT NULL;

ALTER TABLE position_big5_labels
  ADD CONSTRAINT position_big5_labels_zone_check CHECK (zone IN ('FOH', 'BOH'));

CREATE INDEX IF NOT EXISTS idx_position_big5_labels_zone ON position_big5_labels(zone);
