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
