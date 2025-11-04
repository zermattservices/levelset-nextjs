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

-- Recreate the employee_latest_rating view with the original definition
CREATE VIEW public.employee_latest_rating AS
SELECT
  e.id AS employee_id,
  e.first_name AS full_name,
  e.location_id,
  r.position,
  r.rating_avg,
  r.created_at
FROM
  employees e
  LEFT JOIN LATERAL (
    SELECT
      r_1.id,
      r_1.employee_id,
      r_1.rater_user_id,
      r_1.position,
      r_1.rating_1,
      r_1.rating_2,
      r_1.rating_3,
      r_1.rating_4,
      r_1.rating_5,
      r_1.rating_avg,
      r_1.created_at
    FROM
      ratings r_1
    WHERE
      r_1.employee_id = e.id
    ORDER BY
      r_1.created_at DESC
    LIMIT 1
  ) r ON true;

