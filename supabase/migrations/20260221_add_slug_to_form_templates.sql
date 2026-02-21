-- Add slug column to form_templates for human-readable URLs
-- Slugs are unique per org and auto-generated from the form name

-- Add the column (nullable initially so we can backfill)
ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill slugs from existing names:
-- lowercase, replace non-alphanumeric with hyphens, trim leading/trailing hyphens, collapse multiple hyphens
UPDATE form_templates
SET slug = regexp_replace(
  regexp_replace(
    regexp_replace(
      lower(name),
      '[^a-z0-9]+', '-', 'g'
    ),
    '^-+|-+$', '', 'g'
  ),
  '-{2,}', '-', 'g'
)
WHERE slug IS NULL;

-- Handle any duplicate slugs within the same org by appending a numeric suffix
DO $$
DECLARE
  rec RECORD;
  counter INTEGER;
  new_slug TEXT;
BEGIN
  FOR rec IN
    SELECT id, org_id, slug
    FROM form_templates t1
    WHERE EXISTS (
      SELECT 1 FROM form_templates t2
      WHERE t2.org_id = t1.org_id
        AND t2.slug = t1.slug
        AND t2.id <> t1.id
        AND t2.created_at <= t1.created_at
    )
    ORDER BY org_id, slug, created_at
  LOOP
    counter := 1;
    new_slug := rec.slug || '-' || counter;
    WHILE EXISTS (
      SELECT 1 FROM form_templates
      WHERE org_id = rec.org_id AND slug = new_slug AND id <> rec.id
    ) LOOP
      counter := counter + 1;
      new_slug := rec.slug || '-' || counter;
    END LOOP;
    UPDATE form_templates SET slug = new_slug WHERE id = rec.id;
  END LOOP;
END $$;

-- Now make it NOT NULL and add unique constraint
ALTER TABLE form_templates ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX idx_form_templates_org_slug ON form_templates(org_id, slug);
