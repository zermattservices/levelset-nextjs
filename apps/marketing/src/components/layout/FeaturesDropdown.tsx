'use client';

import Link from 'next/link';
import { FEATURES, type MarketingFeature, type FeatureStatus } from '@/lib/features';
import { Icon } from '@/components/ui/Icon';

function StatusBadge({ status }: { status: FeatureStatus }) {
  if (status === 'live') return null;
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

/* ─── Tier grouping ──────────────────────────────────────────────── */

const TIER_GROUPS: {
  tier: MarketingFeature['tier'];
  label: string;
  description: string;
  accent: string;
  dotColor: string;
}[] = [
  {
    tier: 'core',
    label: 'Core',
    description: 'Every plan',
    accent: 'text-[#31664A]',
    dotColor: 'bg-[#31664A]',
  },
  {
    tier: 'pro',
    label: 'Pro',
    description: 'Pro plan',
    accent: 'text-purple-600',
    dotColor: 'bg-purple-500',
  },
];

function getFeaturesByTier(tier: MarketingFeature['tier']) {
  return FEATURES.filter((f) => f.tier === tier);
}

/* ─── Desktop dropdown panel ─────────────────────────────────────── */

interface FeaturesDropdownProps {
  open: boolean;
  onClose: () => void;
  scrolled: boolean;
}

export function FeaturesDropdown({ open, onClose }: FeaturesDropdownProps) {
  return (
    <div
      className={`absolute top-full left-1/2 -translate-x-1/2 w-[640px] pt-[22px] transition-all duration-200 ease-out ${
        open
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
      role="menu"
      aria-hidden={!open}
    >
      <div className="bg-white rounded-xl shadow-2xl shadow-black/10 border border-neutral-200 overflow-hidden">
        {/* Tier columns */}
        <div className="grid grid-cols-2 divide-x divide-neutral-100">
          {TIER_GROUPS.map(({ tier, label, description, accent, dotColor }) => {
            const features = getFeaturesByTier(tier);
            return (
              <div key={tier} className="py-4 px-1">
                {/* Tier header */}
                <div className="px-3 pb-3 mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span className={`text-sm font-bold ${accent}`}>
                      {label}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 pl-4">
                    {description}
                  </p>
                </div>

                {/* Feature links */}
                <div className="space-y-0.5">
                  {features.map((feature) => (
                    <Link
                      key={feature.slug}
                      href={`/features/${feature.slug}`}
                      onClick={onClose}
                      className="group flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors duration-150"
                    >
                      <div className="flex-shrink-0 w-7 h-7 rounded-md bg-neutral-100 group-hover:bg-[#31664A] flex items-center justify-center transition-colors duration-150">
                        <Icon
                          name={feature.icon}
                          size={14}
                          className="text-neutral-500 group-hover:text-white transition-colors duration-150"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-neutral-800 group-hover:text-[#31664A] transition-colors duration-150">
                          {feature.name}
                        </span>
                        <StatusBadge status={feature.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 border-t border-neutral-100 px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-neutral-400">
            All features included in 30-day free trial
          </span>
          <Link
            href="/pricing"
            onClick={onClose}
            className="text-xs font-semibold text-[#31664A] hover:text-[#264D38] transition-colors"
          >
            Compare plans &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Mobile menu items (grouped by tier) ────────────────────────── */

interface FeaturesMenuItemsProps {
  onItemClick: () => void;
}

export function FeaturesMenuItems({ onItemClick }: FeaturesMenuItemsProps) {
  return (
    <div className="flex flex-col gap-3 py-1">
      {TIER_GROUPS.map(({ tier, label, dotColor }) => {
        const features = getFeaturesByTier(tier);
        return (
          <div key={tier}>
            {/* Tier label */}
            <div className="flex items-center gap-2 px-3 pb-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                {label}
              </span>
            </div>

            {/* Feature links */}
            {features.map((feature) => (
              <Link
                key={feature.slug}
                href={`/features/${feature.slug}`}
                onClick={onItemClick}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition-colors duration-150"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-md bg-neutral-100 flex items-center justify-center">
                  <Icon name={feature.icon} size={15} className="text-neutral-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-neutral-800">
                      {feature.name}
                    </span>
                    <StatusBadge status={feature.status} />
                  </div>
                  <p className="text-xs text-neutral-400 leading-snug mt-0.5 line-clamp-1">
                    {feature.shortDescription}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}
