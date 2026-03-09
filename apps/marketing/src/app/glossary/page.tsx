import type { Metadata } from 'next';
import { GLOSSARY_CATEGORIES, getAllTerms, termToId } from '@/lib/glossary';

export const metadata: Metadata = {
  title: 'CFA Operations Glossary',
  description:
    'Glossary of Chick-fil-A operations terminology used in Levelset — positional excellence, discipline, pay, roles, and CFA service frameworks.',
};

function definedTermSetJsonLd() {
  const terms = getAllTerms();
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Levelset CFA Operations Glossary',
    description:
      'Terminology used in Levelset for Chick-fil-A team management, positional excellence ratings, discipline tracking, and operational excellence.',
    url: 'https://levelset.io/glossary',
    hasDefinedTerm: terms.map((t) => ({
      '@type': 'DefinedTerm',
      name: t.term,
      description: t.definition,
      url: `https://levelset.io/glossary#${termToId(t.term)}`,
    })),
  };
}

export default function GlossaryPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(definedTermSetJsonLd()),
        }}
      />

      <section className="pt-28 pb-12 md:pt-36 md:pb-16">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-text-primary tracking-tight mb-4">
              CFA Operations Glossary
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed">
              The terminology behind Levelset — from positional excellence
              ratings to Chick-fil-A service frameworks. Every term reflects how
              CFA operators actually run their restaurants.
            </p>
          </div>
        </div>
      </section>

      {/* Category navigation */}
      <section className="border-b border-neutral-200 sticky top-16 bg-white/95 backdrop-blur-sm z-10">
        <div className="max-w-content mx-auto px-6">
          <nav className="flex gap-6 overflow-x-auto py-4 -mb-px">
            {GLOSSARY_CATEGORIES.map((category) => (
              <a
                key={category.slug}
                href={`#${category.slug}`}
                className="text-sm font-medium text-text-secondary hover:text-text-primary whitespace-nowrap transition-colors duration-200"
              >
                {category.name}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* Terms by category */}
      <section className="py-16 md:py-24">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl mx-auto space-y-16">
            {GLOSSARY_CATEGORIES.map((category) => (
              <div key={category.slug} id={category.slug}>
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-text-primary mb-8">
                  {category.name}
                </h2>
                <dl className="space-y-6">
                  {category.terms.map((term) => (
                    <div
                      key={term.term}
                      id={termToId(term.term)}
                      className="scroll-mt-32"
                    >
                      <dt className="text-lg font-heading font-bold text-text-primary mb-1">
                        {term.term}
                      </dt>
                      <dd className="text-text-secondary leading-relaxed">
                        {term.definition}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
