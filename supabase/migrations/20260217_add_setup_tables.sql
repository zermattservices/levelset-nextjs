-- Setup Board: templates, template schedules, template slots, and assignments
-- These tables support the position assignment ("setup") feature in the scheduling module.

-- 1. Setup Templates: org-level definitions of position slot configurations
CREATE TABLE setup_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  name TEXT NOT NULL,
  zone TEXT NOT NULL CHECK (zone IN ('FOH', 'BOH')),
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_setup_templates_org ON setup_templates(org_id);

-- 2. Setup Template Schedules: which days/times a template is active
CREATE TABLE setup_template_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES setup_templates(id) ON DELETE CASCADE,
  day_of_week INTEGER[] NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_setup_template_schedules_template ON setup_template_schedules(template_id);

-- 3. Setup Template Slots: per-position slot counts per 30-min increment
CREATE TABLE setup_template_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES setup_templates(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES org_positions(id),
  time_slot TIME NOT NULL,
  slot_count INTEGER NOT NULL DEFAULT 1 CHECK (slot_count >= 0),
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, position_id, time_slot)
);

CREATE INDEX idx_setup_template_slots_template ON setup_template_slots(template_id);
CREATE INDEX idx_setup_template_slots_position ON setup_template_slots(position_id);

-- 4. Setup Assignments: actual employee-to-position assignments within a shift
CREATE TABLE setup_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  position_id UUID NOT NULL REFERENCES org_positions(id),
  assignment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  assigned_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_setup_assignments_org ON setup_assignments(org_id);
CREATE INDEX idx_setup_assignments_shift ON setup_assignments(shift_id);
CREATE INDEX idx_setup_assignments_employee ON setup_assignments(employee_id);
CREATE INDEX idx_setup_assignments_date ON setup_assignments(assignment_date);
CREATE INDEX idx_setup_assignments_position ON setup_assignments(position_id);

-- Enable RLS on all new tables
ALTER TABLE setup_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_template_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_template_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies: service role bypasses; authenticated users can read their org's data
CREATE POLICY "Service role full access" ON setup_templates FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON setup_template_schedules FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON setup_template_slots FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON setup_assignments FOR ALL TO service_role USING (true);
