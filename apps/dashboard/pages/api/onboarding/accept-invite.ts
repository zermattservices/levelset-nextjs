/**
 * POST /api/onboarding/accept-invite
 *
 * Accepts an invite token after the user has created their auth account.
 * Creates an app_user record linked to the employee and org.
 *
 * Auth: Bearer token from Supabase Auth session.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();

  // Verify auth
  const authToken = req.headers.authorization?.replace('Bearer ', '');
  if (!authToken) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'invite token is required' });
  }

  try {
    // Find the invite
    const { data: invite, error: inviteError } = await supabase
      .from('onboarding_invites')
      .select('id, org_id, employee_id, email, first_name, last_name, role, accepted_at')
      .eq('token', token)
      .maybeSingle();

    if (inviteError || !invite) {
      return res.status(404).json({ error: 'Invalid or expired invite' });
    }

    if (invite.accepted_at) {
      return res.status(410).json({ error: 'Invite already accepted' });
    }

    // Check if this auth user already has an app_user
    const { data: existingAppUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (existingAppUser) {
      // User already has an app_user — just mark invite as accepted
      await supabase
        .from('onboarding_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id);

      return res.status(200).json({ success: true, message: 'Invite accepted' });
    }

    // Get the first location for the org
    const { data: locations } = await supabase
      .from('locations')
      .select('id')
      .eq('org_id', invite.org_id)
      .order('created_at')
      .limit(1);

    const locationId = locations?.[0]?.id || null;

    // Create app_user linked to the invite's employee and org
    const { data: newAppUser, error: appUserError } = await supabase
      .from('app_users')
      .insert({
        auth_user_id: user.id,
        email: invite.email || user.email,
        first_name: invite.first_name,
        last_name: invite.last_name,
        full_name: `${invite.first_name || ''} ${invite.last_name || ''}`.trim(),
        role: invite.role || 'Team Member',
        org_id: invite.org_id,
        location_id: locationId,
        employee_id: invite.employee_id,
      })
      .select('id')
      .single();

    if (appUserError) {
      throw new Error(`Failed to create app_user: ${appUserError.message}`);
    }

    // If there's an employee_id, update the employee's email if missing
    if (invite.employee_id && invite.email) {
      await supabase
        .from('employees')
        .update({ email: invite.email })
        .eq('id', invite.employee_id)
        .is('email', null);
    }

    // Mark invite as accepted
    await supabase
      .from('onboarding_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);

    return res.status(200).json({
      success: true,
      appUserId: newAppUser.id,
    });
  } catch (err: any) {
    console.error('accept-invite error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
