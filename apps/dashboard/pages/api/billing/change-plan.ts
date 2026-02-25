/**
 * POST /api/billing/change-plan
 *
 * Upgrades or downgrades the subscription plan.
 * Stripe handles proration automatically.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getStripePriceId, PlanTier, TIER_ORDER } from '@/lib/billing/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = getStripe();
  const supabase = createServerSupabaseClient();

  const { org_id, plan_tier, billing_period = 'monthly' } = req.body;

  if (!org_id || !plan_tier) {
    return res.status(400).json({ error: 'org_id and plan_tier are required' });
  }

  if (!TIER_ORDER.includes(plan_tier)) {
    return res.status(400).json({ error: 'Invalid plan_tier' });
  }

  try {
    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, plan_tier')
      .eq('org_id', org_id)
      .single();

    if (subError || !subscription?.stripe_subscription_id) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    if (subscription.plan_tier === plan_tier) {
      return res.status(400).json({ error: 'Already on this plan' });
    }

    // Get the Stripe subscription to find the current item
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );

    const currentItem = stripeSubscription.items.data[0];
    if (!currentItem) {
      return res.status(500).json({ error: 'No subscription items found' });
    }

    // Get new price ID
    const newPriceId = getStripePriceId(plan_tier as PlanTier, billing_period);

    // Update the subscription (Stripe handles proration)
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [
        {
          id: currentItem.id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
      metadata: { plan_tier },
    });

    // The webhook will handle syncing the subscription and feature flags
    return res.status(200).json({ success: true, message: `Plan changed to ${plan_tier}` });
  } catch (err: any) {
    console.error('Error changing plan:', err);
    return res.status(500).json({ error: err.message || 'Failed to change plan' });
  }
}
