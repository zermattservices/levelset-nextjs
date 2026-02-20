import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerSupabaseClient();
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Template ID is required' });
  }

  // Get authenticated user and their org_id
  const {
    data: { user },
  } = await supabase.auth.getUser(
    req.headers.authorization?.replace('Bearer ', '') || ''
  );

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, org_id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!appUser?.org_id) {
    return res.status(403).json({ error: 'No organization found' });
  }

  const orgId = appUser.org_id;

  if (req.method === 'GET') {
    const { data: template, error } = await supabase
      .from('form_templates')
      .select('*, form_groups!inner(id, name, slug, is_system)')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const transformed = {
      ...template,
      group: template.form_groups,
      form_groups: undefined,
    };

    return res.status(200).json(transformed);
  }

  if (req.method === 'PATCH') {
    // Only Levelset Admin can edit templates for now
    if (appUser.role !== 'Levelset Admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const {
      name,
      name_es,
      description,
      description_es,
      group_id,
      is_active,
      schema,
      ui_schema,
      settings,
    } = req.body;

    // Build update object with only provided fields
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (name !== undefined) updates.name = name;
    if (name_es !== undefined) updates.name_es = name_es;
    if (description !== undefined) updates.description = description;
    if (description_es !== undefined) updates.description_es = description_es;
    if (group_id !== undefined) updates.group_id = group_id;
    if (is_active !== undefined) updates.is_active = is_active;
    if (schema !== undefined) updates.schema = schema;
    if (ui_schema !== undefined) updates.ui_schema = ui_schema;
    if (settings !== undefined) updates.settings = settings;

    const { data: template, error } = await supabase
      .from('form_templates')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(template);
  }

  if (req.method === 'DELETE') {
    // Only Levelset Admin can delete templates for now
    if (appUser.role !== 'Levelset Admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check if system template
    const { data: existing } = await supabase
      .from('form_templates')
      .select('is_system')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existing.is_system) {
      return res.status(403).json({ error: 'System templates cannot be deleted' });
    }

    // Soft-delete: set is_active to false
    const { error } = await supabase
      .from('form_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
