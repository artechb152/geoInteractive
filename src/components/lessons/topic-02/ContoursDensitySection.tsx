'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ContoursShapeMap, DensityLegendGlyph, PROFILE_TOP_FRACTION, type DensityKind } from './ContoursShapeMap';

/**
 * "הערכת תלילות לפי צפיפות קווי הגובה" — the density half of the contours
 * scene (split out of ContoursScene so the top 3D/map section can evolve on
 * its own). One card: the title and the density → steepness rule (with its
 * conditions: same scale, same contour interval) on top; below, the side
 * column (→ RIGHT in RTL) beside the contour map + A–B profile
 * (ContoursShapeMap, one live model, so both always show the same kind).
 *
 * The side column is laid out against the figure: the tabs and the "on the
 * map" text + map legend sit beside the map; the "in the A–B section" text +
 * contour-interval legend is pinned to the profile's top edge. Each kind's
 * text is split the same way — what the lines do on the map, what that means
 * for the slope in the section — so every sentence sits next to the drawing
 * it describes.
 */

type Shape = {
  id: DensityKind;
  label: string;
  /** Tab subtitle: the cue to look for on the map. */
  cue: string;
  /** What the contour lines do on the map. */
  map: string;
  /** What that means for the slope along A–B. */
  section: string;
};

const SHAPES: Shape[] = [
  {
    id: 'gentle',
    label: 'גבעה מתונה',
    cue: 'קווים מרווחים',
    map: 'הקווים מרווחים: אותו הפרש גובה נפרס על פני מרחק אופקי גדול יותר.',
    section: 'זהו מדרון מתון. נוחות התנועה תלויה גם בקרקע, בצמחייה ובמכשולים.',
  },
  {
    id: 'steep',
    label: 'הר תלול',
    cue: 'קווים צפופים',
    map: 'הקווים צפופים: הגובה משתנה במידה רבה לאורך מרחק אופקי קצר.',
    section: 'זהו מדרון תלול, שעלול להקשות על התנועה. קווי הגובה לבדם אינם מספיקים לקביעת העבירות.',
  },
  {
    id: 'cliff',
    label: 'מצוק',
    cue: 'שינוי גובה חד',
    map: 'בהמחשה הקווים מתקרבים מאוד זה לזה באזור המצוק. במפה יש לבדוק גם את סימון המצוק ואת המקרא כדי לזהות את המכשול.',
    section: 'באזור המצוק יש שינוי גובה חד על פני מרחק אופקי קצר מאוד.',
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function ContoursDensitySection() {
  const [shapeId, setShapeId] = useState<DensityKind>(SHAPES[0].id);
  const shape = SHAPES.find((s) => s.id === shapeId)!;
  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const titleId = `${uid}-title`;
  const panelId = `${uid}-panel`;
  const mapDescId = `${uid}-map`;
  const sectionDescId = `${uid}-section`;
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
    <div data-qa="density-section" className="surface-elevated p-6 lg:p-8">
      <div className="mb-6">
        <h3 id={titleId} className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
          הערכת תלילות לפי צפיפות קווי הגובה
        </h3>
        <p className="mt-2 text-base leading-relaxed text-fg-muted">
          באותו קנה מידה ובאותו רווח אנכי, קווים צפופים מציינים מדרון תלול יותר, וקווים מרווחים מציינים מדרון מתון יותר.
          בחרו סוג שטח והשוו בין המפה לחתך.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_50rem] lg:gap-10">
        {/* Side column (first child → RIGHT in RTL). Its height is the figure's (grid
            stretch), so the section block can be pinned to the profile's top edge. */}
        <div className="relative min-w-0">
          <div role="tablist" aria-labelledby={titleId} className="grid grid-cols-3 gap-2" onKeyDown={onTabKey}>
            {SHAPES.map((s, i) => {
              const active = s.id === shapeId;
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
                    // The translucent option tints ride on an opaque white base via ::before.
                    'relative isolate rounded-xl border bg-bg-elevated p-3 text-start',
                    'transition-colors duration-200 ease-snap cursor-pointer',
                    'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap',
                    active
                      ? 'border-accent before:bg-accent/10'
                      : 'border-border hover:border-brand/30 hover:before:bg-brand/[0.03]',
                  )}
                >
                  <span className="block font-display font-bold text-base text-fg leading-tight">{s.label}</span>
                  <span className="block text-sm text-fg-muted mt-0.5">{s.cue}</span>
                </button>
              );
            })}
          </div>

          <div role="tabpanel" id={panelId} aria-labelledby={tabId(shape.id)}>
            {/* Beside the map */}
            <div className="mt-6">
              <BlockLabel>במפה (מבט מלמעלה)</BlockLabel>
              <ShapeText field="map" shape={shape} id={mapDescId} />
              <dl className="mt-4 space-y-3">
                <Term glyph="contour" term="קו גובה (Contour Line)">
                  קו המחבר נקודות הנמצאות באותו גובה. צורת הקווים והמרווחים ביניהם מסייעים להבין את פני השטח.
                </Term>
                <Term glyph="index" term="קו גובה ראשי (Index Contour)">
                  קו גובה מודגש שעליו מצוין בדרך כלל ערך הגובה. במפות רבות מודגש כל קו חמישי, כדי להקל על קריאת הגבהים.
                </Term>
                <Term glyph="section" term="קו החתך A–B">
                  הקו שלאורכו נבנה החתך שמתחת למפה. מכל נקודה שבה הוא חוצה קו גובה יורד קו מקווקו אל אותו גובה בחתך.
                </Term>
              </dl>
            </div>

            {/* Beside the profile: from lg its top edge meets the profile's top edge */}
            <div className="mt-8 lg:absolute lg:inset-x-0 lg:mt-0" style={{ top: `${PROFILE_TOP_FRACTION * 100}%` }}>
              <BlockLabel>בחתך לאורך הקו A–B (מבט מהצד)</BlockLabel>
              <ShapeText field="section" shape={shape} id={sectionDescId} />
              <dl className="mt-4">
                <Term glyph="interval" term="רווח אנכי (Contour Interval)">
                  הפרש הגובה בין קווי גובה עוקבים. ערכו מצוין בשולי המפה או במקרא ומשתנה בין מפות. בהדגמה כאן הוא 10 מטרים.
                </Term>
              </dl>
            </div>
          </div>
        </div>

        {/* Contour map + A–B profile (second child → LEFT in RTL; never mirrored) */}
        <div dir="ltr" className="min-w-0">
          <ContoursShapeMap
            kind={shape.id}
            label={`${shape.label} — מפת קווי גובה וחתך לאורך A–B`}
            describedBy={`${mapDescId} ${sectionDescId}`}
          />
        </div>
      </div>
    </div>
  );
}

