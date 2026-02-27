/**
 * GET /api/onboarding/analysis-status
 *
 * Returns the status and results of a Levi document analysis.
 * Polled by the frontend during document analysis.
 *
 * Auth: Bearer token from Supabase Auth session.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();

  // Verify auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, org_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!appUser?.org_id) {
    return res.status(403).json({ error: 'Complete account setup first' });
  }

  const analysisId = req.query.analysisId as string;
  if (!analysisId) {
    return res.status(400).json({ error: 'analysisId query param is required' });
  }

  try {
    const { data: analysis, error } = await supabase
      .from('onboarding_levi_analysis')
      .select('id, status, extracted_infractions, extracted_actions')
      .eq('id', analysisId)
      .eq('org_id', appUser.org_id)
      .single();

    if (error || !analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const isComplete = analysis.status === 'completed';
    const isFailed = analysis.status === 'failed';

    return res.status(200).json({
      status: isFailed ? 'error' : isComplete ? 'complete' : 'processing',
      data: isComplete
        ? {
            infractions: analysis.extracted_infractions || [],
            actions: analysis.extracted_actions || [],
          }
        : null,
    });
  } catch (err: any) {
    console.error('analysis-status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
