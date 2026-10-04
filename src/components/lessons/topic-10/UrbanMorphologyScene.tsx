'use client';

import { useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
import {
  EnfiladeDiagram,
  URBAN_POSITION_COUNT,
  UrbanLegendGlyph,
  UrbanMap,
  type UrbanMapLabels,
} from './UrbanMorphologyMap';

type Pattern = 'grid' | 'casbah';

type PatternData = {
  id: Pattern;
  label: string;
  english: string;
  desc: string;
  losRange: string;
  movement: string;
  attacker: string;
  defender: string;
  example: string;
  icon: IconName;
  color: string;
  bg: string;
  border: string;
};

const PATTERNS: PatternData[] = [
  {
    id: 'grid',
    label: 'גריד עירוני',
    english: 'Urban Grid',
    desc: 'רחובות ישרים וארוכים שחותכים זה את זה בזוויות של 90 מעלות, כמו לוח שחמט. תחשבו על ערים מודרניות כמו ניו-יורק, וושינגטון או מרכז העיר התחתית בחיפה.',
    losRange: 'אפשר לראות (ולירות) למרחק של מאות מטרים קדימה לאורך השדרה. מצד שני, אי אפשר לראות בכלל מה קורה ברחובות המקבילים, בגלל הבניינים שמסתירים.',
    movement: 'הניווט קל אבל צפוי מראש. החיילים יודעים בדיוק מתי מגיע צומת ואיפה צריך לפנות – אבל גם האויב יודע את זה ויכול לחכות להם שם.',
    attacker: 'יתרון: קל לנווט, לעקוף דרך רחובות מקבילים, ולהבין איפה האויב נמצא. חיסרון: כוח שצועד ברחוב חשוף לגמרי לירי צלפים ארוך טווח (Enfilade) לאורך כל השדרה.',
    defender: 'יתרון: אפשר להפוך צמתים ל"צווארי בקבוק" – נקודות שליטה שכל מי שעובר בהן נחשף לאש. חיסרון: צריך לאבטח המון פינות וכיוונים בו-זמנית בגלל המבנה הפתוח.',
    example: 'בזמן הפלישה לבגדאד ב-2003, האמריקאים נסעו בשדרות הרחבות וחטפו טילי RPG מכל פינה. "רחוב חיפה" בעיר הפך לסיוט בדיוק בגלל זה – האויב פשוט ירה עליהם מרחוק, לאורך כל הרחוב הישר.',
    icon: 'compass',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/40',
  },
  {
    id: 'casbah',
    label: 'קסבה / סמטאות',
    english: 'Casbah / Old Quarter',
    desc: 'מבוך של סמטאות צפופות ומתפתלות, שבהן הבניינים כמעט נוגעים זה בזה. תחשבו על העיר העתיקה בירושלים, מחנות פליטים או קסבות עתיקות.',
    losRange: 'אי אפשר לראות רחוק. שדה הראייה חסום ומוגבל לפעמים למטרים בודדים בלבד. כל סיבוב פינה הוא הפתעה ועלול להוביל להיתקלות מטווח אפס.',
    movement: 'ניווט שהוא סיוט. ה-GPS מאבד קליטה בגלל הצפיפות והסמטאות המקורות, ומפות לא תמיד עוזרות. כדי באמת להתמצא שם, צריך להכיר את השטח ברגליים כמו מקומי.',
    attacker: 'חיסרון ענק: האויב יכול להציב מארב או מטען חבלה בכל סיבוב. בנוסף, צבא גדול לא יכול להיכנס לשם עם טנקים ונאלץ ללכת ברגל, בטור ארוך וצר, מה שהופך אותו למטרה קלה.',
    defender: 'יתרון מובהק: המגן משחק במגרש הביתי שלו. הוא מכיר כל דלת סתרים, כל גג וכל מנהרה, ויכול לתקוף את החיילים ולהיעלם תוך שניות.',
    example: 'באלג\'יריה (1957), המורדים שלטו לחלוטין בקסבה הצפופה של הבירה. כדי לנצח אותם, הצבא הצרפתי נאלץ לשלוח יחידות קומנדו שיעברו פיזית, ויכבשו את העיר מבית לבית, דלת אחרי דלת.',
    icon: 'eye',
    color: 'text-accent-hot',
    bg: 'bg-accent-hot/10',
    border: 'border-accent-hot/40',
  },
];

/** In-map labels — the same copy the old inline SVG carried. */
const MAP_LABELS: UrbanMapLabels = {
  grid: { los: 'קו ראייה ארוך · 800 מ׳', sniper: 'צלף בקצה הרחוב (Enfilade)' },
  casbah: { los: 'קו ראייה קצר מ-8 מ׳', threats: ['מארב פתע', 'מטען חבלה (IED)', 'מחבל מסתתר'] },
};

const MAP_CAPTION: Record<Pattern, string> = {
  grid: 'רחובות ישרים · קווי אש ארוכים · האויב יודע מאיפה תבואו',
  casbah: 'סמטאות מתפתלות · הראייה חסומה · איומים צצים מכל פינה',
};

/** Enfilade diagram labels — terms from the callout below. */
const ENFILADE_LABELS = { sniper: 'צלף', enfilade: 'Enfilade', ratRun: 'ריצת עכברים' };

const FORCE_LABEL = 'הכוח שלנו';

export function UrbanMorphologyScene() {
  const [pattern, setPattern] = useState<Pattern>('grid');
  // Force position on the aerial map (null = nothing selected).
  const [position, setPosition] = useState<number | null>(0);
  const meta = PATTERNS.find((p) => p.id === pattern)!;

  const choosePattern = (p: Pattern) => {
    setPattern(p);
    setPosition(0);
  };

  // Tabs: arrows follow the visual order (RTL — ArrowLeft/ArrowDown move forward).
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = PATTERNS.length;
    let next: number;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = (i + 1) % n;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    choosePattern(PATTERNS[next].id);
    document.getElementById(`urban-tab-${PATTERNS[next].id}`)?.focus();
  };

  return (
    <section id="scene-morphology" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="10.1"
        eyebrow="מורפולוגיה עירונית"
title = {
  <>
    <span className="text-accent-hover">אותה עיר</span> יכולה להיות שדרה פתוחה — או מבוך קטלני
  </>
}
        intro="הצורה הפיזית של העיר משפיעה על הקרב הרבה יותר מאשר סוג הנשק או כמות החיילים. הילחמות ברחוב ישר ומסודר שונה לחלוטין מהילחמות בסמטה צפופה ומתפתלת. זה לא רק עניין של נוף – כל סביבה דורשת שיטת לחימה שונה לחלוטין."
      />

      {/* Two SEPARATE feature cards side-by-side (matched pair, as in
          topic-09 ChokepointsScene). Promotes a tooltip-style block to core
          content. Eyebrows in brand green — orange is reserved for state. */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-12 items-stretch">
        {/* Card A — definition */}
        <div className="surface-elevated p-6 sm:p-8 rounded-2xl flex flex-col">
          <div className="inline-flex items-center gap-2 text-[13px] font-display font-semibold tracking-[0.2em] uppercase text-brand-dark mb-2.5">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            עיקרון מנחה
          </div>
          <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight mb-3 text-fg">
            MOUT <span className="text-fg-muted font-medium text-base sm:text-lg">(לש"ב · לוחמה בשטח בנוי)</span>
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            ראשי תיבות של <strong className="text-fg">Military Operations in Urban Terrain</strong> —
            דוקטרינה צבאית שלמה למבצעים בתוך עיר, שבה כל החוקים של קרב פתוח משתנים.
          </p>
        </div>

        {/* Card B — the critical characteristic */}
        <div className="surface-elevated p-6 sm:p-8 rounded-2xl flex flex-col">
          <div className="inline-flex items-center gap-2 text-[13px] font-display font-semibold tracking-[0.2em] uppercase text-brand-dark mb-2.5">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            המאפיין הקריטי
          </div>
          <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight text-fg mb-3">
            ק"מ בשטח פתוח ← מטרים בודדים, פנים אל פנים
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            בעיר היתרון של טנקים ומטוסי קרב מצטמצם דרמטית. <strong className="text-fg">הצד שמכיר את הסמטאות הכי טוב</strong> — הופך למכריע.
          </p>
        </div>
      </div>

      {/* Pattern tabs — accordion-style rows with a leading icon-badge and a
          brand active bar; the map card below is their tab panel. Arrow keys
          move between them (tabs are the keyboard path for the map). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="tablist" aria-label="מורפולוגיה עירונית">
        {PATTERNS.map((p, i) => {
          const isActive = pattern === p.id;
          return (
            <button
              key={p.id}
              id={`urban-tab-${p.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="urban-map-panel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => choosePattern(p.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cn(
                'relative rounded-xl border p-4 text-start flex items-center gap-3 transition-all duration-300 ease-snap cursor-pointer',
                isActive
                  ? 'border-accent bg-bg-elevated'
                  : 'border-border bg-bg-elevated hover:border-accent/50 hover:bg-accent/[0.04]',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="urban-pattern-bar"
                  className="absolute inset-y-3 end-0 w-1 bg-brand-dark rounded-full"
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  'size-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                  isActive
                    ? 'bg-accent text-bg-elevated border-accent'
                    : 'bg-bg-accent text-fg-muted border-border',
                )}
              >
                <Icon name={p.icon} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-base leading-tight text-fg">
                  {p.label}
                </div>
                <div className="text-[13px] font-display font-medium tracking-wide text-fg-dim mt-0.5">
                  {p.english}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Comparison map — the tab panel. Position chips (1–3) place our force;
          the lit area is computed from that spot (UrbanMorphologyMap). */}
      <div
        id="urban-map-panel"
        role="tabpanel"
        aria-labelledby={`urban-tab-${pattern}`}
        className="surface-elevated p-4 rounded-2xl mt-2 mb-6"
      >
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold text-brand-dark tracking-wider">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            מבט אווירי · {meta.label}
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: URBAN_POSITION_COUNT }, (_, i) => {
              const on = position === i;
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${FORCE_LABEL} ${i + 1}`}
                  onClick={() => setPosition(on ? null : i)}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-8 ps-2.5 pe-3 rounded-full border text-sm font-display font-bold transition-colors cursor-pointer',
                    on
                      ? 'border-accent bg-accent/10 text-fg'
                      : 'border-border bg-bg-elevated text-fg-muted hover:border-accent/50 hover:text-fg',
                  )}
                >
                  <UrbanLegendGlyph kind="force" />
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
        <div className="aspect-[16/9] relative rounded-xl overflow-hidden border border-border-subtle">
          <UrbanMap pattern={pattern} position={position} onPosition={setPosition} labels={MAP_LABELS} />
        </div>
        <p className="mt-3 text-center text-sm font-display font-semibold text-fg-muted">{MAP_CAPTION[pattern]}</p>
        <div className="mt-2 flex items-center justify-center gap-x-4 gap-y-1.5 text-[13px] font-display font-medium tracking-wide text-fg-dim flex-wrap">
          <span className="flex items-center gap-1.5"><UrbanLegendGlyph kind="force" /> הכוח שלנו</span>
          <span className="flex items-center gap-1.5"><UrbanLegendGlyph kind="lit" /> שטח מואר (LOS)</span>
          <span className="flex items-center gap-1.5"><UrbanLegendGlyph kind="dead" /> שטח מת</span>
          {/* Both threat states: in view (solid) / hidden in dead space (hollow) */}
          <span className="flex items-center gap-1.5"><UrbanLegendGlyph kind="threat" /><UrbanLegendGlyph kind="threat-unseen" /> איום פוטנציאלי</span>
        </div>
      </div>

      {/* Pattern details — readable, single-column reading flow with a
          stat strip up top. No more dense 2x2 grid of coloured panels;
          each property gets its own row with a clear eyebrow, an
          icon, and roomy `text-base` body copy. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={meta.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="surface-elevated p-6 sm:p-8 rounded-2xl mb-12"
        >
          {/* Header */}
          <div className="mb-6 pb-6 border-b border-border-subtle">
            <div className="inline-flex items-center gap-2 text-[13px] font-display font-semibold tracking-[0.2em] uppercase text-brand-dark mb-2">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
              {meta.english}
            </div>
            <h3 className="font-display font-bold text-2xl sm:text-3xl leading-tight mb-3 text-fg">{meta.label}</h3>
            <p className="text-base text-fg leading-relaxed text-pretty">{meta.desc}</p>
          </div>

          {/* Properties — vertical stack, each one a labelled paragraph
              with a small icon eyebrow. Reads like an article, not a
              dashboard. */}
          <div className="space-y-5 sm:space-y-6">
            <PropertyRow icon="eye" eyebrow="טווח קו ראייה (LOS)" text={meta.losRange} />
            <PropertyRow icon="truck" eyebrow="תנועה וניווט" text={meta.movement} />

            <div className="grid md:grid-cols-2 gap-5 sm:gap-6 pt-2">
              <RoleRow side="attacker" eyebrow="נקודת המבט של התוקף" text={meta.attacker} />
              <RoleRow side="defender" eyebrow="נקודת המבט של המגן" text={meta.defender} />
            </div>
          </div>

          {/* Historical example — quoted, restful end to the panel. */}
          <div className="mt-6 pt-6 border-t border-border-subtle">
            <div className="inline-flex items-center gap-2 text-[13px] font-display font-semibold tracking-[0.2em] uppercase text-fg-muted mb-2">
              <span className="size-1.5 rounded-full bg-fg-dim" aria-hidden />
              דוגמה היסטורית
            </div>
            <p className="text-base text-fg leading-relaxed italic text-pretty">"{meta.example}"</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Enfilade concept callout */}
      <div className="">
        <div className="flex gap-4 items-start">
          <Icon name="crosshair" size={32} className="text-brand-dark shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-display font-semibold text-brand-dark mb-1 tracking-wider">
              Enfilade (אש לאורך הציר) · מלכודת המוות של הרחובות הישרים
            </div>
            <h3 className="font-display font-bold text-lg leading-tight mb-2">
              קו אש שמכסה את כל אורך הרחוב
            </h3>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty">
              <strong className="text-fg">Enfilade ("אנפילייד")</strong> = מצב שבו צלף או מכונת ירייה מתמקמים בקצה של רחוב ישר, ויכולים לפגוע בקלות בכל מי שהולך בו, גם ממרחק של מאות מטרים. בעיר שבה הרחובות מסודרים ברשת ישרה (גריד), זהו האיום הכי קטלני על החיילים.
              <strong className="text-fg block mt-1.5">הפתרון בשטח:</strong> במקום ללכת ברחוב כמו מטרות נעות, החיילים נעים דרך גגות או שוברים קירות כדי לעבור בין בתים (שיטה שנקראת "ריצת עכברים"), ובכך עוקפים את הרחוב הראשי לחלוטין.
              <strong className="text-fg block mt-1.5">לזכור:</strong> בסטלינגרד, שדרה אחת ארוכה קיבלה את השם "שדרת המוות". חייל גרמני שהוציא את הראש לרחוב – נורה ומת תוך 3 שניות בממוצע.
            </p>
            {/* Same grid model as the aerial map: the avenue swept end-to-end,
                then the rat-run route through the houses beside it. */}
            <EnfiladeDiagram labels={ENFILADE_LABELS} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────── Helpers used by the details panel above ────── */

function PropertyRow({ icon, eyebrow, text }: { icon: IconName; eyebrow: string; text: string }) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <Icon name={icon} size={24} className="text-brand-dark shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-display font-semibold tracking-[0.2em] uppercase text-brand-dark mb-1.5">
          {eyebrow}
        </div>
        <p className="text-base text-fg leading-relaxed text-pretty">{text}</p>
      </div>
    </div>
  );
}

function RoleRow({ side, eyebrow, text }: { side: 'attacker' | 'defender'; eyebrow: string; text: string }) {
  return (
    <div className={cn(
      'rounded-2xl border p-4',
      side === 'attacker'
        ? 'border-accent-cool/30 bg-accent-cool/5'
        : 'border-accent-hot/30 bg-accent-hot/5',
    )}>
      <div className={cn(
        'inline-flex items-center gap-2 text-[13px] font-display font-semibold tracking-[0.2em] uppercase mb-2',
        side === 'attacker' ? 'text-accent-cool' : 'text-accent-hot',
      )}>
        <span className={cn('size-1.5 rounded-full', side === 'attacker' ? 'bg-accent-cool' : 'bg-accent-hot')} aria-hidden />
        {eyebrow}
      </div>
      <p className="text-sm sm:text-base text-fg leading-relaxed text-pretty">{text}</p>
    </div>
  );
}
