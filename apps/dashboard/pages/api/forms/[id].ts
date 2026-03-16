import type { NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateUniqueSlug } from '@/lib/forms/slugify';
import { withPermissionAndContext, type AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { checkPermission } from '@/lib/permissions/service';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string; isAdmin?: boolean }
) {
  const supabase = createServerSupabaseClient();
  const { orgId, userId, isAdmin } = context;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Template ID is required' });
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const lookupField = isUuid ? 'id' : 'slug';

  if (req.method === 'GET') {
    const { data: template, error } = await supabase
      .from('form_templates')
      .select('*, form_groups!inner(id, name, slug, is_system)')
      .eq(lookupField, id)
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
    if (!isAdmin) {
      const hasEdit = await checkPermission(supabase, userId, orgId, P.FM_EDIT_FORMS);
      if (!hasEdit) {
        return res.status(403).json({ error: 'Permission denied' });
      }
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

    // Check if this is a system template — only allow is_active changes
    const { data: existingTemplate } = await supabase
      .from('form_templates')
      .select('is_system')
      .eq(lookupField, id)
      .eq('org_id', orgId)
      .single();

    if (existingTemplate?.is_system) {
      const hasStructuralChanges =
        name !== undefined ||
        name_es !== undefined ||
        description !== undefined ||
        description_es !== undefined ||
        group_id !== undefined ||
        schema !== undefined ||
        ui_schema !== undefined ||
        settings !== undefined;

      if (hasStructuralChanges) {
        return res.status(403).json({ error: 'System form structure cannot be modified. Only active status can be changed.' });
      }
    }

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

    if (name !== undefined) {
      let templateId = id;
      if (!isUuid) {
        const { data: found } = await supabase
          .from('form_templates')
          .select('id')
          .eq('slug', id)
          .eq('org_id', orgId)
          .single();
        if (found) templateId = found.id;
      }
      updates.slug = await generateUniqueSlug(supabase, orgId, name, templateId);
    }

    const { data: template, error } = await supabase
      .from('form_templates')
      .update(updates)
      .eq(lookupField, id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(template);
  }

  if (req.method === 'DELETE') {
    if (!isAdmin) {
      const hasDelete = await checkPermission(supabase, userId, orgId, P.FM_DELETE_FORMS);
      if (!hasDelete) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }

    const { data: existing } = await supabase
      .from('form_templates')
      .select('is_system')
      .eq(lookupField, id)
      .eq('org_id', orgId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existing.is_system) {
      return res.status(403).json({ error: 'System templates cannot be deleted' });
    }

    const { error } = await supabase
      .from('form_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq(lookupField, id)
      .eq('org_id', orgId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPermissionAndContext(P.FM_VIEW_FORMS, handler);
