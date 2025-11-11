import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import { fetchBig5Labels, fetchPositionsList } from '@/lib/ratings-data';

async function getOrgIdForLocation(supabase: ReturnType<typeof createServerSupabaseClient>, locationId: string) {
  const { data, error } = await supabase
    .from('locations')
    .select('org_id')
    .eq('id', locationId)
    .maybeSingle();

  if (error) {
    console.error('[position-labels] Failed to fetch org_id for location', locationId, error);
    throw new Error('Failed to resolve org_id for location');
  }

  if (!data?.org_id) {
    throw new Error('No org_id associated with location');
  }

  return data.org_id as string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient();

  if (req.method === 'GET') {
    const { location_id, position, area } = req.query;

    // If requesting positions list
    if (!position && area) {
      if (!location_id) {
        return res.status(400).json({ error: 'location_id is required' });
      }

      try {
        const positions = await fetchPositionsList(
          supabase,
          location_id as string,
          area as 'FOH' | 'BOH'
        );

        return res.status(200).json({
          success: true,
          positions
        });
      } catch (error: any) {
        console.error('[position-labels] Error fetching positions list:', error);
        return res.status(500).json({ error: error?.message || 'Failed to fetch positions list' });
      }
    }

    // Fetch specific position labels
    if (!location_id || !position) {
      return res.status(400).json({ 
        error: 'location_id and position required' 
      });
    }

    try {
      const labels = await fetchBig5Labels(
        supabase,
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
    } catch (error: any) {
      console.error('[position-labels] Error fetching labels:', error);
      return res.status(500).json({ error: error?.message || 'Failed to fetch labels' });
    }
  }

  if (req.method === 'POST') {
    const { org_id, location_id, position, label_1, label_2, label_3, label_4, label_5 } = req.body;

    if (!location_id || !position || !label_1 || !label_2 || !label_3 || !label_4 || !label_5) {
      return res.status(400).json({ 
        error: 'All fields required',
        required: 'location_id, position, label_1, label_2, label_3, label_4, label_5'
      });
    }

    let resolvedOrgId = org_id;
    try {
      if (!resolvedOrgId) {
        resolvedOrgId = await getOrgIdForLocation(supabase, location_id);
      }
    } catch (error: any) {
      console.error('[position-labels] Unable to resolve org_id for location', location_id, error);
      return res.status(500).json({ error: error?.message || 'Failed to resolve org_id for location' });
    }

    const { data, error } = await supabase
      .from('position_big5_labels')
      .upsert({
        org_id: resolvedOrgId,
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

