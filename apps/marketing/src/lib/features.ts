export interface MarketingFeature {
  slug: string;
  name: string;
  shortDescription: string;
  icon: string;
  tier: 'core' | 'pro';
  screenshotReady: boolean;
}

export const FEATURES: MarketingFeature[] = [
  {
    slug: 'positional-ratings',
    name: 'Positional Ratings',
    shortDescription: 'Rate every team member by position with real data — not memory.',
    icon: 'rocket',
    tier: 'core',
    screenshotReady: true,
  },
  {
    slug: 'discipline',
    name: 'Discipline',
    shortDescription: 'Your discipline process, applied consistently by every leader.',
    icon: 'gavel',
    tier: 'core',
    screenshotReady: true,
  },
  {
    slug: 'roster',
    name: 'Roster',
    shortDescription: 'One roster for your entire team — pay, eligibility, and history.',
    icon: 'users',
    tier: 'core',
    screenshotReady: true,
  },
  {
    slug: 'evaluations',
    name: 'Evaluations',
    shortDescription: 'Formal evaluations connected to real performance data.',
    icon: 'calendar-text',
    tier: 'core',
    screenshotReady: true,
  },
  {
    slug: 'mobile-app',
    name: 'Mobile App',
    shortDescription: 'Your team data in your pocket — rate, search, manage.',
    icon: 'smartphone',
    tier: 'core',
    screenshotReady: false,
  },
  {
    slug: 'scheduling',
    name: 'Scheduling',
    shortDescription: 'Build schedules with position coverage visibility.',
    icon: 'calendar',
    tier: 'pro',
    screenshotReady: true,
  },
  {
    slug: 'setups',
    name: 'Setups',
    shortDescription: 'Consistent shift setup assignments, every time.',
    icon: 'tune',
    tier: 'pro',
    screenshotReady: true,
  },
  {
    slug: 'forms',
    name: 'Forms',
    shortDescription: 'Custom digital forms for your team — trackable and mobile.',
    icon: 'file-text',
    tier: 'pro',
    screenshotReady: false,
  },
  {
    slug: 'levi-ai',
    name: 'Levi AI',
    shortDescription: 'AI-powered insights about your team, on demand.',
    icon: 'sparkles',
    tier: 'pro',
    screenshotReady: false,
  },
  {
    slug: 'oe-pillars',
    name: 'OE Pillars',
    shortDescription: 'See your operational excellence score across all five CFA pillars.',
    icon: 'bar-chart',
    tier: 'pro',
    screenshotReady: false,
  },
  {
    slug: 'org-chart',
    name: 'Org Chart',
    shortDescription: 'See your team structure at a glance — who reports to whom.',
    icon: 'git-branch',
    tier: 'pro',
    screenshotReady: false,
  },
  {
    slug: 'documents',
    name: 'Documents',
    shortDescription: 'Your organization\'s knowledge hub — policies, guides, and resources.',
    icon: 'folder',
    tier: 'pro',
    screenshotReady: false,
  },
  {
    slug: 'pay',
    name: 'Pay System',
    shortDescription: 'Transparent, performance-linked pay that your team can see and trust.',
    icon: 'dollar-sign',
    tier: 'pro',
    screenshotReady: false,
  },
  {
    slug: 'goal-tracking',
    name: 'Goal Tracking',
    shortDescription: 'Set goals at every level — employee, team, location, org.',
    icon: 'target',
    tier: 'pro',
    screenshotReady: false,
  },
  {
    slug: 'development-plans',
    name: 'Development Plans',
    shortDescription: 'Build the roadmap for every team member\'s growth.',
    icon: 'map',
    tier: 'pro',
    screenshotReady: false,
  },
];

/** Get a feature by slug */
export function getFeature(slug: string): MarketingFeature | undefined {
  return FEATURES.find(f => f.slug === slug);
}
