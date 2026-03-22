/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session for payment method and invoice management.
 */

import { withAuth } from '@/lib/permissions/middleware';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = getStripe();
  const supabase = createServerSupabaseClient();

  const { org_id } = req.body;

  if (!org_id) {
    return res.status(400).json({ error: 'org_id is required' });
  }

  try {
    // Get org's Stripe customer ID
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .select('stripe_customer_id')
      .eq('id', org_id)
      .single();

    if (orgError || !org?.stripe_customer_id) {
      return res.status(404).json({ error: 'No billing account found for this organization' });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.headers.origin || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${baseUrl}/org-settings?tab=billing`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('Error creating portal session:', err);
    return res.status(500).json({ error: err.message || 'Failed to create portal session' });
  }
}

export default withAuth(handler);
