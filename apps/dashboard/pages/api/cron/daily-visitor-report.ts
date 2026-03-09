import { createServerSupabaseClient } from '@/lib/supabase-server';
import { notifyDailyVisitorReport } from '@levelset/notifications';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Production-only
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv && vercelEnv !== 'production') {
    return res.status(200).json({
      success: false,
      message: `Skipped — running in ${vercelEnv} environment.`,
      timestamp: new Date().toISOString(),
    });
  }

  // Verify cron secret
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = createServerSupabaseClient();

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dayBefore = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const fromIso = yesterday.toISOString();
    const toIso = now.toISOString();
    const prevFromIso = dayBefore.toISOString();
    const prevToIso = yesterday.toISOString();

    // Current period + previous period in parallel
    const [
      visitorsRes,
      sessionRes,
      topPagesRes,
      referrersRes,
      prevVisitorsRes,
      prevSessionRes,
    ] = await Promise.all([
      supabase.rpc('count_unique_visitors', { from_ts: fromIso, to_ts: toIso }),
      supabase.rpc('session_analytics_summary', { from_ts: fromIso, to_ts: toIso }),
      supabase.rpc('top_pages', { from_ts: fromIso, to_ts: toIso, max_results: 5 }),
      supabase.rpc('top_referrers', { from_ts: fromIso, to_ts: toIso, max_results: 5 }),
      supabase.rpc('count_unique_visitors', { from_ts: prevFromIso, to_ts: prevToIso }),
      supabase.rpc('session_analytics_summary', { from_ts: prevFromIso, to_ts: prevToIso }),
    ]);

    const uniqueVisitors = Number(visitorsRes.data) || 0;
    const sessionData = Array.isArray(sessionRes.data) ? sessionRes.data[0] : sessionRes.data;
    const totalSessions = Number(sessionData?.total_sessions) || 0;
    const bounceCount = Number(sessionData?.bounce_count) || 0;
    const avgDuration = Number(sessionData?.avg_duration) || 0;
    const bounceRate = totalSessions > 0 ? (bounceCount / totalSessions) * 100 : 0;

    const prevVisitors = Number(prevVisitorsRes.data) || 0;
    const prevSessionData = Array.isArray(prevSessionRes.data) ? prevSessionRes.data[0] : prevSessionRes.data;
    const prevSessions = Number(prevSessionData?.total_sessions) || 0;
    const prevBounceCount = Number(prevSessionData?.bounce_count) || 0;
    const prevBounceRate = prevSessions > 0 ? (prevBounceCount / prevSessions) * 100 : 0;

    const pctChange = (curr: number, prev: number) =>
      prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;

    const topPages = (topPagesRes.data || []).map((r: any) => ({
      url: r.url,
      views: Number(r.views) || 0,
    }));

    const topReferrers = (referrersRes.data || []).map((r: any) => ({
      source: r.source,
      sessions: Number(r.sessions) || 0,
    }));

    await notifyDailyVisitorReport({
      date: yesterday.toISOString().split('T')[0],
      uniqueVisitors,
      totalSessions,
      bounceRate: Math.round(bounceRate * 10) / 10,
      avgDwellSeconds: Math.round(avgDuration),
      topPages,
      topReferrers,
      comparison: {
        visitorsChange: pctChange(uniqueVisitors, prevVisitors),
        sessionsChange: pctChange(totalSessions, prevSessions),
        bounceRateChange: prevBounceRate > 0
          ? Math.round(((bounceRate - prevBounceRate) / prevBounceRate) * 100)
          : 0,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Daily visitor report sent to Slack',
      stats: { uniqueVisitors, totalSessions, bounceRate: Math.round(bounceRate * 10) / 10 },
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Error sending daily visitor report:', error);
    return res.status(500).json({
      error: 'Failed to send daily visitor report',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
