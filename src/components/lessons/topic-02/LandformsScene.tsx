'use client';

import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { cn } from '@/lib/utils';
import {
  LandformMap,
  LandformReality,
  SlopeContours,
  SlopeGlyph,
  SlopeProfile,
  type LandformId,
  type LandformMapLabels,
} from './LandformsVisuals';

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
    description: 'התרוממות בולטת של פני השטח מעל סביבתה.',
    contourHint: 'במפה: רצף של קווי גובה סגורים זה בתוך זה. המעגל הפנימי ביותר הוא הפסגה..',
  },
  {
    id: 'spur',
    label: 'שלוחה',
    description: 'שטח גבוה וצר המשתפל בהדרגה מהפסגה לכיוון השטח הנמוך.',
    contourHint: 'קווי גובה בצורת V או U, כאשר הקודקוד מצביע לכיוון השטח הנמוך.',
  },
  {
    id: 'valley',
    label: 'גיא / ואדי',
    description: 'השטח הנמוך הכלוי בין שתי שלוחות.',
    contourHint: 'קווי גובה בצורת V המצביעים לכיוון הפסגה. הקו המחבר את הקודקודים הוא קו ניקוז המים.',
  },
  {
    id: 'saddle',
    label: 'אוכף',
    description: 'נקודת השפל הנמוכה ביותר על קו הרכס, הממוקמת בין שתי כיפות סמוכות.',
    contourHint: 'האוכף מופיע כרווח הצר שבין שתי קבוצות סמוכות של קווי גובה סגורים (שתי כיפות). הוא נראה כמו"צוואר בקבוק" המחבר בין שני שטחים גבוהים.',
  },
  {
    id: 'depression',
    label: 'מכתש',
    description: 'שטח סגור הנמוך מסביבתו הקרובה.',
    contourHint: 'קווי גובה סגורים עם זיזים ("קוצים") הפונים פנימה.',
  },
];

type Slope = {
  id: string;
  label: string;
  description: string;
  contourHint: string;
};

const SLOPES: Slope[] = [
  { id: 'even', label: 'מדרון קצוב', description: 'בעל שיפוע קבוע ואחיד לאורך כל הדרך.', contourHint: 'המרווחים בין קווי הגובה זהים.' },
  { id: 'convex', label: 'מדרון קמור', description: 'השיפוע מתחיל בצורה מתונה בחלק העליון והופך לתלול מאוד ככל שיורדים.', contourHint: 'קווים מרווחים למעלה וצפופים למטה.' },
  { id: 'concave', label: 'מדרון קעור', description: 'השיפוע תלול מאוד למעלה והופך למתון ושטוח בבסיסו.', contourHint: 'קווים צפופים מאוד למעלה ומרווחים למטה.' },
  { id: 'shoulder', label: 'כתף', description: 'רצף השיפוע נקטע באמצע על ידי קטע מישורי, ויוצר צורה של"מדרגה" על ההר.', contourHint: 'קווים צפופים ← קווים מרווחים מאוד ← חזרה לקווים צפופים.' },
];

// Short cues shown under each board — bind "reality" to "map" per form.
const REALITY_META: Record<Form, { realWorld: string; mapCue: string }> = {
  hill: { realWorld: 'בליטה מעוגלת מעל הסביבה', mapCue: 'טבעות סגורות סביב הפסגה' },
  spur: { realWorld: 'אצבע גבוהה שיורדת מהרכס', mapCue: 'הקודקוד מצביע אל השטח הנמוך' },
  valley: { realWorld: 'תעלת ניקוז בין שתי שלוחות', mapCue: 'הקודקוד מצביע אל הפסגה' },
  saddle: { realWorld: 'המעבר הנמוך בין שתי כיפות', mapCue: 'רווח צר בין שתי קבוצות טבעות' },
  depression: { realWorld: 'קערה נמוכה מכל סביבתה', mapCue: 'טבעות עם זיזים הפונים פנימה' },
};

