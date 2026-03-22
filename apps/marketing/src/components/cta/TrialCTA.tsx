'use client';

import { useTrialModal } from './TrialModalProvider';
import { CTA_MODE, CTA_TEXT } from '@/lib/cta-config';

interface TrialCTAProps {
  /** Use the dark variant when placed on a dark background (e.g. hero section). */
  dark?: boolean;
}

export function TrialCTA({ dark = false }: TrialCTAProps) {
  const { openModal } = useTrialModal();
  const text = CTA_TEXT[CTA_MODE];

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={openModal}
        className={`
          px-8 py-3.5 rounded-xl font-semibold text-base
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-offset-2
          active:scale-[0.98]
          ${dark
            ? 'bg-white text-[#264D38] hover:bg-white/90 hover:shadow-lg hover:shadow-black/10 focus:ring-white/40 focus:ring-offset-[#264D38]'
            : 'bg-[#31664A] text-white hover:bg-[#264D38] hover:shadow-lg hover:shadow-[#31664A]/20 focus:ring-[#31664A]/40'
          }
        `}
      >
        {text.button}
      </button>
      <p className={`text-xs ${dark ? 'text-white/50' : 'text-gray-400'}`}>
        {text.subtext}
      </p>
    </div>
  );
}
