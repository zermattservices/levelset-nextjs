-- Setup template blocks: configurable time boundaries for employee rotation.
-- Blocks are derived from staffing changes in the template grid, plus optional custom blocks.
-- Recomputed on every template save.

CREATE TABLE setup_template_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES setup_templates(id) ON DELETE CASCADE,
  block_time TIME NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, block_time)
);

CREATE INDEX idx_setup_template_blocks_template ON setup_template_blocks(template_id);

-- Enable RLS (service role only — same pattern as other setup tables)
ALTER TABLE setup_template_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON setup_template_blocks FOR ALL USING (true);
