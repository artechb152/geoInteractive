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
  lesson: string;
};

// headline / place / lesson are moved verbatim from the HISTORICAL array that
// used to render these four examples as IntelCards in OnboardingScene.tsx —
// same source text, same four cases, only the layout changed (matching
// topic-01/HistoricalCasesPanel.tsx's structure, per explicit user request
// 2026-09-23). Unlike topic-02/topic-03's own panels, no teaser / stat / why
// / map-illustration fields were added here — topic-04's source had no
// equivalent text or art for them and the user chose not to have new copy
// authored, so this panel shows only headline, place and the full existing
// lesson paragraph (see the accompanying Findings report).
const CASES: HistoricalCase[] = [
  {
    id: 'suez',
    number: '01',
    headline: 'לחצות תעלה ענקית בלילה אחד',
    place: 'תעלת סואץ · מלחמת יום הכיפורים 1973 ',
    lesson:
      'תעלת סואץ היא תעלת מים עמוקה ורחבה שהיוותה מכשול טבעי עצום. כדי להעביר את הטנקים של צה"ל לתוך מצרים, חיל ההנדסה יצא למבצע מורכב תחת אש ובחסות החשיכה, ובנה גשרים צפים מעל המים. ההתגברות על המכשול הזה פתחה לכוחותינו את הדרך לעומק מצרים, אפשרה לנו לעבור להתקפה ושינתה לחלוטין את מהלך המלחמה.',
  },
  {
    id: 'normandy',
    number: '02',
    headline: 'השיחים שעצרו טנקים ענקיים',
    place: 'נורמנדי (צרפת) · קיץ 1944',
    lesson:
      `באזור הלחימה בנורמנדי, השדות החקלאיים הופרדו בגדרות שנקראות "בוקאז'" – חומות של אדמה דחוסה שמעליהן צמחו שיחים סבוכים וקוצניים. הטנקים האמריקאים פשוט לא הצליחו לעבור דרכן! כל חלקה חקלאית קטנה הפכה למבצר טבעי, כי הגדרות האלו סיפקו לגרמנים גם מניעת ראייה ("הסתרה" בזכות השיחים) וגם הגנה פיזית ("מחסה" שעוצר כדורים בזכות סוללות האדמה). לבסוף, האמריקאים נאלצו לאלתר ולרתך "מזלגות" פלדה לקדמת הטנקים כדי לעקור את השיחים.`,
  },
  {
    id: 'vietnam',
    number: '03',
    headline: `הג'ונגל שנתן אשליה של ביטחון`,
    place: 'מלחמת וייטנאם · 1965–1973',
    lesson:
      `חיילים אמריקאים סמכו על צמחיית הג'ונגל הצפופה כדי להסתתר. הבעיה התחילה כשהתברר שגם מול קליעים של נשק קל, עלים וענפים לא עוצרים כלום. הלוחמים המקומיים (הוייטקונג) פשוט ירו בצרורות עיוורים לתוך הצמחייה ופגעו בהם בקלות. זה הוכיח בדרך הקשה שהסתרה היא ממש לא מחסה. הלקח: בשדה הקרב, מותר לסמוך רק על עצמים שיכולים פיזית לעצור כדור.`,
  },
  {
    id: 'lebanon',
    number: '04',
    headline: 'השילוב הקטלני: בונקרים בתוך יערות סבוכים',
    place: 'דרום לבנון · מלחמת לבנון השנייה (2006)',
    lesson:
      'חיזבאללה בנה בונקרים תת-קרקעיים עמוקים ויצוקים מבטון, ומיקם אותם בדיוק בתוך יערות וצמחייה צפופה. העצים והשיחים מנעו ממטוסים ורחפנים לזהות את הפתחים מלמעלה ("הסתרה"), והבטון העבה שמתחת לאדמה הגן על המחבלים מפני ההפצצות ("מחסה"). זה היה שילוב מושלם של טבע והנדסה, שבגללו צה"ל הצליח לגלות את רוב העמדות האלה רק כשחיילים ממש הגיעו אליהן ברגל.',
  },
];

export function HistoricalCasesPanel() {
  const [activeId, setActiveId] = useState(CASES[0].id);
  const active = CASES.find((c) => c.id === activeId) ?? CASES[0];
  const activeIndex = CASES.findIndex((c) => c.id === activeId);

  return (
    <div className="relative isolate overflow-hidden rounded-[28px] bg-pine-grad p-5 shadow-pine-card sm:p-7 md:p-8">
      {/* Background texture — shared cross-topic chrome, same convention as
          topic-01/topic-03's own panel (see topic-03/HistoricalCasesPanel.tsx):
          the panel chrome (BG + CARD-TEXTURE) lives under topic01's asset
          namespace by existing project design; topic-04 has no per-case art
          of its own (none was requested for this port). */}
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
            מאחורי כל קרב היסטורי גדול, עומד ניתוח נכון של השטח
          </h3>
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
                  'relative rounded-2xl border p-4 text-start transition-all duration-300 ease-snap',
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
              className="overflow-hidden rounded-2xl bg-paper-card bg-cover bg-center shadow-panel-soft"
              style={{
                backgroundImage:
                  "url('/assets/lessons/topic01/scene-onboarding/TOPIC01-ONB-HIST-CARD-TEXTURE.png')",
              }}
            >
              <div className="flex flex-col p-6 md:p-8">
                <h4 className="font-display text-2xl font-bold leading-snug text-fg text-balance md:text-3xl">{active.headline}</h4>
                <div className="mt-1.5 text-sm font-display font-semibold tracking-wider text-fg-muted">{active.place}</div>
                <div className="mt-3 border-t border-border" />
                <p className="mt-3 text-base leading-relaxed text-fg">{active.lesson}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
