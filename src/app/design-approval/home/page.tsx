import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ContourBackdrop } from '@/components/design-approval/motifs';
import { HomeMock } from '@/components/design-approval/HomeMock';

export const metadata: Metadata = {
  title: 'מוקאפ מסך הבית · אישור עיצוב · גיאוגרפיה צבאית',
  description:
    'מוקאפ אישור לעמוד הבית של הקורס בשפת "מפה צבאית מודרנית · פייפרקאט איזומטרי" — אינו מסך פרודקשן.',
  robots: { index: false, follow: false },
};

export default function DesignApprovalHome() {
  return (
    <div className="relative flex-1">
      {/* קנבס: קרם + קווי גובה עדינים מאחורי הכול (§2.1) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <ContourBackdrop tone="page" />
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        {/* חזרה לאינדקס המוקאפים — ניווט פנימי בלבד (לא מהפרודקשן) */}
        <Link
          href="/design-approval/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-accent"
        >
          <ChevronRight className="size-4" aria-hidden />
          חזרה למוקאפים
        </Link>

        <div className="mt-6">
          <HomeMock />
        </div>

        <p className="mt-8 text-center text-xs text-fg-dim">
          מוקאפ לאישור · אינו מסך פרודקשן · חריצי נכס חסרים מוצגים כבלוק אבחוני בולט
          עד לקבלת קבצי ה-Magnific
        </p>
      </main>
    </div>
  );
}
