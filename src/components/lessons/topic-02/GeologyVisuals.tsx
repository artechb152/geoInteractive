'use client';
/**
 * GeologyVisuals — the illustrations for GeologyScene's "2 כוחות" board (the
 * rock-type board uses the photographic time-lapses in RockVisuals.tsx and
 * borrows Tag / arrowPoints from here).
 *
 * Each force is one continuous painted landscape in an oblique aerial view
 * (foreground, middle ground, hazy distance) with a shallow cut along its near
 * edge that reveals the beds, styled after the lesson's onboarding renders and
 * produced by scripts/media/render-geology-forces.cjs. The image is only the
 * landscape; labels, arrows and the process motion sit on an SVG layer above
 * it, in the same 560 × 360 frame (anchor points come from the render script).
 * GeologyScene can switch back to the previous schematic version
 * (GeologyVisualsLegacy.tsx). Never mirrored for RTL. Every label reuses a term that
 * already appears in the scene copy. Motion only explains the process (the
 * beds folding up into a ridge, magma rising to a gently venting volcano,
 * rain/wind wearing the surface) and is disabled when the user prefers reduced
 * motion. The exogenic processes (rain, runoff, the stream, sand, rockfall) are
 * drawn by ExogenicActivity.tsx from geometry the render script projects.
 */
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import { animate, motion, useInView, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { EXO_STILL_T, ExogenicActivity, windSweep } from './ExogenicActivity';

type Pt = readonly [number, number];

const EASE = [0.22, 1, 0.36, 1] as const;
export const INK = '#38432E';
export const INK_SOFT = '#4A5240';
export const HEAT = '#C8452B';
const W = 560;
const H = 360;

// Painted terrain (scripts/media/render-geology-forces.cjs): the endogenic block
// as a flipbook of the uplift (t = 0 → 1), the exogenic block as one image.
const ASSETS = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/scene-geology/forces`;
const ENDO_FRAMES = Array.from({ length: 10 }, (_, i) => `${ASSETS}/endo-${String(i).padStart(2, '0')}.webp`);
const EXO_SRC = `${ASSETS}/exo.webp`;

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Block arrow polygon from (x1,y1) to the tip (x2,y2). */
export function arrowPoints(x1: number, y1: number, x2: number, y2: number, shaft = 8, head = 16, headW = 22) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const px = -uy;
  const py = ux;
  const bx = x2 - ux * head;
  const by = y2 - uy * head;
  const pts: Pt[] = [
    [x1 + (px * shaft) / 2, y1 + (py * shaft) / 2],
    [bx + (px * shaft) / 2, by + (py * shaft) / 2],
    [bx + (px * headW) / 2, by + (py * headW) / 2],
    [x2, y2],
    [bx - (px * headW) / 2, by - (py * headW) / 2],
    [bx - (px * shaft) / 2, by - (py * shaft) / 2],
    [x1 - (px * shaft) / 2, y1 - (py * shaft) / 2],
  ];
  return pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ');
}

/** Rough text width for Rubik bold Hebrew — used to size label pills. */
function textWidth(text: string, size: number) {
  let w = 0;
  for (const ch of text) w += ch === ' ' ? 0.28 : 0.6;
  return w * size;
}

/**
 * Label pill with an optional leader line to the feature it names. Pills sit
 * on a solid cream fill so labels stay legible without stroke halos.
 */
export function Tag({ x, y, text, to, size = 13 }: { x: number; y: number; text: string; to?: Pt; size?: number }) {
  const w = Math.round(textWidth(text, size) + 20);
  const h = size + 11;
  return (
    <g>
      {to && (
        <>
          <line x1={x} y1={y} x2={to[0]} y2={to[1]} stroke={INK} strokeOpacity={0.55} strokeWidth={1.2} />
          <circle cx={to[0]} cy={to[1]} r={2.8} fill={INK} stroke="#FFFDF8" strokeWidth={1} />
        </>
      )}
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={h / 2}
        fill="#FFFDF8"
        stroke="#DCCDB2"
        style={{ filter: 'drop-shadow(0 1px 1.5px rgba(90,70,40,0.16))' }}
      />
      <text
        x={x}
        y={y}
        dy="0.36em"
        textAnchor="middle"
        fontSize={size}
        fontWeight={700}
        fill={INK}
        className="font-display"
      >
        {text}
      </text>
    </g>
  );
}

/**
 * Process motion starts when the illustration is actually on screen (and
 * again each time a tab remounts it), so the learner sees the cause → effect.
 */
function useSeen() {
  const ref = useRef<SVGSVGElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.35 });
  return { ref, seen };
}

/** True once every image has been fetched and decoded (so a flipbook never shows a gap). */
function useDecoded(srcs: readonly string[], enabled: boolean) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    Promise.all(
      srcs.map((src) => {
        const img = new Image();
        img.src = src;
        return img.decode().catch(() => undefined);
      }),
    ).then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [srcs, enabled]);
  return ready;
}

function Svg({ label, svgRef, children }: { label: string; svgRef: RefObject<SVGSVGElement | null>; children: ReactNode }) {
  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block w-full h-auto">
      {children}
    </svg>
  );
}

function Terrain({ src }: { src: string }) {
  return <image href={src} x={0} y={0} width={W} height={H} />;
}

/** One uplift frame; frame i fades in over the step i − 1 → i of the flipbook. */
function UpliftFrame({ src, index, uplift }: { src: string; index: number; uplift: MotionValue<number> }) {
  const opacity = useTransform(uplift, (p) => Math.min(1, Math.max(0, p * (ENDO_FRAMES.length - 1) - index + 1)));
  return <motion.image href={src} width={W} height={H} style={{ opacity }} />;
}

// ── Endogenic: plates push → beds fold into a ridge, a fault, volcanoes ──
// Overlay anchors (viewBox units) from render-geology-forces.cjs.
const FAULT_TOP: Pt = [389.9, 304.5];
const FAULT_BOTTOM: Pt = [381.8, 355];
const QUAKE: Pt = [386.5, 326];
const CRATER: Pt = [463.7, 60.1]; // centre of the main crater's rim (crater0; rim half-axes 13.2 × 6.8)
const CONDUIT = [
  [532, 335],
  [524, 322],
  [518, 306],
  [514, 276],
] as const; // the feeder conduit in the cut, chamber → small cone
const CONDUIT_LEN = CONDUIT.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - CONDUIT[i][0], p[1] - CONDUIT[i][1]), 0);

// Volcanic activity, in seconds after the uplift starts (it settles at 1.6 s):
// magma pulses rise in the conduit, the crater begins to glow, then the plume.
const ACT = { pulse: 1.7, glow: 1.9, plume: 2.1 } as const;
const PULSE = { every: 5.6, travel: 3.6, dash: 11 } as const;
const GLOW_PERIOD = 5.2;
// The plume rises ≈ 26 and bends ≈ 58 downwind, so it thins out well inside the frame.
const PLUME = { puffs: 14, life: 10, rise: 26, drift: 58 } as const;
const STILL_T = 40; // the moment shown when motion is reduced (a settled plume)

const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const hash = (i: number, k: number) => {
  const v = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};
/** Per-puff variety, so the plume never repeats as a pattern. */
const PUFFS = Array.from({ length: PLUME.puffs }, (_, i) => ({
  drift: 0.86 + 0.28 * hash(i, 1),
  rise: 0.9 + 0.2 * hash(i, 2),
  sway: hash(i, 3) - 0.5,
  size: 0.85 + 0.3 * hash(i, 4),
}));

/**
 * A puff at process time t: it leaves the crater small and dark with ash,
 * rises, swells, is bent downwind (east, away from the ridge) and thins out.
 */
function puffAt(i: number, t: number) {
  const birth = ACT.plume + (i * PLUME.life) / PLUME.puffs;
  if (t < birth) return { x: CRATER[0], y: CRATER[1], sx: 0.3, sy: 0.3, opacity: 0, ash: 1 };
  const p = PUFFS[i];
  const s = ((t - birth) % PLUME.life) / PLUME.life;
  const u = 1 - Math.pow(1 - s, 1.5);
  const k = p.size * (0.5 + 1.1 * u);
  return {
    x: CRATER[0] + PLUME.drift * p.drift * Math.pow(u, 1.7) + 6 * p.sway * Math.sin(Math.PI * u),
    y: CRATER[1] - 2 - PLUME.rise * p.rise * (1 - Math.pow(1 - u, 2.2)),
    sx: k * (1 + 0.35 * u),
    sy: k,
    opacity: 0.95 * smooth(0, 0.1, s) * (1 - smooth(0.25, 0.85, s)),
    ash: 1 - smooth(0.02, 0.22, s),
  };
}

/**
 * Process time in seconds: advances only while `run`, the figure is on screen
 * and the page is visible (one rAF loop for every effect); `frozenAt` pins it
 * to one moment (reduced motion).
 */
const onVisibility = (cb: () => void) => {
  document.addEventListener('visibilitychange', cb);
  return () => document.removeEventListener('visibilitychange', cb);
};
function useProcessClock(ref: RefObject<SVGSVGElement | null>, run: boolean, frozenAt: number | null) {
  const clock = useMotionValue(frozenAt ?? 0);
  useEffect(() => {
    if (frozenAt !== null) clock.set(frozenAt);
  }, [frozenAt, clock]);
  const onScreen = useInView(ref, { amount: 0 });
  const pageVisible = useSyncExternalStore(onVisibility, () => !document.hidden, () => true);
  useEffect(() => {
    if (!run || !onScreen || !pageVisible) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // (the first frame's timestamp can precede the effect's start: never step back)
      clock.set(clock.get() + Math.min(0.1, Math.max(0, (now - last) / 1000)));
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, onScreen, pageVisible, clock]);
  return clock;
}

/** Soft warm-grey puff: a body, a shaded underside, a sunlit top (sun from the west) and an ash core. */
function PlumePuff({ i, clock, ids }: { i: number; clock: MotionValue<number>; ids: string }) {
  const x = useTransform(clock, (t) => puffAt(i, t).x);
  const y = useTransform(clock, (t) => puffAt(i, t).y);
  const scaleX = useTransform(clock, (t) => puffAt(i, t).sx);
  const scaleY = useTransform(clock, (t) => puffAt(i, t).sy);
  const opacity = useTransform(clock, (t) => puffAt(i, t).opacity);
  const ash = useTransform(clock, (t) => puffAt(i, t).ash);
  return (
    <motion.g style={{ x, y, scaleX, scaleY, opacity }}>
      <circle r={15} fill={`url(#${ids}-body)`} />
      <circle cx={4} cy={4.6} r={11.5} fill={`url(#${ids}-shade)`} />
      <circle cx={-4.4} cy={-4.4} r={9} fill={`url(#${ids}-lit)`} />
      <motion.circle cx={0.8} cy={1.8} r={9.5} fill={`url(#${ids}-ash)`} style={{ opacity: ash }} />
    </motion.g>
  );
}

