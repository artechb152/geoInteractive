'use client';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { ellipsoidFrame, patchView, type EllView } from './ellipsoidView';
import { DiagramChip } from './MeasurementSection';
import { C_ACCENT, C_ELL, C_INK } from './referenceBodiesStyle';
import { arrowTurn, useDragTurn } from './viewControls';

/**
 * The ellipsoid view: a smooth mathematical body — an ellipse turned about its
 * axis — drawn in 3D (orthographic) with a thin graticule, the semi-major
 * radius a, and the flattening f shown against a sphere of radius a. The
 * flattening is exaggerated (the real one, about 1/298, would not show); the
 * caption under the figure says so.
 *
 * The view is the scene's (EllView): a drag, the arrow keys, the side / top
 * buttons and "מבט התחלתי" all move the same state, so a drag carries on from
 * wherever a button left the body. It turns all the way round the axis and
 * tilts from side-on (0°) to straight down (90°). The marked area is the
 * landscape's footprint with the survey line across it (ellipsoidView.patchView);
 * it follows the body as it turns, and stands out while it is enlarged beside.
 * A click on it enlarges it, as "הגדלת האזור" does (the button stays the
 * keyboard way). Pointing at it, or turning the body while it is in sight,
 * lights the section beside (onLink); pointing at the section lights it (hot).
 *
 * What makes a turn of this smooth, symmetric body visible: from the side the
 * outline sits inside the sphere of radius a, the gaps at the poles shaded and
 * the polar radius drawn against a; from above the outline is that circle, the
 * gaps gone, the axis a point (the pole). The equator runs from a straight line
 * (side-on) to the outline itself (from above).
 */
