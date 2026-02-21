import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateUniqueSlug } from '@/lib/forms/slugify';

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

  const { data: appUsers } = await supabase
    .from('app_users')
    .select('id, org_id, role')
    .eq('auth_user_id', user.id)
    .order('created_at');

  const appUser = appUsers?.find(u => u.role === 'Levelset Admin') || appUsers?.[0];

  if (!appUser?.org_id) {
    return res.status(403).json({ error: 'No organization found' });
  }

  const orgId = appUser.org_id;

  if (req.method === 'GET') {
    // List all form templates for the org
    const { group_id, form_type, is_active } = req.query;

    let query = supabase
      .from('form_templates')
      .select('*, form_groups!inner(name, slug, is_system)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (group_id) {
      query = query.eq('group_id', group_id as string);
    }
    if (form_type) {
      query = query.eq('form_type', form_type as string);
    }
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data: templates, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Transform joined data
    const transformed = (templates || []).map((t: any) => ({
      ...t,
      group: t.form_groups,
      form_groups: undefined,
    }));

    return res.status(200).json(transformed);
  }

  if (req.method === 'POST') {
    // Only Levelset Admin can create templates for now
    if (appUser.role !== 'Levelset Admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { intent } = req.body;

    if (intent === 'create_template') {
      const { name, name_es, description, description_es, group_id, form_type } = req.body;

      if (!name || !group_id || !form_type) {
        return res.status(400).json({ error: 'Name, group_id, and form_type are required' });
      }

      // Validate form_type
      const validTypes = ['rating', 'discipline', 'evaluation', 'custom'];
      if (!validTypes.includes(form_type)) {
        return res.status(400).json({ error: 'Invalid form_type' });
      }

      // Verify group belongs to this org
      const { data: group } = await supabase
        .from('form_groups')
        .select('id, org_id, slug')
        .eq('id', group_id)
        .eq('org_id', orgId)
        .single();

      if (!group) {
        return res.status(404).json({ error: 'Form group not found' });
      }

      // Validate form_type matches system group slug
      const slugToType: Record<string, string> = {
        positional_excellence: 'rating',
        discipline: 'discipline',
        evaluations: 'evaluation',
      };
      const expectedType = slugToType[group.slug];
      if (expectedType && form_type !== expectedType) {
        return res.status(400).json({
          error: `The "${group.slug}" group requires form type "${expectedType}"`,
        });
      }

      // Generate a unique slug from the form name
      const slug = await generateUniqueSlug(supabase, orgId, name);

      // Create template with default empty schema
      const { data: template, error } = await supabase
        .from('form_templates')
        .insert({
          org_id: orgId,
          group_id,
          name,
          name_es: name_es || null,
          slug,
          description: description || null,
          description_es: description_es || null,
          form_type,
          schema: {},
          ui_schema: {},
          settings: {},
          is_active: true,
          is_system: false,
          created_by: appUser.id,
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json(template);
    }

    return res.status(400).json({ error: 'Invalid intent' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
