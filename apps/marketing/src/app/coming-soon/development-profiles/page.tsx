import type { Metadata } from 'next';
import { ComingSoonTemplate } from '@/components/templates/ComingSoonTemplate';

export const metadata: Metadata = {
  title: 'Development Profiles — Coming Soon',
  description: 'Understand the whole person — DISC personality insights combined with performance data.',
};

export default function DevelopmentProfilesPage() {
  return (
    <ComingSoonTemplate
      feature={{
        name: 'Development Profiles',
        tagline: 'Understand the whole person — not just their performance numbers.',
        description:
          'Development Profiles combine personality insights with Levelset performance data to give leaders a complete picture of every team member. Powered by DISC personality assessments, profiles reveal communication preferences, conflict styles, collaboration tendencies, and cultural fit — layered on top of ratings history, discipline record, and development plan progress.',
        highlights: [
          'DISC personality assessments integrated directly into Levelset',
          'Communication style, conflict approach, and collaboration preferences for every team member',
          'Combined with ratings, discipline, evaluations, and development plan data into one holistic profile',
          'Insights surface during 1-on-1s and coaching conversations to help leaders connect',
          'Cultural fit indicators to help with hiring and team composition decisions',
        ],
      }}
    />
  );
}