export function EllipsoidModel({
  width,
  height,
  view,
  zoom = 1,
  onTurn,
  focused,
  hot,
  onLink,
  onPick,
  label,
}: {
  width: number;
  height: number;
  view: EllView;
  /** The wheel's enlargement of the body (1: fitted to the stage). */
  zoom?: number;
  /** Turn by (round, tilt) degrees — round + brings the right side forward, tilt + looks from higher. */
  onTurn: (round: number, tilt: number) => void;
  /** The marked area is enlarged beside the body: it stands out here. */
  focused: boolean;
  /** The section beside is pointed at: the area it is drawn along lights up here. */
  hot?: boolean;
  /** Whether the marked area is being pointed at or turned by hand (while in sight): the section beside lights up. */
  onLink?: (on: boolean) => void;
  /** A click on the marked area (while it is not enlarged): enlarge it. */
  onPick?: () => void;
  label: string;
}) {
  const uid = useId().replace(/:/g, '');
  const { dragging, handlers } = useDragTurn((dx, dy) => onTurn(dx * 0.5, dy * 0.45));
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => arrowTurn(e, onTurn, { round: 12, tilt: 10 });
  const [over, setOver] = useState(false);

  // ── geometry ──────────────────────────────────────────────────────────────
  const F = ellipsoidFrame(view, width, height, zoom);
  const { a, cx, cy, ry, at, ce } = F;
  const pv = patchView(view, width, height, zoom);
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
  const f = (v: number) => v.toFixed(1);
  // how side-on the view is (1 side-on … 0 from above): the axis and the polar radius fade with it
  const side = Math.min(1, Math.max(0, (ce - 0.3) / 0.4));
  const gapOn = Math.min(1, Math.max(0, (gap - 3) / 6));
  // the two gaps between the sphere of radius a and the body, at the poles
  const crescents = [
    `M${f(cx - a)},${f(cy)} A${f(a)},${f(a)} 0 0 1 ${f(cx + a)},${f(cy)} A${f(a)},${f(ry)} 0 0 0 ${f(cx - a)},${f(cy)} Z`,
    `M${f(cx + a)},${f(cy)} A${f(a)},${f(a)} 0 0 1 ${f(cx - a)},${f(cy)} A${f(a)},${f(ry)} 0 0 0 ${f(cx + a)},${f(cy)} Z`,
  ];
  const axisTop = cy - poleY - 22 * ce;
  const pickable = !!onPick && pv.front;
  const area = `${pv.outline.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)},${f(p.y)}`).join('')}Z`;
  // a drag captures the pointer, so the area's own leave may never come: the drag takes over from the hover
  useEffect(() => {
    if (dragging) setOver(false);
  }, [dragging]);
  const pointed = over && pv.front;
  const link = dragging ? pv.front : pointed;
  const report = useRef(onLink);
  report.current = onLink;
  useEffect(() => report.current?.(link), [link]);
  useEffect(() => () => report.current?.(false), []);
  // pointed at here or from the section: brighter than merely enlarged
  const bright = pointed || !!hot;

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
          <ellipse cx={cx + 6} cy={cy + ry + 18} rx={a * 0.9} ry={a * 0.1} fill={`url(#${uid}-shade)`} />

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
          {/* the flattening: the gaps between the sphere of radius a and the body, at the poles */}
          <g fill={C_INK} fillOpacity={0.13 * gapOn}>
            {crescents.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <ellipse cx={cx} cy={cy} rx={a} ry={ry} fill="none" stroke={C_ELL} strokeWidth={1.75} />

          {/* the axis it turns about — seen end-on from above, where only the pole is left of it */}
          <line x1={cx} y1={axisTop} x2={cx} y2={cy + poleY + 22 * ce} stroke={C_INK} strokeWidth={1.25} strokeDasharray="5 4" opacity={0.75 * side} />
          {/* the polar radius, against a: shorter by the flattening */}
          <line x1={cx} y1={cy} x2={cx} y2={cy - poleY} stroke={C_INK} strokeWidth={2} opacity={side} />
          {/* a: centre → equator */}
          <line x1={cx} y1={cy} x2={cx + a} y2={cy} stroke={C_INK} strokeWidth={2} />
          <circle cx={cx} cy={cy} r={3} fill={C_INK} />
          {/* f: the sphere of radius a against the body's outline */}
          <circle cx={cx} cy={cy} r={a} fill="none" stroke={C_INK} strokeWidth={1.25} strokeDasharray="4 4" opacity={0.4 + 0.3 * gapOn} />
          <g opacity={gap > 5 ? 1 : 0} className="transition-opacity duration-200 motion-reduce:transition-none">
            <line x1={cx + 10} y1={cy - a} x2={cx + 10} y2={cy - ry} stroke={C_INK} strokeWidth={1.5} />
            <line x1={cx + 5} y1={cy - a} x2={cx + 15} y2={cy - a} stroke={C_INK} strokeWidth={1.5} />
            <line x1={cx + 5} y1={cy - ry} x2={cx + 15} y2={cy - ry} stroke={C_INK} strokeWidth={1.5} />
          </g>

          {/* names that make the turn readable: the equator (a line side-on, the outline from above), the axis / the pole */}
          <g className="font-display" fontSize={13} fontWeight={700}>
            <text x={cx - a - 8} y={cy} textAnchor="end" dominantBaseline="central" direction="ltr" fill={C_ELL}>
              קו המשווה
            </text>
            <text x={cx - 6} y={axisTop - 4} textAnchor="end" direction="ltr" fill={C_INK} opacity={side}>
              ציר הקטבים
            </text>
            <text x={cx - 8} y={cy - 8} textAnchor="end" direction="ltr" fill={C_INK} opacity={1 - side}>
              הקוטב
            </text>
          </g>

          {/* the marked area: the landscape's footprint with the survey line across it (its two ends are the
              section's ends) — a click on it enlarges it */}
          <g
            opacity={pv.front ? 1 : 0}
            className={cn('transition-opacity duration-200 motion-reduce:transition-none', pickable && 'cursor-pointer', !pv.front && 'pointer-events-none')}
            onClick={pickable ? onPick : undefined}
            onPointerEnter={() => setOver(true)}
            onPointerLeave={() => setOver(false)}
            data-marked-area
          >
            {pickable && <title>הגדלת האזור</title>}
            {/* a wider, invisible edge: the small area is easy to hit */}
            <path d={area} fill="transparent" stroke="transparent" strokeWidth={14} strokeLinejoin="round" />
            <path
              d={area}
              fill={C_ACCENT}
              fillOpacity={bright ? 0.42 : focused ? 0.38 : 0.22}
              stroke={C_ACCENT}
              strokeWidth={bright || focused ? 2.5 : 1.75}
              strokeLinejoin="round"
              className="transition-[fill-opacity,stroke-width] duration-300 motion-reduce:transition-none"
            />
            <line x1={pv.line[0].x} y1={pv.line[0].y} x2={pv.line[1].x} y2={pv.line[1].y} stroke={C_ACCENT} strokeWidth={2} />
            {pv.line.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={2.6} fill={C_ACCENT} stroke="#FDFBF3" strokeWidth={1} />
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
      </div>
    </div>
  );
}
