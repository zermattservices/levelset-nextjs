-- Create org_pay_config table for role-specific pay rule configuration
CREATE TABLE IF NOT EXISTS org_pay_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  has_availability_rules BOOLEAN DEFAULT false,
  has_zone_rules BOOLEAN DEFAULT false, -- FOH/BOH differentiation
  has_certification_rules BOOLEAN DEFAULT false,
  availability_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, role_name)
);

-- Create org_pay_rates table for pay rate values
CREATE TABLE IF NOT EXISTS org_pay_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  zone TEXT CHECK (zone IN ('FOH', 'BOH', NULL)), -- NULL if zone rules disabled for this role
  availability TEXT CHECK (availability IN ('Limited', 'Available', NULL)), -- NULL if availability rules disabled
  is_certified BOOLEAN DEFAULT false, -- false = starting wage, true = certified wage
  hourly_rate DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_org_pay_config_org ON org_pay_config(org_id);
CREATE INDEX IF NOT EXISTS idx_org_pay_rates_org ON org_pay_rates(org_id);
CREATE INDEX IF NOT EXISTS idx_org_pay_rates_lookup ON org_pay_rates(org_id, role_name, zone, availability, is_certified);

-- Enable RLS
ALTER TABLE org_pay_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_pay_rates ENABLE ROW LEVEL SECURITY;

-- RLS policies for org_pay_config
CREATE POLICY "org_pay_config_select" ON org_pay_config
  FOR SELECT USING (true);

CREATE POLICY "org_pay_config_insert" ON org_pay_config
  FOR INSERT WITH CHECK (true);

CREATE POLICY "org_pay_config_update" ON org_pay_config
  FOR UPDATE USING (true);

CREATE POLICY "org_pay_config_delete" ON org_pay_config
  FOR DELETE USING (true);

-- RLS policies for org_pay_rates
CREATE POLICY "org_pay_rates_select" ON org_pay_rates
  FOR SELECT USING (true);

CREATE POLICY "org_pay_rates_insert" ON org_pay_rates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "org_pay_rates_update" ON org_pay_rates
  FOR UPDATE USING (true);

CREATE POLICY "org_pay_rates_delete" ON org_pay_rates
  FOR DELETE USING (true);

-- Add updated_at trigger for org_pay_config
CREATE OR REPLACE FUNCTION update_org_pay_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_org_pay_config_updated_at
  BEFORE UPDATE ON org_pay_config
  FOR EACH ROW
  EXECUTE FUNCTION update_org_pay_config_updated_at();

-- Add updated_at trigger for org_pay_rates
CREATE OR REPLACE FUNCTION update_org_pay_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_org_pay_rates_updated_at
  BEFORE UPDATE ON org_pay_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_org_pay_rates_updated_at();
