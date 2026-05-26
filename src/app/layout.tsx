import type { Metadata } from 'next';
import { Heebo, Rubik } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/landing/Navbar';

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
  display: 'swap',
});

const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  variable: '--font-rubik',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'גיאוגרפיה צבאית | קורס דיגיטלי',
  description: 'קורס אינטראקטיבי בגיאוגרפיה צבאית, GEOINT וניתוח מערכות שטח',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${rubik.variable}`}>
      <body className="overflow-x-clip">
        {/* Global, always-on navbar. Fixed at top across every route.
            Children sit below it via `pt-16` (= navbar height = 4rem). */}
        <Navbar />
        <div className="min-h-screen flex flex-col pt-12">{children}</div>
      </body>
    </html>
  );
}
