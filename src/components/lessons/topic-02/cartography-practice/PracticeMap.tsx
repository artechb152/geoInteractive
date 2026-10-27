'use client';

import { memo, useId } from 'react';
import { MAP } from '../topographyTerrainStyle';
import { alongContour, gradientAt, heightAt, pointAtLevel } from './practiceTerrain';
import { fmtCm, fmtInt, type MarkLetter, type Scenario, type SegmentId, type XY } from './practiceModel';

/**
 * The practice map — north up, never mirrored. The SVG is drawn in millimetres of the printed
 * sheet (200 × 150 mm inside the neatline), so the ruler of task 3 reads sheet centimetres and
 * every type size holds across scenarios of different scales. Ground metres become sheet mm by
 * 1000 / denominator. Everything is computed from the scenario (practiceModel / practiceTerrain).
 *
 * The map draws only what the card hands it for the step: the base sheet and its furniture (north
 * arrow, scale, frame labels) always; marks, segments, points, the ruler and the reading lines per
 * step. It is a picture for pointer users; the panel's buttons are the keyboard path, and the
 * card's text description gives the same data to screen readers.
 */

/** Collar around the neatline (mm): N labels on the left, E labels below, north and scale above. */
export const COLLAR = { l: 28, r: 10, t: 13, b: 9 } as const;
export const SHEET_MM = { w: 200, h: 150 } as const;
export const VIEW = { w: COLLAR.l + SHEET_MM.w + COLLAR.r, h: COLLAR.t + SHEET_MM.h + COLLAR.b } as const;

/** Type sizes in mm (the map column draws ≈ 2.7 screen px per mm at 1440 px: 5 mm ≈ 13.5 px). */
const FS = { label: 5, mark: 5.4, small: 5 } as const;

export type MarkTone = 'idle' | 'selected' | 'right' | 'wrong';

export type PracticeMapProps = {
  sc: Scenario;
  step: number;
  /** Task 1: tone per mark. */
  marks?: Partial<Record<MarkLetter, MarkTone>>;
  onPickMark?: (l: MarkLetter) => void;
  /** Task 2: tone per segment; `evidence` draws the contour crossings after a right check. */
  segments?: Partial<Record<SegmentId, MarkTone>>;
  onPickSegment?: (id: SegmentId) => void;
  evidence?: boolean;
  /** Task 3. */
  ruler?: boolean;
  measured?: boolean;
  /** Task 4: the reading lines to the frame after a right check. */
  readLines?: boolean;
  className?: string;
  labelledBy?: string;
  describedBy?: string;
};

const r1 = (v: number) => Math.round(v * 10) / 10;

export function PracticeMap(props: PracticeMapProps) {
  const { sc, step, className, labelledBy, describedBy } = props;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const k = 1000 / sc.denominator;
  const X = (x: number) => COLLAR.l + x * k;
  const Y = (y: number) => COLLAR.t + (sc.ground.h - y) * k;
  const P = (p: XY) => [X(p[0]), Y(p[1])] as const;

  return (
    <svg
      viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
      className={className}
      role="img"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      xmlns="http://www.w3.org/2000/svg"
      data-map-scenario={sc.id}
      data-map-step={step}
    >
      <defs>
        <clipPath id={`${uid}-sheet`}>
          <rect x={COLLAR.l} y={COLLAR.t} width={SHEET_MM.w} height={SHEET_MM.h} />
        </clipPath>
        <pattern id={`${uid}-wood`} width={3.4} height={3.4} patternUnits="userSpaceOnUse">
          <circle cx={0.9} cy={0.9} r={0.55} fill="none" stroke={MAP.vegInk} strokeWidth={0.18} />
          <circle cx={2.6} cy={2.5} r={0.55} fill="none" stroke={MAP.vegInk} strokeWidth={0.18} />
        </pattern>
        <pattern id={`${uid}-orchard`} width={2} height={2} patternUnits="userSpaceOnUse">
          <circle cx={1} cy={1} r={0.32} fill={MAP.vegInk} />
        </pattern>
      </defs>

      <Sheet sc={sc} uid={uid} gridStrong={step === 3} />
      <g clipPath={`url(#${uid}-sheet)`}>
        {step === 0 && <ReliefMarks sc={sc} P={P} tones={props.marks ?? {}} onPick={props.onPickMark} />}
        {step === 1 && <Segments sc={sc} P={P} tones={props.segments ?? {}} onPick={props.onPickSegment} evidence={!!props.evidence} />}
        {step === 2 && <DistancePoints sc={sc} P={P} ruler={!!props.ruler} measured={!!props.measured} />}
        {step === 3 && <LocationPoint sc={sc} P={P} lines={!!props.readLines} />}
      </g>
      {step === 3 && props.readLines && <ReadLineLabels sc={sc} />}
    </svg>
  );
}

