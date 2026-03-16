-- Filter bot traffic from analytics functions
-- Bot detection: sessions with duration_seconds = 0 AND no page view has time_on_page_seconds set
-- (i.e. JavaScript never executed — the visitor never triggered a page-leave event)

-- =============================================================================
-- HELPER: is_bot_session
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_bot_session(p_session_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.page_views
    WHERE session_id = p_session_id
      AND time_on_page_seconds IS NOT NULL
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- Count unique visitors (exclude bot sessions)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.count_unique_visitors(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ
) RETURNS BIGINT AS $$
  SELECT COUNT(DISTINCT pv.visitor_id)
  FROM public.page_views pv
  WHERE pv.created_at >= from_ts AND pv.created_at < to_ts
    AND (pv.time_on_page_seconds IS NOT NULL
         OR pv.session_id IS NULL
         OR NOT public.is_bot_session(pv.session_id));
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- Top pages (exclude bot page views)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.top_pages(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ,
  max_results INTEGER DEFAULT 10
) RETURNS TABLE(url TEXT, views BIGINT, avg_time_on_page NUMERIC) AS $$
  SELECT
    pv.url,
    COUNT(*) AS views,
    COALESCE(AVG(pv.time_on_page_seconds) FILTER (WHERE pv.time_on_page_seconds IS NOT NULL), 0)::NUMERIC AS avg_time_on_page
  FROM public.page_views pv
  WHERE pv.created_at >= from_ts AND pv.created_at < to_ts
    AND (pv.time_on_page_seconds IS NOT NULL
         OR pv.session_id IS NULL
         OR NOT public.is_bot_session(pv.session_id))
  GROUP BY pv.url
  ORDER BY views DESC
  LIMIT max_results;
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- Session analytics summary (exclude bot sessions)
-- =============================================================================
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
  WHERE started_at >= from_ts AND started_at < to_ts
    AND NOT public.is_bot_session(session_id);
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- Top referrers (exclude bot sessions)
-- =============================================================================
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
    AND NOT public.is_bot_session(session_id)
  GROUP BY source
  ORDER BY sessions DESC
  LIMIT max_results;
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- Count bot sessions in a time range (for the report summary line)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.count_bot_sessions(
  from_ts TIMESTAMPTZ,
  to_ts TIMESTAMPTZ
) RETURNS BIGINT AS $$
  SELECT COUNT(*)
  FROM public.visitor_sessions
  WHERE started_at >= from_ts AND started_at < to_ts
    AND public.is_bot_session(session_id);
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_bot_session TO service_role;
GRANT EXECUTE ON FUNCTION public.count_bot_sessions TO authenticated, service_role;
