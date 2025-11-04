import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import { 
  fetchOverviewData, 
  fetchPositionData, 
  fetchLeadershipData,
  fetchPositionsList
} from '@/lib/ratings-data';

/**
 * Ratings API endpoint
 * 
 * Query params:
 * - tab: 'overview' | 'position' | 'leadership' (required)
 * - org_id: string (required)
 * - location_id: string (required)
 * - area: 'FOH' | 'BOH' (required)
 * - position: string (required if tab='position')
 * 
 * Returns aggregated rating data with employee/rater names via JOINs
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tab, org_id, location_id, area, position } = req.query;

    // Validate required params
    if (!tab || !org_id || !location_id || !area) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: 'tab, org_id, location_id, area'
      });
    }

    if (!['overview', 'position', 'leadership'].includes(tab as string)) {
      return res.status(400).json({ 
        error: 'Invalid tab parameter',
        validValues: ['overview', 'position', 'leadership']
      });
    }

    if (!['FOH', 'BOH'].includes(area as string)) {
      return res.status(400).json({ 
        error: 'Invalid area parameter',
        validValues: ['FOH', 'BOH']
      });
    }

    if (tab === 'position' && !position) {
      return res.status(400).json({ 
        error: 'position parameter required when tab=position'
      });
    }

    const supabase = createServerSupabaseClient();

    let data: any;

    switch (tab) {
      case 'overview':
        data = await fetchOverviewData(
          supabase,
          org_id as string,
          location_id as string,
          area as 'FOH' | 'BOH'
        );
        break;

      case 'position':
        data = await fetchPositionData(
          supabase,
          org_id as string,
          location_id as string,
          position as string
        );
        break;

      case 'leadership':
        data = await fetchLeadershipData(
          supabase,
          org_id as string,
          location_id as string,
          area as 'FOH' | 'BOH'
        );
        break;

      default:
        return res.status(400).json({ error: 'Invalid tab' });
    }

    return res.status(200).json({
      success: true,
      tab,
      area,
      position: position || null,
      data
    });

  } catch (error) {
    console.error('Ratings API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

