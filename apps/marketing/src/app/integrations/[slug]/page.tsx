import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { INTEGRATIONS, getIntegration } from '@/lib/integrations';
import { getIntegrationContent } from '@/lib/integration-content';
import { FeaturePageCTA } from '@/components/templates/FeaturePageCTA';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return INTEGRATIONS.map((i) => ({ slug: i.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const integration = getIntegration(params.slug);
  if (!integration) return {};

  return {
    title: `${integration.name} Integration`,
    description: integration.shortDescription,
    openGraph: {
      title: `${integration.name} Integration — Levelset`,
      description: integration.shortDescription,
    },
  };
}

const STATUS_CONFIG = {
  live: {
    label: 'Live',
    color: 'text-emerald-300',
    dotColor: 'bg-emerald-400',
  },
  'coming-soon': {
    label: 'Coming Soon',
    color: 'text-amber-300',
    dotColor: 'bg-amber-400',
  },
} as const;

function getRelatedIntegrations(currentSlug: string) {
  return INTEGRATIONS.filter((i) => i.slug !== currentSlug).slice(0, 3);
}

export default function IntegrationDetailPage({ params }: Props) {
  const integration = getIntegration(params.slug);
  if (!integration) notFound();

  const content = getIntegrationContent(params.slug);
  if (!content) notFound();

  const status = STATUS_CONFIG[integration.status];
  const relatedIntegrations = getRelatedIntegrations(params.slug);

  return (
    <>
      <PageViewTracker
        event="ViewContent"
        params={{
          content_name: `integration_${params.slug}`,
          content_type: 'integration_page',
        }}
      />

      {/* ─── Dark Hero ──────────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
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
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#31664A]/10 blur-[100px]" />

        <div className="max-w-content mx-auto px-6 relative z-10">
          {/* Back + status */}
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/integrations"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors duration-200"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              All Integrations
            </Link>
            <span className="text-white/20">|</span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase ${status.color}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`}
              />
              {status.label}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <div>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <Image
                    src={`/integrations/${integration.slug}.svg`}
                    alt={integration.name}
                    width={32}
                    height={32}
                  />
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-heading font-bold text-white tracking-tight">
                    {integration.name}
                  </h1>
                  <p className="text-sm text-white/40 font-medium mt-0.5">
                    {integration.category}
                  </p>
                </div>
              </div>

              <p className="text-xl md:text-2xl text-white/70 leading-relaxed font-light max-w-lg">
                {content.tagline}
              </p>
            </div>

            {/* Right: Decorative illustration */}
            <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-10 md:p-14">
              <div
                className="absolute inset-0 rounded-2xl opacity-[0.04]"
                style={{
                  backgroundImage:
                    'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              <div className="relative flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mb-5">
                  <Image
                    src={`/integrations/${integration.slug}.svg`}
                    alt={integration.name}
                    width={44}
                    height={44}
                  />
                </div>
                {integration.status === 'coming-soon' ? (
                  <p className="text-white/50 text-sm font-medium max-w-xs">
                    This integration is in development and will be available
                    soon.
                  </p>
                ) : (
                  <p className="text-white/50 text-sm font-medium max-w-xs">
                    Available now for all Levelset customers.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Description ──────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <p className="text-lg md:text-xl text-neutral-700 leading-relaxed">
              {content.description}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Capabilities ─────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-neutral-50">
        <div className="max-w-content mx-auto px-6">
          <div className="mb-14">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-neutral-900 mb-3">
              {integration.status === 'coming-soon'
                ? 'Planned capabilities'
                : 'How it works'}
            </h2>
            <div className="w-12 h-1 rounded-full bg-[#31664A]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {content.capabilities.map((capability, index) => (
              <div
                key={capability.title}
                className="group relative bg-white rounded-xl p-7 md:p-8 border border-neutral-200/80 hover:border-[#31664A]/20 hover:shadow-lg hover:shadow-[#31664A]/5 transition-all duration-300"
              >
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0">
                    <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#31664A] text-white text-sm font-bold">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-heading font-bold text-neutral-900 mb-2">
                      {capability.title}
                    </h3>
                    <p className="text-neutral-500 leading-relaxed text-[15px]">
                      {capability.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Related Integrations ─────────────────────────────── */}
      <section className="py-16 md:py-20 bg-white border-t border-neutral-100">
        <div className="max-w-content mx-auto px-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-8">
            More integrations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedIntegrations.map((i) => (
              <Link
                key={i.slug}
                href={`/integrations/${i.slug}`}
                className="group flex items-center gap-4 bg-neutral-50 rounded-xl p-5 border border-neutral-200/80 hover:border-[#31664A]/20 hover:shadow-md transition-all duration-200"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white border border-neutral-200/60 flex items-center justify-center">
                  <Image
                    src={`/integrations/${i.slug}.svg`}
                    alt={i.name}
                    width={22}
                    height={22}
                  />
                </div>
                <div>
                  <span className="text-sm font-bold text-neutral-800 group-hover:text-[#31664A] transition-colors duration-200">
                    {i.name}
                  </span>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {i.status === 'live' ? 'Live' : 'Coming Soon'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA ───────────────────────────────────────── */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(165deg, #1a3d2d 0%, #1e3f2e 40%, #264D38 100%)',
          }}
        />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[#4a9e6e]/8 blur-3xl" />

        <div className="max-w-content mx-auto px-6 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
              {integration.status === 'coming-soon'
                ? 'Get started with Levelset today.'
                : `Start using the ${integration.name} integration.`}
            </h2>
            <p className="text-lg text-white/60 mb-10">
              Every trial includes full access to all features and integrations
              for 30 days.
            </p>
            <FeaturePageCTA />
          </div>
        </div>
      </section>
    </>
  );
}
