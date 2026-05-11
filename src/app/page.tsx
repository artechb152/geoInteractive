import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { FAQ } from '@/components/landing/FAQ';

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main className="relative">
        <Hero />
        <Features />
        <FAQ />
      </main>
    </>
  );
}
