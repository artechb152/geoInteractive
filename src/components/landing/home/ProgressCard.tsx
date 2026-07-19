'use client';

import Link from 'next/link';
import { lessons, lessonDioramaSrc } from '@/lib/lessons';
import { useCourseProgress } from '@/lib/course-progress';

/**
 * ProgressCard — כרטיס "השיעור האחרון שלך" הכהה (פס תחתון-ימני):
 * מיני-דיורמת השיעור האחרון שביקרו בו, שמו, וכפתור primary "חזרה לשיעור"
 * שמחזיר לנקודה האחרונה (continueHref כולל #scene-<id> כשקיים).
 * מכשיר טרי: שיעור 01 + "התחלת השיעור הראשון".
 */
export function ProgressCard() {
  const progress = useCourseProgress();

  const lessonNumber = progress.visit?.topicNumber ?? 1;
  const lesson =
    lessons.find((l) => l.id === progress.activeTopicId) ?? lessons[0];

  return (
    <aside className="relative flex h-full flex-col items-center overflow-hidden rounded-3xl bg-pine-grad p-8 text-paper-bright shadow-pine-card">
      {/* הדגשה רכה במקום תצלום החייל החסר */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 18% 45%, rgba(243,233,220,0.10), transparent 70%)',
        }}
      />

      <h2 className="relative text-[22px] font-bold">השיעור האחרון שלך</h2>

      {/* מיני-דיורמת השיעור — ממורכזת אנכית ברווח הפנוי */}
      <div className="relative flex flex-1 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized */}
        <img
          src={lessonDioramaSrc(lessonNumber)}
          alt={`שיעור ${String(lessonNumber).padStart(2, '0')} — ${lesson.shortTitle}`}
          className="size-[265px] object-contain drop-shadow-lg"
        />
      </div>

      {/* שם השיעור והכפתור — צמודים כמעט לתחתית הכרטיסייה */}
      <div className="relative mt-auto flex w-full flex-col items-center gap-5 pt-6">
        <p className="text-center text-[17px] font-medium text-paper-bright/90">
          {progress.started
            ? `שיעור ${String(lessonNumber).padStart(2, '0')} · ${lesson.shortTitle}`
            : 'עוד לא התחלת את הקורס'}
        </p>

        <Link
          href={progress.continueHref}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cta-ember text-base font-bold text-white shadow-cta-ember transition duration-150 ease-snap hover:brightness-105 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft focus-visible:ring-offset-2 focus-visible:ring-offset-pine"
        >
          <span>{progress.started ? 'חזרה לשיעור' : 'התחלת השיעור הראשון'}</span>
        </Link>
      </div>
    </aside>
  );
}
