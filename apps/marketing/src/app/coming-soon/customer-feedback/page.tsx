import type { Metadata } from 'next';
import { ComingSoonTemplate } from '@/components/templates/ComingSoonTemplate';

export const metadata: Metadata = {
  title: 'Customer Feedback — Coming Soon',
  description: 'Multi-channel customer feedback aggregated into one dashboard.',
};

export default function CustomerFeedbackPage() {
  return (
    <ComingSoonTemplate
      feature={{
        name: 'Customer Feedback',
        tagline: 'Every review, every comment, every channel — in one place, connected to your team.',
        description:
          'Customer Feedback aggregates reviews and feedback from multiple channels — Google, Yelp, and more — into a single dashboard. See trends, identify operational issues, and connect guest feedback to your team\'s performance data. When a review mentions slow Drive-Thru service, you can cross-reference with your Drive-Thru ratings to pinpoint the root cause.',
        highlights: [
          'Aggregate reviews from Google, Yelp, and additional channels',
          'Trend analysis to spot recurring themes in guest feedback',
          'Connect feedback to operational metrics and team performance data',
          'AI-powered sentiment analysis to surface what matters most',
          'Track response rates and resolution times across all channels',
        ],
      }}
    />
  );
}
