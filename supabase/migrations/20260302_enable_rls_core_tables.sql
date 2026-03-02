-- =============================================================================
-- RLS helper functions for future use
-- =============================================================================
-- These functions were created for Row Level Security policies. RLS was
-- rolled back due to production issues (circular dependency on app_users,
-- auth.uid() timing issues during session bootstrap, and per-row function
-- overhead on large tables).
--
-- The original security vulnerability (unapprovisioned users seeing all
-- locations) is fixed at the application layer:
--   1. LocationContext guards against null appUser (returns zero locations)
--   2. OnboardingGuard redirects unapprovisioned users to /onboarding
--   3. API routes explicitly reject requests with no app_users record
--
-- These functions are kept for potential future RLS implementation after
-- proper staging environment testing.
-- =============================================================================

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
