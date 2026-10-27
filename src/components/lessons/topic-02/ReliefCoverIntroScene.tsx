'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { SortQuiz, type SortItem, type SortQuizVisuals } from './SortQuiz';
import { ReliefCoverTerrain } from './ReliefCoverTerrain';
import { ReliefCoverCompare, type ReliefCoverCopy } from './ReliefCoverCompare';
import { LessonViewportFit } from '@/components/lesson/LessonViewportFit';
import { cn } from '@/lib/utils';

/**
 * תת-נושא „תבליט ותכסית” — הסבר כללי שפותח את רצף לימוד השטח בשיעור 2:
 * תבליט ותכסית ← תבניות נוף (תבליט) ← גיאולוגיה ← תכסית.
 * MVP עיצובי: איור papercut אינטראקטיבי (ReliefCoverTerrain) + בקרות קומפקטיות.
 */

type Layer = 'relief' | 'cover';
type Origin = 'natural' | 'artificial';
type Feature = {
  id: string;
  label: string;
  layer: Layer;
  origin?: Origin;
  desc: string;
};

const FEATURES: Feature[] = [
  { id: 'hill',    label: 'כיפה',   layer: 'relief', desc: 'התרוממות בולטת של פני הקרקע מעל סביבתה.' },
  { id: 'saddle',  label: 'אוכף',   layer: 'relief', desc: 'קטע נמוך בקו הרכס, בין שתי כיפות סמוכות.' },
  { id: 'slope',   label: 'מדרון',  layer: 'relief', desc: 'משטח קרקע משופע, המחבר בין אזור גבוה לאזור נמוך.' },
  { id: 'valley',  label: 'גיא',    layer: 'relief', desc: 'שטח נמוך בין שני אזורים גבוהים, שאליו מתנקזים מי הגשם.' },
  { id: 'plain',   label: 'מישור',  layer: 'relief', desc: 'שטח כמעט שטוח, שהפרשי הגובה בו קטנים.' },
  { id: 'grove',   label: 'חורש',   layer: 'cover', origin: 'natural',    desc: 'עצים ושיחים שגדלו על המדרון באופן טבעי, בפיזור לא סדור.' },
  { id: 'shrubs',  label: 'שיחים',  layer: 'cover', origin: 'natural',    desc: 'צומח נמוך שגדל באופן טבעי בין הסלעים.' },
  { id: 'houses',  label: 'בתים',   layer: 'cover', origin: 'artificial', desc: 'מבני מגורים שהאדם הקים על הקרקע כחלק מיישוב.' },
  { id: 'orchard', label: 'מטע',    layer: 'cover', origin: 'artificial', desc: 'עצים שהאדם נטע בשורות ובמרווחים קבועים. מטע נחשב לתכסית מלאכותית משום שנוצר בידי אדם.' },
  { id: 'road',    label: 'כביש',   layer: 'cover', origin: 'artificial', desc: 'דרך שהאדם סלל על פני הקרקע.' },
  { id: 'power',   label: 'קו מתח', layer: 'cover', origin: 'artificial', desc: 'תשתית להעברת חשמל, הכוללת עמודים וכבלים שהאדם הקים בשטח.' },
];

const LAYER_LABEL: Record<Layer, string> = { relief: 'תבליט', cover: 'תכסית' };
const ORIGIN_LABEL: Record<Origin, string> = { natural: 'טבעית', artificial: 'מלאכותית' };
const FEATURE_LABELS = Object.fromEntries(FEATURES.map((f) => [f.id, f.label])) as Record<string, string>;

/** Option recipe (cleanup spec §1–2, same as LandCoverScene): orange = on/selected. */
const OPTION_IDLE = 'border-border bg-bg-elevated text-fg hover:border-brand/30 hover:bg-brand/[0.03] cursor-pointer';
const OPTION_ON = 'border-accent bg-accent/10 text-fg';

