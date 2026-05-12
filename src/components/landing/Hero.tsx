'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import {
  motion,
  useMotionValue,
  animate,
  useReducedMotion,
  type AnimationPlaybackControls,
} from 'framer-motion';
import {
  ArrowLeft,
  Mountain,
  Layers as LayersIcon,
  Sparkles,
  RotateCcw,
  Move3D,
} from 'lucide-react';
import { lessons, totalDuration } from '@/lib/lessons';
import { cn } from '@/lib/utils';

const easeSnap = [0.22, 1, 0.36, 1] as const;
const ORANGE = '#EB9E48';
const ORANGE_DARK = '#B17736';
const SAGE = '#749C75';
const SAGE_DARK = '#5B7C5C';

const STATS = [
  { value: String(lessons.length), label: 'שיעורים אינטראקטיביים', Icon: LayersIcon },
  { value: `${Math.round(totalDuration / 60)}+`, label: 'שעות לימוד ותרגול', Icon: Mountain },
  { value: '100%', label: 'סימולציות וניתוח שטח', Icon: Sparkles },
];

const VIEWS = {
  iso: { x: -22, y: 34, label: 'ISO' },
  top: { x: -86, y: 0, label: 'TOP' },
  side: { x: -6, y: 80, label: 'SIDE' },
  front: { x: -8, y: 0, label: 'FRONT' },
} as const;

type ViewKey = keyof typeof VIEWS;

export function Hero() {
  const reduce = useReducedMotion();
  const firstLessonHref = `/lessons/${lessons[0].id}/`;

  return (
    <section
      id="hero"
      className="relative overflow-hidden pt-16 pb-8 md:pt-20 md:pb-12"
      aria-labelledby="hero-title"
    >
      <div className="relative max-w-6xl mx-auto px-6 grid lg:grid-cols-[1.05fr_1fr] items-center gap-6 lg:gap-10">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
          }}
          className="relative z-10"
        >
          <motion.div variants={fadeUp(!!reduce)} className="mb-4 inline-flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2.5 text-sm md:text-[15px] font-display font-semibold tracking-wider uppercase text-accent-hover">
              <span className="size-2 rounded-full bg-accent animate-pulse" />
              SECTOR · 04
            </span>
            <span className="h-px w-10 bg-fg/15" aria-hidden />
            <span className="text-sm md:text-[15px] font-display font-semibold tracking-wider uppercase text-fg-muted">
              GEO·INT COURSE
            </span>
          </motion.div>

          <motion.h1
            id="hero-title"
            variants={fadeUp(!!reduce)}
            className="font-display font-bold tracking-tight leading-[0.92]"
          >
            <span className="block text-[clamp(1rem,2vw,1.5rem)] font-medium text-fg-muted mb-2 tracking-[0.04em]">
              קוראים את
            </span>

            <span className="relative block">
              <span
                aria-hidden
                className="absolute inset-0 select-none translate-x-1 translate-y-1 text-transparent"
                style={{
                  WebkitTextStroke: '1px rgba(177,119,54,0.35)',
                  fontSize: 'clamp(2.25rem, 7vw, 5rem)',
                  lineHeight: '0.92',
                }}
              >
                השטח.
              </span>
              <span
                className="relative inline-block"
                style={{
                  color: ORANGE,
                  fontSize: 'clamp(2.25rem, 7vw, 5rem)',
                  lineHeight: '0.92',
                  textShadow: '0 10px 40px rgba(235,158,72,0.22)',
                }}
              >
                השטח<span className="text-fg">.</span>
              </span>
            </span>

            <span className="block mt-3 text-[clamp(1rem,2vw,1.625rem)] font-medium text-fg-muted tracking-[0.02em]">
              <span className="text-brand-dark">לפני</span> שצועדים בו.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp(!!reduce)}
            className="mt-4 max-w-xl text-sm md:text-base text-fg-muted leading-relaxed text-pretty"
          >
            קורס אינטראקטיבי שמלמד איך המרחב הפיזי מעצב אסטרטגיה, תמרון ואיסוף מודיעין.
            סימולציות, תרגול ומשוב — מהבסיס ועד GEOINT מבצעי.
          </motion.p>

          <motion.div variants={fadeUp(!!reduce)} className="mt-5 flex flex-wrap gap-2.5">
            <Link
              href={firstLessonHref}
              className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium text-fg bg-accent hover:bg-accent-hover hover:text-bg-elevated transition-all duration-300 shadow-glow"
            >
              <span>התחלת הקורס</span>
              <ArrowLeft
                className="size-4 transition-transform duration-300 group-hover:-translate-x-1"
                aria-hidden
              />
            </Link>
            <a
              href="#features"
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium text-brand-dark border border-brand/40 hover:border-brand hover:bg-brand/10 transition-all duration-300"
            >
              <span className="size-1.5 rounded-full bg-brand animate-pulse" aria-hidden />
              <span>מה לומדים בקורס</span>
            </a>
          </motion.div>

          <motion.div
            variants={fadeUp(!!reduce)}
            className="mt-6 grid grid-cols-3 max-w-sm gap-2.5 sm:gap-3"
          >
            {STATS.map(({ value, label, Icon }) => (
              <div
                key={label}
                className="relative rounded-xl border border-border bg-bg-elevated px-3 py-2.5 sm:px-3.5 sm:py-3 overflow-hidden"
              >
                <Icon className="size-3.5 text-fg-dim mb-1.5" aria-hidden />
                <div className="font-display font-bold text-lg sm:text-xl text-fg">{value}</div>
                <div className="mt-0.5 text-[11px] sm:text-xs text-fg-muted leading-snug">
                  {label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <div className="relative aspect-square w-full max-w-[260px] sm:max-w-[310px] mx-auto lg:mx-0 lg:justify-self-end">
          <TerrainDiorama reduce={!!reduce} />
        </div>
      </div>
    </section>
  );
}

function fadeUp(reduce: boolean) {
  if (reduce) return { hidden: { opacity: 1 }, show: { opacity: 1 } };
  return {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: easeSnap } },
  };
}

