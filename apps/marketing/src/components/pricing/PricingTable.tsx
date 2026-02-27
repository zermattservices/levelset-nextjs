'use client';

import { useState } from 'react';
import { TIER_ORDER, type PlanTier } from '@levelset/shared';
import { PricingToggle } from './PricingToggle';
import { PricingCard } from './PricingCard';

interface PricingTableProps {
  onSelect: (tier: PlanTier) => void;
  compact?: boolean;
}

export function PricingTable({ onSelect, compact = false }: PricingTableProps) {
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div>
      {/* Toggle */}
      <div className="flex justify-center mb-8 md:mb-12">
        <PricingToggle period={period} onChange={setPeriod} />
      </div>

      {/* Cards grid */}
      <div
        className={`
          grid grid-cols-1 gap-6 items-stretch
          ${compact
            ? 'md:grid-cols-2 md:gap-4'
            : 'md:grid-cols-2 md:gap-6 lg:gap-8 max-w-3xl mx-auto'
          }
        `}
      >
        {TIER_ORDER.map((tier) => (
          <div
            key={tier}
            className={
              tier === 'pro' && !compact
                ? 'md:z-10'
                : ''
            }
          >
            <PricingCard
              tier={tier}
              period={period}
              onSelect={onSelect}
              compact={compact}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