const QUIZ_ITEMS: SortItem<Layer>[] = [
  { id: 'q-hill',    label: 'גבעה',       answer: 'relief', why: 'גבעה היא התרוממות של פני הקרקע, ולכן היא חלק מהתבליט.' },
  { id: 'q-grove',   label: 'חורש',       answer: 'cover',  why: 'חורש הוא צומח טבעי על פני הקרקע, ולכן הוא חלק מהתכסית.' },
  { id: 'q-house',   label: 'בית',        answer: 'cover',  why: 'בית הוא מבנה שהאדם הקים על הקרקע, ולכן הוא תכסית מלאכותית.' },
  { id: 'q-valley',  label: 'עמק',        answer: 'relief', why: 'עמק הוא אזור נמוך בין אזורים גבוהים. הוא מתאר את מבנה הקרקע, ולכן הוא חלק מהתבליט.' },
  { id: 'q-road',    label: 'כביש',       answer: 'cover',  why: 'כביש הוא דרך שהאדם סלל על פני הקרקע, ולכן הוא תכסית מלאכותית.' },
  { id: 'q-slope',   label: 'מדרון',      answer: 'relief', why: 'מדרון הוא משטח קרקע משופע, ולכן הוא חלק מהתבליט.' },
  { id: 'q-olives',  label: 'מטע זיתים',  answer: 'cover',  why: 'מטע זיתים הוא צומח שהאדם נטע, ולכן הוא תכסית מלאכותית.' },
  { id: 'q-saddle',  label: 'אוכף',       answer: 'relief', why: 'אוכף הוא קטע נמוך בקו הרכס בין שתי כיפות. הוא מתאר את מבנה הקרקע, ולכן הוא חלק מהתבליט.' },
];

const COMPARE_ROWS: { label: string; relief: string; cover: string }[] = [
  { label: 'הגדרה',            relief: 'מבנה פני הקרקע, הכולל אזורים גבוהים, נמוכים ומישוריים.', cover: 'המרכיבים הטבעיים והמלאכותיים שנמצאים על פני הקרקע.' },
  { label: 'דוגמאות',           relief: 'כיפה, שלוחה, גיא, אוכף, מכתש, מדרון, מישור.',          cover: 'עצים, שיחים ועשב · בתים, כבישים, שדות, מטעים, גדרות וקווי חשמל.' },
  { label: 'אופן הסיווג',       relief: 'לפי תבניות נוף — צורות יסוד שמופיעות בשטחים שונים.',     cover: 'לפי המקור: טבעית או מלאכותית. לפי הסוג: צומח, פעילות האדם ותשתיות.' },
  { label: 'קצב השינוי',        relief: 'לרוב משתנה באיטיות, בתהליכים טבעיים ממושכים. עבודות הנדסה, כגון חציבה ומילוי, עשויות לשנות אותו במהירות.', cover: 'עשויה להשתנות בתוך זמן קצר: הצומח משתנה עם העונות, והבנייה והחקלאות משנות את פני השטח.' },
  { label: 'הייצוג במפה',       relief: 'בעיקר באמצעות קווי גובה.',                               cover: 'באמצעות סמלים וצבעים מוסכמים, המוסברים במקרא המפה.' },
];

/** Quiz illustrations (2026-10-19 handoff, design/handoff/terrain-classification-2026-10-19):
 *  WebP siblings of the transparent PNG sources, made by scripts/media/package-terrain-classification.cjs.
 *  The orange outline is baked into each item's art — no frame or filter is added around it. */
