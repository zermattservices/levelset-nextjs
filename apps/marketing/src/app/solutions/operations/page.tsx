import type { Metadata } from 'next';
import Link from 'next/link';
import { TrialCTA } from '@/components/cta/TrialCTA';

export const metadata: Metadata = {
  title: 'Operations — Levelset',
  description:
    'Scheduling, forms, setups, documents, and OE — your daily operations, connected and consistent.',
};

const FEATURES = [
  {
    name: 'Scheduling',
    href: '/features/scheduling',
    description: 'Build schedules knowing exactly who can work which positions.',
    status: 'live',
  },
  {
    name: 'Setups',
    href: '/features/setups',
    description: 'Consistent shift setup assignments, regardless of who\'s leading.',
    status: 'live',
  },
  {
    name: 'Forms',
    href: '/features/forms',
    description: 'Custom digital forms your team fills out on their phone.',
    status: 'live',
  },
  {
    name: 'Documents',
    href: '/features/documents',
    description: 'Your organization\'s knowledge hub — policies, guides, and SOPs.',
    status: 'live',
  },
  {
    name: 'OE Pillars',
    href: '/features/oe-pillars',
    description: 'Operational excellence scores across all five CFA pillars.',
    status: 'live',
  },
];

export default function OperationsPage() {
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
              Run Your Operation with Consistency
            </h1>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl mx-auto">
              Scheduling, shift setups, daily forms, documents, and operational excellence — all
              connected. Your best practices are baked into the system, not stuck in someone&apos;s
              head.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 md:py-24">
        <div className="max-w-content mx-auto px-6">
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
            Consistency Across Every Shift, Every Day
          </h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Start your free 30-day Pro trial and see how connected operations work.
          </p>
          <TrialCTA />
        </div>
      </section>
    </>
  );
}
