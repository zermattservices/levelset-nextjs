import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    const supabase = createServerSupabaseClient();

    if (req.method === 'GET') {
      const { location_id } = req.query;

      if (!location_id) {
        return res.status(400).json({ error: 'location_id is required' });
      }

      const { data, error } = await supabase
        .from('shift_areas')
        .select('*')
        .eq('location_id', location_id)
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Error fetching shift areas:', error);
        return res.status(500).json({ error: 'Failed to fetch shift areas' });
      }

      return res.status(200).json({ areas: data || [] });
    }

    if (req.method === 'POST') {
      const { intent } = req.body;

      if (intent === 'create') {
        const { name, color, location_id, org_id } = req.body;

        if (!name || !location_id || !org_id) {
          return res.status(400).json({ error: 'name, location_id, and org_id are required' });
        }

        // Get the next display_order
        const { data: existing } = await supabase
          .from('shift_areas')
          .select('display_order')
          .eq('location_id', location_id)
          .order('display_order', { ascending: false })
          .limit(1);

        const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

        const { data, error } = await supabase
          .from('shift_areas')
          .insert({
            name,
            color: color || 'var(--ls-color-muted)',
            location_id,
            org_id,
            display_order: nextOrder,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating shift area:', error);
          if (error.code === '23505') {
            return res.status(409).json({ error: 'A shift area with that name already exists at this location' });
          }
          return res.status(500).json({ error: 'Failed to create shift area' });
        }

        return res.status(201).json({ area: data });
      }

      if (intent === 'update') {
        const { id, name, color, display_order, is_active } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'id is required' });
        }

        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (name !== undefined) updateData.name = name;
        if (color !== undefined) updateData.color = color;
        if (display_order !== undefined) updateData.display_order = display_order;
        if (is_active !== undefined) updateData.is_active = is_active;

        const { data, error } = await supabase
          .from('shift_areas')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Error updating shift area:', error);
          return res.status(500).json({ error: 'Failed to update shift area' });
        }

        return res.status(200).json({ area: data });
      }

      if (intent === 'delete') {
        const { id } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'id is required' });
        }

        const { data, error } = await supabase
          .from('shift_areas')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Error deactivating shift area:', error);
          return res.status(500).json({ error: 'Failed to deactivate shift area' });
        }

        return res.status(200).json({ area: data });
      }

      return res.status(400).json({ error: 'Invalid intent' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
