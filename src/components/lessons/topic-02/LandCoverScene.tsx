'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { SortQuiz, type SortItem, type SortQuizVisuals } from './SortQuiz';
import { LandCoverMap } from './LandCoverMap';
import { VegetationLadder, type LadderItem } from './LandCoverVisuals';
import { LessonViewportFit } from '@/components/lesson/LessonViewportFit';
import { cn } from '@/lib/utils';

/** T1 section title (cleanup spec §3) — replaces the labelled SoftDivider; spacing instead of rules.
    Its top spacing (mt-12) sits on the screen's fit wrapper, outside the scaled composition. */
const SECTION_TITLE = 'mb-5 font-display text-2xl font-bold leading-tight text-fg sm:text-3xl';

/**
 * Laptop fit — each screen is its own LessonViewportFit, laid out at the 1920×1080 reference width
 * (the section's content box: max-w-lesson 1408 − lg:px-8) and shrunk uniformly where it doesn't fit.
 * The screens sit one under another in a scrolling section, so the measured ('auto') reserves only
 * work for the first screen's top; everywhere else the reserve is the sticky site header
 * (--header-h, 5rem from lg) plus a 24px gap above, and 24px below.
 */
const FIT_WIDTH = 1344;
const FIT_TOP = 80 + 24;
const FIT_BOTTOM = 24;
/** Tallest state at FIT_WIDTH, px (measured 2026-10-19): the workspace (the same height on every type
    and item), and the illustrated quiz (stage layout, choices centered on the illustration) before any answer
    — its feedback slot is reserved for the longest explanation and the completion line, so answering never
    grows it. Keeps the scale steady while feedback opens. */
const FIT_HEIGHT_WORKSPACE = 583;
const FIT_HEIGHT_QUIZ = 845;

/** Option (clickable) — idle / selected (cleanup spec §1, §2). LINKED = the idle hover look, shown
    while the item's region is hovered or focused on the map. */
const OPTION_IDLE = 'border-border bg-bg-elevated text-fg hover:border-brand/30 hover:bg-brand/[0.03]';
const OPTION_LINKED = 'border-brand/30 bg-brand/[0.03] text-fg';
const OPTION_ON = 'border-accent bg-accent/10 text-fg';
const ORIGIN_LABEL: Record<Origin, string> = { natural: 'טבעית', artificial: 'מלאכותית' };

/**
 * תת-נושא „תכסית” — ממשיך את התבליט ותבניות הנוף: מה נמצא על הקרקע.
 * חלוקה לפי מקור (טבעית / מלאכותית) ולפי סוג (צומח · פעילות האדם · תשתיות),
 * כולל הקשר בין מסלע, תבליט וצומח.
 * שלב layout: מבנה, תוכן ואינטראקציה. העיצוב הסופי ייקבע לפי מוקאפ.
 */

type Cat = 'vegetation' | 'human' | 'infra';
type Origin = 'natural' | 'artificial';

type CoverFeature = {
  id: string;
  label: string;
  cat: Cat;
  origin: Origin;
  desc: string;
};

const CATS: { id: Cat; label: string; def: string }[] = [
  {
    id: 'vegetation',
    label: 'צומח',
    def: 'הצמחייה שעל פני הקרקע, ובה עשב, שיחים ועצים. צומח יכול להיות טבעי או נטוע בידי אדם, כמו יער נטוע.',
  },
  {
    id: 'human',
    label: 'פעילות האדם',
    def: 'מרכיבי תכסית שנוצרו בעקבות בנייה ועיבוד חקלאי: יישובים, מבנים, שדות, מטעים וטרסות.',
  },
  {
    id: 'infra',
    label: 'תשתיות',
    def: 'מערכות ומתקנים שהאדם הקים לצורכי תנועה, אספקה ותיחום שטחים: דרכים, קווי חשמל, מערכות מים וגדרות.',
  },
];

