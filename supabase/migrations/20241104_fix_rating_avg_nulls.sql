-- Fix rating_avg to properly handle null criteria values
-- The average should only include non-null ratings

-- First, check if the view exists and drop it temporarily
DROP VIEW IF EXISTS employee_latest_rating CASCADE;

-- Drop existing generated column if it exists
ALTER TABLE ratings 
DROP COLUMN IF EXISTS rating_avg CASCADE;

-- Recreate rating_avg as a generated column that handles nulls correctly
ALTER TABLE ratings
ADD COLUMN rating_avg NUMERIC GENERATED ALWAYS AS (
  CASE 
    WHEN rating_1 IS NULL AND rating_2 IS NULL AND rating_3 IS NULL AND rating_4 IS NULL AND rating_5 IS NULL THEN NULL
    ELSE (
      COALESCE(rating_1, 0) + 
      COALESCE(rating_2, 0) + 
      COALESCE(rating_3, 0) + 
      COALESCE(rating_4, 0) + 
      COALESCE(rating_5, 0)
    ) / (
      (CASE WHEN rating_1 IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN rating_2 IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN rating_3 IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN rating_4 IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN rating_5 IS NOT NULL THEN 1 ELSE 0 END)
    )
  END
) STORED;

-- Add a comment explaining the logic
COMMENT ON COLUMN ratings.rating_avg IS 'Average of non-null rating criteria (1-5). Handles missing criteria by only averaging the ratings that exist.';

-- Recreate the employee_latest_rating view if it was dropped
-- (You may need to adjust this based on your actual view definition)
-- If you know the original view definition, uncomment and update below:
-- CREATE VIEW employee_latest_rating AS
-- SELECT DISTINCT ON (employee_id) 
--   employee_id,
--   rating_avg,
--   created_at
-- FROM ratings
-- ORDER BY employee_id, created_at DESC;

