import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createServerSupabaseClient();

    console.log('🔍 Checking live Supabase schema for employees table...');

    // Get a sample record to see all columns
    const { data: sampleData, error: sampleError } = await supabase
      .from('employees')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('Error fetching sample:', sampleError);
      return res.status(500).json({ 
        error: 'Failed to fetch sample employee',
        details: sampleError 
      });
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting count:', countError);
    }

    // Extract column information from sample
    const columns = sampleData && sampleData.length > 0 
      ? Object.keys(sampleData[0]).map(key => {
          const value = sampleData[0][key];
          return {
            name: key,
            type: value === null ? 'null' : typeof value,
            sampleValue: value
          };
        })
      : [];

    return res.status(200).json({
      success: true,
      totalEmployees: count,
      columns,
      sampleRecord: sampleData?.[0] || null,
      message: 'Schema fetched successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

