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

// headline / place / lesson are moved verbatim from the HISTORICAL array that
// used to render these four examples as IntelCards in OnboardingScene.tsx —
// same source text, same four cases, only the layout changed (matching
// topic-02/HistoricalCasesPanel.tsx's structure, per user request 2026-09-15).
// teaser / stat / why / mapBadge are new slots this layout needs and the
// topic-03 source had no equivalent for — every sentence below is derived
// directly from that same case's own `lesson` text (no new facts), and terms
// like "שטח שולט" / "שטח מת" reuse this lesson's own established vocabulary
// (see STEPS / TerrainStage in OnboardingScene.tsx). Written at the user's
// explicit request; images are being produced separately by the user from
// the assetPrompt briefs below.
const CASES: HistoricalCase[] = [
  {
    id: 'peak',
    number: '01',
    headline: 'ממעט טנקים על הפסגה — בלמו מאות בעמק',
    place: 'בקעת הבכא · יום הכיפורים 1973',
    teaser: 'כוח קטן על הפסגה עצר גל שריון עצום שזרם בעמק שמתחתיו.',
    lesson: 'במלחמת יום הכיפורים, הסורים שלחו מאות טנקים דרך עמקים מבלי לאבטח את השטח השולט מסביב. כוחות צה"ל שהתמקמו בכיפות (הפסגות) נהנו מעליונות בתצפית ובאש, ובלמו כוחות גדולים מהם פי 5.',
    stat: 'כוח שישב על השטח השולט בלם כוח שריון גדול ממנו פי 5.',
    why: 'מי ששולט בגובה רואה ראשון ויורה ראשון — וזה הופך יתרון עצום במספרים לחסר משמעות.',
    mapBadge: 'שטח שולט',
    assetId: 'TOPIC03-ONB-HIST-PEAK',
    assetSrc: '/assets/lessons/topic03/scene-onboarding/TOPIC03-ONB-HIST-PEAK.png',
    assetAlt: 'מפה איזומטרית: פסגה בודדת מביטה אל עמק מלא בסמלי טנקים זעירים',
    assetPrompt:
      'Isometric papercut map illustration, warm cream base, a single tan mountain peak with a small commanding-position marker overlooking a valley filled with tiny tank silhouettes, muted sage/olive terrain tones, no text, no flags, generous empty space for overlay.',
    previewAssetId: 'TOPIC03-ONB-HIST-PEAK-PREVIEW',
    previewSrc: '/assets/lessons/topic03/scene-onboarding/TOPIC03-ONB-HIST-PEAK-PREVIEW.png',
  },
  {
    id: 'wadi',
    number: '02',
    headline: 'טור אמריקאי בוואדי — אש מ-3 כיוונים',
    place: 'אפגניסטן · 2008',
    teaser: 'טור שנע בקרקעית הוואדי נלכד מלמעלה משלושה כיוונים בבת אחת.',
    lesson: 'יחידה אמריקאית התקדמה בתוך גיא (ואדי) צר. הטאליבן ניצל את השלוחות השולטות כדי לפתוח באש מ-3 כיוונים. התוצאה הייתה קטלנית, כי הכוח האמריקאי היה בנחיתות טופוגרפית מוחלטת בתוך העמק.',
    stat: 'האש הגיעה בו-זמנית מ-3 כיוונים, מהשלוחות השולטות מעל הוואדי.',
    why: 'כוח שנע בשטח נמוך בלי לאבטח קודם את השלוחות מעליו חשוף לאש מכל עבר.',
    mapBadge: 'אש מהשלוחות',
    assetId: 'TOPIC03-ONB-HIST-WADI',
    assetSrc: '/assets/lessons/topic03/scene-onboarding/TOPIC03-ONB-HIST-WADI.png',
    assetAlt: 'מפה איזומטרית: ואדי צר עם טור רכבים זעיר, שלושה חצים כתומים יורדים מהשלוחות מעליו',
    assetPrompt:
      'Isometric papercut illustration, warm cream base, a narrow steep-sided valley (wadi) with a line of tiny vehicle silhouettes moving along the floor, three thin orange fire-direction arrows converging on the column from the high ridgelines above, muted sage/sand tones, no text, no flags.',
    previewAssetId: 'TOPIC03-ONB-HIST-WADI-PREVIEW',
    previewSrc: '/assets/lessons/topic03/scene-onboarding/TOPIC03-ONB-HIST-WADI-PREVIEW.png',
  },
  {
    id: 'saddle',
    number: '03',
    headline: 'אוכף בין פסגות — עוקפים את ההגנה',
    place: 'נורמנדי · קיץ 1944',
    teaser: 'במקום להתנגש בפסגה המבוצרת, הם מצאו את הפרצה הטבעית שביניהן.',
    lesson: 'במקום לתקוף חזיתית פסגות מבוצרות, יחידה בריטית זיהתה אוכף — נקודת שפל נוחה למעבר בין שתי כיפות. המעבר דרך האוכף אפשר להם לעקוף את קווי ההגנה ולהפתיע את הגרמנים מהאגף.',
    stat: 'המעבר דרך האוכף איפשר עקיפה מלאה של ההגנה החזיתית המבוצרת.',
    why: 'לכל רכס יש נקודות מעבר טבעיות (אוכפים) שמאפשרות לעקוף עמדות מבוצרות בלי התנגשות חזיתית.',
    mapBadge: 'מעבר אוכף',
    assetId: 'TOPIC03-ONB-HIST-SADDLE',
    assetSrc: '/assets/lessons/topic03/scene-onboarding/TOPIC03-ONB-HIST-SADDLE.png',
    assetAlt: 'מפה איזומטרית: שתי פסגות עגולות עם אוכף נמוך ביניהן, נתיב מקווקו עובר דרכו',
    assetPrompt:
      'Isometric papercut map illustration, warm cream base, two rounded hill peaks with a clear low saddle pass between them, a dashed orange route line threading through the saddle and curving around a small fortified marker on one peak, muted sage/olive tones, no text, no flags, generous empty space for overlay.',
    previewAssetId: 'TOPIC03-ONB-HIST-SADDLE-PREVIEW',
    previewSrc: '/assets/lessons/topic03/scene-onboarding/TOPIC03-ONB-HIST-SADDLE-PREVIEW.png',
  },
  {
    id: 'bowl',
    number: '04',
    headline: 'מבוצרים בעמק — בלי שטח שולט, בלי תקומה',
    place: 'דיאן ביאן פו · ויאטנם 1954',
    teaser: 'מבצר בקרקעית העמק, מוקף מכל צד בפסגות שהופקרו לאויב.',
    lesson: 'הצרפתים התמקמו בעמק עמוק והפקירו את השטח השולט (השלוחות והפסגות) לוייטנאמים. התוצאה: הכוח הצרפתי הפך למטרה נייחת בתוך "שטח השמדה", מה שהוביל לתבוסה מוחלטת במלחמה.',
    stat: 'הכוח הצרפתי ישב בעמק כשכל השטח השולט מסביב היה בידי הוייטנאמים.',
    why: 'כוח שמוותר על השטח השולט סביבו הופך בעצמו למטרה קלה — גם אם הוא מבוצר היטב.',
    mapBadge: 'עמק השמדה',
    assetId: 'TOPIC03-ONB-HIST-BOWL',
    assetSrc: '/assets/lessons/topic03/scene-onboarding/TOPIC03-ONB-HIST-BOWL.png',
    assetAlt: 'מפה איזומטרית: מבצר בקרקעית עמק בצורת קערה, מוקף בטבעת פסגות שולטות',
    assetPrompt:
      'Isometric papercut illustration, warm cream base, a small fortified position sitting in the bottom of a bowl-shaped valley, surrounded on all sides by higher encircling ridgelines with tiny marker dots on the high ground, muted sage/olive tones, no text, no flags.',
    previewAssetId: 'TOPIC03-ONB-HIST-BOWL-PREVIEW',
    previewSrc: '/assets/lessons/topic03/scene-onboarding/TOPIC03-ONB-HIST-BOWL-PREVIEW.png',
  },
];

export function HistoricalCasesPanel() {
  const [activeId, setActiveId] = useState(CASES[0].id);
  const active = CASES.find((c) => c.id === activeId) ?? CASES[0];
  const activeIndex = CASES.findIndex((c) => c.id === activeId);

  return (
    <div className="relative isolate overflow-hidden rounded-[28px] bg-pine-grad p-5 shadow-pine-card sm:p-7 md:p-8">
      {/* Background texture — shared with topic-01/topic-02's own panel by
          the same project convention (see topic-02/HistoricalCasesPanel.tsx):
          the panel chrome (BG + CARD-TEXTURE) is cross-topic shared art, only
          the per-case art below lives under /assets/lessons/topic03/. */}
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
            כשלא קוראים נכון את ההר — המחיר עצום
          </h3>
          <p className="mt-2 text-base text-paper-bright/70 md:text-lg">
            כשגובה, שטח מת ושטח שולט קובעים מי מנצח
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

              {/* Map illustration column — second child → left in RTL. Inset
                  on all sides so the panel's own surface frames it, matching
                  topic-02/HistoricalCasesPanel.tsx's identical layout. */}
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
