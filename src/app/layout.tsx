import type { Metadata } from 'next';
import { Assistant } from 'next/font/google';
import './globals.css';
import { AppHeader } from '@/components/ui/AppHeader';

// Assistant מחליף את Heebo/Rubik — משפחה אחת, היררכיה לפי משקל (עדכון עיצוב 2026-07-28).
const heebo = Assistant({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const rubik = Assistant({
  subsets: ['hebrew', 'latin'],
  variable: '--font-rubik',
  display: 'swap',
  weight: ['600', '700', '800'],
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
        {/* Header גלובלי אחיד (design-system §7). קבוע למעלה בכל המסכים;
            התוכן יושב מתחתיו דרך pt לפי --header-h. */}
        <AppHeader />
        <div className="min-h-screen flex flex-col pt-[var(--header-h)]">{children}</div>
      </body>
    </html>
  );
}