const FEATURES: CoverFeature[] = [
  // צומח
  { id: 'grove',     label: 'חורש',          cat: 'vegetation', origin: 'natural',    desc: 'צומח הכולל עצים שגובהם מעל 2 מטרים, לצד שיחים ומטפסים בפיזור לא סדור. לפי צפיפות כיסוי צמרות העצים מבחינים בין חורש פתוח, חצי־סגור וסגור.' },
  { id: 'garrigue',  label: 'גריגה',         cat: 'vegetation', origin: 'natural',    desc: 'שיחים בגובה של כ־0.5–2 מטרים, במשטחים רציפים או ליד עצים.' },
  { id: 'batha',     label: 'בתה ועשבוני',   cat: 'vegetation', origin: 'natural',    desc: 'תצורות צומח נמוכות ללא עצים: בבתה בולטים בני־שיח נמוכים, עד כחצי מטר, ובצומח עשבוני בולטים עשבים.' },
  { id: 'planted',   label: 'יער נטוע',      cat: 'vegetation', origin: 'artificial', desc: 'יער שהאדם נטע, ובו עצים שעשויים להגיע לגובה של 5–6 מטרים ואף יותר. שורות סדורות ומרווחים קבועים בין העצים עשויים להעיד על נטיעה מתוכננת. לפי מקורו, היער מסווג כתכסית מלאכותית.' },
  // פעילות האדם
  { id: 'village',   label: 'יישוב ומבנים',  cat: 'human',      origin: 'artificial', desc: 'שטח בנוי הכולל בתים, מבני ציבור וחצרות. בכפר המוצג באיור יש גם כיכר מרכזית.' },
  { id: 'fields',    label: 'שדות (גד״ש)',   cat: 'human',      origin: 'artificial', desc: 'חלקות חקלאיות המשמשות לגידולי שדה (גד״ש). מראה הצומח וצבעו משתנים בהתאם לסוג הגידול, לשלב הצמיחה ולעונה.' },
  { id: 'orchard',   label: 'מטע',           cat: 'human',      origin: 'artificial', desc: 'שטח חקלאי שבו עצים נטועים בשורות ובמרווחים קבועים. באיור מוצג מטע הדרים, שעציו ירוקים לאורך השנה.' },
  { id: 'terraces',  label: 'טרסות',         cat: 'human',      origin: 'artificial', desc: 'מדרגות חקלאיות שהאדם יצר במדרון בעזרת קירות אבן, כדי לאפשר עיבוד על משטחים מישוריים.' },
  // תשתיות
  { id: 'road',      label: 'כביש',          cat: 'infra',      origin: 'artificial', desc: 'דרך סלולה שמחברת בין יישובים.' },
  { id: 'track',     label: 'דרך עפר',       cat: 'infra',      origin: 'artificial', desc: 'דרך לא סלולה המשמשת לתנועה בשטח, למשל לצורך גישה לשדות ולמטעים.' },
  { id: 'power',     label: 'קו מתח',        cat: 'infra',      origin: 'artificial', desc: 'תשתית להעברת חשמל, המורכבת מעמודים ומכבלים העוברים ביניהם.' },
  { id: 'reservoir', label: 'מאגר מים',      cat: 'infra',      origin: 'artificial', desc: 'מתקן לאגירת מים לצורכי השקיה. המאגר משתלב במערכת אספקת מים הכוללת צינורות או תעלות.' },
  { id: 'fence',     label: 'גדר',           cat: 'infra',      origin: 'artificial', desc: 'מתקן לתיחום שטח ולהסדרת הכניסה אליו. באיור הגדר מקיפה את המטע וכוללת שער אחד.' },
];

