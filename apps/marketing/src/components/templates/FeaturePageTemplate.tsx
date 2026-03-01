import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { BrowserMockup } from '@/components/ui/BrowserMockup';
import type { MarketingFeature, FeatureStatus } from '@/lib/features';
import type { FeatureContent } from '@/lib/feature-content';
import { FEATURES } from '@/lib/features';
import { FeaturePageCTA } from './FeaturePageCTA';

function StatusBadge({ status, variant = 'default' }: { status: FeatureStatus; variant?: 'default' | 'hero' }) {
  if (status === 'live') return null;
  if (variant === 'hero') {
    const styles =
      status === 'beta'
        ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
        : 'bg-white/10 text-white/70 border-white/20';
    const label = status === 'beta' ? 'Beta' : 'Coming Soon';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${styles}`}>
        {label}
      </span>
    );
  }
  const styles =
    status === 'beta'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-neutral-100 text-neutral-500';
  const label = status === 'beta' ? 'Beta' : 'Coming Soon';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none ${styles}`}>
      {label}
    </span>
  );
}

/* ─── Tier config ────────────────────────────────────────────────── */

const TIER_CONFIG: Record<
  MarketingFeature['tier'],
  { label: string; color: string; border: string }
> = {
  core: { label: 'Included in every plan', color: 'text-emerald-300', border: 'border-emerald-400/30' },
  pro: { label: 'Pro plan', color: 'text-purple-300', border: 'border-purple-400/30' },
};

/* ─── Related features helper ────────────────────────────────────── */

function getRelatedFeatures(currentSlug: string) {
  return FEATURES.filter((f) => f.slug !== currentSlug).slice(0, 3);
}

/* ─── Props ──────────────────────────────────────────────────────── */

interface FeaturePageTemplateProps {
  feature: MarketingFeature;
  content: FeatureContent;
}

/* ─── Template ───────────────────────────────────────────────────── */

export function FeaturePageTemplate({ feature, content }: FeaturePageTemplateProps) {
  const tier = TIER_CONFIG[feature.tier];
  const relatedFeatures = getRelatedFeatures(feature.slug);

  return (
    <>
      {/* ─── 1. Dark Hero ──────────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
        {/* Dark gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(165deg, #1a3d2d 0%, #1e3f2e 30%, #264D38 60%, #1e3f2e 100%)',
          }}
        />
        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Accent glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#4a9e6e]/8 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#31664A]/10 blur-[100px]" />

        <div className="max-w-content mx-auto px-6 relative z-10">
          {/* Back + tier */}
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/#about"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              All Features
            </Link>
            <span className="text-white/20">|</span>
            <span className={`text-xs font-semibold tracking-wide uppercase ${tier.color}`}>
              {tier.label}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <div>
              {/* Icon + Name */}
              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <Icon name={feature.icon} size={24} className="text-white" />
                </div>
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl md:text-5xl font-heading font-bold text-white tracking-tight">
                    {feature.name}
                  </h1>
                  <StatusBadge status={feature.status} variant="hero" />
                </div>
              </div>

              {/* Tagline */}
              <p className="text-xl md:text-2xl text-white/70 leading-relaxed font-light max-w-lg">
                {content.tagline}
              </p>
            </div>

            {/* Right: Hero image or feature illustration */}
            <div>
              {content.heroImage ? (
                <div className="relative">
                  <div className="absolute -inset-4 bg-white/5 rounded-2xl blur-xl" />
                  <BrowserMockup>
                    <img
                      src={content.heroImage}
                      alt={`${feature.name} screenshot`}
                      className="w-full h-auto"
                      loading="eager"
                    />
                  </BrowserMockup>
                </div>
              ) : (
                <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-10 md:p-14">
                  {/* Decorative grid pattern */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-[0.04]"
                    style={{
                      backgroundImage:
                        'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />
                  <div className="relative flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-5">
                      <Icon name={feature.icon} size={32} className="text-white/80" />
                    </div>
                    <p className="text-white/50 text-sm font-medium max-w-xs">
                      {feature.name} is currently in development. Screenshots will be available soon.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. Problem → Solution ─────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            {/* Problem */}
            <div className="relative pl-8 md:pl-10 pb-12 md:pb-16 border-l-2 border-red-200">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-red-100 border-2 border-red-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3 block">
                The problem
              </span>
              <p className="text-lg md:text-xl text-neutral-700 leading-relaxed">
                {content.problem}
              </p>
            </div>

            {/* Solution */}
            <div className="relative pl-8 md:pl-10 border-l-2 border-[#31664A]/30">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#31664A]/10 border-2 border-[#31664A]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#31664A] mb-3 block">
                How Levelset solves it
              </span>
              <p className="text-lg md:text-xl text-neutral-700 leading-relaxed">
                {content.solution}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. Capabilities ───────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-neutral-50">
        <div className="max-w-content mx-auto px-6">
          <div className="mb-14">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-neutral-900 mb-3">
              How it works
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

      {/* ─── 4. Screenshots Gallery ────────────────────────────────── */}
      {content.screenshots.length > 0 && (
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-content mx-auto px-6">
            <div className="mb-14">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-neutral-900 mb-3">
                See it in action
              </h2>
              <div className="w-12 h-1 rounded-full bg-[#31664A]" />
            </div>

            <div className="space-y-10">
              {content.screenshots.map((screenshot) => (
                <div key={screenshot.src}>
                  <BrowserMockup>
                    <img
                      src={screenshot.src}
                      alt={screenshot.alt}
                      className="w-full h-auto"
                      loading="lazy"
                    />
                  </BrowserMockup>
                  {screenshot.caption && (
                    <p className="text-sm text-neutral-400 text-center mt-4 italic">
                      {screenshot.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── 5. Related Features ───────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-neutral-50 border-t border-neutral-100">
        <div className="max-w-content mx-auto px-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-8">
            Explore more features
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedFeatures.map((f) => (
              <Link
                key={f.slug}
                href={`/features/${f.slug}`}
                className="group flex items-center gap-4 bg-white rounded-xl p-5 border border-neutral-200/80 hover:border-[#31664A]/20 hover:shadow-md transition-all duration-200"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-neutral-100 group-hover:bg-[#31664A] flex items-center justify-center transition-colors duration-200">
                  <Icon
                    name={f.icon}
                    size={18}
                    className="text-neutral-400 group-hover:text-white transition-colors duration-200"
                  />
                </div>
                <div>
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-neutral-800 group-hover:text-[#31664A] transition-colors duration-200">
                      {f.name}
                    </span>
                    <StatusBadge status={f.status} />
                  </span>
                  <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                    {f.shortDescription}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. Bottom CTA ─────────────────────────────────────────── */}
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
              Ready to try {feature.name}?
            </h2>
            <p className="text-lg text-white/60 mb-10">
              Every trial includes full access to all features for 30 days.
            </p>
            <FeaturePageCTA />
          </div>
        </div>
      </section>
    </>
  );
}
