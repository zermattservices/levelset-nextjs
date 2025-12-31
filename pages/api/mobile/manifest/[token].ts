import type { NextApiRequest, NextApiResponse } from 'next';

const iconSrc = '/Levelset Icon Non Trans.png';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const tokenParam = req.query.token;
  const token = typeof tokenParam === 'string' && tokenParam.trim().length > 0 ? tokenParam : null;

  const startUrl = token ? `/mobile/launch?token=${encodeURIComponent(token)}` : '/mobile/launch';

  const manifest = {
    name: 'Levelset Mobile Portal',
    short_name: 'Levelset',
    start_url: startUrl,
    scope: '/mobile/',
    display: 'standalone',
    background_color: '#f2f5f4',
    theme_color: '#f2f5f4',
    icons: [
      {
        src: iconSrc,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };

  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(JSON.stringify(manifest));
}
