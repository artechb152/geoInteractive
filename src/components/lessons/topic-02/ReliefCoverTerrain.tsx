'use client';

import { useId } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RELIEF_COVER_RENDERS } from './reliefCoverRenders.data';

/**
 * ReliefCoverTerrain — איור חתך-צד ריאליסטי לתת-הנושא „תבליט ותכסית”.
 * האיור הוא רינדור Blender בשפת חתכי המדרון של השיעור (scripts/blender/render_relief_cover.py):
 * כל שכבה היא תמונה שקופה נפרדת מאותה מצלמה, נעולה על ה-viewBox (640 × 390),
 * כך שקצה החתך הקדמי הוא בדיוק groundY(x) והסמנים, ההדגשות והתוויות מעליו נשארים במקומם.
 * שכבת התבליט = הרכס הרחוק + גוש הקרקע החשוף; שכבת התכסית = תמונה לכל רכיב
 * (חורש, שיחים, בתים, מטע, כביש וקו מתח), והצל שכל רכיב מטיל על הקרקע בתמונה משלו.
 * כיבוי תכסית ← העצמים מתרוממים ונעלמים וחושפים את הקרקע; כיבוי תבליט ← גוש
 * הקרקע שוקע ונשאר רק קו רפאים מקווקו.
 * האיור לעולם לא משוקף ב-RTL: הקואורדינטות מוחלטות, וכל <text> מגדיר textAnchor.
 * הגרסה הקודמת (papercut) שמורה ב-ReliefCoverTerrainV1.tsx.
 */

type Layer = 'relief' | 'cover';
type RenderId = keyof typeof RELIEF_COVER_RENDERS;

