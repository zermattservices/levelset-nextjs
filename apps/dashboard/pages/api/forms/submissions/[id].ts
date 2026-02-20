import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerSupabaseClient();
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Submission ID is required' });
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
    const { data: submission, error } = await supabase
      .from('form_submissions')
      .select('*, form_templates!inner(id, name, name_es, form_type, ui_schema)')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Enrich with names
    let submittedByName = null;
    let employeeName = null;

    if (submission.submitted_by) {
      const { data: submitter } = await supabase
        .from('app_users')
        .select('full_name')
        .eq('id', submission.submitted_by)
        .single();
      submittedByName = submitter?.full_name || null;
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
    // Only Levelset Admin can update submission status
    if (appUser.role !== 'Levelset Admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { status } = req.body;

    // Only allow valid status transitions
    const validStatuses = ['approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    }

    // Verify submission exists and is in 'submitted' state
    const { data: existing } = await supabase
      .from('form_submissions')
      .select('status')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (existing.status !== 'submitted') {
      return res.status(400).json({
        error: `Cannot change status from "${existing.status}" to "${status}". Only submitted forms can be approved or rejected.`,
      });
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

  return res.status(405).json({ error: 'Method not allowed' });
}
