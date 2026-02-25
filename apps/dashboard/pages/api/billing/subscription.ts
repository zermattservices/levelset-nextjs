/**
 * GET /api/billing/subscription
 *
 * Returns the current subscription details for the authenticated user's org.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { PLAN_TIERS, PlanTier } from '@/lib/billing/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();

  const { org_id } = req.query;
  if (!org_id || typeof org_id !== 'string') {
    return res.status(400).json({ error: 'org_id is required' });
  }

  try {
    // Fetch subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('org_id', org_id)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      // PGRST116 = no rows found (no subscription yet)
      console.error('Error fetching subscription:', subError);
      return res.status(500).json({ error: 'Failed to fetch subscription' });
    }

    // Fetch org details for custom pricing info
    const { data: org } = await supabase
      .from('orgs')
      .select('subscription_plan, custom_pricing, custom_price_cents')
      .eq('id', org_id)
      .single();

    // Fetch location count for billing calculation
    const { count: locationCount } = await supabase
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org_id);

    // Build response
    const planTier = (subscription?.plan_tier || org?.subscription_plan || null) as PlanTier | null;
    const tierConfig = planTier ? PLAN_TIERS[planTier] : null;

    return res.status(200).json({
      subscription: subscription || null,
      plan: tierConfig
        ? {
            tier: planTier,
            name: tierConfig.name,
            monthlyPriceCents: org?.custom_pricing && org.custom_price_cents
              ? org.custom_price_cents
              : tierConfig.monthlyPriceCents,
            features: tierConfig.features,
          }
        : null,
      locationCount: locationCount || 0,
      customPricing: org?.custom_pricing || false,
    });
  } catch (err) {
    console.error('Error in billing/subscription:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
