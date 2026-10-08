'use client';
import { memo, useId } from 'react';
import { MAP } from '../topic-02/topographyTerrainStyle';
import {
  BEZEL_PRINT_R,
  COMPASS_RINGS,
  COMPASS_VIEW,
  GRID_M,
  MAP_A,
  MAP_BACK_R,
  MAP_H,
  MAP_W,
  METERS_PER_UNIT,
  bearingVec,
  compassLayout,
  mapLayout,
  metresToUnits,
  polar,
  type Box,
  type XY,
} from './compassMapGeometry';

/**
 * The two synchronized views of "מצפן ומפה" (AzimuthExplorer, PrinciplesScene).
 * Both are passive: the degree slider is the only control. Each takes the same
 * animated `angle` (pointer / line geometry) and the same rounded labels, so
 * the compass, the map and the readouts can never disagree.
 *
 * Colour roles (tailwind.config.ts tokens): accent = the chosen direction,
 * brand-dark + dashes = the back azimuth, fg = ink. The map sheet reuses the
 * lesson-2 map symbology (MAP); water uses terrain-sky, subdued.
 */

const BODY_SRC = '/assets/lessons/topic06/compass/compass-body.webp';

/** Token values for SVG gradient stops / filters, which can't take classes. */
const INK = '#38432E'; // fg
const WHITE = '#FFFFFF'; // bg-elevated
const SKY = '#3d6b8e'; // terrain-sky
const CONTOUR = '#C9A56B'; // border-strong (= tanline.contour, the site's topo-line tone)

const r1 = (v: number) => Math.round(v * 100) / 100;

// ─────────────────────────────────────────────────────────────────────────────
// Compass
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rendered body (scripts/blender/build_compass_body.py) under a live SVG layer:
 * face graduations, bezel print, the two pointers, glass and pivot — all
 * computed from data on the body's own ring radii (COMPASS_RINGS).
 */
export function CompassInstrument({
  angle,
  azimuthLabel,
  backLabel,
}: {
  angle: number;
  azimuthLabel: string;
  backLabel: string;
}) {
  const uid = useId().replace(/:/g, '');
  const L = compassLayout(angle);
  const back = angle + 180;
  const fwdStart = polar({ x: 0, y: 0 }, 7.5, angle);
  const backStart = polar({ x: 0, y: 0 }, 7.5, back);
  const backLineEnd = polar({ x: 0, y: 0 }, 89, back);
  return (
    <svg
      viewBox={`${-COMPASS_VIEW} ${-COMPASS_VIEW} ${2 * COMPASS_VIEW} ${2 * COMPASS_VIEW}`}
      className="block size-full overflow-visible"
      role="img"
      aria-label="מצפן: המצביע הכתום מראה את האזימוט, והקו הירוק המקווקו מראה את האזימוט החוזר. הצפון למעלה."
      style={{ direction: 'ltr' }}
      data-compass
    >
      <CompassBase uid={uid} />

      {/* Pointers — under the bezel print, so the printed scale stays readable where they cross it */}
      <line
        x1={r1(backStart.x)}
        y1={r1(backStart.y)}
        x2={r1(backLineEnd.x)}
        y2={r1(backLineEnd.y)}
        className="stroke-brand-dark"
        strokeWidth={1.7}
        strokeDasharray="4.2 3"
        strokeLinecap="round"
        data-pointer="back"
      />
      <line
        x1={r1(fwdStart.x)}
        y1={r1(fwdStart.y)}
        x2={r1(L.fwdEnd.x)}
        y2={r1(L.fwdEnd.y)}
        className="stroke-accent"
        strokeWidth={2}
        strokeLinecap="round"
        data-pointer="forward"
      />

      <BezelPrint />

      {/* Glass over the capsule: a soft top-left glint and a hairline edge light */}
      <circle cx={0} cy={0} r={COMPASS_RINGS.face + 1} fill={`url(#${uid}-glass)`} pointerEvents="none" />
      <path
        d={arcPathXY({ x: 0, y: 0 }, COMPASS_RINGS.face - 1.4, 292, 352)}
        fill="none"
        stroke={WHITE}
        strokeOpacity={0.55}
        strokeWidth={0.9}
        strokeLinecap="round"
      />

      {/* End marks: an open ring on the knurl for the azimuth, an arrow head for the back azimuth */}
      <g transform={`translate(${r1(L.backTip.x)} ${r1(L.backTip.y)}) rotate(${r1(back)})`}>
        <path d="M0 0 L-4 7.6 L0 5.7 L4 7.6 Z" className="fill-brand-dark" stroke={WHITE} strokeWidth={0.8} strokeLinejoin="round" />
      </g>
      <circle cx={r1(L.fwdEnd.x)} cy={r1(L.fwdEnd.y)} r={3.3} fill={WHITE} className="stroke-accent" strokeWidth={1.5} />

      {/* Pivot cap — above everything on the face */}
      <circle cx={0.5} cy={1} r={8.2} fill={INK} fillOpacity={0.18} />
      <circle cx={0} cy={0} r={7.4} fill={`url(#${uid}-pivot-ring)`} />
      <circle cx={0} cy={0} r={5.1} fill={`url(#${uid}-pivot-cap)`} />

      <DegreeLabel box={L.fwdLabel} text={azimuthLabel} className="fill-accent" kind="forward" />
      <DegreeLabel box={L.backLabel} text={backLabel} className="fill-brand-dark" kind="back" />
    </svg>
  );
}

