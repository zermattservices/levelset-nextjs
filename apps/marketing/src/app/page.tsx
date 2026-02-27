import { Hero } from '@/components/sections/Hero';
import { PainPoints } from '@/components/sections/PainPoints';
import { FeaturesOverview } from '@/components/sections/FeaturesOverview';
import { About } from '@/components/sections/About';
import { Stats } from '@/components/sections/Stats';
import { FAQ } from '@/components/sections/FAQ';
import { CTA } from '@/components/sections/CTA';

export default function HomePage() {
  return (
    <>
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
