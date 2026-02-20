import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { resolveConnectedQuestions } from '@/lib/forms/connectors-resolver';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser(
    req.headers.authorization?.replace('Bearer ', '') || ''
  );

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data: connectors, error } = await supabase
      .from('form_connectors')
      .select('*')
      .eq('active', true)
      .order('key');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(connectors);
  }

  if (req.method === 'POST') {
    const { employee_id, org_id, location_id, connectors } = req.body;

    if (!employee_id || !org_id || !Array.isArray(connectors)) {
      return res.status(400).json({
        error: 'employee_id, org_id, and connectors array are required',
      });
    }

    try {
      const resolved = await resolveConnectedQuestions(
        supabase,
        employee_id,
        org_id,
        location_id || null,
        connectors
      );

      return res.status(200).json(resolved);
    } catch (err: any) {
      console.error('[Connectors API] Resolution error:', err);
      return res.status(500).json({ error: 'Failed to resolve connectors' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
