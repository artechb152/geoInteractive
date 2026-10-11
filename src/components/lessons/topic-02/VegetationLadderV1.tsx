'use client';

import { useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * ARCHIVED SNAPSHOT — the papercut vegetation ladder of „תצורות הצומח וגובהן”, as it was
 * before the 2026-10-11 realistic redesign. Used only by LandCoverSceneV1
 * (/archive/topic-02/landcover-v1/). Do not edit; the live ladder is VegetationLadder in
 * LandCoverVisuals.tsx.
 *
 * סולם תצורות הצומח (מבט צד, papercut). האיור לא משוקף ב-RTL; כל <text> עם textAnchor מפורש.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/* ───────────────────────── vegetation ladder (side view) ───────────────────────── */

const VB_W = 500;
const GROUND = 184;
const COL = 100;
/** Column centre for ladder index i — index 0 sits at the inline-start (right), like the label list. */
const cx = (i: number) => VB_W - COL / 2 - i * COL;

/** Schematic heights (map units above ground) — order matters more than scale. */
const LADDER_H = [16, 34, 70, 112, 164];
const SCALE_LINES = [
  { h: 34, label: 'חצי מטר' },
  { h: 70, label: '2 מטרים' },
  { h: 142, label: '5–6 מטרים' },
];

type Lobe = [number, number, number];

function Lobes({ lobes, fill, hi, shade = true }: { lobes: Lobe[]; fill: string; hi: string; shade?: boolean }) {
  return (
    <>
      {shade && (
        <g fill="#3E3018" opacity={0.12}>
          {lobes.map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x + 2.2} cy={y + 1.4} r={r} />
          ))}
        </g>
      )}
      <g fill={fill}>
        {lobes.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
        ))}
      </g>
      <g fill={hi} opacity={0.9}>
        {lobes.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x - r * 0.3} cy={y - r * 0.32} r={r * 0.52} />
        ))}
      </g>
    </>
  );
}

/** A tuft of grass blades fanning up from the ground line. */
function tuftPath(x: number, h: number) {
  const blades = [
    [-4.5, 0.62, -3.2], [-2.2, 0.9, -1.4], [0, 1, 0.4], [2.2, 0.82, 1.8], [4.3, 0.58, 3.4],
  ];
  return blades
    .map(([dx, k, lean]) => {
      const bx = x + dx * 0.6;
      const tx = x + dx + lean;
      const ty = GROUND - h * k;
      return `M${bx - 1},${GROUND + 1} Q${bx + lean * 0.3},${GROUND - h * k * 0.5} ${tx},${ty} Q${bx + lean * 0.3 + 1},${GROUND - h * k * 0.5} ${bx + 1},${GROUND + 1} Z`;
    })
    .join(' ');
}

function Herbaceous({ x }: { x: number }) {
  const tufts: [number, number][] = [[-34, 11], [-22, 15], [-9, 12], [3, 16], [15, 13], [27, 15], [38, 10]];
  return (
    <>
      <path d={tufts.filter((_, i) => i % 2 === 0).map(([dx, h]) => tuftPath(x + dx, h)).join(' ')} fill="#6E7A4E" />
      <path d={tufts.filter((_, i) => i % 2 === 1).map(([dx, h]) => tuftPath(x + dx, h)).join(' ')} fill="#8A9163" />
    </>
  );
}

function Batha({ x }: { x: number }) {
  const g = GROUND;
  return (
    <>
      <path d={[tuftPath(x - 38, 10), tuftPath(x + 4, 12), tuftPath(x + 40, 9)].join(' ')} fill="#8A9163" />
      <Lobes
        lobes={[
          [x - 22, g - 10, 11], [x - 13, g - 15, 10], [x - 4, g - 9, 8],
          [x + 18, g - 11, 12], [x + 27, g - 20, 13], [x + 36, g - 9, 8],
        ]}
        fill="#7E8A55"
        hi="#98A26A"
      />
    </>
  );
}

function Garrigue({ x }: { x: number }) {
  const g = GROUND;
  return (
    <>
      <path d={[tuftPath(x - 40, 9), tuftPath(x + 40, 10)].join(' ')} fill="#8A9163" />
      <Lobes
        lobes={[
          [x - 16, g - 16, 17], [x - 26, g - 30, 14], [x - 10, g - 44, 18], [x - 18, g - 56, 12],
          [x + 14, g - 12, 14], [x + 22, g - 28, 15], [x + 12, g - 36, 13],
        ]}
        fill="#55613C"
        hi="#6E7A4E"
      />
    </>
  );
}

function Tree({ x, top, lobes }: { x: number; top: number; lobes: Lobe[] }) {
  const g = GROUND;
  const trunkTop = top + (g - top) * 0.55;
  return (
    <>
      <path d={`M${x - 2.6},${g} L${x - 1.3},${trunkTop} L${x + 1.3},${trunkTop} L${x + 2.6},${g} Z`} fill="#8A6F4D" />
      <path d={`M${x},${trunkTop + 12} L${x + 8},${trunkTop - 2}`} stroke="#8A6F4D" strokeWidth={1.6} strokeLinecap="round" />
      <Lobes lobes={lobes} fill="#5A6A3F" hi="#7A8A55" />
    </>
  );
}

