'use client';

import { useRef, useState } from 'react';
import { formatNumber, type SheetPoint } from './geo';
import type { OverlayContext } from './SheetViewport';
import { ACCENT, HAIRLINE, INK, Label, PAPER, dash, pillSize, sw } from './overlayParts';

const MM_UNITS = 1000 / 240; // 1 mm on a 24 cm sheet, in sheet units
const clamp = (q: SheetPoint): SheetPoint => ({ x: Math.min(1000, Math.max(0, q.x)), y: Math.min(1000, Math.max(0, q.y)) });

// Screen-px sizes (divided by ppu, so they hold while zooming).
const R = 11; // lettered disc radius
const LEAD = 8; // leader between a point and its disc's rim
const STEP = R + LEAD; // point → disc centre
const HIT = 18; // invisible pointer target around the disc (≥ 24 px target)
const DOT = 2; // ink dot radius at the measured point (4 px), with a 1 px paper edge
const TICK = 10; // longest (cm) ruler tick
const NUM_FS = 13; // ruler numerals
const NUM_H = 10; // numeral glyph height used for clearance
const NUM_GAP = 3; // tick end → numeral, numeral → ruler edge
const NUM_MIN_SPACING = 28; // label every cm only when cm ticks are at least this far apart
const RULER_EXT = 6; // ruler body beyond each end, so the end numerals sit on paper
const END_TICK = 7; // half-length of the dimension line's end ticks (no ruler)
const numW = (n: number) => String(n).length * NUM_FS * 0.6;

type Props = {
  a: SheetPoint | null;
  b: SheetPoint | null;
  /** Exact sheet length of a→b in cm (ground distance / denominator), so ruler and reading agree. */
  cm: number | null;
  /** Reading shown on the chip (rounded to 1 mm); null hides the ruler and the chip (dimension line instead). */
  reading: number | null;
  ctx: OverlayContext;
  letters: readonly [string, string];
  onMove?: (which: 0 | 1, p: SheetPoint) => void;
  names?: readonly [string, string];
};

type Axis = { ux: number; uy: number; nx: number; ny: number; len: number; px: number };

/** Unit vector a→b, its normal (the ruler side) and the length in sheet units and screen px. */
function axisOf(a: SheetPoint, b: SheetPoint, ppu: number): Axis {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const [ux, uy] = len < 1e-6 ? [1, 0] : [(b.x - a.x) / len, (b.y - a.y) / len];
  return { ux, uy, nx: -uy, ny: ux, len, px: len * ppu };
}

/** Which whole centimetres get a numeral: every cm, 2 cm or 5 cm by tick spacing; always 0 and the last whole cm. */
function numerals(cm: number, pxPerCm: number): number[] {
  const every = pxPerCm >= NUM_MIN_SPACING ? 1 : 2 * pxPerCm >= NUM_MIN_SPACING ? 2 : 5;
  const last = Math.floor(cm + 1e-6);
  const out: number[] = [];
  for (let c = 0; c <= last; c += every) out.push(c);
  const prev = out[out.length - 1];
  if (prev !== last) {
    // The last whole cm wins over a regular numeral it would touch (0 always stays).
    if (prev !== 0 && (last - prev) * pxPerCm < (numW(prev) + numW(last)) / 2 + 4) out.pop();
    out.push(last);
  }
  return out;
}

/** Ruler geometry in screen px: numerals and the body width that holds ticks + upright numerals. */
function rulerLayout(ax: Axis, cm: number, ppu: number) {
  const pxPerCm = (ax.len / cm) * ppu;
  const labels = numerals(cm, pxPerCm);
  const widest = Math.max(...labels.map(numW));
  // Upright numerals: their extent across the ruler depends on its direction.
  const across = (w: number) => (Math.abs(ax.nx) * w) / 2 + (Math.abs(ax.ny) * NUM_H) / 2;
  const width = TICK + NUM_GAP + 2 * across(widest) + NUM_GAP;
  return { labels, across, width };
}

