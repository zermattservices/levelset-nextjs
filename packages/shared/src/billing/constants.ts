/**
 * Billing & Subscription Constants (Shared)
 *
 * Central source of truth for plan tiers, pricing, and feature mappings.
 * Used by: marketing site, dashboard billing, webhook handler, feature sync.
 *
 * NOTE: Stripe-specific functions (getStripePriceId, getTierFromPriceId, etc.)
 * remain in apps/dashboard/lib/billing/constants.ts since they access process.env.
 */

// ---------------------------------------------------------------------------
// Feature definitions
// ---------------------------------------------------------------------------

export type FeatureStatus = 'live' | 'beta' | 'coming-soon';

export interface FeatureDefinition {
  key: string;
  label: string;
  description: string;
  /** Feature availability status. Defaults to 'live' if omitted. */
  status?: FeatureStatus;
}

export interface FeatureGroup {
  name: string;
  tier: 'core' | 'pro';
  features: FeatureDefinition[];
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    name: 'Core Features',
    tier: 'core',
    features: [
      { key: 'dashboard_access', label: 'Dashboard Access', description: 'Access to the main dashboard' },
      { key: 'positional_excellence', label: 'Positional Ratings', description: 'Position-based ratings and analytics' },
      { key: 'discipline_dashboard', label: 'Discipline', description: 'Progressive discipline tracking and management' },
      { key: 'roster_management', label: 'Roster', description: 'Employee roster management and sync' },
      { key: 'evaluations', label: 'Evaluations', description: 'Formal evaluations connected to performance data', status: 'coming-soon' },
      { key: 'mobile_app_access', label: 'Mobile App', description: 'Access to Levelset mobile app', status: 'coming-soon' },
      { key: 'organization_settings', label: 'Organization Settings', description: 'Configure organization settings' },
      { key: 'setups', label: 'Setups', description: 'Consistent shift setup assignments' },
    ],
  },
  {
    name: 'Pro Features',
    tier: 'pro',
    features: [
      { key: 'scheduling', label: 'Scheduling', description: 'Shift scheduling and management' },
      { key: 'form_management', label: 'Forms', description: 'Custom digital forms — trackable and mobile' },
      { key: 'operational_excellence', label: 'OE Pillars', description: 'Operational Excellence pillar analytics and scoring' },
      { key: 'org_chart', label: 'Org Chart', description: 'Team structure visualization' },
      { key: 'documents', label: 'Documents', description: 'Organization document hub' },
      { key: 'roster_suggested_pay', label: 'Pay System', description: 'Performance-linked pay recommendations' },
      { key: 'certifications', label: 'Certifications', description: 'Employee certification tracking' },
      { key: 'multi_unit', label: 'Multi-Unit', description: 'Manage multiple locations' },
      { key: 'levi_ai', label: 'Levi AI', description: 'AI-powered assistant', status: 'beta' },
      { key: 'goal_tracking', label: 'Goal Tracking', description: 'Goals at every level — employee, team, location, org', status: 'coming-soon' },
      { key: 'development_plans', label: 'Development Plans', description: 'Roadmap for every team member\'s growth', status: 'coming-soon' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Plan tier definitions
// ---------------------------------------------------------------------------

export type PlanTier = 'core' | 'pro';

export const TIER_ORDER: PlanTier[] = ['core', 'pro'];

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
    monthlyPriceCents: 24900,
    annualPriceCents: 22400,
    description: 'Full platform with AI-powered intelligence',
    features: [...FEATURE_GROUPS[0].features, ...FEATURE_GROUPS[1].features],
    recommended: true,
  },
};

// ---------------------------------------------------------------------------
// AI usage limits (Pro tier)
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
// Feature flag helpers
// ---------------------------------------------------------------------------

/**
 * Returns all feature keys that should be enabled for a given tier (cumulative).
 * Core → core features only
 * Pro → core + pro features (includes Levi AI)
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

/** Format price in cents to display string */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
