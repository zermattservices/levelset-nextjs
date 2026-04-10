import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/permissions/middleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { org_id } = req.query;

  if (!org_id || typeof org_id !== 'string') {
    return res.status(400).json({ error: 'org_id is required' });
  }

  const supabase = createServerSupabaseClient();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('org_discipline_config')
      .select('points_reset_mode')
      .eq('org_id', org_id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching discipline config:', error);
      return res.status(500).json({ error: 'Failed to fetch discipline config' });
    }

    return res.status(200).json({
      points_reset_mode: data?.points_reset_mode || 'rolling_90',
    });
  }

  if (req.method === 'POST') {
    const { points_reset_mode } = req.body;

    if (!points_reset_mode || !['rolling_90', 'quarterly'].includes(points_reset_mode)) {
      return res.status(400).json({ error: 'Invalid points_reset_mode. Must be "rolling_90" or "quarterly".' });
    }

    const { error } = await supabase
      .from('org_discipline_config')
      .upsert(
        {
          org_id,
          points_reset_mode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'org_id' }
      );

    if (error) {
      console.error('Error saving discipline config:', error);
      return res.status(500).json({ error: 'Failed to save discipline config' });
    }

    return res.status(200).json({ success: true, points_reset_mode });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
