import type { Metadata } from 'next';
import { PricingPageContent } from './PricingPageContent';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { pricingJsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple per-location pricing for Chick-fil-A operators. Start your 30-day free trial with full access to every feature.',
  openGraph: {
    title: 'Pricing — Levelset',
    description: 'Simple per-location pricing. Start your 30-day free trial.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — Levelset',
    description: 'Simple per-location pricing for Chick-fil-A operators. Start your 30-day free trial.',
  },
};

const pricingFaqItems = [
  { question: 'What\u2019s included in the free trial?', answer: 'Every trial starts on the Pro plan \u2014 full access to every feature for 30 days.' },
  { question: 'What happens after the trial?', answer: 'At the end of your trial, you\u2019ll choose the plan that fits your operation.' },
  { question: 'Can I switch plans later?', answer: 'Absolutely. You can upgrade or downgrade at any time.' },
  { question: 'What counts as a location?', answer: 'Each physical restaurant location counts as one location.' },
  { question: 'Is there a setup fee?', answer: 'No. There are no setup fees, no contracts, and no hidden costs.' },
];

export default function PricingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd([
        { name: 'Core', monthlyPrice: '99', annualPrice: '89', description: 'Essential tools for team management' },
        { name: 'Pro', monthlyPrice: '249', annualPrice: '224', description: 'Full platform with AI-powered intelligence' },
      ])) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
        { name: 'Home', url: 'https://levelset.io' },
        { name: 'Pricing', url: 'https://levelset.io/pricing' },
      ])) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(pricingFaqItems)) }} />
      <PageViewTracker event="ViewContent" params={{ content_name: 'pricing', content_type: 'pricing_page' }} />
      <PricingPageContent />
    </>
  );
}
