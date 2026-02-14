import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchLocationByToken } from '@/lib/mobile-location';
import { getRatingThresholds } from '@/lib/rating-thresholds';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid token' });
  }

  try {
    const location = await fetchLocationByToken(token);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const thresholds = await getRatingThresholds(location.id);

    return res.status(200).json(thresholds);
  } catch (error) {
    console.error('[rating-thresholds] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

