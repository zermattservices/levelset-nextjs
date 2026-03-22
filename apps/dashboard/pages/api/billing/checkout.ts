/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout Session for new subscription setup.
 * Used by admin when onboarding a new org.
 */

import { withAuth } from '@/lib/permissions/middleware';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getStripePriceId, TRIAL_DAYS, PlanTier, TIER_ORDER } from '@/lib/billing/constants';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = getStripe();
  const supabase = createServerSupabaseClient();

  const { org_id, plan_tier, billing_period = 'monthly', quantity = 1 } = req.body;

  if (!org_id || !plan_tier) {
    return res.status(400).json({ error: 'org_id and plan_tier are required' });
  }

  if (!TIER_ORDER.includes(plan_tier)) {
    return res.status(400).json({ error: 'Invalid plan_tier' });
  }

  try {
    // Get org details
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .select('id, name, stripe_customer_id')
      .eq('id', org_id)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Create or reuse Stripe customer
    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { org_id: org.id },
      });
      customerId = customer.id;

      await supabase
        .from('orgs')
        .update({ stripe_customer_id: customerId })
        .eq('id', org_id);
    }

    // Get the price ID
    const priceId = getStripePriceId(plan_tier as PlanTier, billing_period);

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.headers.origin || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { org_id, plan_tier },
      },
      metadata: { org_id, plan_tier },
      success_url: `${baseUrl}/org-settings?tab=billing&checkout=success`,
      cancel_url: `${baseUrl}/org-settings?tab=billing&checkout=canceled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('Error creating checkout session:', err);
    return res.status(500).json({ error: err.message || 'Failed to create checkout session' });
  }
}

export default withAuth(handler);
