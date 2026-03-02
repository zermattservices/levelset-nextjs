-- =============================================================================
-- Enable Row Level Security on core tenant tables
-- =============================================================================
-- Defense-in-depth: even if application logic fails, the database prevents
-- cross-org data access from the browser client (anon key + user JWT).
--
-- Service role key (used by all API routes) bypasses RLS automatically.
-- These policies only affect browser-client queries.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- Get the authenticated user's org_id from app_users
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT org_id FROM public.app_users
  WHERE auth_user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;
$$;

-- Check if the authenticated user is a Levelset Admin
CREATE OR REPLACE FUNCTION public.is_levelset_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE auth_user_id = auth.uid()
    AND role = 'Levelset Admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- locations (SELECT only — all writes go through API routes)
-- ---------------------------------------------------------------------------
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view locations in their org"
  ON public.locations FOR SELECT
  USING (
    public.is_levelset_admin()
    OR org_id = public.get_user_org_id()
  );

-- ---------------------------------------------------------------------------
-- employees (SELECT only — all writes go through API routes)
-- ---------------------------------------------------------------------------
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employees in their org"
  ON public.employees FOR SELECT
  USING (
    public.is_levelset_admin()
    OR org_id = public.get_user_org_id()
  );

-- ---------------------------------------------------------------------------
-- orgs (SELECT only — all writes go through API routes)
-- ---------------------------------------------------------------------------
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own org"
  ON public.orgs FOR SELECT
  USING (
    public.is_levelset_admin()
    OR id = public.get_user_org_id()
  );

-- ---------------------------------------------------------------------------
-- ratings (SELECT only — all writes go through API routes)
-- ---------------------------------------------------------------------------
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings in their org"
  ON public.ratings FOR SELECT
  USING (
    public.is_levelset_admin()
    OR org_id = public.get_user_org_id()
  );

-- ---------------------------------------------------------------------------
-- infractions (SELECT + INSERT + UPDATE + DELETE — has client-side writes)
-- ---------------------------------------------------------------------------
ALTER TABLE public.infractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view infractions in their org"
  ON public.infractions FOR SELECT
  USING (
    public.is_levelset_admin()
    OR org_id = public.get_user_org_id()
  );

CREATE POLICY "Users can insert infractions in their org"
  ON public.infractions FOR INSERT
  WITH CHECK (
    public.is_levelset_admin()
    OR org_id = public.get_user_org_id()
  );

CREATE POLICY "Users can update infractions in their org"
  ON public.infractions FOR UPDATE
  USING (
    public.is_levelset_admin()
    OR org_id = public.get_user_org_id()
  );

CREATE POLICY "Users can delete infractions in their org"
  ON public.infractions FOR DELETE
  USING (
    public.is_levelset_admin()
    OR org_id = public.get_user_org_id()
  );

-- ---------------------------------------------------------------------------
-- app_users — RLS intentionally NOT enabled
-- ---------------------------------------------------------------------------
-- app_users is the identity bootstrapping table. The AuthProvider queries it
-- to establish the user's identity (org_id, role, etc.). Enabling RLS here
-- creates a circular dependency: the RLS policy calls get_user_org_id() which
-- itself queries app_users, and auth.uid() may not be available during the
-- initial session bootstrap. This caused a production outage (infinite
-- redirect loop to /onboarding).
--
-- app_users is protected at the application layer:
--   - AuthProvider filters by auth_user_id (only fetches own record)
--   - API routes use service role key (bypasses any RLS)
--   - The browser client's anon key can read rows, but all sensitive
--     operations go through authenticated API routes

-- ---------------------------------------------------------------------------
-- shifts (SELECT only — all writes go through API routes)
-- ---------------------------------------------------------------------------
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shifts in their org"
  ON public.shifts FOR SELECT
  USING (
    public.is_levelset_admin()
    OR org_id = public.get_user_org_id()
  );

-- ---------------------------------------------------------------------------
-- shift_assignments (SELECT only — all writes go through API routes)
-- ---------------------------------------------------------------------------
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shift_assignments in their org"
  ON public.shift_assignments FOR SELECT
  USING (
    public.is_levelset_admin()
    OR org_id = public.get_user_org_id()
  );
