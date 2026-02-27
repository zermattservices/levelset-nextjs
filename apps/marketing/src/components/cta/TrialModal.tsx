'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  PLAN_TIERS,
  TIER_ORDER,
  FEATURE_GROUPS,
  TRIAL_DAYS,
  formatPrice,
  type PlanTier,
} from '@levelset/shared';

interface TrialModalProps {
  onClose: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function buildSignupUrl(tier: string): string {
  const url = new URL('https://app.levelset.io/signup');
  url.searchParams.set('plan', tier);
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((key) => {
      const val = params.get(key);
      if (val) url.searchParams.set(key, val);
    });
  }
  return url.toString();
}

/** Features that are NEW in each tier (non-cumulative for display). */
const TIER_NEW_FEATURES: Record<PlanTier, string[]> = {
  core: FEATURE_GROUPS[0].features.map((f) => f.label),
  pro: FEATURE_GROUPS[1].features.map((f) => f.label),
};

/** Prefix line shown above the feature list for pro cards. */
const TIER_INCLUDES_PREFIX: Record<PlanTier, string | null> = {
  core: null,
  pro: 'Everything in Core, plus:',
};

/* -------------------------------------------------------------------------- */
/*  Checkmark icon                                                             */
/* -------------------------------------------------------------------------- */

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-[#31664A] flex-shrink-0 mt-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pricing card                                                               */
/* -------------------------------------------------------------------------- */

interface TierCardProps {
  tier: PlanTier;
  isAnnual: boolean;
}

function TierCard({ tier, isAnnual }: TierCardProps) {
  const config = PLAN_TIERS[tier];
  const price = isAnnual ? config.annualPriceCents : config.monthlyPriceCents;
  const isRecommended = config.recommended ?? false;
  const newFeatures = TIER_NEW_FEATURES[tier];
  const includesPrefix = TIER_INCLUDES_PREFIX[tier];

  return (
    <div
      className={`
        relative flex flex-col rounded-xl p-6 bg-white transition-shadow duration-200
        ${isRecommended
          ? 'border-2 border-[#31664A] shadow-lg shadow-[#31664A]/10'
          : 'border border-gray-200 shadow-sm hover:shadow-md'
        }
      `}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-block px-3 py-0.5 rounded-full bg-[#31664A] text-white text-xs font-semibold tracking-wide uppercase">
            Recommended
          </span>
        </div>
      )}

      {/* Tier name & description */}
      <div className="mb-4">
        <h3 className="text-lg font-heading font-bold text-gray-900">{config.name}</h3>
        <p className="text-sm text-gray-500 mt-1">{config.description}</p>
      </div>

      {/* Price */}
      <div className="mb-5">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-heading font-bold text-gray-900">
            {formatPrice(price)}
          </span>
          <span className="text-sm text-gray-500">/mo per location</span>
        </div>
        {isAnnual && (
          <p className="text-xs text-[#31664A] font-medium mt-1">
            Save {formatPrice(config.monthlyPriceCents - config.annualPriceCents)}/mo with annual
          </p>
        )}
      </div>

      {/* Features */}
      <div className="flex-1 mb-6">
        {includesPrefix && (
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            {includesPrefix}
          </p>
        )}
        <ul className="space-y-2">
          {newFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
              <CheckIcon />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA button */}
      <a
        href={buildSignupUrl(tier)}
        className={`
          block w-full text-center py-3 px-4 rounded-lg font-semibold text-sm
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
          active:scale-[0.98]
          ${isRecommended
            ? 'bg-[#31664A] text-white hover:bg-[#264D38] focus:ring-[#31664A]/40 shadow-sm hover:shadow-md'
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-300'
          }
        `}
      >
        Start with {config.name}
      </a>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Billing toggle                                                             */
/* -------------------------------------------------------------------------- */

interface BillingToggleProps {
  isAnnual: boolean;
  onChange: (annual: boolean) => void;
}

function BillingToggle({ isAnnual, onChange }: BillingToggleProps) {
  return (
    <div className="inline-flex items-center rounded-full bg-gray-100 p-1">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`
          px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[#31664A]/40
          ${!isAnnual
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
          }
        `}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`
          px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[#31664A]/40
          ${isAnnual
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
          }
        `}
      >
        Annual
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Modal                                                                      */
/* -------------------------------------------------------------------------- */

export function TrialModal({ onClose }: TrialModalProps) {
  const [isAnnual, setIsAnnual] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Trigger entrance animation after mount
  useEffect(() => {
    // Small delay to allow the browser to paint the initial state before animating
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Lock body scroll while modal is open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Start your ${TRIAL_DAYS}-day free trial`}
    >
      {/* Backdrop */}
      <div
        className={`
          absolute inset-0 bg-black/60 backdrop-blur-sm
          transition-opacity duration-300 ease-out
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className={`
          relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto
          bg-white rounded-2xl shadow-2xl shadow-black/20
          transition-all duration-300 ease-out
          ${isVisible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
          }
        `}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="
            absolute top-4 right-4 z-10
            w-8 h-8 flex items-center justify-center rounded-full
            text-gray-400 hover:text-gray-600 hover:bg-gray-100
            transition-colors duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-[#31664A]/40
          "
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="px-6 pt-8 pb-8 sm:px-10 sm:pt-10 sm:pb-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 mb-2">
              Start your {TRIAL_DAYS}-day free trial
            </h2>
            <p className="text-gray-500 text-sm sm:text-base max-w-lg mx-auto">
              Every trial includes full Pro access. Pick the plan you&apos;re interested in.
            </p>
          </div>

          {/* Billing toggle */}
          <div className="flex justify-center mb-8">
            <BillingToggle isAnnual={isAnnual} onChange={setIsAnnual} />
          </div>

          {/* Tier cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {TIER_ORDER.map((tier) => (
              <TierCard key={tier} tier={tier} isAnnual={isAnnual} />
            ))}
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-400 mt-6">
            No credit card required. Cancel anytime during your trial.
          </p>
        </div>
      </div>
    </div>
  );
}