/** Body image + face graduations + gradients — static, drawn once. */
const CompassBase = memo(function CompassBase({ uid }: { uid: string }) {
  const R = COMPASS_RINGS;
  const ticks: { deg: number; len: number; w: number; o: number }[] = [];
  for (let deg = 0; deg < 360; deg += 2) {
    const cardinal = deg % 90 === 0;
    const major = deg % 30 === 0;
    const mid = deg % 10 === 0;
    ticks.push(
      cardinal
        ? { deg, len: 9, w: 1, o: 0.95 }
        : major
          ? { deg, len: 7.2, w: 0.8, o: 0.92 }
          : mid
            ? { deg, len: 5, w: 0.55, o: 0.82 }
            : { deg, len: 3.2, w: 0.38, o: 0.66 },
    );
  }
  const tickOuter = R.face - 1.6;
  const crossR = tickOuter - 10.5;
  const orient = 22;
  const orientHalf = Math.sqrt(crossR * crossR - orient * orient);
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-glass`} cx="34%" cy="26%" r="78%">
          <stop offset="0" stopColor={WHITE} stopOpacity={0.34} />
          <stop offset="0.38" stopColor={WHITE} stopOpacity={0.07} />
          <stop offset="0.75" stopColor={WHITE} stopOpacity={0} />
          <stop offset="1" stopColor={INK} stopOpacity={0.07} />
        </radialGradient>
        {/* The render's contact shadow is wider than its square — feather it to zero
            before the image edge so no square shows on the card. */}
        <radialGradient id={`${uid}-fade`} cx={1.5} cy={3} r={R.image - 1} gradientUnits="userSpaceOnUse">
          <stop offset="0.86" stopColor={WHITE} />
          <stop offset="1" stopColor={WHITE} stopOpacity={0} />
        </radialGradient>
        <mask id={`${uid}-body-mask`} maskUnits="userSpaceOnUse" x={-R.image} y={-R.image} width={2 * R.image} height={2 * R.image}>
          <rect x={-R.image} y={-R.image} width={2 * R.image} height={2 * R.image} fill={`url(#${uid}-fade)`} />
        </mask>
        <radialGradient id={`${uid}-pivot-ring`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor={WHITE} />
          <stop offset="0.55" stopColor={MAP.grid} />
          <stop offset="1" stopColor={MAP.contour} />
        </radialGradient>
        <radialGradient id={`${uid}-pivot-cap`} cx="36%" cy="30%" r="75%">
          <stop offset="0" stopColor={WHITE} stopOpacity={0.9} />
          <stop offset="0.22" stopColor="#4A5240" />
          <stop offset="1" stopColor="#2E3826" />
        </radialGradient>
      </defs>

      <image
        href={BODY_SRC}
        x={-R.image}
        y={-R.image}
        width={2 * R.image}
        height={2 * R.image}
        preserveAspectRatio="none"
        mask={`url(#${uid}-body-mask)`}
        data-compass-body
      />

      {/* Orienting lines + cross-hair, faint ink on the face */}
      <g className="stroke-fg" strokeLinecap="round">
        <line x1={0} y1={-crossR} x2={0} y2={crossR} strokeOpacity={0.4} strokeWidth={0.45} />
        <line x1={-crossR} y1={0} x2={crossR} y2={0} strokeOpacity={0.4} strokeWidth={0.45} />
        {[-orient, orient].map((x) => (
          <line key={x} x1={x} y1={-orientHalf} x2={x} y2={orientHalf} strokeOpacity={0.16} strokeWidth={0.4} />
        ))}
      </g>

      {/* Degree graduations: 2° / 10° / 30° / cardinal */}
      <g className="stroke-fg">
        {ticks.map((t) => {
          const a = polar({ x: 0, y: 0 }, tickOuter, t.deg);
          const b = polar({ x: 0, y: 0 }, tickOuter - t.len, t.deg);
          return <line key={t.deg} x1={r1(a.x)} y1={r1(a.y)} x2={r1(b.x)} y2={r1(b.y)} strokeWidth={t.w} strokeOpacity={t.o} />;
        })}
      </g>
    </>
  );
});

/** Printed bezel: cardinal letters upright, 30° numbers along the ring (read upright), 15° dots. */
const BezelPrint = memo(function BezelPrint() {
  const numbers = [30, 60, 120, 150, 210, 240, 300, 330];
  const cardinals = [
    { deg: 0, t: 'N' },
    { deg: 90, t: 'E' },
    { deg: 180, t: 'S' },
    { deg: 270, t: 'W' },
  ];
  return (
    <g className="fill-bg-elevated" pointerEvents="none">
      {Array.from({ length: 12 }, (_, i) => 15 + i * 30).map((deg) => {
        const p = polar({ x: 0, y: 0 }, BEZEL_PRINT_R + 7.4, deg);
        return <circle key={deg} cx={r1(p.x)} cy={r1(p.y)} r={0.75} fillOpacity={0.7} />;
      })}
      {numbers.map((deg) => {
        const flip = deg > 90 && deg < 270;
        return (
          <text
            key={deg}
            transform={`rotate(${deg}) translate(0 ${-BEZEL_PRINT_R})${flip ? ' rotate(180)' : ''}`}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={8.4}
            fillOpacity={0.94}
            className="font-display font-semibold"
          >
            {deg}
          </text>
        );
      })}
      {cardinals.map((c) => {
        const p = polar({ x: 0, y: 0 }, BEZEL_PRINT_R, c.deg);
        return (
          <text key={c.t} x={r1(p.x)} y={r1(p.y)} textAnchor="middle" dominantBaseline="central" fontSize={12} className="font-display font-bold">
            {c.t}
          </text>
        );
      })}
    </g>
  );
});

function DegreeLabel({ box, text, className, kind }: { box: Box; text: string; className: string; kind: 'forward' | 'back' }) {
  return (
    <text
      x={r1(box.x + box.w / 2)}
      y={r1(box.y + box.h / 2)}
      textAnchor="middle"
      dominantBaseline="central"
      direction="ltr"
      fontSize={12.9}
      className={`font-display font-bold tabular-nums ${className}`}
      data-label={kind}
    >
      {text}
    </text>
  );
}

/** Clockwise arc between two bearings, as a path (screen space). */
function arcPathXY(c: XY, r: number, fromDeg: number, toDeg: number) {
  const a = polar(c, r, fromDeg);
  const b = polar(c, r, toDeg);
  const sweep = ((toDeg - fromDeg) % 360 + 360) % 360;
  return `M${r1(a.x)} ${r1(a.y)} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${r1(b.x)} ${r1(b.y)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Map — a fictional top-down sheet, north up, 10 m of ground per unit
// ─────────────────────────────────────────────────────────────────────────────

type Pt = [number, number];

/** Height model of the fictional sheet (metres) — only drives the contour art. */
function heightAt(x: number, y: number) {
  const g = (cx: number, cy: number, sx: number, sy: number, a: number) =>
    a * Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2) / 2);
  return (
    g(452, 300, 92, 78, 120) +
    g(170, 180, 80, 64, 70) +
    g(330, 70, 64, 44, 46) +
    g(560, 470, 70, 52, 34) +
    g(110, 420, 70, 60, 40) +
    0.05 * (MAP_H - y)
  );
}

const CONTOUR_STEP = 10;
const CONTOURS: { level: number; index: boolean; d: string }[] = (() => {
  const nx = 124;
  const ny = 103;
  const sx = MAP_W / nx;
  const sy = MAP_H / ny;
  const v: number[][] = [];
  for (let j = 0; j <= ny; j++) {
    v[j] = [];
    for (let i = 0; i <= nx; i++) v[j][i] = heightAt(i * sx, j * sy);
  }
  const out: { level: number; index: boolean; d: string }[] = [];
  for (let level = CONTOUR_STEP; level < 150; level += CONTOUR_STEP) {
    let d = '';
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const a = v[j][i];
        const b = v[j][i + 1];
        const c = v[j + 1][i + 1];
        const e = v[j + 1][i];
        const x0 = i * sx;
        const y0 = j * sy;
        const t = (p: number, q: number) => (level - p) / (q - p);
        const pts: Pt[] = [];
        if (a < level !== b < level) pts.push([x0 + t(a, b) * sx, y0]);
        if (b < level !== c < level) pts.push([x0 + sx, y0 + t(b, c) * sy]);
        if (e < level !== c < level) pts.push([x0 + t(e, c) * sx, y0 + sy]);
        if (a < level !== e < level) pts.push([x0, y0 + t(a, e) * sy]);
        for (let k = 0; k + 1 < pts.length; k += 2) {
          d += `M${pts[k][0].toFixed(1)} ${pts[k][1].toFixed(1)}L${pts[k + 1][0].toFixed(1)} ${pts[k + 1][1].toFixed(1)}`;
        }
      }
    }
    if (d) out.push({ level, index: level % 50 === 0, d });
  }
  return out;
})();

/** Closed Catmull-Rom curve through the points, as cubic Béziers. */
function smoothClosed(pts: Pt[]) {
  const n = pts.length;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${p2[0]} ${p2[1]}`;
  }
  return `${d}Z`;
}

