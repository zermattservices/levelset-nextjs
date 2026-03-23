import { NextApiRequest, NextApiResponse } from 'next';
import { setCorsOrigin } from '@/lib/cors';

// Bump CURRENT_VERSION when releasing a new bookmarklet.
// Bump MIN_SUPPORTED when old bookmarklets are no longer compatible.
const CURRENT_VERSION = 1;
const MIN_SUPPORTED = 1;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsOrigin(req, res);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  setCorsOrigin(req, res);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const callerVersion = parseInt(req.query.v as string, 10) || 0;

  return res.status(200).json({
    current: CURRENT_VERSION,
    min_supported: MIN_SUPPORTED,
    deprecated: callerVersion < MIN_SUPPORTED,
    update_url: '/employees?sync=true',
  });
}
