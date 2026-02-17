-- Migration: Add scheduling_enabled to scheduling_areas, seed Administrative area and default positions

-- Add scheduling_enabled column (allows orgs to disable FOH/BOH for scheduling)
ALTER TABLE scheduling_areas
ADD COLUMN IF NOT EXISTS scheduling_enabled BOOLEAN NOT NULL DEFAULT true;

-- Seed default Administrative area for all orgs that have FOH/BOH but no Administrative area
INSERT INTO scheduling_areas (org_id, name, display_order, is_default, is_active, scheduling_enabled)
SELECT DISTINCT sa.org_id, 'Administrative', 2, true, true, true
FROM scheduling_areas sa
WHERE sa.is_default = true
  AND NOT EXISTS (
    SELECT 1 FROM scheduling_areas sa2
    WHERE sa2.org_id = sa.org_id AND sa2.name = 'Administrative'
  )
ON CONFLICT (org_id, name) DO NOTHING;

-- Seed default "FOH General" scheduling-only position
INSERT INTO org_positions (org_id, name, zone, display_order, is_active, position_type, area_id)
SELECT sa.org_id, 'FOH General', 'FOH',
  COALESCE((SELECT MAX(display_order) + 1 FROM org_positions op WHERE op.org_id = sa.org_id AND op.zone = 'FOH'), 0),
  true, 'scheduling_only', sa.id
FROM scheduling_areas sa
WHERE sa.name = 'FOH' AND sa.is_default = true
  AND NOT EXISTS (
    SELECT 1 FROM org_positions op
    WHERE op.org_id = sa.org_id AND op.name = 'FOH General' AND op.is_active = true
  );

-- Seed default "BOH General" scheduling-only position
INSERT INTO org_positions (org_id, name, zone, display_order, is_active, position_type, area_id)
SELECT sa.org_id, 'BOH General', 'BOH',
  COALESCE((SELECT MAX(display_order) + 1 FROM org_positions op WHERE op.org_id = sa.org_id AND op.zone = 'BOH'), 0),
  true, 'scheduling_only', sa.id
FROM scheduling_areas sa
WHERE sa.name = 'BOH' AND sa.is_default = true
  AND NOT EXISTS (
    SELECT 1 FROM org_positions op
    WHERE op.org_id = sa.org_id AND op.name = 'BOH General' AND op.is_active = true
  );
