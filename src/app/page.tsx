import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
// Temporarily hidden from the landing page. To restore: uncomment the
// imports below and the matching <Features /> / <FAQ /> in the JSX.
// import { Features } from '@/components/landing/Features';
// import { FAQ } from '@/components/landing/FAQ';

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main className="relative">
        <Hero />
        {/* Hidden — restore by uncommenting the imports above and these lines:
        <Features />
        <FAQ />
        */}
      </main>
    </>
  );
}
