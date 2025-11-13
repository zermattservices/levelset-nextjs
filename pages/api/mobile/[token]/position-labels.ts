import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchLocationByToken } from '@/lib/mobile-location';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tokenParam = req.query.token;
  const positionParam = req.query.position;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
  const position = Array.isArray(positionParam) ? positionParam[0] : positionParam;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' });
  }

  if (!position || typeof position !== 'string') {
    return res.status(400).json({ error: 'Missing position' });
  }

  const location = await fetchLocationByToken(token);

  if (!location) {
    return res.status(404).json({ error: 'Location not found' });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('position_big5_labels')
    .select('label_1, label_2, label_3, label_4, label_5')
    .eq('location_id', location.id)
    .eq('position', position)
    .maybeSingle();

  if (error) {
    console.error('[mobile] Failed to fetch labels for token', token, 'position', position, error);
    return res.status(500).json({ error: 'Failed to load labels' });
  }

  if (!data) {
    return res.status(404).json({ error: 'No labels found for position' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    labels: [data.label_1, data.label_2, data.label_3, data.label_4, data.label_5].filter(
      (label): label is string => Boolean(label)
    ),
  });
}