/** Where a point's lettered disc goes: outward along the segment, else (sheet edge) beside it. */
function discFor(p: SheetPoint, out: { x: number; y: number }, side: { x: number; y: number }, ppu: number): SheetPoint {
  const s = STEP / ppu;
  const m = R / ppu;
  const fits = (c: SheetPoint) => c.x >= m && c.x <= 1000 - m && c.y >= m && c.y <= 1000 - m;
  for (const d of [out, side, { x: -side.x, y: -side.y }]) {
    const c = { x: p.x + d.x * s, y: p.y + d.y * s };
    if (fits(c)) return c;
  }
  return { x: p.x + out.x * s, y: p.y + out.y * s };
}

/**
 * A–B measurement on the sheet. The overlay lives under the viewport's zoom transform, so every
 * stroke and dash is sized with `sw`/`dash` (screen px ÷ ppu) instead of a non-scaling stroke.
 * Each measured point is a small ink dot exactly on the point; its lettered disc (the drag/keyboard
 * target) always stands off it along the segment, joined by a short leader, so the disc never hides
 * what is measured. With a reading, a sheet ruler lies on one side of the segment and the reading chip
 * on the other; without one (orthophoto stage) the segment is a dimension line with end ticks.
 */
export function MeasureOverlay({ a, b, cm, reading, ctx, letters, onMove, names }: Props) {
  const { ppu } = ctx;
  const both = a !== null && b !== null;
  const ax = both ? axisOf(a, b, ppu) : null;
  const up = { x: 0, y: -1 };
  const discs: [SheetPoint | null, SheetPoint | null] =
    both && ax
      ? [
          discFor(a, { x: -ax.ux, y: -ax.uy }, { x: -ax.nx, y: -ax.ny }, ppu),
          discFor(b, { x: ax.ux, y: ax.uy }, { x: -ax.nx, y: -ax.ny }, ppu),
        ]
      : [a && discFor(a, up, { x: -1, y: 0 }, ppu), b && discFor(b, up, { x: -1, y: 0 }, ppu)];
  const showRuler = both && ax !== null && ax.len > 1e-6 && cm !== null && cm > 0 && reading !== null;
  const ruler = showRuler ? rulerLayout(ax, cm, ppu) : null;
  return (
    <g data-qa="measure">
      {ruler && ax && a && b && cm !== null && <Ruler a={a} b={b} ax={ax} cm={cm} ppu={ppu} layout={ruler} />}
      {both && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={ACCENT} strokeWidth={sw(ruler ? 3 : 2.5, ppu)} strokeLinecap="round" />}
      {both && ax && !ruler && <DimensionTicks a={a} b={b} ax={ax} ppu={ppu} />}
      {both && ax && ruler && reading !== null && (
        <ReadingChip a={a} b={b} ax={ax} rulerW={ruler.width} ppu={ppu} text={`${formatNumber(reading, 1)} ס״מ`} />
      )}
      {[a, b].map((p, i) =>
        p ? <Handle key={i} which={i as 0 | 1} p={p} disc={discs[i] ?? p} ctx={ctx} letter={letters[i]} onMove={onMove} name={names?.[i]} /> : null,
      )}
    </g>
  );
}

/** Orthophoto stage: no ruler, so the segment reads as a dimension line — short perpendicular ticks at both points. */
function DimensionTicks({ a, b, ax, ppu }: { a: SheetPoint; b: SheetPoint; ax: Axis; ppu: number }) {
  const t = END_TICK / ppu;
  return (
    <g aria-hidden data-qa="dimension-ticks">
      {[a, b].map((p, i) => (
        <line key={i} x1={p.x - ax.nx * t} y1={p.y - ax.ny * t} x2={p.x + ax.nx * t} y2={p.y + ax.ny * t} stroke={ACCENT} strokeWidth={sw(2.5, ppu)} strokeLinecap="round" />
      ))}
    </g>
  );
}

