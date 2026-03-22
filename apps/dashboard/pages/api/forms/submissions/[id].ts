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
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Submission ID is required' });
  }

  if (req.method === 'GET') {
    const { data: submission, error } = await supabase
      .from('form_submissions')
      .select('*, form_templates!inner(id, name, name_es, form_type, ui_schema)')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    let submittedByName = null;
    let employeeName = null;

    if (submission.submitted_by) {
      const { data: submitter } = await supabase
        .from('app_users')
        .select('first_name, last_name')
        .eq('id', submission.submitted_by)
        .single();
      if (submitter) {
        submittedByName = [submitter.first_name, submitter.last_name].filter(Boolean).join(' ') || null;
      }
    }

    if (submission.employee_id) {
      const { data: employee } = await supabase
        .from('employees')
        .select('full_name')
        .eq('id', submission.employee_id)
        .single();
      employeeName = employee?.full_name || null;
    }

    const transformed = {
      ...submission,
      template: submission.form_templates
        ? {
            id: (submission.form_templates as any).id,
            name: (submission.form_templates as any).name,
            name_es: (submission.form_templates as any).name_es,
            form_type: (submission.form_templates as any).form_type,
            ui_schema: (submission.form_templates as any).ui_schema,
          }
        : null,
      form_templates: undefined,
      submitted_by_name: submittedByName,
      employee_name: employeeName,
    };

    return res.status(200).json(transformed);
  }

  if (req.method === 'PATCH') {
    if (!context.isAdmin) {
      const hasManage = await checkPermission(supabase, userId, orgId, P.FM_MANAGE_SUBMISSIONS);
      if (!hasManage) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }

    const { status } = req.body;

    const validStatuses = ['submitted', 'deleted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "submitted" or "deleted"' });
    }

    const { data: existing } = await supabase
      .from('form_submissions')
      .select('status')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const { data: updated, error } = await supabase
      .from('form_submissions')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(updated);
  }

  if (req.method === 'DELETE') {
    if (!context.isAdmin) {
      const hasManage = await checkPermission(supabase, userId, orgId, P.FM_MANAGE_SUBMISSIONS);
      if (!hasManage) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }

    const { error } = await supabase
      .from('form_submissions')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPermissionAndContext(P.FM_VIEW_SUBMISSIONS, handler);
