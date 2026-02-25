-- Billing & Subscription Tables
-- Adds Stripe integration columns and billing-related tables.

-- Add Stripe fields to orgs table
ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS custom_pricing BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_price_cents INTEGER;

-- Subscriptions table (synced from Stripe via webhooks)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_price_id TEXT,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('core', 'pro', 'ultimate')),
  status TEXT NOT NULL DEFAULT 'incomplete'
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')),
  quantity INTEGER NOT NULL DEFAULT 1,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id)
);

-- Invoices table (synced from Stripe)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  amount_due INTEGER NOT NULL DEFAULT 0,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'draft',
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI usage aggregation (monthly summary per org, for billing display)
CREATE TABLE IF NOT EXISTS ai_usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  total_queries INTEGER NOT NULL DEFAULT 0,
  included_queries INTEGER NOT NULL DEFAULT 0,
  overage_queries INTEGER NOT NULL DEFAULT 0,
  overage_cost_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, month)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_monthly_org ON ai_usage_monthly(org_id, month);

-- RLS policies (service role has full access via API routes)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on subscriptions" ON subscriptions FOR ALL USING (true);
CREATE POLICY "Service role full access on invoices" ON invoices FOR ALL USING (true);
CREATE POLICY "Service role full access on ai_usage_monthly" ON ai_usage_monthly FOR ALL USING (true);