// Labels drawn inside the illustrations — kept here with the rest of the scene copy.
const MAP_LABELS: LandformMapLabels = {
  toLow: 'אל השטח הנמוך',
  toPeak: 'אל הפסגה',
  drainage: 'קו ניקוז',
  saddle: 'אוכף',
  low: 'נמוך',
};
const SLOPE_LABELS = {
  bottom: 'תחתית',
  top: 'פסגה',
  rule: 'צפוף = תלול · מרווח = מתון',
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function LandformsScene() {
  const [active, setActive] = useState<Form>('hill');
  const [slope, setSlope] = useState(SLOPES[0].id);

  return (
    <section id="scene-landforms" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="02.1"
        title="5 צורות יסוד שבונות כל נוף"
        intro="מתוך אינספור צורות בטבע, קיימות 5 צורות יסוד של תבליט שחוזרות בכל נוף. מי שמזהה אותן בשטח ובמפה יודע לקרוא את פני הקרקע: איפה השטח עולה, איפה הוא יורד ואיך החלקים מתחברים זה לזה."
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

      <p className="mb-4 text-sm font-display font-semibold text-fg-muted">עוד שכבה: לא רק צורת ההר — גם צורת המדרון</p>

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
              'overflow-hidden rounded-xl border bg-bg-elevated transition-colors duration-200 ease-snap',
              isActive ? 'border-brand/45' : 'border-border hover:border-brand/30 hover:bg-brand/[0.03]',
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
              <span
                className={cn(
                  'size-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 font-display text-sm font-bold',
                  isActive ? 'bg-brand-dark text-bg-elevated' : 'bg-bg-accent text-fg-muted',
                )}
              >
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
                      <InfoLabel>מה זה?</InfoLabel>
                      <p className="text-base leading-relaxed text-fg">{f.description}</p>
                    </div>
                    <div>
                      <InfoLabel>איך מזהים במפה?</InfoLabel>
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
  const reduce = useReducedMotion();
  const index = FORMS.findIndex((f) => f.id === active);
  const form = FORMS[index];
  const meta = REALITY_META[active];

  return (
    <div className="lg:sticky lg:top-24 self-start">
      <div className="surface-elevated p-5 sm:p-6">
        {/* Board header — names the active landform; its badge mirrors the open accordion item */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 min-w-0" aria-live="polite">
            <span className="size-9 rounded-xl bg-brand-dark text-bg-elevated font-display text-sm font-bold flex items-center justify-center shrink-0">
              {index + 1}
            </span>
            <div className="min-w-0">
              <div className="font-display text-lg font-bold leading-snug text-fg md:text-xl">{form.label}</div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0, y: -6 }}
              transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
            >
              <LinkedBoards
                top={{ kind: 'real', sub: meta.realWorld }}
                bottom={{ kind: 'map', sub: meta.mapCue }}
              >
                <LandformReality form={active} ariaLabel={`${form.label} — במציאות: ${meta.realWorld}`} />
                <LandformMap form={active} labels={MAP_LABELS} ariaLabel={`${form.label} — במפה: ${meta.mapCue}`} />
              </LinkedBoards>
            </motion.div>
          </AnimatePresence>
          <p className="mt-3 text-center text-sm leading-snug text-fg-muted">
            אותה צורה — פעם כפי שהיא בשטח, פעם כפי שהיא מצוירת בקווי גובה
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
  const label = labelText ?? (kind === 'real' ? 'במציאות' : 'במפה');
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm font-display font-bold text-fg shrink-0">{label}</span>
      <span className="text-sm text-fg-muted">· {sub}</span>
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
          4 סוגי מדרונות — איך השלוחות בנויות בפועל
        </h3>
        <p className="mt-2 text-base leading-relaxed text-fg-muted">
          אפילו שלוחה &quot;פשוטה&quot; יכולה להיות מורכבת ממקטעי שיפוע שונים. ההבחנה ביניהם מסבירה איך המדרון נראה בשטח ואיך הוא מצויר במפה.
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
                  'size-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors duration-200 font-display font-bold text-sm',
                  isActive ? 'bg-accent text-white border-accent' : 'bg-bg-accent text-fg-muted border-border',
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
            top={{ kind: 'real', labelText: 'מהצד', sub: 'פרופיל השטח' }}
            bottom={{ kind: 'map', labelText: 'מלמעלה', sub: 'קווי גובה' }}
          >
            <SlopeProfile
              slope={active}
              bottomLabel={SLOPE_LABELS.bottom}
              topLabel={SLOPE_LABELS.top}
              ariaLabel={`${meta.label} — מהצד: פרופיל השטח`}
            />
            <SlopeContours
              slope={active}
              bottomLabel={SLOPE_LABELS.bottom}
              topLabel={SLOPE_LABELS.top}
              ruleLabel={SLOPE_LABELS.rule}
              ariaLabel={`${meta.label} — מלמעלה: קווי גובה`}
            />
          </LinkedBoards>
          <p className="mt-3 text-center text-sm leading-snug text-fg-muted">
            אותו מדרון — פעם כפרופיל מהצד, פעם כקווי גובה במבט־על. ככל שקווי הגובה צפופים יותר, המדרון תלול יותר.
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
                <InfoLabel>מה זה?</InfoLabel>
                <p className="text-base leading-relaxed text-fg">{meta.description}</p>
              </div>
              <div>
                <InfoLabel>איך מזהים במפה?</InfoLabel>
                <p className="text-base leading-relaxed text-fg">{meta.contourHint}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
