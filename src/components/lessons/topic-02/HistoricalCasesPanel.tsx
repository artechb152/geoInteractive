'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
import { cn } from '@/lib/utils';

type HistoricalCase = {
  id: string;
  number: string;
  headline: string;
  place: string;
  teaser: string;
  lesson: string;
  stat: string;
  why: string;
  mapBadge: string;
  assetId: string;
  assetSrc: string;
  assetAlt: string;
  assetPrompt: string;
  previewAssetId: string;
  previewSrc: string;
};

// headline / place / lesson are moved verbatim from the FACTS array that
// used to render these four examples as IntelCards in OnboardingScene.tsx.
// teaser / stat / why / mapBadge are new slots this layout needs and the
// topic-02 source had no equivalent for — the wording below was written
// from the same source facts (no new claims) and approved by the user.
const CASES: HistoricalCase[] = [
  {
    id: 'grid',
    number: '01',
    headline: 'טעות של 100 מטר בגלל רשת ישנה',
    place: 'ישראל • שנות ה-2000',
    teaser: 'שדרוג רשת שהזיז כל נקודה על המפה.',
    lesson: 'צה"ל שדרג את רשת הקואורדינטות שלו (השפה שמייצרת נקודות ציון - נ"צ). המעבר גרם לנקודות על המפה "לזוז" ב-100 מטר. תותחן שהשתמש במפה ישנה, עלול היה לפגוע בטעות בכוחותינו במקום באויב.',
    stat: 'המעבר בין הרשתות הזיז נקודות על המפה ב-100 מטר.',
    why: 'נקודת ציון חסרת משמעות בלי לדעת באיזו רשת היא נמדדה — אותו מספר על מפה אחרת מצביע על מקום אחר.',
    mapBadge: 'רשת ישנה מול חדשה',
    assetId: 'TOPIC02-ONB-HIST-GRID',
    assetSrc: '/assets/lessons/topic02/scene-onboarding/TOPIC02-ONB-HIST-GRID.png',
    assetAlt: 'מפה איזומטרית: אותו שטח עם שתי רשתות קואורדינטות חופפות, היסט בין הנקודות המקבילות',
    assetPrompt:
      'Isometric papercut map illustration, warm cream base, one terrain tile overlaid by two offset coordinate grids in muted sage and orange, small paired markers showing the shift between them, no text, no flags, generous empty space for overlay.',
    previewAssetId: 'TOPIC02-ONB-HIST-GRID-PREVIEW',
    previewSrc: '/assets/lessons/topic02/scene-onboarding/TOPIC02-ONB-HIST-GRID-PREVIEW.png',
  },
  {
    id: 'normandy',
    number: '02',
    headline: 'לנחות בחוף הלא נכון',
    place: 'חופי נורמנדי • 1944',
    teaser: 'כל כוח קיבל מפה של הגזרה שלו בלבד.',
    lesson: 'מבצע הנחיתה הגדול בהיסטוריה דרש מפות סופר-מפורטות ("קנה מידה גדול"). כל כוח קיבל מפה מדויקת של הגזרה שלו. אם היו משתמשים במפות כלליות, חיילים היו נוחתים עיוורים ישר אל תוך האש.',
    stat: 'מבצע הנחיתה נשען על מפות בקנה מידה גדול — מפה נפרדת לכל גזרה.',
    why: 'קנה המידה חייב להתאים למשימה — מפה כללית מדי משאירה את הכוח בלי הפרטים שמכריעים ברגע המגע.',
    mapBadge: 'קנה מידה גדול',
    assetId: 'TOPIC02-ONB-HIST-NORMANDY',
    assetSrc: '/assets/lessons/topic02/scene-onboarding/TOPIC02-ONB-HIST-NORMANDY.png',
    assetAlt: 'מפה איזומטרית: קו חוף נורמנדי מחולק לגזרות נחיתה נפרדות, כל גזרה במסגרת משלה',
    assetPrompt:
      'Isometric papercut map illustration, warm cream base, a stretch of coastline divided into several adjacent landing sectors each outlined in a thin orange frame, beach and inland terrain in muted sage/sand tones, no text, no flags.',
    previewAssetId: 'TOPIC02-ONB-HIST-NORMANDY-PREVIEW',
    previewSrc: '/assets/lessons/topic02/scene-onboarding/TOPIC02-ONB-HIST-NORMANDY-PREVIEW.png',
  },
  {
    id: 'belgium',
    number: '03',
    headline: 'לנווט כשהעיניים לא רואות כלום',
    place: 'יערות בלגיה • דצמבר 1944',
    teaser: 'ראות אפס — והמפה היא העיניים היחידות.',
    lesson: 'נווט איבד את דרכו בסופת שלגים. כשהראות היא אפס, הדרך היחידה שלו לשרוד ולהבין אם הוא הולך לכיוון תהום או פסגה, הייתה "לדמיין" את צורת השטח דרך קווי הגובה המצוירים על המפה.',
    stat: 'בראות אפס, קווי הגובה היו הדרך היחידה להבחין בין פסגה לתהום.',
    why: 'קווי גובה הם לא קישוט — הם מאפשרים לראות את צורת השטח גם כשאי אפשר לראות את השטח עצמו.',
    mapBadge: 'קווי גובה',
    assetId: 'TOPIC02-ONB-HIST-BELGIUM',
    assetSrc: '/assets/lessons/topic02/scene-onboarding/TOPIC02-ONB-HIST-BELGIUM.png',
    assetAlt: 'מפה איזומטרית: רכס מיוער בסופת שלג, קווי גובה מסומנים מעל צורת השטח',
    assetPrompt:
      'Isometric papercut illustration, warm cream base, a forested ridge and a steep drop half-erased by white snow haze, thin concentric contour lines drawn over the terrain shape in muted sage, no text, no flags, generous empty space for overlay.',
    previewAssetId: 'TOPIC02-ONB-HIST-BELGIUM-PREVIEW',
    previewSrc: '/assets/lessons/topic02/scene-onboarding/TOPIC02-ONB-HIST-BELGIUM-PREVIEW.png',
  },
  {
    id: 'projection',
    number: '04',
    headline: 'מפת עולם משקרת במרחקים',
    place: 'תכנון שיגור טילים',
    teaser: 'אי אפשר לשטח כדור לדף בלי לעוות אותו.',
    lesson: 'אי אפשר "לשטח" כדור לדף נייר מבלי לעוות אותו. מפה שעובדת נהדר לניווט רגלי בעיר, תהיה שגויה לחלוטין בניסיון לחשב דרכה מסלול של טיל ארוך טווח.',
    stat: 'כל היטל של כדור על דף מעוות משהו — אין מפה שנכונה לכל שימוש.',
    why: 'המפה הנכונה תלויה בשאלה — היטל שמדויק לניווט בעיר יכול להיות שגוי לחלוטין לחישוב מסלול ארוך טווח.',
    mapBadge: 'עיוות ההיטל',
    assetId: 'TOPIC02-ONB-HIST-PROJECTION',
    assetSrc: '/assets/lessons/topic02/scene-onboarding/TOPIC02-ONB-HIST-PROJECTION.png',
    assetAlt: 'מפה איזומטרית: כדור הארץ נפרש לדף שטוח, העיוות גדל לכיוון השוליים',
    assetPrompt:
      'Isometric papercut illustration, warm cream base, a globe unpeeling into a flat sheet of paper, the grid squares stretching and distorting toward the sheet edges, muted sage/olive landmasses, no text, no flags.',
    previewAssetId: 'TOPIC02-ONB-HIST-PROJECTION-PREVIEW',
    previewSrc: '/assets/lessons/topic02/scene-onboarding/TOPIC02-ONB-HIST-PROJECTION-PREVIEW.png',
  },
];