// ---------------------------------------------------------------- the sheet (memoised: it never changes within a scenario)

const Sheet = memo(function Sheet({ sc, uid, gridStrong }: { sc: Scenario; uid: string; gridStrong: boolean }) {
  const k = 1000 / sc.denominator;
  const X = (x: number) => COLLAR.l + x * k;
  const Y = (y: number) => COLLAR.t + (sc.ground.h - y) * k;
  const line = (pts: readonly XY[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${r1(X(p[0]))} ${r1(Y(p[1]))}`).join('');
  const ring = (pts: readonly XY[]) => `${line(pts)}Z`;
  const right = COLLAR.l + SHEET_MM.w;
  const bottom = COLLAR.t + SHEET_MM.h;

  return (
    <g pointerEvents="none" data-map="sheet">
      <rect x={0} y={0} width={VIEW.w} height={VIEW.h} fill={MAP.collar} />
      <rect x={COLLAR.l} y={COLLAR.t} width={SHEET_MM.w} height={SHEET_MM.h} fill={MAP.paper} />

      <g clipPath={`url(#${uid}-sheet)`}>
        {/* Cover: vegetation under the contours, roads and buildings over them (as on the lesson's sheets) */}
        {sc.cover.groves.map((g, i) => (
          <g key={`g${i}`} data-cover="grove">
            <path d={ring(g)} fill={MAP.vegFill} />
            <path d={ring(g)} fill={`url(#${uid}-wood)`} stroke={MAP.vegInk} strokeWidth={0.22} strokeDasharray="0.8 0.6" />
          </g>
        ))}
        {sc.cover.orchards.map((g, i) => (
          <g key={`o${i}`} data-cover="orchard">
            <path d={ring(g)} fill={MAP.vegFill} fillOpacity={0.75} />
            <path d={ring(g)} fill={`url(#${uid}-orchard)`} stroke={MAP.vegInk} strokeWidth={0.22} />
          </g>
        ))}

        {/* Grid */}
        <g stroke={gridStrong ? MAP.muted : MAP.grid} strokeWidth={gridStrong ? 0.32 : 0.22} data-map="grid" data-grid-strong={gridStrong || undefined}>
          {sc.gridE.map((E) => (
            <path key={`e${E}`} d={`M${r1(X(E - sc.origin.E))} ${COLLAR.t}V${bottom}`} />
          ))}
          {sc.gridN.map((N) => (
            <path key={`n${N}`} d={`M${COLLAR.l} ${r1(Y(N - sc.origin.N))}H${right}`} />
          ))}
        </g>

        {/* Contours — index lines heavier */}
        {sc.contours.map((lv) => (
          <path
            key={lv.level}
            d={lv.lines.map((l) => line(l)).join('')}
            fill="none"
            stroke={MAP.contour}
            strokeWidth={lv.index ? 0.5 : 0.26}
            strokeLinejoin="round"
            strokeLinecap="round"
            data-contour={lv.level}
          />
        ))}

        {sc.cover.roads.map((r, i) => (
          <g key={`r${i}`} data-cover="road">
            <path d={line(r)} fill="none" stroke={MAP.roadCasing} strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round" />
            <path d={line(r)} fill="none" stroke={MAP.roadFill} strokeWidth={1.3} strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}
        {sc.cover.buildings.map((b, i) => (
          <rect
            key={`b${i}`}
            x={r1(X(b.at[0]) - (b.w * k) / 2)}
            y={r1(Y(b.at[1]) - (b.h * k) / 2)}
            width={r1(b.w * k)}
            height={r1(b.h * k)}
            transform={`rotate(${b.angle} ${r1(X(b.at[0]))} ${r1(Y(b.at[1]))})`}
            fill={MAP.building}
            data-cover="building"
          />
        ))}

        {/* Spot heights at the tops */}
        {sc.tops.map((t, i) => (
          <g key={`t${i}`} data-spot={Math.round(t.z)}>
            <path d={`M${r1(X(t.at[0]))} ${r1(Y(t.at[1]) - 1.3)}l1.2 2.1h-2.4z`} fill={MAP.ink} />
            <MapText x={X(t.at[0]) + 2} y={Y(t.at[1]) - 2.6} anchor="start" dir="ltr" size={FS.small} weight={700} fill={MAP.ink}>
              {String(Math.round(t.z))}
            </MapText>
          </g>
        ))}

        <ContourLabels sc={sc} />
      </g>

      {/* Neatline */}
      <rect x={COLLAR.l} y={COLLAR.t} width={SHEET_MM.w} height={SHEET_MM.h} fill="none" stroke={MAP.ink} strokeWidth={0.45} />

      {/* Frame labels: E under the bottom edge, N left of the left edge (full metres) */}
      <g data-map="frame-labels">
        {sc.gridE.map((E) => (
          <g key={`le${E}`}>
            <path d={`M${r1(X(E - sc.origin.E))} ${bottom}v1.4`} stroke={MAP.ink} strokeWidth={0.3} />
            <MapText x={X(E - sc.origin.E)} y={bottom + 5.4} anchor="middle" dir="ltr" size={FS.small} weight={600} fill={MAP.ink} data-frame-e={E}>
              {String(E)}
            </MapText>
          </g>
        ))}
        {sc.gridN.map((N) => (
          <g key={`ln${N}`}>
            <path d={`M${COLLAR.l - 1.4} ${r1(Y(N - sc.origin.N))}h1.4`} stroke={MAP.ink} strokeWidth={0.3} />
            <MapText x={COLLAR.l - 2.2} y={Y(N - sc.origin.N)} anchor="end" dir="ltr" size={FS.small} weight={600} fill={MAP.ink} data-frame-n={N}>
              {String(N)}
            </MapText>
          </g>
        ))}
      </g>

      <NorthArrow />
      <ScaleBar sc={sc} />
    </g>
  );
});

/** Index contours labelled where they cross a ray from each top (south-west), upright along the line. */
function ContourLabels({ sc }: { sc: Scenario }) {
  const k = 1000 / sc.denominator;
  const labels: { at: XY; level: number }[] = [];
  const dirs: XY[] = [[-Math.SQRT1_2, -Math.SQRT1_2]];
  for (const top of sc.tops)
    for (const lv of sc.contours.filter((c) => c.index && c.level < top.z))
      for (const d of dirs) {
        const at = pointAtLevel(sc.terrain, top.at, d, lv.level, Math.max(sc.ground.w, sc.ground.h));
        const m = 8 / k; // keep labels 8 mm inside the neatline
        const inside = at[0] > m && at[0] < sc.ground.w - m && at[1] > m && at[1] < sc.ground.h - m;
        if (inside && Math.abs(heightAt(sc.terrain, at[0], at[1]) - lv.level) < 0.5 && !labels.some((l) => l.level === lv.level && Math.hypot(l.at[0] - at[0], l.at[1] - at[1]) * k < 30))
          labels.push({ at, level: lv.level });
      }
  return (
    <g data-map="contour-labels">
      {labels.map((l) => (
        <ContourLabel key={`${l.level}-${Math.round(l.at[0])}`} sc={sc} at={l.at} level={l.level} />
      ))}
    </g>
  );
}

/** A contour height on a paper plate, turned along the line and kept upright. */
export function ContourLabel({ sc, at, level, strong }: { sc: Scenario; at: XY; level: number; strong?: boolean }) {
  const k = 1000 / sc.denominator;
  const x = COLLAR.l + at[0] * k;
  const y = COLLAR.t + (sc.ground.h - at[1]) * k;
  const [gx, gy] = gradientAt(sc.terrain, at[0], at[1]);
  // Along the line = perpendicular to the gradient; screen y points down.
  let angle = (Math.atan2(gx, gy) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  const text = String(level);
  const w = text.length * FS.small * 0.6 + 1.6;
  return (
    <g transform={`translate(${r1(x)} ${r1(y)}) rotate(${r1(angle)})`} data-contour-label={level}>
      <rect x={r1(-w / 2)} y={-3.1} width={r1(w)} height={6.2} rx={1} fill={MAP.paper} />
      <text textAnchor="middle" dominantBaseline="central" direction="ltr" fontSize={FS.small} fontWeight={700} fill={strong ? MAP.ink : MAP.contour} className="font-display tabular-nums">
        {text}
      </text>
    </g>
  );
}

function MapText({ x, y, anchor, dir, size, weight, fill, children, ...rest }: { x: number; y: number; anchor: 'start' | 'middle' | 'end'; dir: 'ltr' | 'rtl'; size: number; weight: number; fill: string; children: string } & Record<`data-${string}`, unknown>) {
  return (
    <text x={r1(x)} y={r1(y)} textAnchor={anchor} direction={dir} dominantBaseline="central" fontSize={size} fontWeight={weight} fill={fill} className="font-display tabular-nums" {...rest}>
      {children}
    </text>
  );
}

/** North arrow in the top collar, over the sheet's left part. */
function NorthArrow() {
  const x = COLLAR.l + 6;
  return (
    <g data-map="north">
      <path d={`M${x} 2.2l2.2 8.8l-2.2-2l-2.2 2z`} fill={MAP.ink} />
      <MapText x={x + 3.6} y={6.6} anchor="end" dir="rtl" size={FS.small} weight={800} fill={MAP.ink}>
        צפון
      </MapText>
    </g>
  );
}

/** Ratio and a 4 cm bar (1 cm segments, numbered every 2 cm) in the top collar, at the right. */
function ScaleBar({ sc }: { sc: Scenario }) {
  const right = COLLAR.l + SHEET_MM.w;
  const x0 = right - 8 - 40; // bar start; "מ׳" after it
  const y = 8.2;
  return (
    <g data-map="scale">
      {[0, 1, 2, 3].map((c) => (
        <rect key={c} x={x0 + c * 10} y={y} width={10} height={1.6} fill={c % 2 === 0 ? MAP.ink : MAP.collar} stroke={MAP.ink} strokeWidth={0.25} />
      ))}
      {[0, 2, 4].map((c) => (
        <MapText key={c} x={x0 + c * 10} y={4.6} anchor="middle" dir="ltr" size={FS.small} weight={600} fill={MAP.ink} data-scale-mark={c * sc.mPerCm}>
          {fmtInt(c * sc.mPerCm)}
        </MapText>
      ))}
      <MapText x={x0 + 40 + 2} y={y + 0.8} anchor="end" dir="rtl" size={FS.small} weight={600} fill={MAP.ink}>
        מ׳
      </MapText>
      <MapText x={x0 - 6} y={y + 0.2} anchor="end" dir="ltr" size={FS.small} weight={700} fill={MAP.ink} data-map-ratio={sc.denominator}>
        {`1:${fmtInt(sc.denominator)}`}
      </MapText>
    </g>
  );
}

// ---------------------------------------------------------------- task overlays

const TONE: Record<MarkTone, { ring: string; fill: string; text: string; width: number }> = {
  idle: { ring: MAP.ink, fill: '#FFFFFF', text: MAP.ink, width: 0.45 },
  selected: { ring: MAP.accent, fill: '#FBEBDC', text: MAP.ink, width: 0.8 },
  right: { ring: '#4F7A50', fill: '#E3EEDF', text: MAP.ink, width: 0.8 },
  wrong: { ring: '#B5452F', fill: '#F6E2DC', text: MAP.ink, width: 0.8 },
};

type Pt = (p: XY) => readonly [number, number];

/** A lettered disc on the map (a pointer target; the panel buttons are the keyboard path). */
function Disc({ x, y, text, tone, onClick, data }: { x: number; y: number; text: string; tone: MarkTone; onClick?: () => void; data: Record<string, string> }) {
  const t = TONE[tone];
  return (
    <g onClick={onClick} className={onClick ? 'cursor-pointer' : undefined} pointerEvents={onClick ? 'all' : 'none'} aria-hidden {...data}>
      {onClick && <circle cx={r1(x)} cy={r1(y)} r={7} fill="transparent" />}
      <circle cx={r1(x)} cy={r1(y)} r={3.9} fill={t.fill} stroke={t.ring} strokeWidth={t.width} />
      <text x={r1(x)} y={r1(y)} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={FS.mark} fontWeight={800} fill={t.text} className="font-display">
        {text}
      </text>
    </g>
  );
}

function ReliefMarks({ sc, P, tones, onPick }: { sc: Scenario; P: Pt; tones: Partial<Record<MarkLetter, MarkTone>>; onPick?: (l: MarkLetter) => void }) {
  return (
    <g data-map="relief-marks">
      {sc.marks.map((m) => {
        const [x, y] = P(m.at);
        // The disc sits up-left of the element on a short leader: the symbol under it and a spot height
        // (written up-right of a top) stay readable.
        const dx = -5;
        const dy = -5;
        return (
          <g key={m.letter}>
            <path d={`M${r1(x)} ${r1(y)}L${r1(x + dx)} ${r1(y + dy)}`} stroke={MAP.ink} strokeWidth={0.4} />
            <circle cx={r1(x)} cy={r1(y)} r={0.9} fill={MAP.ink} stroke="#FFFFFF" strokeWidth={0.3} />
            <Disc x={x + dx} y={y + dy} text={m.letter} tone={tones[m.letter] ?? 'idle'} onClick={onPick ? () => onPick(m.letter) : undefined} data={{ 'data-mark': m.letter, 'data-tone': tones[m.letter] ?? 'idle' }} />
          </g>
        );
      })}
    </g>
  );
}

function Segments({ sc, P, tones, onPick, evidence }: { sc: Scenario; P: Pt; tones: Partial<Record<SegmentId, MarkTone>>; onPick?: (id: SegmentId) => void; evidence: boolean }) {
  const [hi, lo] = [sc.slope.levels[1], sc.slope.levels[0]];
  const top = sc.tops[sc.slope.hill].at;
  const reach = Math.max(sc.ground.w, sc.ground.h);
  return (
    <g data-map="segments">
      {sc.segments.map((s, i) => {
        const [ax, ay] = P(s.a);
        const [bx, by] = P(s.b);
        const tone = tones[s.id] ?? 'idle';
        const stroke = tone === 'idle' ? MAP.ink : TONE[tone].ring;
        // Unit vector along the segment on the sheet, and its normal (where the number disc goes).
        const len = Math.hypot(bx - ax, by - ay);
        const ux = (bx - ax) / len;
        const uy = (by - ay) / len;
        const side = i === 0 ? 1 : -1;
        const nx = -uy * side;
        const ny = ux * side;
        const mx = (ax + bx) / 2 + nx * 7.5;
        const my = (ay + by) / 2 + ny * 7.5;
        // The two levels, labelled on their own contour lines 8 mm off the segment's ends, on the
        // side away from the number disc.
        const dir = sc.slope.segments.find((x) => x.id === s.id)!.dir;
        const k = 1000 / sc.denominator;
        const offLine = (p: XY, level: number) => {
          const cands = ([1, -1] as const).map((sd) => alongContour(sc.terrain, p, level, 8 / k, sd));
          const away = (q: XY) => {
            const [qx, qy] = P(q);
            const [px, py] = P(p);
            return (qx - px) * nx + (qy - py) * ny;
          };
          return away(cands[0]) < away(cands[1]) ? cands[0] : cands[1];
        };
        const hiLabel = offLine(s.a, hi);
        const loLabel = offLine(s.b, lo);
        const crossings = evidence
          ? sc.contours.filter((c) => c.level >= lo && c.level <= hi).map((c) => pointAtLevel(sc.terrain, top, dir, c.level, reach))
          : [];
        return (
          <g key={s.id} data-segment={s.id} data-tone={tone}>
            <path
              d={`M${r1(ax)} ${r1(ay)}L${r1(bx)} ${r1(by)}`}
              stroke={stroke}
              strokeWidth={tone === 'idle' ? 0.9 : 1.3}
              strokeLinecap="round"
              onClick={onPick ? () => onPick(s.id) : undefined}
              className={onPick ? 'cursor-pointer' : undefined}
            />
            {/* a wider invisible pointer target */}
            {onPick && <path d={`M${r1(ax)} ${r1(ay)}L${r1(bx)} ${r1(by)}`} stroke="transparent" strokeWidth={7} onClick={() => onPick(s.id)} className="cursor-pointer" aria-hidden />}
            {[
              [ax, ay],
              [bx, by],
            ].map(([x, y], j) => (
              <path key={j} d={`M${r1(x - nx * 1.8)} ${r1(y - ny * 1.8)}L${r1(x + nx * 1.8)} ${r1(y + ny * 1.8)}`} stroke={stroke} strokeWidth={0.7} />
            ))}
            {crossings.map((c, j) => {
              const [x, y] = P(c);
              return <circle key={j} cx={r1(x)} cy={r1(y)} r={0.85} fill={TONE.right.ring} stroke="#FFFFFF" strokeWidth={0.25} data-crossing />;
            })}
            <ContourLabel sc={sc} at={hiLabel} level={hi} strong />
            <ContourLabel sc={sc} at={loLabel} level={lo} strong />
            <Disc x={mx} y={my} text={s.id} tone={tone} onClick={onPick ? () => onPick(s.id) : undefined} data={{ 'data-segment-disc': s.id }} />
          </g>
        );
      })}
    </g>
  );
}

function DistancePoints({ sc, P, ruler, measured }: { sc: Scenario; P: Pt; ruler: boolean; measured: boolean }) {
  const [ax, ay] = P(sc.distance.a);
  const [bx, by] = P(sc.distance.b);
  const len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  // The ruler lies on the side of the line that has more room on the sheet.
  const cx = COLLAR.l + SHEET_MM.w / 2;
  const cy = COLLAR.t + SHEET_MM.h / 2;
  const n0: [number, number] = [-uy, ux];
  const toCentre = (cx - (ax + bx) / 2) * n0[0] + (cy - (ay + by) / 2) * n0[1];
  const [nx, ny] = toCentre >= 0 ? n0 : [uy, -ux];
  // Letters on the other side of the line from the ruler, so neither covers the other.
  const letterOff = (x: number, y: number) => [x - nx * 6.4, y - ny * 6.4] as const;
  const [lax, lay] = letterOff(ax, ay);
  const [lbx, lby] = letterOff(bx, by);
  return (
    <g data-map="distance">
      {measured && (
        <g data-map-measured>
          <path d={`M${r1(ax)} ${r1(ay)}L${r1(bx)} ${r1(by)}`} stroke={TONE.right.ring} strokeWidth={0.7} strokeDasharray="2 1.2" />
        </g>
      )}
      {ruler && <Ruler ax={ax} ay={ay} ux={ux} uy={uy} nx={nx} ny={ny} cm={sc.ground3.cm} />}
      {[
        [ax, ay, lax, lay, 'א'],
        [bx, by, lbx, lby, 'ב'],
      ].map(([x, y, lx, ly, t]) => (
        <g key={t as string} data-point={t as string}>
          <circle cx={r1(x as number)} cy={r1(y as number)} r={1.25} fill={MAP.ink} stroke="#FFFFFF" strokeWidth={0.4} />
          <Disc x={lx as number} y={ly as number} text={t as string} tone="idle" data={{ 'data-point-disc': t as string }} />
        </g>
      ))}
    </g>
  );
}

/**
 * A ruler of the printed sheet laid from point א towards ב: 0 at א, a tick every mm, a longer one
 * every 5 mm and a numeral every cm. It reads sheet centimetres (1 viewBox unit = 1 mm), not the
 * screen's.
 */
function Ruler({ ax, ay, ux, uy, nx, ny, cm }: { ax: number; ay: number; ux: number; uy: number; nx: number; ny: number; cm: number }) {
  const lenMm = Math.ceil(cm) * 10 + 10;
  const W = 9;
  const at = (s: number, d: number) => [ax + ux * s + nx * d, ay + uy * s + ny * d] as const;
  // The body starts 11 mm before 0: room for the unit, so it never sits by the far point.
  const corners = [at(-11, 0.4), at(lenMm, 0.4), at(lenMm, W), at(-11, W)];
  return (
    <g data-map="ruler" pointerEvents="none">
      <path d={`M${corners.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}Z`} fill="#FFFFFF" stroke={MAP.ink} strokeWidth={0.3} />
      {Array.from({ length: lenMm + 1 }, (_, mm) => {
        const t = mm % 10 === 0 ? 3 : mm % 5 === 0 ? 2 : 1.1;
        const [x1, y1] = at(mm, 0.4);
        const [x2, y2] = at(mm, 0.4 + t);
        return <path key={mm} d={`M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`} stroke={MAP.ink} strokeWidth={mm % 10 === 0 ? 0.32 : 0.18} />;
      })}
      {Array.from({ length: lenMm / 10 + 1 }, (_, c) => {
        const [x, y] = at(c * 10, 6.3);
        return (
          <text key={c} x={r1(x)} y={r1(y)} textAnchor="middle" dominantBaseline="central" direction="ltr" fontSize={FS.small} fontWeight={600} fill={MAP.ink} className="font-display tabular-nums" data-ruler-cm={c}>
            {c}
          </text>
        );
      })}
      {(() => {
        const [x, y] = at(-6, 6.3);
        return (
          <text x={r1(x)} y={r1(y)} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={FS.small - 0.6} fontWeight={600} fill={MAP.muted} className="font-display">
            ס״מ
          </text>
        );
      })()}
    </g>
  );
}

function LocationPoint({ sc, P, lines }: { sc: Scenario; P: Pt; lines: boolean }) {
  const [x, y] = P(sc.location.at);
  return (
    <g data-map="location">
      {lines && (
        <g stroke={TONE.right.ring} strokeWidth={0.7} strokeDasharray="2 1.2" data-map-read-lines>
          <path d={`M${r1(x)} ${r1(y)}V${COLLAR.t + SHEET_MM.h}`} />
          <path d={`M${r1(x)} ${r1(y)}H${COLLAR.l}`} />
        </g>
      )}
      <circle cx={r1(x)} cy={r1(y)} r={2.6} fill="none" stroke={MAP.accent} strokeWidth={0.8} />
      <circle cx={r1(x)} cy={r1(y)} r={0.8} fill={MAP.accent} />
      <path d={`M${r1(x - 4.4)} ${r1(y)}h1.6M${r1(x + 2.8)} ${r1(y)}h1.6M${r1(x)} ${r1(y - 4.4)}v1.6M${r1(x)} ${r1(y + 2.8)}v1.6`} stroke={MAP.accent} strokeWidth={0.6} />
    </g>
  );
}

/** After a right reading: the two frame labels it came from, underlined. */
function ReadLineLabels({ sc }: { sc: Scenario }) {
  const k = 1000 / sc.denominator;
  const x = COLLAR.l + sc.location.at[0] * k;
  const y = COLLAR.t + (sc.ground.h - sc.location.at[1]) * k;
  const bottom = COLLAR.t + SHEET_MM.h;
  const wE = String(sc.point.E).length * FS.small * 0.66;
  const wN = String(sc.point.N).length * FS.small * 0.66;
  return (
    <g stroke={TONE.right.ring} strokeWidth={0.6} fill="none" data-map-read-labels>
      <rect x={r1(x - wE / 2 - 1)} y={bottom + 2.2} width={r1(wE + 2)} height={6.4} rx={1.2} />
      <rect x={r1(COLLAR.l - 2.2 - wN - 1)} y={r1(y - 3.2)} width={r1(wN + 2)} height={6.4} rx={1.2} />
    </g>
  );
}

/** Sheet cm between the task-3 points (for the text description of the ruler). */
export const rulerReading = (sc: Scenario) => fmtCm(sc.ground3.cm);
