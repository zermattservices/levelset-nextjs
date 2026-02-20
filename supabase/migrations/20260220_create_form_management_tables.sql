-- Form Management Module: Tables, Indexes, and RLS Policies
-- Creates form_groups, form_templates, form_submissions, and form_connectors

-- ============================================================
-- Form Groups: organizational containers for forms
-- ============================================================
CREATE TABLE IF NOT EXISTS form_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_es TEXT,
  description TEXT,
  description_es TEXT,
  slug TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  icon TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, slug)
);

CREATE INDEX idx_form_groups_org ON form_groups(org_id);

-- ============================================================
-- Form Templates: form definitions with JSONB schema
-- ============================================================
CREATE TABLE IF NOT EXISTS form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES form_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_es TEXT,
  description TEXT,
  description_es TEXT,
  form_type TEXT NOT NULL CHECK (form_type IN ('rating', 'discipline', 'evaluation', 'custom')),
  schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  ui_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES app_users(id),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_templates_org ON form_templates(org_id);
CREATE INDEX idx_form_templates_group ON form_templates(group_id);
CREATE INDEX idx_form_templates_type ON form_templates(form_type);

-- ============================================================
-- Form Submissions: submitted form data with schema snapshot
-- ============================================================
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,
  submitted_by UUID REFERENCES app_users(id),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  response_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  schema_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected', 'draft')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_submissions_org ON form_submissions(org_id);
CREATE INDEX idx_form_submissions_template ON form_submissions(template_id);
CREATE INDEX idx_form_submissions_location ON form_submissions(location_id);
CREATE INDEX idx_form_submissions_employee ON form_submissions(employee_id);
CREATE INDEX idx_form_submissions_type ON form_submissions(form_type);
CREATE INDEX idx_form_submissions_status ON form_submissions(status);
CREATE INDEX idx_form_submissions_created ON form_submissions(created_at DESC);

-- ============================================================
-- Form Connectors: fixed library of Levelset data connectors
-- ============================================================
CREATE TABLE IF NOT EXISTS form_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_es TEXT,
  description TEXT,
  description_es TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  return_type TEXT NOT NULL CHECK (return_type IN ('boolean', 'number', 'percentage')),
  params JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

-- form_groups
ALTER TABLE form_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_groups_select" ON form_groups
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "form_groups_insert" ON form_groups
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "form_groups_update" ON form_groups
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "form_groups_delete" ON form_groups
  FOR DELETE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()) AND is_system = false);

-- form_templates
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_templates_select" ON form_templates
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "form_templates_insert" ON form_templates
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "form_templates_update" ON form_templates
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "form_templates_delete" ON form_templates
  FOR DELETE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()) AND is_system = false);

-- form_submissions
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_submissions_select" ON form_submissions
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "form_submissions_insert" ON form_submissions
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "form_submissions_update" ON form_submissions
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

-- form_connectors: globally readable
ALTER TABLE form_connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_connectors_select" ON form_connectors
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- Seed initial form connectors
-- ============================================================
INSERT INTO form_connectors (key, name, name_es, description, description_es, category, return_type, params) VALUES
  ('no_discipline_30d', 'No discipline points in last 30 days', 'Sin puntos disciplinarios en los ultimos 30 dias', 'Returns true if the employee has 0 negative infraction points in the last 30 days', 'Verdadero si el empleado tiene 0 puntos negativos de infraccion en los ultimos 30 dias', 'discipline', 'boolean', '{"days": 30}'),
  ('no_discipline_60d', 'No discipline points in last 60 days', 'Sin puntos disciplinarios en los ultimos 60 dias', 'Returns true if the employee has 0 negative infraction points in the last 60 days', 'Verdadero si el empleado tiene 0 puntos negativos de infraccion en los ultimos 60 dias', 'discipline', 'boolean', '{"days": 60}'),
  ('no_discipline_90d', 'No discipline points in last 90 days', 'Sin puntos disciplinarios en los ultimos 90 dias', 'Returns true if the employee has 0 negative infraction points in the last 90 days', 'Verdadero si el empleado tiene 0 puntos negativos de infraccion en los ultimos 90 dias', 'discipline', 'boolean', '{"days": 90}'),
  ('avg_rating_gte', 'Average positional rating meets threshold', 'Calificacion posicional promedio cumple umbral', 'Returns true if the employee average rating meets or exceeds the configured threshold', 'Verdadero si la calificacion promedio del empleado cumple o supera el umbral configurado', 'pe', 'boolean', '{"threshold": 2.0}'),
  ('certified_status', 'Has Certified status', 'Tiene estado Certificado', 'Returns true if the employee has Certified certification status', 'Verdadero si el empleado tiene estado de certificacion Certificado', 'certification', 'boolean', '{}'),
  ('no_unresolved_actions', 'No unresolved recommended actions', 'Sin acciones recomendadas sin resolver', 'Returns true if the employee has no pending recommended disciplinary actions', 'Verdadero si el empleado no tiene acciones disciplinarias recomendadas pendientes', 'discipline', 'boolean', '{}')
ON CONFLICT (key) DO NOTHING;
