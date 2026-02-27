import type { Metadata } from 'next';
import { PricingPageContent } from './PricingPageContent';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple per-location pricing for Chick-fil-A operators. Start your 30-day free trial with full access to every feature.',
  openGraph: {
    title: 'Pricing — Levelset',
    description: 'Simple per-location pricing. Start your 30-day free trial.',
  },
};

export default function PricingPage() {
  return (
    <>
      <PageViewTracker event="ViewContent" params={{ content_name: 'pricing', content_type: 'pricing_page' }} />
      <PricingPageContent />
    </>
  );
}