/** Open Catmull-Rom curve (end points repeated). */
function smoothOpen(pts: Pt[]) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/** Vegetation patches (map tint only — not a route or a target). */
const VEGETATION: Pt[][] = [
  [[160, 52], [205, 38], [222, 60], [206, 92], [176, 104], [156, 82]],
  [[250, 50], [300, 38], [322, 52], [296, 70], [258, 70]],
  [[488, -12], [630, -12], [630, 128], [590, 112], [566, 70], [520, 46], [492, 22]],
  [[520, 172], [556, 160], [598, 196], [630, 214], [630, 376], [604, 380], [576, 330], [548, 270], [524, 214]],
  [[-12, 140], [40, 128], [70, 160], [62, 214], [24, 236], [-12, 230]],
  [[-12, 316], [56, 300], [124, 316], [134, 358], [96, 392], [28, 400], [-12, 384]],
  [[540, 432], [596, 404], [630, 410], [630, 492], [588, 506], [548, 486]],
];
const LAKE: Pt[] = [[102, 92], [124, 70], [148, 72], [154, 92], [134, 120], [110, 122]];
const RIVER: Pt[] = [[452, 527], [482, 494], [520, 466], [538, 436], [566, 412], [600, 396], [630, 360]];

const MapSheet = memo(function MapSheet({ uid }: { uid: string }) {
  const clip = `${uid}-sheet`;
  const gridStep = GRID_M / METERS_PER_UNIT;
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={MAP_W} height={MAP_H} rx={14} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect x={0} y={0} width={MAP_W} height={MAP_H} fill={MAP.paper} />
        {VEGETATION.map((p, i) => (
          <path key={i} d={smoothClosed(p)} fill={MAP.vegFill} fillOpacity={0.85} />
        ))}
        <path d={smoothClosed(LAKE)} fill={SKY} fillOpacity={0.3} />
        <path d={smoothOpen(RIVER)} fill="none" stroke={SKY} strokeOpacity={0.42} strokeWidth={3.2} strokeLinecap="round" />

        <g fill="none" stroke={CONTOUR} strokeLinecap="round" strokeLinejoin="round">
          {CONTOURS.map((c) => (
            <path key={c.level} d={c.d} strokeOpacity={c.index ? 0.62 : 0.4} strokeWidth={c.index ? 1.1 : 0.75} />
          ))}
        </g>

        {/* 500 m grid */}
        <g stroke={MAP.grid} strokeOpacity={0.75} strokeWidth={0.9}>
          {Array.from({ length: Math.floor(MAP_W / gridStep) }, (_, k) => (k + 1) * gridStep).map((x) => (
            <path key={`x${x}`} d={`M${x} 0V${MAP_H}`} />
          ))}
          {Array.from({ length: Math.floor(MAP_H / gridStep) }, (_, k) => (k + 1) * gridStep).map((y) => (
            <path key={`y${y}`} d={`M0 ${y}H${MAP_W}`} />
          ))}
        </g>

        <MapNorthArrow />
        <MapScaleBar />
      </g>
      <rect x={0.5} y={0.5} width={MAP_W - 1} height={MAP_H - 1} rx={14} fill="none" stroke={MAP.hairline} />
    </>
  );
});

