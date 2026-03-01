'use client';

import { TrialCTA } from '@/components/cta/TrialCTA';

interface ComingSoonFeature {
  name: string;
  tagline: string;
  description: string;
  highlights: string[];
}

export function ComingSoonTemplate({ feature }: { feature: ComingSoonFeature }) {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#264D38] pt-32 pb-16 md:pt-44 md:pb-24">
        <div
          className="absolute inset-0 -z-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, #31664A 0%, #1a3d2d 50%, #162e23 100%)',
          }}
        />
        <div className="max-w-content mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm font-medium mb-8 backdrop-blur-sm">
              Coming Soon
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 leading-[1.08] tracking-tight">
              {feature.name}
            </h1>
            <p className="text-lg md:text-xl text-white/70 mb-8 leading-relaxed max-w-2xl mx-auto">
              {feature.tagline}
            </p>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="py-16 md:py-24">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <p className="text-lg text-gray-600 leading-relaxed mb-12">
              {feature.description}
            </p>

            <h2 className="text-2xl font-heading font-bold text-gray-900 mb-6">
              What to Expect
            </h2>
            <ul className="space-y-4">
              {feature.highlights.map((highlight, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-[#264D38] shrink-0" />
                  <span className="text-gray-700">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-content mx-auto px-6 text-center">
          <h2 className="text-2xl font-heading font-bold text-gray-900 mb-4">
            Get Started with Levelset Today
          </h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Start your free 30-day Pro trial and be the first to access {feature.name} when it launches.
          </p>
          <TrialCTA />
        </div>
      </section>
    </>
  );
}
