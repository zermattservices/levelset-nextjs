'use client';

import { TrialCTA } from '@/components/cta/TrialCTA';

export function AboutCTA() {
  return (
    <section className="py-24 md:py-32 bg-[#1e3f2e] relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 100%, #264D38 0%, #1a3d2d 40%, #162e23 100%)',
        }}
      />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[#4a9e6e]/8 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-[#31664A]/10 blur-3xl" />

      <div className="max-w-content mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
            Ready to see Levelset in action?
          </h2>
          <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
            Start your 30-day free trial with full access to every feature. No credit card required.
          </p>
          <div className="flex justify-center">
            <TrialCTA dark />
          </div>
        </div>
      </div>
    </section>
  );
}
