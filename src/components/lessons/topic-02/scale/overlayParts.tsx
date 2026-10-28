'use client';

import type { SheetPoint } from './geo';

// SVG-only colours (spec: map palette; no new tokens).
export const ACCENT = '#D97E2B';
export const INK = '#38432E';
export const PAPER = '#FFFDF8';
export const HAIRLINE = '#DCCDB2';

/** Stroke width in sheet units for `px` screen pixels (ppu already includes the viewBox scale and zoom k). */
export const sw = (px: number, ppu: number) => px / ppu;
/** Dash array in sheet units for lengths given in screen px. */
export const dash = (ppu: number, ...px: number[]) => px.map((p) => p / ppu).join(' ');

/** `ppu` = screen px per sheet unit; sizes are given in screen px and divided by it, so they stay constant while zooming. */
export function Marker({ p, ppu, qa }: { p: SheetPoint; ppu: number; qa?: string }) {
  return (
    <circle data-qa={qa} cx={p.x} cy={p.y} r={7 / ppu} fill={ACCENT} stroke={PAPER} strokeWidth={sw(2, ppu)} />
  );
}

/**
 * Size of a `Label` pill in sheet units: 13 px text at ~0.6 em per character (weight 700) plus 7 px padding
 * each side, 22 px tall. Pass ppu = 1 to get screen px. Every collision estimate uses this one formula.
 */
export const pillSize = (text: string, ppu: number) => ({ w: (text.length * 13 * 0.6 + 14) / ppu, h: 22 / ppu });

/**
 * Pill label (no text halo), centred `dy` screen px below `p` (negative = above). `strong`: ink pill with
 * paper text, for the one place the learner asked to find (it must not read as one of the map's own names).
 */
export function Label({ p, ppu, text, dy = -18, qa, strong = false }: { p: SheetPoint; ppu: number; text: string; dy?: number; qa?: string; strong?: boolean }) {
  const fs = 13 / ppu;
  const { w, h } = pillSize(text, ppu);
  const cy = p.y + dy / ppu;
  return (
    <g data-qa={qa} aria-hidden>
      <rect
        x={p.x - w / 2}
        y={cy - h / 2}
        width={w}
        height={h}
        rx={h / 2}
        fill={strong ? INK : PAPER}
        stroke={strong ? PAPER : HAIRLINE}
        strokeWidth={sw(strong ? 1.5 : 1, ppu)}
      />
      <text x={p.x} y={cy} fontSize={fs} fontWeight={700} textAnchor="middle" dominantBaseline="central" fill={strong ? PAPER : INK} direction="rtl">
        {text}
      </text>
    </g>
  );
}

/**
 * Hollow locate ring: marks a spot without covering it, so the map's own symbol and name stay readable
 * inside. `r` is in screen px (pass `r * k` to anchor it to the ground while zooming); the stroke stays
 * 2.5 px. With `pulse` (default) a ping ring expands from it — CSS, static under prefers-reduced-motion.
 * `strong`: a 4 px ring on a paper casing (it holds on the orthophoto and on busy map), with a small centre
 * dot on the exact spot.
 */
export function Ring({ p, ppu, r = 14, pulse = true, strong = false, qa }: { p: SheetPoint; ppu: number; r?: number; pulse?: boolean; strong?: boolean; qa?: string }) {
  const ring = { cx: p.x, cy: p.y, r: r / ppu, fill: 'none', stroke: ACCENT, strokeWidth: sw(strong ? 4 : 2.5, ppu) };
  return (
    <g aria-hidden data-qa={qa}>
      {strong && <circle cx={p.x} cy={p.y} r={r / ppu} fill="none" stroke={PAPER} strokeWidth={sw(8, ppu)} />}
      {pulse && <circle {...ring} className="animate-ping motion-reduce:animate-none" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />}
      <circle {...ring} />
      {strong && <circle cx={p.x} cy={p.y} r={3.5 / ppu} fill={ACCENT} stroke={PAPER} strokeWidth={sw(1.5, ppu)} />}
    </g>
  );
}
