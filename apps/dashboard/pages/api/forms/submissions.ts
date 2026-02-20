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

  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, org_id, role, full_name')
    .eq('auth_user_id', user.id)
    .single();

  if (!appUser?.org_id) {
    return res.status(403).json({ error: 'No organization found' });
  }

  const orgId = appUser.org_id;

  if (req.method === 'GET') {
    // List submissions with filters
    const { template_id, form_type, status, limit, offset } = req.query;

    let query = supabase
      .from('form_submissions')
      .select('*, form_templates!inner(id, name, name_es, form_type)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (template_id) {
      query = query.eq('template_id', template_id as string);
    }
    if (form_type) {
      query = query.eq('form_type', form_type as string);
    }
    if (status) {
      query = query.eq('status', status as string);
    }

    // Pagination
    const limitNum = Math.min(Number(limit) || 100, 500);
    const offsetNum = Number(offset) || 0;
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data: submissions, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Fetch submitted_by and employee names for enrichment
    const submitterIds = Array.from(new Set((submissions || []).map((s: any) => s.submitted_by).filter(Boolean)));
    const employeeIds = Array.from(new Set((submissions || []).map((s: any) => s.employee_id).filter(Boolean)));

    let submitterMap: Record<string, string> = {};
    let employeeMap: Record<string, string> = {};

    if (submitterIds.length > 0) {
      const { data: submitters } = await supabase
        .from('app_users')
        .select('id, full_name')
        .in('id', submitterIds);
      if (submitters) {
        submitterMap = Object.fromEntries(submitters.map((u: any) => [u.id, u.full_name || 'Unknown']));
      }
    }

    if (employeeIds.length > 0) {
      const { data: employees } = await supabase
        .from('employees')
        .select('id, full_name')
        .in('id', employeeIds);
      if (employees) {
        employeeMap = Object.fromEntries(employees.map((e: any) => [e.id, e.full_name || 'Unknown']));
      }
    }

    // Transform: join template, add names
    const transformed = (submissions || []).map((s: any) => ({
      ...s,
      template: s.form_templates
        ? {
            id: s.form_templates.id,
            name: s.form_templates.name,
            name_es: s.form_templates.name_es,
            form_type: s.form_templates.form_type,
          }
        : null,
      form_templates: undefined,
      submitted_by_name: submitterMap[s.submitted_by] || null,
      employee_name: employeeMap[s.employee_id] || null,
    }));

    return res.status(200).json(transformed);
  }

  if (req.method === 'POST') {
    // Create a submission
    const {
      template_id,
      location_id,
      employee_id,
      response_data,
    } = req.body;

    if (!template_id || !response_data) {
      return res.status(400).json({ error: 'template_id and response_data are required' });
    }

    // Fetch the template for schema snapshot and form_type
    const { data: template, error: templateError } = await supabase
      .from('form_templates')
      .select('*')
      .eq('id', template_id)
      .eq('org_id', orgId)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Form template not found' });
    }

    // Create the submission with schema snapshot
    const { data: submission, error: insertError } = await supabase
      .from('form_submissions')
      .insert({
        org_id: orgId,
        location_id: location_id || null,
        template_id,
        form_type: template.form_type,
        submitted_by: appUser.id,
        employee_id: employee_id || null,
        response_data,
        schema_snapshot: template.schema,
        score: null, // Will be calculated for evaluations in Sprint 5
        status: 'submitted',
        metadata: {},
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    // NOTE: Dual-write logic for rating/discipline form types
    // is intentionally deferred. When a rating or discipline form
    // is submitted through this system, we will also insert into
    // the existing `ratings` or `infractions` tables.
    // This will be wired in Sprint 5 alongside connected questions.

    return res.status(201).json(submission);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
