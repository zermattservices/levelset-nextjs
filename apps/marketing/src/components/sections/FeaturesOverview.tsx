import Link from 'next/link';
import { FEATURES, type FeatureStatus } from '@/lib/features';
import { Icon } from '@/components/ui/Icon';

const TIER_STYLES = {
  core: 'bg-[#31664A]/10 text-[#31664A]',
  pro: 'bg-purple-50 text-purple-700',
} as const;

function StatusBadge({ status }: { status: FeatureStatus }) {
  if (status === 'live') return null;
  const styles =
    status === 'beta'
      ? 'bg-amber-100/60 text-amber-700'
      : 'bg-neutral-100 text-neutral-500';
  const label = status === 'beta' ? 'Beta' : 'Coming Soon';
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${styles}`}>
      {label}
    </span>
  );
}

export function FeaturesOverview() {
  return (
    <section id="features" className="py-24 md:py-32 bg-white">
      <div className="max-w-content mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-text-primary mb-5">
            Your operations playbook, finally in one place.
          </h2>
          <p className="text-lg text-text-secondary leading-relaxed">
            Everything you need to manage your team — from positional ratings
            to discipline to scheduling — in one platform built for
            Chick-fil-A.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(feature => (
            <Link
              key={feature.slug}
              href={`/features/${feature.slug}`}
              className="group relative p-7 rounded-2xl bg-[#f6fffa] border border-[#31664A]/10 hover:border-[#31664A]/25 transition-all duration-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#31664A] flex items-center justify-center">
                  <Icon name={feature.icon} size={20} className="text-white" />
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={feature.status} />
                  <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${TIER_STYLES[feature.tier]}`}>
                    {feature.tier}
                  </span>
                </div>
              </div>

              <h3 className="text-[17px] font-heading font-bold text-text-primary mb-2 group-hover:text-[#31664A] transition-colors">
                {feature.name}
              </h3>

              <p className="text-text-secondary leading-relaxed text-[15px]">
                {feature.shortDescription}
              </p>

              <div className="mt-4 flex items-center text-[#31664A] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Learn more
                <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
