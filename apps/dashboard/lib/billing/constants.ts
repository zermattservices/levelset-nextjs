/**
 * Billing & Subscription Constants
 *
 * Central source of truth for plan tiers, pricing, and feature mappings.
 * Used by: webhook handler, feature sync, admin UI, billing dashboard.
 */

// ---------------------------------------------------------------------------
// Feature definitions (moved from OrgFeaturesTab.tsx for shared use)
// ---------------------------------------------------------------------------

export interface FeatureDefinition {
  key: string;
  label: string;
  description: string;
}

export interface FeatureGroup {
  name: string;
  tier: 'core' | 'pro' | 'ultimate';
  features: FeatureDefinition[];
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    name: 'Core Features',
    tier: 'core',
    features: [
      { key: 'dashboard_access', label: 'Dashboard Access', description: 'Access to the main dashboard' },
      { key: 'positional_excellence', label: 'Positional Excellence Dashboard', description: 'PE ratings and analytics' },
      { key: 'positional_excellence_classic', label: 'Positional Excellence Classic', description: 'Classic PE interface' },
      { key: 'discipline_dashboard', label: 'Discipline Dashboard', description: 'Discipline tracking and management' },
      { key: 'roster_management', label: 'Roster Management', description: 'Employee roster management' },
      { key: 'roster_sync', label: 'Roster Sync', description: 'HotSchedules roster synchronization' },
      { key: 'mobile_app_access', label: 'Mobile App Access', description: 'Access to Levelset mobile app' },
      { key: 'organization_settings', label: 'Organization Settings', description: 'Configure organization settings' },
    ],
  },
  {
    name: 'Pro Features',
    tier: 'pro',
    features: [
      { key: 'certifications', label: 'Certifications', description: 'Employee certification tracking' },
      { key: 'roster_suggested_pay', label: 'Roster Suggested Pay', description: 'Automated pay recommendations' },
      { key: 'multi_unit', label: 'Multi-Unit Functionality', description: 'Manage multiple locations' },
      { key: 'operational_excellence', label: 'Operational Excellence', description: 'OE pillar analytics and scoring' },
      { key: 'scheduling', label: 'Scheduling', description: 'Shift scheduling and management' },
      { key: 'form_management', label: 'Form Management', description: 'Create and manage custom forms' },
      { key: 'documents', label: 'Documents', description: 'Organization document hub' },
    ],
  },
  {
    name: 'Ultimate Features',
    tier: 'ultimate',
    features: [
      { key: 'levi_ai', label: 'Levi AI', description: 'AI-powered assistant' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Plan tier definitions
// ---------------------------------------------------------------------------

export type PlanTier = 'core' | 'pro' | 'ultimate';

export const TIER_ORDER: PlanTier[] = ['core', 'pro', 'ultimate'];

export interface PlanTierConfig {
  name: string;
  tier: PlanTier;
  monthlyPriceCents: number;
  annualPriceCents: number;
  description: string;
  features: FeatureDefinition[];
  recommended?: boolean;
}

export const PLAN_TIERS: Record<PlanTier, PlanTierConfig> = {
  core: {
    name: 'Core',
    tier: 'core',
    monthlyPriceCents: 9900,
    annualPriceCents: 8900,
    description: 'Essential tools for team management',
    features: FEATURE_GROUPS[0].features,
  },
  pro: {
    name: 'Pro',
    tier: 'pro',
    monthlyPriceCents: 17900,
    annualPriceCents: 16100,
    description: 'Advanced operations and efficiency tools',
    features: [...FEATURE_GROUPS[0].features, ...FEATURE_GROUPS[1].features],
    recommended: true,
  },
  ultimate: {
    name: 'Ultimate',
    tier: 'ultimate',
    monthlyPriceCents: 24900,
    annualPriceCents: 22400,
    description: 'Full platform with AI-powered intelligence',
    features: [...FEATURE_GROUPS[0].features, ...FEATURE_GROUPS[1].features, ...FEATURE_GROUPS[2].features],
  },
};

// ---------------------------------------------------------------------------
// AI usage limits (Ultimate tier)
// ---------------------------------------------------------------------------

export const AI_USAGE = {
  /** Included queries per location per month */
  INCLUDED_QUERIES_PER_LOCATION: 500,
  /** Overage price per query in cents */
  OVERAGE_PRICE_CENTS: 5,
} as const;

// ---------------------------------------------------------------------------
// Trial configuration
// ---------------------------------------------------------------------------

export const TRIAL_DAYS = 30;

// ---------------------------------------------------------------------------
// Stripe price ID mapping
// Populated after running scripts/setup-stripe-products.ts
// These are stored as env vars: STRIPE_PRICE_CORE_MONTHLY, etc.
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
// Feature flag helpers
// ---------------------------------------------------------------------------

/**
 * Returns all feature keys that should be enabled for a given tier (cumulative).
 * Core → core features only
 * Pro → core + pro features
 * Ultimate → core + pro + ultimate features
 */
export function getFeaturesForTier(tier: PlanTier): string[] {
  const tierIndex = TIER_ORDER.indexOf(tier);
  if (tierIndex === -1) return [];

  const features: string[] = [];
  for (const group of FEATURE_GROUPS) {
    const groupTierIndex = TIER_ORDER.indexOf(group.tier);
    if (groupTierIndex <= tierIndex) {
      features.push(...group.features.map(f => f.key));
    }
  }
  return features;
}

/**
 * Returns all feature keys across all tiers.
 */
export function getAllFeatureKeys(): string[] {
  return FEATURE_GROUPS.flatMap(g => g.features.map(f => f.key));
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

/** Format price in cents to display string */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
