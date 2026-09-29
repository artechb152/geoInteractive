'use client';

import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { cn } from '@/lib/utils';
import {
  LandformMap,
  LandformReality,
  type LandformId,
  type LandformMapLabels,
} from './LandformsVisuals';
import { SlopeContours, SlopeGlyph, SlopeProfile } from './SlopeVisuals';

type Form = LandformId;

type FormData = {
  id: Form;
  label: string;
  description: string;
  contourHint: string;
};

const FORMS: FormData[] = [
  {
    id: 'hill',
    label: 'כיפה',
    description: 'התרוממות בולטת של פני הקרקע מעל סביבתה.',
    contourHint: 'קווי גובה סגורים המקיפים זה את זה, כאשר הגובה עולה לכיוון המרכז. הפסגה נמצאת בתוך קו הגובה הפנימי ביותר.',
  },
  {
    id: 'spur',
    label: 'שלוחה',
    description: 'רצועת קרקע גבוהה וצרה היורדת בהדרגה מההר או מהרכס לכיוון השטח הנמוך.',
    contourHint: 'קווי גובה בצורת V או U, שהבליטה שלהם פונה לכיוון השטח הנמוך.',
  },
  {
    id: 'valley',
    label: 'גיא / ואדי',
    description: 'שטח נמוך בין שתי שלוחות, שאליו מתנקזים מי הגשם.',
    contourHint: 'קווי גובה בצורת V, שקודקודיהם פונים לכיוון השטח הגבוה, במעלה הגיא. הקו המחבר את הקודקודים מציין את נתיב ניקוז המים.',
  },
  {
    id: 'saddle',
    label: 'אוכף',
    description: 'קטע נמוך בקו הרכס, בין שתי כיפות סמוכות.',
    contourHint: 'האוכף נמצא בין שתי קבוצות של קווי גובה סגורים, המייצגות כיפות סמוכות. באזור האוכף נוצר מעבר נמוך בין הכיפות.',
  },
  {
    id: 'depression',
    label: 'מכתש',
    description: 'שקע סגור בפני הקרקע, הנמוך מסביבתו הקרובה.',
    contourHint: 'קווי גובה סגורים עם סימנים קצרים הפונים פנימה ומציינים ירידה בגובה אל תוך השקע.',
  },
];

type Slope = {
  id: string;
  label: string;
  description: string;
  contourHint: string;
};

const SLOPES: Slope[] = [
  { id: 'even', label: 'מדרון קצוב', description: 'מדרון בעל שיפוע אחיד לכל אורכו.', contourHint: 'המרווחים בין קווי הגובה שווים לאורך המדרון.' },
  { id: 'convex', label: 'מדרון קמור', description: 'מדרון שהשיפוע בחלקו העליון מתון, ונעשה תלול יותר ככל שיורדים.', contourHint: 'קווי הגובה מרווחים בחלק העליון וצפופים יותר בחלק התחתון.' },
  { id: 'concave', label: 'מדרון קעור', description: 'מדרון שהשיפוע בחלקו העליון תלול, ונעשה מתון יותר ככל שיורדים.', contourHint: 'קווי הגובה צפופים בחלק העליון ומרווחים יותר בחלק התחתון.' },
  { id: 'shoulder', label: 'כתף', description: 'קטע כמעט מישורי הקוטע את רצף המדרון ויוצר בו מעין מדרגה.', contourHint: 'באזור הכתף המרווחים בין קווי הגובה גדולים יותר מאשר בקטעים שמעליו ומתחתיו.' },
];