function Grove({ x }: { x: number }) {
  const g = GROUND;
  return (
    <>
      <Tree
        x={x - 14}
        top={g - 112}
        lobes={[
          [x - 28, g - 70, 15], [x - 2, g - 72, 16], [x - 20, g - 88, 17], [x - 6, g - 93, 18], [x - 16, g - 76, 14],
        ]}
      />
      <Tree
        x={x + 26}
        top={g - 86}
        lobes={[[x + 16, g - 58, 12], [x + 34, g - 60, 12], [x + 25, g - 72, 14]]}
      />
      <Lobes lobes={[[x + 2, g - 12, 12], [x + 10, g - 20, 11], [x - 36, g - 9, 9]]} fill="#55613C" hi="#6E7A4E" />
    </>
  );
}

function Pine({ x }: { x: number }) {
  const g = GROUND;
  const tiers = [
    { base: g - 28, h: 50, w: 15 },
    { base: g - 58, h: 50, w: 13.5 },
    { base: g - 90, h: 48, w: 11.5 },
    { base: g - 120, h: 44, w: 9 },
  ];
  return (
    <>
      <rect x={x - 1.8} y={g - 34} width={3.6} height={34} fill="#7A6146" />
      {tiers.map((t) => (
        <g key={t.base}>
          <path d={`M${x - t.w},${t.base} L${x},${t.base - t.h} L${x + t.w},${t.base} Z`} fill="#4A5A36" />
          <path d={`M${x},${t.base - t.h} L${x + t.w},${t.base} L${x},${t.base} Z`} fill="#39472A" />
        </g>
      ))}
    </>
  );
}

function PlantedForest({ x }: { x: number }) {
  return (
    <>
      <Pine x={x - 28} />
      <Pine x={x} />
      <Pine x={x + 28} />
    </>
  );
}

const FORMATIONS = [Herbaceous, Batha, Garrigue, Grove, PlantedForest];

type LadderItem = { label: string; height: string; planted?: boolean };

export function VegetationLadderV1({ items, legend }: { items: LadderItem[]; legend: string }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);

  const grow: Variants = {
    hidden: { scaleY: 0.02, opacity: 0 },
    show: (i: number) => ({
      scaleY: 1,
      opacity: 1,
      transition: { delay: 0.1 + i * 0.12, duration: 0.6, ease: EASE },
    }),
  };

  return (
    <>
      <motion.svg
        viewBox={`0 0 ${VB_W} 206`}
        className="w-full h-auto block"
        aria-hidden
        initial={reduce ? false : 'hidden'}
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
      >
        {/* height scale — the thresholds that define the formations */}
        {SCALE_LINES.map((s) => (
          <g key={s.h}>
            <line x1={0} y1={GROUND - s.h} x2={VB_W} y2={GROUND - s.h} stroke="#C9A56B" strokeOpacity={0.55} strokeWidth={0.9} strokeDasharray="3 4" />
            <text
              x={cx(0) + 18}
              y={GROUND - s.h - 5}
              textAnchor="middle"
              direction="rtl"
              fontSize={10.5}
              fontWeight={600}
              fill="#8A8873"
            >
              {s.label}
            </text>
          </g>
        ))}

        {items.map((v, i) => {
          const Art = FORMATIONS[i];
          const x = cx(i);
          const dimmed = hover !== null && hover !== i;
          return (
            <g
              key={v.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="transition-opacity duration-300 ease-snap motion-reduce:transition-none"
              style={{ opacity: dimmed ? 0.4 : 1 }}
            >
              <rect x={x - COL / 2} y={0} width={COL} height={GROUND} fill="transparent" />
              {v.planted && (
                <rect
                  x={x - 47}
                  y={GROUND - LADDER_H[i] - 10}
                  width={94}
                  height={LADDER_H[i] + 14}
                  rx={10}
                  fill="#749C75"
                  fillOpacity={0.1}
                  stroke="#5B7C5C"
                  strokeWidth={1.6}
                  strokeDasharray="6 4"
                />
              )}
              <motion.g custom={i} variants={grow} style={{ originX: 0.5, originY: 1, transformBox: 'fill-box' }}>
                <Art x={x} />
              </motion.g>
            </g>
          );
        })}

        {/* shared ground — a papercut strip */}
        <rect x={0} y={GROUND} width={VB_W} height={9} fill="#DCCFAE" />
        <rect x={0} y={GROUND + 9} width={VB_W} height={13} fill="#EDE4D0" />
        <line x1={0} y1={GROUND} x2={VB_W} y2={GROUND} stroke="#C9B892" strokeWidth={1.6} />
      </motion.svg>

      <ul className="grid grid-cols-5 mt-2">
        {items.map((v, i) => (
          <li
            key={v.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={cn(
              'min-w-0 text-center rounded-xl px-1 py-1.5 transition-colors duration-200',
              hover === i && 'bg-bg-accent',
            )}
          >
            <div className="font-display font-bold text-sm text-fg">{v.label}</div>
            <div className="text-[13px] text-fg-muted leading-snug mt-0.5">{v.height}</div>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-2 text-sm text-fg-muted leading-snug mt-3">
        <span aria-hidden className="inline-block w-5 h-3.5 rounded-md border-[1.5px] border-dashed border-brand-dark bg-brand/10 shrink-0" />
        {legend}
      </p>
    </>
  );
}
