/**
 * POST /api/billing/cancel
 *
 * Cancels a subscription at the end of the current billing period.
 * Sets cancel_at_period_end = true on the Stripe subscription.
 */

import { withAuth } from '@/lib/permissions/middleware';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();
  const stripe = getStripe();

  const { org_id } = req.body;

  if (!org_id) {
    return res.status(400).json({ error: 'org_id is required' });
  }

  try {
    // Look up subscription for this org
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('org_id', org_id)
      .single();

    if (subError || !subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    if (!subscription.stripe_subscription_id) {
      return res.status(400).json({ error: 'No Stripe subscription linked' });
    }

    // Cancel at period end (not immediate — user retains access until end of cycle)
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update local record
    await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', org_id);

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error canceling subscription:', err);
    return res.status(500).json({ error: err.message || 'Failed to cancel subscription' });
  }
}

export default withAuth(handler);
