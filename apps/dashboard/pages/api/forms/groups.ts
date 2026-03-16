import type { NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { withPermissionAndContext, type AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { checkPermission } from '@/lib/permissions/service';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string; isAdmin?: boolean }
) {
  const supabase = createServerSupabaseClient();
  const { orgId, userId } = context;

  if (req.method === 'GET') {
    const { data: groups, error } = await supabase
      .from('form_groups')
      .select('*, form_templates(count)')
      .eq('org_id', orgId)
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const transformed = (groups || []).map((g: any) => ({
      ...g,
      template_count: g.form_templates?.[0]?.count || 0,
      form_templates: undefined,
    }));

    return res.status(200).json(transformed);
  }

  if (req.method === 'POST') {
    if (!context.isAdmin) {
      const hasCreate = await checkPermission(supabase, userId, orgId, P.FM_CREATE_FORMS);
      if (!hasCreate) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }

    const { name, name_es, description, description_es, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '');

    const { data: existing } = await supabase
      .from('form_groups')
      .select('id')
      .eq('org_id', orgId)
      .eq('slug', slug)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'A group with this name already exists' });
    }

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

export default withPermissionAndContext(P.FM_VIEW_FORMS, handler);