/**
 * A paper ruler laid along the segment (its edge on the line), so the ink ticks read on the map and on the
 * photo alike. Ticks every ½ cm (cm ticks longer); millimetre ticks once they are ≥ 5 px apart. Upright
 * 13 px numerals at whole centimetres (spacing rule in `numerals`), beyond the cm ticks.
 */
function Ruler({ a, b, ax, cm, ppu, layout }: { a: SheetPoint; b: SheetPoint; ax: Axis; cm: number; ppu: number; layout: ReturnType<typeof rulerLayout> }) {
  const { len, ux, uy, nx, ny } = ax;
  const unitsPerCm = len / cm;
  const showMm = (unitsPerCm / 10) * ppu >= 5;
  const step = showMm ? unitsPerCm / 10 : unitsPerCm / 2;
  const perCm = showMm ? 10 : 2;
  const W = layout.width / ppu;
  const e = RULER_EXT / ppu;
  const a0 = { x: a.x - ux * e, y: a.y - uy * e };
  const b0 = { x: b.x + ux * e, y: b.y + uy * e };
  const body = [a0, b0, { x: b0.x + nx * W, y: b0.y + ny * W }, { x: a0.x + nx * W, y: a0.y + ny * W }].map((q) => `${q.x},${q.y}`).join(' ');
  const ticks = [];
  for (let i = 0; i * step <= len + 1e-6 && i < 3000; i++) {
    const major = i % perCm === 0;
    const half = !major && i % (perCm / 2) === 0;
    const lengthPx = major ? TICK : half ? 7 : 4;
    const t = lengthPx / ppu;
    const x = a.x + ux * i * step;
    const y = a.y + uy * i * step;
    ticks.push(<line key={i} x1={x} y1={y} x2={x + nx * t} y2={y + ny * t} stroke={INK} strokeWidth={sw(major ? 1.6 : 1, ppu)} />);
  }
  return (
    <g aria-hidden data-qa="ruler">
      <polygon points={body} fill={PAPER} fillOpacity={0.88} stroke={HAIRLINE} strokeWidth={sw(1, ppu)} strokeLinejoin="round" />
      {ticks}
      {layout.labels.map((c) => {
        const off = (TICK + NUM_GAP + layout.across(numW(c))) / ppu;
        return (
          <text
            key={c}
            data-qa="ruler-numeral"
            x={a.x + ux * c * unitsPerCm + nx * off}
            y={a.y + uy * c * unitsPerCm + ny * off}
            fontSize={NUM_FS / ppu}
            fontWeight={600}
            textAnchor="middle"
            dominantBaseline="central"
            fill={INK}
          >
            {c}
          </text>
        );
      })}
    </g>
  );
}

/**
 * Reading chip on the side away from the ruler, clear of the line; pushed clear of the discs when the
 * segment is too short for it. If that side leaves the sheet, it goes beyond the ruler instead.
 */
function ReadingChip({ a, b, ax, rulerW, ppu, text }: { a: SheetPoint; b: SheetPoint; ax: Axis; rulerW: number; ppu: number; text: string }) {
  const { w, h } = pillSize(text, 1); // screen px
  const mx = -ax.nx;
  const my = -ax.ny;
  const support = (Math.abs(mx) * w) / 2 + (Math.abs(my) * h) / 2; // half-extent across the line
  const along = (Math.abs(ax.ux) * w) / 2 + (Math.abs(ax.uy) * h) / 2; // half-extent along it
  // The discs stand LEAD px beyond the points; a chip longer than the gap between them must clear them sideways.
  const clearOfDiscs = ax.px / 2 + LEAD - 2 >= along;
  const gap = clearOfDiscs ? 6 : R + 6;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const at = (dirX: number, dirY: number, px: number) => ({ x: mid.x + (dirX * px) / ppu, y: mid.y + (dirY * px) / ppu });
  const inside = (c: SheetPoint) => c.x - w / 2 / ppu >= 0 && c.x + w / 2 / ppu <= 1000 && c.y - h / 2 / ppu >= 0 && c.y + h / 2 / ppu <= 1000;
  let c = at(mx, my, support + gap);
  if (!inside(c)) c = at(-mx, -my, support + Math.max(gap, rulerW + 4));
  return <Label p={c} ppu={ppu} text={text} dy={0} qa="reading-chip" />;
}

