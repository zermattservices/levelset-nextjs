/**
 * Evaluation Templates API
 * GET /api/evaluations/templates
 *
 * Returns active evaluation form templates for the org.
 * Uses EVAL_VIEW_EVALUATIONS permission (not FM_VIEW_FORMS)
 * so mobile users can see available evaluation forms.
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, type AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string; isAdmin?: boolean }
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();
  const { orgId } = context;
  const { template_id } = req.query;

  // Single template fetch by ID
  if (template_id && typeof template_id === 'string') {
    const { data: template, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('id', template_id)
      .eq('org_id', orgId)
      .eq('form_type', 'evaluation')
      .single();

    if (error || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.status(200).json(template);
  }

  // List all active evaluation templates
  const { data: templates, error } = await supabase
    .from('form_templates')
    .select('id, name, name_es, description, description_es, form_type, is_active, schema, ui_schema, settings')
    .eq('org_id', orgId)
    .eq('form_type', 'evaluation')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(templates ?? []);
}

export default withPermissionAndContext(P.EVAL_VIEW_EVALUATIONS, handler);