const W = 640;
const H = 390;
const BASE = 306;
const EASE = [0.22, 1, 0.36, 1] as const;
const ASSET_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/relief-cover`;

/* Backdrop — the paper sky the slab stands against (design-spec §3 "Illustration palette") */
const SKY = ['#FDFBF3', '#F6EFE6'] as const;

/* ── Terrain profile: a sum of smooth bumps. The render's cut edge is exactly
      groundY(x) (render_relief_cover.py keeps the same profile). ── */
const bump = (x: number, c: number, a: number, s: number) => a * Math.exp(-((x - c) ** 2) / (2 * s * s));
const heightAt = (x: number) => bump(x, 178, 96, 44) + bump(x, 318, 150, 46) + bump(x, 470, 60, 32);
const groundY = (x: number) => BASE - heightAt(x);

const pts = (f: (x: number) => number, x0: number, x1: number, step = 2) => {
  const out: string[] = [];
  for (let x = x0; x < x1; x += step) out.push(`${x.toFixed(1)},${f(x).toFixed(1)}`);
  out.push(`${x1.toFixed(1)},${f(x1).toFixed(1)}`);
  return out;
};
const pathAlong = (f: (x: number) => number, x0 = 0, x1 = W, step = 2) => `M${pts(f, x0, x1, step).join(' L')}`;

const GROUND_LINE = pathAlong(groundY);

/* ── Relief features: pin on the surface + the stretch of surface that the
      term describes (highlighted when selected). ── */
const RELIEF: Record<string, { x: number; seg: [number, number] }> = {
  hill:   { x: 318, seg: [282, 354] },
  saddle: { x: 236, seg: [212, 260] },
  slope:  { x: 372, seg: [336, 402] },
  valley: { x: 414, seg: [394, 436] },
  plain:  { x: 598, seg: [548, W] },
};
const RELIEF_SEG = Object.fromEntries(
  Object.entries(RELIEF).map(([id, r]) => [id, pathAlong(groundY, r.seg[0], r.seg[1])]),
) as Record<string, string>;

/* ── Land-cover objects: where the rendered objects stand (same layout as the
      render script) — used for the hit areas and the callout anchors. ── */
const GROVE = [
  { x: 131, t: 12, r: 12, back: true },
  { x: 170, t: 15, r: 14, back: true },
  { x: 207, t: 12, r: 12, back: true },
  { x: 114, t: 6, r: 10, back: false },
  { x: 145, t: 8, r: 14, back: false },
  { x: 188, t: 8, r: 15.5, back: false },
  { x: 224, t: 5, r: 9.5, back: false },
];
const HOUSES = [
  { x: 20, w: 24, h: 17, flat: false },
  { x: 49, w: 22, h: 27, flat: true },
  { x: 79, w: 25, h: 16, flat: false },
];
const ORCHARD = [438, 459, 480, 501];
const ORCHARD_R = 9;
const ORCHARD_T = 7;
const PYLONS = [546, 606];
const PYLON_H = 62;
const ROAD_X0 = 506;
const CAR_X = 576;

/** Hit box of each house: walls plus roof (pitched roofs overhang 2.5 and rise 10). */
const HOUSE_HIT = HOUSES.map((h) => {
  const l = h.x - h.w / 2;
  const gy = Math.max(groundY(l), groundY(l + h.w)) + 1;
  const roof = h.flat ? 4 : 10;
  return { x: l - 2.5, y: gy - h.h - roof, w: h.w + 5, h: h.h + roof };
});

/** Where each item's callout sits (pill centre) and what it points at. */
const groveTop = Math.min(...GROVE.map((t) => groundY(t.x) - (t.back ? 3 : 0) - t.t - 2 * t.r));
const orchardTop = Math.min(...ORCHARD.map((x) => groundY(x) - ORCHARD_T - 2 * ORCHARD_R));
const pylonTop = Math.min(...PYLONS.map((x) => groundY(x) - PYLON_H));
const CALLOUT: Record<string, { x: number; y: number; ax: number; ay: number }> = {
  grove:   { x: 170, y: groveTop - 20, ax: 170, ay: groveTop },
  shrubs:  { x: 246, y: 144, ax: 268, ay: groundY(268) - 12 },
  houses:  { x: 47, y: groundY(47) - 25 - 24, ax: 47, ay: groundY(47) - 27 },
  orchard: { x: 470, y: orchardTop - 22, ax: 470, ay: orchardTop - 2 },
  road:    { x: CAR_X, y: groundY(CAR_X) - 34, ax: CAR_X, ay: groundY(CAR_X) - 14 },
  power:   { x: 576, y: pylonTop - 22, ax: 576, ay: pylonTop + 10 },
};

const COVER_ORDER = ['grove', 'shrubs', 'houses', 'orchard', 'power', 'road'] as const;

/** One rendered layer, placed in viewBox units. Never a hit target — the
    transparent hit areas beside it decide what the pointer selects. */
function Render({ id, opacity }: { id: RenderId; opacity?: number }) {
  const r = RELIEF_COVER_RENDERS[id];
  return (
    <image
      href={`${ASSET_BASE}/${r.file}`}
      x={r.x}
      y={r.y}
      width={r.w}
      height={r.h}
      preserveAspectRatio="none"
      opacity={opacity}
      pointerEvents="none"
    />
  );
}

export function ReliefCoverTerrain({
  showRelief,
  showCover,
  selectedId,
  hoverId,
  labels,
  onSelect,
  onHover,
}: {
  showRelief: boolean;
  showCover: boolean;
  selectedId: string | null;
  hoverId: string | null;
  /** feature id → display label (single source of copy lives in the scene). */
  labels: Record<string, string>;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ids = {
    sky: `rc-sky-${uid}`,
    sel: `rc-sel-${uid}`,
    hov: `rc-hov-${uid}`,
  };

  const layerOf = (id: string): Layer => (id in RELIEF ? 'relief' : 'cover');
  const isVisible = (id: string | null) =>
    !!id && (layerOf(id) === 'relief' ? showRelief : showCover);
  const sel = isVisible(selectedId) ? selectedId : null;
  const hov = isVisible(hoverId) ? hoverId : null;

  const coverState = (id: string) => {
    if (sel === id) return 'active';
    if (hov === id) return 'hover';
    if (sel) return 'dim';
    return 'idle';
  };

  const itemVariants: Variants = {
    on: { opacity: 1, y: 0 },
    off: { opacity: 0, y: reduce ? 0 : -30 },
  };
  const itemTransition = { duration: reduce ? 0.2 : 0.5, ease: EASE };
  const layerVariants: Variants = {
    on: { transition: { staggerChildren: reduce ? 0 : 0.05 } },
    off: { transition: { staggerChildren: reduce ? 0 : 0.04, staggerDirection: -1 } },
  };

  const tag =
    showRelief && !showCover ? { key: 'bare', text: 'הקרקע החשופה', tone: 'relief' as const }
    : !showRelief && showCover ? { key: 'cover', text: 'שכבת תכסית', tone: 'cover' as const }
    : null;

  const selectedRelief = sel && layerOf(sel) === 'relief' ? sel : null;
  const hoveredRelief = hov && layerOf(hov) === 'relief' && hov !== sel ? hov : null;
  const calloutFor = (id: string | null, active: boolean) =>
    id && CALLOUT[id] ? { id, active, ...CALLOUT[id], label: labels[id] ?? '' } : null;
  const callouts = [calloutFor(hov !== sel ? hov : null, false), calloutFor(sel, true)].filter(
    (c): c is NonNullable<typeof c> => c !== null,
  );

  const coverItem = (id: (typeof COVER_ORDER)[number], children: React.ReactNode) => {
    const state = coverState(id);
    return (
      <motion.g key={id} variants={itemVariants} transition={itemTransition}>
        <g
          onClick={(e) => {
            e.stopPropagation();
            onSelect(id);
          }}
          onMouseEnter={() => onHover(id)}
          onMouseLeave={() => onHover(null)}
          className="cursor-pointer"
          filter={state === 'active' ? `url(#${ids.sel})` : state === 'hover' ? `url(#${ids.hov})` : undefined}
          style={{ opacity: state === 'dim' ? 0.28 : 1, transition: 'opacity 250ms cubic-bezier(0.22,1,0.36,1)' }}
        >
          <Render id={id} />
          {children}
        </g>
      </motion.g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full h-auto select-none"
      role="img"
      aria-label="חתך צד של שטח: שכבת תבליט (כיפות, אוכף, מדרון, גיא ומישור) ושכבת תכסית (חורש, שיחים, בתים, מטע, כביש וקו מתח)"
      onClick={() => onSelect(null)}
    >
      <defs>
        <linearGradient id={ids.sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SKY[0]} />
          <stop offset="1" stopColor={SKY[1]} />
        </linearGradient>
        {/* selection: orange cut-out outline around the object's silhouette */}
        <filter id={ids.sel} x="-30%" y="-30%" width="160%" height="160%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="1.9" result="d" />
          <feFlood floodColor="#D97E2B" result="c" />
          <feComposite in="c" in2="d" operator="in" result="o" />
          <feGaussianBlur in="o" stdDeviation="0.6" result="ob" />
          <feMerge>
            <feMergeNode in="ob" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* hover: quieter white edge + lift */}
        <filter id={ids.hov} x="-30%" y="-30%" width="160%" height="160%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="d" />
          <feFlood floodColor="#FFFFFF" result="c" />
          <feComposite in="c" in2="d" operator="in" result="o" />
          <feDropShadow in="o" dx="0" dy="1.6" stdDeviation="1.4" floodColor="#38432E" floodOpacity="0.35" result="os" />
          <feMerge>
            <feMergeNode in="os" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Backdrop (click = clear selection) */}
      <rect x={0} y={0} width={W} height={H} fill={`url(#${ids.sky})`} />

      {/* ── Relief layer: hazy far ridge + the bare cut slab ── */}
      <motion.g
        initial={false}
        animate={showRelief ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 18 }}
        transition={{ duration: reduce ? 0.2 : 0.5, ease: EASE }}
        style={{ pointerEvents: showRelief ? 'auto' : 'none' }}
      >
        <Render id="far" opacity={0.55} />
        <Render id="relief" />
      </motion.g>

      {/* Ghost of the ground line when the relief layer is off */}
      <motion.path
        d={GROUND_LINE}
        fill="none"
        strokeWidth={1.4}
        strokeDasharray="5 5"
        className="stroke-fg-dim"
        initial={false}
        animate={{ opacity: showRelief ? 0 : 0.8 }}
        transition={{ duration: 0.35, ease: EASE }}
        pointerEvents="none"
      />

      {/* Cast shadows — only when objects actually stand on the ground; each one dims with its object */}
      <motion.g
        initial={false}
        animate={{ opacity: showRelief && showCover ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        pointerEvents="none"
      >
        {COVER_ORDER.map((id) => (
          <g
            key={id}
            style={{ opacity: coverState(id) === 'dim' ? 0.28 : 1, transition: 'opacity 250ms cubic-bezier(0.22,1,0.36,1)' }}
          >
            <Render id={`shadow-${id}` as const} />
          </g>
        ))}
      </motion.g>

      {/* ── Land-cover layer: lifts up and fades away when switched off ── */}
      <motion.g
        initial={false}
        animate={showCover ? 'on' : 'off'}
        variants={layerVariants}
        style={{ pointerEvents: showCover ? 'auto' : 'none' }}
      >
        {COVER_ORDER.map((id) => {
          switch (id) {
            case 'grove':
              return coverItem(
                id,
                <rect x={102} y={groveTop - 2} width={134} height={groundY(170) - groveTop + 6} fill="transparent" />,
              );
            case 'shrubs':
              return coverItem(
                id,
                <>
                  {[
                    [244, groundY(289) - 14, 56, 50],
                    [334, groundY(345) - 14, 38, 42],
                  ].map(([x, y, w, h]) => (
                    <rect key={x} x={x} y={y} width={w} height={h} fill="transparent" />
                  ))}
                </>,
              );
            case 'houses':
              return coverItem(
                id,
                <>
                  {HOUSE_HIT.map((b) => (
                    <rect key={b.x} x={b.x} y={b.y} width={b.w} height={b.h} fill="transparent" />
                  ))}
                </>,
              );
            case 'orchard':
              return coverItem(
                id,
                <rect x={426} y={orchardTop - 2} width={88} height={groundY(470) - orchardTop + 6} fill="transparent" />,
              );
            case 'power':
              return coverItem(
                id,
                <rect x={528} y={pylonTop - 6} width={W - 528} height={PYLON_H - 8} fill="transparent" />,
              );
            case 'road':
              return coverItem(
                id,
                <rect x={ROAD_X0} y={groundY(CAR_X) - 16} width={W - ROAD_X0} height={20} fill="transparent" />,
              );
          }
        })}
      </motion.g>

      {/* ── Selected / hovered stretch of relief ── */}
      <g pointerEvents="none">
        {hoveredRelief && (
          <path d={RELIEF_SEG[hoveredRelief]} fill="none" strokeWidth={5} strokeLinecap="round" className="stroke-fg/35" />
        )}
        {selectedRelief && (
          <g key={selectedRelief}>
            <motion.path
              d={RELIEF_SEG[selectedRelief]}
              fill="none"
              strokeWidth={13}
              strokeLinecap="round"
              className="stroke-accent/25"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, ease: EASE }}
            />
            <motion.path
              d={RELIEF_SEG[selectedRelief]}
              fill="none"
              strokeWidth={4.5}
              strokeLinecap="round"
              className="stroke-accent"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, ease: EASE }}
            />
          </g>
        )}
      </g>

      {/* ── Relief pins (labels set into the ground body) ── */}
      <motion.g
        initial={false}
        animate={{ opacity: showRelief ? 1 : 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        style={{ pointerEvents: showRelief ? 'auto' : 'none' }}
      >
        {Object.entries(RELIEF).map(([id, r]) => (
          <ReliefPin
            key={id}
            x={r.x}
            label={labels[id] ?? ''}
            state={sel === id ? 'active' : hov === id ? 'hover' : sel ? 'dim' : 'idle'}
            onClick={() => onSelect(id)}
            onEnter={() => onHover(id)}
            onLeave={() => onHover(null)}
          />
        ))}
      </motion.g>

      {/* ── Callouts for land-cover items ── */}
      <AnimatePresence>
        {callouts.map((c) => (
          <motion.g
            key={`${c.id}-${c.active ? 'a' : 'h'}`}
            initial={{ opacity: 0, y: reduce ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            pointerEvents="none"
          >
            <Callout {...c} />
          </motion.g>
        ))}
      </AnimatePresence>

      {/* ── What's left on stage when one layer is off ── */}
      <AnimatePresence>
        {tag && (
          <motion.g
            key={tag.key}
            initial={{ opacity: 0, y: reduce ? 0 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: reduce ? 0 : 0.25 }}
            pointerEvents="none"
          >
            <StageTag text={tag.text} tone={tag.tone} />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

/* ────────────────────────── pieces ────────────────────────── */

function ReliefPin({
  x,
  label,
  state,
  onClick,
  onEnter,
  onLeave,
}: {
  x: number;
  label: string;
  state: 'idle' | 'hover' | 'active' | 'dim';
  onClick: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const gy = groundY(x);
  const py = gy + 31;
  const w = label.length * 7.4 + 20;
  const active = state === 'active';
  const hover = state === 'hover';
  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="cursor-pointer"
      style={{ opacity: state === 'dim' ? 0.45 : 1, transition: 'opacity 250ms cubic-bezier(0.22,1,0.36,1)' }}
    >
      <rect x={x - w / 2 - 4} y={gy - 10} width={w + 8} height={py - gy + 22} fill="transparent" />
      <line
        x1={x}
        y1={gy + 4}
        x2={x}
        y2={py - 11}
        strokeWidth={1.2}
        strokeDasharray="2 2"
        className={active ? 'stroke-accent' : 'stroke-fg/45'}
      />
      <circle
        cx={x}
        cy={gy}
        r={active ? 4.6 : hover ? 4.2 : 3.5}
        strokeWidth={1.6}
        className={active ? 'fill-accent stroke-white' : 'fill-paper-bright stroke-terrain-ridge'}
      />
      <rect
        x={x - w / 2}
        y={py - 11}
        width={w}
        height={22}
        rx={11}
        strokeWidth={1.2}
        className={cn(
          'transition-colors',
          active ? 'fill-accent stroke-accent' : hover ? 'fill-white stroke-fg' : 'fill-paper-bright stroke-tanline-contour/60',
        )}
      />
      <text
        x={x}
        y={py + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12.5}
        fontWeight={700}
        className={cn('font-display', active ? 'fill-white' : 'fill-fg')}
      >
        {label}
      </text>
    </g>
  );
}

function Callout({
  x,
  y,
  ax,
  ay,
  label,
  active,
}: {
  x: number;
  y: number;
  ax: number;
  ay: number;
  label: string;
  active: boolean;
}) {
  const w = label.length * 7.4 + 22;
  const cx = Math.min(W - w / 2 - 4, Math.max(w / 2 + 4, x));
  const fill = active ? 'fill-accent' : 'fill-fg';
  return (
    <g>
      <line x1={ax} y1={ay} x2={cx} y2={y + 11} strokeWidth={1.3} className={active ? 'stroke-accent' : 'stroke-fg'} />
      <circle cx={ax} cy={ay} r={2.6} className={fill} />
      <rect x={cx - w / 2} y={y - 11} width={w} height={22} rx={11} className={fill} />
      <text
        x={cx}
        y={y + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12.5}
        fontWeight={700}
        className="font-display fill-white"
      >
        {label}
      </text>
    </g>
  );
}

function StageTag({ text, tone }: { text: string; tone: Layer }) {
  const w = text.length * 7.6 + 30;
  return (
    <g>
      <rect
        x={W / 2 - w / 2}
        y={16}
        width={w}
        height={26}
        rx={13}
        strokeWidth={1.2}
        className={tone === 'relief' ? 'fill-white stroke-terrain-sand' : 'fill-white stroke-brand'}
      />
      <circle cx={W / 2 + w / 2 - 13} cy={29} r={3.5} className={tone === 'relief' ? 'fill-terrain-sand' : 'fill-brand'} />
      <text
        x={W / 2 - 4}
        y={29.5}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fontWeight={700}
        className={cn('font-display', tone === 'relief' ? 'fill-tanline-badge' : 'fill-brand-dark')}
      >
        {text}
      </text>
    </g>
  );
}
