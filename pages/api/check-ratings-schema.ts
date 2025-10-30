import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createServerSupabaseClient();

    // Get sample ratings to see schema
    const { data: sampleData, error: sampleError } = await supabase
      .from('ratings')
      .select('*')
      .limit(10);

    if (sampleError) {
      return res.status(500).json({ 
        error: 'Failed to fetch sample ratings',
        details: sampleError 
      });
    }

    const { count } = await supabase
      .from('ratings')
      .select('*', { count: 'exact', head: true });

    const columns = sampleData && sampleData.length > 0 
      ? Object.keys(sampleData[0]).map(key => ({
          name: key,
          type: typeof sampleData[0][key],
          sampleValue: sampleData[0][key]
        }))
      : [];

    return res.status(200).json({
      success: true,
      totalRatings: count,
      columns,
      sampleRecords: sampleData || []
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

