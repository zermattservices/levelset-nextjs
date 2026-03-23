import { NextApiRequest, NextApiResponse } from 'next';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://app.hotschedules.com',
  'https://app.4pointsolutions.com',
];

const ALLOWED_ORIGIN_SUFFIX = '.levelset.io';

/**
 * Set CORS origin header if the request origin is allowed.
 * Allows localhost:3000-3002 and any *.levelset.io subdomain.
 */
export function setCorsOrigin(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;
  if (!origin) return;

  const url = (() => { try { return new URL(origin); } catch { return null; } })();
  if (!url) return;

  if (ALLOWED_ORIGINS.includes(origin) || url.hostname.endsWith(ALLOWED_ORIGIN_SUFFIX)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
}