/** A slow glowing pulse of magma rising up the feeder conduit. */
function MagmaPulse({ k, clock }: { k: number; clock: MotionValue<number> }) {
  const phase = (t: number) => {
    const local = t - ACT.pulse - k * (PULSE.every / 2);
    return local < 0 ? -1 : (local % PULSE.every) / PULSE.travel;
  };
  const strokeDashoffset = useTransform(clock, (t) => {
    const s = phase(t);
    return s < 0 || s > 1 ? PULSE.dash : PULSE.dash - s * (CONDUIT_LEN + PULSE.dash);
  });
  const opacity = useTransform(clock, (t) => {
    const s = phase(t);
    return s < 0 || s > 1 ? 0 : smooth(0, 0.15, s) * (1 - smooth(0.75, 1, s));
  });
  const d = `M${CONDUIT.map((p) => p.join(' ')).join(' L')}`;
  const dash = `${PULSE.dash} ${CONDUIT_LEN + PULSE.dash * 2}`;
  return (
    <motion.g style={{ opacity }}>
      <motion.path d={d} fill="none" stroke="#F2B25E" strokeOpacity={0.35} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} style={{ strokeDashoffset }} />
      <motion.path d={d} fill="none" stroke="#F9D68E" strokeOpacity={0.7} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} style={{ strokeDashoffset }} />
    </motion.g>
  );
}

