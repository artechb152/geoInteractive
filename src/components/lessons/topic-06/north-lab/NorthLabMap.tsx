'use client';
import { memo, useId } from 'react';
import { MAP } from '../../topic-02/topographyTerrainStyle';
import { bearingVec, formatDeg, polar, type XY } from '../compassMapGeometry';
import {
  ARC_R,
  ARROW_LEN,
  GRID_NORTH_ANGLE,
  GRID_STEP,
  INSET,
  INSET_ARROW_LEN,
  INSET_ORIGIN,
  LAB_A,
  LAB_B,
  LAB_H,
  LAB_W,
  NOTE_POS,
  POINT_R,
  RING,
  RING_NUMBERS,
  RING_NUMBER_R,
  RING_SCALE,
  RING_TICK,
  TARGET_TRUE_BEARING,
  arcLabelBox,
  arcPath,
  arrowLabels,
  azimuthFrom,
  formatSigned,
  insetAngles,
  insetLabels,
  northAngles,
  wedgePath,
  type ArrowLabel,
} from './northLabGeometry';
import { NORTHS, NORTH_IDS, type NorthId } from './norths';

/**
 * The map of the reference lab (NorthLab): a fictional top-down sheet, the
 * measuring ring around the fixed origin A, the target line A→B, the three
 * norths, the measurement arc and the enlarged-separation inset.
 *
 * Two stacked SVGs share one viewBox: NorthLabSheet is static (the terrain
 * asset, the grid, the instrument body and its print) and never re-renders;
 * NorthLabOverlay is the live layer, drawn from the same smoothed values as the
 * readouts, so the drawing and the numbers always agree.
 *
 * Colour roles: accent = target line, B and the measurement arc; the three
 * north colours (NORTHS[id].color) are a legend for the arrows only. The sheet
 * uses the lesson-2 map symbology (MAP).
 *
 * Arrow labels carry the north's Hebrew name, as in the tabs, over its angle
 * from TN; the inset repeats the names only, so each value is printed once.
 */

const BODY_SRC = '/assets/lessons/topic06/compass/compass-body.webp';

/** Token values for SVG attributes that can't take classes. */
const INK = '#38432E'; // fg
const WHITE = '#FFFFFF'; // bg-elevated

const r1 = (v: number) => Math.round(v * 100) / 100;

// ─────────────────────────────────────────────────────────────────────────────
// Static sheet
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Terrain illustration — paper, contours, vegetation, the minor road and the
 * houses only (no grid, marks or text). Generated from one height field by
 * scripts/maps/build-north-lab-map.mjs, in the MAP palette, on this viewBox.
 */
const TERRAIN_SRC = '/assets/lessons/topic06/north-lab/map-paper.svg';

/** Printed grid lines, A in the middle of a cell; rotated with GN around A. */
const GRID_D = (() => {
  let d = '';
  const ext = 900;
  for (let k = -9; k <= 9; k++) {
    const o = (k + 0.5) * GRID_STEP;
    d += `M${r1(LAB_A.x + o)} ${LAB_A.y - ext}V${LAB_A.y + ext}`;
    d += `M${LAB_A.x - ext} ${r1(LAB_A.y + o)}H${LAB_A.x + ext}`;
  }
  return d;
})();

