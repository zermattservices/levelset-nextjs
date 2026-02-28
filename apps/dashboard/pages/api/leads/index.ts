import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient();

  if (req.method === 'GET') {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error);
      return res.status(500).json({ error: 'Failed to fetch leads' });
    }

    return res.status(200).json(leads || []);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
