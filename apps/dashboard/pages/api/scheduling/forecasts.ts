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

  try {
    const supabase = createServerSupabaseClient();
    const { location_id, week_start } = req.query;

    if (!location_id || !week_start) {
      return res.status(400).json({ error: 'location_id and week_start are required' });
    }

    // Verify location belongs to the authenticated user's org
    const { data: location } = await supabase
      .from('locations')
      .select('id')
      .eq('id', location_id)
      .eq('org_id', orgId)
      .single();

    if (!location) {
      return res.status(403).json({ error: 'Access denied to this location' });
    }

    const weekEnd = new Date(week_start as string);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('sales_forecasts')
      .select('*, intervals:sales_forecast_intervals(*)')
      .eq('location_id', location_id)
      .eq('org_id', orgId)
      .gte('forecast_date', week_start)
      .lte('forecast_date', weekEndStr)
      .order('forecast_date');

    if (error) {
      console.error('Error fetching forecasts:', error);
      return res.status(500).json({ error: 'Failed to fetch forecasts' });
    }

    res.setHeader('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ forecasts: data || [] });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }
  return withPermissionAndContext(P.SCHED_VIEW, handler)(req, res);
}
