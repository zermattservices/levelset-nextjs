-- Visitor session tracking and analytics functions
-- Extends page_views with session-level data for dwell time, bounce rate, etc.

-- =============================================================================
-- VISITOR SESSIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.visitor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  entry_page TEXT,
  exit_page TEXT,
  page_count INTEGER DEFAULT 1,
  is_bounce BOOLEAN DEFAULT true,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_visitor_id ON public.visitor_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_session_id ON public.visitor_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_started_at ON public.visitor_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_lead_id ON public.visitor_sessions(lead_id);

ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on visitor_sessions"
  ON public.visitor_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous inserts to visitor_sessions"
  ON public.visitor_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous updates to visitor_sessions"
  ON public.visitor_sessions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view visitor_sessions"
  ON public.visitor_sessions
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.visitor_sessions IS 'Session-level visitor tracking with dwell time, bounce rate, and page flow data';

-- =============================================================================
-- ALTER PAGE_VIEWS — add session_id and time_on_page
-- =============================================================================
ALTER TABLE public.page_views
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS time_on_page_seconds INTEGER;

CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON public.page_views(session_id);

-- Allow anonymous updates so page-leave beacons can update time_on_page_seconds
CREATE POLICY "Allow anonymous updates to page_views"
  ON public.page_views
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SQL HELPER FUNCTIONS
-- =============================================================================

-- Atomically increment session page count (called on 2nd+ page view in a session)
CREATE OR REPLACE FUNCTION public.increment_session_page_count(
  p_session_id TEXT,
  p_exit_page TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE public.visitor_sessions
  SET
    page_count = page_count + 1,
    exit_page = p_exit_page,
    is_bounce = false,
    ended_at = NOW(),
    duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::integer
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Count unique visitors in a time range
CREATE OR REPLACE FUNCTION public.count_unique_visitors(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ
) RETURNS BIGINT AS $$
  SELECT COUNT(DISTINCT visitor_id)
  FROM public.page_views
  WHERE created_at >= from_ts AND created_at < to_ts;
$$ LANGUAGE sql SECURITY DEFINER;

-- Top pages by view count with avg time on page
CREATE OR REPLACE FUNCTION public.top_pages(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  max_results INTEGER DEFAULT 10
) RETURNS TABLE(url TEXT, views BIGINT, avg_time_on_page NUMERIC) AS $$
  SELECT
    url,
    COUNT(*) AS views,
    COALESCE(AVG(time_on_page_seconds) FILTER (WHERE time_on_page_seconds IS NOT NULL), 0)::NUMERIC AS avg_time_on_page
  FROM public.page_views
  WHERE created_at >= from_ts AND created_at < to_ts
  GROUP BY url
  ORDER BY views DESC
  LIMIT max_results;
$$ LANGUAGE sql SECURITY DEFINER;

-- Session analytics summary (totals + averages)
CREATE OR REPLACE FUNCTION public.session_analytics_summary(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ
) RETURNS TABLE(
  total_sessions BIGINT,
  bounce_count BIGINT,
  avg_duration NUMERIC,
  avg_page_count NUMERIC
) AS $$
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_bounce = true),
    COALESCE(AVG(duration_seconds) FILTER (WHERE duration_seconds > 0), 0)::NUMERIC,
    COALESCE(AVG(page_count), 0)::NUMERIC
  FROM public.visitor_sessions
  WHERE started_at >= from_ts AND started_at < to_ts;
$$ LANGUAGE sql SECURITY DEFINER;

-- Daily visitor trend (unique visitors + sessions per day)
CREATE OR REPLACE FUNCTION public.daily_visitor_trend(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ
) RETURNS TABLE(
  day DATE,
  unique_visitors BIGINT,
  session_count BIGINT
) AS $$
  SELECT
    d.day,
    COALESCE(pv.unique_visitors, 0),
    COALESCE(vs.session_count, 0)
  FROM generate_series(from_ts::date, (to_ts - interval '1 day')::date, '1 day') AS d(day)
  LEFT JOIN (
    SELECT created_at::date AS day, COUNT(DISTINCT visitor_id) AS unique_visitors
    FROM public.page_views
    WHERE created_at >= from_ts AND created_at < to_ts
    GROUP BY created_at::date
  ) pv ON pv.day = d.day
  LEFT JOIN (
    SELECT started_at::date AS day, COUNT(*) AS session_count
    FROM public.visitor_sessions
    WHERE started_at >= from_ts AND started_at < to_ts
    GROUP BY started_at::date
  ) vs ON vs.day = d.day
  ORDER BY d.day;
$$ LANGUAGE sql SECURITY DEFINER;

-- Top referrers (parsed from visitor_sessions.referrer)
CREATE OR REPLACE FUNCTION public.top_referrers(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  max_results INTEGER DEFAULT 10
) RETURNS TABLE(source TEXT, sessions BIGINT) AS $$
  SELECT
    CASE
      WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
      ELSE regexp_replace(referrer, '^https?://([^/]+).*$', '\1')
    END AS source,
    COUNT(*) AS sessions
  FROM public.visitor_sessions
  WHERE started_at >= from_ts AND started_at < to_ts
  GROUP BY source
  ORDER BY sessions DESC
  LIMIT max_results;
$$ LANGUAGE sql SECURITY DEFINER;

-- UTM campaign breakdown
CREATE OR REPLACE FUNCTION public.utm_campaign_stats(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  max_results INTEGER DEFAULT 10
) RETURNS TABLE(campaign TEXT, source TEXT, medium TEXT, sessions BIGINT) AS $$
  SELECT
    COALESCE(utm_campaign, '(none)') AS campaign,
    COALESCE(utm_source, '(none)') AS source,
    COALESCE(utm_medium, '(none)') AS medium,
    COUNT(*) AS sessions
  FROM public.visitor_sessions
  WHERE started_at >= from_ts AND started_at < to_ts
    AND (utm_campaign IS NOT NULL OR utm_source IS NOT NULL)
  GROUP BY utm_campaign, utm_source, utm_medium
  ORDER BY sessions DESC
  LIMIT max_results;
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant execute on functions to anon (needed for tracking API) and authenticated (for dashboard)
GRANT EXECUTE ON FUNCTION public.increment_session_page_count TO anon;
GRANT EXECUTE ON FUNCTION public.count_unique_visitors TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.top_pages TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.session_analytics_summary TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.daily_visitor_trend TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.top_referrers TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.utm_campaign_stats TO authenticated, service_role;
