import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import { fetchBig5Labels, fetchPositionsList } from '@/lib/ratings-data';

/**
 * Position Labels API endpoint
 * 
 * GET: Fetch Big 5 labels for a position
 * Query params: org_id, location_id, position
 * 
 * POST: Create/update Big 5 labels (admin function)
 * Body: { org_id, location_id, position, label_1, label_2, label_3, label_4, label_5 }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient();

  if (req.method === 'GET') {
    const { org_id, location_id, position, area } = req.query;

    // If requesting positions list
    if (!position && area) {
      if (!org_id || !location_id) {
        return res.status(400).json({ error: 'org_id and location_id required' });
      }

      const positions = await fetchPositionsList(
        supabase,
        org_id as string,
        location_id as string,
        area as 'FOH' | 'BOH'
      );

      return res.status(200).json({
        success: true,
        positions
      });
    }

    // Fetch specific position labels
    if (!org_id || !location_id || !position) {
      return res.status(400).json({ 
        error: 'org_id, location_id, and position required' 
      });
    }

    const labels = await fetchBig5Labels(
      supabase,
      org_id as string,
      location_id as string,
      position as string
    );

    if (!labels) {
      return res.status(404).json({ 
        error: 'Big 5 labels not found for this position',
        suggestion: 'Run the migration and populate labels script'
      });
    }

    return res.status(200).json({
      success: true,
      labels
    });
  }

  if (req.method === 'POST') {
    const { org_id, location_id, position, label_1, label_2, label_3, label_4, label_5 } = req.body;

    if (!org_id || !location_id || !position || !label_1 || !label_2 || !label_3 || !label_4 || !label_5) {
      return res.status(400).json({ 
        error: 'All fields required',
        required: 'org_id, location_id, position, label_1, label_2, label_3, label_4, label_5'
      });
    }

    const { data, error } = await supabase
      .from('position_big5_labels')
      .upsert({
        org_id,
        location_id,
        position,
        label_1,
        label_2,
        label_3,
        label_4,
        label_5,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'org_id,location_id,position'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting Big 5 labels:', error);
      return res.status(500).json({ error: 'Failed to save labels' });
    }

    return res.status(200).json({
      success: true,
      labels: data
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