/** Two-tone north arrow in the north-west corner (inside MAP_NORTH_BOX). */
function MapNorthArrow() {
  const x = 38;
  return (
    <g pointerEvents="none">
      <path d={`M${x} 20 L${x} 48 L${x - 9} 54 Z`} fill={INK} />
      <path d={`M${x} 20 L${x + 9} 54 L${x} 48 Z`} fill={MAP.paper} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      <text x={x} y={68} textAnchor="middle" dominantBaseline="central" fontSize={17} fill={INK} className="font-display font-bold">
        N
      </text>
    </g>
  );
}

/** 0–1,000 m bar, its length from the sheet's own metres per unit (inside MAP_SCALE_BOX). */
function MapScaleBar() {
  const x0 = 24;
  const y = MAP_H - 20;
  const marks = [0, 500, 1000];
  return (
    <g pointerEvents="none">
      <path d={`M${x0} ${y}H${x0 + metresToUnits(1000)}`} stroke={INK} strokeWidth={2.4} />
      {marks.map((m) => (
        <path key={m} d={`M${x0 + metresToUnits(m)} ${y - 6}V${y + 1.2}`} stroke={INK} strokeWidth={1.6} />
      ))}
      {marks.map((m) => (
        <text
          key={`t${m}`}
          x={x0 + metresToUnits(m)}
          y={y - 15}
          textAnchor="middle"
          dominantBaseline="central"
          direction="ltr"
          fontSize={13}
          fill={INK}
          className="font-display font-semibold tabular-nums"
        >
          {m.toLocaleString('en-US')}
        </text>
      ))}
      {/* RTL text: its end (left edge) sits at x, so the unit reads to the right of "1,000". */}
      <text x={x0 + metresToUnits(1000) + 21} y={y - 15} textAnchor="end" direction="rtl" dominantBaseline="central" fontSize={13} fill={INK} className="font-display font-semibold">
        מטר
      </text>
    </g>
  );
}

