import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { calculateEvaluationScore } from '@/lib/forms/scoring';
import { resolveConnectedQuestions } from '@/lib/forms/connectors-resolver';

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
    .select('id, org_id, role, full_name')
    .eq('auth_user_id', user.id)
    .order('created_at');

  const appUser = appUsers?.find(u => u.role === 'Levelset Admin') || appUsers?.[0];

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

    // Calculate evaluation score if applicable
    let score: number | null = null;
    const metadata: Record<string, any> = {};

    if (template.form_type === 'evaluation' && template.settings?.evaluation) {
      const evalSettings = template.settings.evaluation;
      let scoringData = { ...response_data };

      // Resolve connected questions if the evaluation has any
      const connectedQuestions = Object.entries(evalSettings.questions || {})
        .filter(([_, q]: [string, any]) => q.connected_to)
        .map(([fieldId, q]: [string, any]) => ({
          key: q.connected_to as string,
          params: q.connector_params,
          fieldId,
        }));

      if (connectedQuestions.length > 0 && employee_id) {
        const connectorInputs = connectedQuestions.map((cq) => ({
          key: cq.key,
          params: cq.params,
        }));

        const resolved = await resolveConnectedQuestions(
          supabase,
          employee_id,
          orgId,
          location_id || null,
          connectorInputs
        );

        for (const cq of connectedQuestions) {
          if (resolved[cq.key] !== undefined) {
            scoringData[cq.fieldId] = resolved[cq.key];
          }
        }
      }

      const result = calculateEvaluationScore(scoringData, evalSettings);
      score = result.overallPercentage;
      metadata.section_scores = result.sections.map((s) => ({
        sectionId: s.sectionId,
        sectionName: s.sectionName,
        earned: s.earnedPoints,
        max: s.maxPoints,
        percentage: s.percentage,
      }));
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
        score,
        status: 'submitted',
        metadata,
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    // Dual-write: rating/discipline form submissions also insert into
    // legacy tables so existing PE and Discipline dashboards stay current.
    // Uses settings.field_mappings to extract values from response_data.
    // Best-effort — dual-write failures don't block the submission.
    if (submission && (template.form_type === 'rating' || template.form_type === 'discipline')) {
      const mappings = template.settings?.field_mappings;
      if (mappings) {
        try {
          if (template.form_type === 'rating') {
            const ratingFields = mappings.ratings;
            if (
              mappings.employee_id &&
              mappings.leader_id &&
              mappings.position &&
              Array.isArray(ratingFields) &&
              ratingFields.length === 5
            ) {
              const ratings = ratingFields.map((fid: string) => Number(response_data[fid]) || 0);
              const allValid = ratings.every((v: number) => v >= 1 && v <= 5);

              if (allValid) {
                const { data: ratingRow } = await supabase
                  .from('ratings')
                  .insert({
                    employee_id: response_data[mappings.employee_id] || employee_id,
                    rater_user_id: response_data[mappings.leader_id] || appUser.id,
                    position: response_data[mappings.position],
                    rating_1: ratings[0],
                    rating_2: ratings[1],
                    rating_3: ratings[2],
                    rating_4: ratings[3],
                    rating_5: ratings[4],
                    location_id: location_id || null,
                    org_id: orgId,
                    notes: mappings.notes ? (response_data[mappings.notes] || null) : null,
                  })
                  .select('id')
                  .single();

                if (ratingRow?.id) {
                  await supabase
                    .from('form_submissions')
                    .update({ metadata: { ...metadata, rating_id: ratingRow.id } })
                    .eq('id', submission.id);
                }
              }
            }
          }

          if (template.form_type === 'discipline') {
            // Infraction dual-write (when infraction_id mapping exists)
            if (mappings.employee_id && mappings.leader_id && mappings.infraction_id) {
              // Look up rubric item
              const infractionRubricId = response_data[mappings.infraction_id];
              let rubric: { action: string; points: number | null } | null = null;

              if (infractionRubricId) {
                const { data: orgRubric } = await supabase
                  .from('infractions_rubric')
                  .select('action, points')
                  .eq('org_id', orgId)
                  .is('location_id', null)
                  .eq('id', infractionRubricId)
                  .maybeSingle();

                rubric = orgRubric;

                if (!rubric && location_id) {
                  const { data: locRubric } = await supabase
                    .from('infractions_rubric')
                    .select('action, points')
                    .eq('location_id', location_id)
                    .eq('id', infractionRubricId)
                    .maybeSingle();
                  rubric = locRubric;
                }
              }

              if (rubric) {
                const acknowledged = mappings.acknowledged
                  ? Boolean(response_data[mappings.acknowledged])
                  : false;

                const infractionDate = mappings.infraction_date
                  ? (response_data[mappings.infraction_date] || new Date().toISOString().split('T')[0])
                  : new Date().toISOString().split('T')[0];

                const { data: infractionRow } = await supabase
                  .from('infractions')
                  .insert({
                    employee_id: response_data[mappings.employee_id] || employee_id,
                    leader_id: response_data[mappings.leader_id] || appUser.id,
                    infraction: rubric.action,
                    points: rubric.points ?? 0,
                    acknowledgement: acknowledged ? 'Notified' : 'Not notified',
                    ack_bool: acknowledged,
                    infraction_date: infractionDate,
                    org_id: orgId,
                    location_id: location_id || null,
                    notes: mappings.notes ? (response_data[mappings.notes] || null) : null,
                    team_member_signature: mappings.team_member_signature
                      ? (response_data[mappings.team_member_signature] || null)
                      : null,
                    leader_signature: mappings.leader_signature
                      ? (response_data[mappings.leader_signature] || null)
                      : null,
                  })
                  .select('id')
                  .single();

                if (infractionRow?.id) {
                  await supabase
                    .from('form_submissions')
                    .update({ metadata: { ...metadata, infraction_id: infractionRow.id } })
                    .eq('id', submission.id);
                }
              }
            }

            // Discipline action dual-write (when action_id mapping exists)
            if (mappings.employee_id && mappings.action_id) {
              const actionRubricId = response_data[mappings.action_id];

              if (actionRubricId) {
                const { data: actionRubric } = await supabase
                  .from('disc_actions_rubric')
                  .select('id, action')
                  .eq('id', actionRubricId)
                  .maybeSingle();

                if (actionRubric) {
                  const actionDate = mappings.action_date
                    ? (response_data[mappings.action_date] || new Date().toISOString().split('T')[0])
                    : new Date().toISOString().split('T')[0];

                  const actingLeaderId = mappings.acting_leader
                    ? (response_data[mappings.acting_leader] || appUser.id)
                    : appUser.id;

                  const { data: actionRow } = await supabase
                    .from('disc_actions')
                    .insert({
                      employee_id: response_data[mappings.employee_id] || employee_id,
                      action_id: actionRubricId,
                      action: actionRubric.action,
                      action_date: actionDate,
                      acting_leader: actingLeaderId,
                      notes: mappings.notes ? (response_data[mappings.notes] || null) : null,
                      org_id: orgId,
                      location_id: location_id || null,
                    })
                    .select('id')
                    .single();

                  if (actionRow?.id) {
                    await supabase
                      .from('form_submissions')
                      .update({ metadata: { ...metadata, disc_action_id: actionRow.id } })
                      .eq('id', submission.id);
                  }
                }
              }
            }
          }
        } catch (dualWriteErr) {
          // Log but don't fail the submission
          console.error('[submissions] Dual-write failed:', dualWriteErr);
        }
      }
    }

    return res.status(201).json(submission);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
