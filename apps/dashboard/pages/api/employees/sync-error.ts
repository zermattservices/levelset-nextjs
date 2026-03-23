import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { setCorsOrigin } from '@/lib/cors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsOrigin(req, res);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  setCorsOrigin(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient();
    const {
      error: errorMessage,
      hs_client_id,
      hs_location_number,
      bookmarklet_version,
      phase,
    } = req.body;

    await supabase.from('hs_sync_log').insert({
      status: 'client_error',
      source: 'bookmarklet',
      bookmarklet_version: bookmarklet_version || null,
      hs_client_id: hs_client_id || null,
      location_number: hs_location_number || null,
      error_message: typeof errorMessage === 'string' ? errorMessage.substring(0, 1000) : 'Unknown error',
      request_meta: {
        user_agent: req.headers['user-agent'] || null,
        origin: req.headers.origin || null,
        phase: phase || null,
      },
      completed_at: new Date().toISOString(),
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[sync-error] Error logging client error:', error);
    return res.status(200).json({ ok: true }); // Don't fail — this is just logging
  }
}