export function BearingMap({ angle, azimuthLabel, backLabel }: { angle: number; azimuthLabel: string; backLabel: string }) {
  const uid = useId().replace(/:/g, '');
  const L = mapLayout(angle);
  const back = angle + 180;
  const u = bearingVec(angle);
  const DOT = 8;
  const HEAD = 13;
  const fwdFrom = polar(MAP_A, DOT + 1, angle);
  const fwdTip = { x: L.B.x - u.x * (DOT + 2.5), y: L.B.y - u.y * (DOT + 2.5) };
  const fwdTo = { x: fwdTip.x - u.x * (HEAD - 2), y: fwdTip.y - u.y * (HEAD - 2) };
  const backFrom = polar(MAP_A, DOT + 1, back);
  const backTo = polar(MAP_A, MAP_BACK_R - 2, back);
  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      className="block h-auto w-full"
      role="img"
      aria-label="מפה טופוגרפית, הצפון למעלה: קו כתום מנקודת המוצא A אל היעד B בכיוון האזימוט, וקו ירוק מקווקו מ־A בכיוון האזימוט החוזר."
      style={{ direction: 'ltr' }}
      data-map
    >
      <MapSheet uid={uid} />

      <defs>
        <filter id={`${uid}-chip`} x="-20%" y="-30%" width="140%" height="170%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodColor={INK} floodOpacity="0.16" />
        </filter>
      </defs>

      {/* Back azimuth: dashed sage ray from A, open arrow head */}
      <line
        x1={r1(backFrom.x)}
        y1={r1(backFrom.y)}
        x2={r1(backTo.x)}
        y2={r1(backTo.y)}
        className="stroke-brand-dark"
        strokeWidth={2.6}
        strokeDasharray="8 6"
        strokeLinecap="round"
        data-ray="back"
      />
      <g transform={`translate(${r1(L.backTip.x)} ${r1(L.backTip.y)}) rotate(${r1(back)})`}>
        <path d="M-7 11 L0 0 L7 11" fill="none" className="stroke-brand-dark" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Azimuth: solid orange A → B, arrow head just short of B */}
      <line x1={r1(fwdFrom.x)} y1={r1(fwdFrom.y)} x2={r1(fwdTo.x)} y2={r1(fwdTo.y)} className="stroke-accent" strokeWidth={3} strokeLinecap="round" data-ray="forward" />
      <g transform={`translate(${r1(fwdTip.x)} ${r1(fwdTip.y)}) rotate(${r1(angle)})`}>
        <path d={`M0 0 L-6 ${HEAD} L6 ${HEAD} Z`} className="fill-accent" strokeLinejoin="round" />
      </g>

      <circle cx={r1(MAP_A.x)} cy={r1(MAP_A.y)} r={DOT} className="fill-fg" stroke={WHITE} strokeWidth={2.5} data-point="A" />
      <circle cx={r1(L.B.x)} cy={r1(L.B.y)} r={DOT} className="fill-accent" stroke={WHITE} strokeWidth={2.5} data-point="B" />

      <PointName box={L.aLabel} letter="A" chip="נקודת מוצא" filter={`url(#${uid}-chip)`} kind="A" />
      <PointName box={L.bLabel} letter="B" chip="יעד" filter={`url(#${uid}-chip)`} kind="B" />

      <MapDegree box={L.fwdLabel} text={azimuthLabel} className="fill-accent" kind="forward" />
      <MapDegree box={L.backLabel} text={backLabel} className="fill-brand-dark" kind="back" />
    </svg>
  );
}

