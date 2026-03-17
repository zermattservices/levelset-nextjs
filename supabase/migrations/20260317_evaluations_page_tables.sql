-- Evaluation Schedule Rules (cadence-based, org-wide)
CREATE TABLE IF NOT EXISTS evaluation_schedule_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  target_role_ids UUID[] NOT NULL DEFAULT '{}',
  reviewer_role_ids UUID[] NOT NULL DEFAULT '{}',
  cadence TEXT NOT NULL CHECK (cadence IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eval_schedule_rules_org ON evaluation_schedule_rules(org_id);

ALTER TABLE evaluation_schedule_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own org rules" ON evaluation_schedule_rules
  FOR SELECT USING (org_id::text = (current_setting('request.jwt.claims', true)::json->>'org_id'));
CREATE POLICY "Service role full access on eval_schedule_rules" ON evaluation_schedule_rules
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- Evaluation Schedule Overrides (per-employee exceptions)
CREATE TABLE IF NOT EXISTS evaluation_schedule_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES evaluation_schedule_rules(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  override_type TEXT NOT NULL CHECK (override_type IN ('skip', 'defer', 'include')),
  period_start DATE NOT NULL,
  defer_until DATE,
  reason TEXT,
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eval_overrides_rule ON evaluation_schedule_overrides(rule_id);
CREATE INDEX idx_eval_overrides_employee ON evaluation_schedule_overrides(employee_id);
CREATE UNIQUE INDEX idx_eval_overrides_unique ON evaluation_schedule_overrides(rule_id, employee_id, period_start);

ALTER TABLE evaluation_schedule_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own org overrides" ON evaluation_schedule_overrides
  FOR SELECT USING (org_id::text = (current_setting('request.jwt.claims', true)::json->>'org_id'));
CREATE POLICY "Service role full access on eval_overrides" ON evaluation_schedule_overrides
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- Evaluation Requests (event-triggered)
CREATE TABLE IF NOT EXISTS evaluation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  trigger_source TEXT NOT NULL CHECK (trigger_source IN ('certification_pending', 'certification_pip', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_submission_id UUID REFERENCES form_submissions(id),
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eval_requests_org ON evaluation_requests(org_id);
CREATE INDEX idx_eval_requests_employee ON evaluation_requests(employee_id);
CREATE INDEX idx_eval_requests_status ON evaluation_requests(status);

ALTER TABLE evaluation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own org requests" ON evaluation_requests
  FOR SELECT USING (org_id::text = (current_setting('request.jwt.claims', true)::json->>'org_id'));
CREATE POLICY "Service role full access on eval_requests" ON evaluation_requests
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- Certification Evaluation Rules (Reece Howard specific)
CREATE TABLE IF NOT EXISTS certification_evaluation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  target_role_ids UUID[] NOT NULL DEFAULT '{}',
  reviewer_role_ids UUID[] NOT NULL DEFAULT '{}',
  trigger_on TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cert_eval_rules_org ON certification_evaluation_rules(org_id);
CREATE INDEX idx_cert_eval_rules_location ON certification_evaluation_rules(location_id);

ALTER TABLE certification_evaluation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own org cert rules" ON certification_evaluation_rules
  FOR SELECT USING (org_id::text = (current_setting('request.jwt.claims', true)::json->>'org_id'));
CREATE POLICY "Service role full access on cert_eval_rules" ON certification_evaluation_rules
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- Performance index for evaluation status computation queries
CREATE INDEX idx_form_submissions_eval_lookup
ON form_submissions(org_id, template_id, employee_id, created_at DESC);
