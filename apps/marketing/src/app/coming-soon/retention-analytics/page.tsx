import type { Metadata } from 'next';
import { ComingSoonTemplate } from '@/components/templates/ComingSoonTemplate';

export const metadata: Metadata = {
  title: 'Retention Analytics — Coming Soon',
  description: 'Data-driven insights into who\'s staying, who\'s at risk, and why.',
};

export default function RetentionAnalyticsPage() {
  return (
    <ComingSoonTemplate
      feature={{
        name: 'Retention Analytics',
        tagline: 'Stop guessing who\'s about to leave. Start seeing the patterns before it\'s too late.',
        description:
          'Retention Analytics gives you a dashboard for understanding your team\'s tenure, turnover patterns, and at-risk indicators. See which roles, shifts, or leaders have the highest turnover. Identify team members whose ratings are declining — a leading indicator of disengagement. Make retention a strategy, not a reaction.',
        highlights: [
          'Tenure and turnover dashboards by role, shift, and location',
          'At-risk employee identification based on rating trends and engagement signals',
          'Historical retention patterns — see seasonality and identify root causes',
          'Connected to ratings, discipline, and development data for full-picture analysis',
          'Actionable insights: know who to coach, who to promote, and who needs attention',
        ],
      }}
    />
  );
}