const ORIGIN_IMAGE_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/land-cover-definitions`;
const ORIGIN_IMAGE_ALT: Record<Origin, string> = {
  natural: 'חורש ושיחים ים־תיכוניים שגדלו בפיזור טבעי ללא שורות נטיעה',
  artificial: 'בתים וכביש לצד מטע בשורות ושדה מעובד, שנוצרו בידי אדם',
};

/** Mediterranean vegetation, low → high (content/topic-04.md, 4.4). */
const VEG_LADDER: LadderItem[] = [
  { label: 'עשבוני', height: 'נמוך, ללא עצים', description: 'תצורת צומח שבה בולטים עשבים, ללא עצים. עשבים חד־שנתיים מוריקים לאחר נביטת החורף ומתייבשים בקיץ, כך שצבע הקרקע נעשה בולט יותר.' },
  { label: 'בתה', height: 'עד כחצי מטר', description: 'תצורת צומח המשלבת בני־שיח נמוכים ועשבים. השינוי העונתי בצבע בולט, ובין הצמחים ניתן להבחין בשבילים ובמרעולים.' },
  { label: 'גריגה', height: 'כ־0.5–2 מטרים', description: 'תצורת צומח שבה בולטים שיחים, במשטחים רציפים או בסמוך לעצים. לעומת הבתה, השיחים גבוהים יותר, וצבעם משתנה בין החורף לקיץ.' },
  { label: 'חורש', height: 'עצים מעל 2 מטרים', description: 'תצורת צומח המשלבת עצים, שיחים ומטפסים. בחורש פתוח נראים קרקע או סלע בין העצים; בחורש סגור הצמרות נוגעות זו בזו והקרקע מוסתרת כמעט לחלוטין.' },
  { label: 'יער נטוע', height: 'לעיתים מעל 5–6 מטרים · נטוע', planted: true, description: 'עצים שניטעו בידי אדם. שורות סדורות ומרווחים קבועים עשויים להעיד על נטיעה מתוכננת; לפי מקורו, היער מסווג כתכסית מלאכותית.' },
];

const EASE = [0.22, 1, 0.36, 1] as const;

const QUIZ_ITEMS: SortItem<Origin>[] = [
  { id: 'q-grove',     label: 'חורש',        answer: 'natural',    why: 'העצים והשיחים בחורש גדלו באופן טבעי, ולכן הוא תכסית טבעית.' },
  { id: 'q-citrus',    label: 'מטע הדרים',   answer: 'artificial', why: 'עצי המטע ניטעו בידי אדם, ולכן המטע הוא תכסית מלאכותית.' },
  { id: 'q-garrigue',  label: 'גריגה',       answer: 'natural',    why: 'גריגה היא תצורת שיחים שגדלו באופן טבעי, ולכן היא תכסית טבעית.' },
  { id: 'q-planted',   label: 'יער נטוע',    answer: 'artificial', why: 'היער נוצר בנטיעה בידי אדם, ולכן הוא תכסית מלאכותית.' },
  { id: 'q-terraces',  label: 'טרסות',       answer: 'artificial', why: 'הטרסות נבנו בידי אדם לצורך עיבוד חקלאי, ולכן הן תכסית מלאכותית.' },
  { id: 'q-batha',     label: 'בתה',         answer: 'natural',    why: 'בני־השיח בבתה גדלו באופן טבעי, ולכן היא תכסית טבעית.' },
  { id: 'q-reservoir', label: 'מאגר מים',    answer: 'artificial', why: 'המאגר המוצג הוקם בידי אדם לצורכי השקיה, ולכן הוא תכסית מלאכותית.' },
  { id: 'q-wheat',     label: 'שדה חיטה',    answer: 'artificial', why: 'החיטה נזרעה בשטח שהאדם מעבד, ולכן השדה הוא תכסית מלאכותית.' },
];

/** Quiz illustrations (2026-10-19 handoff, design/handoff/landcover-origin-classification-2026-10-19):
 *  WebP siblings of the transparent PNG sources, made by scripts/media/package-landcover-origin-classification.cjs.
 *  The orange outline is baked into each item's art — no frame or filter is added around it. The alts
 *  describe what is seen, never the category. */
const QUIZ_IMAGE_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/landcover-origin-classification`;
const QUIZ_VISUALS: SortQuizVisuals<Origin> = {
  items: {
    'q-grove':     { src: `${QUIZ_IMAGE_BASE}/item-grove.webp`,          alt: 'חורש קטן עם עצים ושיחים בפיזור לא סדור, מסומן בקו כתום' },
    'q-citrus':    { src: `${QUIZ_IMAGE_BASE}/item-citrus-orchard.webp`, alt: 'מטע הדרים עם עצים בשורות סדורות ופירות כתומים, גבול החלקה מסומן בקו כתום' },
    'q-garrigue':  { src: `${QUIZ_IMAGE_BASE}/item-garrigue.webp`,       alt: 'גריגה עם שיחים בינוניים צפופים בפיזור לא סדור, מסומנת בקו כתום' },
    'q-planted':   { src: `${QUIZ_IMAGE_BASE}/item-planted-forest.webp`, alt: 'יער נטוע קטן עם עצים גבוהים במרווחים קבועים ובשורות, מסומן בקו כתום' },
    'q-terraces':  { src: `${QUIZ_IMAGE_BASE}/item-terraces.webp`,       alt: 'שלוש טרסות חקלאיות במדרון עם קירות תמך מאבן, מסומנות בקו כתום' },
    'q-batha':     { src: `${QUIZ_IMAGE_BASE}/item-batha.webp`,          alt: 'בתה עם בני שיח נמוכים ועשבים בין כתמי קרקע חשופה, מסומנת בקו כתום' },
    'q-reservoir': { src: `${QUIZ_IMAGE_BASE}/item-reservoir.webp`,      alt: 'מאגר מים בעל דפנות סדורות וסוללת עפר, שפת המאגר מסומנת בקו כתום' },
    'q-wheat':     { src: `${QUIZ_IMAGE_BASE}/item-wheat-field.webp`,    alt: 'שדה חיטה מעובד בחלקה מלבנית ובשורות מקבילות, גבול החלקה מסומן בקו כתום' },
  },
  options: {
    natural: `${QUIZ_IMAGE_BASE}/choice-natural.webp`,
    artificial: `${QUIZ_IMAGE_BASE}/choice-artificial.webp`,
  },
};

