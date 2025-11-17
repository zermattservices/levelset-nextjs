import type { NextApiRequest, NextApiResponse } from 'next';
import { getRatingThresholds } from '@/lib/rating-thresholds';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { location_id } = req.query;

  if (!location_id || typeof location_id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid location_id' });
  }

  try {
    const thresholds = await getRatingThresholds(location_id);
    return res.status(200).json(thresholds);
  } catch (error) {
    console.error('[rating-thresholds] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

