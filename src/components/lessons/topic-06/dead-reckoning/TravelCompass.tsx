'use client';

import { memo, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { COMPASS_RINGS, BEZEL_PRINT_R, polar } from '../compassMapGeometry';
import { normalizeDegrees } from '../locationCheckGeometry';
import type { LookRig } from './deadReckoningLook';

/**
 * The navigator's compass, held level in front of them: the lesson's rendered
 * compass body (scripts/blender/build_compass_body.py) with a card that turns
 * as they turn — north on the card always points to the real north, and the
 * value under the top index is where they look. The orange mark on the card is
 * the walking azimuth; when it sits under the index, they face the way they
 * walk. While the compass is being set (`onTurn`) it is a slider: drag the
 * card, or arrows ±1°, Page Up / Down ±10°.
 *
 * The card's rotation follows the LookRig directly (no React render per frame).
 */

const BODY_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic06/compass/compass-body.webp`;
const R = COMPASS_RINGS;
const V = R.image;
const r1 = (v: number) => Math.round(v * 100) / 100;
const pad3 = (v: number) => String(Math.round(normalizeDegrees(v)) % 360).padStart(3, '0');
export const formatAzimuth = (v: number) => `${pad3(v)}°`;

const Card = memo(function Card() {
  const ticks = [];
  for (let deg = 0; deg < 360; deg += 5) {
    const major = deg % 30 === 0;
    const mid = deg % 10 === 0;
    const a = polar({ x: 0, y: 0 }, R.face - 2, deg);
    const b = polar({ x: 0, y: 0 }, R.face - 2 - (major ? 9 : mid ? 6 : 3.5), deg);
    ticks.push(<line key={deg} x1={r1(a.x)} y1={r1(a.y)} x2={r1(b.x)} y2={r1(b.y)} className="stroke-fg" strokeWidth={major ? 1.4 : 0.8} strokeOpacity={major ? 0.95 : 0.7} />);
  }
  const numbers = [30, 60, 120, 150, 210, 240, 300, 330];
  const cardinals = [
    { deg: 0, t: 'N' },
    { deg: 90, t: 'E' },
    { deg: 180, t: 'S' },
    { deg: 270, t: 'W' },
  ];
  return (
    <>
      <g>{ticks}</g>
      <g className="fill-bg-elevated" pointerEvents="none">
        {numbers.map((deg) => (
          <text key={deg} transform={`rotate(${deg}) translate(0 ${-BEZEL_PRINT_R})`} textAnchor="middle" dominantBaseline="central" fontSize={10} fillOpacity={0.94} className="font-display font-semibold">
            {deg}
          </text>
        ))}
        {cardinals.map((c) => (
          <text key={c.t} transform={`rotate(${c.deg}) translate(0 ${-BEZEL_PRINT_R})`} textAnchor="middle" dominantBaseline="central" fontSize={15} className="font-display font-bold" fill={c.deg === 0 ? '#F2A08C' : undefined}>
            {c.t}
          </text>
        ))}
      </g>
      {/* The needle: north red, south white */}
      <path d={`M0 ${-R.face + 12} L6.5 0 L-6.5 0 Z`} className="fill-accent-hot" />
      <path d={`M0 ${R.face - 12} L6.5 0 L-6.5 0 Z`} fill="#F4EEE4" className="stroke-fg-dim" strokeWidth={0.6} />
    </>
  );
});

export function TravelCompass({
  look,
  travel,
  size,
  onTurn,
  onSet,
}: {
  look: LookRig;
  /** The walking azimuth — the orange mark on the card. */
  travel: number;
  /** Rendered size, reference px. */
  size: number;
  /** Present while the compass is being set: it becomes a slider. */
  onTurn?: (by: number) => void;
  onSet?: (deg: number) => void;
}) {
  const card = useRef<SVGGElement>(null);
  useEffect(() => {
    const apply = () => card.current?.setAttribute('transform', `rotate(${r1(-look.yaw)})`);
    apply();
    return look.subscribe(apply);
  }, [look]);

  const svg = useRef<SVGSVGElement>(null);
  const dragFrom = useRef<number | null>(null);
  const angleAt = (e: ReactPointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180) / Math.PI;
  };
  const interactive = !!onTurn;
  const onKey = (e: ReactKeyboardEvent<SVGSVGElement>) => {
    if (!onTurn) return;
    const by = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
    if (by !== undefined) onTurn(by);
    else if (e.key === 'Home' && onSet) onSet(0);
    else return;
    e.preventDefault();
  };
  return (
    <svg
      ref={svg}
      viewBox={`${-V} ${-V} ${2 * V} ${2 * V}`}
      width={size}
      height={size}
      className={interactive ? 'shrink-0 cursor-grab touch-none rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing' : 'shrink-0'}
      style={{ direction: 'ltr' }}
      {...(interactive
        ? {
            role: 'slider',
            tabIndex: 0,
            'data-autofocus': '',
            'aria-label': 'כיוון המצפן (אזימוט) — חיצים: מעלה, Page Up/Down: עשר מעלות',
            'aria-valuemin': 0,
            'aria-valuemax': 359,
            'aria-valuenow': Math.round(travel),
            'aria-valuetext': `${Math.round(travel)} מעלות`,
            onKeyDown: onKey,
            onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => {
              dragFrom.current = angleAt(e);
              e.currentTarget.setPointerCapture(e.pointerId);
            },
            onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => {
              if (dragFrom.current === null) return;
              const a = angleAt(e);
              // Turning the card clockwise lowers the value under the index (the card moves, the index stays).
              const d = ((dragFrom.current - a + 540) % 360) - 180;
              if (Math.abs(d) >= 1) {
                onTurn!(Math.round(d));
                dragFrom.current = a + (d - Math.round(d));
              }
            },
            onPointerUp: () => (dragFrom.current = null),
            onPointerCancel: () => (dragFrom.current = null),
          }
        : { 'aria-hidden': true })}
      data-travel-compass
    >
      <image href={BODY_SRC} x={-V} y={-V} width={2 * V} height={2 * V} preserveAspectRatio="none" />
      <g ref={card}>
        <Card />
        {/* The walking azimuth on the card */}
        <g transform={`rotate(${r1(travel)})`} data-travel-mark>
          <line x1={0} y1={-R.face + 10} x2={0} y2={-R.bezelIn + 2} className="stroke-accent" strokeWidth={2.4} />
          <path d={`M0 ${-R.rim + 3} L7 ${-R.knurlIn + 8} L-7 ${-R.knurlIn + 8} Z`} className="fill-accent" stroke="#FFFFFF" strokeWidth={1.2} strokeLinejoin="round" />
        </g>
      </g>
      {/* Fixed index at the top: where the navigator looks */}
      <path d={`M0 ${-R.rim - 6} L6 ${-R.rim + 6} L-6 ${-R.rim + 6} Z`} className="fill-fg" stroke="#FFFFFF" strokeWidth={1.2} />
      <circle r={7} className="fill-fg" />
      <circle r={3.2} fill="#D8CDB8" />
      <circle cx={-18} cy={-26} r={46} fill="#FFFFFF" fillOpacity={0.06} pointerEvents="none" />
    </svg>
  );
}
