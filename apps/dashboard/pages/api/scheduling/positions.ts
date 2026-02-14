import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    const supabase = createServerSupabaseClient();

    if (req.method === 'GET') {
      const { org_id, zone } = req.query;

      if (!org_id) {
        return res.status(400).json({ error: 'org_id is required' });
      }

      let query = supabase
        .from('org_positions')
        .select('id, org_id, name, zone, description, display_order, is_active')
        .eq('org_id', org_id)
        .eq('is_active', true)
        .order('zone')
        .order('display_order');

      if (zone && (zone === 'FOH' || zone === 'BOH')) {
        query = query.eq('zone', zone);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching positions:', error);
        return res.status(500).json({ error: 'Failed to fetch positions' });
      }

      return res.status(200).json({ positions: data || [] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