/* ─────────────── Terrain Diorama (interactive 3D) ─────────────── */

type Contour = { d: string; top: string; side: string };

const CONTOURS: Contour[] = [
  // Base — warm sand cream, page-aware
  { d: 'M 60 280 Q 80 200, 140 180 T 280 180 Q 360 200, 360 280 Q 340 340, 260 350 T 100 340 Q 50 320, 60 280 Z', top: '#f7e0b8', side: '#d8b97e' },
  // Deeper sand
  { d: 'M 80 270 Q 100 200, 150 185 T 270 185 Q 340 205, 345 275 Q 325 330, 250 340 T 110 330 Q 70 310, 80 270 Z', top: '#e8cc97', side: '#bf9d5f' },
  // Sand → sage transition
  { d: 'M 100 260 Q 120 200, 160 190 T 260 190 Q 320 210, 325 265 Q 310 320, 240 330 T 130 320 Q 95 305, 100 260 Z', top: '#c8c389', side: '#959058' },
  // Light sage
  { d: 'M 120 255 Q 138 205, 170 195 T 250 195 Q 300 215, 305 255 Q 295 305, 230 318 T 145 308 Q 115 295, 120 255 Z', top: '#9bb389', side: '#6c8559' },
  // Brand sage
  { d: 'M 138 250 Q 155 215, 180 205 T 240 205 Q 280 225, 285 250 Q 280 295, 220 305 T 160 297 Q 132 285, 138 250 Z', top: '#749C75', side: '#5B7C5C' },
  // Sage → orange transition
  { d: 'M 155 245 Q 170 225, 195 215 T 230 215 Q 260 235, 263 250 Q 258 285, 215 292 T 175 287 Q 150 275, 155 245 Z', top: '#b08c50', side: '#7e6332' },
  // Primary orange
  { d: 'M 175 245 Q 188 233, 205 228 T 222 228 Q 240 240, 240 252 Q 236 275, 213 280 T 188 278 Q 170 268, 175 245 Z', top: '#EB9E48', side: '#B17736' },
  // Peak — warmed-up orange
  { d: 'M 192 245 Q 200 240, 212 238 T 218 238 Q 226 246, 224 254 Q 220 270, 208 273 T 196 270 Q 187 264, 192 245 Z', top: '#f5b865', side: '#d18540' },
];

const LAYER_THICKNESS = 22;
const BASE_Z = 20;
const SHEETS_PER_LAYER = 5;

