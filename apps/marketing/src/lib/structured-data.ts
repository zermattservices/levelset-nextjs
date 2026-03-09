import type { MarketingFeature } from './features';

const BASE_URL = 'https://levelset.io';

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Levelset',
    url: BASE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Team management platform built exclusively for Chick-fil-A operators. Positional excellence ratings, discipline tracking, scheduling, pay, and team development — all in one place.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: '30-day free trial with full access',
    },
    creator: {
      '@type': 'Organization',
      name: 'Levelset',
      url: BASE_URL,
    },
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbJsonLd(
  items: { name: string; url: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function featureJsonLd(feature: MarketingFeature) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `Levelset ${feature.name}`,
    url: `${BASE_URL}/features/${feature.slug}`,
    applicationCategory: 'BusinessApplication',
    description: feature.shortDescription,
    isPartOf: {
      '@type': 'SoftwareApplication',
      name: 'Levelset',
      url: BASE_URL,
    },
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Levelset',
    url: BASE_URL,
    description: 'Team management platform built exclusively for Chick-fil-A operators.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/glossary#{search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function pricingJsonLd(tiers: { name: string; monthlyPrice: string; annualPrice: string; description: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Levelset',
    description: 'Team management platform built exclusively for Chick-fil-A operators.',
    brand: { '@type': 'Brand', name: 'Levelset' },
    offers: tiers.map((tier) => ({
      '@type': 'Offer',
      name: `Levelset ${tier.name}`,
      description: tier.description,
      price: tier.monthlyPrice,
      priceCurrency: 'USD',
      priceSpecification: [
        {
          '@type': 'UnitPriceSpecification',
          price: tier.monthlyPrice,
          priceCurrency: 'USD',
          unitText: 'MONTH',
          referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitText: 'location' },
        },
        {
          '@type': 'UnitPriceSpecification',
          price: tier.annualPrice,
          priceCurrency: 'USD',
          unitText: 'MONTH',
          description: 'Annual billing',
          referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitText: 'location' },
        },
      ],
      availability: 'https://schema.org/InStock',
    })),
  };
}

export function aboutPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Levelset',
    url: `${BASE_URL}/about`,
    description: 'Levelset is the connected team management platform built exclusively for Chick-fil-A.',
    mainEntity: {
      '@type': 'Organization',
      name: 'Levelset',
      url: BASE_URL,
      description: 'Team management platform built exclusively for Chick-fil-A operators. Positional excellence ratings, discipline tracking, scheduling, pay, and team development.',
      foundingDate: '2025',
      knowsAbout: ['Chick-fil-A operations', 'Restaurant team management', 'Positional excellence', 'Employee performance tracking'],
    },
  };
}

export function contactPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Levelset',
    url: `${BASE_URL}/contact`,
    description: 'Get in touch with the Levelset team.',
    mainEntity: {
      '@type': 'Organization',
      name: 'Levelset',
      url: BASE_URL,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales',
        url: `${BASE_URL}/contact`,
      },
    },
  };
}

export function solutionPageJsonLd(solution: { name: string; description: string; slug: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${solution.name} — Levelset`,
    url: `${BASE_URL}/solutions/${solution.slug}`,
    description: solution.description,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Levelset',
      url: BASE_URL,
    },
    about: {
      '@type': 'SoftwareApplication',
      name: 'Levelset',
      applicationCategory: 'BusinessApplication',
    },
  };
}

export function integrationsListJsonLd(integrations: { name: string; slug: string; shortDescription: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Levelset Integrations',
    description: 'Connect Levelset to the tools you already use.',
    url: `${BASE_URL}/integrations`,
    numberOfItems: integrations.length,
    itemListElement: integrations.map((integration, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: integration.name,
      description: integration.shortDescription,
      url: `${BASE_URL}/integrations/${integration.slug}`,
    })),
  };
}

export function integrationJsonLd(integration: { name: string; slug: string; shortDescription: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${integration.name} Integration for Levelset`,
    url: `${BASE_URL}/integrations/${integration.slug}`,
    description: integration.shortDescription,
    applicationCategory: 'BusinessApplication',
    isPartOf: {
      '@type': 'SoftwareApplication',
      name: 'Levelset',
      url: BASE_URL,
    },
  };
}
