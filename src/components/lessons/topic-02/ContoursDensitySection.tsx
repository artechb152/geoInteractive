'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ContoursShapeMap, ContourMapThumbnail, type DensityKind } from './ContoursShapeMap';

/**
 * "זיהוי תנאי שטח לפי צפיפות" — the density half of the contours scene
 * (split out of ContoursScene so the top 3D/map section can evolve on its
 * own). Tabs pick a terrain kind → the info card and the contour map +
 * A–B profile (ContoursShapeMap) update together: cause → effect.
 */

type Shape = {
  id: DensityKind;
  label: string;
  desc: string;
  steepnessHint: 'gentle' | 'mixed' | 'steep' | 'cliff';
};

const SHAPES: Shape[] = [
  {
    id: 'gentle',
    label: 'גבעה מתונה',
    desc: 'הקווים מרווחים: אותו הפרש גובה נפרס על פני מרחק אופקי גדול יותר. זהו מדרון מתון. נוחות התנועה תלויה גם בקרקע, בצמחייה ובמכשולים.',
    steepnessHint: 'gentle',
  },
  {
    id: 'steep',
    label: 'הר תלול',
    desc: 'הקווים צפופים: הגובה משתנה במידה רבה לאורך מרחק אופקי קצר. זהו מדרון תלול, שעלול להקשות על התנועה. קווי הגובה לבדם אינם מספיקים לקביעת העבירות.',
    steepnessHint: 'steep',
  },
  {
    id: 'cliff',
    label: 'מצוק',
    desc: 'בהמחשה הקווים מתקרבים מאוד זה לזה באזור המצוק, שבו יש שינוי גובה חד על פני מרחק אופקי קצר מאוד. במפה יש לבדוק גם את סימון המצוק ואת המקרא כדי לזהות את המכשול.',
    steepnessHint: 'cliff',
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function ContoursDensitySection() {
  const [shapeId, setShapeId] = useState<DensityKind>(SHAPES[0].id);
  const shape = SHAPES.find((s) => s.id === shapeId)!;
  const reduce = useReducedMotion();
  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelId = `${uid}-panel`;
  const descId = `${uid}-desc`;
  const tabId = (id: string) => `${uid}-tab-${id}`;

  // Roving focus with automatic activation. RTL: ← advances, → goes back.
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = SHAPES.findIndex((s) => s.id === shapeId);
    let next = -1;
    if (e.key === 'ArrowLeft') next = (i + 1) % SHAPES.length;
    else if (e.key === 'ArrowRight') next = (i - 1 + SHAPES.length) % SHAPES.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = SHAPES.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setShapeId(SHAPES[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div data-qa="density-section">
      <div
        role="tablist"
        aria-label="הערכת תלילות לפי צפיפות קווי הגובה"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6"
        onKeyDown={onTabKey}
      >
        {SHAPES.map((s, i) => {
          const active = s.id === shapeId;
          const subtitle =
            s.steepnessHint === 'gentle'
              ? 'קווים מרווחים'
              : s.steepnessHint === 'steep'
              ? 'קווים צפופים'
              : 'שינוי גובה חד';
          return (
            <button
              key={s.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={tabId(s.id)}
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={active ? 0 : -1}
              onClick={() => setShapeId(s.id)}
              className={cn(
                // Tabs sit on the textured page (not inside a workspace), so the
                // translucent option tints ride on an opaque white base via ::before.
                'relative isolate flex items-center gap-3 rounded-xl border bg-bg-elevated p-4 text-start',
                'transition-colors duration-200 ease-snap cursor-pointer',
                'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap',
                active
                  ? 'border-accent before:bg-accent/10'
                  : 'border-border hover:border-brand/30 hover:before:bg-brand/[0.03]',
              )}
            >
              <span className="flex shrink-0 text-fg-muted">
                <ContourMapThumbnail kind={s.id} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-display font-bold text-base text-fg leading-tight">{s.label}</span>
                <span className="block text-sm text-fg-muted mt-0.5">{subtitle}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-start">
        {/* Explanation + glossary (first child → right in RTL) */}
        <div className="space-y-4">
          <div
            role="tabpanel"
            id={panelId}
            aria-labelledby={tabId(shape.id)}
            className="surface p-5 sm:p-6"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={shape.id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: reduce ? 0 : 0.28, ease: EASE }}
              >
                <h4 className="font-display text-lg font-bold leading-snug text-fg md:text-xl">{shape.label}</h4>
                <p id={descId} className="mt-2 text-base leading-relaxed text-fg">
                  {shape.desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <Glossary />
        </div>

        {/* Contour map + A–B profile (second child → left in RTL; never mirrored) */}
        <div className="surface-elevated p-5 sm:p-6" dir="ltr">
          <ContoursShapeMap kind={shape.id} label={shape.label} describedBy={descId} />
        </div>
      </div>
    </div>
  );
}

function Glossary() {
  return (
    <div className="surface p-5 sm:p-6">
      <div className="mb-4 font-display text-lg font-bold leading-snug text-fg md:text-xl">מושגים לקריאת קווי גובה</div>
      <dl className="space-y-4">
        <Item term="קו גובה (Contour Line)" def="קו המחבר נקודות הנמצאות באותו גובה. צורת הקווים והמרווחים ביניהם מסייעים להבין את פני השטח." />
        <Item term="רווח אנכי (Contour Interval)" def="הפרש הגובה בין קווי גובה עוקבים. ערכו מצוין בשולי המפה או במקרא ומשתנה בין מפות. בהדגמה כאן הוא 10 מטרים." />
        <Item term="קו גובה ראשי (Index Contour)" def="קו גובה מודגש שעליו מצוין בדרך כלל ערך הגובה. במפות רבות מודגש כל קו חמישי, כדי להקל על קריאת הגבהים." />
        <Item term="הקשר בין צפיפות לתלילות" def="באותו קנה מידה ובאותו רווח אנכי, קווים צפופים מציינים מדרון תלול יותר, וקווים מרווחים מציינים מדרון מתון יותר." emphasis />
      </dl>
    </div>
  );
}

function Item({ term, def, emphasis = false }: { term: string; def: string; emphasis?: boolean }) {
  return (
    <div className={cn(emphasis && 'rounded-xl bg-bg-accent/60 p-4')}>
      <dt className="text-sm font-display font-bold text-fg">{term}</dt>
      <dd className="mt-1 text-sm text-fg-muted leading-relaxed">{def}</dd>
    </div>
  );
}
