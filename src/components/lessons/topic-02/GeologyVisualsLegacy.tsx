'use client';
/**
 * GeologyVisualsLegacy — the previous (schematic, papercut cross-section)
 * version of the "2 כוחות" illustrations, kept verbatim so GeologyScene's
 * version toggle can switch back to it. The current painted-terrain version
 * lives in GeologyVisuals.tsx, which also owns the shared Tag / arrowPoints.
 *
 * Warm "papercut" cut-away blocks (never mirrored for RTL). Every label reuses
 * a term that already appears in the scene copy. Motion only explains the
 * process (layers folding, rain/wind wearing the surface) and is disabled when
 * the user prefers reduced motion.
 */
import { useRef, type ReactNode, type RefObject } from 'react';
import { motion, useInView } from 'framer-motion';
import { HEAT, INK, INK_SOFT, Tag, arrowPoints } from './GeologyVisuals';

type Pt = readonly [number, number];

const EASE = [0.22, 1, 0.36, 1] as const;
const W = 560;
const H = 360;

// ── helpers ──────────────────────────────────────────────────────────────
const r1 = (n: number) => Math.round(n * 10) / 10;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function linePath(pts: readonly Pt[]) {
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join(' ');
}

function bandPath(top: readonly Pt[], bottom: readonly Pt[]) {
  const back = [...bottom].reverse().map(([x, y]) => `L${r1(x)} ${r1(y)}`).join(' ');
  return `${linePath(top)} ${back} Z`;
}

/** Shared SVG defs: papercut drop shadow + a soft sky wash. */
function Defs({ id, children }: { id: string; children?: ReactNode }) {
  return (
    <defs>
      <filter id={`${id}-paper`} x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#5A4628" floodOpacity="0.18" />
      </filter>
      <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#EAF1EF" />
        <stop offset="1" stopColor="#F8F2E7" stopOpacity="0" />
      </linearGradient>
      <clipPath id={`${id}-block`}>
        <rect x="16" y="-40" width="528" height="380" rx="18" />
      </clipPath>
      {children}
    </defs>
  );
}

/** Ground shadow under a papercut block. */
function BlockShadow() {
  return <ellipse cx={W / 2} cy={346} rx={262} ry={7} fill="#5A4628" opacity={0.12} />;
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

function Svg({ label, svgRef, children }: { label: string; svgRef: RefObject<SVGSVGElement | null>; children: ReactNode }) {
  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block w-full h-auto">
      {children}
    </svg>
  );
}

// ── Endogenic: plates push → layers fold into a ridge, a fault, volcanoes ──
const E_XS = Array.from({ length: 67 }, (_, i) => 16 + i * 8);
const E_BASE = [172, 204, 236, 268, 298];
const E_AMP = [100, 84, 68, 54, 40];
const THROW = 14;
const bump = (x: number) => Math.exp(-(((x - 232) / 74) ** 2));
const faultX = (y: number) => 372 - (y - 172) * 0.16;

function endoBoundary(k: number, t: number): Pt[] {
  const base = E_BASE[k];
  const A = E_AMP[k] * t;
  const fx = faultX(base);
  const pts: Pt[] = [];
  let inserted = false;
  for (const x of E_XS) {
    if (!inserted && x > fx) {
      const yl = base - A * bump(fx);
      pts.push([fx, yl], [fx - 2.2, yl + THROW]);
      inserted = true;
    }
    pts.push([x, base - A * bump(x) + (x > fx ? THROW : 0)]);
  }
  return pts;
}

const ENDO_FILLS = ['#DCCBA8', '#CFB98F', '#C4AB82', '#B89D76', '#A58B6D'];
const endoState = (t: number) => {
  const lines = E_BASE.map((_, k) => endoBoundary(k, t));
  const floor: Pt[] = [
    [544, 346],
    [16, 346],
  ];
  const bands = ENDO_FILLS.map((fill, k) => ({
    fill,
    d: k < 4 ? bandPath(lines[k], lines[k + 1]) : `${linePath(lines[4])} ${floor.map(([x, y]) => `L${x} ${y}`).join(' ')} Z`,
  }));
  return { bands, surface: linePath(lines[0]) };
};
const ENDO_FLAT = endoState(0);
const ENDO_UP = endoState(1);

