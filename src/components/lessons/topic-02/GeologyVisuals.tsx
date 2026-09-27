'use client';
/**
 * GeologyVisuals — schematic cross-section illustrations for GeologyScene.
 *
 * Warm "papercut" cut-away blocks (never mirrored for RTL). Every label reuses
 * a term that already appears in the scene copy. Motion only explains the
 * process (magma rising, layers settling, layers folding, rain/wind wearing
 * the surface) and is disabled when the user prefers reduced motion.
 */
import { useRef, type ReactNode, type RefObject } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

type Pt = readonly [number, number];
type Kind = 'igneous' | 'sediment' | 'metamorphic';

const EASE = [0.22, 1, 0.36, 1] as const;
const INK = '#38432E';
const INK_SOFT = '#4A5240';
const HEAT = '#C8452B';
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

/** Block arrow polygon from (x1,y1) to the tip (x2,y2). */
function arrowPoints(x1: number, y1: number, x2: number, y2: number, shaft = 8, head = 16, headW = 22) {
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
function Tag({ x, y, text, to, size = 13 }: { x: number; y: number; text: string; to?: Pt; size?: number }) {
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

// ── rock texture swatches ────────────────────────────────────────────────
const GRANITE_SPECKS = (() => {
  const rand = rng(7);
  const colors = ['#34312E', '#F7F3EC', '#D29A89', '#9C918A', '#F7F3EC', '#C98C7C'];
  return Array.from({ length: 95 }, () => {
    const cx = rand() * 66 - 1;
    const cy = rand() * 66 - 1;
    const s = 1.4 + rand() * 3.2;
    const pts = Array.from({ length: 5 }, (_, k) => {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.8;
      const rr = s * (0.6 + rand() * 0.5);
      return `${r1(cx + Math.cos(a) * rr)},${r1(cy + Math.sin(a) * rr)}`;
    }).join(' ');
    return { pts, fill: colors[Math.floor(rand() * colors.length)] };
  });
})();

const SEDIMENT_BANDS = (() => {
  const colors = ['#E7CF9E', '#ECE2CC', '#DDBB85', '#CFC5AE', '#E3D7BC', '#D8B983', '#E9DDC3'];
  const heights = [8, 10, 7, 11, 8, 12, 9];
  const xs = Array.from({ length: 17 }, (_, i) => i * 4);
  let y = -2;
  return heights.map((h, i) => {
    const top: Pt[] = xs.map((x) => [x, y + Math.sin(x / 9 + i) * 1.1]);
    y += h;
    const bottom: Pt[] = xs.map((x) => [x, y + Math.sin(x / 9 + i + 1) * 1.1]);
    return { d: bandPath(top, bottom), fill: colors[i % colors.length] };
  });
})();

const SEDIMENT_GRAINS = (() => {
  const rand = rng(21);
  return Array.from({ length: 46 }, () => ({ cx: r1(rand() * 64), cy: r1(rand() * 64), r: r1(0.5 + rand() * 0.8) }));
})();

const META_BANDS = (() => {
  const colors = ['#5F6B78', '#A9B2BB', '#6E7A87', '#C5CBD0', '#58636F', '#9AA4AD'];
  const xs = Array.from({ length: 23 }, (_, i) => i * 3);
  const fold = (x: number) => Math.sin(x / 10.5) * 5 + x * 0.12;
  return Array.from({ length: 16 }, (_, i) => {
    const y0 = -12 + i * 5.4;
    const top: Pt[] = xs.map((x) => [x, y0 + fold(x)]);
    const bottom: Pt[] = xs.map((x) => [x, y0 + 5.4 + fold(x)]);
    const sheen: Pt[] = xs.map((x) => [x, y0 + 2.7 + fold(x)]);
    return { d: bandPath(top, bottom), sheen: linePath(sheen), fill: colors[i % colors.length] };
  });
})();

/** A small rock sample tile — crystalline speckle / layered bands / foliated bands. */
export function RockSwatch({ kind, className }: { kind: Kind; className?: string }) {
  return (
    <span aria-hidden className={cn('block overflow-hidden', className)}>
      <svg viewBox="0 0 64 64" preserveAspectRatio="xMidYMid slice" className="block size-full">
        {kind === 'igneous' && (
          <>
            <rect width="64" height="64" fill="#D6C6BB" />
            {GRANITE_SPECKS.map((s, i) => (
              <polygon key={i} points={s.pts} fill={s.fill} />
            ))}
          </>
        )}
        {kind === 'sediment' && (
          <>
            <rect width="64" height="64" fill="#E3D7BC" />
            {SEDIMENT_BANDS.map((b, i) => (
              <path key={i} d={b.d} fill={b.fill} />
            ))}
            {SEDIMENT_GRAINS.map((g, i) => (
              <circle key={i} cx={g.cx} cy={g.cy} r={g.r} fill="#A88A5A" opacity={0.45} />
            ))}
            <path d="M40 44 q4 -6 8 0 z" fill="#F6F0E3" stroke="#A99A7E" strokeWidth="0.7" />
          </>
        )}
        {kind === 'metamorphic' && (
          <>
            <rect width="64" height="64" fill="#7C8792" />
            {META_BANDS.map((b, i) => (
              <g key={i}>
                <path d={b.d} fill={b.fill} />
                <path d={b.sheen} fill="none" stroke="#EEF1F3" strokeOpacity={0.35} strokeWidth={0.6} />
              </g>
            ))}
          </>
        )}
      </svg>
    </span>
  );
}

// ── Igneous: magma rises; cools slowly at depth (granite) or fast at the surface (basalt) ──
const PLUTON_D =
  'M388 272 C388 242 420 228 452 230 C486 232 508 252 506 276 C504 300 476 310 446 308 C414 306 388 298 388 272 Z';

const PLUTON_CRYSTALS = (() => {
  const rand = rng(11);
  const colors = ['#34312E', '#F7F3EC', '#D29A89', '#F7F3EC', '#9C918A'];
  return Array.from({ length: 120 }, () => {
    const cx = 386 + rand() * 124;
    const cy = 226 + rand() * 86;
    const s = 1.6 + rand() * 2.8;
    const pts = Array.from({ length: 5 }, (_, k) => {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.8;
      const rr = s * (0.6 + rand() * 0.5);
      return `${r1(cx + Math.cos(a) * rr)},${r1(cy + Math.sin(a) * rr)}`;
    }).join(' ');
    return { pts, fill: colors[Math.floor(rand() * colors.length)] };
  });
})();

export function IgneousVisual({ reduce }: { reduce: boolean }) {
  const id = 'geo-ign';
  const { ref, seen } = useSeen();
  const bands: [number, number, string][] = [
    [176, 214, '#DCCBA8'],
    [214, 252, '#CFB98F'],
    [252, 294, '#C2A982'],
    [294, 344, '#B39A74'],
  ];
  return (
    <Svg svgRef={ref} label="איור: מאגמה עולה מעומק האדמה. חלקה מתקררת לאט מתחת לפני השטח והופכת לגרניט, וחלקה פורצת כלבה ומתקררת מהר לבזלת">
      <Defs id={id}>
        <radialGradient id={`${id}-magma`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#F6B24F" />
          <stop offset="0.55" stopColor="#E0662E" />
          <stop offset="1" stopColor="#B63E26" />
        </radialGradient>
        <linearGradient id={`${id}-lava`} gradientUnits="userSpaceOnUse" x1="250" y1="90" x2="60" y2="174">
          <stop offset="0" stopColor="#F6A23C" />
          <stop offset="0.34" stopColor="#E0662E" />
          <stop offset="0.6" stopColor="#8A5A48" />
          <stop offset="0.8" stopColor="#4F4B48" />
          <stop offset="1" stopColor="#45423F" />
        </linearGradient>
        <linearGradient id={`${id}-arm`} gradientUnits="userSpaceOnUse" x1="340" y1="318" x2="408" y2="294">
          <stop offset="0" stopColor="#E0662E" />
          <stop offset="1" stopColor="#D8C8BE" />
        </linearGradient>
        <clipPath id={`${id}-pluton`}>
          <path d={PLUTON_D} />
        </clipPath>
      </Defs>

      <rect x="0" y="0" width={W} height="190" fill={`url(#${id}-sky)`} />
      <BlockShadow />

      <g clipPath={`url(#${id}-block)`} filter={`url(#${id}-paper)`}>
        {bands.map(([y0, y1, fill]) => (
          <rect key={y0} x="16" y={y0} width="528" height={y1 - y0} fill={fill} />
        ))}
        <line x1="16" y1="176" x2="544" y2="176" stroke="#8A9163" strokeWidth="5" />

        {/* Magma chamber at depth */}
        <ellipse cx="260" cy="324" rx="100" ry="36" fill={`url(#${id}-magma)`} />

        <path d="M340 318 Q384 318 408 294" fill="none" stroke={`url(#${id}-arm)`} strokeWidth="11" strokeLinecap="round" />
        {/* Granite: magma that stayed below and cooled slowly into big crystals */}
        <path d={PLUTON_D} fill="#D8C8BE" />
        <g clipPath={`url(#${id}-pluton)`}>
          {PLUTON_CRYSTALS.map((c, i) => (
            <polygon key={i} points={c.pts} fill={c.fill} />
          ))}
        </g>
        <path d={PLUTON_D} fill="none" stroke="#9E8F84" strokeWidth="1.5" />
      </g>

      {/* Volcano cone (stratified) */}
      <g filter={`url(#${id}-paper)`}>
        <polygon points="158,178 248,84 256,90 264,90 272,84 362,178" fill="#8A8176" />
        <polygon points="186,178 252,108 268,108 334,178" fill="#978E83" />
        <polygon points="214,178 254,134 266,134 306,178" fill="#A39A8F" />
      </g>

      {/* Conduit — magma rising from the chamber to the crater */}
      <path d="M252 300 C254 240 250 160 254 92 L266 92 C270 160 266 240 270 300 Z" fill="#E0662E" />
      <path d="M260 296 C261 240 259 160 260 96" fill="none" stroke="#F6B24F" strokeWidth="3" strokeOpacity="0.85" />
      <ellipse cx="260" cy="91" rx="10" ry="3.5" fill="#F6B24F" />
      {[0, 1, 2].map((i) =>
        reduce ? (
          <circle key={i} cx="260" cy={140 + i * 60} r="3.4" fill="#FFD27A" />
        ) : (
          <motion.circle
            key={i}
            cx="260"
            cy="296"
            r="3.4"
            fill="#FFD27A"
            initial={{ opacity: 0 }}
            animate={seen ? { y: [0, -24, -168, -196], opacity: [0, 1, 1, 0] } : undefined}
            transition={{ duration: 2.7, times: [0, 0.12, 0.85, 1], repeat: Infinity, ease: 'easeIn', delay: i * 0.9 }}
          />
        ),
      )}
      {[214, 244].map((y) => (
        <path key={y} d={`M280 ${y + 6} L287 ${y} L294 ${y + 6}`} fill="none" stroke={HEAT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      ))}

      {/* Lava flowing down the flank — hot at the crater, dark basalt where it cooled */}
      <path
        d="M250 90 L212 118 L186 146 L168 166 Q160 174 146 174 L60 174"
        fill="none"
        stroke={`url(#${id}-lava)`}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Steam above the crater */}
      <g fill="#DAD3C9" opacity="0.8">
        <circle cx="262" cy="68" r="7" />
        <circle cx="272" cy="52" r="9" />
        <circle cx="263" cy="34" r="8" />
      </g>

      <Tag x={180} y={100} text="לבה" to={[222, 110]} />
      <Tag x={100} y={140} text="בזלת" to={[100, 172]} />
      <Tag x={446} y={198} text="גרניט" to={[446, 234]} />
      <Tag x={108} y={318} text="מאגמה" to={[164, 318]} />
    </Svg>
  );
}

// ── Sedimentary: grains settle in water, layer on layer, over millions of years ──
const SED_XS = Array.from({ length: 67 }, (_, i) => 16 + i * 8);
const sedBoundary = (base: number, k: number): Pt[] => SED_XS.map((x) => [x, base + Math.sin(x / 37 + k * 1.7) * 2.2]);
const SED_LAYERS = (() => {
  // bottom → top: limestone, marl, sandstone, limestone, fresh sand
  const tops = [300, 262, 222, 186, 158];
  const bottoms = [346, 300, 262, 222, 186];
  const fills = ['#E0D3B6', '#CFC5AE', '#DDBB85', '#ECE2CC', '#E7CF9E'];
  return tops.map((t, i) => ({
    d: bandPath(sedBoundary(t, i), i === 0 ? SED_XS.map((x) => [x, bottoms[0]] as Pt) : sedBoundary(bottoms[i], i - 1)),
    fill: fills[i],
  }));
})();

const SAND_DOTS = (() => {
  const rand = rng(31);
  const out: { cx: number; cy: number; r: number }[] = [];
  const zones: [number, number][] = [
    [226, 258],
    [162, 184],
  ];
  for (const [y0, y1] of zones) {
    for (let i = 0; i < 70; i++) out.push({ cx: r1(24 + rand() * 512), cy: r1(y0 + rand() * (y1 - y0)), r: r1(0.8 + rand() * 0.8) });
  }
  return out;
})();

function Ammonite({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle r="6" fill="#F6F0E3" stroke="#A99A7E" strokeWidth="1.1" />
      <path d="M0 0 m0 -1.6 a1.6 1.6 0 1 1 -1.6 1.6 a3.2 3.2 0 1 1 3.2 3.2 a4.6 4.6 0 0 1 -4.6 -4.6" fill="none" stroke="#A99A7E" strokeWidth="0.9" />
    </g>
  );
}

function Scallop({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 4 L-7 -2 Q0 -9 7 -2 Z" fill="#F6F0E3" stroke="#A99A7E" strokeWidth="1" strokeLinejoin="round" />
      <path d="M0 4 L-3.5 -5 M0 4 L0 -5.5 M0 4 L3.5 -5" stroke="#A99A7E" strokeWidth="0.7" />
    </g>
  );
}

const FALLING = [
  { x: 64, kind: 0 },
  { x: 104, kind: 1 },
  { x: 142, kind: 0 },
  { x: 184, kind: 2 },
  { x: 222, kind: 0 },
  { x: 262, kind: 1 },
  { x: 300, kind: 0 },
  { x: 338, kind: 2 },
  { x: 376, kind: 0 },
  { x: 414, kind: 1 },
  { x: 452, kind: 0 },
  { x: 492, kind: 1 },
];

function Grain({ kind }: { kind: number }) {
  if (kind === 2) return <path d="M0 3.4 L-5.4 -1.3 Q0 -6.8 5.4 -1.3 Z" fill="#F6F0E3" stroke="#A99A7E" strokeWidth="0.9" />;
  return <circle r={kind === 0 ? 3.1 : 2.4} fill={kind === 0 ? '#C9A56B' : '#9E9383'} />;
}

export function SedimentVisual({ reduce }: { reduce: boolean }) {
  const id = 'geo-sed';
  const { ref, seen } = useSeen();
  return (
    <Svg svgRef={ref} label="איור: חול ושרידי בעלי חיים שוקעים במים ומצטברים לשכבות. השכבות נדחסות לאורך מיליוני שנים לסלעי משקע — גיר, חוואר ואבן חול">
      <Defs id={id}>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D5E7EC" />
          <stop offset="1" stopColor="#A9CCD8" />
        </linearGradient>
        <clipPath id={`${id}-basin`}>
          <rect x="16" y="40" width="528" height="300" rx="18" />
        </clipPath>
      </Defs>
      <BlockShadow />

      <g clipPath={`url(#${id}-basin)`} filter={`url(#${id}-paper)`}>
        <rect x="16" y="40" width="528" height="134" fill={`url(#${id}-water)`} />
        <path
          d={`M16 46 ${Array.from({ length: 22 }, (_, i) => `q6 -4 12 0 q6 4 12 0`).join(' ')}`}
          fill="none"
          stroke="#7FB4C6"
          strokeWidth="2"
          strokeOpacity="0.8"
        />

        {SED_LAYERS.map((l, i) =>
          reduce ? (
            <path key={i} d={l.d} fill={l.fill} />
          ) : (
            <motion.path
              key={i}
              d={l.d}
              fill={l.fill}
              initial={{ opacity: 0, y: -14 }}
              animate={seen ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.55, ease: EASE, delay: 0.1 + i * 0.16 }}
            />
          ),
        )}
        {SAND_DOTS.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="#B08F5A" opacity={0.5} />
        ))}
        {/* marl — fine clay streaks */}
        {[60, 150, 240, 330, 420, 500].map((x, i) => (
          <line key={x} x1={x} y1={276 + (i % 2) * 10} x2={x + 22} y2={276 + (i % 2) * 10} stroke="#B3A890" strokeWidth="1.2" strokeLinecap="round" />
        ))}
        {/* fossils embedded in the limestone layers */}
        <Ammonite x={188} y={204} s={0.95} />
        <Scallop x={300} y={206} />
        <Scallop x={404} y={202} s={0.9} />
        <Ammonite x={170} y={322} />
        <Scallop x={262} y={324} s={1.1} />
        <Ammonite x={352} y={320} s={0.85} />
      </g>

      {/* Particles drifting down and settling on the newest layer */}
      {FALLING.map((p, i) => {
        const staticY = 70 + ((i * 37) % 92);
        return reduce ? (
          <g key={i} transform={`translate(${p.x} ${staticY})`}>
            <Grain kind={p.kind} />
          </g>
        ) : (
          <motion.g
            key={i}
            initial={{ x: p.x, y: 58, opacity: 0 }}
            animate={
              seen
                ? { x: [p.x, p.x + (i % 2 ? 3 : -3), p.x + (i % 2 ? -2 : 2), p.x], y: [58, 74, 146, 158], opacity: [0, 1, 1, 0] }
                : undefined
            }
            transition={{
              duration: 3.6 + (i % 3) * 0.5,
              times: [0, 0.15, 0.85, 1],
              repeat: Infinity,
              ease: 'linear',
              delay: (i * 0.43) % 3.2,
            }}
          >
            <Grain kind={p.kind} />
          </motion.g>
        );
      })}

      {/* Time — the pile grows upward over millions of years */}
      <line x1="522" y1="332" x2="522" y2="176" stroke={INK_SOFT} strokeWidth="2.2" strokeLinecap="round" />
      <polygon points="522,162 515,178 529,178" fill={INK_SOFT} />

      <Tag x={96} y={204} text="גיר" />
      <Tag x={96} y={242} text="אבן חול" />
      <Tag x={96} y={281} text="חוואר" />
      <Tag x={462} y={250} text="מיליוני שנים" />
    </Svg>
  );
}

