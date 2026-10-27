'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion, type MotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EXTENT_H, EXTENT_W, POINTS, SCALE_BAR_M, START_POINT, VIEW, ZONE, type PointId } from './reference-systems/referenceSystems.data';
import {
  NBSP, READINGS, TRUE_NORTH_DEG, dmsParts, featureOutline, fx, fy, graticule, graticuleLabel, gridOffset, groupThousands, polylinePoints, readingLines,
  rightLabelFits, secondsFraction, topLabelFits, utmGrid, type ReadingLines,
} from './reference-systems/referenceSystemsGeometry';
import type { Dms } from './reference-systems/utm';

/* ─────────── מערכות ייחוס — screen 1: one map, two ways to state a place ───────────
   Brief: design/mockups/topic-02-reference-systems-2026-10-11/claude-reference-systems-single-map.md
          (supersedes the two-map structure of claude-linked-comparison-toggle-and-split.md)

   One map of the illustrated terrain. One method switch above it (גיאוגרפית /
   UTM), the three point buttons under it, and beside it a panel that says what
   the reading means: in the geographic method, what degrees / minutes / seconds
   and N / E are, with a 0″–60″ bar per reading so the change between points is
   visible; in UTM, why the numbers are large, and how far the chosen feature
   lies from the bridge on the grid. Switching keeps the point and the terrain;
   picking keeps the method. The datum (WGS84) is not shown here — the
   conversions still use it, and screen 2 defines it.

   The panel has the same slots in both methods — the point's name, its reading,
   the change from the bridge, the general explanation — so a switch refills the
   slots in place and the name never moves.

   The table, conclusion and definitions are screen 2 ("כיצד מפרשים קואורדינטות?",
   CoordinatesPart2Scene) — static, outside this card. */

