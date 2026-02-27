import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FEATURES, getFeature } from '@/lib/features';
import { getFeatureContent } from '@/lib/feature-content';
import { FeaturePageTemplate } from '@/components/templates/FeaturePageTemplate';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return FEATURES.map(f => ({ slug: f.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const feature = getFeature(params.slug);
  if (!feature) return {};

  return {
    title: feature.name,
    description: feature.shortDescription,
    openGraph: {
      title: `${feature.name} — Levelset`,
      description: feature.shortDescription,
    },
  };
}

export default function FeaturePage({ params }: Props) {
  const feature = getFeature(params.slug);
  if (!feature) notFound();

  const content = getFeatureContent(params.slug);
  if (!content) notFound();

  return (
    <>
      <PageViewTracker
        event="ViewContent"
        params={{ content_name: `feature_${params.slug}`, content_type: 'feature_page' }}
      />
      <FeaturePageTemplate feature={feature} content={content} />
    </>
  );
}
