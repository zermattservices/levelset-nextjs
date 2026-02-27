'use client';

interface PricingToggleProps {
  period: 'monthly' | 'annual';
  onChange: (period: 'monthly' | 'annual') => void;
}

export function PricingToggle({ period, onChange }: PricingToggleProps) {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="relative inline-flex items-center rounded-full bg-gray-100 p-1">
        {/* Sliding background indicator */}
        <div
          className={`
            absolute top-1 bottom-1 rounded-full bg-[#31664A]
            transition-all duration-300 ease-out
            ${period === 'monthly'
              ? 'left-1 w-[calc(50%-2px)]'
              : 'left-[calc(50%+1px)] w-[calc(50%-2px)]'
            }
          `}
        />

        <button
          onClick={() => onChange('monthly')}
          className={`
            relative z-10 px-5 py-2 text-sm font-medium rounded-full
            transition-colors duration-300
            focus:outline-none focus-visible:ring-2 focus-visible:ring-[#31664A]/40 focus-visible:ring-offset-2
            ${period === 'monthly' ? 'text-white' : 'text-gray-500 hover:text-gray-700'}
          `}
          aria-pressed={period === 'monthly'}
        >
          Monthly
        </button>

        <button
          onClick={() => onChange('annual')}
          className={`
            relative z-10 px-5 py-2 text-sm font-medium rounded-full
            transition-colors duration-300
            focus:outline-none focus-visible:ring-2 focus-visible:ring-[#31664A]/40 focus-visible:ring-offset-2
            ${period === 'annual' ? 'text-white' : 'text-gray-500 hover:text-gray-700'}
          `}
          aria-pressed={period === 'annual'}
        >
          Annual
        </button>
      </div>

      {/* Save badge */}
      <span
        className={`
          inline-flex items-center px-2.5 py-1 rounded-full
          text-xs font-medium
          bg-emerald-50 text-emerald-700 border border-emerald-200/60
          transition-opacity duration-300
          ${period === 'annual' ? 'opacity-100' : 'opacity-60'}
        `}
      >
        Save up to 10%
      </span>
    </div>
  );
}