/**
 * The volcano at work: a warm glow breathing in the crater, a soft plume of
 * steam and ash drifting downwind, and magma pulsing up the conduit in the cut.
 * Reduced motion shows one still moment (glow and a settled plume, no pulses).
 */
function VolcanoActivity({ clock, reduce }: { clock: MotionValue<number>; reduce: boolean }) {
  const ids = `volc${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const glow = useTransform(clock, (t) => smooth(ACT.glow, ACT.glow + 1.6, t) * (0.42 + 0.18 * Math.sin((2 * Math.PI * (t - ACT.glow)) / GLOW_PERIOD)));
  const underlight = useTransform(glow, (g) => g * 0.35);
  return (
    <g aria-hidden="true">
      <defs>
        <radialGradient id={`${ids}-glow`}>
          <stop offset="0" stopColor="#EFA35A" stopOpacity={0.75} />
          <stop offset="0.5" stopColor="#D9773A" stopOpacity={0.35} />
          <stop offset="1" stopColor="#C8602A" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${ids}-body`}>
          <stop offset="0" stopColor="#CCC3B6" stopOpacity={0.95} />
          <stop offset="0.6" stopColor="#C8BFB2" stopOpacity={0.8} />
          <stop offset="1" stopColor="#C4BBAE" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${ids}-shade`}>
          <stop offset="0" stopColor="#968C81" stopOpacity={0.6} />
          <stop offset="1" stopColor="#968C81" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${ids}-lit`}>
          <stop offset="0" stopColor="#F8F4EE" stopOpacity={0.92} />
          <stop offset="1" stopColor="#F8F4EE" stopOpacity={0} />
        </radialGradient>
        {/* breaks the puffs' edges into soft, painterly wisps */}
        <filter id={`${ids}-wisp`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves={2} seed={7} />
          <feDisplacementMap in="SourceGraphic" scale={6} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <radialGradient id={`${ids}-ash`}>
          <stop offset="0" stopColor="#776D64" stopOpacity={0.55} />
          <stop offset="1" stopColor="#776D64" stopOpacity={0} />
        </radialGradient>
      </defs>

      {!reduce && [0, 1].map((k) => <MagmaPulse key={k} k={k} clock={clock} />)}

      <motion.ellipse cx={CRATER[0]} cy={CRATER[1] + 1.6} rx={9} ry={3.6} fill={`url(#${ids}-glow)`} style={{ opacity: glow }} />
      <g filter={`url(#${ids}-wisp)`}>
        {PUFFS.map((_, i) => (
          <PlumePuff key={i} i={i} clock={clock} ids={ids} />
        ))}
      </g>
      {/* the crater's glow catching the underside of the rising steam */}
      <motion.ellipse cx={CRATER[0]} cy={CRATER[1] - 4} rx={8} ry={6} fill={`url(#${ids}-glow)`} style={{ opacity: underlight }} />
    </g>
  );
}

