'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { useCourseProgress } from '@/lib/course-progress';

/**
 * ProgressCard — כרטיס "התקדמות שלך" הכהה (design/mockup.png, פס תחתון-ימני).
 * הנתונים נגזרים חיים מ-useCourseProgress (last-visit): X מתוך 12 ⇒ אחוז
 * מחושב (מקור אמת אחד — פותר את 35%-מול-4/12 שבמוקאפ). מכשיר טרי מקבל
 * מצב ריק (0%, "עוד לא התחלת") והכפתור מוביל לשיעור הראשון.
 * חוב נכסים: HOME-PROGRESS-SOLDIER (תצלום דו-גוני של חייל קורא מפה,
 * ממוזג ברקע בקצה ה-inline-end) — כרגע גרדיאנט בלבד.
 */
export function ProgressCard() {
  const progress = useCourseProgress();

  return (
    <aside className="relative flex flex-col items-center overflow-hidden rounded-3xl bg-pine-grad p-6 text-paper-bright shadow-pine-card">
      {/* הדגשה רכה במקום תצלום החייל החסר */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 18% 45%, rgba(243,233,220,0.10), transparent 70%)',
        }}
      />

      <h2 className="relative text-[22px] font-bold">התקדמות שלך</h2>

      <ProgressRing percent={progress.percent} className="relative mt-4" />

      <p className="relative mt-4 text-[17px] font-medium text-paper-bright/90">
        {progress.started
          ? `סיימת ${progress.completedCount} מתוך ${progress.totalCount} שיעורים`
          : 'עוד לא התחלת את הקורס'}
      </p>

      <Link
        href={progress.continueHref}
        className="relative mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-ember-soft text-base font-bold text-paper-bright transition duration-150 ease-snap hover:bg-paper-bright/10 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft focus-visible:ring-offset-2 focus-visible:ring-offset-pine"
      >
        <span>{progress.started ? 'המשך לשיעור הבא' : 'התחלת השיעור הראשון'}</span>
        <ChevronLeft className="size-4 text-ember-soft" strokeWidth={2.6} />
      </Link>
    </aside>
  );
}
