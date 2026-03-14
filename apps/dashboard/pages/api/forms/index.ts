import type { NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateUniqueSlug } from '@/lib/forms/slugify';
import { withPermissionAndContext, type AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { checkPermission } from '@/lib/permissions/service';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string }
) {
  const supabase = createServerSupabaseClient();
  const { orgId, userId } = context;

  if (req.method === 'GET') {
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

    const transformed = (templates || []).map((t: any) => ({
      ...t,
      group: t.form_groups,
      form_groups: undefined,
    }));

    return res.status(200).json(transformed);
  }

  if (req.method === 'POST') {
    // POST requires create permission (middleware only checked view)
    const hasCreate = await checkPermission(supabase, userId, orgId, P.FM_CREATE_FORMS);
    if (!hasCreate) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const { intent } = req.body;

    if (intent === 'create_template') {
      const { name, name_es, description, description_es, group_id, form_type } = req.body;

      if (!name || !group_id || !form_type) {
        return res.status(400).json({ error: 'Name, group_id, and form_type are required' });
      }

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

      const slug = await generateUniqueSlug(supabase, orgId, name);

      // Look up the app_user id for created_by
      const { data: appUser } = await supabase
        .from('app_users')
        .select('id')
        .eq('auth_user_id', userId)
        .eq('org_id', orgId)
        .maybeSingle();

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
          created_by: appUser?.id || null,
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

export default withPermissionAndContext(P.FM_VIEW_FORMS, handler);
