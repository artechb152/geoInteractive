import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { lessons } from '@/lib/lessons';
import { AssetSlot } from '@/components/design-approval/AssetSlot';
import { MockScreenPanel } from '@/components/design-approval/MockScreenPanel';
import {
  CompassEmblem,
  ContourBackdrop,
  DotGrid,
  RouteMotif,
} from '@/components/design-approval/motifs';
import {
  LESSON_CARD_SLOTS,
  LessonCardPlaceholder,
  MapBoardBackground,
  TerrainSlabPlaceholder,
} from '@/components/design-approval/placeholders';

export const metadata: Metadata = {
  title: 'מוקאפים לאישור עיצוב · גיאוגרפיה צבאית',
  description: 'מסכי אישור לשפת העיצוב "מפה צבאית מודרנית · פייפרקאט איזומטרי"',
  robots: { index: false, follow: false },
};

const MOCKUPS = [
  {
    href: '/design-approval/home/',
    tag: 'מסך הקורס',
    title: 'מוקאפ מסך הבית',
    description:
      'הירו עם לוח טרֵיין פייפרקאט, שורת סטטים ומסילת 12 שיעורים — עמוד הקורס בשפה החדשה.',
  },
  {
    href: '/design-approval/lesson/',
    tag: 'מסך השיעור',
    title: 'מוקאפ מסך השיעור',
    description:
      'שיעור 03 "ניווטים" בסצנת תכנון ציר: תוכן עניינים, לוח מפה וכרטיס מידע טקטי.',
  },
];

