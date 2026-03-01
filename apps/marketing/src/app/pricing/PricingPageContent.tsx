'use client';

import { PLAN_TIERS, TIER_ORDER, FEATURE_GROUPS, TRIAL_DAYS, formatPrice, type PlanTier, type FeatureStatus } from '@levelset/shared';
import { useState } from 'react';
import { PricingTable } from '@/components/pricing/PricingTable';
import { useTrialModal } from '@/components/cta/TrialModalProvider';
import { Accordion } from '@/components/ui/Accordion';

const PRICING_FAQ = [
  {
    question: 'What\u2019s included in the free trial?',
    answer: `Every trial starts on the Pro plan — full access to every feature for ${TRIAL_DAYS} days. No credit card required to start. You\u2019ll have time to set up your organization, invite your leadership team, and see the platform in action.`,
  },
  {
    question: 'What happens after the trial?',
    answer: 'At the end of your trial, you\u2019ll choose the plan that fits your operation. Your data and configuration carry over — nothing is lost. If you don\u2019t select a plan, your account is paused until you\u2019re ready.',
  },
  {
    question: 'Can I switch plans later?',
    answer: 'Absolutely. You can upgrade or downgrade at any time. Changes are prorated so you only pay for what you use.',
  },
  {
    question: 'What counts as a location?',
    answer: 'Each physical restaurant location counts as one location. Pricing is per location, per month. Multi-unit operators get all their locations on one account.',
  },
  {
    question: 'Is there a setup fee?',
    answer: 'No. There are no setup fees, no contracts, and no hidden costs. You can cancel anytime.',
  },
];

export function PricingPageContent() {
  const { openModal } = useTrialModal();

  const handleTierSelect = (tier: PlanTier) => {
    openModal();
  };

  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-20 bg-white">
        <div className="max-w-content mx-auto px-6 text-center">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#31664A]/10 text-[#31664A] text-sm font-medium mb-6">
            {TRIAL_DAYS}-day free trial on Pro
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-text-primary mb-5">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Per location, per month. Start with a free trial — every feature included.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 bg-white">
        <div className="max-w-content mx-auto px-6">
          <PricingTable onSelect={handleTierSelect} />
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20 bg-[#f6fffa]">
        <div className="max-w-content mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-text-primary text-center mb-12">
            Compare features across plans
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full max-w-4xl mx-auto text-left">
              <thead>
                <tr className="border-b-2 border-[#31664A]/20">
                  <th className="py-4 pr-4 text-sm font-medium text-text-secondary">Feature</th>
                  {TIER_ORDER.map(tier => (
                    <th key={tier} className="py-4 px-4 text-center text-sm font-heading font-bold text-text-primary">
                      {PLAN_TIERS[tier].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_GROUPS.map(group => (
                  <FeatureGroupRows key={group.name} group={group} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-content mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-text-primary text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="max-w-2xl mx-auto">
            <Accordion items={PRICING_FAQ} />
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 md:py-28 bg-[#1e3f2e] relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 50% 100%, #264D38 0%, #1a3d2d 40%, #162e23 100%)',
          }}
        />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[#4a9e6e]/8 blur-3xl" />

        <div className="max-w-content mx-auto px-6 relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
            Start your {TRIAL_DAYS}-day free trial with full access to every feature.
            No credit card required.
          </p>
          <button
            onClick={openModal}
            className="px-8 py-3.5 rounded-lg bg-white text-[#31664A] font-semibold text-base hover:bg-white/90 transition-colors duration-200 shadow-lg"
          >
            Start Your Free Trial
          </button>
        </div>
      </section>
    </>
  );
}

function FeatureGroupRows({ group }: { group: typeof FEATURE_GROUPS[number] }) {
  const tierIndex = TIER_ORDER.indexOf(group.tier);

  return (
    <>
      <tr>
        <td colSpan={3} className="pt-6 pb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {group.name}
        </td>
      </tr>
      {group.features.map(feature => (
        <tr key={feature.key} className="border-b border-neutral-border/30">
          <td className="py-3 pr-4 text-sm text-text-primary">
            <span className="flex items-center gap-1.5">
              {feature.label}
              {feature.status && feature.status !== 'live' && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none ${
                  feature.status === 'beta' ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-500'
                }`}>
                  {feature.status === 'beta' ? 'Beta' : 'Soon'}
                </span>
              )}
            </span>
          </td>
          {TIER_ORDER.map((tier, i) => (
            <td key={tier} className="py-3 px-4 text-center">
              {i >= tierIndex ? (
                <svg className="w-5 h-5 text-[#31664A] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <span className="text-text-secondary/30">&mdash;</span>
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