function lerpHex(a: string, b: string, t: number) {
  const parse = (h: string) => {
    const x = h.replace('#', '');
    return [
      parseInt(x.substring(0, 2), 16),
      parseInt(x.substring(2, 4), 16),
      parseInt(x.substring(4, 6), 16),
    ];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(ar + (br - ar) * t)}${toHex(ag + (bg - ag) * t)}${toHex(ab + (bb - ab) * t)}`;
}

function TerrainDiorama({ reduce }: { reduce: boolean }) {
  const rotX = useMotionValue(VIEWS.iso.x);
  const rotY = useMotionValue(VIEWS.iso.y);

  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0, t: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const idleResume = useRef<ReturnType<typeof setTimeout> | null>(null);
  const driftCtrl = useRef<AnimationPlaybackControls | null>(null);

  const startIdleDrift = () => {
    if (reduce) return;
    stopIdleDrift();
    const current = rotY.get();
    driftCtrl.current = animate(rotY, current + 60, {
      duration: 30,
      ease: 'linear',
      repeat: Infinity,
      repeatType: 'mirror',
    });
  };
  const stopIdleDrift = () => {
    driftCtrl.current?.stop();
    driftCtrl.current = null;
  };
  const scheduleResumeDrift = (ms = 2500) => {
    if (idleResume.current) clearTimeout(idleResume.current);
    idleResume.current = setTimeout(() => {
      if (!dragging.current) startIdleDrift();
    }, ms);
  };

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(startIdleDrift, 1400);
    return () => {
      clearTimeout(t);
      stopIdleDrift();
      if (idleResume.current) clearTimeout(idleResume.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    velocity.current = { x: 0, y: 0 };
    stopIdleDrift();
    if (idleResume.current) clearTimeout(idleResume.current);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    const dt = Math.max(1, e.timeStamp - lastPointer.current.t);

    velocity.current = { x: dx / dt, y: dy / dt };

    const nextX = clamp(rotX.get() - dy * 0.45, -90, 30);
    const nextY = rotY.get() + dx * 0.55;
    rotX.set(nextX);
    rotY.set(nextY);

    lastPointer.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);

    const vx = velocity.current.x;
    const vy = velocity.current.y;

    if (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) {
      animate(rotY, rotY.get(), {
        type: 'inertia',
        velocity: vx * 700,
        power: 0.55,
        timeConstant: 320,
      });
      animate(rotX, rotX.get(), {
        type: 'inertia',
        velocity: -vy * 700,
        power: 0.55,
        timeConstant: 320,
        min: -90,
        max: 30,
      });
    }

    scheduleResumeDrift(2800);
  };

  const snapTo = (view: ViewKey) => {
    stopIdleDrift();
    if (idleResume.current) clearTimeout(idleResume.current);
    animate(rotX, VIEWS[view].x, { duration: 0.9, ease: easeSnap });
    animate(rotY, VIEWS[view].y, { duration: 0.9, ease: easeSnap });
    scheduleResumeDrift(4500);
  };

  const reset = () => snapTo('iso');

  return (
    <div className="absolute inset-0">
      <ViewControls onSnap={snapTo} onReset={reset} />
      <DragHint />

      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.85, ease: easeSnap, delay: 0.15 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="size-full cursor-grab active:cursor-grabbing select-none"
        style={{ perspective: '1500px', touchAction: 'none' }}
      >
        <motion.div
          style={{
            rotateX: rotX,
            rotateY: rotY,
            transformStyle: 'preserve-3d',
            transformOrigin: '50% 55%',
          }}
          className="relative size-full"
        >
          <GroundShadow rotX={rotX} />
          <BasePlatform />

          {CONTOURS.map((c, i) => (
            <PrismLayer
              key={i}
              d={c.d}
              baseZ={BASE_Z + i * LAYER_THICKNESS}
              height={LAYER_THICKNESS}
              topColor={c.top}
              sideColor={c.side}
            />
          ))}

          <PeakMarker
            tz={BASE_Z + CONTOURS.length * LAYER_THICKNESS + 18}
          />

          <FloatingLabel x="6%"  y="14%" tz={120} label="ELEV"    value="842 m" />
          <FloatingLabel x="70%" y="10%" tz={140} label="GRID"    value="WGS·84" accent="cool" />
          <FloatingLabel x="10%" y="80%" tz={90}  label="CONTOUR" value="20 m" />
          <FloatingLabel x="68%" y="84%" tz={70}  label="AOR"     value="07"    accent="intel" />
        </motion.div>
      </motion.div>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function PrismLayer({
  d,
  baseZ,
  height,
  topColor,
  sideColor,
}: {
  d: string;
  baseZ: number;
  height: number;
  topColor: string;
  sideColor: string;
}) {
  const sheets = SHEETS_PER_LAYER;
  const elements = [];
  for (let i = 0; i < sheets; i++) {
    const t = sheets === 1 ? 1 : i / (sheets - 1);
    const z = baseZ + t * height;
    const color = lerpHex(sideColor, topColor, t);
    const isTop = i === sheets - 1;
    elements.push(
      <svg
        key={i}
        viewBox="0 0 420 420"
        className="absolute inset-0 size-full"
        style={{
          transform: `translateZ(${z.toFixed(2)}px)`,
          filter: isTop ? 'drop-shadow(0 8px 14px rgba(15,23,42,0.10))' : undefined,
        }}
      >
        <path
          d={d}
          fill={color}
          stroke={isTop ? 'rgba(15,23,42,0.18)' : 'none'}
          strokeWidth={isTop ? 0.8 : 0}
        />
        {isTop && (
          <path
            d={d}
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={0.6}
            transform="translate(0 -1)"
            opacity={0.6}
          />
        )}
      </svg>
    );
  }
  return <>{elements}</>;
}

function BasePlatform() {
  return (
    <svg
      viewBox="0 0 420 420"
      className="absolute inset-0 size-full"
      style={{
        transform: 'translateZ(0px)',
        filter: 'drop-shadow(0 24px 30px rgba(15,23,42,0.10))',
      }}
    >
      <defs>
        <radialGradient id="basePlate" cx="50%" cy="60%" r="55%">
          <stop offset="0%" stopColor="#FFE5C2" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFD0A0" stopOpacity="1" />
        </radialGradient>
        <pattern id="baseGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#5B7C5C" strokeOpacity="0.18" strokeWidth="0.5" />
        </pattern>
      </defs>
      <path
        d="M 30 280 Q 60 180, 160 160 T 380 200 Q 400 280, 360 360 T 100 360 Q 30 340, 30 280 Z"
        fill="url(#basePlate)"
        stroke="#C5A06A"
        strokeWidth="1.25"
      />
      <path
        d="M 30 280 Q 60 180, 160 160 T 380 200 Q 400 280, 360 360 T 100 360 Q 30 340, 30 280 Z"
        fill="url(#baseGrid)"
      />
    </svg>
  );
}

function GroundShadow({ rotX }: { rotX: ReturnType<typeof useMotionValue> }) {
  return (
    <motion.div
      aria-hidden
      style={{
        opacity: rotX,
        transform: 'translateZ(-30px) rotateX(90deg)',
      }}
      className="absolute left-1/2 top-[78%] -translate-x-1/2 w-[80%] h-12 rounded-[50%] blur-2xl bg-fg/25"
    />
  );
}

function PeakMarker({ tz }: { tz: number }) {
  return (
    <div
      aria-hidden
      className="absolute left-[48%] top-[58%]"
      style={{ transform: `translateZ(${tz}px)` }}
    >
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0 -m-3 rounded-full bg-accent/30 blur-md animate-pulse" />
        <div className="relative size-2.5 rounded-full bg-accent ring-2 ring-bg" />
      </div>
    </div>
  );
}

function FloatingLabel({
  x,
  y,
  tz,
  label,
  value,
  accent = 'gold',
}: {
  x: string;
  y: string;
  tz: number;
  label: string;
  value: string;
  accent?: 'gold' | 'cool' | 'intel';
}) {
  const dot =
    accent === 'cool'
      ? 'bg-brand'
      : accent === 'intel'
        ? 'bg-brand-dark'
        : 'bg-accent';
  return (
    <div className="absolute" style={{ left: x, top: y, transform: `translateZ(${tz}px)` }}>
      <div className="flex items-center gap-2 rounded-md border border-border bg-bg-elevated/95 backdrop-blur px-2 py-1.5 shadow-elevated">
        <span className={cn('size-1.5 rounded-full', dot)} aria-hidden />
        <div className="text-right leading-tight">
          <div className="text-[8px] font-mono tracking-[0.18em] uppercase text-fg-dim">
            {label}
          </div>
          <div className="text-[11px] font-mono tracking-wider text-fg">{value}</div>
        </div>
      </div>
    </div>
  );
}

function ViewControls({
  onSnap,
  onReset,
}: {
  onSnap: (v: ViewKey) => void;
  onReset: () => void;
}) {
  const views: ViewKey[] = ['iso', 'top', 'side', 'front'];
  return (
    <div className="absolute top-2 left-2 z-20 flex flex-col items-end gap-1">
      <div className="flex items-center gap-1 rounded-md border border-border bg-bg-elevated/90 backdrop-blur p-1 shadow-elevated">
        {views.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onSnap(v)}
            className="px-2 py-1 rounded text-[10px] font-mono tracking-[0.18em] uppercase text-fg-muted hover:text-fg hover:bg-bg-accent transition-colors"
          >
            {VIEWS[v].label}
          </button>
        ))}
        <span className="mx-0.5 h-4 w-px bg-border-subtle" aria-hidden />
        <button
          type="button"
          onClick={onReset}
          aria-label="איפוס זווית"
          className="grid place-items-center size-6 rounded text-fg-muted hover:text-fg hover:bg-bg-accent transition-colors"
        >
          <RotateCcw className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function DragHint() {
  return (
    <div className="absolute bottom-2 right-2 z-20 pointer-events-none">
      <div className="flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated/85 backdrop-blur px-2 py-1 shadow-elevated">
        <Move3D className="size-3 text-accent" aria-hidden />
        <span className="text-[10px] font-mono tracking-[0.15em] uppercase text-fg-muted">
          DRAG · ROTATE
        </span>
      </div>
    </div>
  );
}