export function EndogenicVisual({ reduce }: { reduce: boolean }) {
  const { ref, seen } = useSeen();
  const ready = useDecoded(ENDO_FRAMES, !reduce);
  const go = seen && ready;
  const t = { duration: reduce ? 0 : 1.3, ease: EASE, delay: reduce ? 0 : 0.3 };
  const uplift = useMotionValue(reduce ? 1 : 0);
  const clock = useProcessClock(ref, go && !reduce, reduce ? STILL_T : null);
  useEffect(() => {
    if (reduce || !go) return;
    const controls = animate(uplift, 1, { duration: 1.3, ease: EASE, delay: 0.3 });
    return () => controls.stop();
  }, [reduce, go, uplift]);
  return (
    <Svg svgRef={ref} label="איור: לוחות טקטוניים נדחפים זה אל זה מתחת לפני השטח. השכבות מתקפלות ומתרוממות לרכס הרים, נוצר שבר שבו מתרחשות רעידות אדמה, ומאגמה עולה להרי געש">
      {/* Painted landscape: the beds fold up into the range */}
      {reduce ? (
        <Terrain src={ENDO_FRAMES[ENDO_FRAMES.length - 1]} />
      ) : (
        ENDO_FRAMES.map((src, i) => <UpliftFrame key={src} src={src} index={i} uplift={uplift} />)
      )}

      {/* The volcano: crater glow, plume, magma rising in the conduit */}
      <VolcanoActivity clock={clock} reduce={reduce} />

      {/* Fault */}
      <line x1={FAULT_TOP[0]} y1={FAULT_TOP[1]} x2={FAULT_BOTTOM[0]} y2={FAULT_BOTTOM[1]} stroke={INK} strokeWidth="1.8" strokeDasharray="6 4" />

      {/* Plates pushing toward each other → the ridge rises */}
      <motion.polygon
        points={arrowPoints(26, 345, 120, 345, 10, 18, 26)}
        fill={INK_SOFT}
        initial={reduce ? false : { x: -18 }}
        animate={{ x: go || reduce ? 0 : -18 }}
        transition={t}
      />
      <motion.polygon
        points={arrowPoints(466, 345, 370, 345, 10, 18, 26)}
        fill={INK_SOFT}
        initial={reduce ? false : { x: 18 }}
        animate={{ x: go || reduce ? 0 : 18 }}
        transition={t}
      />
      <motion.polygon
        points={arrowPoints(152, 340, 152, 306, 9, 15, 22)}
        fill="#FDFBF3"
        stroke={INK_SOFT}
        strokeWidth="1.4"
        strokeLinejoin="round"
        initial={reduce ? false : { y: 26, opacity: 0 }}
        animate={go || reduce ? { y: 0, opacity: 1 } : { y: 26, opacity: 0 }}
        transition={t}
      />

      {/* Earthquake focus on the fault */}
      <g>
        {[9, 16].map((r, i) =>
          reduce ? (
            <circle key={r} cx={QUAKE[0]} cy={QUAKE[1]} r={r} fill="none" stroke={HEAT} strokeWidth="1.6" strokeOpacity={i ? 0.45 : 0.8} />
          ) : (
            <motion.circle
              key={r}
              cx={QUAKE[0]}
              cy={QUAKE[1]}
              r={r}
              fill="none"
              stroke={HEAT}
              strokeWidth="1.6"
              initial={{ opacity: 0 }}
              animate={go ? { opacity: [0, i ? 0.5 : 0.85, 0] } : undefined}
              transition={{ duration: 1.8, repeat: Infinity, delay: 1.6 + i * 0.25, ease: 'easeOut' }}
            />
          ),
        )}
        <circle cx={QUAKE[0]} cy={QUAKE[1]} r="4" fill={HEAT} />
      </g>

      <Tag x={222} y={26} text="רכסי הרים" to={[140, 21]} />
      <Tag x={298} y={190} text="שבר" to={[362, 210]} />
      <Tag x={396} y={32} text="הרי געש" to={[451, 66.9]} />
      <Tag x={304} y={315} text="רעידות אדמה" to={[383, 325]} />
      <Tag x={262} y={345} text="לוחות טקטוניים" />
    </Svg>
  );
}

