'use client';

import Link from 'next/link';
import { useCourseProgress } from '@/lib/course-progress';
import { HomeTerrainDiorama } from './HomeTerrainDiorama';

/**
 * HomeHero — פס ההירו (design/mockup.png): עמודת טקסט בימין (inline-start),
 * דיורמת שטח משמאל.
 * "המשך ללמוד" ⇒ קישור לשיעור האחרון שביקרו בו (topic-01 במכשיר טרי);
 * "סקירת הקורס" ⇒ גלילה חלקה אל פאנל תכנית הקורס (#syllabus).
 */
export function HomeHero() {
  const progress = useCourseProgress();

  const scrollToSyllabus = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById('syllabus')
      ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <section className="mt-3 grid grid-cols-[330px_minmax(0,1fr)] items-center gap-8">
      {/* עמודת טקסט — ילד ראשון = ימין ויזואלי */}
      <div className="flex flex-col items-start">
        <h1 className="text-[58px] font-extrabold leading-[1.12] text-olive-ink">
          <span className="whitespace-nowrap">הבנה מרחבית.</span>
          <br />
          <span className="whitespace-nowrap">יתרון מבצעי.</span>
        </h1>

        <p className="mt-[18px] text-[23px] font-semibold leading-[1.35] text-olive-soft">
          לקרוא מפה. להעריך מרחב.
          <br />
          לקבל החלטות בשטח.
        </p>

        <Link
          href={progress.continueHref}
          aria-label={
            progress.started
              ? `המשך ללמוד — שיעור ${String(progress.visit?.topicNumber).padStart(2, '0')}, ${progress.visit?.topicShortTitle}`
              : 'המשך ללמוד — התחלת השיעור הראשון'
          }
          className="mt-9 flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl bg-cta-ember text-lg font-bold text-white shadow-cta-ember transition duration-150 ease-snap hover:brightness-105 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft focus-visible:ring-offset-2 focus-visible:ring-offset-paper-page"
        >
          <span>המשך ללמוד</span>
        </Link>

        <button
          type="button"
          onClick={scrollToSyllabus}
          className="mt-4 flex h-[45px] w-full items-center justify-center gap-2.5 rounded-xl border border-tanline bg-paper-bright/70 text-lg font-bold text-olive-ink transition duration-150 ease-snap hover:bg-paper-bright active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft focus-visible:ring-offset-2 focus-visible:ring-offset-paper-page"
        >
          <span>סקירת הקורס</span>
        </button>
      </div>

      {/* דיורמת שטח — מודל תלת-ממדי אינטראקטיבי (InteractiveHomeTerrainModel
          דרך HomeTerrainDiorama), באותו יחס-ממדים (706×492) ובאותה זווית
          כמו החיתוך המקורי מ-design/mockup.png; נופל חזרה לתמונה הסטטית
          אם WebGL לא זמין. */}
      <div className="flex items-center justify-end">
        <div className="-mt-14 me-6 aspect-[706/492] w-full max-w-[725px]">
          <HomeTerrainDiorama />
        </div>
      </div>
    </section>
  );
}