// Short cues shown under each board — bind "reality" to "map" per form.
const REALITY_META: Record<Form, { realWorld: string; mapCue: string }> = {
  hill: { realWorld: 'התרוממות מעל פני השטח שסביבה', mapCue: 'קווי גובה סגורים סביב הפסגה' },
  spur: { realWorld: 'רצועת קרקע גבוהה היורדת מהרכס', mapCue: 'בליטת הקווים פונה אל השטח הנמוך' },
  valley: { realWorld: 'שטח נמוך בין שתי שלוחות', mapCue: 'קודקודי הקווים פונים אל השטח הגבוה' },
  saddle: { realWorld: 'מעבר נמוך בין שתי כיפות', mapCue: 'אזור נמוך בין שתי קבוצות קווים סגורים' },
  depression: { realWorld: 'שקע סגור הנמוך מסביבתו', mapCue: 'קווים סגורים עם סימנים הפונים פנימה' },
};

// Labels drawn inside the illustrations — kept here with the rest of the scene copy.
const MAP_LABELS: LandformMapLabels = {
  toLow: 'אל השטח הנמוך',
  toPeak: 'אל השטח הגבוה',
  drainage: 'קו ניקוז',
  saddle: 'אוכף',
  low: 'נמוך',
};
const SLOPE_LABELS = {
  bottom: 'תחתית',
  top: 'פסגה',
  // named under the map, over the stretch they describe
  zones: {
    steep: 'צפוף = תלול',
    gentle: 'מרווח = מתון',
    even: 'מרווחים שווים = שיפוע אחיד',
  },
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function LandformsScene() {
  const [active, setActive] = useState<Form>('hill');
  const [slope, setSlope] = useState(SLOPES[0].id);

  return (
    <section id="scene-landforms" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="02.1"
        title="תבניות נוף: חמש צורות יסוד של התבליט"
        intro="בשיעור זה נכיר חמש תבניות נוף בסיסיות: כיפה, שלוחה, גיא, אוכף ומכתש. זיהוין מסייע להבין את מבנה הקרקע ואת ייצוגו במפה. בחרו כל תבנית והשוו בין צורתה בשטח לבין קווי הגובה המתארים אותה."
      />

      <div
        data-qa="forms-grid"
        className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-6 items-start mb-12"
      >
        {/* Accordion list — first child → RIGHT in RTL (text on right) */}
        <FormAccordion active={active} onSelect={setActive} />

        {/* Visualization — second child → LEFT in RTL. Sticky on desktop so the
            board stays in view while the accordion is read. */}
        <FormBoard active={active} />
      </div>

      {/* The former divider line ("עוד שכבה: …") was removed by the user's
          2026-09-28 decision — the slope workspace opens with its own T1 h3,
          and the grid above already sets the 48px block gap (mb-12). */}
      <SlopeAnalyzer slopes={SLOPES} active={slope} onSelect={setSlope} />
    </section>
  );
}

/* ── Landforms — accordion ───────────────────────────────────────────────── */

function FormAccordion({ active, onSelect }: { active: Form; onSelect: (id: Form) => void }) {
  const reduce = useReducedMotion();
  return (
    <div className="space-y-3">
      {FORMS.map((f, i) => {
        const isActive = active === f.id;
        return (
          <div
            key={f.id}
            className={cn(
              // Rows sit on the textured page (not inside a workspace), so the
              // translucent hover tint rides on an opaque white base via ::before.
              'relative isolate overflow-hidden rounded-xl border bg-bg-elevated transition-colors duration-200 ease-snap',
              'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap',
              isActive ? 'border-brand/45' : 'border-border hover:border-brand/30 hover:before:bg-brand/[0.03]',
            )}
          >
            <button
              type="button"
              id={`lf-form-btn-${f.id}`}
              aria-controls={`lf-form-panel-${f.id}`}
              onClick={() => onSelect(f.id)}
              aria-expanded={isActive}
              className="w-full p-5 text-start flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            >
              <span className="size-9 rounded-xl flex items-center justify-center shrink-0 font-display text-sm font-bold bg-bg-accent text-fg-muted">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg font-bold leading-snug text-fg md:text-xl">{f.label}</div>
              </div>
              <motion.span
                animate={{ rotate: isActive ? 180 : 0 }}
                transition={{ duration: reduce ? 0 : 0.25 }}
                className={cn('shrink-0 inline-flex', isActive ? 'text-brand-dark' : 'text-fg-dim')}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isActive && (
                <motion.div
                  key={`panel-${f.id}`}
                  id={`lf-form-panel-${f.id}`}
                  role="region"
                  aria-labelledby={`lf-form-btn-${f.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-3">
                    <div>
                      <InfoLabel>תיאור התבנית</InfoLabel>
                      <p className="text-base leading-relaxed text-fg">{f.description}</p>
                    </div>
                    <div>
                      <InfoLabel>זיהוי במפה</InfoLabel>
                      <p className="text-base leading-relaxed text-fg">{f.contourHint}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// Sub-heading inside a card body (T3) — plain text, no icon or colour.
function InfoLabel({ children }: { children: ReactNode }) {
  return <div className="text-base font-display font-bold text-fg mb-1">{children}</div>;
}

/* ── Landforms — linked board (reality ↔ map) ────────────────────────────── */

function FormBoard({ active }: { active: Form }) {
  const index = FORMS.findIndex((f) => f.id === active);
  const form = FORMS[index];
  const meta = REALITY_META[active];

  return (
    <div className="lg:sticky lg:top-24 self-start">
      <div className="surface-elevated p-5 sm:p-6">
        {/* Board header — names the active landform; its number matches the open accordion item */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 min-w-0" aria-live="polite">
            <span className="size-9 rounded-xl bg-bg-accent text-fg-muted font-display text-sm font-bold flex items-center justify-center shrink-0">
              {index + 1}
            </span>
            <div className="min-w-0">
              <div className="font-display text-lg font-bold leading-snug text-fg md:text-xl">{form.label}</div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          {/* The boards stay mounted: on a switch the terrain and its contours
              reshape from the current form into the next one. */}
          <LinkedBoards top={{ kind: 'real', sub: meta.realWorld }} bottom={{ kind: 'map', sub: meta.mapCue }}>
            <LandformReality form={active} ariaLabel={`${form.label} — בשטח: ${meta.realWorld}`} />
            <LandformMap form={active} labels={MAP_LABELS} ariaLabel={`${form.label} — במפה: ${meta.mapCue}`} />
          </LinkedBoards>
          <p className="mt-3 text-center text-sm leading-snug text-fg-muted">
            ההמחשה מציגה את אותה תבנית נוף בשטח ובמפה באמצעות קווי גובה.
          </p>
        </div>
      </div>
    </div>
  );
}

type BoardCaptionProps = {
  kind: 'real' | 'map';
  sub: string;
  labelText?: string;
};

function BoardCaption({ kind, sub, labelText }: BoardCaptionProps) {
  const reduce = useReducedMotion();
  const label = labelText ?? (kind === 'real' ? 'בשטח' : 'במפה');
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm font-display font-bold text-fg shrink-0">{label}</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={sub}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.15, ease: EASE }}
          className="text-sm text-fg-muted"
        >
          · {sub}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

// Two views of the same terrain in one frame: the view from the side / in the
// field on top, the map view directly beneath it. Both share the horizontal
// scale, so a feature sits at the same x in both halves.
function LinkedBoards({
  top,
  bottom,
  children,
}: {
  top: BoardCaptionProps;
  bottom: BoardCaptionProps;
  children: [ReactNode, ReactNode];
}) {
  return (
    <figure className="m-0 min-w-0">
      <BoardCaption {...top} />
      <div className="my-2 rounded-xl overflow-hidden divide-y divide-border-subtle">
        <div>{children[0]}</div>
        <div>{children[1]}</div>
      </div>
      <figcaption>
        <BoardCaption {...bottom} />
      </figcaption>
    </figure>
  );
}

/* ── Slopes — tabs + linked profile/contours ─────────────────────────────── */

function SlopeAnalyzer({ slopes, active, onSelect }: { slopes: Slope[]; active: string; onSelect: (id: string) => void }) {
  const meta = slopes.find((s) => s.id === active)!;
  const reduce = useReducedMotion();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys follow the visual order in RTL: ArrowLeft → next tab.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = slopes.length;
    let next = -1;
    if (e.key === 'ArrowLeft') next = (i + 1) % n;
    else if (e.key === 'ArrowRight') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    onSelect(slopes[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div data-qa="slope-analyzer" className="surface-elevated p-6 sm:p-8">
      <div className="mb-6">
        <h3 id="lf-slopes-title" className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
          ארבעה סוגי מדרונות וזיהוים במפה
        </h3>
        <p className="mt-2 text-base leading-relaxed text-fg-muted">
          השיפוע עשוי להשתנות לאורך המדרון. בחרו סוג מדרון והשוו בין החתך מהצד לבין המרווחים בין קווי הגובה במפה.
        </p>
      </div>

      <div role="tablist" aria-labelledby="lf-slopes-title" className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {slopes.map((s, i) => {
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`lf-slope-tab-${s.id}`}
              aria-selected={isActive}
              aria-controls="lf-slope-panel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => onSelect(s.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'p-3 rounded-xl border text-start transition-colors duration-200 ease-snap flex items-center gap-3',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated',
                isActive
                  ? 'border-accent bg-accent/10'
                  : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
              )}
            >
              <span
                className={cn(
                  'size-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 font-display font-bold text-sm',
                  isActive ? 'bg-accent text-white' : 'bg-bg-accent text-fg-muted',
                )}
              >
                {i + 1}
              </span>
              <span className="font-display font-bold text-base text-fg leading-tight flex-1 min-w-0">{s.label}</span>
              <SlopeGlyph slope={s.id} className="w-10 h-[22px] shrink-0 text-fg-muted" />
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="lf-slope-panel" aria-labelledby={`lf-slope-tab-${active}`}>
        {/* The same slope from the side (profile) and from above (contours). The
            drawings morph between types — the drop lines carry every equal-height
            crossing straight down onto its contour line. */}
        <div className="mb-6">
          <LinkedBoards
            top={{ kind: 'real', labelText: 'מהצד', sub: 'חתך השטח' }}
            bottom={{ kind: 'map', labelText: 'במפה', sub: 'קווי הגובה של המדרון במבט מלמעלה' }}
          >
            <SlopeProfile
              slope={active}
              bottomLabel={SLOPE_LABELS.bottom}
              topLabel={SLOPE_LABELS.top}
              ariaLabel={`${meta.label} — מהצד: חתך השטח`}
            />
            <SlopeContours
              slope={active}
              bottomLabel={SLOPE_LABELS.bottom}
              topLabel={SLOPE_LABELS.top}
              zoneLabels={SLOPE_LABELS.zones}
              ariaLabel={`${meta.label} — במפה: קווי גובה במבט מלמעלה`}
            />
          </LinkedBoards>
          <p className="mt-3 text-center text-sm leading-snug text-fg-muted">
            ההמחשה מציגה את אותו מדרון בחתך מהצד ובמפה. כאשר הפרש הגובה בין הקווים קבוע, מרווחים קטנים יותר מעידים על מדרון תלול יותר.
          </p>
        </div>

        <div aria-live="polite" className="rounded-xl bg-bg-accent/60 p-4 sm:p-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`text-${active}`}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0, y: -4 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
              className="grid sm:grid-cols-2 gap-4 sm:gap-6"
            >
              <div>
                <InfoLabel>תיאור המדרון</InfoLabel>
                <p className="text-base leading-relaxed text-fg">{meta.description}</p>
              </div>
              <div>
                <InfoLabel>זיהוי במפה</InfoLabel>
                <p className="text-base leading-relaxed text-fg">{meta.contourHint}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