export function HistoricalCasesPanel() {
  const [activeId, setActiveId] = useState(CASES[0].id);
  const active = CASES.find((c) => c.id === activeId) ?? CASES[0];
  const activeIndex = CASES.findIndex((c) => c.id === activeId);

  return (
    <div className="relative isolate overflow-hidden rounded-[28px] bg-pine-grad p-5 shadow-pine-card sm:p-7 md:p-8">
      {/* Background texture — deliberately loaded from the topic01 namespace:
          the panel chrome (BG + CARD-TEXTURE) is shared with lesson 1 by the
          user's decision, so editing lesson 1's art changes this panel too.
          Only the per-case art below lives under /assets/lessons/topic02/.

          TOPIC01-ONB-HIST-BG.png; falls back to the
          pine gradient above until the asset lands. The panel is much
          taller than the source image's 16:9 frame, so a single cover-fit
          copy stretches into a flat green band past the image's textured
          corners. Stack a second, vertically mirrored copy below it so the
          texture continues instead of flattening out. */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1/2">
          <IsometricAsset
            assetId="TOPIC01-ONB-HIST-BG"
            src="/assets/lessons/topic01/scene-onboarding/TOPIC01-ONB-HIST-BG.png"
            alt=""
            aspect="16/9"
            fit="cover"
            eager
            compactPlaceholder
            className="size-full bg-transparent"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1/2 -scale-y-100">
          <IsometricAsset
            assetId="TOPIC01-ONB-HIST-BG"
            src="/assets/lessons/topic01/scene-onboarding/TOPIC01-ONB-HIST-BG.png"
            alt=""
            aspect="16/9"
            fit="cover"
            eager
            compactPlaceholder
            className="size-full bg-transparent"
          />
        </div>
      </div>

      <div className="relative z-10">
        <div className="mb-6 text-center md:mb-8">
          <h3 className="font-display text-3xl font-extrabold leading-tight text-paper-bright md:text-4xl">
            לקרוא מפה — להציל חיים
          </h3>
          <p className="mt-2 text-base text-paper-bright/70 md:text-lg">
            כשקנה מידה, נ"צ וקווי גובה פוגשים מציאות
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-3.5">
          {CASES.map((c) => {
            const isActive = c.id === activeId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                aria-expanded={isActive}
                aria-controls="history-detail-panel"
                className={cn(
                  'relative rounded-2xl border p-4 text-right transition-all duration-300 ease-snap',
                  isActive
                    ? 'border-ember bg-ember/20'
                    : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]'
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-x-0 top-full mx-auto h-2 w-3.5 [clip-path:polygon(50%_100%,0%_0%,100%_0%)] transition-colors duration-300',
                    isActive ? 'bg-ember' : 'bg-white/20'
                  )}
                />
                <div className="flex items-start justify-between gap-1.5">
                  <div className="font-display text-base font-bold leading-snug text-paper-bright">
                    {c.headline}
                  </div>
                  <span
                    className={cn(
                      'shrink-0 font-display text-[46px] font-extrabold leading-none',
                      isActive ? 'text-ember' : 'text-paper-bright/35'
                    )}
                  >
                    {c.number}
                  </span>
                </div>
                <div
                  className={cn(
                    'mt-2 text-sm font-display font-semibold',
                    isActive ? 'text-ember-soft' : 'text-paper-bright/50'
                  )}
                >
                  {c.place}
                </div>
                <div className="mt-2.5 overflow-hidden rounded-lg">
                  <IsometricAsset
                    assetId={c.previewAssetId}
                    src={c.previewSrc}
                    alt={c.assetAlt}
                    aspect="21/9"
                    fit="cover"
                    compactPlaceholder
                  />
                </div>
                <div className="mt-2 text-sm leading-relaxed text-paper-bright/60">
                  {c.teaser}
                </div>
              </button>
            );
          })}
        </div>

        <div className="relative mt-4 h-6" aria-hidden>
          {/* Single full-width line — one literal element, so there is only
              ever one axis for every dot to sit on (no per-segment flex math
              that could drift a few px between columns). */}
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15" />
          {/* Dot overlay — same grid-cols/gap as the card grid, so each dot's
              cell centre is pixel-identical to its card's centre. */}
          <div className="absolute inset-0 grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-3.5">
            {CASES.map((c, i) => {
              const isActive = i === activeIndex;
              return (
                <div key={c.id} className="relative flex items-center justify-center">
                  {isActive && (
                    <span className="absolute top-1/2 h-[3px] w-2/3 -translate-y-1/2 rounded-full bg-ember" />
                  )}
                  <span
                    className={cn(
                      'relative rounded-full border-2 transition-all duration-300',
                      isActive ? 'size-6 border-ember-deep bg-ember ring-4 ring-ember/25' : 'size-4 border-white/25 bg-white/10'
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative mt-5 md:mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              id="history-detail-panel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="grid overflow-hidden rounded-2xl bg-paper-card bg-cover bg-center shadow-panel-soft md:grid-cols-[1.1fr_1fr]"
              style={{
                backgroundImage:
                  "url('/assets/lessons/topic01/scene-onboarding/TOPIC01-ONB-HIST-CARD-TEXTURE.png')",
              }}
            >
              {/* Text column — first child → right in RTL. */}
              <div className="flex flex-col p-6 md:p-8">
                <h4 className="font-display text-2xl font-bold leading-snug text-fg md:text-3xl">{active.headline}</h4>
                <div className="mt-1.5 font-display text-base font-semibold text-fg-muted">{active.place}</div>
                <div className="mt-3 border-t border-fg/10" />
                <p className="mt-3 text-base leading-relaxed text-fg md:text-lg">{active.lesson}</p>

                <div className="mt-4 rounded-xl bg-bg-accent px-4 py-3">
                  <p className="text-base font-display font-bold text-accent">עובדה מרכזית: {active.stat}</p>
                </div>

                <div className="mt-3 rounded-xl bg-pine px-4 py-3.5">
                  <div className="font-display text-sm font-bold tracking-wide text-ember">למה זה חשוב?</div>
                  <p className="mt-1 text-base leading-relaxed text-paper-bright/90">{active.why}</p>
                </div>
              </div>

              {/* Map illustration column — second child → left in RTL. Swap
                  the asset at each case's assetSrc; badge/label stay code.
                  Inset on all sides so the panel's own surface frames it
                  (reference: lesson1part2image2.png), instead of bleeding
                  edge-to-edge. */}
              <div className="relative min-h-[220px] p-4 md:p-5">
                <div className="relative h-full w-full overflow-hidden rounded-xl border border-border">
                  <IsometricAsset
                    assetId={active.assetId}
                    src={active.assetSrc}
                    alt={active.assetAlt}
                    aspect="16/9"
                    fit="cover"
                    prompt={active.assetPrompt}
                    className="absolute inset-0 h-full w-full [aspect-ratio:auto]"
                  />
                  <span className="chip absolute top-3 end-3 border-transparent bg-accent text-white">
                    {active.mapBadge}
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
