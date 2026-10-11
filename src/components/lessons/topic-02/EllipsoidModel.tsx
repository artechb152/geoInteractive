'use client';
import { useId, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { ellipsoidFrame, patchView, PATCH, type EllView } from './ellipsoidView';
import { STATION_IDS } from './measurementLayout';
import { DiagramChip } from './MeasurementSection';
import { C_ACCENT, C_ELL, C_INK } from './referenceBodiesStyle';
import { StageControls } from './StageControls';
import { arrowTurn, useDragTurn } from './viewControls';

/**
 * The ellipsoid view: a smooth mathematical body — an ellipse turned about its
 * axis — drawn in 3D (orthographic) with a thin graticule, the semi-major
 * radius a, and the flattening f shown against a sphere of radius a. The
 * flattening is exaggerated (the real one, about 1/298, would not show) and
 * the drawing says so.
 *
 * The view is the scene's (EllView): a drag, the arrow keys, the side / top
 * buttons and "מבט התחלתי" all move the same state, so a drag carries on from
 * wherever a button left the body. It turns all the way round the axis and
 * tilts from side-on (0°) to straight down (90°). The marked area carries the
 * survey line, its stations on it; ellipsoidView.patchView() places them, and
 * the illustration draws the callout from that line down to the section with
 * the same numbers.
 */
export function EllipsoidModel({
  width,
  height,
  view,
  onTurn,
  atStart,
  onReset,
  label,
  hint,
  note,
}: {
  width: number;
  height: number;
  view: EllView;
  /** Turn by (round, tilt) degrees — round + brings the right side forward, tilt + looks from higher. */
  onTurn: (round: number, tilt: number) => void;
  atStart: boolean;
  onReset: () => void;
  label: string;
  hint: string;
  note: string;
}) {
  const uid = useId().replace(/:/g, '');
  const { dragging, handlers } = useDragTurn((dx, dy) => onTurn(dx * 0.5, dy * 0.45));
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => arrowTurn(e, onTurn, { round: 12, tilt: 10 });

  // ── geometry ──────────────────────────────────────────────────────────────
  const F = ellipsoidFrame(view, width, height);
  const { a, cx, cy, ry, at, ce } = F;
  const pv = patchView(view, width, height);
  const runs = (pts: { x: number; y: number; front: boolean }[]) => {
    const front: string[] = [];
    const back: string[] = [];
    let cur: typeof pts = [];
    const flush = () => {
      if (cur.length > 1) (cur[0].front ? front : back).push(cur.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(''));
      cur = [];
    };
    pts.forEach((p) => {
      if (cur.length && cur[0].front !== p.front) {
        cur.push(p);
        flush();
      }
      cur.push(p);
    });
    flush();
    return { front, back };
  };
  const meridians = Array.from({ length: 12 }, (_, i) => runs(Array.from({ length: 73 }, (_, k) => at(-90 + k * 2.5, i * 30))));
  const parallels = [-60, -30, 30, 60].map((lat) => runs(Array.from({ length: 97 }, (_, k) => at(lat, k * 3.75))));
  const equator = runs(Array.from({ length: 97 }, (_, k) => at(0, k * 3.75)));
  const gap = a - ry; // flattening, as seen from here: the sphere of radius a above the body's outline
  const poleY = F.b * ce;
  // the marked area's outline, following the body's curvature
  const edge = [
    ...Array.from({ length: 9 }, (_, k) => at(PATCH.lat - PATCH.half, PATCH.lon - PATCH.half + (k * PATCH.half) / 4)),
    ...Array.from({ length: 9 }, (_, k) => at(PATCH.lat - PATCH.half + (k * PATCH.half) / 4, PATCH.lon + PATCH.half)),
    ...Array.from({ length: 9 }, (_, k) => at(PATCH.lat + PATCH.half, PATCH.lon + PATCH.half - (k * PATCH.half) / 4)),
    ...Array.from({ length: 9 }, (_, k) => at(PATCH.lat + PATCH.half - (k * PATCH.half) / 4, PATCH.lon - PATCH.half)),
  ];
  const f = (v: number) => v.toFixed(1);

  return (
    <div className={cn('relative h-full w-full touch-pan-y select-none', dragging ? 'cursor-grabbing' : 'cursor-grab')} {...handlers}>
      <div
        role="img"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKey}
        className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <svg aria-hidden width={width} height={height} className="absolute inset-0 overflow-visible">
          <defs>
            <radialGradient id={`${uid}-body`} cx="0.36" cy="0.3" r="0.85">
              <stop offset="0" stopColor="#F4F6EE" />
              <stop offset="0.45" stopColor="#C9D6C0" />
              <stop offset="1" stopColor="#6E8C6E" />
            </radialGradient>
            <radialGradient id={`${uid}-shade`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#38432E" stopOpacity="0.18" />
              <stop offset="1" stopColor="#38432E" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* soft shadow on the card, so the body sits in space */}
          <ellipse cx={cx + 6} cy={cy + ry + 22} rx={a * 0.9} ry={a * 0.12} fill={`url(#${uid}-shade)`} />

          {/* the far half of the graticule, seen through the body */}
          <g fill="none" stroke={C_ELL} strokeWidth={1} strokeOpacity={0.28} strokeDasharray="2 3">
            {[...meridians, ...parallels, equator].flatMap((r, i) => r.back.map((d, j) => <path key={`b${i}-${j}`} d={d} />))}
          </g>
          <ellipse cx={cx} cy={cy} rx={a} ry={ry} fill={`url(#${uid}-body)`} fillOpacity={0.88} />
          <g fill="none" stroke={C_ELL} strokeLinecap="round">
            {[...meridians, ...parallels].flatMap((r, i) => r.front.map((d, j) => <path key={`f${i}-${j}`} d={d} strokeWidth={1} strokeOpacity={0.6} />))}
            {equator.front.map((d, j) => (
              <path key={`e${j}`} d={d} strokeWidth={2} />
            ))}
          </g>
          <ellipse cx={cx} cy={cy} rx={a} ry={ry} fill="none" stroke={C_ELL} strokeWidth={1.75} />

          {/* the axis it turns about */}
          <line
            x1={cx}
            y1={cy - poleY - 26 * ce}
            x2={cx}
            y2={cy + poleY + 26 * ce}
            stroke={C_INK}
            strokeWidth={1.25}
            strokeDasharray="5 4"
            opacity={ce > 0.08 ? 0.75 : 0}
          />
          {/* a: centre → equator */}
          <line x1={cx} y1={cy} x2={cx + a} y2={cy} stroke={C_INK} strokeWidth={2} />
          <circle cx={cx} cy={cy} r={3} fill={C_INK} />
          {/* f: the sphere of radius a against the body's outline */}
          <circle cx={cx} cy={cy} r={a} fill="none" stroke={C_INK} strokeWidth={1.25} strokeDasharray="4 4" opacity={0.55} />
          <g opacity={gap > 5 ? 1 : 0} className="transition-opacity duration-200 motion-reduce:transition-none">
            <line x1={cx + 10} y1={cy - a} x2={cx + 10} y2={cy - ry} stroke={C_INK} strokeWidth={1.5} />
            <line x1={cx + 5} y1={cy - a} x2={cx + 15} y2={cy - a} stroke={C_INK} strokeWidth={1.5} />
            <line x1={cx + 5} y1={cy - ry} x2={cx + 15} y2={cy - ry} stroke={C_INK} strokeWidth={1.5} />
          </g>

          {/* the marked area: the survey line across it, its stations; firmer as it turns to face the reader */}
          <g opacity={pv.front ? 1 : 0} className="transition-opacity duration-200 motion-reduce:transition-none">
            <path
              d={`${edge.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)},${f(p.y)}`).join('')}Z`}
              fill={C_ACCENT}
              fillOpacity={0.2 + 0.25 * pv.focus}
              stroke={C_ACCENT}
              strokeWidth={1.5 + pv.focus}
              strokeLinejoin="round"
            />
            <line x1={pv.line[0].x} y1={pv.line[0].y} x2={pv.line[1].x} y2={pv.line[1].y} stroke={C_ACCENT} strokeWidth={1.75} strokeDasharray="3 2" />
            {STATION_IDS.map((id) => (
              <circle key={id} cx={pv.stations[id].x} cy={pv.stations[id].y} r={1.8} fill={C_INK} />
            ))}
          </g>
        </svg>

        <DiagramChip color={C_INK} style={{ left: cx + a * 0.8, top: cy, transform: 'translate(-50%, calc(-100% - 6px))' }}>
          a
        </DiagramChip>
        <DiagramChip
          color={C_INK}
          style={{ left: cx + 20, top: cy - (a + ry) / 2, transform: 'translate(0, -50%)', opacity: gap > 5 ? 1 : 0, transition: 'opacity 200ms' }}
        >
          f
        </DiagramChip>
        <span className="absolute top-0 start-2 rounded bg-paper-card/85 px-1.5 text-[13px] font-medium text-fg-muted">{note}</span>
      </div>
      <StageControls atStart={atStart} onReset={onReset} hint={hint} />
    </div>
  );
}
