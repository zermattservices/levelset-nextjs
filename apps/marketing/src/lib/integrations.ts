export interface Integration {
  slug: string;
  name: string;
  shortDescription: string;
  category: string;
  status: 'live' | 'coming-soon';
  externalUrl: string;
}

export const INTEGRATIONS: Integration[] = [
  {
    slug: 'google-maps',
    name: 'Google Maps',
    shortDescription:
      'Sync your listing, business hours, ratings, and every review — with weekly auto-sync.',
    category: 'Reviews & Location Intelligence',
    status: 'live',
    externalUrl: 'https://maps.google.com',
  },
  {
    slug: 'hotschedules',
    name: 'HotSchedules',
    shortDescription:
      'Import employees, schedules, pay rates, forecasts, and availability in minutes.',
    category: 'Scheduling & Workforce',
    status: 'live',
    externalUrl: 'https://www.hotschedules.com',
  },
  {
    slug: 'yelp',
    name: 'Yelp',
    shortDescription:
      'Automatically discover and sync your Yelp reviews alongside Google for complete guest feedback.',
    category: 'Reviews & Location Intelligence',
    status: 'live',
    externalUrl: 'https://www.yelp.com',
  },
  {
    slug: 'slack',
    name: 'Slack',
    shortDescription:
      'Get real-time notifications for ratings, discipline actions, and schedule changes in your team channels.',
    category: 'Communication & Alerts',
    status: 'coming-soon',
    externalUrl: 'https://slack.com',
  },
  {
    slug: 'crystal',
    name: 'Crystal',
    shortDescription:
      'DISC personality intelligence for personalized coaching, team composition, and leadership development.',
    category: 'Team Intelligence',
    status: 'coming-soon',
    externalUrl: 'https://www.crystalknows.com',
  },
];

export function getIntegration(slug: string): Integration | undefined {
  return INTEGRATIONS.find((i) => i.slug === slug);
}
