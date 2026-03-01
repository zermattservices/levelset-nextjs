import type { Metadata } from 'next';
import { ComingSoonTemplate } from '@/components/templates/ComingSoonTemplate';

export const metadata: Metadata = {
  title: 'Pathway Tracking — Coming Soon',
  description: 'Define career pathways and track every team member\'s progression.',
};

export default function PathwayTrackingPage() {
  return (
    <ComingSoonTemplate
      feature={{
        name: 'Pathway Tracking',
        tagline: 'Every team member sees where they\'re going — and what it takes to get there.',
        description:
          'Pathway Tracking defines career progressions within your organization and tracks each team member\'s journey along them. From Team Member to Trainer, Trainer to Team Lead, Team Lead to Director — every transition has clear requirements, milestones, and timelines. Team members see their progress. Leaders see who\'s ready for more.',
        highlights: [
          'Define custom career pathways with clear advancement requirements',
          'Track individual progress along each pathway with milestones and timelines',
          'Connected to Development Plans — pathway steps become plan milestones',
          'Identify who\'s ready for promotion based on data, not gut feel',
          'Team members see their own progression — driving retention through visibility',
        ],
      }}
    />
  );
}
