import type { Metadata } from 'next';
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
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    title: 'Built for Chick-fil-A',
    description:
      'Every feature, every workflow, every piece of terminology is built for how Chick-fil-A restaurants actually operate. No generic restaurant software. No compromises.',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    title: 'Develop People, Not Paperwork',
    description:
      'Replace the binders, spreadsheets, and paper rating forms. Give every team member a visible path to growth. Free your leaders to coach instead of administrate.',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a23.54 23.54 0 0 0-2.688 4.63 24.875 24.875 0 0 1 6.412-1.577m-3.724-3.053A23.473 23.473 0 0 1 12 3.604c3.39 0 6.61.712 9.521 2.004l.219.11a60.398 60.398 0 0 1 .461 5.135 24.875 24.875 0 0 0-6.412-1.577m-9.578 0A23.51 23.51 0 0 0 12 9.88c2.295 0 4.498.329 6.577.95m-11.154 0a60.69 60.69 0 0 0-.163 3.482M12 9.88v.001" />
      </svg>
    ),
  },
  {
    title: 'Fair, Consistent, Documented',
    description:
      'Configurable rubrics, escalation ladders, and standardized evaluation forms ensure every team member is treated consistently. Every decision is documented.',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
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
