/**
 * Billing & Subscription Constants
 *
 * Re-exports shared billing types/data from @levelset/shared.
 * Stripe-specific functions remain here (they access process.env).
 */

// Re-export everything from the shared package
export {
  type FeatureDefinition,
  type FeatureGroup,
  FEATURE_GROUPS,
  type PlanTier,
  TIER_ORDER,
  type PlanTierConfig,
  PLAN_TIERS,
  AI_USAGE,
  TRIAL_DAYS,
  getFeaturesForTier,
  getAllFeatureKeys,
  formatPrice,
} from '@levelset/shared';

import { type PlanTier, TIER_ORDER } from '@levelset/shared';

// ---------------------------------------------------------------------------
// Stripe price ID mapping (dashboard-only, uses process.env)
// ---------------------------------------------------------------------------

export function getStripePriceId(tier: PlanTier, period: 'monthly' | 'annual'): string {
  const key = `STRIPE_PRICE_${tier.toUpperCase()}_${period.toUpperCase()}`;
  const priceId = process.env[key];
  if (!priceId) {
    throw new Error(`Missing env var: ${key}`);
  }
  return priceId;
}

export function getTierFromPriceId(priceId: string): { tier: PlanTier; period: 'monthly' | 'annual' } | null {
  for (const tier of TIER_ORDER) {
    for (const period of ['monthly', 'annual'] as const) {
      const key = `STRIPE_PRICE_${tier.toUpperCase()}_${period.toUpperCase()}`;
      if (process.env[key] === priceId) {
        return { tier, period };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Subscription status helpers
// ---------------------------------------------------------------------------

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

/** Returns true if the subscription grants feature access */
export function isActiveSubscription(status: SubscriptionStatus): boolean {
  return status === 'trialing' || status === 'active' || status === 'past_due';
}
