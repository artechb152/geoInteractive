'use client';
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { cn } from '@/lib/utils';

/* ─────────── ITM / WGS84 — "אותה נקודה. שתי שפות." ───────────
   Brief: design/docs/2026-09-29-coordinates-opus-handoff.md
   Mockup: design/mockups/coordinates-2026-09-29/coordinates-itm-wgs84-concept.png

   One map, one fixed point, two readings. Switching the system changes the
   explainer, the number pair and which reading is highlighted — never the
   map or the point. */

type SystemId = 'itm' | 'wgs84';

/* Sample point, verified with proj4 2.22.0 against the epsg.io EPSG:2039
   definition (TM on GRS80 + 7-parameter towgs84): 31.7857° N, 35.2007° E →
   E 219102.03, N 632555.49, rounded to the metre. Four decimal places of a
   degree are ≈ ±5 m, so the pair agrees within the precision it is written
   in. Reproducible: design/handoff/coordinates-itm-wgs84/verify-sample-point.mjs */
const SAMPLE_ITM = { e: 219102, n: 632555 } as const;

type System = {
  id: SystemId;
  code: string;
  tabUnit: string;
  name: string;
  summary: string;
  fields: { label: string; axis: 'E' | 'N'; value: string; unit: string }[];
  useful: string;
  remember: string;
  pros: string[];
  cons: string[];
};

// Copy: the brief's table; pros/cons rewritten to verified, non-sweeping
// claims (no military-usage, "always more accurate" or "every GPS" lines).
const SYSTEMS: System[] = [
  {
    id: 'itm',
    code: 'ITM',
    tabUnit: 'מטרים',
    name: 'רשת ישראל החדשה',
    summary: 'מיקום על רשת מקומית, במטרים.',
    fields: [
      { label: 'מזרח', axis: 'E', value: String(SAMPLE_ITM.e), unit: 'מטרים' },
      { label: 'צפון', axis: 'N', value: String(SAMPLE_ITM.n), unit: 'מטרים' },
    ],
    useful: 'קריאה ומדידה על מפה ברשת ישראל.',
    remember: 'בודקים שהמכשיר והמפה מוגדרים לאותה מערכת.',
    pros: [
      'הערכים במטרים: הפרש של 100 בין ערכי E הוא כ־100 מטר בשטח, לאורך אותו ציר.',
      'מספרים שלמים, בלי מעלות ובלי שברים — נוח לקריאה ולהעברה.',
    ],
    cons: [
      'מוגדרת לשימוש בישראל ובסביבתה. מחוץ לאזור הזה משתמשים ברשתות אחרות.',
      'מעבר ל־WGS84 ובחזרה דורש המרה מוגדרת (היטל והתמרה בין מערכות ייחוס) — לא העתקת מספרים.',
    ],
  },
  {
    id: 'wgs84',
    code: 'WGS84',
    tabUnit: 'מעלות',
    name: 'מערכת ייחוס עולמית',
    summary: 'מיקום לפי קו רוחב וקו אורך, במעלות.',
    fields: [
      { label: 'קו רוחב', axis: 'N', value: '31.7857°', unit: 'מעלות' },
      { label: 'קו אורך', axis: 'E', value: '35.2007°', unit: 'מעלות' },
    ],
    useful: 'שיתוף מיקום במערכות המבוססות על WGS84.',
    remember: 'מציינים גם את פורמט המעלות ואת סדר הערכים.',
    pros: [
      'מערכת עולמית: אותו אופן כתיבה מתאים לכל מקום על פני כדור הארץ.',
      'מערכת הייחוס של GPS, ולכן נפוצה במכשירי ניווט ובשיתוף מיקום.',
    ],
    cons: [
      'מעלות אינן מטרים: מעלת אורך אחת מייצגת מרחק שונה בקווי רוחב שונים, ולכן קשה למדוד מרחק ישירות מהערכים.',
      'מול מפה ברשת ישראל צריך להמיר את הערכים לפני שמסמנים את הנקודה.',
    ],
  },
];

