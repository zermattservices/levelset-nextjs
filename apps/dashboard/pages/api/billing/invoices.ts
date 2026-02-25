/**
 * GET /api/billing/invoices
 *
 * Returns invoice history for the authenticated user's org.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();

  const { org_id, limit = '12' } = req.query;

  if (!org_id || typeof org_id !== 'string') {
    return res.status(400).json({ error: 'org_id is required' });
  }

  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('org_id', org_id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string, 10));

    if (error) {
      console.error('Error fetching invoices:', error);
      return res.status(500).json({ error: 'Failed to fetch invoices' });
    }

    return res.status(200).json({ invoices: invoices || [] });
  } catch (err) {
    console.error('Error in billing/invoices:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
