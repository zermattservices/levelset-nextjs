import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('position_big5_labels')
      .select('*')
      .order('position');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      count: data?.length || 0,
      labels: data || []
    });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

