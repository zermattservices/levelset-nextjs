import { Hero } from '@/components/sections/Hero';
import { PainPoints } from '@/components/sections/PainPoints';
import { FeaturesOverview } from '@/components/sections/FeaturesOverview';
import { About } from '@/components/sections/About';
import { Stats } from '@/components/sections/Stats';
import { FAQ } from '@/components/sections/FAQ';
import { CTA } from '@/components/sections/CTA';
import { faqItems } from '@/components/sections/FAQ';
import { organizationJsonLd, faqJsonLd } from '@/lib/structured-data';

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqItems)) }}
      />
      <Hero />
      <PainPoints />
      <FeaturesOverview />
      <About />
      <Stats />
      <FAQ />
      <CTA />
    </>
  );
}
