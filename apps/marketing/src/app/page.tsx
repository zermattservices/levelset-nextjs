import { Hero } from '@/components/sections/Hero';
import { About } from '@/components/sections/About';
import { Stats } from '@/components/sections/Stats';
import { FAQ } from '@/components/sections/FAQ';
import { CTA } from '@/components/sections/CTA';

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Stats />
      <FAQ />
      <CTA />
    </>
  );
}
