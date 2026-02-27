import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { INTEGRATIONS } from '@/lib/integrations';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';

export const metadata: Metadata = {
  title: 'Integrations',
  description:
    'Connect Levelset to the tools you already use — Google Maps, HotSchedules, Yelp, Slack, and more.',
  openGraph: {
    title: 'Integrations — Levelset',
    description:
      'Connect Levelset to the tools you already use — Google Maps, HotSchedules, Yelp, Slack, and more.',
  },
};

const STATUS_STYLES = {
  live: 'bg-[#31664A]/10 text-[#31664A]',
  'coming-soon': 'bg-neutral-100 text-neutral-500',
} as const;

const STATUS_LABELS = {
  live: 'Live',
  'coming-soon': 'Coming Soon',
} as const;

export default function IntegrationsPage() {
  const liveIntegrations = INTEGRATIONS.filter((i) => i.status === 'live');
  const comingSoonIntegrations = INTEGRATIONS.filter(
    (i) => i.status === 'coming-soon'
  );

  return (
    <>
      <PageViewTracker
        event="ViewContent"
        params={{
          content_name: 'integrations',
          content_type: 'integrations_page',
        }}
      />

      {/* Hero */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(165deg, #1a3d2d 0%, #1e3f2e 30%, #264D38 60%, #1e3f2e 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#4a9e6e]/8 blur-[120px]" />

        <div className="max-w-content mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-5 tracking-tight">
              Connects to the tools you already use.
            </h1>
            <p className="text-lg md:text-xl text-white/60 leading-relaxed">
              Levelset integrates with the platforms your restaurant depends on
              — syncing data automatically so your team spends less time on
              manual entry and more time leading.
            </p>
          </div>
        </div>
      </section>

      {/* Live Integrations */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-content mx-auto px-6">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#31664A]" />
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-text-primary">
                Live Integrations
              </h2>
            </div>
            <p className="text-text-secondary ml-[22px]">
              Available now for all Levelset customers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {liveIntegrations.map((integration) => (
              <Link
                key={integration.slug}
                href={`/integrations/${integration.slug}`}
                className="group relative p-7 rounded-2xl bg-[#f6fffa] border border-[#31664A]/10 hover:border-[#31664A]/25 transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200/80 flex items-center justify-center shadow-sm">
                    <Image
                      src={`/integrations/${integration.slug}.png`}
                      alt={integration.name}
                      width={28}
                      height={28}
                    />
                  </div>
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_STYLES[integration.status]}`}
                  >
                    {STATUS_LABELS[integration.status]}
                  </span>
                </div>

                <h3 className="text-[17px] font-heading font-bold text-text-primary mb-1.5 group-hover:text-[#31664A] transition-colors">
                  {integration.name}
                </h3>

                <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-2.5">
                  {integration.category}
                </p>

                <p className="text-text-secondary leading-relaxed text-[15px]">
                  {integration.shortDescription}
                </p>

                <div className="mt-4 flex items-center text-[#31664A] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Learn more
                  <svg
                    className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="py-20 md:py-28 bg-neutral-50">
        <div className="max-w-content mx-auto px-6">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-text-primary">
                Coming Soon
              </h2>
            </div>
            <p className="text-text-secondary ml-[22px]">
              Integrations we&apos;re actively building.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {comingSoonIntegrations.map((integration) => (
              <Link
                key={integration.slug}
                href={`/integrations/${integration.slug}`}
                className="group relative p-7 rounded-2xl bg-white border border-neutral-200/80 hover:border-neutral-300 transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-center">
                    <Image
                      src={`/integrations/${integration.slug}.png`}
                      alt={integration.name}
                      width={28}
                      height={28}
                    />
                  </div>
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_STYLES[integration.status]}`}
                  >
                    {STATUS_LABELS[integration.status]}
                  </span>
                </div>

                <h3 className="text-[17px] font-heading font-bold text-text-primary mb-1.5 group-hover:text-neutral-600 transition-colors">
                  {integration.name}
                </h3>

                <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-2.5">
                  {integration.category}
                </p>

                <p className="text-text-secondary leading-relaxed text-[15px]">
                  {integration.shortDescription}
                </p>

                <div className="mt-4 flex items-center text-neutral-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Learn more
                  <svg
                    className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
