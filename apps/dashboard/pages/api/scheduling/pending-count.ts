import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  { orgId }: { userId: string; orgId: string }
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();
  const { location_id } = req.query;

  // Shift trades: open or pending_approval (exclude giveaways)
  const tradesQuery = supabase
    .from('shift_trade_requests')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .in('status', ['open', 'pending_approval'])
    .neq('type', 'giveaway');

  // Time off: pending
  let timeOffQuery = supabase
    .from('time_off_requests')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'pending');

  // Availability: pending
  const availQuery = supabase
    .from('availability_change_requests')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'pending');

  // Add location filter if provided
  if (location_id && typeof location_id === 'string') {
    timeOffQuery = timeOffQuery.eq('location_id', location_id);
  }

  let tradesResult, timeOffResult, availResult;
  try {
    [tradesResult, timeOffResult, availResult] = await Promise.all([
      tradesQuery,
      timeOffQuery,
      availQuery,
    ]);
  } catch (err) {
    console.error('Error fetching pending counts:', err);
    return res.status(500).json({ error: 'Failed to fetch pending counts' });
  }

  if (tradesResult.error) console.error('Trades query error:', tradesResult.error.message);
  if (timeOffResult.error) console.error('Time off query error:', timeOffResult.error.message);
  if (availResult.error) console.error('Availability query error:', availResult.error.message);

  const shiftTrades = tradesResult.count ?? 0;
  const timeOff = timeOffResult.count ?? 0;
  const availability = availResult.count ?? 0;

  res.setHeader('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60');

  return res.status(200).json({
    shiftTrades,
    timeOff,
    availability,
    total: shiftTrades + timeOff + availability,
  });
}

export default function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(204).end();
  }
  return withPermissionAndContext(P.SCHED_VIEW, handler)(req, res);
}
