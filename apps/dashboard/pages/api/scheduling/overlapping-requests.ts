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

  const { location_id, start, end, exclude_id } = req.query as {
    location_id: string;
    start: string;
    end: string;
    exclude_id: string;
  };

  if (!location_id || !start || !end || !exclude_id) {
    return res.status(400).json({
      error: 'location_id, start, end, and exclude_id are required',
    });
  }

  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('time_off_requests')
      .select(
        'id, status, start_datetime, end_datetime, employee:employees!time_off_requests_employee_id_fkey(full_name)'
      )
      .eq('location_id', String(location_id))
      .eq('org_id', String(orgId))
      .neq('id', String(exclude_id))
      .in('status', ['pending', 'approved'])
      .lt('start_datetime', String(end))
      .gt('end_datetime', String(start))
      .order('start_datetime', { ascending: true });

    if (error) {
      console.error('Overlapping requests query error:', error.message, {
        location_id,
        orgId,
        start,
        end,
        exclude_id,
      });
      return res.status(500).json({ error: error.message });
    }

    const requests = (data || []).map((r: any) => ({
      id: r.id,
      employee_name: r.employee?.full_name ?? null,
      status: r.status,
      start_datetime: r.start_datetime,
      end_datetime: r.end_datetime,
    }));

    return res.status(200).json({
      count: requests.length,
      requests,
    });
  } catch (err: any) {
    console.error('Overlapping requests unhandled error:', err);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}

export default function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(204).end();
  }
  return withPermissionAndContext(P.SCHED_MANAGE_APPROVALS, handler)(req, res);
}
