'use client';

import { memo, useRef, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'framer-motion';
import { distance } from '../locationCheckGeometry';
import { MAP } from '../../topic-02/topographyTerrainStyle';
import {
  DEMO,
  HILLS,
  OBJECTS,
  OBJECT_IDS,
  REAL_ERROR_DEG,
  ROADS,
  SHEET,
  WADI,
  along,
  backAzimuth,
  fmtDeg,
  rayEnd,
  type ObjectId,
  type Point,
  type XY,
} from './navigationSimModel';

/**
 * The practice map of the resection activity — north up, never mirrored,
 * 1 viewBox unit = 1 m (x = E, y = sheet height − N). It draws only what the
 * card hands it: the learner's lines at the values they typed, their mark, and
 * the demonstration's probes. The unknown position is never an input here, so
 * the map cannot show it before the learner does.
 *
 * Marks: orange ring = a chosen object; ink line = a line being set, orange =
 * the line whose field has focus; green = checked right; red dashed = checked
 * wrong; ink cross = the learner's mark (green / red once checked).
 */

const H = SHEET.height;
const m = (p: Point) => ({ x: p.E, y: H - p.N });
const r1 = (v: number) => Math.round(v * 10) / 10;
const pathOf = (pts: readonly XY[]) => pts.map(([E, N], k) => `${k ? 'L' : 'M'}${r1(E)} ${r1(H - N)}`).join('');
const RAD = Math.PI / 180;

/** The dry wadi's blue (= terrain-nav WATER.line, the lesson's water ink). */
const WADI_INK = '#4F8FA6';

/** Type sizes in viewBox units (≈ 0.26 px per unit in the desktop column: 56 ≈ 14.4 px, 60 ≈ 15.4 px). */
const FS = { label: 60, small: 56, value: 64 } as const;

export type LineTone = 'draft' | 'active' | 'right' | 'wrong';
export type MapLine = { readonly id: ObjectId; readonly deg: number; readonly tone: LineTone };
export type MarkTone = 'draft' | 'right' | 'wrong';
export type MapMode = 'demo-1' | 'demo-2' | 'choose' | 'lines' | 'mark' | 'verify' | 'done';

const LINE_CLASS: Record<LineTone, string> = {
  draft: 'stroke-fg',
  active: 'stroke-accent',
  right: 'stroke-brand-dark',
  wrong: 'stroke-accent-hot',
};
const TEXT_CLASS: Record<LineTone, string> = {
  draft: 'fill-fg',
  active: 'fill-accent',
  right: 'fill-brand-dark',
  wrong: 'fill-accent-hot',
};

/** A Hebrew label on a paper plate. anchor 'start' = right edge at x (RTL), 'end' = left edge at x. */
function Plate({ x, y, size = FS.label, weight = 700, anchor = 'middle', className = 'fill-fg', dir = 'rtl', children }: { x: number; y: number; size?: number; weight?: number; anchor?: 'middle' | 'start' | 'end'; className?: string; dir?: 'rtl' | 'ltr'; children: string }) {
  const w = children.length * size * 0.56 + size * 0.9;
  const h = size * 1.4;
  const pad = size * 0.45;
  // In RTL, 'start' is the right edge; in LTR (numbers) it is the left edge.
  const startIsRight = dir === 'rtl';
  const left = anchor === 'middle' ? x - w / 2 : (anchor === 'start') === startIsRight ? x - w + pad : x - pad;
  return (
    <g pointerEvents="none">
      <rect x={r1(left)} y={r1(y - h / 2)} width={r1(w)} height={r1(h)} rx={size * 0.25} fill={MAP.paper} fillOpacity={0.94} />
      <text x={r1(x)} y={r1(y)} textAnchor={anchor} dominantBaseline="central" direction={dir} fontSize={size} fontWeight={weight} className={`${className} font-display tabular-nums`}>
        {children}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------- the ground

const Ground = memo(function Ground() {
  return (
    <g pointerEvents="none">
      <rect x={0} y={0} width={SHEET.width} height={H} fill={MAP.paper} />
      {/* 500 m grid */}
      <g stroke={MAP.grid} strokeWidth={4} strokeOpacity={0.55}>
        {[500, 1000, 1500, 2000].map((E) => (
          <path key={`e${E}`} d={`M${E} 0V${H}`} />
        ))}
        {[500, 1000, 1500].map((N) => (
          <path key={`n${N}`} d={`M0 ${H - N}H${SHEET.width}`} />
        ))}
      </g>
      {/* Hills: contour rings, slightly oval */}
      <g fill="none" stroke={MAP.contour} strokeWidth={7} strokeOpacity={0.8}>
        {HILLS.map((h) =>
          h.rings.map((r) => <ellipse key={`${h.id}-${r}`} cx={r1(m(h.center).x)} cy={r1(m(h.center).y)} rx={r1(r * 1.18)} ry={r1(r * 0.9)} />),
        )}
      </g>
      {/* The dry wadi */}
      <path d={pathOf(WADI)} fill="none" stroke={WADI_INK} strokeWidth={11} strokeDasharray="44 26" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dirt roads, cased */}
      {ROADS.map((r) => (
        <path key={`c-${r.id}`} d={pathOf(r.pts)} fill="none" stroke={MAP.roadCasing} strokeWidth={24} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {ROADS.map((r) => (
        <path key={`f-${r.id}`} d={pathOf(r.pts)} fill="none" stroke={MAP.roadFill} strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </g>
  );
});

/** North arrow (top-left) and scale bar (bottom-right): drawn over the lines, as on a printed map. */
const Furniture = memo(function Furniture() {
  return (
    <g pointerEvents="none">
      {/* North arrow (top-left) */}
      <g data-map="north">
        <rect x={40} y={40} width={190} height={330} rx={26} fill={MAP.paper} fillOpacity={0.94} />
        <text x={135} y={108} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={FS.small} fontWeight={800} fill={MAP.ink} className="font-display">
          צפון
        </text>
        <path d="M135 160l42 190l-42 -46l-42 46z" fill={MAP.ink} />
      </g>
      {/* Scale bar (bottom-right): 0–500 m */}
      <g data-map="scale">
        <rect x={1760} y={1590} width={600} height={180} rx={26} fill={MAP.paper} fillOpacity={0.94} />
        {[0, 1, 2, 3, 4].map((k) => (
          <rect key={k} x={1800 + k * 100} y={1700} width={100} height={30} fill={k % 2 === 0 ? MAP.ink : '#FFFFFF'} stroke={MAP.ink} strokeWidth={4} />
        ))}
        {[0, 250, 500].map((v) => (
          <text key={v} x={1800 + v} y={1650} textAnchor="middle" direction="ltr" dominantBaseline="central" fontSize={FS.small} fontWeight={600} fill={MAP.ink} className="font-display tabular-nums">
            {v}
          </text>
        ))}
        <text x={2340} y={1715} textAnchor="end" direction="ltr" dominantBaseline="central" fontSize={FS.small} fontWeight={600} fill={MAP.ink} className="font-display">
          מ׳
        </text>
      </g>
    </g>
  );
});

// ---------------------------------------------------------------- the three objects

/** Map symbols, drawn around (0, 0) = the object's surveyed point. */
function Glyph({ id }: { id: ObjectId }) {
  if (id === 'tower')
    return (
      <g>
        <circle r={34} fill={MAP.ink} />
        <circle r={14} fill="#FFFFFF" />
      </g>
    );
  if (id === 'antenna')
    return (
      <g>
        <path d="M-26 0L0 -96L26 0z" fill="none" stroke={MAP.ink} strokeWidth={9} strokeLinejoin="round" />
        <path d="M-13 -48H13" stroke={MAP.ink} strokeWidth={8} />
        <path d="M-30 -112a42 42 0 0 1 0 -44M30 -112a42 42 0 0 0 0 -44" fill="none" stroke={MAP.ink} strokeWidth={8} strokeLinecap="round" />
        <circle r={14} fill={MAP.ink} />
      </g>
    );
  return (
    <g>
      <path d="M0 -44L40 26H-40z" fill={MAP.ink} />
      <circle r={9} fill="#FFFFFF" />
    </g>
  );
}

/**
 * Where each label sits from its object (viewBox units, y down). Chosen clear of
 * every right line (tower SW–S, antenna ESE–SSE, summit NNE / NE / WNW), of
 * the demonstration's line through the tower (080° / 260°), and of the summit's
 * most likely wrong line (190°, straight down).
 */
const LABEL_AT: Record<ObjectId, { dx: number; dy: number; anchor: 'start' | 'end' | 'middle' }> = {
  tower: { dx: 60, dy: 82, anchor: 'end' },
  antenna: { dx: 0, dy: -215, anchor: 'middle' },
  summit: { dx: 70, dy: 20, anchor: 'end' },
};

function Objects({ ring, dim }: { ring: readonly ObjectId[]; dim: readonly ObjectId[] }) {
  return (
    <g pointerEvents="none">
      {OBJECT_IDS.map((id) => {
        const p = m(OBJECTS[id].pos);
        const l = LABEL_AT[id];
        return (
          <g key={id} data-map-object={id} data-chosen={ring.includes(id) || undefined} opacity={dim.includes(id) ? 0.45 : 1}>
            {ring.includes(id) && <circle cx={r1(p.x)} cy={r1(p.y)} r={88} fill="#FFFFFF" fillOpacity={0.55} className="stroke-accent" strokeWidth={13} />}
            <g transform={`translate(${r1(p.x)} ${r1(p.y)})`}>
              <Glyph id={id} />
            </g>
            <Plate x={p.x + l.dx} y={p.y + l.dy} anchor={l.anchor} weight={800}>
              {OBJECTS[id].label}
            </Plate>
          </g>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------- lines

/** A line from an object at `deg`, to the sheet's edge, with its value near the object. */
function Ray({ id, deg, tone }: MapLine) {
  const o = OBJECTS[id].pos;
  const a = m(o);
  const b = m(rayEnd(o, deg));
  // Near the object, short of any crossing; on a short line (one that leaves the sheet soon) halfway, so the edge never clips it.
  const lab = m(along(o, deg, Math.min(220, distance(o, rayEnd(o, deg)) * 0.5)));
  // the value sits beside the line, on its clockwise side
  const nx = Math.cos(deg * RAD) * 78;
  const ny = Math.sin(deg * RAD) * 78;
  return (
    <g data-map-line={id} data-deg={deg} data-tone={tone}>
      <path d={`M${r1(a.x)} ${r1(a.y)}L${r1(b.x)} ${r1(b.y)}`} className={LINE_CLASS[tone]} strokeWidth={tone === 'active' ? 15 : 12} strokeLinecap="round" strokeDasharray={tone === 'wrong' ? '40 26' : undefined} fill="none" />
      <Plate x={lab.x + nx} y={lab.y + ny} size={FS.value} weight={800} dir="ltr" className={TEXT_CLASS[tone]}>
        {fmtDeg(deg)}
      </Plate>
    </g>
  );
}

/** ±REAL_ERROR_DEG about a line: where it could lie with a small compass error (clipped to the sheet). */
function Wedge({ id, deg }: { id: ObjectId; deg: number }) {
  const o = OBJECTS[id].pos;
  const a = m(o);
  const p = m(along(o, deg - REAL_ERROR_DEG, 4000));
  const q = m(along(o, deg + REAL_ERROR_DEG, 4000));
  return <path d={`M${r1(a.x)} ${r1(a.y)}L${r1(p.x)} ${r1(p.y)}L${r1(q.x)} ${r1(q.y)}Z`} className="fill-brand" fillOpacity={0.16} data-map-wedge={id} />;
}

// ---------------------------------------------------------------- demonstration

/** A point someone could stand on, with the azimuth from it to the tower: north tick, clockwise arc, value. */
function Probe({ at, toDeg, emphasis }: { at: Point; toDeg: number; emphasis: 'right' | 'wrong' }) {
  const p = m(at);
  const R = 92;
  const end = { x: p.x + Math.sin(toDeg * RAD) * R, y: p.y - Math.cos(toDeg * RAD) * R };
  // The value sits in the middle of a small arc; over a large one, above the north tick.
  const mid = toDeg / 2;
  const lab = toDeg <= 180 ? { x: p.x + Math.sin(mid * RAD) * 200, y: p.y - Math.cos(mid * RAD) * 200 } : { x: p.x, y: p.y - 235 };
  const cls = emphasis === 'right' ? { stroke: 'stroke-brand-dark', fill: 'fill-brand-dark' } : { stroke: 'stroke-fg-muted', fill: 'fill-fg-muted' };
  return (
    <g data-map-probe={emphasis} data-to={toDeg}>
      <path d={`M${r1(p.x)} ${r1(p.y)}V${r1(p.y - 170)}`} stroke={MAP.ink} strokeWidth={5} strokeDasharray="14 10" />
      <path d={`M${r1(p.x)} ${r1(p.y - R)}A${R} ${R} 0 ${toDeg > 180 ? 1 : 0} 1 ${r1(end.x)} ${r1(end.y)}`} fill="none" className={cls.stroke} strokeWidth={9} />
      <circle cx={r1(p.x)} cy={r1(p.y)} r={26} fill="#FFFFFF" className={cls.stroke} strokeWidth={8} />
      <Plate x={lab.x} y={lab.y} size={FS.small} weight={800} dir="ltr" className={cls.fill}>
        {fmtDeg(toDeg)}
      </Plate>
    </g>
  );
}

function Demo({ frame, reduce }: { frame: 1 | 2; reduce: boolean }) {
  const T = OBJECTS[DEMO.object].pos;
  const back = backAzimuth(DEMO.reading);
  const draw = (delay = 0) => (reduce ? {} : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const } });
  const fade = (delay = 0) => (reduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.35, delay } });
  const a = m(T);
  const wrongEnd = m(rayEnd(T, DEMO.reading));
  const rightEnd = m(rayEnd(T, back));
  return (
    <g data-map="demo" data-frame={frame}>
      {/* 080° drawn from the tower: the un-reversed measurement */}
      <motion.path
        key={`w${frame}`}
        d={`M${r1(a.x)} ${r1(a.y)}L${r1(wrongEnd.x)} ${r1(wrongEnd.y)}`}
        className="stroke-fg-muted"
        strokeWidth={11}
        strokeDasharray="34 22"
        strokeLinecap="round"
        fill="none"
        style={{ opacity: frame === 1 ? undefined : 0.35 }}
        data-map-demo-line="unreversed"
        // A fade, not a draw-on: animating pathLength would replace the dash pattern.
        {...(frame === 1 ? fade() : {})}
      />
      {frame === 1 &&
        DEMO.wrongProbesM.map((d) => (
          <motion.g key={d} {...fade(0.5)}>
            <Probe at={along(T, DEMO.reading, d)} toDeg={back} emphasis="wrong" />
          </motion.g>
        ))}
      {frame === 2 && (
        <>
          <motion.path d={`M${r1(a.x)} ${r1(a.y)}L${r1(rightEnd.x)} ${r1(rightEnd.y)}`} className="stroke-brand-dark" strokeWidth={13} strokeLinecap="round" fill="none" data-map-demo-line="reversed" {...draw()} />
          {DEMO.rightProbesM.map((d, k) => (
            <motion.g key={d} {...fade(0.45 + k * 0.15)}>
              <Probe at={along(T, back, d)} toDeg={DEMO.reading} emphasis="right" />
            </motion.g>
          ))}
        </>
      )}
      {/* The value of the line drawn from the tower, beside it */}
      {(() => {
        const deg = frame === 1 ? DEMO.reading : back;
        const at = m(along(T, deg, frame === 1 ? 120 : 520));
        return (
          <Plate x={at.x - Math.cos(deg * RAD) * 90} y={at.y - Math.sin(deg * RAD) * 90} size={FS.value} weight={800} dir="ltr" className={frame === 1 ? 'fill-fg-muted' : 'fill-brand-dark'}>
            {fmtDeg(deg)}
          </Plate>
        );
      })()}
    </g>
  );
}

// ---------------------------------------------------------------- the mark

const MARK_CLASS: Record<MarkTone, { stroke: string; fill: string }> = {
  draft: { stroke: 'stroke-fg', fill: 'fill-fg' },
  right: { stroke: 'stroke-brand-dark', fill: 'fill-brand-dark' },
  wrong: { stroke: 'stroke-accent-hot', fill: 'fill-accent-hot' },
};

function Mark({ at, tone }: { at: Point; tone: MarkTone }) {
  const p = m(at);
  const cls = MARK_CLASS[tone];
  return (
    <g transform={`translate(${r1(p.x)} ${r1(p.y)})`} data-map="mark" data-tone={tone} pointerEvents="none">
      <circle r={52} fill="#FFFFFF" fillOpacity={0.6} className={cls.stroke} strokeWidth={10} />
      <path d="M-82 0H-30M30 0H82M0 -82V-30M0 30V82" className={cls.stroke} strokeWidth={10} strokeLinecap="round" />
      <circle r={10} className={cls.fill} />
    </g>
  );
}

// ---------------------------------------------------------------- the map

export function NavigationSimMap({
  mode,
  ring,
  dim = [],
  lines,
  wedges,
  mark,
  markTone,
  reduce,
  onPickObject,
  onPlace,
  onMove,
  onCheck,
  className,
  markLabel,
}: {
  mode: MapMode;
  /** Objects drawn with the selection ring. */
  ring: readonly ObjectId[];
  /** Objects drawn faded (not part of this step). */
  dim?: readonly ObjectId[];
  lines: readonly MapLine[];
  wedges?: readonly { id: ObjectId; deg: number }[];
  mark: Point | null;
  markTone: MarkTone;
  reduce: boolean;
  /** Choosing: a click on an object (the panel's buttons are the keyboard path). */
  onPickObject?: (id: ObjectId) => void;
  /** Marking: a click on the map. */
  onPlace?: (p: Point) => void;
  /** Marking: arrow keys (metres east / north). */
  onMove?: (dE: number, dN: number) => void;
  /** Marking: Enter checks the mark. */
  onCheck?: () => void;
  className?: string;
  /** Accessible name of the map while marking. */
  markLabel?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const toWorld = (e: ReactPointerEvent) => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { E: Math.round(pt.x), N: Math.round(H - pt.y) };
  };
  const marking = mode === 'mark' && !!onPlace;
  const onKey = (e: ReactKeyboardEvent) => {
    if (!marking || !onMove) return;
    if (e.key === 'Enter' && onCheck) {
      e.preventDefault();
      onCheck();
      return;
    }
    const step = e.shiftKey ? 100 : 20;
    // The map is never mirrored: ← is west, → is east, whatever the page direction.
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (!d) return;
    e.preventDefault();
    onMove(d[0], d[1]);
  };

  const svg = (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SHEET.width} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label="מפה סכמטית בדיונית, צפון למעלה, סרגל קנה מידה של 500 מ׳. שלושה עצמים מזוהים: מגדל מים בצפון־מזרח, אנטנה על גבעה בצפון־מערב ופסגה 412 בדרום. דרכי עפר וערוץ יבש."
      onPointerDown={(e) => {
        if (!marking) return;
        const p = toWorld(e);
        if (p) onPlace!(p);
      }}
      style={{ cursor: marking ? 'crosshair' : undefined }}
      data-map-mode={mode}
    >
      <defs>
        <clipPath id="navsim-sheet">
          <rect x={0} y={0} width={SHEET.width} height={H} />
        </clipPath>
      </defs>
      <Ground />
      <g clipPath="url(#navsim-sheet)">
        {wedges?.map((w) => <Wedge key={w.id} {...w} />)}
        {(mode === 'demo-1' || mode === 'demo-2') && <Demo frame={mode === 'demo-1' ? 1 : 2} reduce={reduce} />}
        {lines.map((l) => (
          <Ray key={l.id} {...l} />
        ))}
      </g>
      <Furniture />
      <Objects ring={ring} dim={dim} />
      {mark && <Mark at={mark} tone={markTone} />}
      {/* Choosing: generous hit areas over the objects */}
      {mode === 'choose' &&
        onPickObject &&
        OBJECT_IDS.map((id) => {
          const p = m(OBJECTS[id].pos);
          return <circle key={id} cx={r1(p.x)} cy={r1(p.y)} r={130} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onPickObject(id)} data-map-hit={id} aria-hidden />;
        })}
      <rect x={0} y={0} width={SHEET.width} height={H} fill="none" stroke={MAP.ink} strokeWidth={8} pointerEvents="none" />
    </svg>
  );

  if (!marking) return svg;
  // Marking: the map itself takes keyboard focus (arrows move the mark).
  return (
    <div tabIndex={0} role="group" aria-label={markLabel} onKeyDown={onKey} className="group relative h-full w-full focus-visible:outline-none" data-map-focus>
      {svg}
      {/* The focus ring, drawn over the map (the frame clips anything outside it) */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-xl group-focus-visible:ring-4 group-focus-visible:ring-inset group-focus-visible:ring-accent" />
    </div>
  );
}
