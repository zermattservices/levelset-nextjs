/**
 * GET /api/onboarding/validate-invite?token=xxx
 *
 * Validates an invite token and returns invite details.
 * Used by the signup page to show invite context.
 *
 * No auth required — the token itself is the credential.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.query.token as string;
  if (!token) {
    return res.status(400).json({ error: 'token query param is required' });
  }

  const supabase = createServerSupabaseClient();

  try {
    const { data: invite, error } = await supabase
      .from('onboarding_invites')
      .select('id, email, first_name, last_name, role, org_id, accepted_at')
      .eq('token', token)
      .maybeSingle();

    if (error || !invite) {
      return res.status(404).json({ error: 'Invalid or expired invite' });
    }

    if (invite.accepted_at) {
      return res.status(410).json({ error: 'This invite has already been accepted' });
    }

    // Get org name
    const { data: org } = await supabase
      .from('orgs')
      .select('name')
      .eq('id', invite.org_id)
      .single();

    return res.status(200).json({
      firstName: invite.first_name || '',
      lastName: invite.last_name || '',
      email: invite.email || '',
      role: invite.role || '',
      orgName: org?.name || '',
    });
  } catch (err: any) {
    console.error('validate-invite error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
