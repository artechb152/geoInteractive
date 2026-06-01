import { Hero } from '@/components/landing/Hero';
import { LessonsGrid } from '@/components/landing/LessonsGrid';
import { PrototypesShowcase } from '@/components/landing/PrototypesShowcase';
import { RecapDemosTeaser } from '@/components/landing/RecapDemosTeaser';
// Temporarily hidden from the landing page. To restore: uncomment the
// imports below and the matching <Features /> / <FAQ /> in the JSX.
// import { Features } from '@/components/landing/Features';
// import { FAQ } from '@/components/landing/FAQ';

export default function HomePage() {
  return (
    <main className="relative">
      <Hero />
      <LessonsGrid />
      <PrototypesShowcase />
      <RecapDemosTeaser />
      {/* Hidden — restore by uncommenting the imports above and these lines:
      <Features />
      <FAQ />
      */}
    </main>
  );
}
