-- Marketing CRM tables: leads, events, page views, email templates, sequences, sends
-- Replaces waitlist as the primary lead tracking system

-- =============================================================================
-- LEADS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  operator_name TEXT, -- Restaurant operator (may differ from lead, filled programmatically by store_number)
  store_number TEXT,
  is_multi_unit BOOLEAN DEFAULT false,
  message TEXT,
  source TEXT DEFAULT 'waitlist', -- waitlist, contact, manual
  metadata JSONB DEFAULT '{}'::jsonb, -- UTM params, user agent, etc.
  pipeline_stage TEXT DEFAULT 'new' CHECK (pipeline_stage IN ('new', 'contacted', 'trial', 'onboarded', 'converted', 'lost')),
  stage_changed_at TIMESTAMPTZ,
  engagement_score INTEGER DEFAULT 0,
  estimated_value_cents INTEGER DEFAULT 0, -- $2,739/store in cents
  visitor_id TEXT, -- Links to anonymous page views
  org_id UUID REFERENCES public.orgs(id),
  admin_notes TEXT,
  contacted_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ,
  onboarded_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  lost_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_store_number ON public.leads(store_number);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON public.leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_leads_visitor_id ON public.leads(visitor_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (API routes use service role)
CREATE POLICY "Service role full access on leads"
  ON public.leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anonymous can insert (for marketing site form submissions)
CREATE POLICY "Allow anonymous inserts to leads"
  ON public.leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Authenticated users can view leads
CREATE POLICY "Authenticated users can view leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can update leads (admin stage changes, notes)
CREATE POLICY "Authenticated users can update leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.leads IS 'Marketing CRM leads - tracks prospects from first contact through conversion';

-- =============================================================================
-- LEAD EVENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- page_view, form_submit, email_sent, email_opened, email_clicked, email_bounced, stage_change, note_added
  event_data JSONB DEFAULT '{}'::jsonb, -- Type-specific payload
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id_created ON public.lead_events(lead_id, created_at DESC);

ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on lead_events"
  ON public.lead_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view lead_events"
  ON public.lead_events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow anonymous inserts to lead_events"
  ON public.lead_events
  FOR INSERT
  TO anon
  WITH CHECK (true);

COMMENT ON TABLE public.lead_events IS 'Unified timeline of all lead interactions (page views, emails, stage changes, notes)';

-- =============================================================================
-- PAGE VIEWS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_visitor_id ON public.page_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_views_lead_id ON public.page_views(lead_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON public.page_views(created_at DESC);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on page_views"
  ON public.page_views
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anonymous can insert page views (tracking from marketing site)
CREATE POLICY "Allow anonymous inserts to page_views"
  ON public.page_views
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view page_views"
  ON public.page_views
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.page_views IS 'Anonymous visitor page view tracking, linked to leads on form submission';

-- =============================================================================
-- EMAIL TEMPLATES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'drip' CHECK (category IN ('drip', 'transactional')),
  preview_text TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on email_templates"
  ON public.email_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view email_templates"
  ON public.email_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage email_templates"
  ON public.email_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.email_templates IS 'Metadata registry for React Email templates - actual template code lives in codebase';

-- =============================================================================
-- EMAIL SEQUENCES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL, -- form_submitted, trial_started, onboarded
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on email_sequences"
  ON public.email_sequences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage email_sequences"
  ON public.email_sequences
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.email_sequences IS 'Automated email drip campaigns triggered by lead events';

-- =============================================================================
-- EMAIL SEQUENCE STEPS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  template_slug TEXT NOT NULL REFERENCES public.email_templates(slug),
  delay_hours INTEGER NOT NULL, -- Hours after trigger or previous step
  step_order INTEGER NOT NULL,
  active BOOLEAN DEFAULT true
);

ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on email_sequence_steps"
  ON public.email_sequence_steps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage email_sequence_steps"
  ON public.email_sequence_steps
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.email_sequence_steps IS 'Ordered steps within an email sequence - each step sends a template after a delay';

-- =============================================================================
-- EMAIL SENDS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  template_slug TEXT NOT NULL,
  sequence_id UUID REFERENCES public.email_sequences(id),
  resend_message_id TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_sends_lead_id ON public.email_sends(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_resend_message_id ON public.email_sends(resend_message_id);

ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on email_sends"
  ON public.email_sends
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view email_sends"
  ON public.email_sends
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.email_sends IS 'Every email sent to a lead, with delivery/open/click tracking via Resend webhooks';

-- =============================================================================
-- MIGRATE EXISTING WAITLIST DATA INTO LEADS
-- =============================================================================
INSERT INTO public.leads (email, operator_name, store_number, is_multi_unit, message, source, metadata, created_at, updated_at)
SELECT
  w.email,
  w.operator_name,
  w.store_number,
  COALESCE(w.is_multi_unit, false),
  w.message,
  COALESCE(w.source, 'waitlist'),
  COALESCE(w.metadata, '{}'::jsonb),
  w.created_at,
  w.created_at
FROM public.waitlist w
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- SEED INITIAL EMAIL TEMPLATES
-- =============================================================================
INSERT INTO public.email_templates (slug, name, subject, description, category, preview_text) VALUES
  ('waitlist-welcome', 'Waitlist Welcome', 'Welcome to Levelset — Here''s What to Expect', 'Sent immediately when someone joins the waitlist', 'drip', 'Thanks for joining the Levelset waitlist!'),
  ('waitlist-followup', 'Waitlist Follow-up', 'How Levelset Helps Restaurants Like Yours', 'Sent 3 days after waitlist signup', 'drip', 'See how Levelset can transform your team management'),
  ('trial-nudge', 'Trial Nudge', 'Ready to Try Levelset? Your Free Trial Awaits', 'Sent 7 days after signup if no trial started', 'drip', 'Start your 30-day free trial today'),
  ('welcome-onboarding', 'Welcome Onboarding', 'Welcome to Levelset — Finish Setting Up Your Account', 'Sent when a user starts onboarding', 'transactional', 'Complete your Levelset setup in 10 minutes')
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- SEED DEFAULT EMAIL SEQUENCE
-- =============================================================================
INSERT INTO public.email_sequences (id, name, trigger_event, active) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Waitlist Drip', 'form_submitted', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.email_sequence_steps (sequence_id, template_slug, delay_hours, step_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'waitlist-welcome', 0, 1),
  ('a0000000-0000-0000-0000-000000000001', 'waitlist-followup', 72, 2),
  ('a0000000-0000-0000-0000-000000000001', 'trial-nudge', 168, 3)
ON CONFLICT DO NOTHING;
