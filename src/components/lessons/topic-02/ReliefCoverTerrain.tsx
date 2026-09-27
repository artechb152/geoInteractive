'use client';

import { useId } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * ReliefCoverTerrain — איור חתך-צד בסגנון papercut לתת-הנושא „תבליט ותכסית”.
 * שכבת התבליט = גוף קרקע מלא עם שכבות אדמה; שכבת התכסית = חורש, שיחים, בתים,
 * מטע, כביש וקו מתח שיושבים בדיוק על קו הקרקע (groundY).
 * כיבוי תכסית ← העצמים מתרוממים ונעלמים וחושפים את הקרקע; כיבוי תבליט ← גוף
 * הקרקע שוקע ונשאר רק קו רפאים מקווקו.
 * האיור לעולם לא משוקף ב-RTL: הקואורדינטות מוחלטות, וכל <text> מגדיר textAnchor.
 */

type Layer = 'relief' | 'cover';

const W = 640;
const H = 390;
const BASE = 306;
const EASE = [0.22, 1, 0.36, 1] as const;

/* Illustration palette (design-spec §3 "Illustration palette") */
const C = {
  sky0: '#FDFBF3',
  sky1: '#F6EFE6',
  farRidge: '#E8DCC4',
  soil0: '#DCCDB2',
  soil1: '#C9B892',
  soil2: '#C2A26B',
  soil3: '#8A6F4D',
  edge: '#E8DCC4',
  ridge: '#5A6B4A',
  green900: '#55613C',
  green700: '#6E7A4E',
  green500: '#8A9163',
  orchard: '#749C75',
  orchardShade: '#5B7C5C',
  trunk: '#8A6F4D',
  wall: '#FDFBF3',
  wallShade: '#E8DCC4',
  roof: '#8A6F4D',
  asphalt: '#4A5240',
  steel: '#4A5663',
  car: '#7FB4C6',
  ink: '#38432E',
} as const;

/* ── Terrain profile: a sum of smooth bumps so every object can be seated
      exactly on the ground line via groundY(x). ── */
const bump = (x: number, c: number, a: number, s: number) => a * Math.exp(-((x - c) ** 2) / (2 * s * s));
const heightAt = (x: number) => bump(x, 178, 96, 44) + bump(x, 318, 150, 46) + bump(x, 470, 60, 32);
const groundY = (x: number) => BASE - heightAt(x);
const slopeDeg = (x: number) => (Math.atan2(groundY(x + 1) - groundY(x - 1), 2) * 180) / Math.PI;
const farRidgeY = (x: number) =>
  288 - (bump(x, 30, 34, 70) + bump(x, 250, 36, 60) + bump(x, 430, 50, 70) + bump(x, 640, 30, 60));

const pts = (f: (x: number) => number, x0: number, x1: number, step = 2) => {
  const out: string[] = [];
  for (let x = x0; x < x1; x += step) out.push(`${x.toFixed(1)},${f(x).toFixed(1)}`);
  out.push(`${x1.toFixed(1)},${f(x1).toFixed(1)}`);
  return out;
};
const pathAlong = (f: (x: number) => number, x0 = 0, x1 = W, step = 2) => `M${pts(f, x0, x1, step).join(' L')}`;
const fillBelow = (f: (x: number) => number) => `${pathAlong(f)} L${W},${H + 2} L0,${H + 2} Z`;

const GROUND_LINE = pathAlong(groundY);
const GROUND_FILL = fillBelow(groundY);
const FAR_RIDGE = fillBelow(farRidgeY);

/** Soil strata: deeper bands follow the surface more loosely (flatter). */
const STRATA = [
  { d: 12, f: 0.84, fill: C.soil1, o: 1 },
  { d: 30, f: 0.56, fill: C.soil2, o: 0.8 },
  { d: 50, f: 0.28, fill: C.soil3, o: 0.45 },
].map((s) => ({ ...s, path: fillBelow((x) => BASE + s.d - heightAt(x) * s.f) }));

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