const NorthLabSheet = memo(function NorthLabSheet({ uid }: { uid: string }) {
  const clip = `${uid}-sheet`;
  // The render's contact shadow is wider than its square — feather it before the image edge.
  const shadow = { x: LAB_A.x + 1.5 * RING_SCALE, y: LAB_A.y + 3 * RING_SCALE };
  const ticks: { deg: number; len: number }[] = [];
  for (let deg = 0; deg < 360; deg += 5) ticks.push({ deg, len: deg % 10 === 0 ? RING_TICK.mid : RING_TICK.minor });
  return (
    <svg viewBox={`0 0 ${LAB_W} ${LAB_H}`} className="block h-auto w-full" aria-hidden style={{ direction: 'ltr' }}>
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={LAB_W} height={LAB_H} rx={14} />
        </clipPath>
        <radialGradient id={`${uid}-fade`} cx={shadow.x} cy={shadow.y} r={RING.image - RING_SCALE} gradientUnits="userSpaceOnUse">
          <stop offset="0.86" stopColor={WHITE} />
          <stop offset="1" stopColor={WHITE} stopOpacity={0} />
        </radialGradient>
        {/* keep the bezel, its hairline and its shadow; the ivory face goes, so the map shows through */}
        <mask id={`${uid}-ring`} maskUnits="userSpaceOnUse" x={LAB_A.x - RING.image} y={LAB_A.y - RING.image} width={2 * RING.image} height={2 * RING.image}>
          <rect x={LAB_A.x - RING.image} y={LAB_A.y - RING.image} width={2 * RING.image} height={2 * RING.image} fill={`url(#${uid}-fade)`} />
          <circle cx={LAB_A.x} cy={LAB_A.y} r={RING.cut} fill="black" />
        </mask>
      </defs>

      <g clipPath={`url(#${clip})`}>
        {/* drawing order: terrain → grid → instrument body and its print; the live layer is NorthLabOverlay */}
        <image href={TERRAIN_SRC} x={0} y={0} width={LAB_W} height={LAB_H} preserveAspectRatio="none" data-terrain />

        {/* printed grid: its north axis is GN */}
        <path d={GRID_D} transform={`rotate(${GRID_NORTH_ANGLE} ${LAB_A.x} ${LAB_A.y})`} fill="none" stroke={MAP.grid} strokeOpacity={0.66} strokeWidth={0.8} data-grid={GRID_NORTH_ANGLE} />

        {/* measuring ring: the compass body render, face masked out */}
        <image
          href={BODY_SRC}
          x={LAB_A.x - RING.image}
          y={LAB_A.y - RING.image}
          width={2 * RING.image}
          height={2 * RING.image}
          preserveAspectRatio="none"
          mask={`url(#${uid}-ring)`}
          data-ring-body
        />
        <g className="stroke-bg-elevated" strokeOpacity={0.9} strokeLinecap="round">
          {ticks.map((t) => {
            const a = polar(LAB_A, RING_TICK.inner, t.deg);
            const b = polar(LAB_A, RING_TICK.inner + t.len, t.deg);
            return <line key={t.deg} x1={r1(a.x)} y1={r1(a.y)} x2={r1(b.x)} y2={r1(b.y)} strokeWidth={t.len === RING_TICK.mid ? 1.1 : 0.7} />;
          })}
        </g>
        <g className="fill-bg-elevated">
          {RING_NUMBERS.map((deg) => {
            const p = polar(LAB_A, RING_NUMBER_R, deg);
            return (
              <text key={deg} x={r1(p.x)} y={r1(p.y)} textAnchor="middle" dominantBaseline="central" fontSize={15} className="font-display font-bold tabular-nums">
                {deg}
              </text>
            );
          })}
        </g>
      </g>
      <rect x={0.5} y={0.5} width={LAB_W - 1} height={LAB_H - 1} rx={14} fill="none" stroke={MAP.hairline} />
    </svg>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Live overlay
// ─────────────────────────────────────────────────────────────────────────────

function arrowGeom(origin: XY, len: number, angle: number, startGap: number, head: { len: number; half: number }) {
  const u = bearingVec(angle);
  const tip = polar(origin, len, angle);
  const base = polar(origin, len - head.len, angle);
  const n = { x: -u.y, y: u.x };
  return {
    from: polar(origin, startGap, angle),
    to: polar(origin, len - head.len + 1, angle),
    head: `${r1(tip.x)},${r1(tip.y)} ${r1(base.x + n.x * head.half)},${r1(base.y + n.y * head.half)} ${r1(base.x - n.x * head.half)},${r1(base.y - n.y * head.half)}`,
  };
}

const HEAD = { selected: { len: 16, half: 7.5 }, idle: { len: 13, half: 6 } } as const;
const SHAFT = { selected: 4, idle: 2.6 } as const;
const CASING = 3.5;

function MainArrow({ id, angle, selected, casing }: { id: NorthId; angle: number; selected: boolean; casing?: boolean }) {
  const g = arrowGeom(LAB_A, ARROW_LEN, angle, POINT_R.a + 2, selected ? HEAD.selected : HEAD.idle);
  const w = selected ? SHAFT.selected : SHAFT.idle;
  if (casing) {
    return (
      <g stroke={MAP.paper} fill={MAP.paper} strokeLinecap="round" strokeLinejoin="round">
        <line x1={r1(g.from.x)} y1={r1(g.from.y)} x2={r1(g.to.x)} y2={r1(g.to.y)} strokeWidth={w + CASING} />
        <polygon points={g.head} strokeWidth={CASING} />
      </g>
    );
  }
  return (
    <g className={NORTHS[id].color} data-arrow={id} data-angle={r1(angle)} data-selected={selected || undefined}>
      <line x1={r1(g.from.x)} y1={r1(g.from.y)} x2={r1(g.to.x)} y2={r1(g.to.y)} stroke="currentColor" strokeWidth={w} strokeLinecap="round" />
      <polygon points={g.head} fill="currentColor" />
    </g>
  );
}

function ArrowLabelMark({ label, selected }: { label: ArrowLabel; selected: boolean }) {
  const { box, tip } = label;
  const cx = r1(box.x + box.w / 2);
  const meta = NORTHS[label.id];
  return (
    <g className={meta.color} data-label={label.id} pointerEvents="none">
      {label.leader && (
        <line x1={cx} y1={r1(box.y + box.h)} x2={r1(tip.x)} y2={r1(tip.y - 4)} stroke="currentColor" strokeWidth={1.1} strokeOpacity={0.8} />
      )}
      <rect x={r1(box.x)} y={r1(box.y)} width={box.w} height={box.h} rx={6} fill={MAP.paper} fillOpacity={0.88} />
      <text x={cx} y={r1(box.y + 12)} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={15} fill="currentColor" className={selected ? 'font-display font-extrabold' : 'font-display font-bold'}>
        {meta.short}
      </text>
      <text x={cx} y={r1(box.y + 27)} textAnchor="middle" dominantBaseline="central" direction="ltr" fontSize={14} fill="currentColor" className="font-display font-bold tabular-nums">
        {formatSigned(label.value)}
      </text>
    </g>
  );
}

function Inset({ declination, active }: { declination: number; active: NorthId }) {
  const angles = insetAngles(declination);
  const labels = insetLabels(declination);
  const order = [...NORTH_IDS.filter((id) => id !== active), active];
  return (
    <g pointerEvents="none" data-inset>
      <rect x={INSET.x} y={INSET.y} width={INSET.w} height={INSET.h} rx={10} fill={WHITE} stroke={MAP.hairline} />
      <text x={INSET.x + INSET.w / 2} y={INSET.y + 19} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={13} fill={INK} className="font-display font-bold">
        הפרדה מוגדלת להמחשה
      </text>
      {order.map((id) => {
        const selected = id === active;
        const g = arrowGeom(INSET_ORIGIN, INSET_ARROW_LEN, angles[id], 4, selected ? { len: 11, half: 5 } : { len: 9, half: 4.2 });
        return (
          <g key={id} className={NORTHS[id].color} data-inset-arrow={id} data-angle={r1(angles[id])}>
            <line x1={r1(g.from.x)} y1={r1(g.from.y)} x2={r1(g.to.x)} y2={r1(g.to.y)} stroke="currentColor" strokeWidth={selected ? 3 : 2} strokeLinecap="round" />
            <polygon points={g.head} fill="currentColor" />
          </g>
        );
      })}
      <circle cx={INSET_ORIGIN.x} cy={INSET_ORIGIN.y} r={3.5} fill={INK} />
      {labels.map((l) => {
        const cx = r1(l.box.x + l.box.w / 2);
        return (
          <g key={l.id} className={NORTHS[l.id].color} data-inset-label={l.id}>
            {l.leader && (
              <line x1={cx} y1={r1(l.box.y + l.box.h)} x2={r1(l.tip.x)} y2={r1(l.tip.y - 3)} stroke="currentColor" strokeWidth={1} strokeOpacity={0.75} />
            )}
            <text x={cx} y={r1(l.box.y + l.box.h / 2)} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={13} fill="currentColor" className="font-display font-bold">
              {NORTHS[l.id].short}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function NorthLabOverlay({ declination, arcStart, active }: { declination: number; arcStart: number; active: NorthId }) {
  const angles = northAngles(declination);
  const labels = arrowLabels(declination);
  const order = [...NORTH_IDS.filter((id) => id !== active), active];
  const azimuth = formatDeg(azimuthFrom(arcStart));
  const arcBox = arcLabelBox(arcStart);

  // target line A → B, its head just short of B
  const u = bearingVec(TARGET_TRUE_BEARING);
  const abFrom = polar(LAB_A, POINT_R.a + 2, TARGET_TRUE_BEARING);
  const abTip = { x: LAB_B.x - u.x * (POINT_R.b + 2), y: LAB_B.y - u.y * (POINT_R.b + 2) };
  const abHead = 14;
  const abTo = { x: abTip.x - u.x * (abHead - 1), y: abTip.y - u.y * (abHead - 1) };
  const n = { x: -u.y, y: u.x };
  const abBase = { x: abTip.x - u.x * abHead, y: abTip.y - u.y * abHead };
  const abHeadPts = `${r1(abTip.x)},${r1(abTip.y)} ${r1(abBase.x + n.x * 6.5)},${r1(abBase.y + n.y * 6.5)} ${r1(abBase.x - n.x * 6.5)},${r1(abBase.y - n.y * 6.5)}`;

  return (
    <svg
      viewBox={`0 0 ${LAB_W} ${LAB_H}`}
      className="absolute inset-0 block size-full"
      role="img"
      aria-label={`מפה: קו היעד מ־A אל B. ${NORTHS[active].label} נבחר; האזימוט ביחס אליו ${azimuth}.`}
      style={{ direction: 'ltr' }}
      data-map
    >
      {/* measurement arc: from the chosen north, clockwise, to AB */}
      <path d={wedgePath(LAB_A, ARC_R, arcStart, TARGET_TRUE_BEARING)} className="fill-accent" fillOpacity={0.22} data-arc-from={r1(arcStart)} />
      <path d={arcPath(LAB_A, ARC_R, arcStart, TARGET_TRUE_BEARING)} fill="none" className="stroke-accent" strokeWidth={2} strokeLinecap="round" />

      {/* casings first, so crossing lines are never cut by another line's casing */}
      <g stroke={MAP.paper} strokeLinecap="round" strokeLinejoin="round">
        <line x1={r1(abFrom.x)} y1={r1(abFrom.y)} x2={r1(abTo.x)} y2={r1(abTo.y)} strokeWidth={3 + CASING} />
        <polygon points={abHeadPts} fill={MAP.paper} strokeWidth={CASING} />
      </g>
      {order.map((id) => (
        <MainArrow key={`c-${id}`} id={id} angle={angles[id]} selected={id === active} casing />
      ))}

      <g data-target>
        <line x1={r1(abFrom.x)} y1={r1(abFrom.y)} x2={r1(abTo.x)} y2={r1(abTo.y)} className="stroke-accent" strokeWidth={3} strokeLinecap="round" />
        <polygon points={abHeadPts} className="fill-accent" />
      </g>
      {order.map((id) => (
        <MainArrow key={id} id={id} angle={angles[id]} selected={id === active} />
      ))}

      <circle cx={LAB_A.x} cy={LAB_A.y} r={POINT_R.a} fill={WHITE} stroke={INK} strokeWidth={2} data-point="A" />
      <text x={LAB_A.x} y={LAB_A.y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={13} fill={INK} className="font-display font-bold">
        A
      </text>
      <circle cx={r1(LAB_B.x)} cy={r1(LAB_B.y)} r={POINT_R.b} className="fill-accent" stroke={WHITE} strokeWidth={2.5} data-point="B" />
      <text x={r1(LAB_B.x)} y={r1(LAB_B.y + 0.5)} textAnchor="middle" dominantBaseline="central" fontSize={13} fill={WHITE} className="font-display font-bold">
        B
      </text>

      {labels.map((l) => (
        <ArrowLabelMark key={l.id} label={l} selected={l.id === active} />
      ))}

      <g pointerEvents="none" data-label="arc">
        <rect x={r1(arcBox.x)} y={r1(arcBox.y)} width={arcBox.w} height={arcBox.h} rx={6} fill={MAP.paper} fillOpacity={0.9} />
        <text
          x={r1(arcBox.x + arcBox.w / 2)}
          y={r1(arcBox.y + arcBox.h / 2 + 0.5)}
          textAnchor="middle"
          dominantBaseline="central"
          direction="ltr"
          fontSize={17}
          className="fill-accent font-display font-bold tabular-nums"
        >
          {azimuth}
        </text>
      </g>

      <Inset declination={declination} active={active} />

      {/* RTL text: its end (left edge) sits at x */}
      <text x={NOTE_POS.x} y={NOTE_POS.y} textAnchor="end" direction="rtl" dominantBaseline="central" fontSize={13} className="fill-fg-muted font-display font-semibold">
        הנתונים להמחשה בלבד
      </text>
    </svg>
  );
}

/** Static sheet + live overlay, one box; every value comes from NorthLab's single state. */
export function NorthLabMap({ declination, arcStart, active }: { declination: number; arcStart: number; active: NorthId }) {
  const uid = useId().replace(/:/g, '');
  return (
    <div className="relative" data-north-lab-map>
      <NorthLabSheet uid={uid} />
      <NorthLabOverlay declination={declination} arcStart={arcStart} active={active} />
    </div>
  );
}