export function EndogenicVisualLegacy({ reduce }: { reduce: boolean }) {
  const id = 'geo-endo';
  const { ref, seen } = useSeen();
  const t = { duration: reduce ? 0 : 1.3, ease: EASE, delay: reduce ? 0 : 0.3 };
  return (
    <Svg svgRef={ref} label="איור: לוחות טקטוניים נדחפים זה אל זה מתחת לפני השטח. השכבות מתקפלות ומתרוממות לרכס הרים, נוצר שבר שבו מתרחשות רעידות אדמה, ומאגמה עולה להרי געש">
      <Defs id={id}>
        <radialGradient id={`${id}-magma`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#F6B24F" />
          <stop offset="0.6" stopColor="#E0662E" />
          <stop offset="1" stopColor="#B63E26" />
        </radialGradient>
      </Defs>

      <rect x="0" y="0" width={W} height="190" fill={`url(#${id}-sky)`} />
      <BlockShadow />

      <g clipPath={`url(#${id}-block)`} filter={`url(#${id}-paper)`}>
        {ENDO_UP.bands.map((b, k) =>
          reduce ? (
            <path key={k} d={b.d} fill={b.fill} />
          ) : (
            <motion.path
              key={k}
              initial={{ d: ENDO_FLAT.bands[k].d }}
              animate={{ d: seen ? b.d : ENDO_FLAT.bands[k].d }}
              transition={t}
              fill={b.fill}
            />
          ),
        )}
        {reduce ? (
          <path d={ENDO_UP.surface} fill="none" stroke="#7E8A55" strokeWidth="4.5" strokeLinejoin="round" />
        ) : (
          <motion.path
            initial={{ d: ENDO_FLAT.surface }}
            animate={{ d: seen ? ENDO_UP.surface : ENDO_FLAT.surface }}
            transition={t}
            fill="none"
            stroke="#7E8A55"
            strokeWidth="4.5"
            strokeLinejoin="round"
          />
        )}

        {/* Fault */}
        <line x1="372" y1="168" x2={faultX(334)} y2="334" stroke={INK} strokeWidth="1.8" strokeDasharray="6 4" />

        {/* Magma chamber feeding the volcanoes */}
        <ellipse cx="500" cy="324" rx="44" ry="18" fill={`url(#${id}-magma)`} />
      </g>

      {/* Volcanoes */}
      <g filter={`url(#${id}-paper)`}>
        <polygon points="472,190 500,146 506,149 512,146 538,190" fill="#978E83" />
        <polygon points="398,190 444,112 452,116 460,112 510,190" fill="#8A8176" />
        <polygon points="426,190 448,152 456,152 480,190" fill="#9D9489" />
      </g>
      <path d="M498 308 C490 250 458 190 452 118" fill="none" stroke="#E0662E" strokeWidth="6" strokeLinecap="round" />
      <path d="M508 310 C510 250 508 200 506 152" fill="none" stroke="#E0662E" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="452" cy="115" rx="7" ry="2.6" fill="#F6B24F" />

      {/* Plates pushing toward each other → the ridge rises */}
      <motion.polygon
        points={arrowPoints(30, 322, 126, 322, 10, 18, 26)}
        fill={INK_SOFT}
        initial={reduce ? false : { x: -18 }}
        animate={{ x: seen || reduce ? 0 : -18 }}
        transition={t}
      />
      <motion.polygon
        points={arrowPoints(424, 322, 338, 322, 10, 18, 26)}
        fill={INK_SOFT}
        initial={reduce ? false : { x: 18 }}
        animate={{ x: seen || reduce ? 0 : 18 }}
        transition={t}
      />
      <motion.polygon
        points={arrowPoints(232, 302, 232, 262, 9, 15, 22)}
        fill="#FDFBF3"
        stroke={INK_SOFT}
        strokeWidth="1.4"
        strokeLinejoin="round"
        initial={reduce ? false : { y: 26, opacity: 0 }}
        animate={seen || reduce ? { y: 0, opacity: 1 } : { y: 26, opacity: 0 }}
        transition={t}
      />

      {/* Earthquake focus on the fault */}
      <g>
        {[9, 16].map((r, i) =>
          reduce ? (
            <circle key={r} cx="358" cy="262" r={r} fill="none" stroke={HEAT} strokeWidth="1.6" strokeOpacity={i ? 0.45 : 0.8} />
          ) : (
            <motion.circle
              key={r}
              cx="358"
              cy="262"
              r={r}
              fill="none"
              stroke={HEAT}
              strokeWidth="1.6"
              initial={{ opacity: 0 }}
              animate={seen ? { opacity: [0, i ? 0.5 : 0.85, 0] } : undefined}
              transition={{ duration: 1.8, repeat: Infinity, delay: 1.6 + i * 0.25, ease: 'easeOut' }}
            />
          ),
        )}
        <circle cx="358" cy="262" r="4" fill={HEAT} />
      </g>

      <Tag x={232} y={40} text="רכסי הרים" to={[232, 70]} />
      <Tag x={398} y={140} text="שבר" to={[373, 170]} />
      <Tag x={476} y={68} text="הרי געש" to={[454, 110]} />
      <Tag x={424} y={268} text="רעידות אדמה" to={[362, 263]} />
      <Tag x={232} y={322} text="לוחות טקטוניים" />
    </Svg>
  );
}

// ── Exogenic: rain, wind and gravity wear the surface into small landforms ──
const EXO_SURFACE: Pt[] = (() => {
  const pts: Pt[] = [];
  for (let x = 16; x <= 150; x += 6) {
    const y =
      241 -
      14 * Math.exp(-(((x - 46) / 16) ** 2)) -
      17 * Math.exp(-(((x - 98) / 18) ** 2)) -
      9 * Math.exp(-(((x - 142) / 11) ** 2));
    pts.push([x, y]);
  }
  pts.push(
    [158, 241],
    [178, 243],
    [200, 257],
    [220, 278],
    [232, 290],
    [244, 280],
    [264, 262],
    [288, 251],
    [312, 246],
    [334, 240],
    [352, 232],
    [370, 222],
    [386, 212],
    [390, 196],
    [394, 178],
    [392, 162],
    [398, 144],
    [400, 126],
    [404, 112],
    [440, 110],
    [480, 108],
    [544, 109],
  );
  return pts;
})();
const EXO_GROUND = `${linePath(EXO_SURFACE)} L544 346 L16 346 Z`;
const EXO_DUNES = linePath(EXO_SURFACE.filter(([x]) => x <= 158));
const EXO_PLAIN = linePath(EXO_SURFACE.filter(([x]) => x >= 158 && x <= 334));
const EXO_PLATEAU = linePath(EXO_SURFACE.filter(([x]) => x >= 404));
const EXO_TALUS: { pts: string; fill: string }[] = (() => {
  const rand = rng(5);
  const spots: Pt[] = [
    [344, 234],
    [356, 230],
    [366, 224],
    [376, 218],
    [352, 240],
    [364, 234],
    [378, 228],
    [386, 220],
    [338, 242],
    [370, 238],
    [384, 232],
  ];
  const fills = ['#B39D7E', '#A38D70', '#C4AE8C'];
  return spots.map(([cx, cy]) => {
    const s = 3.2 + rand() * 3;
    const pts = Array.from({ length: 5 }, (_, k) => {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.7;
      const rr = s * (0.7 + rand() * 0.4);
      return `${r1(cx + Math.cos(a) * rr)},${r1(cy + Math.sin(a) * rr)}`;
    }).join(' ');
    return { pts, fill: fills[Math.floor(rand() * fills.length)] };
  });
})();

function WindStreak({ y, x0, x1 }: { y: number; x0: number; x1: number }) {
  const mid = (x0 + x1) / 2;
  return (
    <g>
      <path d={`M${x1} ${y} C${mid + 20} ${y - 8} ${mid - 20} ${y + 8} ${x0 + 8} ${y}`} fill="none" stroke={INK_SOFT} strokeWidth="2.4" strokeLinecap="round" />
      <polygon points={`${x0},${y} ${x0 + 11},${y - 5.5} ${x0 + 11},${y + 5.5}`} fill={INK_SOFT} />
    </g>
  );
}

export function ExogenicVisualLegacy({ reduce }: { reduce: boolean }) {
  const id = 'geo-exo';
  const { ref, seen } = useSeen();
  const drops = [436, 450, 464, 478, 492, 506];
  const layers: [number, string][] = [
    [100, '#E4D3AF'],
    [140, '#D6C096'],
    [172, '#E8DAB8'],
    [204, '#CBB28A'],
    [236, '#DDC9A2'],
    [268, '#C6AB82'],
    [300, '#BFA37A'],
  ];
  return (
    <Svg svgRef={ref} label="איור: גשם, רוח וכוח המשיכה מפסלים את פני השטח — מצוקים נשחקים ויוצרים דרדרות בבסיסם, מים חורצים ערוצי נחל, והרוח בונה דיונות חול">
      <Defs id={id}>
        <clipPath id={`${id}-ground`}>
          <path d={EXO_GROUND} />
        </clipPath>
      </Defs>

      <rect x="0" y="0" width={W} height="220" fill={`url(#${id}-sky)`} />
      <BlockShadow />

      <g clipPath={`url(#${id}-block)`} filter={`url(#${id}-paper)`}>
        <g clipPath={`url(#${id}-ground)`}>
          {layers.map(([y, fill], i) => (
            <rect key={y} x="16" y={y} width="528" height={(layers[i + 1]?.[0] ?? 346) - y} fill={fill} />
          ))}
        </g>
        {/* dunes — loose sand on the low plain */}
        <path d={`${EXO_DUNES} L158 246 L16 246 Z`} fill="#E9CF9B" />
        <path d={EXO_DUNES} fill="none" stroke="#D2B47A" strokeWidth="2.5" />
        <path d={EXO_PLAIN} fill="none" stroke="#8A9163" strokeWidth="3.5" strokeLinejoin="round" />
        <path d={EXO_PLATEAU} fill="none" stroke="#8A9163" strokeWidth="4.5" strokeLinejoin="round" />

        {/* talus wedge + fallen blocks at the cliff foot */}
        <polygon points="322,246 352,232 386,212 392,250 344,254" fill="#CDB791" />
        {EXO_TALUS.map((r, i) => (
          <polygon key={i} points={r.pts} fill={r.fill} stroke="#8C7A60" strokeWidth="0.8" />
        ))}

        {/* runoff into the valley + the stream at its bottom */}
        <path d="M334 238 L312 244 L288 249 L264 260 L244 278" fill="none" stroke="#7FB4C6" strokeWidth="2.4" strokeDasharray="6 4" strokeLinecap="round" />
        <path d="M222 281 Q232 294 243 281 Z" fill="#7FB4C6" />
      </g>

      {/* Rain cloud over the plateau */}
      <g filter={`url(#${id}-paper)`}>
        <rect x="440" y="48" width="70" height="18" rx="9" fill="#FFFFFF" />
        <circle cx="458" cy="50" r="14" fill="#FFFFFF" />
        <circle cx="480" cy="42" r="18" fill="#FFFFFF" />
        <circle cx="500" cy="52" r="12" fill="#FFFFFF" />
      </g>
      {drops.map((x, i) =>
        reduce ? (
          <line key={x} x1={x} y1={74 + (i % 2) * 8} x2={x - 4} y2={88 + (i % 2) * 8} stroke="#5E98AE" strokeWidth="2" strokeLinecap="round" />
        ) : (
          <motion.line
            key={x}
            x1={x}
            y1={70}
            x2={x - 4}
            y2={84}
            stroke="#5E98AE"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={seen ? { y: [0, 20], x: [0, -4], opacity: [0, 1, 0] } : undefined}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear', delay: (i * 0.23) % 0.9 }}
          />
        ),
      )}

      {/* Wind blowing sand into dunes */}
      {[
        { y: 180, x0: 44, x1: 192, d: 0 },
        { y: 202, x0: 26, x1: 156, d: 0.5 },
        { y: 160, x0: 86, x1: 180, d: 1 },
      ].map((w) =>
        reduce ? (
          <g key={w.y} opacity={0.75}>
            <WindStreak y={w.y} x0={w.x0} x1={w.x1} />
          </g>
        ) : (
          <motion.g
            key={w.y}
            initial={{ opacity: 0 }}
            animate={seen ? { x: [12, -10], opacity: [0, 0.8, 0] } : undefined}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: w.d }}
          >
            <WindStreak y={w.y} x0={w.x0} x1={w.x1} />
          </motion.g>
        ),
      )}

      {/* A block breaking off the cliff and tumbling onto the talus */}
      {!reduce && (
        <motion.polygon
          points="404,106 412,104 414,112 406,114"
          fill="#B39D7E"
          stroke="#8C7A60"
          strokeWidth="0.8"
          initial={{ opacity: 0 }}
          animate={seen ? { x: [0, -3, -10, -22], y: [0, 18, 64, 112], rotate: [0, 40, 130, 220], opacity: [0, 1, 1, 0] } : undefined}
          transition={{ duration: 1.6, times: [0, 0.15, 0.55, 1], repeat: Infinity, repeatDelay: 2.4, ease: 'easeIn' }}
        />
      )}

      <Tag x={390} y={46} text="גשם" to={[434, 54]} />
      <Tag x={134} y={136} text="רוח" />
      <Tag x={470} y={164} text="מצוקים" to={[398, 150]} />
      <Tag x={312} y={196} text="דרדרות" to={[354, 228]} />
      <Tag x={232} y={318} text="ערוצי נחל" to={[232, 288]} />
      <Tag x={92} y={286} text="דיונות חול" to={[98, 232]} />
    </Svg>
  );
}
