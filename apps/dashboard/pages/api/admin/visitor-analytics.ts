import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '@/lib/permissions/middleware';

type RangeKey = '1d' | '7d' | '30d';

function getTimeRange(range: RangeKey): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const now = new Date();
  const to = now;
  let from: Date;
  let prevFrom: Date;
  let prevTo: Date;

  const days = range === '1d' ? 1 : range === '7d' ? 7 : 30;
  from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  prevTo = new Date(from.getTime());
  prevFrom = new Date(from.getTime() - days * 24 * 60 * 60 * 1000);

  return { from, to, prevFrom, prevTo };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient();
    const range = (req.query.range as RangeKey) || '7d';
    const validRanges: RangeKey[] = ['1d', '7d', '30d'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({ error: 'Invalid range. Use 1d, 7d, or 30d' });
    }

    const { from, to, prevFrom, prevTo } = getTimeRange(range);
    const fromIso = from.toISOString();
    const toIso = to.toISOString();
    const prevFromIso = prevFrom.toISOString();
    const prevToIso = prevTo.toISOString();

    // Run all queries in parallel
    const [
      uniqueVisitorsRes,
      sessionSummaryRes,
      prevVisitorsRes,
      prevSessionSummaryRes,
      dailyTrendRes,
      topPagesRes,
      topReferrersRes,
      utmCampaignsRes,
    ] = await Promise.all([
      supabase.rpc('count_unique_visitors', { from_ts: fromIso, to_ts: toIso }),
      supabase.rpc('session_analytics_summary', { from_ts: fromIso, to_ts: toIso }),
      supabase.rpc('count_unique_visitors', { from_ts: prevFromIso, to_ts: prevToIso }),
      supabase.rpc('session_analytics_summary', { from_ts: prevFromIso, to_ts: prevToIso }),
      supabase.rpc('daily_visitor_trend', { from_ts: fromIso, to_ts: toIso }),
      supabase.rpc('top_pages', { from_ts: fromIso, to_ts: toIso, max_results: 20 }),
      supabase.rpc('top_referrers', { from_ts: fromIso, to_ts: toIso, max_results: 10 }),
      supabase.rpc('utm_campaign_stats', { from_ts: fromIso, to_ts: toIso, max_results: 10 }),
    ]);

    // Current period
    const uniqueVisitors = Number(uniqueVisitorsRes.data) || 0;
    const sessionData = Array.isArray(sessionSummaryRes.data) ? sessionSummaryRes.data[0] : sessionSummaryRes.data;
    const totalSessions = Number(sessionData?.total_sessions) || 0;
    const bounceCount = Number(sessionData?.bounce_count) || 0;
    const avgDuration = Number(sessionData?.avg_duration) || 0;
    const avgPageCount = Number(sessionData?.avg_page_count) || 0;
    const bounceRate = totalSessions > 0 ? (bounceCount / totalSessions) * 100 : 0;

    // Previous period
    const prevVisitors = Number(prevVisitorsRes.data) || 0;
    const prevSessionData = Array.isArray(prevSessionSummaryRes.data) ? prevSessionSummaryRes.data[0] : prevSessionSummaryRes.data;
    const prevSessions = Number(prevSessionData?.total_sessions) || 0;
    const prevBounceCount = Number(prevSessionData?.bounce_count) || 0;
    const prevBounceRate = prevSessions > 0 ? (prevBounceCount / prevSessions) * 100 : 0;

    // Compute deltas
    const pctChange = (curr: number, prev: number) =>
      prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;

    const comparison = {
      visitorsChange: pctChange(uniqueVisitors, prevVisitors),
      sessionsChange: pctChange(totalSessions, prevSessions),
      bounceRateChange: prevBounceRate > 0
        ? Math.round(((bounceRate - prevBounceRate) / prevBounceRate) * 100)
        : 0,
    };

    // Daily trend
    const dailyTrend = (dailyTrendRes.data || []).map((row: any) => ({
      date: row.day,
      visitors: Number(row.unique_visitors) || 0,
      sessions: Number(row.session_count) || 0,
    }));

    // Top pages
    const topPages = (topPagesRes.data || []).map((row: any) => ({
      url: row.url,
      views: Number(row.views) || 0,
      avgTimeOnPage: Math.round(Number(row.avg_time_on_page) || 0),
    }));

    // Traffic sources
    const totalRefSessions = (topReferrersRes.data || []).reduce(
      (sum: number, r: any) => sum + (Number(r.sessions) || 0),
      0
    );
    const trafficSources = (topReferrersRes.data || []).map((row: any) => {
      const sessions = Number(row.sessions) || 0;
      return {
        source: row.source,
        sessions,
        percentage: totalRefSessions > 0 ? Math.round((sessions / totalRefSessions) * 100) : 0,
      };
    });

    // UTM campaigns
    const utmCampaigns = (utmCampaignsRes.data || []).map((row: any) => ({
      campaign: row.campaign,
      source: row.source,
      medium: row.medium,
      sessions: Number(row.sessions) || 0,
    }));

    return res.status(200).json({
      summary: {
        uniqueVisitors,
        totalSessions,
        avgSessionDuration: Math.round(avgDuration),
        bounceRate: Math.round(bounceRate * 10) / 10,
        pagesPerSession: Math.round(avgPageCount * 10) / 10,
      },
      dailyTrend,
      topPages,
      trafficSources,
      utmCampaigns,
      comparison,
    });
  } catch (error: any) {
    console.error('[visitor-analytics] Error:', error);
    return res.status(500).json({ error: 'Failed to load analytics' });
  }
}

export default withAdminAuth(handler);