// ── Metamorphic: existing rock + heat + pressure → folded, banded rock ──
const META_XS = Array.from({ length: 41 }, (_, i) => 64 + i * 6); // 64..304
const metaLine = (base: number, t: number): Pt[] =>
  META_XS.map((x) => [x, base - t * 18 * Math.sin(((x - 64) / 240) * Math.PI * 2.5)]);
const META_FILLS = ['#6B7784', '#A9B2BB', '#5D6874', '#C4CAD0', '#75818D', '#9EA8B1', '#5A6570'];
const metaBands = (t: number) =>
  META_FILLS.map((fill, j) => ({
    d: bandPath(metaLine(116 + j * 24, t), metaLine(140 + j * 24, t)),
    sheen: linePath(metaLine(128 + j * 24, t)),
    fill,
  }));
const META_FLAT = metaBands(0);
const META_FOLDED = metaBands(1);

function HeatArrow({ x }: { x: number }) {
  return (
    <g stroke={HEAT} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${x} 346 q-5 -5 0 -10 q5 -5 0 -10 q-5 -5 0 -8`} />
      <path d={`M${x - 6} 324 L${x} 316 L${x + 6} 324`} />
    </g>
  );
}

export function MetamorphicVisual({ reduce }: { reduce: boolean }) {
  const id = 'geo-meta';
  const { ref, seen } = useSeen();
  const t = { duration: reduce ? 0 : 1.1, ease: EASE, delay: reduce ? 0 : 0.35 };
  return (
    <Svg svgRef={ref} label="איור: סלעים קיימים עוברים התמרה בעומק האדמה — חום מלמטה ולחץ מהצדדים מקפלים את השכבות לסלע מותמר בעל פסים">
      <Defs id={id}>
        <linearGradient id={`${id}-depth`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F1E8DA" />
          <stop offset="1" stopColor="#E6CDB2" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#E58F63" stopOpacity="0.5" />
          <stop offset="1" stopColor="#E58F63" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-before`}>
          <rect x="420" y="196" width="110" height="90" rx="8" />
        </clipPath>
      </Defs>

      <rect x="16" y="16" width="528" height="328" rx="18" fill={`url(#${id}-depth)`} />
      <ellipse cx="184" cy="336" rx="170" ry="40" fill={`url(#${id}-glow)`} />

      {/* Before — existing, flat-layered rock */}
      <g filter={`url(#${id}-paper)`}>
        <g clipPath={`url(#${id}-before)`}>
          {['#E7CF9E', '#D9C09A', '#ECE2CC', '#CFC5AE', '#DDBB85'].map((fill, i) => (
            <rect key={fill} x="420" y={196 + i * 18} width="110" height="18" fill={fill} />
          ))}
        </g>
      </g>

      {/* Transformation */}
      <line x1="412" y1="258" x2="330" y2="258" stroke={INK_SOFT} strokeWidth="2.2" strokeDasharray="6 5" strokeLinecap="round" />
      <polygon points="316,258 332,250 332,266" fill={INK_SOFT} />

      {/* After — the same layers, squeezed and folded into banded rock */}
      <g filter={`url(#${id}-paper)`}>
        {META_FOLDED.map((b, j) =>
          reduce ? (
            <g key={j}>
              <path d={b.d} fill={b.fill} />
              <path d={b.sheen} fill="none" stroke="#EEF1F3" strokeOpacity={0.4} strokeWidth={1} />
            </g>
          ) : (
            <g key={j}>
              <motion.path initial={{ d: META_FLAT[j].d }} animate={{ d: seen ? b.d : META_FLAT[j].d }} transition={t} fill={b.fill} />
              <motion.path
                initial={{ d: META_FLAT[j].sheen }}
                animate={{ d: seen ? b.sheen : META_FLAT[j].sheen }}
                transition={t}
                fill="none"
                stroke="#EEF1F3"
                strokeOpacity={0.4}
                strokeWidth={1}
              />
            </g>
          ),
        )}
      </g>

      {/* Pressure →← from both sides */}
      <motion.polygon
        points={arrowPoints(18, 200, 58, 200, 10, 18, 26)}
        fill={INK_SOFT}
        initial={reduce ? false : { x: -14 }}
        animate={{ x: seen || reduce ? 0 : -14 }}
        transition={t}
      />
      <motion.polygon
        points={arrowPoints(350, 200, 310, 200, 10, 18, 26)}
        fill={INK_SOFT}
        initial={reduce ? false : { x: 14 }}
        animate={{ x: seen || reduce ? 0 : 14 }}
        transition={t}
      />

      {/* Heat ↑ from below */}
      {[124, 184, 244].map((x) => (
        <HeatArrow key={x} x={x} />
      ))}

      <Tag x={38} y={170} text="לחץ" />
      <Tag x={330} y={170} text="לחץ" />
      <Tag x={296} y={330} text="חום" />
      <Tag x={372} y={284} text="התמרה" />
      <Tag x={475} y={312} text="סלעים קיימים" />
    </Svg>
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

export function EndogenicVisual({ reduce }: { reduce: boolean }) {
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

export function ExogenicVisual({ reduce }: { reduce: boolean }) {
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
