import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerSupabaseClient();

  // Get authenticated user and their org_id
  const {
    data: { user },
  } = await supabase.auth.getUser(
    req.headers.authorization?.replace('Bearer ', '') || ''
  );

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get the app_user to find org_id
  const { data: appUser } = await supabase
    .from('app_users')
    .select('org_id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!appUser?.org_id) {
    return res.status(403).json({ error: 'No organization found' });
  }

  const orgId = appUser.org_id;

  if (req.method === 'GET') {
    // List all form groups for the org with template counts
    const { data: groups, error } = await supabase
      .from('form_groups')
      .select('*, form_templates(count)')
      .eq('org_id', orgId)
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Transform the count from the join
    const transformed = (groups || []).map((g: any) => ({
      ...g,
      template_count: g.form_templates?.[0]?.count || 0,
      form_templates: undefined,
    }));

    return res.status(200).json(transformed);
  }

  if (req.method === 'POST') {
    // Only Levelset Admin can create groups for now
    if (appUser.role !== 'Levelset Admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { name, name_es, description, description_es, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '');

    // Check for duplicate slug
    const { data: existing } = await supabase
      .from('form_groups')
      .select('id')
      .eq('org_id', orgId)
      .eq('slug', slug)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'A group with this name already exists' });
    }

    // Get max display_order
    const { data: maxOrder } = await supabase
      .from('form_groups')
      .select('display_order')
      .eq('org_id', orgId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const { data: group, error } = await supabase
      .from('form_groups')
      .insert({
        org_id: orgId,
        name,
        name_es: name_es || null,
        description: description || null,
        description_es: description_es || null,
        slug,
        is_system: false,
        icon: icon || null,
        display_order: (maxOrder?.display_order || 0) + 1,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(group);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