function BlockLabel({ children }: { children: ReactNode }) {
  return <div className="text-base font-display font-bold text-fg mb-1">{children}</div>;
}

/**
 * One of the selected kind's two sentences. Every kind's version is laid out,
 * invisible, in the same grid cell, so the block keeps the height of the
 * longest one and the legend under it never jumps between tabs.
 */
function ShapeText({ field, shape, id }: { field: 'map' | 'section'; shape: Shape; id: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="grid">
      {SHAPES.map((s) => (
        <p key={s.id} aria-hidden className="invisible [grid-area:1/1] text-base leading-relaxed">
          {s[field]}
        </p>
      ))}
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={shape.id}
          id={id}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 1 } : { opacity: 0, y: -4 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
          className="[grid-area:1/1] text-base leading-relaxed text-fg"
        >
          {shape[field]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/** A glossary term keyed to the drawing: its line sample hangs in the start margin. */
function Term({
  glyph,
  term,
  children,
}: {
  glyph: 'contour' | 'index' | 'section' | 'interval';
  term: string;
  children: ReactNode;
}) {
  return (
    <div className="ps-10 text-base leading-relaxed">
      <dt className="inline font-display font-bold text-fg">
        <DensityLegendGlyph kind={glyph} className="-ms-10 me-3 inline-block h-3 w-7 align-[-0.05em]" />
        {term}
      </dt>{' '}
      <dd className="inline text-fg-muted">— {children}</dd>
    </div>
  );
}
