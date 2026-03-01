import type { Metadata } from 'next';
import { ArrowLeftRight, Building2, GraduationCap, ShieldCheck } from 'lucide-react';
import { Stats } from '@/components/sections/Stats';
import { AboutCTA } from './AboutCTA';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Levelset is the connected team management platform built exclusively for Chick-fil-A.',
  openGraph: {
    title: 'About — Levelset',
    description: 'The connected team management platform built exclusively for Chick-fil-A.',
  },
};

const VALUES = [
  {
    title: 'Everything Connected',
    description:
      'Ratings feed evaluations. Evaluations drive development plans. Discipline history informs coaching. Performance connects to pay. Nothing lives in a silo.',
    icon: <ArrowLeftRight className="w-6 h-6 text-white" strokeWidth={1.5} />,
  },
  {
    title: 'Built for Chick-fil-A',
    description:
      'Every feature, every workflow, every piece of terminology is built for how Chick-fil-A restaurants actually operate. No generic restaurant software. No compromises.',
    icon: <Building2 className="w-6 h-6 text-white" strokeWidth={1.5} />,
  },
  {
    title: 'Develop People, Not Paperwork',
    description:
      'Replace the binders, spreadsheets, and paper rating forms. Give every team member a visible path to growth. Free your leaders to coach instead of administrate.',
    icon: <GraduationCap className="w-6 h-6 text-white" strokeWidth={1.5} />,
  },
  {
    title: 'Fair, Consistent, Documented',
    description:
      'Configurable rubrics, escalation ladders, and standardized evaluation forms ensure every team member is treated consistently. Every decision is documented.',
    icon: <ShieldCheck className="w-6 h-6 text-white" strokeWidth={1.5} />,
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#264D38] pt-32 pb-20 md:pt-44 md:pb-28">
        <div
          className="absolute inset-0 -z-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, #31664A 0%, #1a3d2d 50%, #162e23 100%)',
          }}
        />
        <div className="max-w-content mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 leading-[1.08] tracking-tight">
              The Connected Platform for Chick-fil-A Teams
            </h1>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl mx-auto">
              Levelset replaces the spreadsheets, binders, and disconnected tools
              that Operators juggle every day with a single platform where
              everything works together &mdash; ratings, discipline, scheduling,
              development, and AI.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 md:py-28 bg-[#f6fffa]">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-text-primary mb-6">
              Why we built Levelset
            </h2>
            <div className="space-y-4 text-lg text-text-secondary leading-relaxed">
              <p>
                Running a Chick-fil-A restaurant means managing dozens of team
                members across multiple positions, shifts, and leadership tiers.
                Most Operators do this with a patchwork of spreadsheets, paper
                forms, and tools that were never designed for their specific needs.
              </p>
              <p>
                Levelset replaces that patchwork with a single, connected platform.
                Positional ratings, progressive discipline, scheduling, evaluations,
                development plans, and more &mdash; all in one place, all built
                specifically for how Chick-fil-A operates.
              </p>
              <p>
                The result: your entire leadership team sees the same picture,
                follows the same processes, and makes decisions backed by real data
                instead of memory. You stop managing systems and start developing
                people.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-content mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-text-primary text-center mb-14">
            What we believe
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {VALUES.map(value => (
              <div
                key={value.title}
                className="group p-7 rounded-2xl bg-[#f6fffa] border border-[#31664A]/10 hover:border-[#31664A]/25 hover:shadow-lg hover:shadow-[#31664A]/5 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-lg bg-[#31664A] flex items-center justify-center mb-5">
                  {value.icon}
                </div>
                <h3 className="text-lg font-heading font-bold text-text-primary group-hover:text-[#31664A] transition-colors duration-300 mb-2">
                  {value.title}
                </h3>
                <p className="text-text-secondary leading-relaxed text-[15px]">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <Stats />

      {/* CTA */}
      <AboutCTA />
    </>
  );
}