const BASE_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/reference-systems/linked-terrain-base.webp`;
const EASE = [0.22, 1, 0.36, 1] as const;

type Method = 'geo' | 'utm';

/* ── Switching method: what stays, what changes ───────────────────────────
   Stays, never animated: the terrain and its crop, the pins, the chosen point's
   anchor ring and feature outline, the north arrow, the scale bar, the name.
   Changes, in one sequence: the old grid, the point's two lines, the frame
   values and the panel's reading leave together (out); the shown method swaps
   once, to the latest choice; the new grid comes in, the point's two lines grow
   out of the unmoved point to the frame (reveal), and the frame values and the
   panel's numbers appear together where those lines end (value). A new pick
   replays the second half for the new point.
   Values are swapped whole — never counted, interpolated or laid over each
   other — so every number on screen is a real coordinate of the shown point.
   Reduced motion: the final state at once; the still map and name carry
   "the same point".
   The swap comes a little before the fade-out ends (swap < out): the old layers
   unmount nearly transparent, so framer's end-of-fade hand-off (WAAPI cancelled,
   end value written a frame later) can never flash them back at full strength. */
const T = { out: 0.16, swap: 0.12, grid: 0.2, reveal: 0.28, valueDelay: 0.16, value: 0.16 } as const;

/** The method the map and panel show. A new choice first fades the shown one out, then swaps once
    to the latest choice: a quick run of clicks shows only the last, never a mix of the two. */
function useShownMethod(method: Method, reduce: boolean) {
  const [shown, setShown] = useState(method);
  useEffect(() => {
    if (shown === method) return;
    const t = setTimeout(() => setShown(method), reduce ? 0 : T.swap * 1000);
    return () => clearTimeout(t);
  }, [method, shown, reduce]);
  return reduce ? { shown: method, leaving: false } : { shown, leaving: shown !== method };
}

/** False for the first render only: what the page opens on is drawn as it is; later changes animate. */
function useAfterMount() {
  const [after, setAfter] = useState(false);
  useEffect(() => setAfter(true), []);
  return after;
}

type Phase = { enter: boolean; leaving: boolean; reduce: boolean };

/** A changing layer: fades in when it mounts (after `delay`), out with the method being left. */
function fadeLayer({ enter, leaving, reduce }: Phase, delay = 0, duration: number = T.grid): MotionProps {
  return {
    initial: enter && !reduce ? { opacity: 0 } : false,
    animate: { opacity: leaving ? 0 : 1 },
    transition: reduce ? { duration: 0 } : leaving ? { duration: T.out, ease: EASE } : { duration, delay, ease: EASE },
  };
}
const valueLayer = (p: Phase) => fadeLayer(p, T.valueDelay, T.value);

/** The feature each point marks (A on the bridge, B on the ridge summit, C in the village). */
const FEATURE: Record<PointId, { name: string; definite: string }> = {
  A: { name: 'גשר', definite: 'הגשר' },
  B: { name: 'רכס', definite: 'הרכס' },
  C: { name: 'יישוב', definite: 'היישוב' },
};
const METHOD_LABEL: Record<Method, string> = { geo: 'גיאוגרפית', utm: 'UTM' };

/* ── What changes, said in words — derived from the stored E/N and the converted
   readings (never from display strings). The relations hold for these three nearby
   points in the northern / eastern hemisphere; they are not a rule for the globe. */

const REF = START_POINT;

/** "מצפון־מערב" etc., from the grid difference. */
function quarter(dE: number, dN: number) {
  return `מ${dN > 0 ? 'צפון' : 'דרום'}־${dE < 0 ? 'מערב' : 'מזרח'}`;
}

/** The two readings share degrees and minutes, so the change is in the seconds. */
const sameDegMin = (a: Dms, b: Dms) => a.deg === b.deg && a.min === b.min;
/** True for the three points here — the geo notes say so once, under the readings. */
const SECONDS_ONLY = POINTS.every((p) => sameDegMin(READINGS[p.id].latDms, READINGS[REF].latDms) && sameDegMin(READINGS[p.id].lonDms, READINGS[REF].lonDms));

/* The lead above the card already says what to do; the sentences only say what changed. */
function geoFeedback(id: PointId) {
  if (id === REF) return `${FEATURE[id].definite} הוא נקודת ההשוואה: אין שינוי ברוחב או באורך.`;
  const a = READINGS[REF];
  const b = READINGS[id];
  const { dE, dN } = gridOffset(id);
  const latUp = b.lat > a.lat;
  const lonUp = b.lon > a.lon;
  const change =
    latUp === lonUp ? `הרוחב והאורך ${latUp ? 'גדולים' : 'קטנים'} יותר` : `הרוחב ${latUp ? 'גדל' : 'קטן'} והאורך ${lonUp ? 'גדל' : 'קטן'}`;
  return `${FEATURE[id].definite} נמצא ${quarter(dE, dN)} לגשר: ${change}.`;
}

function gridFeedback(id: PointId) {
  if (id === REF) return 'הגשר הוא נקודת ההשוואה: אין שינוי במזרח או בצפון.';
  const { dE, dN } = gridOffset(id);
  return `${FEATURE[id].definite} נמצא ${quarter(dE, dN)} לגשר: ${Math.abs(dE)} מטרים ${dE < 0 ? 'מערבה' : 'מזרחה'} ו־${Math.abs(dN)} מטרים ${dN > 0 ? 'צפונה' : 'דרומה'} ברשת.`;
}

// Same choice language as the rest of the scene (CoordinatesPart2Scene CHOICE / choiceTone),
// plus ring-1 on the chosen one so "selected" never rests on colour alone.
const CHOICE =
  'rounded-xl border cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated';
const choiceTone = (on: boolean) => (on ? 'border-accent bg-accent/10 ring-1 ring-accent' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]');

function L({ children }: { children: ReactNode }) {
  return <bdi dir="ltr">{children}</bdi>;
}

const UTM_GRID = utmGrid();
const GRATICULE = graticule();
/** Reading lines and frame values for every point on either method — computed once. */
const LINES = Object.fromEntries(
  (['geo', 'utm'] as const).map((k) => [k, Object.fromEntries(POINTS.map((p) => [p.id, readingLines(p.id, k)]))]),
) as Record<Method, Record<PointId, ReadingLines>>;

/** `header` — the block's heading and instruction, set at the top of the card (one envelope per activity). */
export function ReferenceSystemsLinkedComparison({ header }: { header?: React.ReactNode }) {
  const [selected, setSelected] = useState<PointId>(START_POINT);
  const [preview, setPreview] = useState<PointId | null>(null);
  const [method, setMethod] = useState<Method>('geo');
  const [announce, setAnnounce] = useState('');
  const reduce = useReducedMotion() ?? false;
  const { shown, leaving } = useShownMethod(method, reduce);
  const phase: Phase = { enter: useAfterMount(), leaving, reduce };

  const pick = (id: PointId) => {
    setSelected(id);
    setPreview(null);
    if (id !== selected) setAnnounce(`נבחרה נקודה ${id}, ${FEATURE[id].name}`);
  };
  const choose = (m: Method) => {
    setMethod(m);
    if (m !== method) setAnnounce(`שיטה ${METHOD_LABEL[m]}. נקודה ${selected}, ${FEATURE[selected].name}, נשארת במקומה.`);
  };
  const hover = preview && preview !== selected ? preview : null;

  return (
    <div className="surface-elevated p-6 lg:p-8" data-activity="reference-systems">
      {header}
      {/* the map (first column → right) between its two control rows — method above, point under it —
          both labelled and set to the map's start edge; the panel beside the column, from the method
          row's top: down to the point row's foot in geographic, which fills it; as tall as its own
          content in UTM, which is shorter — no empty box under it */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-x-8">
        <ControlRow label="שיטה:" groupLabel="שיטת הקואורדינטות במפה" data-method-switch>
          {(['geo', 'utm'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={method === m}
              data-method-button={m}
              onClick={() => choose(m)}
              className={cn(CHOICE, choiceTone(method === m), 'h-11 min-w-[6.5rem] px-4 font-display text-base font-bold text-black')}
            >
              {m === 'utm' ? <L>UTM</L> : METHOD_LABEL[m]}
            </button>
          ))}
        </ControlRow>

        <TerrainMap kind={shown} selected={selected} hover={hover} phase={phase} onPick={pick} onPreview={setPreview} />

        <ControlRow label="נקודה:" groupLabel="בחירת נקודה" data-point-row>
          {POINTS.map((p) => {
            const on = selected === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                aria-label={`${p.id} ${FEATURE[p.id].name}`}
                data-point-button={p.id}
                onClick={() => pick(p.id)}
                onPointerEnter={() => setPreview(p.id)}
                onPointerLeave={() => setPreview(null)}
                onFocus={() => setPreview(p.id)}
                onBlur={() => setPreview(null)}
                className={cn(CHOICE, choiceTone(on), 'h-11 px-4 font-display text-base font-bold text-black')}
              >
                <PointName id={p.id} />
              </button>
            );
          })}
        </ControlRow>

        <ExplainPanel method={shown} selected={selected} phase={phase} />
      </div>

      {/* one short announcement per new point or method; the panel is not live */}
      <p className="sr-only" aria-live="polite" data-announce>
        {announce}
      </p>
    </div>
  );
}

/** A control row of the map column: its short visual label, then the buttons (the group carries the name). */
function ControlRow({ label, groupLabel, children, ...data }: { label: string; groupLabel: string; children: ReactNode } & Record<`data-${string}`, boolean>) {
  return (
    <div className="flex min-w-0 items-center gap-3 lg:col-start-1">
      <span aria-hidden className="text-base text-fg-muted">
        {label}
      </span>
      <div role="group" aria-label={groupLabel} className="flex flex-wrap gap-2" {...data}>
        {children}
      </div>
    </div>
  );
}

/** "A · גשר" — the dot is visual only (accessible names read "A גשר"). */
function PointName({ id }: { id: PointId }) {
  return (
    <>
      <L>{id}</L>
      <span aria-hidden> · </span>
      {FEATURE[id].name}
    </>
  );
}

/* ── The panel beside the map ─────────────────────────────────────────── */

/** The same four slots in both methods — name, reading, change from the bridge, explanation — so a
    switch refills them in place. The name stays put (the point did not move); the rest is the method's. */
function ExplainPanel({ method, selected, phase }: { method: Method; selected: PointId; phase: Phase }) {
  const r = READINGS[selected];
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      data-explain={method}
      className={cn(
        'flex min-w-0 flex-col gap-4 rounded-xl border border-border/60 bg-bg-accent/40 p-5 lg:col-start-2 lg:row-span-3 lg:row-start-1',
        method === 'utm' && 'lg:self-start',
      )}
    >
      <h4 id={titleId} data-feature={selected} className="font-display text-base font-bold leading-tight text-black md:text-lg">
        <PointName id={selected} />
      </h4>

      <motion.div key={method} data-explain-body={method} className="flex flex-col gap-4" {...fadeLayer(phase)}>
        {method === 'geo' ? (
          <>
            <div data-reading-box className="divide-y divide-border/60 rounded-lg border border-border/60 bg-bg-elevated px-4">
              <AngleReading
                field="lat"
                label="רוחב"
                axis="ϕ"
                meaning={
                  <>
                    זווית צפונה או דרומה מקו המשווה. <L>N</L> מציין צפון.
                  </>
                }
                dms={r.latDms}
                refDms={READINGS[REF].latDms}
                selected={selected}
                phase={phase}
              />
              <AngleReading
                field="lon"
                label="אורך"
                axis="λ"
                meaning={
                  <>
                    זווית מזרחה או מערבה מקו האורך של גריניץ׳. <L>E</L> מציין מזרח.
                  </>
                }
                dms={r.lonDms}
                refDms={READINGS[REF].lonDms}
                selected={selected}
                phase={phase}
              />
            </div>
            <Change title="השינוי בקריאה ביחס לגשר" selected={selected} phase={phase}>
              {geoFeedback(selected)}
            </Change>
            <div data-geo-notes className="space-y-2 text-base leading-relaxed text-black text-pretty">
              <p>
                דקות ושניות הן חלקים של מעלה, לא יחידות זמן: מעלה אחת מחולקת ל־<L>60</L> דקות, ודקה אחת ל־<L>60</L> שניות.
              </p>
              {SECONDS_ONLY && <p>הנקודות קרובות זו לזו. לכן כאן המעלות והדקות נשארות זהות, והשינוי מופיע בשניות.</p>}
            </div>
          </>
        ) : (
          <>
            <dl data-utm-reading data-reading-box className="divide-y divide-border/60 rounded-lg border border-border/60 bg-bg-elevated px-4">
              {[
                { field: 'e', label: 'מזרח', axis: 'E', value: r.point.e },
                { field: 'n', label: 'צפון', axis: 'N', value: r.point.n },
              ].map((row) => (
                <div key={row.field} data-field={row.field} className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="font-display text-base font-bold leading-tight text-black">
                    {row.label} <L>{row.axis}</L>
                  </dt>
                  <dd className="flex items-baseline gap-2 whitespace-nowrap">
                    <span data-value={row.field} className="font-display text-xl font-bold leading-tight tabular-nums text-black">
                      <L>
                        <motion.span key={selected} className="inline-block" {...valueLayer(phase)}>
                          {groupThousands(row.value)}
                        </motion.span>
                      </L>
                    </span>
                    <span className="text-base text-fg-muted">מטרים</span>
                  </dd>
                </div>
              ))}
              <p data-zone-meaning className="py-2 text-base leading-6 text-fg-muted">
                פלח {ZONE.zone} · חצי הכדור הצפוני <L>({ZONE.hemisphere})</L>
              </p>
            </dl>
            <Change title="השינוי ברשת ביחס לגשר" selected={selected} phase={phase}>
              {gridFeedback(selected)}
            </Change>
            <p data-utm-why className="text-base leading-relaxed text-black text-pretty">
              אלה ערכי מיקום ברשת רחבה, לא מרחקים משפת המפה. בפלח הצפוני, ערך הצפון נמדד ברשת מקו המשווה; לקו האורך המרכזי של הפלח ניתן ערך מזרח של{' '}
              <L>500,000</L> מטרים. לכן גם אזור קטן במפה יכול לקבל מספרי קואורדינטות גדולים.
            </p>
          </>
        )}
      </motion.div>
    </section>
  );
}

/** "What changed from the bridge" — the same box in both methods; its sentence arrives with the numbers.
    Two lines kept for it, so a pick never resizes the panel (A's sentence is one line in geo). */
function Change({ title, selected, phase, children }: { title: string; selected: PointId; phase: Phase; children: ReactNode }) {
  return (
    <div data-change={selected} className="rounded-lg bg-bg-elevated px-4 py-3">
      <h5 className="font-display text-base font-bold leading-tight text-black">{title}</h5>
      <motion.p key={selected} data-feedback className="mt-1 min-h-[3.25rem] text-base leading-relaxed text-black text-pretty" {...valueLayer(phase)}>
        {children}
      </motion.p>
    </div>
  );
}

const DMS_CAPTIONS = ['מעלות', 'דקות', 'שניות', 'כיוון'];

/** One geographic reading: what it measures, the value in captioned groups, and its seconds on a fixed 0″–60″ bar. */
function AngleReading({
  field,
  label,
  axis,
  meaning,
  dms,
  refDms,
  selected,
  phase,
}: {
  field: 'lat' | 'lon';
  label: string;
  axis: string;
  meaning: ReactNode;
  dms: Dms;
  refDms: Dms;
  selected: PointId;
  phase: Phase;
}) {
  const parts = dmsParts(dms);
  const at = secondsFraction(dms);
  const refAt = secondsFraction(refDms);
  const context = parts.slice(0, 2).join(NBSP);
  return (
    <div data-reading={field} className="py-3">
      <h5 className="font-display text-base font-bold leading-tight text-black">
        {label} <L>{axis}</L>
      </h5>
      <p data-meaning={field} className="mt-0.5 text-base leading-snug text-fg-muted text-balance">
        {meaning}
      </p>

      {/* the value in its four groups, each named under it — read left → right. The groups enter as one,
          with the frame values: a reading is never shown in part (31° 48′ alone would be another place) */}
      <dl dir="ltr" data-value={field} className="mt-2 inline-grid grid-flow-col gap-x-4 text-center">
        {parts.map((p, i) => (
          <div key={i} className="flex flex-col-reverse items-center">
            <dt className="text-base leading-6 text-fg-muted" dir="rtl">
              {DMS_CAPTIONS[i]}
            </dt>
            <dd data-group={DMS_CAPTIONS[i]} className="whitespace-nowrap font-display text-xl font-bold leading-tight tabular-nums text-black">
              <motion.span key={`${selected}-${i}`} className="inline-block" {...valueLayer(phase)}>
                {p}
              </motion.span>
            </dd>
          </div>
        ))}
      </dl>

      {/* the seconds of this reading on a fixed 0″–60″ bar (the same for all three points); the
          bridge stays marked as the reference once another point is chosen. Its degrees and minutes
          arrive with the numbers on a switch and stay through picks (they are the same for all three) */}
      <div dir="ltr" data-seconds-bar={field} className="mt-2 flex items-end gap-3">
        <motion.span className="shrink-0 pb-6 font-display text-base font-bold leading-6 tabular-nums text-black" {...valueLayer(phase)}>
          {context}
        </motion.span>
        <div className="relative min-w-0 flex-1 pt-7">
          <div className="relative h-1.5 rounded-full bg-border">
            {[0.25, 0.5, 0.75].map((t) => (
              <span key={t} className="absolute top-0 h-1.5 w-px bg-fg-muted/50" style={{ left: `${t * 100}%` }} />
            ))}
          </div>
          {selected !== REF && <BarMark id={REF} at={refAt} muted phase={phase} />}
          <BarMark id={selected} at={at} phase={phase} />
          <div className="relative mt-1 h-6 text-base leading-6 tabular-nums text-fg-muted">
            <span className="absolute left-0">0″</span>
            <span className="absolute left-1/2 -translate-x-1/2">30″</span>
            <span className="absolute right-0">60″</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The point's letter above the bar, its stem on the value (the map pin's look: filled = chosen). It
    arrives with the numbers on a switch, and slides to the new seconds on a pick. */
function BarMark({ id, at, muted, phase }: { id: PointId; at: number; muted?: boolean; phase: Phase }) {
  const reduce = phase.reduce;
  return (
    <motion.span
      {...valueLayer(phase)}
      data-bar-mark={id}
      data-bar-at={at.toFixed(4)}
      className={cn(
        'absolute top-0 flex -translate-x-1/2 flex-col items-center',
        !reduce && 'transition-[left] duration-[250ms] ease-snap motion-reduce:transition-none',
      )}
      style={{ left: `${(at * 100).toFixed(3)}%` }}
    >
      <span
        className={cn(
          'grid size-6 place-items-center rounded-full border-2 font-display text-sm font-bold leading-none',
          muted ? 'border-brand-dark/60 bg-bg-elevated text-brand-dark' : 'border-bg-elevated bg-accent text-bg-elevated ring-1 ring-accent',
        )}
      >
        {id}
      </span>
      <span className={cn('h-2.5 w-0.5', muted ? 'bg-brand-dark/60' : 'bg-accent')} />
    </motion.span>
  );
}

/* ── The map ──────────────────────────────────────────────────────────────
   One SVG in the base image's own metres (viewBox = VIEW): the image, its
   paper/grid fallback, the grid of this method, the outline of the chosen
   feature, the reading lines and the anchor all share it, so nothing can drift
   off the terrain. HTML overlays (labels, pins) are placed by the same VIEW
   fractions of the measured box (5:4). Physical left/top on purpose: a map is
   never mirrored for RTL. */

type MapState = {
  selected: PointId;
  hover: PointId | null;
  phase: Phase;
  onPick: (id: PointId) => void;
  onPreview: (id: PointId | null) => void;
};

/** Frame-label sizes at the 1440 target (px), used to keep labels apart. */
const LABEL = { h: 20, gap: 6, gridW: { geo: 78, utm: 62 }, chosenW: { geo: 112, utm: 84 }, northRight: 34 };
const DEFAULT_W = 540;

function useBoxWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

function TerrainMap({ kind, selected, hover, phase, onPick, onPreview }: { kind: Method } & MapState) {
  const uid = useId();
  const reduce = phase.reduce;
  const [box, measured] = useBoxWidth<HTMLDivElement>();
  const [failed, setFailed] = useState(false);
  const geo = kind === 'geo';
  const r = READINGS[selected];
  const lines = LINES[kind][selected];
  const outline = featureOutline(selected);
  const what = `${selected}, ${FEATURE[selected].name}`;
  const desc = geo
    ? `מפה עם רשת קווי רוחב ואורך. מסומן ${what}, וקווי הרוחב והאורך שלו מסומנים עד המסגרת: רוחב ${r.latShown}, אורך ${r.lonShown}.`
    : `מפה עם רשת UTM במטרים, פלח ${ZONE.zone} בחצי הכדור הצפוני. מסומן ${what}, וקווי המזרח והצפון שלו מסומנים עד המסגרת: מזרח ${r.eText}, צפון ${r.nText}.`;

  /* Frame labels. The chosen values sit where the reading lines meet the top and
     right edges and REPLACE ordinary labels: every one too close to them, or at
     least the nearest one — so an edge never carries more than three. */
  const W = measured || DEFAULT_W;
  const H = (W * VIEW.h) / VIEW.w;
  const chosenW = LABEL.chosenW[kind];
  const gridW = LABEL.gridW[kind];
  const topX = clamp(fx(lines.top) * W, LABEL.northRight + LABEL.gap + chosenW / 2, W - LABEL.gap - chosenW / 2);
  const rightY = clamp(fy(lines.right) * H, LABEL.gap + LABEL.h + LABEL.gap + LABEL.h / 2, H - LABEL.gap - LABEL.h / 2);
  const topGrid = geo
    ? GRATICULE.meridians.filter((l) => topLabelFits(l.edge)).map((l) => ({ key: `m${l.sec}`, at: l.edge, text: graticuleLabel(l.sec, 'lon') }))
    : UTM_GRID.eastings.filter((l) => topLabelFits(l.at)).map((l) => ({ key: `e${l.value}`, at: l.at, text: groupThousands(l.value) }));
  const rightGrid = geo
    ? GRATICULE.parallels.filter((l) => rightLabelFits(l.edge)).map((l) => ({ key: `p${l.sec}`, at: l.edge, text: graticuleLabel(l.sec, 'lat') }))
    : UTM_GRID.northings.filter((l) => rightLabelFits(l.at)).map((l) => ({ key: `n${l.value}`, at: l.at, text: groupThousands(l.value) }));
  const topShown = replaceNearest(topGrid, (l) => Math.abs(fx(l.at) * W - topX), (chosenW + gridW) / 2 + LABEL.gap);
  const rightShown = replaceNearest(rightGrid, (l) => Math.abs(fy(l.at) * H - rightY), LABEL.h + LABEL.gap);
  const chosenTop = geo ? dmsParts(r.lonDms, undefined, false).join(NBSP) : groupThousands(r.point.e);
  const chosenRight = geo ? dmsParts(r.latDms, undefined, false).join(NBSP) : groupThousands(r.point.n);
  // the feature outline belongs to the point, not to the method: it fades in on a pick only
  const fade = { initial: reduce ? false : { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: reduce ? 0 : 0.25, ease: EASE } } as const;

  return (
    <div
      ref={box}
      dir="ltr"
      data-map={kind}
      className="relative aspect-[5/4] select-none overflow-hidden rounded-xl border border-border/70 bg-bg-accent [container-type:inline-size] lg:col-start-1"
    >
      <div role="img" aria-label={desc} className="absolute inset-0">
        <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} className="absolute inset-0 size-full" aria-hidden>
          <defs>
            <pattern id={`${uid}-paper`} width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M100 0 V100 M0 100 H100" fill="none" className="stroke-brand-dark/15" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </pattern>
          </defs>
          {/* fallback while loading / if the image fails: paper + a plain grid, same size */}
          <rect x="0" y="0" width={EXTENT_W} height={EXTENT_H} className="fill-bg-accent" />
          <rect x="0" y="0" width={EXTENT_W} height={EXTENT_H} fill={`url(#${uid}-paper)`} />
          {!failed && (
            <image
              href={BASE_SRC}
              x="0"
              y="0"
              width={EXTENT_W}
              height={EXTENT_H}
              preserveAspectRatio="none"
              data-base-image
              onError={() => setFailed(true)}
            />
          )}

          {/* the grid is background information: thin and faint, under everything chosen. It is the
              method's: it leaves and comes back with the switch, over the terrain that stays */}
          {geo ? (
            <motion.g key="graticule" fill="none" className="stroke-fg/30" strokeWidth="1" data-grid="graticule" {...fadeLayer(phase)}>
              {[...GRATICULE.meridians, ...GRATICULE.parallels].map((l, i) => (
                <polyline key={i} points={polylinePoints(l.points)} data-meridian={i < GRATICULE.meridians.length || undefined} vectorEffect="non-scaling-stroke" />
              ))}
            </motion.g>
          ) : (
            <motion.g key="utm" className="stroke-fg/30" strokeWidth="1" data-grid="utm" {...fadeLayer(phase)}>
              {UTM_GRID.eastings.map((l) => (
                <line key={`e${l.value}`} x1={l.at} y1={0} x2={l.at} y2={EXTENT_H} vectorEffect="non-scaling-stroke" />
              ))}
              {UTM_GRID.northings.map((l) => (
                <line key={`n${l.value}`} x1={0} y1={l.at} x2={EXTENT_W} y2={l.at} vectorEffect="non-scaling-stroke" />
              ))}
            </motion.g>
          )}

          {/* the chosen feature itself — the bridge deck, the ridge crest, the village — a light
              dashed outline from the terrain's own geometry, never a halo over it */}
          <motion.g key={`o-${selected}`} data-feature-outline={selected} fill="none" {...fade}>
            {outline.kind === 'ring' ? (
              <>
                <circle cx={outline.cx} cy={outline.cy} r={outline.r} className="stroke-bg-elevated/80" strokeWidth="4" vectorEffect="non-scaling-stroke" />
                <circle cx={outline.cx} cy={outline.cy} r={outline.r} className="stroke-fg/70" strokeWidth="1.5" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
              </>
            ) : (
              (['stroke-bg-elevated/80', 'stroke-fg/70'] as const).map((c, i) => {
                const Shape = outline.closed ? 'polygon' : 'polyline';
                return (
                  <Shape
                    key={c}
                    points={polylinePoints(outline.points)}
                    className={c}
                    strokeWidth={i ? 1.5 : 4}
                    strokeDasharray={i ? '6 4' : undefined}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })
            )}
          </motion.g>

          {/* the chosen point's two coordinate lines, heavier than the grid, on a light casing */}
          <ReadingLinesLayer key={`${kind}-${selected}`} id={selected} kind={kind} lines={lines} x={r.x} y={r.y} clipId={`${uid}-reveal`} phase={phase} />

          {/* the anchor: a small ring round the pin's tip, where the two lines cross */}
          <g data-anchor={selected} fill="none">
            <circle cx={r.x} cy={r.y} r={30} className="stroke-bg-elevated" strokeWidth="4.5" vectorEffect="non-scaling-stroke" />
            <circle cx={r.x} cy={r.y} r={30} className="stroke-accent" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>

        {/* frame labels: top = eastings / meridians, right = northings / parallels. The grid's own
            labels come and go with the grid; the chosen values arrive with the panel's numbers */}
        <div aria-hidden>
          <motion.div key={kind} data-grid-labels={kind} {...fadeLayer(phase)}>
            {topShown.map((l) => (
              <MapLabel key={l.key} style={{ left: fx(l.at) * W, top: LABEL.gap, transform: 'translateX(-50%)' }}>
                {l.text}
              </MapLabel>
            ))}
            {rightShown.map((l) => (
              <MapLabel key={l.key} style={{ right: LABEL.gap, top: fy(l.at) * H, transform: 'translateY(-50%)' }}>
                {l.text}
              </MapLabel>
            ))}
          </motion.div>
          <MapLabel chosen="top" motionKey={`${kind}-${selected}-t`} fade={valueLayer(phase)} style={{ left: topX, top: LABEL.gap, transform: 'translateX(-50%)' }}>
            {chosenTop}
          </MapLabel>
          <MapLabel chosen="right" motionKey={`${kind}-${selected}-r`} fade={valueLayer(phase)} style={{ right: LABEL.gap, top: rightY, transform: 'translateY(-50%)' }}>
            {chosenRight}
          </MapLabel>
        </div>

        <NorthArrow />
        <ScaleBar />
      </div>

      {/* pointer targets only — the point buttons under the map are the accessible, keyboard path */}
      {POINTS.map((p) => (
        <MapPin
          key={p.id}
          id={p.id}
          left={fx(READINGS[p.id].x) * 100}
          top={fy(READINGS[p.id].y) * 100}
          active={p.id === selected}
          preview={p.id === hover}
          reduce={reduce}
          onPick={onPick}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}

/** Where the reveal ends: past the view on every side, so it never trims the drawn lines. */
const REVEAL_TO = { attrX: VIEW.x - 60, attrY: VIEW.y - 60, width: VIEW.w + 120, height: VIEW.h + 120 };

/** The point's two lines. On a new point or method they grow out of the point — which has not
    moved — to the frame, where its values are written: the reading starts at the place. */
function ReadingLinesLayer({
  id,
  kind,
  lines,
  x,
  y,
  clipId,
  phase,
}: {
  id: PointId;
  kind: Method;
  lines: ReadingLines;
  x: number;
  y: number;
  clipId: string;
  phase: Phase;
}) {
  const grow = phase.enter && !phase.reduce;
  return (
    <motion.g
      data-reading-lines={id}
      data-lines-kind={kind}
      fill="none"
      initial={false}
      animate={{ opacity: phase.leaving ? 0 : 1 }}
      transition={{ duration: phase.reduce ? 0 : T.out, ease: EASE }}
    >
      <clipPath id={clipId}>
        <motion.rect
          data-reveal
          initial={grow ? { attrX: x, attrY: y, width: 0, height: 0 } : false}
          animate={REVEAL_TO}
          transition={{ duration: phase.reduce ? 0 : T.reveal, ease: EASE }}
        />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {(['along', 'across'] as const).map((k) => (
          <g key={k} data-reading-line={k}>
            <polyline points={polylinePoints(lines[k])} className="stroke-bg-elevated/80" strokeWidth="4" vectorEffect="non-scaling-stroke" />
            <polyline points={polylinePoints(lines[k])} className="stroke-accent" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </g>
    </motion.g>
  );
}

/** Drops every label closer than `min` to the chosen value, and at least the nearest one. */
function replaceNearest<T>(labels: T[], dist: (l: T) => number, min: number) {
  if (!labels.length) return labels;
  const nearest = labels.reduce((a, b) => (dist(b) < dist(a) ? b : a));
  return labels.filter((l) => l !== nearest && dist(l) >= min);
}

function MapLabel({
  chosen,
  motionKey,
  fade,
  style,
  children,
}: {
  chosen?: 'top' | 'right';
  motionKey?: string;
  fade?: object;
  style: React.CSSProperties;
  children: ReactNode;
}) {
  const cls = chosen
    ? // the chosen values, at the reading lines' ends: solid paper, heavier type, a quiet edge
      'absolute z-[1] whitespace-nowrap rounded border border-brand-dark/40 bg-bg-elevated px-1.5 font-display text-sm font-semibold leading-[18px] tabular-nums text-black'
    : 'absolute whitespace-nowrap rounded bg-bg-elevated/75 px-1 font-display text-[13px] font-medium leading-5 tabular-nums text-fg [@container(max-width:340px)]:hidden';
  if (!chosen) {
    return (
      <span data-map-label className={cls} style={style}>
        {children}
      </span>
    );
  }
  return (
    <motion.span key={motionKey} data-map-label data-chosen-label={chosen} className={cls} style={style} {...fade}>
      {children}
    </motion.span>
  );
}

/** True north (see trueNorthDeg): the arrow turns with the local meridian, the letter stays upright. */
function NorthArrow() {
  return (
    <div aria-hidden data-north className="absolute flex flex-col items-center rounded-md bg-bg-elevated/80 px-1.5 pb-1 pt-0.5 text-fg" style={{ left: 8, top: 8 }}>
      <span className="font-display text-sm font-bold leading-none">N</span>
      <svg
        width="12"
        height="15"
        viewBox="0 0 10 12"
        data-north-arrow={TRUE_NORTH_DEG.toFixed(3)}
        className="mt-0.5 fill-fg"
        style={{ transform: `rotate(${TRUE_NORTH_DEG.toFixed(3)}deg)` }}
      >
        <path d="M5 0 L10 12 L5 9 L0 12 Z" />
      </svg>
    </div>
  );
}

/** 0 · 250 · 500 m, the bar a fraction of the map width (same box as the terrain); the unit sits after the bar. */
function ScaleBar() {
  const w = SCALE_BAR_M / VIEW.w;
  return (
    <div
      aria-hidden
      data-scale-bar
      className="absolute flex items-start gap-2 rounded-md bg-bg-elevated/80 px-2.5 pb-1.5 pt-1 font-display text-xs font-semibold leading-none tabular-nums text-fg"
      style={{ left: 8, bottom: 8 }}
    >
      {/* the bar's own width is the fraction of the MAP, hence the map-relative calc */}
      <div className="shrink-0" style={{ width: `calc((100cqw) * ${w.toFixed(4)})` }}>
        <div className="relative mb-1 h-3.5">
          {/* physical, like every map overlay here: a scale bar reads 0 → 500 left to right */}
          <span className="absolute -translate-x-1/2" style={{ left: 0 }}>
            0
          </span>
          <span className="absolute -translate-x-1/2" style={{ left: '50%' }}>
            {SCALE_BAR_M / 2}
          </span>
          <span className="absolute translate-x-1/2" style={{ right: 0 }}>
            {SCALE_BAR_M}
          </span>
        </div>
        <div className="flex h-1.5 border border-fg">
          <span className="flex-1 bg-fg" />
          <span className="flex-1 bg-bg-elevated" />
        </div>
      </div>
      <span dir="rtl" className="ps-1 leading-[14px]">
        מ׳
      </span>
    </div>
  );
}

/** Pin with its tip on the point (StationPin language, MeasurementLandscape.tsx). The chosen
    one is orange, larger and filled; the others stay small, outlined and quiet — told apart by
    size and fill, not by colour alone. */
function MapPin({
  id,
  left,
  top,
  active,
  preview,
  reduce,
  onPick,
  onPreview,
}: {
  id: PointId;
  left: number;
  top: number;
  active: boolean;
  preview: boolean;
  reduce: boolean;
  onPick: (id: PointId) => void;
  onPreview: (id: PointId | null) => void;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      data-pin={id}
      data-active={active || undefined}
      data-preview={preview || undefined}
      onClick={() => onPick(id)}
      onPointerEnter={() => onPreview(id)}
      onPointerLeave={() => onPreview(null)}
      className={cn('group absolute z-[2] flex cursor-pointer flex-col items-center focus-visible:outline-none', active && 'z-[3]')}
      style={{ left: `${left.toFixed(3)}%`, top: `${top.toFixed(3)}%`, transform: 'translate(-50%, calc(-100% + 3px))' }}
    >
      <motion.span
        key={active ? 'on' : 'off'}
        initial={active && !reduce ? { scale: 0.75, opacity: 0.4 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
        style={{ transformOrigin: '50% 100%' }}
        className={cn(
          'grid place-items-center rounded-full border-2 font-display font-bold leading-none transition-colors duration-200 ease-snap motion-reduce:transition-none',
          active
            ? 'size-9 border-bg-elevated bg-accent text-base text-bg-elevated shadow-[0_2px_6px_rgba(40,50,35,0.35)] ring-2 ring-accent [@container(max-width:400px)]:size-7 [@container(max-width:400px)]:text-sm'
            : cn(
                'size-7 bg-bg-elevated/90 text-sm text-brand-dark [@container(max-width:400px)]:size-6 [@container(max-width:400px)]:text-xs',
                preview ? 'border-accent' : 'border-brand-dark/80 group-hover:border-accent',
              ),
        )}
      >
        {id}
      </motion.span>
      <span className={cn('w-0.5', active ? 'h-3 bg-accent [@container(max-width:400px)]:h-2' : 'h-2 bg-brand-dark/80 [@container(max-width:400px)]:h-1.5')} />
      <span className={cn('-mt-px size-1.5 rounded-full', active ? 'bg-accent' : 'bg-brand-dark/80')} />
    </button>
  );
}
