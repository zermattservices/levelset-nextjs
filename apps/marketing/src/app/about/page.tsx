import type { Metadata } from 'next';
import { Stats } from '@/components/sections/Stats';
import { AboutCTA } from './AboutCTA';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Levelset is the all-in-one team management platform built exclusively for Chick-fil-A operators.',
  openGraph: {
    title: 'About — Levelset',
    description: 'Built for operators, by operators.',
  },
};

const VALUES = [
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
    title: 'Your Playbook, Digitized',
    description:
      'Levelset doesn\u2019t tell you how to run your restaurant. You bring your positions, your discipline rules, your rating criteria \u2014 and Levelset connects it all in one place.',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    title: 'Leadership Alignment',
    description:
      'When every leader sees the same data and follows the same process, your team gets a consistent experience no matter who\u2019s leading the shift.',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    title: 'Practical, Not Prescriptive',
    description:
      'We built tools that solve real operational problems \u2014 not theoretical ones. Every feature exists because operators asked for it.',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L3 13.38m3.32-3.31a9 9 0 1112.765.318m-4.044 4.83l2.69 2.689m0 0l3.32-3.32m-3.32 3.32a9 9 0 01-12.765-.318" />
      </svg>
    ),
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28 bg-white">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-text-primary mb-6">
              Built for operators, by operators.
            </h1>
            <p className="text-xl text-text-secondary leading-relaxed">
              Levelset exists because Chick-fil-A operators deserve better tools
              than spreadsheets and binders. We built a platform that adapts to
              how you already run your restaurant &mdash; connecting your
              positions, your standards, and your team in one place.
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
                Most operators do this with a patchwork of spreadsheets, paper
                forms, and tools that were never designed for their specific needs.
              </p>
              <p>
                Levelset replaces that patchwork with a single, connected platform.
                Positional ratings, discipline tracking, team roster, scheduling,
                evaluations, and more &mdash; all in one place, all built
                specifically for how Chick-fil-A operates.
              </p>
              <p>
                The result: your entire leadership team sees the same picture,
                follows the same processes, and makes decisions backed by real data
                instead of memory.
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
                className="p-7 rounded-2xl bg-[#f6fffa] border border-[#31664A]/10"
              >
                <div className="w-11 h-11 rounded-lg bg-[#31664A] flex items-center justify-center mb-5">
                  {value.icon}
                </div>
                <h3 className="text-lg font-heading font-bold text-text-primary mb-2">
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