function Handle({
  which,
  p,
  disc,
  ctx,
  letter,
  onMove,
  name,
}: {
  which: 0 | 1;
  /** The measured point. */
  p: SheetPoint;
  /** Where the lettered disc is drawn, standing off the point. */
  disc: SheetPoint;
  ctx: OverlayContext;
  letter: string;
  onMove?: (which: 0 | 1, p: SheetPoint) => void;
  name?: string;
}) {
  const [focused, setFocused] = useState(false);
  // Offset from the pointer to the point at grab time, so a drag never jumps the point.
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  const editable = !!onMove;
  const { ppu } = ctx;
  const r = R / ppu;
  const dist = Math.hypot(disc.x - p.x, disc.y - p.y);
  // Leader from the dot's paper edge to the disc's rim.
  const [ux, uy] = dist > 1e-6 ? [(disc.x - p.x) / dist, (disc.y - p.y) / dist] : [0, 0];
  const from = (DOT + 1) / ppu;
  return (
    <g
      data-qa={`handle-${which}`}
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      aria-label={editable ? name : undefined}
      aria-roledescription={editable ? 'נקודת מדידה ניתנת להזזה' : undefined}
      aria-hidden={editable ? undefined : true}
      style={{ pointerEvents: editable ? 'auto' : 'none', cursor: editable ? 'grab' : 'default', outline: 'none' }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPointerDown={(e) => {
        if (!editable) return;
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        const u = ctx.toUnits(e.clientX, e.clientY);
        grab.current = { dx: p.x - u.x, dy: p.y - u.y };
      }}
      onPointerMove={(e) => {
        const g = grab.current;
        if (!editable || !g || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
        const u = ctx.toUnits(e.clientX, e.clientY);
        onMove(which, clamp({ x: u.x + g.dx, y: u.y + g.dy }));
      }}
      onPointerUp={() => (grab.current = null)}
      onPointerCancel={() => (grab.current = null)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (!editable || e.altKey || e.ctrlKey || e.metaKey) return;
        const s = e.shiftKey ? MM_UNITS * 10 : MM_UNITS;
        const d: Record<string, [number, number]> = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] };
        const v = d[e.key];
        if (!v) return;
        e.preventDefault();
        e.stopPropagation();
        onMove(which, clamp({ x: p.x + v[0], y: p.y + v[1] }));
      }}
    >
      {editable && <circle data-qa="handle-hit" cx={disc.x} cy={disc.y} r={HIT / ppu} fill="transparent" />}
      <line
        data-qa="handle-leader"
        x1={p.x + ux * from}
        y1={p.y + uy * from}
        x2={disc.x - ux * r}
        y2={disc.y - uy * r}
        stroke={ACCENT}
        strokeWidth={sw(1.5, ppu)}
      />
      {focused && (
        <circle cx={disc.x} cy={disc.y} r={r + 5 / ppu} fill="none" stroke={ACCENT} strokeWidth={sw(2, ppu)} strokeDasharray={dash(ppu, 3, 3)} />
      )}
      <circle data-qa="handle-disc" cx={disc.x} cy={disc.y} r={r} fill={PAPER} stroke={ACCENT} strokeWidth={sw(2.5, ppu)} />
      <text x={disc.x} y={disc.y} fontSize={13 / ppu} fontWeight={700} textAnchor="middle" dominantBaseline="central" fill={INK}>
        {letter}
      </text>
      {/* The measured point itself: ink, 4 px, with a 1 px paper edge (stroke centred on r = 2.5). */}
      <circle data-qa="point-dot" cx={p.x} cy={p.y} r={(DOT + 0.5) / ppu} fill={INK} stroke={PAPER} strokeWidth={sw(1, ppu)} />
    </g>
  );
}
