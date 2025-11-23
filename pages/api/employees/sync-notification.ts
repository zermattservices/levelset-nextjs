import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    const supabase = createServerSupabaseClient();

    if (req.method === 'GET') {
      // GET: Return most recent unviewed notification for location
      const locationId = req.query.location_id as string;

      if (!locationId) {
        return res.status(400).json({ error: 'location_id query parameter is required' });
      }

      const { data: notification, error } = await supabase
        .from('hs_sync_notifications')
        .select('*')
        .eq('location_id', locationId)
        .eq('viewed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching sync notification:', error);
        return res.status(500).json({ error: 'Failed to fetch notification', details: error.message });
      }

      return res.status(200).json({ notification: notification || null });
    }

    if (req.method === 'POST') {
      // POST: Mark notification as viewed
      const { notification_id } = req.body;

      if (!notification_id) {
        return res.status(400).json({ error: 'notification_id is required' });
      }

      const { error } = await supabase
        .from('hs_sync_notifications')
        .update({ viewed: true })
        .eq('id', notification_id);

      if (error) {
        console.error('Error marking notification as viewed:', error);
        return res.status(500).json({ error: 'Failed to update notification', details: error.message });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in sync-notification:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