export function LandCoverScene() {
  const [cat, setCat] = useState<Cat>('vegetation');
  /** +1 when the new topic is a later tab (further left in RTL), −1 when an earlier one */
  const [dir, setDir] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** The item pointed at — in the list or on the map; both sides show it */
  const [hoverId, setHoverId] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeCat = CATS.find((c) => c.id === cat)!;
  const selected = FEATURES.find((f) => f.id === selectedId) ?? null;
  const slide = { duration: reduce ? 0 : 0.38, ease: EASE };

  const toCat = (id: Cat) => {
    if (id === cat) return;
    setDir(CATS.findIndex((c) => c.id === id) > CATS.findIndex((c) => c.id === cat) ? 1 : -1);
    setCat(id);
  };

  /** From the map or the list. Picking the selected item again steps back to the topic (as in
      „זיהוי תבליט ותכסית בשטח”). */
  const selectFeature = (id: string) => {
    const f = FEATURES.find((x) => x.id === id);
    if (!f) return;
    toCat(f.cat);
    setSelectedId((cur) => (cur === id ? null : id));
  };

  const chooseCat = (id: Cat) => {
    toCat(id);
    setSelectedId(null);
    setHoverId(null);
  };

  /** Tabs follow the WAI-ARIA pattern; in RTL ArrowLeft moves forward. */
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const n = CATS.length;
    let next = -1;
    if (e.key === 'ArrowLeft') next = (idx + 1) % n;
    else if (e.key === 'ArrowRight') next = (idx - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    chooseCat(CATS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="scene-landcover" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* ── Screen 1: natural vs. artificial — one flat info card, so the map workspace is the first strong surface ── */}
      <LessonViewportFit referenceWidth={FIT_WIDTH} reserveBottom={FIT_BOTTOM}>
        <SceneHeader
          title="תכסית: זיהוי וסיווג המרכיבים שעל פני הקרקע"
          intro="לאחר שהכרנו את מבנה הקרקע ואת סוגי הסלעים, נבחן את התכסית — המרכיבים שנמצאים על פני הקרקע. נלמד לסווג אותם לפי מקורם, טבעי או מלאכותי, ולפי סוגם: צומח, פעילות האדם ותשתיות."
        />

        <div className="surface p-5 sm:p-6">
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
            <OriginCard
              title="תכסית טבעית"
              tone="natural"
              body="תכסית שמקורה בתהליכים טבעיים, כגון עשב, שיחים וחורש שגדלו ללא זריעה או נטיעה בידי אדם."
            />
            <OriginCard
              title="תכסית מלאכותית"
              tone="artificial"
              body="תכסית שהאדם יצר או עיצב באמצעות בנייה, חקלאות והקמת תשתיות, ובה יישובים, שדות ודרכים."
            />
          </div>
          <div className="mt-6 rounded-xl bg-bg-accent/60 p-4">
            <p className="font-display text-base font-bold text-fg">סיווג צומח לפי מקורו</p>
            <p className="mt-1 text-base leading-relaxed text-fg-muted">
              יער נטוע, מטע ושדה מסווגים כתכסית מלאכותית משום שנוצרו בנטיעה או בזריעה בידי אדם.
              שורות ישרות, מרווחים קבועים וגבולות חלקה ברורים עשויים לסייע בזיהוי פעילות זו.
            </p>
          </div>
        </div>
      </LessonViewportFit>

      {/* ── Screen 2: three types, on one map sample ── */}
      <LessonViewportFit
        referenceWidth={FIT_WIDTH}
        referenceHeight={FIT_HEIGHT_WORKSPACE}
        reserveTop={FIT_TOP}
        reserveBottom={FIT_BOTTOM}
        className="mt-12"
      >
        {/* One workspace: the title, then tabs + explanation/items beside the map — the screen's visual focus.
            The tabs head the controls column, so the map's top edge lines up with them. */}
        <div className="surface-elevated p-5 sm:p-6">
          <h3 className={SECTION_TITLE}>זיהוי סוגי תכסית בשטח</h3>
          <div className="grid lg:grid-cols-[1fr_1.6fr] gap-6 lg:gap-8 items-stretch">
            {/* Tabs + explanation + items + the result inset (first child → right in RTL); the inset
                stretches, so the column ends level with the map's tile */}
            <div className="flex flex-col gap-5">
              {/* the topics: a tab bar (text on a hairline, the active one underlined) — set apart from
                  the item buttons below, which pick one specific thing */}
              <div className="flex gap-7 border-b border-border" role="tablist" aria-label="סוגי תכסית">
                {CATS.map((c, i) => {
                  const on = cat === c.id;
                  return (
                    <button
                      key={c.id}
                      ref={(el) => {
                        tabRefs.current[i] = el;
                      }}
                      id={`${uid}-tab-${c.id}`}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      aria-controls={`${uid}-panel`}
                      tabIndex={on ? 0 : -1}
                      onClick={() => chooseCat(c.id)}
                      onKeyDown={(e) => onTabKey(e, i)}
                      className={cn(
                        'relative -mb-px cursor-pointer pb-3 pt-1 font-display text-base font-bold',
                        'transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:ring-offset-bg-elevated',
                        on ? 'text-fg' : 'text-fg-muted hover:text-fg',
                      )}
                    >
                      {c.label}
                      {on && (
                        <motion.span
                          layoutId={`${uid}-tab-ink`}
                          aria-hidden
                          className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-accent"
                          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* The panel: the topic's definition right under its tab (it belongs to the topic), then
                  the item row under its own label (it picks one thing on the map). Both slide in from
                  the side of the tab (no cross-fade); the label stays put. The padding keeps the item
                  buttons' focus ring inside the clip. */}
              <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${cat}`}>
                <TopicSlide id={cat} dir={dir} transition={slide} reduce={!!reduce}>
                  <p className="text-base text-fg-muted leading-relaxed">{activeCat.def}</p>
                </TopicSlide>

                <div className="mt-5 mb-2.5 text-sm font-display font-semibold text-fg-muted">
                  בחרו רכיב באיור או ברשימה
                </div>
                {/* same item recipe as „זיהוי תבליט ותכסית בשטח”: the category's items fill one row,
                    equal widths; an item lights its region on the map while pointed at, and the other way round */}
                <TopicSlide id={cat} dir={dir} transition={slide} reduce={!!reduce}>
                  <div className="flex gap-1.5">
                    {FEATURES.filter((f) => f.cat === cat).map((f) => {
                      const on = selectedId === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => selectFeature(f.id)}
                          onMouseEnter={() => setHoverId(f.id)}
                          onMouseLeave={() => setHoverId(null)}
                          onFocus={(e) => e.currentTarget.matches(':focus-visible') && setHoverId(f.id)}
                          onBlur={() => setHoverId(null)}
                          className={cn(
                            'flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-xl border px-1.5 py-2 text-sm font-display font-bold cursor-pointer',
                            'transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:ring-offset-bg-elevated',
                            on ? OPTION_ON : hoverId === f.id ? OPTION_LINKED : OPTION_IDLE,
                          )}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </TopicSlide>
              </div>

              {/* The inset is always there (as in „זיהוי תבליט ותכסית בשטח”); only its text swaps — the new
                  text slides in from the reading side and the box flashes once in the selection tint. */}
              <div aria-live="polite" className="relative isolate flex-1 rounded-xl bg-bg-accent/60 p-4 min-h-[112px]">
                {selected && !reduce && (
                  <motion.span
                    key={selected.id}
                    aria-hidden
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: EASE }}
                    className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-accent/10"
                  />
                )}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={selected?.id ?? 'empty'}
                    initial={{ opacity: 0, x: reduce ? 0 : 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: reduce ? 0 : -6 }}
                    transition={{ duration: 0.18, ease: EASE }}
                  >
                    {selected ? (
                      <>
                        {/* name + its origin (screen 1's two kinds), as the reference names the layer */}
                        <div className="mb-2">
                          <h4 className="font-display text-lg font-bold leading-snug text-fg md:text-xl">{selected.label}</h4>
                          <div className="mt-0.5 text-sm font-display font-semibold text-fg-muted">
                            תכסית {ORIGIN_LABEL[selected.origin]}
                          </div>
                        </div>
                        <p className="text-base text-fg leading-relaxed">{selected.desc}</p>
                      </>
                    ) : (
                      <p className="text-base text-fg-muted leading-relaxed">
                        בחרו רכיב כדי לקרוא את תיאורו ואת מאפייניו בשטח.
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Map sample — sits directly in the workspace; the paper tile is its own neat-line.
                The negative margins cancel the viewBox's margins around the tile (6 units above, 5 below
                its rim, of 412 across — a % margin is a share of the column's width), so the tile's top
                meets the tabs' top and its bottom the inset's. */}
            <div className="self-start lg:-mt-[1.456%] lg:-mb-[1.214%]">
              <LandCoverMap
                features={FEATURES}
                cat={cat}
                selectedId={selectedId}
                onSelect={selectFeature}
                hoverId={hoverId}
                onHover={setHoverId}
                ariaLabel="מבט מלמעלה על שטח לדוגמה: חורש, גריגה, בתה, יער נטוע, כפר, שדות, מטע, טרסות, כביש, דרך עפר, קו מתח, מאגר מים וגדר"
              />
            </div>
          </div>
        </div>
      </LessonViewportFit>

      {/* ── Screen 3: vegetation, and what shapes it ── */}
      <LessonViewportFit referenceWidth={FIT_WIDTH} reserveTop={FIT_TOP} reserveBottom={FIT_BOTTOM} className="mt-12">
        {/* the title heads the ladder's own card; the factors beside it are a separate info card */}
        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-stretch">
          <div className="surface-elevated p-5 sm:p-6">
            <h3 className={SECTION_TITLE}>תצורות הצומח וגובהן</h3>
            <div className="text-sm font-display font-semibold text-fg-muted mb-3">
              תצורות הצומח במרחב הים־תיכוני — לפי הגובה
            </div>
            <VegetationLadder items={VEG_LADDER} legend="מסגרת בקו מקווקו מציינת צומח שניטע בידי אדם." />
          </div>

          <div className="surface p-5 sm:p-6">
            <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl">הגורמים המשפיעים על הצומח</h3>
            <p className="mt-2 text-base text-fg-muted leading-relaxed">
              סוג הצומח, גובהו וצפיפותו מושפעים מתנאי השטח והסביבה:
            </p>
            {/* each item leads with its bold factor — spacing separates them, no bullet dots */}
            <ul className="mt-4 space-y-3 text-base text-fg-muted leading-relaxed">
              <li>
                <span>
                  <strong className="text-fg">התבליט</strong> — הגובה מעל פני הים וכיוון המדרון, הנקרא מפנה. במרחב הים־תיכוני בישראל, מדרון צפוני מקבל לרוב פחות קרינה ישירה ממדרון דרומי. הבדל זה עשוי להתבטא בצומח צפוף וגבוה יותר במפנה הצפוני.
                </span>
              </li>
              <li>
                <span>
                  <strong className="text-fg">המסלע והקרקע</strong> — סוג הסלע, עומק הקרקע ותכונותיה משפיעים על תנאי הצמיחה. יש לבחון אותם יחד עם האקלים ותנאי השטח, ולא להסיק על סוג הצומח מסוג הסלע בלבד.
                </span>
              </li>
              <li>
                <span>
                  <strong className="text-fg">האקלים</strong> — כמות המשקעים, פיזורם לאורך השנה והטמפרטורות.
                </span>
              </li>
              <li>
                <span>
                  <strong className="text-fg">פעילות האדם</strong> — כריתה, רעייה, נטיעה ועיבוד חקלאי משנים את הרכב הצומח ואת פיזורו.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </LessonViewportFit>

      {/* ── Screen 4: quick check ── */}
      <LessonViewportFit
        referenceWidth={FIT_WIDTH}
        referenceHeight={FIT_HEIGHT_QUIZ}
        reserveTop={FIT_TOP}
        reserveBottom={FIT_BOTTOM}
        className="mt-12"
      >
        <SortQuiz
          layout="stage"
          heading="תרגול: סיווג התכסית לפי מקור"
          title="טבעית או מלאכותית?"
          prompt="סווגו כל רכיב כתכסית טבעית או מלאכותית לפי מקורו. לאחר הבחירה יוצג הסבר לסיווג."
          options={[
            { id: 'natural', label: 'טבעית', feedbackLabel: 'תכסית טבעית' },
            { id: 'artificial', label: 'מלאכותית', feedbackLabel: 'תכסית מלאכותית' },
          ]}
          items={QUIZ_ITEMS}
          visuals={QUIZ_VISUALS}
          centerChoices
          showScore={false}
          showPosition={false}
          showFinalScore={false}
          hint="בחרו טבעית או מלאכותית"
          doneText="סיימתם את סיווג התכסית לפי מקור. אפשר לבחור רכיב כדי לעיין שוב בהסבר."
        />
      </LessonViewportFit>
    </section>
  );
}

/** A piece of the topic panel that slides in from the side of its tab when the topic changes. */
function TopicSlide({
  id,
  dir,
  transition,
  reduce,
  children,
}: {
  id: string;
  dir: number;
  transition: { duration: number; ease: typeof EASE };
  reduce: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative -m-1.5 overflow-hidden p-1.5">
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.div
          key={id}
          custom={dir}
          variants={{
            // RTL: a later tab sits to the left, so its content comes in from the left
            enter: (d: number) => ({ x: d > 0 ? '-100%' : '100%' }),
            center: { x: 0 },
            leave: (d: number) => ({ x: d > 0 ? '100%' : '-100%' }),
          }}
          initial={reduce ? false : 'enter'}
          animate="center"
          exit={reduce ? undefined : 'leave'}
          transition={transition}
        >
          <LeavingInert>{children}</LeavingInert>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** The outgoing topic stays on screen while it slides out; it must not take focus meanwhile
    (a quick Tab after a tab change would land on a button that is about to vanish). */
function LeavingInert({ children }: { children: React.ReactNode }) {
  const present = useIsPresent();
  return <div inert={!present}>{children}</div>;
}

function OriginCard({
  title,
  tone,
  body,
}: {
  title: string;
  tone: Origin;
  body: string;
}) {
  return (
    <article className="flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl pt-1">
          {title}
        </h3>
        <p className="mt-1 text-base text-fg-muted leading-relaxed">{body}</p>
      </div>
      <Image
        src={`${ORIGIN_IMAGE_BASE}/${tone}.webp`}
        alt={ORIGIN_IMAGE_ALT[tone]}
        width={132}
        height={90}
        className="block h-[90px] w-[132px] shrink-0 rounded-lg bg-paper-card object-cover"
      />
    </article>
  );
}