/* ── Land-cover objects ── */
/** Natural grove: irregular sizes and spacing, overlapping crowns, a paler back row. */
const GROVE = [
  { x: 131, t: 12, r: 12, back: true },
  { x: 170, t: 15, r: 14, back: true },
  { x: 207, t: 12, r: 12, back: true },
  { x: 114, t: 6, r: 10, back: false },
  { x: 145, t: 8, r: 14, back: false },
  { x: 188, t: 8, r: 15.5, back: false },
  { x: 224, t: 5, r: 9.5, back: false },
];
const SHRUBS = [
  { x: 256, rx: 9, ry: 7 },
  { x: 272, rx: 7, ry: 5.5 },
  { x: 289, rx: 9.5, ry: 7.5 },
  { x: 345, rx: 9, ry: 7 },
  { x: 360, rx: 7, ry: 5.5 },
];
const HOUSES = [
  { x: 20, w: 24, h: 17, flat: false },
  { x: 49, w: 22, h: 27, flat: true },
  { x: 79, w: 25, h: 16, flat: false },
];
/** Planted orchard: identical trees in a straight row at fixed spacing. */
const ORCHARD = [438, 459, 480, 501];
const ORCHARD_R = 9;
const ORCHARD_T = 7;
const PYLONS = [546, 606];
const PYLON_H = 62;
const ROAD_X0 = 506;
const CAR_X = 576;

