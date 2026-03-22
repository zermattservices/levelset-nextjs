/**
 * POST /api/admin/billing
 *
 * Admin-only billing management endpoints.
 * Requires Levelset Admin role.
 *
 * Intents:
 *   - create-subscription: Create a Stripe customer and subscription for an org
 *   - update-custom-pricing: Toggle custom pricing mode for an org
 *   - sync-features: Manually re-sync feature flags from subscription tier
 *   - cancel-subscription: Cancel an org's subscription
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getStripePriceId, PlanTier, TIER_ORDER, TRIAL_DAYS } from '@/lib/billing/constants';
import { syncFeaturesFromTier, clearFeatures } from '@/lib/billing/sync-features';
import { withAdminAuth } from '@/lib/permissions/middleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();
  const { intent } = req.body;

  switch (intent) {
    case 'create-subscription':
      return handleCreateSubscription(req, res, supabase);
    case 'update-custom-pricing':
      return handleUpdateCustomPricing(req, res, supabase);
    case 'sync-features':
      return handleSyncFeatures(req, res, supabase);
    case 'cancel-subscription':
      return handleCancelSubscription(req, res, supabase);
    default:
      return res.status(400).json({ error: `Unknown intent: ${intent}` });
  }
}

async function handleCreateSubscription(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: ReturnType<typeof createServerSupabaseClient>
) {
  const stripe = getStripe();
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
      .select('id, name, stripe_customer_id, operator_name')
      .eq('id', org_id)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check for existing subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('org_id', org_id)
      .single();

    if (existingSub && existingSub.status !== 'canceled') {
      return res.status(400).json({ error: 'Organization already has an active subscription' });
    }

    // Create or reuse Stripe customer
    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.operator_name || org.name,
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

    // Create subscription with trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      trial_period_days: TRIAL_DAYS,
      metadata: { org_id, plan_tier },
    });

    // The webhook will handle DB sync and feature flag updates
    return res.status(200).json({
      success: true,
      subscription_id: subscription.id,
      status: subscription.status,
    });
  } catch (err: any) {
    console.error('Error creating subscription:', err);
    return res.status(500).json({ error: err.message || 'Failed to create subscription' });
  }
}

async function handleUpdateCustomPricing(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: ReturnType<typeof createServerSupabaseClient>
) {
  const { org_id, custom_pricing, custom_price_cents } = req.body;

  if (!org_id || typeof custom_pricing !== 'boolean') {
    return res.status(400).json({ error: 'org_id and custom_pricing (boolean) are required' });
  }

  try {
    const updateData: Record<string, any> = { custom_pricing };
    if (custom_price_cents !== undefined) {
      updateData.custom_price_cents = custom_price_cents;
    }

    const { error } = await supabase
      .from('orgs')
      .update(updateData)
      .eq('id', org_id);

    if (error) {
      return res.status(500).json({ error: 'Failed to update custom pricing' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error updating custom pricing:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleSyncFeatures(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: ReturnType<typeof createServerSupabaseClient>
) {
  const { org_id } = req.body;

  if (!org_id) {
    return res.status(400).json({ error: 'org_id is required' });
  }

  try {
    // Get current subscription tier
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_tier')
      .eq('org_id', org_id)
      .single();

    if (!subscription?.plan_tier) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    const result = await syncFeaturesFromTier(supabase, org_id, subscription.plan_tier as PlanTier);

    if (result.synced) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ error: result.error });
    }
  } catch (err) {
    console.error('Error syncing features:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleCancelSubscription(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: ReturnType<typeof createServerSupabaseClient>
) {
  const stripe = getStripe();
  const { org_id, cancel_immediately = false } = req.body;

  if (!org_id) {
    return res.status(400).json({ error: 'org_id is required' });
  }

  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('org_id', org_id)
      .single();

    if (!subscription?.stripe_subscription_id) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    if (cancel_immediately) {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
    } else {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    // The webhook will handle DB sync and feature flag updates
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error canceling subscription:', err);
    return res.status(500).json({ error: err.message || 'Failed to cancel subscription' });
  }
}

export default withAdminAuth(handler);
