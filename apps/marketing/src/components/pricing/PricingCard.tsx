'use client';

import {
  PLAN_TIERS,
  FEATURE_GROUPS,
  TRIAL_DAYS,
  formatPrice,
  type PlanTier,
} from '@levelset/shared';
import { Icon } from '@/components/ui/Icon';

interface PricingCardProps {
  tier: PlanTier;
  period: 'monthly' | 'annual';
  onSelect: (tier: PlanTier) => void;
  compact?: boolean;
}

export function PricingCard({ tier, period, onSelect, compact = false }: PricingCardProps) {
  const plan = PLAN_TIERS[tier];
  const isRecommended = plan.recommended === true;
  const price = period === 'annual' ? plan.annualPriceCents : plan.monthlyPriceCents;
  const monthlyPrice = plan.monthlyPriceCents;
  const showDiscount = period === 'annual' && plan.annualPriceCents < plan.monthlyPriceCents;

  // Determine which features to show and the prefix text
  const featureDisplay = getFeatureDisplay(tier);

  return (
    <div
      className={`
        relative flex flex-col bg-white rounded-2xl
        transition-all duration-300 ease-out
        ${isRecommended
          ? 'border-2 border-[#31664A] shadow-lg shadow-[#31664A]/10 hover:shadow-xl hover:shadow-[#31664A]/15'
          : 'border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300'
        }
        ${compact ? 'p-5' : 'p-6 md:p-8'}
      `}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div
          className={`
            absolute left-1/2 -translate-x-1/2
            inline-flex items-center gap-1 px-3 py-1
            bg-[#31664A] text-white text-xs font-medium rounded-full
            ${compact ? '-top-3' : '-top-3.5'}
          `}
        >
          <Icon name="sparkles" size={12} />
          Recommended
        </div>
      )}

      {/* Plan name */}
      <h3
        className={`
          font-heading font-bold text-gray-900
          ${compact ? 'text-lg mt-1' : 'text-xl md:text-2xl mt-2'}
        `}
      >
        {plan.name}
      </h3>

      {/* Description */}
      <p
        className={`
          text-gray-500 mt-1
          ${compact ? 'text-xs' : 'text-sm'}
        `}
      >
        {plan.description}
      </p>

      {/* Price */}
      <div className={`mt-4 ${compact ? 'mb-4' : 'mb-6'}`}>
        <div className="flex items-baseline gap-1">
          <span
            className={`
              font-heading font-bold text-gray-900
              ${compact ? 'text-3xl' : 'text-4xl md:text-5xl'}
            `}
          >
            {formatPrice(price)}
          </span>
          <span className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
            /location/mo
          </span>
        </div>
        {showDiscount && (
          <p className={`mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
            <span className="text-gray-400 line-through">{formatPrice(monthlyPrice)}/mo</span>
            <span className="ml-1.5 text-emerald-600 font-medium">
              Save {formatPrice(monthlyPrice - plan.annualPriceCents)}/mo
            </span>
          </p>
        )}
      </div>

      {/* CTA button */}
      <button
        onClick={() => onSelect(tier)}
        className={`
          w-full font-medium rounded-lg
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-[#31664A]/40 focus:ring-offset-2
          active:scale-[0.98]
          ${compact ? 'py-2.5 text-sm' : 'py-3 text-base'}
          ${isRecommended
            ? 'bg-[#31664A] text-white hover:bg-[#264D38] shadow-sm hover:shadow-md'
            : 'border-2 border-[#31664A] text-[#31664A] hover:bg-[#31664A] hover:text-white'
          }
        `}
      >
        Start {TRIAL_DAYS}-Day Free Trial
      </button>

      {/* Divider */}
      <div className={`border-t border-gray-100 ${compact ? 'my-4' : 'my-6'}`} />

      {/* Feature list */}
      <div className="flex-1">
        {featureDisplay.prefix && (
          <p
            className={`
              text-gray-500 font-medium mb-3
              ${compact ? 'text-xs' : 'text-sm'}
            `}
          >
            {featureDisplay.prefix}
          </p>
        )}
        <ul className={`space-y-2.5 ${compact ? 'text-xs' : 'text-sm'}`}>
          {featureDisplay.features.map((feature) => (
            <li key={feature.key} className="flex items-start gap-2.5">
              <Icon
                name="check"
                size={compact ? 14 : 16}
                className="text-[#31664A] mt-0.5 flex-shrink-0"
              />
              <span className="text-gray-700">{feature.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Determines which features to show and the optional prefix text
 * based on the cumulative tier model.
 */
function getFeatureDisplay(tier: PlanTier) {
  const coreFeatures = FEATURE_GROUPS.find((g) => g.tier === 'core')?.features ?? [];
  const proFeatures = FEATURE_GROUPS.find((g) => g.tier === 'pro')?.features ?? [];

  switch (tier) {
    case 'core':
      return { prefix: null, features: coreFeatures };
    case 'pro':
      return { prefix: 'Everything in Core, plus:', features: proFeatures };
    default:
      return { prefix: null, features: [] };
  }
}