const ROAD_SLAB = (() => {
  const top = pts((x) => groundY(x) - 3.4, ROAD_X0, W);
  const bottom = pts((x) => groundY(x) + 1.4, ROAD_X0, W).reverse();
  return `M${top.join(' L')} L${bottom.join(' L')} Z`;
})();
const ROAD_DASH = pathAlong((x) => groundY(x) - 1, ROAD_X0 + 3, W);

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
    paper: `rc-paper-${uid}`,
    strata: `rc-strata-${uid}`,
    obj: `rc-obj-${uid}`,
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

  const coverItem = (id: string, children: React.ReactNode) => {
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
          filter={state === 'active' ? `url(#${ids.sel})` : state === 'hover' ? `url(#${ids.hov})` : `url(#${ids.obj})`}
          style={{ opacity: state === 'dim' ? 0.28 : 1, transition: 'opacity 250ms cubic-bezier(0.22,1,0.36,1)' }}
        >
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
          <stop offset="0" stopColor={C.sky0} />
          <stop offset="1" stopColor={C.sky1} />
        </linearGradient>
        {/* paper sheet lifted off the backdrop */}
        <filter id={ids.paper} x="-5%" y="-15%" width="110%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.6" floodColor="#5A4628" floodOpacity="0.2" />
        </filter>
        {/* each lower paper stratum casts a thin shadow up onto the one above */}
        <filter id={ids.strata} x="-5%" y="-15%" width="110%" height="130%">
          <feDropShadow dx="0" dy="-1.2" stdDeviation="1.1" floodColor="#5A4628" floodOpacity="0.22" />
        </filter>
        <filter id={ids.obj} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0.6" dy="1.4" stdDeviation="0.9" floodColor="#38432E" floodOpacity="0.22" />
        </filter>
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
        {/* hover: quieter white paper edge + lift */}
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

      {/* ── Relief layer: far ridge + solid ground body with soil strata ── */}
      <motion.g
        initial={false}
        animate={showRelief ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 18 }}
        transition={{ duration: reduce ? 0.2 : 0.5, ease: EASE }}
        style={{ pointerEvents: showRelief ? 'auto' : 'none' }}
      >
        <path d={FAR_RIDGE} fill={C.farRidge} fillOpacity={0.6} />
        <g filter={`url(#${ids.paper})`}>
          <path d={GROUND_FILL} fill={C.soil0} />
          {STRATA.map((s) => (
            <path key={s.d} d={s.path} fill={s.fill} fillOpacity={s.o} filter={`url(#${ids.strata})`} />
          ))}
          {/* papercut light edge just under the surface */}
          <path d={GROUND_LINE} transform="translate(0 2.4)" fill="none" stroke={C.edge} strokeWidth={1.4} />
          <path d={GROUND_LINE} fill="none" stroke={C.ridge} strokeWidth={2.2} strokeLinejoin="round" />
        </g>
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

      {/* Contact shadows — only when objects actually stand on the ground */}
      <motion.g
        initial={false}
        animate={{ opacity: showRelief && showCover ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        pointerEvents="none"
      >
        {GROVE.filter((t) => !t.back).map((t) => (
          <ellipse key={t.x} cx={t.x + 2} cy={groundY(t.x) + 0.8} rx={t.r * 0.9} ry={1.8} fill={C.ink} fillOpacity={0.14} />
        ))}
        {ORCHARD.map((x) => (
          <ellipse key={x} cx={x + 2} cy={groundY(x) + 0.8} rx={ORCHARD_R * 0.9} ry={1.6} fill={C.ink} fillOpacity={0.14} />
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
                <>
                  {GROVE.map((t) => (
                    <Tree key={t.x} x={t.x} trunk={t.t} r={t.r} tone={t.back ? "back" : "natural"} />
                  ))}
                  <rect x={102} y={groveTop - 2} width={134} height={groundY(170) - groveTop + 6} fill="transparent" />
                </>,
              );
            case 'shrubs':
              return coverItem(
                id,
                <>
                  {SHRUBS.map((s) => (
                    <Shrub key={s.x} {...s} />
                  ))}
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
                  {HOUSES.map((h) => (
                    <House key={h.x} {...h} />
                  ))}
                </>,
              );
            case 'orchard':
              return coverItem(
                id,
                <>
                  {ORCHARD.map((x) => (
                    <Tree key={x} x={x} trunk={ORCHARD_T} r={ORCHARD_R} tone="planted" />
                  ))}
                  <rect x={426} y={orchardTop - 2} width={88} height={groundY(470) - orchardTop + 6} fill="transparent" />
                </>,
              );
            case 'power':
              return coverItem(
                id,
                <>
                  <Wires />
                  {PYLONS.map((x) => (
                    <Pylon key={x} x={x} />
                  ))}
                  <rect x={528} y={pylonTop - 6} width={W - 528} height={PYLON_H - 8} fill="transparent" />
                </>,
              );
            case 'road':
              return coverItem(
                id,
                <>
                  <path d={ROAD_SLAB} fill={C.asphalt} />
                  <path d={ROAD_DASH} fill="none" stroke={C.wall} strokeWidth={1} strokeDasharray="6 5" />
                  <Car x={CAR_X} />
                  <rect x={ROAD_X0} y={groundY(CAR_X) - 16} width={W - ROAD_X0} height={20} fill="transparent" />
                </>,
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

/**
 * natural = lumpy, irregular crown (grove); back = paler tree behind the grove;
 * planted = one neat round crown (orchard) — the visual difference IS the lesson.
 */
function Tree({
  x,
  trunk,
  r,
  tone,
}: {
  x: number;
  trunk: number;
  r: number;
  tone: 'natural' | 'back' | 'planted';
}) {
  const gy = groundY(x) - (tone === 'back' ? 3 : 0);
  const cy = gy - trunk - r + 1.5;
  const main = tone === 'planted' ? C.orchard : tone === 'back' ? C.green500 : C.green700;
  const shade = tone === 'planted' ? C.orchardShade : tone === 'back' ? C.green700 : C.green900;
  const lobes: [number, number, number][] =
    tone === 'planted'
      ? [[0, 0, r]]
      : [
          [0, 0, r],
          [-r * 0.62, r * 0.28, r * 0.64],
          [r * 0.6, r * 0.32, r * 0.58],
          [r * 0.12, -r * 0.52, r * 0.56],
        ];
  return (
    <g>
      <rect x={x - 1.5} y={gy - trunk - 3} width={3} height={trunk + 6} rx={1} fill={C.trunk} />
      {/* union outline: stroked lobes first, clean fills on top */}
      {lobes.map(([dx, dy, rr], i) => (
        <circle key={`o${i}`} cx={x + dx} cy={cy + dy} r={rr} fill={main} stroke={C.sky0} strokeWidth={1.8} />
      ))}
      {lobes.map(([dx, dy, rr], i) => (
        <circle key={`f${i}`} cx={x + dx} cy={cy + dy} r={rr} fill={main} />
      ))}
      <path d={`M${x},${cy - r} A${r},${r} 0 0 1 ${x},${cy + r} Z`} fill={shade} fillOpacity={tone === 'back' ? 0.45 : 0.8} />
      {tone !== 'planted' && (
        <circle cx={x + r * 0.6} cy={cy + r * 0.32} r={r * 0.58} fill={shade} fillOpacity={tone === 'back' ? 0.35 : 0.7} />
      )}
      <circle cx={x - r * 0.36} cy={cy - r * 0.36} r={r * 0.27} fill={C.green500} fillOpacity={tone === 'natural' ? 0.95 : 0.55} />
    </g>
  );
}

/** Low, two-lobed bush. Upright blobs whose lower half sinks into the slope, so
    they sit convincingly even on the steep flanks. */
function Shrub({ x, rx, ry }: { x: number; rx: number; ry: number }) {
  const gy = groundY(x);
  const cy = gy - ry * 0.5;
  const tilt = slopeDeg(x) * 0.35; // lean slightly with the slope
  const lobes: [number, number, number, number][] = [
    [0, 0, rx, ry],
    [-rx * 0.72, ry * 0.3, rx * 0.62, ry * 0.7],
  ];
  return (
    <g transform={`rotate(${tilt.toFixed(1)} ${x} ${gy.toFixed(1)})`}>
      {lobes.map(([dx, dy, a, b], i) => (
        <ellipse key={`o${i}`} cx={x + dx} cy={cy + dy} rx={a} ry={b} fill={C.green500} stroke={C.sky0} strokeWidth={1.6} />
      ))}
      {lobes.map(([dx, dy, a, b], i) => (
        <ellipse key={`f${i}`} cx={x + dx} cy={cy + dy} rx={a} ry={b} fill={C.green500} />
      ))}
      <path d={`M${x},${cy - ry} A${rx},${ry} 0 0 1 ${x},${cy + ry} Z`} fill={C.green700} fillOpacity={0.75} />
      <ellipse cx={x - rx * 0.35} cy={cy - ry * 0.35} rx={rx * 0.22} ry={ry * 0.2} fill={C.sky0} fillOpacity={0.35} />
    </g>
  );
}

function House({ x, w, h, flat }: { x: number; w: number; h: number; flat: boolean }) {
  const gy = Math.max(groundY(x - w / 2), groundY(x + w / 2)) + 1;
  const top = gy - h;
  const l = x - w / 2;
  const roofH = 10;
  return (
    <g>
      {/* wall + shaded side */}
      <rect x={l} y={top} width={w} height={h} fill={C.wall} stroke={C.soil1} strokeWidth={0.8} />
      <rect x={x + w * 0.2} y={top + 0.4} width={w * 0.3 - 0.4} height={h - 0.8} fill={C.wallShade} />
      {flat ? (
        <rect x={l - 1.5} y={top - 3} width={w + 3} height={3.5} rx={1} fill={C.soil1} />
      ) : (
        <>
          <path d={`M${l - 2.5},${top + 0.5} L${x},${top - roofH} L${l + w + 2.5},${top + 0.5} Z`} fill={C.roof} />
          <path d={`M${x},${top - roofH} L${l + w + 2.5},${top + 0.5} L${x},${top + 0.5} Z`} fill={C.ink} fillOpacity={0.22} />
        </>
      )}
      {/* windows + door */}
      <rect x={l + 3.5} y={top + 4} width={4} height={4} rx={0.6} fill={C.asphalt} fillOpacity={0.75} />
      {flat && <rect x={l + 3.5} y={top + 12} width={4} height={4} rx={0.6} fill={C.asphalt} fillOpacity={0.75} />}
      {flat && <rect x={x + 2} y={top + 4} width={4} height={4} rx={0.6} fill={C.asphalt} fillOpacity={0.6} />}
      <rect x={x - 1} y={gy - 7.5} width={4.4} height={7.5} rx={0.6} fill={C.roof} />
    </g>
  );
}

function Pylon({ x }: { x: number }) {
  const gy = groundY(x);
  const top = gy - PYLON_H;
  const legAt = (y: number, side: number) => x + side * (2 + 6 * ((y - top) / (gy - top)));
  const levels = [0, 1, 2, 3, 4, 5].map((i) => top + 8 + ((gy - top - 8) * i) / 5);
  let brace = '';
  for (let i = 0; i < levels.length - 1; i++) {
    const s = i % 2 === 0 ? -1 : 1;
    brace += `M${legAt(levels[i], s).toFixed(1)},${levels[i].toFixed(1)} L${legAt(levels[i + 1], -s).toFixed(1)},${levels[i + 1].toFixed(1)} `;
  }
  return (
    <g fill="none" stroke={C.steel} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${x - 8},${gy + 1.5} L${x - 2},${top} M${x + 8},${gy + 1.5} L${x + 2},${top}`} strokeWidth={1.7} />
      <path d={brace} strokeWidth={0.8} />
      <path d={`M${x - 15},${top + 8} L${x + 15},${top + 8} M${x - 11},${top + 20} L${x + 11},${top + 20}`} strokeWidth={1.7} />
      <path d={`M${x - 2},${top} L${x},${top - 5} L${x + 2},${top}`} strokeWidth={1.3} />
      {[
        [-15, 8],
        [15, 8],
        [-11, 20],
        [11, 20],
      ].map(([dx, dy]) => (
        <line key={`${dx}${dy}`} x1={x + dx} y1={top + dy} x2={x + dx} y2={top + dy + 4} strokeWidth={1.6} />
      ))}
    </g>
  );
}

function Wires() {
  const [a, b] = PYLONS;
  const ta = groundY(a) - PYLON_H;
  const tb = groundY(b) - PYLON_H;
  const tips: [number, number][] = [
    [-15, 12],
    [15, 12],
    [-11, 24],
    [11, 24],
  ];
  return (
    <g fill="none" stroke={C.steel} strokeWidth={0.9} strokeOpacity={0.85}>
      {tips.map(([dx, dy]) => {
        const ya = ta + dy;
        const yb = tb + dy;
        return (
          <g key={`${dx}${dy}`}>
            <path d={`M${a + dx},${ya} Q${(a + b) / 2 + dx},${Math.max(ya, yb) + 9} ${b + dx},${yb}`} />
            <path d={`M${b + dx},${yb} Q${(b + W) / 2 + dx + 8},${yb + 6} ${W + 6},${yb + 3}`} />
          </g>
        );
      })}
    </g>
  );
}

function Car({ x }: { x: number }) {
  const y = groundY(x) - 3.4;
  return (
    <g>
      <path d={`M${x - 12},${y - 2} L${x - 12},${y - 7} Q${x - 12},${y - 8.5} ${x - 10},${y - 8.5} L${x - 6},${y - 8.5} L${x - 3},${y - 13} L${x + 5},${y - 13} L${x + 8.5},${y - 8.5} L${x + 11},${y - 8} Q${x + 12.5},${y - 7.5} ${x + 12.5},${y - 5.5} L${x + 12.5},${y - 2} Z`} fill={C.car} />
      <path d={`M${x - 2.2},${y - 11.8} L${x + 4.4},${y - 11.8} L${x + 6.8},${y - 8.6} L${x - 4.4},${y - 8.6} Z`} fill={C.sky0} fillOpacity={0.9} />
      <circle cx={x - 7} cy={y - 1.6} r={2.6} fill={C.ink} />
      <circle cx={x + 7.5} cy={y - 1.6} r={2.6} fill={C.ink} />
    </g>
  );
}

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
