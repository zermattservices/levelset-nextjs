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
  const { request_type } = req.query;

  let query = supabase
    .from('approval_denial_reasons')
    .select('id, request_type, label, display_order, is_active')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (request_type && typeof request_type === 'string') {
    query = query.eq('request_type', request_type);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json(data ?? []);
}

export default function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(204).end();
  }
  return withPermissionAndContext(P.SCHED_MANAGE_APPROVALS, handler)(req, res);
}