/** A point's letter over its name chip, filling the label box from mapLayout. */
function PointName({ box, letter, chip, filter, kind }: { box: Box; letter: string; chip: string; filter: string; kind: string }) {
  const cx = r1(box.x + box.w / 2);
  const chipW = Math.min(box.w, chip.length * 9 + 20);
  const chipH = 24;
  const chipY = box.y + box.h - chipH;
  return (
    <g pointerEvents="none" data-label={kind}>
      <text x={cx} y={r1(box.y + 10)} textAnchor="middle" dominantBaseline="central" fontSize={18} fill={INK} className="font-display font-bold">
        {letter}
      </text>
      <rect x={r1(cx - chipW / 2)} y={r1(chipY)} width={chipW} height={chipH} rx={chipH / 2} fill={WHITE} filter={filter} />
      <text x={cx} y={r1(chipY + chipH / 2)} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={13} fill={INK} className="font-display font-bold">
        {chip}
      </text>
    </g>
  );
}

/** A degree value on a paper plate (no stroke halo), filling the label box from mapLayout. */
function MapDegree({ box, text, className, kind }: { box: Box; text: string; className: string; kind: string }) {
  return (
    <g pointerEvents="none" data-label={kind}>
      <rect x={r1(box.x)} y={r1(box.y)} width={box.w} height={box.h} rx={6} fill={MAP.paper} fillOpacity={0.88} />
      <text
        x={r1(box.x + box.w / 2)}
        y={r1(box.y + box.h / 2)}
        textAnchor="middle"
        dominantBaseline="central"
        direction="ltr"
        fontSize={20}
        className={`font-display font-bold tabular-nums ${className}`}
      >
        {text}
      </text>
    </g>
  );
}
