import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient();

  if (req.method === 'GET') {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Lead ID is required' });
    }

    const { data: events, error } = await supabase
      .from('lead_events')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lead events:', error);
      return res.status(500).json({ error: 'Failed to fetch lead events' });
    }

    return res.status(200).json(events || []);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