const QUIZ_IMAGE_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/terrain-classification`;
const QUIZ_VISUALS: SortQuizVisuals<Layer> = {
  items: {
    'q-hill':   { src: `${QUIZ_IMAGE_BASE}/item-hill.webp`,          alt: 'גבעה מעוגלת הבולטת מעל סביבתה, מסומנת בקו מתאר כתום' },
    'q-grove':  { src: `${QUIZ_IMAGE_BASE}/item-grove.webp`,         alt: 'חורש טבעי קטן עם עצים ושיחים בפיזור לא סדור, מסומן בקו כתום' },
    'q-house':  { src: `${QUIZ_IMAGE_BASE}/item-house.webp`,         alt: 'בית אבן יחיד עם גג רעפים, מסומן בקו מתאר כתום' },
    'q-valley': { src: `${QUIZ_IMAGE_BASE}/item-valley.webp`,        alt: 'עמק מוארך ונמוך בין שתי גבעות, קרקעית העמק מסומנת בקו כתום' },
    'q-road':   { src: `${QUIZ_IMAGE_BASE}/item-road.webp`,          alt: 'קטע כביש סלול על הקרקע, מסומן בקו מתאר כתום' },
    'q-slope':  { src: `${QUIZ_IMAGE_BASE}/item-slope.webp`,         alt: 'משטח קרקע משופע המחבר אזור גבוה לנמוך, מסומן בקו כתום' },
    'q-olives': { src: `${QUIZ_IMAGE_BASE}/item-olive-orchard.webp`, alt: 'מטע זיתים נטוע בשורות סדורות, גבול המטע מסומן בקו כתום' },
    'q-saddle': { src: `${QUIZ_IMAGE_BASE}/item-saddle.webp`,        alt: 'אוכף בקו רכס בין שתי כיפות סמוכות, הקטע הנמוך ביניהן מסומן בקו כתום' },
  },
  options: {
    relief: `${QUIZ_IMAGE_BASE}/choice-relief.webp`,
    cover: `${QUIZ_IMAGE_BASE}/choice-cover.webp`,
  },
};

const EASE = [0.22, 1, 0.36, 1] as const;

/** T1 section title (cleanup spec §3) — replaces the labelled SoftDividers. Its mt-12 sits on the
 *  screen's ScreenFit wrapper (SCREEN_GAP), so the gap between screens is not scaled. */
const SECTION_TITLE = 'mb-5 font-display text-2xl font-bold leading-tight text-fg sm:text-3xl';
const SCREEN_GAP = 'mt-12';

/**
 * Laptop fit — each screen of the section is one LessonViewportFit composition, laid out at its
 * 1920×1080 width (the section's content width: max-w-lesson minus lg:px-8) and shrunk uniformly
 * when a laptop leaves less room, so columns, line breaks and the illustrations' proportions stay
 * those of the large screen. The section still scrolls from screen to screen: every screen fits
 * under the fixed site header (80px) with a 24px gap above and below it. A screen that is shrunk
 * further than its neighbours (height-bound) keeps to the reading side, so titles and card edges
 * stay aligned on the right.
 * Heights are each screen's initial height at that width (measured 2026-10-19 at 1920×1080);
 * a state that grows (feedback, the open summary table) lengthens the page at the same scale.
 */
const FIT_WIDTH = 1344;
const FIT_RESERVE_TOP = 80 + 24;
const FIT_RESERVE_BOTTOM = 24;
const FIT_HEIGHT = {
  /** SceneHeader + the definitions card */
  definitions: 379,
  /** title + the layered-terrain workspace */
  workspace: 686,
  /** title + the comparison card in its first state; the summary row below it is not counted —
   *  it follows the activity and opens into the full table at its end */
  compare: 819,
  /** title + the illustrated quiz (stage layout, choices centered on the illustration) before any
   *  answer; its feedback slot is reserved for the longest explanation and the completion line, so
   *  answering never grows it (measured 2026-10-19) */
  quiz: 845,
} as const;

function ScreenFit({ height, className, children }: { height: number; className?: string; children: React.ReactNode }) {
  return (
    <LessonViewportFit
      referenceWidth={FIT_WIDTH}
      referenceHeight={height}
      reserveTop={FIT_RESERVE_TOP}
      reserveBottom={FIT_RESERVE_BOTTOM}
      align="start"
      className={className}
    >
      {children}
    </LessonViewportFit>
  );
}

/** Screen 3 — „אותה גבעה, שלושה נופים” (ReliefCoverCompare): UI chrome and supportive
 *  feedback only. The lesson content is COMPARE_ROWS above, shown verbatim. */
const COMPARE_COPY: ReliefCoverCopy = {
  states: { bare: 'שטח חשוף', grove: 'חורש טבעי', built: 'מבנים ומטע', quarry: 'חציבה' },
  stepsLabel: 'שלבי ההמחשה',
  question: 'מה ישתנה במעבר מהמצב הנוכחי למצב הבא?',
  answers: { relief: 'תבליט', cover: 'תכסית', both: 'שניהם' },
  correct: 'נכון',
  wrong: 'התשובה הנכונה:',
  feedback: {
    grove: 'צורת הגבעה לא השתנתה, ולכן קווי הגובה במפה נשארו זהים. על פני הקרקע נוסף חורש — תכסית טבעית — ובמפה הוא מסומן בסמל משלו.',
    built: 'במעבר הזה התבליט לא השתנה, וקווי הגובה נשארו במקומם. התכסית הטבעית הוחלפה בתכסית מלאכותית: מבנים ומטע. מטע נחשב לתכסית מלאכותית משום שנוצר בידי אדם.',
    quarry: {
      lead: 'החציבה שינתה את צורת הקרקע, ולכן גם קווי הגובה המתארים אותה השתנו.',
      relief: 'חציבת הקרקע שינתה את צורת הגבעה.',
      cover: 'עצי המטע שעמדו באזור החציבה הוסרו.',
    },
  },
  chips: { same: 'קווי הגובה: ללא שינוי', changed: 'קווי הגובה השתנו' },
  legendTitle: 'מקרא',
  legend: {
    contour: 'קו גובה',
    index: 'קו גובה ראשי',
    grove: 'חורש',
    orchard: 'מטע',
    houses: 'מבנים',
    quarry: 'אזור חציבה',
    before: 'קווי הגובה לפני החציבה',
  },
  disclaimer: 'המחשה סכמטית — הסמלים אינם מקרא רשמי',
  boards: { real: 'בשטח', map: 'במפה' },
  layers: LAYER_LABEL,
  next: 'המשך',
  restart: 'התחלה מחדש',
  summary: { title: 'סיכום ההשוואה', show: 'הצגת ההשוואה המלאה', hide: 'הסתרת ההשוואה המלאה' },
};

export function ReliefCoverIntroScene() {
  const reduce = useReducedMotion();
  const [showRelief, setShowRelief] = useState(true);
  const [showCover, setShowCover] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const visible = (layer: Layer) => (layer === 'relief' ? showRelief : showCover);
  const selected = FEATURES.find((f) => f.id === selectedId && visible(f.layer)) ?? null;

  const toggleLayer = (layer: Layer) => {
    if (layer === 'relief') setShowRelief((v) => !v);
    else setShowCover((v) => !v);
  };
  /** Clicking the active feature again steps back to the overview. */
  const selectFeature = (id: string | null) => setSelectedId((cur) => (id === null || cur === id ? null : id));

  return (
    <section id="scene-relief-cover" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* ── Screen 1: the section's header and the two definitions ── */}
      <ScreenFit height={FIT_HEIGHT.definitions}>
        <SceneHeader
          title={
            <>
              מרכיבי השטח: <span className="gradient-text">תבליט ותכסית</span>
            </>
          }
          intro="כדי לתאר שטח ולקרוא את ייצוגו במפה, מבחינים בין שני מרכיבים: תבליט — מבנה פני הקרקע, ותכסית — המרכיבים שנמצאים על פני הקרקע. ההבחנה ביניהם היא בסיס לקריאת השטח."
        />

        {/* the two definitions — one flat info card, so the
            interactive workspace below is the first strong surface */}
        <div className="surface p-5 sm:p-6">
          <div className="grid md:grid-cols-2 gap-6 md:gap-10">
            <DefinitionCard layer="relief" term="תבליט" lead="מבנה פני הקרקע.">
              התבליט מתאר את צורת הקרקע: הרים וגבעות, עמקים ומדרונות, מישורים ושקעים.
              כדי לזהות ולתאר את התבליט, נעזרים ב<strong className="text-fg">תבניות נוף</strong> — צורות יסוד שמופיעות בשטחים שונים.
            </DefinitionCard>
            <DefinitionCard layer="cover" term="תכסית" lead="המרכיבים שנמצאים על פני הקרקע.">
              התכסית כוללת מרכיבים <strong className="text-fg">טבעיים</strong>, כגון עצים, שיחים ועשב שגדלו באופן טבעי,
              ומרכיבים <strong className="text-fg">מלאכותיים</strong> שהאדם יצר, כגון בתים, כבישים, שדות ומטעים, גדרות וקווי חשמל.
            </DefinitionCard>
          </div>
        </div>
      </ScreenFit>

      {/* ── Screen 2: interactive layered terrain — the scene's workspace ── */}
      <ScreenFit height={FIT_HEIGHT.workspace} className={SCREEN_GAP}>
        {/* one card: the activity's title, its controls and result, and the illustration */}
        <div className="surface-elevated p-5 sm:p-6">
          <h3 className={SECTION_TITLE}>זיהוי תבליט ותכסית בשטח</h3>

          <div className="grid lg:grid-cols-[20rem_minmax(0,1fr)] gap-6 items-stretch">
            {/* Controls + info (first child → right in RTL) */}
            <div className="flex flex-col gap-5">
              <div className="space-y-5">
                <div>
                  <div className="text-sm font-display font-semibold text-fg-muted mb-2.5">
                    הציגו או הסתירו כל שכבה
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['relief', 'cover'] as Layer[]).map((layer) => (
                      <LayerToggle key={layer} on={visible(layer)} onToggle={() => toggleLayer(layer)}>
                        שכבת {LAYER_LABEL[layer]}
                      </LayerToggle>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-display font-semibold text-fg-muted">
                    בחרו רכיב באיור או ברשימה
                  </div>
                  {/* one group per layer, unlabelled — classifying is the learner's job (the result says it);
                      a hairline separates the relief group from the cover group; each group fills one row, equal widths */}
                  {(['relief', 'cover'] as Layer[]).map((layer) => (
                    <div key={layer} className={cn('flex gap-1.5', layer === 'cover' && 'border-t border-border-subtle pt-3')}>
                      {FEATURES.filter((f) => f.layer === layer).map((f) => {
                        const isSel = selected?.id === f.id;
                        const off = !visible(layer);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            disabled={off}
                            aria-pressed={isSel}
                            onClick={() => selectFeature(f.id)}
                            onMouseEnter={() => setHoverId(f.id)}
                            onMouseLeave={() => setHoverId(null)}
                            onFocus={() => setHoverId(f.id)}
                            onBlur={() => setHoverId(null)}
                            className={cn(
                              'flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-xl border px-1.5 py-2 text-sm font-display font-bold',
                              'transition-colors duration-200 ease-snap focus-visible:ring-offset-bg-elevated',
                              isSel ? OPTION_ON : OPTION_IDLE,
                              off && 'opacity-40 cursor-not-allowed hover:border-border hover:bg-bg-elevated',
                            )}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* The inset stays put; only its text swaps — the new text slides in from the
                  reading side (inline-start = right) and the box flashes once in the selection tint. */}
              <div aria-live="polite" className="relative isolate flex-1 rounded-xl bg-bg-accent/60 p-4 min-h-[140px]">
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
                        <div className="mb-2">
                          <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl">{selected.label}</h3>
                          <div className="mt-0.5 text-sm font-display font-semibold text-fg-muted">
                            {selected.origin ? `תכסית ${ORIGIN_LABEL[selected.origin]}` : LAYER_LABEL[selected.layer]}
                          </div>
                        </div>
                        <p className="text-base text-fg leading-relaxed">{selected.desc}</p>
                      </>
                    ) : (
                      <p className="text-base text-fg-muted leading-relaxed">
                        בחרו רכיב כדי לקרוא את תיאורו ואת סיווגו כתבליט או כתכסית. הסתירו את שכבת התכסית כדי לבחון את מבנה הקרקע בנפרד.
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Illustration — the focal point */}
            <div className="min-w-0 self-start rounded-xl overflow-hidden border border-border-subtle bg-paper-card">
              <ReliefCoverTerrain
                showRelief={showRelief}
                showCover={showCover}
                selectedId={selected?.id ?? null}
                hoverId={hoverId}
                labels={FEATURE_LABELS}
                onSelect={selectFeature}
                onHover={setHoverId}
              />
            </div>
          </div>
        </div>
      </ScreenFit>

      {/* ── Screen 3: same hill, three landscapes — predict, then see (ReliefCoverCompare);
           the original table closes it as the summary ── */}
      <ScreenFit height={FIT_HEIGHT.compare} className={SCREEN_GAP}>
        <ReliefCoverCompare
          rows={COMPARE_ROWS}
          copy={COMPARE_COPY}
          header={<h3 className={SECTION_TITLE}>השוואה בין תבליט לתכסית</h3>}
        />
      </ScreenFit>

      {/* ── Screen 4: quick check ── */}
      <ScreenFit height={FIT_HEIGHT.quiz} className={SCREEN_GAP}>
        <SortQuiz
          layout="stage"
          heading="תרגול: סיווג מרכיבי השטח"
          title="תבליט או תכסית?"
          prompt="סווגו כל רכיב כתבליט או כתכסית. לאחר הבחירה יוצג הסבר לסיווג."
          options={[
            { id: 'relief', label: 'תבליט' },
            { id: 'cover', label: 'תכסית' },
          ]}
          items={QUIZ_ITEMS}
          visuals={QUIZ_VISUALS}
          centerChoices
          showScore={false}
          showPosition={false}
          showFinalScore={false}
          hint="בחרו תבליט או תכסית"
          doneText="סיימתם את סיווג מרכיבי השטח. אפשר לבחור רכיב כדי לעיין שוב בהסבר."
        />
      </ScreenFit>
    </section>
  );
}

function LayerToggle({
  on,
  onToggle,
  children,
}: {
  on: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={cn(
        'rounded-xl border ps-3 pe-2.5 py-2.5 font-display font-bold text-sm whitespace-nowrap transition-colors duration-200 ease-snap cursor-pointer',
        'flex items-center justify-between gap-2 focus-visible:ring-offset-bg-elevated',
        on ? OPTION_ON : OPTION_IDLE,
      )}
    >
      <span>{children}</span>
      {/* switch (same as the site's other switches): orange when on, knob travels to the inline-end */}
      <span
        aria-hidden
        className={cn(
          'relative flex h-[18px] w-8 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-200',
          on ? 'border-accent bg-accent justify-end' : 'border-border bg-bg-accent justify-start',
        )}
      >
        <motion.span layout transition={{ duration: 0.2, ease: EASE }} className="size-3.5 rounded-full bg-white shadow-sm" />
      </span>
    </button>
  );
}

/** Independent realistic landscapes for the two definitions. */
const DEFINITION_IMAGE_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/relief-cover-definitions`;
const DEFINITION_IMAGE_ALT: Record<Layer, string> = {
  relief: 'נוף סלעי חשוף עם גבעות, מדרונות ועמק המדגיש את מבנה פני הקרקע',
  cover: 'נוף עם חורש, מטע, שדה, בתים וכביש המדגים תכסית טבעית ומלאכותית',
};

function ReliefCoverVignette({ layer }: { layer: Layer }) {
  return (
    <Image
      src={`${DEFINITION_IMAGE_BASE}/${layer}.webp`}
      alt={DEFINITION_IMAGE_ALT[layer]}
      width={184}
      height={80}
      className="block h-[80px] w-[184px] shrink-0 rounded-lg bg-paper-card object-cover"
    />
  );
}

/** One definition column inside the opening info card — plain text, no frame, no dot.
 *  Same header row as LandCoverScene's OriginCard: title, with the identifying vignette at the end. */
function DefinitionCard({
  layer,
  term,
  lead,
  children,
}: {
  layer: Layer;
  term: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl pt-1">{term}</h3>
        <div className="mt-1 text-base font-display font-bold text-fg">{lead}</div>
        <p className="mt-2 text-base text-fg-muted leading-relaxed text-pretty">{children}</p>
      </div>
      <ReliefCoverVignette layer={layer} />
    </article>
  );
}
