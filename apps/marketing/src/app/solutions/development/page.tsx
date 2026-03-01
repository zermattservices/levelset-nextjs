import type { Metadata } from 'next';
import Link from 'next/link';
import { TrialCTA } from '@/components/cta/TrialCTA';

export const metadata: Metadata = {
  title: 'Team Development — Levelset',
  description:
    'From first-day ratings to career advancement — every step of team development, connected.',
};

const FEATURES = [
  {
    name: 'Positional Ratings',
    href: '/features/positional-ratings',
    description: 'Rate every team member by position with objective, leader-aggregated data.',
    status: 'live',
  },
  {
    name: 'Evaluations',
    href: '/features/evaluations',
    description: 'Formal reviews backed by real performance data — not three months of memory.',
    status: 'coming-soon',
  },
  {
    name: 'Development Plans',
    href: '/features/development-plans',
    description: 'Custom roadmaps with milestones and checkpoints for every team member.',
    status: 'coming-soon',
  },
  {
    name: 'Goal Tracking',
    href: '/features/goal-tracking',
    description: 'Goals at every level — individual, team, location, and org — tied to real data.',
    status: 'coming-soon',
  },
  {
    name: 'Pathway Tracking',
    href: '/coming-soon/pathway-tracking',
    description: 'Career progression visibility from Team Member to Director.',
    status: 'coming-soon',
  },
  {
    name: 'Development Profiles',
    href: '/coming-soon/development-profiles',
    description: 'DISC personality insights combined with performance data.',
    status: 'coming-soon',
  },
];

export default function DevelopmentPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#264D38] pt-32 pb-16 md:pt-44 md:pb-24">
        <div
          className="absolute inset-0 -z-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, #31664A 0%, #1a3d2d 50%, #162e23 100%)',
          }}
        />
        <div className="max-w-content mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 leading-[1.08] tracking-tight">
              Develop People, Not Paperwork
            </h1>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl mx-auto">
              From first-day ratings to career advancement, Levelset connects every step of team
              development. Ratings feed evaluations. Evaluations drive development plans. Plans set
              goals. Goals track progress. Nothing gets lost.
            </p>
          </div>
        </div>
      </section>

      {/* The Connected Story */}
      <section className="py-16 md:py-24">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-6">
              Development That Actually Connects
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Most operators track ratings in one place, do evaluations in another, and have
              development conversations that never get documented. Levelset connects the entire
              development journey so nothing falls through the cracks.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature) => (
              <Link
                key={feature.name}
                href={feature.href}
                className="group block p-6 rounded-xl border border-gray-200 hover:border-[#264D38]/30 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#264D38] transition-colors">
                    {feature.name}
                  </h3>
                  {feature.status === 'beta' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                      Beta
                    </span>
                  )}
                  {feature.status === 'coming-soon' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 font-medium">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-content mx-auto px-6 text-center">
          <h2 className="text-2xl font-heading font-bold text-gray-900 mb-4">
            Give Every Team Member a Clear Path Forward
          </h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Start your free 30-day Pro trial and see how connected development changes the
            conversation.
          </p>
          <TrialCTA />
        </div>
      </section>
    </>
  );
}