export default function DesignApprovalIndex() {
  return (
    <div className="relative flex-1">
      {/* קנבס: קרם + קווי גובה עדינים מאחורי הכול */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <ContourBackdrop tone="page" />
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        {/* ── כותרת ─────────────────────────────── */}
        <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <CompassEmblem />
          <div>
            <p className="text-[11px] font-display font-semibold uppercase tracking-[0.2em] text-accent">
              קורס גיאוגרפיה צבאית · אישור עיצוב
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-balance md:text-5xl">
              מוקאפים לאישור עיצוב
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-fg-muted md:text-lg">
              העמודים כאן מציגים את הכיוון העיצובי{' '}
              <strong className="font-semibold text-fg">
                &quot;מפה צבאית מודרנית · פייפרקאט איזומטרי&quot;
              </strong>{' '}
              לאישור בלבד — אלה אינם מסכי פרודקשן, והם אינם משנים דבר בקורס הקיים.
            </p>
          </div>
        </header>

        {/* ── קישורים לשני המוקאפים ─────────────── */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {MOCKUPS.map((mock) => (
            <Link
              key={mock.href}
              href={mock.href}
              className="group surface-elevated relative flex flex-col gap-3 p-6 transition-colors hover:border-accent"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="chip border-transparent bg-brand-dark font-display text-bg-elevated">
                  {mock.tag}
                </span>
                <span className="chip border-border-subtle bg-bg text-fg-dim">בבנייה</span>
              </div>
              <h2 className="font-display text-xl font-bold group-hover:text-accent">
                {mock.title}
              </h2>
              <p className="text-sm leading-relaxed text-fg-muted">{mock.description}</p>
              <span className="mt-auto inline-flex items-center gap-2 text-sm font-display font-semibold text-accent">
                <span>פתיחת המוקאפ</span>
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
              </span>
            </Link>
          ))}
        </div>

        {/* ── תצוגת התשתית המשותפת ─────────────── */}
        <div className="mt-14">
          <MockScreenPanel label="תשתית משותפת" className="mt-4">
            <div className="flex flex-col gap-10">
              <div>
                <p className="text-[11px] font-display font-semibold uppercase tracking-[0.2em] text-accent">
                  שפת העיצוב
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  רכיבי הבסיס של המוקאפים
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted md:text-base">
                  כל האיורים כאן הם SVG מלוטש שמחזיק את המסך עד שנכסי ה-Magnific יגיעו —
                  כל חריץ נכס נושא מזהה להחלפה עתידית בלי לשנות את הפריסה.
                </p>
              </div>

              {/* לוח הטרֵיין של ההירו — HOME-01 */}
              <figure>
                <div className="overflow-hidden rounded-2xl border border-border">
                  <AssetSlot
                    assetId="HOME-01"
                    src="/assets/isometric/home-hero-terrain.png"
                    alt="לוח טרֵיין פייפרקאט איזומטרי — הרים, נחל ודגלוני ניווט"
                    aspect="16/9"
                    placeholder={<TerrainSlabPlaceholder />}
                  />
                </div>
                <figcaption className="mt-2 text-xs text-fg-dim">
                  לוח הטרֵיין של ההירו (חריץ נכס HOME-01, יחס 16:9)
                </figcaption>
              </figure>

              {/* לוח המפה של מוקאפ השיעור */}
              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <figure>
                  <div className="relative overflow-hidden rounded-2xl border border-border aspect-[4/3]">
                    <MapBoardBackground className="absolute inset-0" />
                  </div>
                  <figcaption className="mt-2 text-xs text-fg-dim">
                    רקע לוח המפה של מסך השיעור (עיצוב SVG קבוע — שכבת הציר והסמנים תתווסף
                    במוקאפ, עם מקרא)
                  </figcaption>
                </figure>
                <div className="flex flex-col gap-4">
                  <figure className="surface flex flex-col items-center gap-3 p-5">
                    <div className="flex items-end gap-6">
                      <CompassEmblem className="size-20" />
                      <CompassEmblem className="size-9" />
                    </div>
                    <figcaption className="text-xs text-fg-dim">
                      אמבלמת המצפן — הירו ושורת כותרת (חריץ UI-COMPASS-ROSE)
                    </figcaption>
                  </figure>
                  <figure className="surface flex flex-col gap-2 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <RouteMotif className="h-12 w-28" />
                      <span className="chip border-border bg-bg/60 text-fg-muted backdrop-blur">
                        ציר מתוכנן
                      </span>
                    </div>
                    <figcaption className="text-xs text-fg-dim">
                      מוטיב ציר — רק בהקשר של מסלול אמיתי, תמיד עם מקרא
                    </figcaption>
                  </figure>
                  <figure className="surface relative overflow-hidden p-5">
                    <DotGrid />
                    <div className="relative h-10" />
                    <figcaption className="relative text-xs text-fg-dim">
                      גריד נקודות עדין — טקסטורת רקע חסכונית
                    </figcaption>
                  </figure>
                </div>
              </div>

              {/* 12 מיניאטורות כרטיסי השיעור */}
              <div>
                <h3 className="font-display text-lg font-bold">
                  מיניאטורות כרטיסי השיעור{' '}
                  <span className="text-sm font-medium text-fg-dim">
                    (חריצי LESSON-NN-CARD, יחס 1:1)
                  </span>
                </h3>
                <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {LESSON_CARD_SLOTS.map((slot) => (
                    <li key={slot.assetId} className="flex flex-col gap-1.5">
                      <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg">
                        <AssetSlot
                          assetId={slot.assetId}
                          src={slot.src}
                          alt={slot.alt}
                          aspect="1/1"
                          placeholder={<LessonCardPlaceholder variant={slot.variant} />}
                        />
                      </div>
                      <div className="flex items-baseline gap-1.5 px-0.5">
                        <span className="font-mono text-[11px] text-fg-dim">
                          {String(slot.lesson).padStart(2, '0')}
                        </span>
                        <span className="truncate text-[11px] text-fg-muted">
                          {lessons[slot.lesson - 1]?.shortTitle}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                {/* בדיקת קריאוּת במיניאטורה */}
                <div className="mt-5 flex items-center gap-3">
                  <span className="text-xs text-fg-dim">בדיקת קריאוּת ב-56px:</span>
                  <div className="flex items-center gap-2">
                    {(['navigation', 'landforms', 'urban', 'chokepoint'] as const).map((v) => (
                      <div key={v} className="size-14 overflow-hidden rounded-md border border-border-subtle">
                        <LessonCardPlaceholder variant={v} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </MockScreenPanel>
        </div>

        <p className="mt-10 text-center text-xs text-fg-dim">
          מוקאפ לאישור · אינו מסך פרודקשן · כל הנכסים הוויזואליים כאן הם SVG זמני עד
          לקבלת איורי ה-Magnific
        </p>
      </main>
    </div>
  );
}
