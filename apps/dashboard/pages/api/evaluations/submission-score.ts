/**
 * Evaluation Submission Score API
 * GET /api/evaluations/submission-score
 *
 * Returns the computed score breakdown for a single form submission.
 *
 * Query params:
 *  - org_id (required — resolved by middleware)
 *  - submission_id (required)
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { calculateEvaluationScore } from '@/lib/forms/scoring';
import { jsonSchemaToFields } from '@/lib/forms/schema-builder';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string; isAdmin?: boolean }
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orgId } = context;
  const { submission_id } = req.query as Record<string, string | undefined>;

  if (!submission_id) {
    return res.status(400).json({ error: 'submission_id is required' });
  }

  const supabase = createServerSupabaseClient();

  // Fetch the submission with its form template (schema + settings)
  const { data: submission, error: subError } = await supabase
    .from('form_submissions')
    .select(`
      id,
      employee_id,
      submitted_by,
      created_at,
      response_data,
      form_templates!form_submissions_form_template_id_fkey (
        id,
        schema,
        ui_schema,
        settings
      )
    `)
    .eq('id', submission_id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (subError) {
    console.error('[submission-score] fetch error:', subError);
    return res.status(500).json({ error: 'Failed to fetch submission' });
  }

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  const template = (submission as any).form_templates;

  if (!template?.schema) {
    return res.status(422).json({ error: 'Submission has no associated form schema' });
  }

  // Convert JSON Schema back to FormField[] and compute score
  const fields = jsonSchemaToFields(template.schema, template.ui_schema ?? {});
  const responseData = (submission.response_data as Record<string, any>) ?? {};
  const evalScore = calculateEvaluationScore(fields, responseData);

  const score = {
    overall_percentage: Math.round(evalScore.overallPercentage * 100) / 100,
    total_earned: Math.round(evalScore.totalEarned * 100) / 100,
    total_max: Math.round(evalScore.totalMax * 100) / 100,
    sections: evalScore.sections.map((s) => ({
      name: s.sectionName,
      percentage: Math.round(s.percentage * 100) / 100,
      earned: Math.round(s.earnedPoints * 100) / 100,
      max: Math.round(s.maxPoints * 100) / 100,
    })),
  };

  return res.status(200).json({
    score,
    submission_id: submission.id,
    employee_id: submission.employee_id,
    submitted_by: submission.submitted_by,
    created_at: submission.created_at,
  });
}

export default withPermissionAndContext(P.EVAL_VIEW_EVALUATIONS, handler);