/* ── Map base + registration ──────────────────────────────────────────────
   INTERIM: the brief's photographic paper-map base has not been produced
   yet — design/handoff/coordinates-itm-wgs84/README.md.
   Until it lands, the slot shows this lesson's existing illustrative terrain
   art (no names, numbers or printed grid). Swapping in the final asset means
   updating this one object: src, pixel size, and the measured trail junction.

   Everything on the map is placed in the image's own fractions (fx 0→1 west→
   east, fy 0→1 north→south), so the point stays glued to the same spot of
   terrain whatever the column's height. The ITM km grid is an overlay derived
   from the sample point and an illustrative scale — the terrain art itself
   has no geographic tie ("מפת המחשה"). */
const MAP_BASE = {
  src: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/reference-assets/coordinate-anatomy/terrain-map.png`,
  width: 1254,
  height: 1254,
  point: { fx: 0.63, fy: 0.44 },
  kmAcross: 4,
} as const;

const MAP_AR = MAP_BASE.width / MAP_BASE.height;
/* The map column stretches to the explainer's height, so the image "covers"
   it: the image box is the larger of (column width) and (column height × its
   aspect), centred. cq units keep every overlay in the same box from the first
   paint — no measuring, no hydration jump. */
const COVER_W = `max(100cqw, 100cqh * ${MAP_AR})`;
const COVER_H = `max(100cqh, 100cqw / ${MAP_AR})`;
const xAt = (fx: number) => `calc(50% + ${COVER_W} * ${(fx - 0.5).toFixed(4)})`;
const yAt = (fy: number) => `calc(50% + ${COVER_H} * ${(fy - 0.5).toFixed(4)})`;

/* Grid lines only where they stay clear of the column edges at the 1440px
   target, where the map column is ≈ 684 × 590 px (aspect ≈ 1.16). */
const VIEW_AR = 1.16;
function visibleSpan(axis: 'x' | 'y') {
  const r = axis === 'x' ? Math.min(1, VIEW_AR / MAP_AR) : Math.min(1, MAP_AR / VIEW_AR);
  const pad = r * 0.08;
  return [0.5 - r / 2 + pad, 0.5 + r / 2 - pad] as const;
}
const KM_DOWN = MAP_BASE.kmAcross * (MAP_BASE.height / MAP_BASE.width);
const fxOfEastKm = (km: number) => MAP_BASE.point.fx + (km - SAMPLE_ITM.e / 1000) / MAP_BASE.kmAcross;
const fyOfNorthKm = (km: number) => MAP_BASE.point.fy - (km - SAMPLE_ITM.n / 1000) / KM_DOWN;

function gridLines(center: number, span: number, toFrac: (km: number) => number, [lo, hi]: readonly [number, number]) {
  const out: { km: number; f: number }[] = [];
  for (let km = Math.floor(center - span); km <= Math.ceil(center + span); km++) {
    const f = toFrac(km);
    if (f >= lo && f <= hi) out.push({ km, f });
  }
  return out;
}
const EAST_LINES = gridLines(SAMPLE_ITM.e / 1000, MAP_BASE.kmAcross, fxOfEastKm, visibleSpan('x'));
const NORTH_LINES = gridLines(SAMPLE_ITM.n / 1000, KM_DOWN, fyOfNorthKm, visibleSpan('y'));
// The km lines a reading of this point starts from (its square's west/south edges).
const EAST_KM = Math.floor(SAMPLE_ITM.e / 1000);
const NORTH_KM = Math.floor(SAMPLE_ITM.n / 1000);

const FADE = 'transition-opacity duration-200 ease-snap motion-reduce:transition-none';

export function CoordinateSystemsComparison() {
  const [system, setSystem] = useState<SystemId>('itm');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const reduce = useReducedMotion();
  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const titleId = `${uid}-title`;
  const tabId = (id: SystemId) => `${uid}-tab-${id}`;
  const panelId = (id: SystemId) => `${uid}-panel-${id}`;
  const detailsId = `${uid}-details`;
  const detailsBtnId = `${uid}-details-btn`;

  // Two tabs: either arrow key flips to the other one; Home/End jump to the
  // ends. Focus follows the selection (roving tabindex).
  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = SYSTEMS.findIndex((s) => s.id === system);
    let next = -1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') next = (idx + 1) % SYSTEMS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = SYSTEMS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setSystem(SYSTEMS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section aria-labelledby={titleId} className="mb-12">
      {/* Title tier = SceneHeader's (brief: "לפי SceneHeader הקיים"), as an h3
          because this is one station inside the coordinates scene. */}
      <header className="mb-8 text-center">
        <h3
          id={titleId}
          className="mx-auto max-w-3xl font-display font-extrabold tracking-tight text-balance leading-[1.1] text-fg text-[clamp(1.875rem,3.8vw,2.875rem)]"
        >
          אותה נקודה. <span className="text-ember-deep">שתי שפות.</span>
        </h3>
        <p className="mx-auto mt-4 max-w-2xl font-display text-lg font-semibold leading-snug text-fg sm:text-xl text-pretty">
          המיקום בשטח נשאר קבוע. הדרך לכתוב אותו משתנה.
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg text-pretty">
          עברו בין השיטות וראו איך אותה נקודה נכתבת אחרת.
        </p>
      </header>

      {/* ONE workspace frame: explainer (DOM-first → visual right in RTL) and
          the map flush to the frame's other side. No cards inside. */}
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-paper-card shadow-elevated">
        <div className="grid lg:grid-cols-[minmax(0,35fr)_minmax(0,65fr)]">
          <div className="flex min-w-0 flex-col p-5 sm:p-6">
            <div
              role="tablist"
              aria-label="שיטת כתיבת המיקום"
              onKeyDown={onTabKeyDown}
              className="grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-bg-accent p-1"
            >
              {SYSTEMS.map((s, i) => {
                const selected = s.id === system;
                return (
                  <button
                    key={s.id}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={tabId(s.id)}
                    aria-selected={selected}
                    aria-controls={panelId(s.id)}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setSystem(s.id)}
                    className={cn(
                      'relative flex items-center justify-center rounded-lg px-2 py-2.5 font-display text-base cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none',
                      selected ? 'bg-bg-elevated font-bold text-fg shadow-pill-soft' : 'font-medium text-fg-muted hover:text-fg',
                    )}
                  >
                    {/* Code first in reading order; shown at the visual left
                        like the mockup ("ITM · מטרים"). */}
                    <span className="flex flex-row-reverse items-baseline gap-1.5">
                      <bdi dir="ltr">{s.code}</bdi>
                      <span aria-hidden>·</span>
                      <span>{s.tabUnit}</span>
                    </span>
                    <span
                      aria-hidden
                      className={cn('absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-accent', FADE, selected ? 'opacity-100' : 'opacity-0')}
                    />
                  </button>
                );
              })}
            </div>

            {/* Both panels share one grid cell, so the column — and the map
                that stretches to it — keeps one height in both states. */}
            <div className="mt-5 grid [&>*]:[grid-area:1/1]">
              {SYSTEMS.map((s) => {
                const shown = s.id === system;
                return (
                  <div
                    key={s.id}
                    role="tabpanel"
                    id={panelId(s.id)}
                    aria-labelledby={tabId(s.id)}
                    aria-hidden={!shown}
                    tabIndex={shown ? 0 : -1}
                    className={cn(
                      'min-w-0 rounded-lg transition-[opacity,visibility] duration-200 ease-snap motion-reduce:transition-none',
                      shown ? 'visible opacity-100' : 'invisible opacity-0',
                    )}
                  >
                    <SystemExplainer system={s} />
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              id={detailsBtnId}
              aria-expanded={detailsOpen}
              aria-controls={detailsId}
              onClick={() => setDetailsOpen((v) => !v)}
              className="mt-auto flex w-full items-center justify-between gap-3 border-t border-border/70 pt-3.5 pb-0.5 font-display text-lg font-bold text-fg cursor-pointer"
            >
              יתרונות ומגבלות
              <ChevronDown
                size={20}
                strokeWidth={2}
                aria-hidden
                className={cn('shrink-0 text-fg-muted transition-transform duration-200 ease-snap motion-reduce:transition-none', detailsOpen && 'rotate-180')}
              />
            </button>
          </div>

          <ComparisonMap system={system} />
        </div>

        {/* Details open as a full-width row under the workspace, so the map
            never rescales and the page simply grows (no fixed height). */}
        <motion.div
          id={detailsId}
          role="region"
          aria-labelledby={detailsBtnId}
          initial={false}
          animate={
            detailsOpen
              ? { height: 'auto', opacity: 1, visibility: 'visible' }
              : { height: 0, opacity: 0, transitionEnd: { visibility: 'hidden' } }
          }
          transition={{ duration: reduce ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="border-t border-border/70 px-5 py-6 sm:px-8">
            <div className="grid [&>*]:[grid-area:1/1]">
              {SYSTEMS.map((s) => (
                <div
                  key={s.id}
                  aria-hidden={s.id !== system}
                  className={cn(
                    'transition-[opacity,visibility] duration-200 ease-snap motion-reduce:transition-none',
                    s.id === system ? 'visible opacity-100' : 'invisible opacity-0',
                  )}
                >
                  <SystemDetails system={s} />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <SurfaceCard tone="pine" className="mt-4 rounded-3xl px-6 py-5 text-center sm:px-10">
        <p className="font-display text-2xl font-bold leading-tight text-paper-bright sm:text-3xl text-balance">
          המספרים משתנים. הנקודה לא.
        </p>
        <p className="mt-1.5 text-base leading-relaxed text-paper-bright/85 sm:text-lg text-pretty">
          לפני שמעבירים מיקום, מציינים גם את מערכת הקואורדינטות.
        </p>
      </SurfaceCard>

      {/* Bridge line only — the datum-shift block follows directly below, so
          no extra navigation path is created. */}
      <p className="mt-5 flex items-center gap-1.5 text-base font-medium text-fg-muted">
        בהמשך: מה קורה כשמערבבים בין השיטות?
        <ChevronLeft size={18} strokeWidth={2} aria-hidden className="shrink-0" />
      </p>
    </section>
  );
}

function SystemExplainer({ system: s }: { system: System }) {
  return (
    <>
      <div className="text-center">
        <bdi dir="ltr" className="block font-display text-4xl font-bold leading-none text-fg">
          {s.code}
        </bdi>
        <div className="mt-2.5 font-display text-2xl font-bold leading-snug text-fg">{s.name}</div>
        <p className="mt-1 text-base leading-relaxed text-fg-muted">{s.summary}</p>
      </div>

      <dl className="mt-4 border-y border-border/80">
        {s.fields.map((f, i) => (
          <div key={f.label} className={cn('flex items-center justify-between gap-4 py-3', i > 0 && 'border-t border-border/60')}>
            <dt className="min-w-0">
              {/* Same E/N badge as the readings on the map and the device
                  screen, so the numbers here visibly are those readings. */}
              <div className="flex items-center gap-2 font-display text-lg font-bold leading-snug text-fg">
                {f.label}
                <AxisBadge>{f.axis}</AxisBadge>
              </div>
              <div className="text-base leading-snug text-fg-muted">{f.unit}</div>
            </dt>
            <dd className="font-display text-[2.25rem] font-bold leading-none tabular-nums text-fg">
              <bdi dir="ltr">{f.value}</bdi>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 space-y-3 pb-4">
        <div>
          <h4 className="font-display text-lg font-bold leading-snug text-fg">מתי זה שימושי?</h4>
          <p className="mt-0.5 text-base leading-relaxed text-fg text-pretty">{s.useful}</p>
        </div>
        <div>
          <h4 className="font-display text-lg font-bold leading-snug text-fg">מה חשוב לזכור?</h4>
          <p className="mt-0.5 text-base leading-relaxed text-fg text-pretty">{s.remember}</p>
        </div>
      </div>
    </>
  );
}

function SystemDetails({ system: s }: { system: System }) {
  const lists = [
    { title: 'יתרונות', items: s.pros },
    { title: 'מגבלות', items: s.cons },
  ];
  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-10">
      {lists.map((l) => (
        <div key={l.title}>
          <h4 className="mb-2 font-display text-lg font-bold text-fg">
            {l.title} · <bdi dir="ltr">{s.code}</bdi>
          </h4>
          <ul className="space-y-1.5 text-base leading-relaxed">
            {l.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="text-fg-muted">·</span>
                <span className="text-fg text-pretty">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ── The map ──────────────────────────────────────────────────────────────
   All positions below are physical (left/top/right/bottom in inline styles),
   not logical: like the terrain itself, a map's north arrow, grid labels and
   the device resting on its lower-left corner must not move because the page
   is RTL.

   The two states differ in hierarchy and layers, not just a highlight:
   ITM   — the map reads the point: strong km grid, E/N readings in the
           margins and two guide lines from the point to them; the device
           shrinks into its corner.
   WGS84 — the device reads the point: the whole ITM layer is removed, the
           map recedes under a paper veil, the device grows and a leader line
           ties its screen to the point.
   Which state stars the map or the device is an illustration choice only —
   ITM is not limited to paper maps and a GPS can be set to other systems,
   hence the "המכשיר מוגדר ל־WGS84" tag. The point itself never moves. */

/** Map-column px of an image fraction — the same cover maths as COVER_W/H. */
function coverPx(w: number, h: number, fx: number, fy: number) {
  const cw = Math.max(w, h * MAP_AR);
  const ch = Math.max(h, w / MAP_AR);
  return { x: w / 2 + cw * (fx - 0.5), y: h / 2 + ch * (fy - 0.5) };
}

/* The guide/leader lines need real px for their end points, so the map
   column is measured. The scene mounts client-side and this runs before
   paint, so the lines never appear late. */
function useBoxSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

const MARKER_R = 13; // half of the 26px marker
const GUIDE = { stroke: 'stroke-accent', width: 2, dash: '6 5' } as const;

function ComparisonMap({ system }: { system: SystemId }) {
  const itm = system === 'itm';
  const [ref, size] = useBoxSize<HTMLDivElement>();
  const label = `מפת המחשה: נקודה אחת מסומנת על המפה. ברשת ישראל היא נקראת מזרח ${SAMPLE_ITM.e}, צפון ${SAMPLE_ITM.n} מטרים. מכשיר GPS שמוגדר ל־WGS84 מציג את אותה נקודה: קו רוחב 31.7857 מעלות צפון, קו אורך 35.2007 מעלות מזרח. ${
    itm
      ? 'מודגשות רשת הקילומטרים של ITM ושתי קווי עזר מהנקודה אל קריאת המזרח בשוליים העליונים ואל קריאת הצפון בשוליים הימניים.'
      : 'רשת ITM מוסתרת, המפה מעומעמת, ומכשיר ה־GPS מוגדל ומחובר בקו אל הנקודה.'
  }`;

  const pt = size && coverPx(size.w, size.h, MAP_BASE.point.fx, MAP_BASE.point.fy);
  // Leader: from the screen's right edge (WGS84 pose) to the marker's rim.
  const lead = (() => {
    if (!size || !pt) return null;
    const from = gpsPx(GPS_POSE.wgs84, size.h, GPS_SCREEN_EDGE.u, GPS_SCREEN_EDGE.v);
    const dx = pt.x - from.x;
    const dy = pt.y - from.y;
    const len = Math.hypot(dx, dy);
    const gap = MARKER_R + 4;
    return { from, to: { x: pt.x - (dx / len) * gap, y: pt.y - (dy / len) * gap } };
  })();
  const deviceTop = size && gpsPx(GPS_POSE.wgs84, size.h, 0.5, 0);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className="relative min-h-0 overflow-hidden bg-paper-panel aspect-[5/4] lg:aspect-auto [container-type:size]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
      <img
        src={MAP_BASE.src}
        alt=""
        draggable={false}
        className="pointer-events-none absolute max-w-none select-none"
        style={{ width: COVER_W, height: COVER_H, left: `calc(50% - ${COVER_W} / 2)`, top: `calc(50% - ${COVER_H} / 2)` }}
      />

      {/* ITM km grid — same box as the image, so lines stay registered. The
          two lines the reading starts from (219 E / 632 N) are the strongest. */}
      <svg
        viewBox={`0 0 1000 ${1000 / MAP_AR}`}
        preserveAspectRatio="none"
        aria-hidden
        className={cn('pointer-events-none absolute', FADE, itm ? 'opacity-100' : 'opacity-0')}
        style={{ width: COVER_W, height: COVER_H, left: `calc(50% - ${COVER_W} / 2)`, top: `calc(50% - ${COVER_H} / 2)` }}
      >
        {EAST_LINES.map((l) => (
          <line
            key={`e${l.km}`}
            x1={l.f * 1000}
            y1={0}
            x2={l.f * 1000}
            y2={1000 / MAP_AR}
            className={l.km === EAST_KM ? 'stroke-fg/85' : 'stroke-fg/55'}
            strokeWidth={l.km === EAST_KM ? 2 : 1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {NORTH_LINES.map((l) => (
          <line
            key={`n${l.km}`}
            x1={0}
            y1={(l.f * 1000) / MAP_AR}
            x2={1000}
            y2={(l.f * 1000) / MAP_AR}
            className={l.km === NORTH_KM ? 'stroke-fg/85' : 'stroke-fg/55'}
            strokeWidth={l.km === NORTH_KM ? 2 : 1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* WGS84: the map steps back to context under a paper veil. */}
      <div aria-hidden className={cn('pointer-events-none absolute inset-0 bg-paper-card', FADE, itm ? 'opacity-0' : 'opacity-60')} />

      {/* km labels: eastings along the top edge, northings along the right
          edge (the lower-left corner belongs to the device). */}
      <div aria-hidden className={cn('pointer-events-none', FADE, itm ? 'opacity-100' : 'opacity-0')}>
        {EAST_LINES.map((l) => (
          <GridLabel key={`e${l.km}`} strong={l.km === EAST_KM} style={{ left: xAt(l.f), top: 10, transform: 'translateX(-50%)' }}>
            {l.km}
          </GridLabel>
        ))}
        {NORTH_LINES.map((l) => (
          <GridLabel key={`n${l.km}`} strong={l.km === NORTH_KM} style={{ right: 10, top: yAt(l.f), transform: 'translateY(-50%)' }}>
            {l.km}
          </GridLabel>
        ))}
      </div>

      {/* ITM: two guides from the point to the margin readings (they run
          under the chips, so the chips' exact size doesn't matter). */}
      {size && pt && (
        <>
          <svg aria-hidden width={size.w} height={size.h} className={cn('pointer-events-none absolute inset-0', FADE, itm ? 'opacity-100' : 'opacity-0')}>
            <g className={GUIDE.stroke} strokeWidth={GUIDE.width} strokeDasharray={GUIDE.dash} strokeLinecap="round" fill="none">
              <line x1={pt.x} y1={pt.y - MARKER_R - 4} x2={pt.x} y2={56} />
              <line x1={pt.x + MARKER_R + 4} y1={pt.y} x2={size.w - 70} y2={pt.y} />
            </g>
          </svg>
          <ReadingChip axis="E" value={String(SAMPLE_ITM.e)} shown={itm} style={{ left: pt.x, top: 40, transform: 'translateX(-50%)' }} />
          <ReadingChip axis="N" value={String(SAMPLE_ITM.n)} shown={itm} style={{ right: 54, top: pt.y, transform: 'translateY(-50%)' }} />
        </>
      )}

      {/* North arrow — upper-left under the easting label row, never mirrored. */}
      <div aria-hidden className="pointer-events-none absolute flex flex-col items-center text-fg" style={{ left: 20, top: 50 }}>
        <span className="font-display text-sm font-bold leading-none">N</span>
        <svg width="14" height="18" viewBox="0 0 10 12" fill="currentColor" className="mt-0.5">
          <path d="M5 0 L10 12 L5 9 L0 12 Z" />
        </svg>
      </div>

      <GpsDevice system={system} />

      {/* WGS84: leader from the device screen to the point, drawn over the
          device so it visibly leaves the screen. */}
      {lead && (
        <svg aria-hidden width={size!.w} height={size!.h} className={cn('pointer-events-none absolute inset-0', FADE, itm ? 'opacity-0' : 'opacity-100')}>
          <line
            x1={lead.from.x}
            y1={lead.from.y}
            x2={lead.to.x}
            y2={lead.to.y}
            className={GUIDE.stroke}
            strokeWidth={GUIDE.width}
            strokeDasharray={GUIDE.dash}
            strokeLinecap="round"
          />
          <circle cx={lead.from.x} cy={lead.from.y} r={4.5} className="fill-accent" />
        </svg>
      )}
      {deviceTop && (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute whitespace-nowrap rounded-lg border border-border/70 bg-paper-card px-2.5 py-1 font-display text-sm font-bold leading-tight text-fg shadow-card-soft',
            FADE,
            itm ? 'opacity-0' : 'opacity-100',
          )}
          style={{ left: deviceTop.x, top: deviceTop.y - 10, transform: 'translate(-50%, -100%)' }}
        >
          המכשיר מוגדר ל־<bdi dir="ltr">WGS84</bdi>
        </div>
      )}

      {/* The point — identical in both states. Its tag sits up-left, clear
          of the ITM guides (up / right) and the WGS84 leader (from below-left).
          The marker gets an explicit left/top: under RTL an absolute box with
          auto offsets anchors to the zero-width parent's right edge. */}
      <div aria-hidden className="pointer-events-none absolute" style={{ left: xAt(MAP_BASE.point.fx), top: yAt(MAP_BASE.point.fy) }}>
        <span
          className="absolute whitespace-nowrap rounded-lg border border-border/70 bg-paper-card px-3 py-1.5 font-display text-base font-bold leading-tight text-fg shadow-card-soft"
          style={{ right: 12, bottom: 12 }}
        >
          אותה נקודה
        </span>
        <span
          className="absolute grid size-[26px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-accent bg-paper-bright shadow-[0_2px_6px_rgba(40,50,35,0.35)]"
          style={{ left: 0, top: 0 }}
        >
          <span className="size-2.5 rounded-full bg-accent" />
        </span>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute rounded-md bg-paper-card/85 px-2 py-0.5 text-sm font-medium text-fg-muted"
        style={{ right: 52, bottom: 12 }}
      >
        מפת המחשה
      </div>
    </div>
  );
}

function AxisBadge({ children }: { children: React.ReactNode }) {
  return (
    <bdi
      dir="ltr"
      className="inline-grid size-[22px] shrink-0 place-items-center rounded-md border-[1.5px] border-accent font-display text-sm font-bold leading-none text-fg"
    >
      {children}
    </bdi>
  );
}

function ReadingChip({ axis, value, shown, style }: { axis: 'E' | 'N'; value: string; shown: boolean; style: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      dir="ltr"
      className={cn(
        'pointer-events-none absolute flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-accent/60 bg-paper-card px-2 py-1 font-display text-[17px] font-bold leading-none tabular-nums text-fg shadow-card-soft',
        FADE,
        shown ? 'opacity-100' : 'opacity-0',
      )}
      style={style}
    >
      <AxisBadge>{axis}</AxisBadge>
      {value}
    </div>
  );
}

function GridLabel({ strong, style, children }: { strong: boolean; style: React.CSSProperties; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'absolute rounded px-1 font-display text-sm leading-snug tabular-nums',
        strong ? 'bg-fg font-bold text-paper-bright' : 'bg-paper-card/85 font-semibold text-fg',
      )}
      style={style}
    >
      {children}
    </span>
  );
}

/* ── GPS device ───────────────────────────────────────────────────────────
   INTERIM body: drawn in code until the brief's photographic, unbranded
   device (real alpha, blank screen) is produced — same handoff README as the
   map. The screen is always live HTML over the body's screen rect; with the
   final image only GPS_BODY_RATIO, GPS_SCREEN and GPS_SCREEN_EDGE need
   re-measuring.
   The device is set to WGS84 in both states — in ITM mode that is exactly
   the "check that the device and the map use the same system" situation. */
const GPS_BODY_RATIO = '200 / 330';
const GPS_SCREEN = { left: '15.5%', top: '18.48%', width: '69%', height: '40%' } as const;
// Right edge, mid-height of the screen, as fractions of the device box.
const GPS_SCREEN_EDGE = { u: 169 / 200, v: 127 / 330 } as const;

/* The device box rests on the map's lower-left corner; each state poses it
   with one transform about the box's bottom-left corner. gpsPx mirrors that
   transform so the leader line can start exactly at the screen. */
const GPS_BOX = { left: 30, bottom: -34, width: 192 } as const;
const GPS_BOX_H = (GPS_BOX.width * 330) / 200;
type Pose = { tx: number; ty: number; rot: number; s: number };
const GPS_POSE: Record<SystemId, Pose> = {
  itm: { tx: -6, ty: 52, rot: -9, s: 0.78 },
  wgs84: { tx: 22, ty: -64, rot: -5, s: 1.3 },
};
const poseTransform = (p: Pose) => `translate(${p.tx}px, ${p.ty}px) rotate(${p.rot}deg) scale(${p.s})`;

function gpsPx(p: Pose, mapH: number, u: number, v: number) {
  const lx = u * GPS_BOX.width * p.s;
  const ly = (v - 1) * GPS_BOX_H * p.s;
  const a = (p.rot * Math.PI) / 180;
  return {
    x: GPS_BOX.left + p.tx + lx * Math.cos(a) - ly * Math.sin(a),
    y: mapH - GPS_BOX.bottom + p.ty + lx * Math.sin(a) + ly * Math.cos(a),
  };
}

function GpsDevice({ system }: { system: SystemId }) {
  const focused = system === 'wgs84';
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute transition-transform duration-300 ease-snap motion-reduce:transition-none"
      style={{
        left: GPS_BOX.left,
        bottom: GPS_BOX.bottom,
        width: GPS_BOX.width,
        transform: poseTransform(GPS_POSE[system]),
        transformOrigin: '0% 100%',
      }}
    >
      <div className="relative drop-shadow-[0_12px_14px_rgba(40,50,35,0.35)]" style={{ aspectRatio: GPS_BODY_RATIO }}>
        <GpsBodyArt />
        <div
          dir="ltr"
          className={cn(
            'absolute flex flex-col rounded-[6px] px-2.5 pb-2 pt-1.5 font-display text-fg ring-accent transition-shadow duration-200 ease-snap motion-reduce:transition-none',
            focused ? 'ring-2' : 'ring-0',
          )}
          style={GPS_SCREEN}
        >
          <div className={cn('flex flex-1 flex-col', FADE, focused ? 'opacity-100' : 'opacity-60')}>
            <div className="border-b border-fg/25 pb-1 text-sm font-bold leading-none tracking-wide">WGS84</div>
            <div className="flex flex-1 flex-col justify-center gap-2 text-lg font-semibold leading-none tabular-nums">
              {(
                [
                  ['N', '31.7857°'],
                  ['E', '35.2007°'],
                ] as const
              ).map(([axis, value]) => (
                <div key={axis} className="flex items-center justify-between gap-1.5">
                  <span className="grid size-[18px] place-items-center rounded-[4px] border border-fg/60 text-[13px] font-bold leading-none">
                    {axis}
                  </span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Colours are the existing tokens (tailwind.config.ts): pine / pine.hi /
// pine.lo / olive.ink / tanline / paper.card / paper.bright.
function GpsBodyArt() {
  return (
    <svg viewBox="0 0 200 330" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <linearGradient id="gpsBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#374133" />
          <stop offset="1" stopColor="#283223" />
        </linearGradient>
        <linearGradient id="gpsLcd" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#DCCDB2" />
          <stop offset="1" stopColor="#F8F2E7" />
        </linearGradient>
      </defs>
      <rect x="62" y="2" width="76" height="40" rx="13" fill="#283223" />
      <rect x="0" y="118" width="10" height="96" rx="4" fill="#283223" />
      <rect x="190" y="118" width="10" height="96" rx="4" fill="#283223" />
      <rect x="4" y="22" width="192" height="304" rx="36" fill="url(#gpsBody)" stroke="#283223" strokeWidth="1.5" />
      <rect x="10" y="28" width="180" height="292" rx="31" fill="none" stroke="#FDFBF3" strokeOpacity="0.1" strokeWidth="2" />
      <rect x="21" y="51" width="158" height="152" rx="14" fill="#283223" />
      <rect x="31" y="61" width="138" height="132" rx="6" fill="url(#gpsLcd)" />
      <rect x="31" y="61" width="138" height="6" rx="3" fill="#2E3826" fillOpacity="0.12" />
      <circle cx="100" cy="262" r="31" fill="#283223" />
      <circle cx="100" cy="262" r="26" fill="#38432E" stroke="#FDFBF3" strokeOpacity="0.12" />
      <path d="M100 243 l7 9 h-14 z M100 281 l7 -9 h-14 z" fill="#FDFBF3" fillOpacity="0.55" />
      {[
        [24, 224],
        [138, 224],
        [24, 278],
        [138, 278],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="38" height="22" rx="11" fill="#38432E" stroke="#FDFBF3" strokeOpacity="0.12" />
      ))}
      {[
        [22, 40],
        [178, 40],
        [22, 308],
        [178, 308],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="#283223" stroke="#FDFBF3" strokeOpacity="0.15" />
      ))}
    </svg>
  );
}
