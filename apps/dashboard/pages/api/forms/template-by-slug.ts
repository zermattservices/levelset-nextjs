import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'slug is required' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createServerSupabaseClient();

  // Decode JWT to get user ID
  const parts = token.split('.');
  if (parts.length !== 3) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let payload: any;
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!payload.sub) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return res.status(401).json({ error: 'Token expired' });
  }

  let orgId = req.query.org_id as string | undefined;

  if (!orgId) {
    // Fallback for mobile app: resolve from user's app_user record
    const { data: appUsers } = await supabase
      .from('app_users')
      .select('id, org_id')
      .eq('auth_user_id', payload.sub)
      .order('created_at');

    if (!appUsers || appUsers.length === 0 || !appUsers[0].org_id) {
      return res.status(403).json({ error: 'No organization found' });
    }

    orgId = appUsers[0].org_id;
  }

  // Fetch template by slug + org
  const { data: template, error } = await supabase
    .from('form_templates')
    .select('id, name, name_es, slug, form_type, schema, ui_schema, settings, is_system')
    .eq('org_id', orgId)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  // Cache for 5 minutes (templates rarely change)
  res.setHeader('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600');

  return res.status(200).json(template);
}