// ── Exogenic: rain, wind and gravity wear the surface into small landforms ──

function WindStreak({ y, x0, x1 }: { y: number; x0: number; x1: number }) {
  const mid = (x0 + x1) / 2;
  return (
    <g>
      <path d={`M${x1} ${y} C${mid + 20} ${y - 8} ${mid - 20} ${y + 8} ${x0 + 8} ${y}`} fill="none" stroke={INK_SOFT} strokeWidth="2.4" strokeLinecap="round" />
      <polygon points={`${x0},${y} ${x0 + 11},${y - 5.5} ${x0 + 11},${y + 5.5}`} fill={INK_SOFT} />
    </g>
  );
}

/** Wind streaks over the dunes: they sweep downwind with each gust and stay faint while the air is calm. */
const WIND = [
  { y: 66, x0: 96, x1: 232 },
  { y: 84, x0: 40, x1: 170 },
  { y: 48, x0: 120, x1: 206 },
] as const;
function GustStreak({ clock, k }: { clock: MotionValue<number>; k: number }) {
  const x = useTransform(clock, (t) => windSweep(t, k).x);
  const opacity = useTransform(clock, (t) => windSweep(t, k).opacity);
  return (
    <motion.g style={{ x, opacity }}>
      <WindStreak {...WIND[k]} />
    </motion.g>
  );
}

export function ExogenicVisual({ reduce }: { reduce: boolean }) {
  const { ref, seen } = useSeen();
  const clock = useProcessClock(ref, seen && !reduce, reduce ? EXO_STILL_T : null);
  return (
    <Svg svgRef={ref} label="איור: גשם, רוח וכוח המשיכה מפסלים את פני השטח — מצוקים נשחקים ויוצרים דרדרות בבסיסם, מים חורצים ערוצי נחל, והרוח בונה דיונות חול">
      {/* Painted landscape: mesa cliffs, scree, rills, the stream valley, dunes and the rain cloud */}
      <Terrain src={EXO_SRC} />

      {/* The processes at work: rain, runoff, the stream, sand in the wind, rockfall */}
      <ExogenicActivity clock={clock} />

      {/* Wind blowing sand into dunes */}
      {WIND.map((w, k) =>
        reduce ? (
          <g key={k} opacity={0.75}>
            <WindStreak {...w} />
          </g>
        ) : (
          <GustStreak key={k} clock={clock} k={k} />
        ),
      )}

      <Tag x={346} y={30} text="גשם" to={[398, 57.5]} />
      <Tag x={262} y={56} text="רוח" />
      <Tag x={524} y={80} text="מצוקים" to={[519.9, 108]} />
      <Tag x={522} y={204} text="דרדרות" to={[516.3, 157.4]} />
      <Tag x={290} y={168} text="ערוצי נחל" to={[190, 211]} />
      <Tag x={104} y={318} text="דיונות חול" to={[86, 251]} />
    </Svg>
  );
}
