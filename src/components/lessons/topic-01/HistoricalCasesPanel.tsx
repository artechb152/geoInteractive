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

// stat/why are short takeaways distilled from `lesson` below (same source
// facts, not new claims) so the detail panel can show a scannable
// headline-fact + a generalized "why it matters" line, per the reference
// mockup — see design/assumptions.md.
const CASES: HistoricalCase[] = [
  {
    id: 'napoleon',
    number: '01',
    headline: 'הצבא הגדול בעולם נחרב — בלי קרב גדול',
    place: 'נפוליאון פולש לרוסיה · 1812',
    teaser: 'כוח אדיר, אך המרחק והחורף הכריעו.',
    lesson:
      'נפוליאון, השליט החזק באירופה, פלש לרוסיה עם 600,000 חיילים. הוא לא הפסיד בקרב — אבל המרחק העצום והחורף הקטלני הרגו 90% מהצבא לפני שהגיעו בכלל למוסקבה. המרחק והקור היו האויב האמיתי.',
    stat: 'מתוך 600,000 חיילים, כ-90% לא שרדו את המסע — לפני שהגיעו לקרב מכריע.',
    why: 'מרחק ולוגיסטיקה יכולים להכריע מלחמה בלי ירייה אחת — צבא שמתרחק מדי מבסיסי האספקה שלו נחלש עם כל ק"מ נוסף.',
    mapBadge: 'המסע לרוסיה',
    assetId: 'TOPIC01-ONB-HIST-NAPOLEON',
    assetSrc: '/assets/lessons/topic01/scene-onboarding/TOPIC01-ONB-HIST-NAPOLEON.png',
    assetAlt: 'מפה איזומטרית: נתיב צבאו של נפוליאון מצרפת למוסקבה, קו מסלול מקווקו',
    assetPrompt:
      'Isometric papercut map illustration, warm cream base, a dashed orange route line crossing from Western Europe deep into Russia toward Moscow, small circular waypoint markers, muted sage/olive terrain tones, no text, no flags, generous empty space for overlay.',
    previewAssetId: 'TOPIC01-ONB-HIST-NAPOLEON-PREVIEW',
    previewSrc: '/assets/lessons/topic01/scene-onboarding/TOPIC01-ONB-HIST-NAPOLEON-PREVIEW.png',
  },
  {
    id: 'channel',
    number: '02',
    headline: '32 ק"מ של מים שמרו על אימפריה',
    place: 'בריטניה · 200 שנה',
    teaser: 'תעלה צרה שקבעה את גורלה של אימפריה.',
    lesson:
      'תעלת למאנש היא רצועת הים בין אנגליה לצרפת — רק 32 ק"מ ברוחב הצר ביותר. אבל זה הספיק כדי למנוע פלישה צרפתית, גרמנית ונאצית במשך מאות שנים. רצועת המים הזו הייתה החייל הטוב ביותר של בריטניה.',
    stat: 'רוחב התעלה בנקודה הצרה ביותר — 32 ק"מ בלבד.',
    why: 'מכשול טבעי צר יכול לעצור אימפריות במשך מאות שנים — גם כשהיריב חזק בהרבה.',
    mapBadge: 'תעלת למאנש',
    assetId: 'TOPIC01-ONB-HIST-CHANNEL',
    assetSrc: '/assets/lessons/topic01/scene-onboarding/TOPIC01-ONB-HIST-CHANNEL.png',
    assetAlt: 'מפה איזומטרית: תעלת למאנש בין בריטניה לצרפת, קו מסלול מקווקו וסמן דובר-קלה',
    assetPrompt:
      'Isometric papercut map illustration, warm cream base, southern England and northern France coastlines with a narrow blue water channel between them, a dashed orange route line crossing the strait, two small circular waypoint markers (Dover / Calais), no text, no flags.',
    previewAssetId: 'TOPIC01-ONB-HIST-CHANNEL-PREVIEW',
    previewSrc: '/assets/lessons/topic01/scene-onboarding/TOPIC01-ONB-HIST-CHANNEL-PREVIEW.png',
  },
  {
    id: 'israel',
    number: '03',
    headline: 'ישראל ברוחבה הצר ביותר: 14 ק"מ בלבד',
    place: 'אזור השרון · ישראל',
    teaser: 'רוחב קריטי — כל ק"מ נחשב.',
    lesson:
      'במרכז ישראל — מנתניה ועד הגבול הירדני — יש רק 14 ק"מ ברוחב. כלומר, צבא אויב יכול לכאורה לחצות את המדינה לשניים בכמה שעות נסיעה. זה מחייב תפיסה צבאית שונה לחלוטין מאשר במדינות גדולות כמו רוסיה או ארה"ב.',
    stat: 'מנתניה ועד הגבול המזרחי — רק 14 ק"מ.',
    why: 'כשאין עומק אסטרטגי, כל מטר שטח הופך קריטי — וההגנה חייבת להתחיל הרבה לפני שהאויב מגיע.',
    mapBadge: 'רוחב המדינה',
    assetId: 'TOPIC01-ONB-HIST-ISRAEL',
    assetSrc: '/assets/lessons/topic01/scene-onboarding/TOPIC01-ONB-HIST-ISRAEL.png',
    assetAlt: 'מפה איזומטרית: רצועת השרון הצרה בישראל עם קו מדידה בין נתניה לגבול המזרחי',
    assetPrompt:
      'Isometric papercut map illustration, warm cream base, a narrow strip of coastal Israel (Sharon region) with a horizontal measurement line and orange dashed marker between two points, muted sage/olive terrain tones, no text, no flags.',
    previewAssetId: 'TOPIC01-ONB-HIST-ISRAEL-PREVIEW',
    previewSrc: '/assets/lessons/topic01/scene-onboarding/TOPIC01-ONB-HIST-ISRAEL-PREVIEW.png',
  },
  {
    id: 'switzerland',
    number: '04',
    headline: 'מדינה קטנה ששרדה שתי מלחמות עולם',
    place: 'שוויץ · 1914 ו-1939',
    teaser: 'נייטרלית, הררית ומוגנת — וזה הספיק.',
    lesson:
      'שוויץ — מדינה זעירה במרכז אירופה — לא נכבשה בשום מלחמה גדולה. ההרים הגבוהים שמקיפים אותה הופכים פלישה ליקרה ולמסוכנת מדי, גם בעיני צבא ענק כמו הצבא הנאצי. ההרים שווים יותר מצבא חזק.',
    stat: 'שוויץ לא נכבשה באף אחת משתי מלחמות העולם.',
    why: 'טופוגרפיה הררית יכולה להיות מגן חזק יותר מכל צבא — היא מייקרת פלישה עד שהיא כבר לא משתלמת.',
    mapBadge: 'המחסום ההררי',
    assetId: 'TOPIC01-ONB-HIST-SWITZERLAND',
    assetSrc: '/assets/lessons/topic01/scene-onboarding/TOPIC01-ONB-HIST-SWITZERLAND.png',
    assetAlt: 'מפה איזומטרית: מתאר גבולות שוויץ מוקף רכסי הרים גבוהים',
    assetPrompt:
      'Isometric papercut map illustration, warm cream base, a small country outline ringed by tall layered-paper mountain ridges in sage/olive tones, no text, no flags, generous empty space for overlay.',
    previewAssetId: 'TOPIC01-ONB-HIST-SWITZERLAND-PREVIEW',
    previewSrc: '/assets/lessons/topic01/scene-onboarding/TOPIC01-ONB-HIST-SWITZERLAND-PREVIEW.png',
  },
];

export function HistoricalCasesPanel() {
  const [activeId, setActiveId] = useState(CASES[0].id);
  const active = CASES.find((c) => c.id === activeId) ?? CASES[0];
  const activeIndex = CASES.findIndex((c) => c.id === activeId);

  return (
    <div className="relative isolate overflow-hidden rounded-[28px] bg-pine-grad p-5 shadow-pine-card sm:p-7 md:p-8">
      {/* Background texture — TOPIC01-ONB-HIST-BG.png; falls back to the
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
            {`ועכשיו — ${CASES.length} סיפורים אמיתיים מההיסטוריה`}
          </h3>
          <p className="mt-2 text-base text-paper-bright/70 md:text-lg">
            כשגיאוגרפיה, שטח והחלטות פוגשים מציאות
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
