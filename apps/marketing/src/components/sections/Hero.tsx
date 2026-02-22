'use client';

import { WaitlistForm } from '@/components/forms/WaitlistForm';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#264D38] pt-32 pb-24 md:pt-44 md:pb-32">
      {/* Layered background depth */}
      <div
        className="absolute inset-0 -z-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #31664A 0%, #1a3d2d 50%, #162e23 100%)',
        }}
      />
      {/* Decorative glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#4a9e6e]/10 blur-3xl" />
      <div className="absolute bottom-[-30%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#31664A]/20 blur-3xl" />
      {/* Subtle grain texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="max-w-content mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm font-medium mb-8 backdrop-blur-sm">
            Now in Early Access
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-[3.75rem] font-heading font-bold text-white mb-6 leading-[1.08] tracking-tight">
            Know exactly where every team member stands
          </h1>

          <p className="text-lg md:text-xl text-white/70 mb-12 leading-relaxed max-w-2xl mx-auto">
            Levelset takes your positions, your discipline process, and your team roster and connects them in one platform — so your whole leadership team is on the same page.
          </p>

          <div className="flex justify-center">
            <WaitlistForm dark />
          </div>

          <p className="text-sm text-white/40 mt-4">
            Join the waitlist — no spam, just updates.
          </p>
        </div>
      </div>
    </section>
  );
}
