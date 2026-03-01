import type { Metadata } from 'next';
import Link from 'next/link';
import { TrialCTA } from '@/components/cta/TrialCTA';

export const metadata: Metadata = {
  title: 'Intelligence — Levelset',
  description:
    'AI-powered insights, retention analytics, and customer feedback — your data, working for you.',
};

const FEATURES = [
  {
    name: 'Levi AI',
    href: '/features/levi-ai',
    description: 'Ask questions about your team in plain English and get instant, data-backed answers.',
    status: 'beta',
  },
  {
    name: 'Retention Analytics',
    href: '/coming-soon/retention-analytics',
    description: 'Data-driven insights into who\'s staying, who\'s at risk, and why.',
    status: 'coming-soon',
  },
  {
    name: 'Customer Feedback',
    href: '/coming-soon/customer-feedback',
    description: 'Multi-channel feedback aggregated and connected to your operational data.',
    status: 'coming-soon',
  },
];

export default function IntelligencePage() {
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
              Your Data, Working for You
            </h1>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl mx-auto">
              Levelset doesn&apos;t just store your team data — it puts it to work. Levi AI gives
              instant insights. Retention analytics spot problems before they become turnover.
              Customer feedback connects guest experience to team performance.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 md:py-24">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-6">
              AI That Knows Your Team
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Levi isn&apos;t a generic chatbot. It knows your employees, their ratings, their
              discipline history, and your operational metrics. Ask a question and get a specific
              answer from your actual data — not generic advice.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
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
            Stop Managing Data. Start Using It.
          </h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Start your free 30-day Pro trial and meet Levi — your AI assistant that knows your team.
          </p>
          <TrialCTA />
        </div>
      </section>
    </>
  );
}
