'use client';
/**
 * RockVisuals — photographic time-lapses for "3 סוגי הסלעים" (GeologyScene).
 *
 * Each rock family has two real-looking photographs of the same place from the
 * same camera (design/handoff/rock-types-film): START (the process) and END
 * (the rock it leaves behind). Instead of a generated video — which reached the
 * end state too abruptly — a WebGL shader performs the process between them at
 * a readable pace, stage by stage:
 *
 *   igneous      the lava keeps glowing, then crusts over from the toe of the flow
 *                back to the vent (brightest cores last); only then does morning
 *                light arrive over the black basalt field.
 *   sediment     silt keeps drifting in the bay while the sea floor rises layer by
 *                layer, pausing at each bedding plane, until the layered bank of
 *                the END photo stands where the water was.
 *   metamorphic  the flat beds are bent (a real image warp, not a cross-fade) into
 *                the folds of the END photo while pressure arrows push from both
 *                sides, heat shimmers at the base and the colours turn to marble
 *                and slate.
 *
 * The film plays once when the board comes into view; a play/pause button and a
 * scrubber let the learner replay it or move through it at their own pace.
 * Labels live on an SVG overlay in the photos' 640 × 360 frame and appear with
 * their stage. Photos are never mirrored for RTL. Reduced motion opens on the
 * finished state with no autoplay (the scrubber still works).
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { INK_SOFT, Tag, arrowPoints } from './GeologyVisuals';
import { createTimelapse, type Timelapse } from './rockTimelapseGL';
import { cn } from '@/lib/utils';

export type RockKind = 'igneous' | 'sediment' | 'metamorphic';
type Pt = readonly [number, number];

const BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/scene-geology`;
const photoUrl = (kind: RockKind, which: 'start' | 'end') => `${BASE}/${kind}-${which}.webp`;
const VB_W = 640;
const VB_H = 360;
/** photo-fraction → overlay viewBox */
const at = (u: number, v: number): Pt => [u * VB_W, v * VB_H];

const ease = (x: number) => x * x * (3 - 2 * x);
const seg = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));

// ── sediment: the sea floor rises bed by bed ──────────────────────────────────
// [progress window, top of the deposit (photo y, 1 = bottom)] — each bedding plane of
// the END photo is a stop, so the layers visibly pile up one on another.
const SED_STEPS: [number, number, number][] = [
  [0.12, 0.2, 0.84], // wadi floor
  [0.22, 0.3, 0.73], // lower marl
  [0.32, 0.41, 0.6], // limestone with fossils
  [0.43, 0.52, 0.47], // sandstone
  [0.54, 0.62, 0.38], // marl
  [0.64, 0.72, 0.27], // top limestone
  [0.74, 0.84, 0.12], // the land above
];
const sedLevel = (p: number) => SED_STEPS.reduce((y, [a, b, target]) => y + (target - y) * ease(seg(p, a, b)), 1.02);
const SED_LEVEL_GLSL = `float level(float p) {
  float y = 1.02;
${SED_STEPS.map(([a, b, target]) => `  y = mix(y, ${target.toFixed(3)}, ease(seg(p, ${a.toFixed(3)}, ${b.toFixed(3)})));`).join('\n')}
  return y;
}`;

// "down(a, b, x)": 1 below a, 0 above b (GLSL smoothstep needs edge0 < edge1)
const DOWN = 'float down(float a, float b, float x) { return 1.0 - smoothstep(a, b, x); }\n';

const SHADERS: Record<RockKind, string> = {
  igneous: `${DOWN}
void main() {
  vec2 uv = v;
  vec3 a = texture2D(uA, uv).rgb;
  vec3 b = texture2D(uB, uv).rgb;
  float lum = dot(a, vec3(0.299, 0.587, 0.114));
  // molten rock = the saturated orange/red pixels of the dusk photo
  float hot = smoothstep(0.15, 0.4, a.r - max(a.g * 0.6, a.b));
  // the cooling front runs up the flow, from its toe back to the vent; bright cores crust over last
  vec2 toe = vec2(0.97, 0.88);
  vec2 vent = vec2(0.25, 0.19);
  vec2 d = vent - toe;
  float s = clamp(dot(uv - toe, d) / dot(d, d), 0.0, 1.0);
  float front = seg(uP, 0.16, 0.64) * 1.35 - s - lum * 0.3 + (fbm(uv * 9.0) - 0.5) * 0.14;
  float k = smoothstep(0.0, 0.25, front);
  // still molten: the glow breathes
  float breathe = 0.09 * sin(uT * 2.3 + fbm(uv * 7.0 + uT * 0.12) * 9.0);
  vec3 live = a * (1.0 + hot * (1.0 - k) * breathe);
  // crusting: orange -> dull red -> the cooled basalt of the END photo, still in dusk light
  vec3 ember = vec3(lum * 0.62, lum * 0.13, lum * 0.05);
  vec3 basaltDusk = b * vec3(0.34, 0.36, 0.44);
  vec3 cooled = mix(ember, basaltDusk, smoothstep(0.35, 1.0, k));
  vec3 col = mix(live, cooled, hot * smoothstep(0.0, 0.45, k));
  // time passes: morning light arrives, sky first, then the ground
  float day = seg(uP, 0.62, 0.9);
  float n = fbm(uv * 2.5 + 7.0);
  float m = smoothstep(0.0, 0.3, day * 1.6 - uv.y * 0.4 - n * 0.3);
  gl_FragColor = vec4(mix(col, b, m), 1.0);
}`,
  sediment: `${DOWN}${SED_LEVEL_GLSL}
void main() {
  vec2 uv = v;
  float L = level(uP);
  // silt keeps drifting in the plume until it is buried
  float plume = smoothstep(0.36, 0.46, uv.y) * down(0.66, 0.8, uv.y) * down(0.5, 0.82, uv.x);
  vec2 drift = vec2(fbm(uv * vec2(5.0, 9.0) + vec2(uT * 0.07, 0.0)), fbm(uv * vec2(5.0, 9.0) + vec2(3.7, -uT * 0.05))) - 0.5;
  vec3 a = texture2D(uA, uv + drift * 0.014 * plume).rgb;
  vec3 b = texture2D(uB, uv).rgb;
  // an uneven, drifting sea floor rather than a ruled line
  float edge = L + (fbm(vec2(uv.x * 3.2, 2.3 + uT * 0.03)) - 0.5) * 0.05 + (noise(vec2(uv.x * 18.0, 7.1)) - 0.5) * 0.012;
  float below = smoothstep(edge - 0.012, edge + 0.012, uv.y);
  float settle = seg(uP, 0.84, 0.95);
  // just-settled sediment: pale and sandy, not yet rock
  float fresh = down(0.0, 0.08, uv.y - edge) * below * (1.0 - settle);
  vec3 silt = vec3(0.8, 0.71, 0.55) * (0.82 + 0.36 * fbm(uv * 60.0));
  vec3 rock = mix(b, silt, fresh * 0.6);
  // the water above the rising floor turns shallow and milky
  float shallow = down(0.0, 0.14, edge - uv.y) * (1.0 - below);
  vec3 sea = mix(a, mix(a, vec3(0.72, 0.7, 0.58), 0.45), shallow);
  vec3 col = mix(sea, rock, below);
  // finally the landscape above the top bed settles in
  col = mix(col, b, ease(settle) * (1.0 - below));
  gl_FragColor = vec4(col, 1.0);
}`,
  metamorphic: `${DOWN}
// vertical offset (photo y) of the END photo's folded beds relative to flat beds
float fold(float x) { return -0.15 * gauss(x, 0.3, 0.1) + 0.21 * gauss(x, 0.61, 0.09) - 0.1 * gauss(x, 0.83, 0.07); }
void main() {
  vec2 uv = v;
  float m = ease(seg(uP, 0.16, 0.8));
  float heat = seg(uP, 0.08, 0.3) * (1.0 - seg(uP, 0.82, 0.98));
  // heat shimmer rising off the base of the face
  float base = smoothstep(0.62, 0.86, uv.y);
  uv.x += sin(uv.y * 95.0 + uT * 5.0) * 0.0016 * heat * base;
  float face = smoothstep(0.11, 0.18, uv.x) * down(0.87, 0.94, uv.x) * smoothstep(0.15, 0.24, uv.y) * down(0.8, 0.9, uv.y);
  float d = fold(uv.x) * face;
  // START's flat beds bend into the fold while END starts "unfolded" and relaxes into its real folds
  vec3 a = texture2D(uA, uv - vec2(0.0, d * m)).rgb;
  vec3 b = texture2D(uB, uv + vec2(0.0, d * (1.0 - m))).rgb;
  vec3 col = mix(a, b, ease(seg(uP, 0.36, 0.78)));
  col += vec3(0.07, 0.025, 0.0) * heat * base;
  gl_FragColor = vec4(col, 1.0);
}`,
};

type Label = { text: string; x: number; y: number; to?: Pt; from: number; until?: number };
type Film = { duration: number; description: string; labels: Label[] };

const FILMS: Record<RockKind, Film> = {
  igneous: {
    duration: 11000,
    description:
      'צילום בהילוך מהיר: זרם לבה זוהר יורד מהר געש בשעת בין ערביים, מתקרר ומתקשה מקצה הזרם עד פתח ההר, ובאור הבוקר נשאר שדה של בזלת שחורה, קשה וחשופה',
    labels: [
      { text: 'הר געש', x: 78, y: 46, to: at(0.225, 0.235), from: 0.02 },
      { text: 'לבה', x: 190, y: 252, to: at(0.44, 0.61), from: 0.05, until: 0.6 },
      { text: 'בזלת', x: 190, y: 252, to: at(0.44, 0.61), from: 0.72 },
    ],
  },
  sediment: {
    duration: 12000,
    description:
      'צילום בהילוך מהיר: נחל מזרים חול וטין אל מפרץ רדוד. לאורך מיליוני שנים השכבות שוקעות זו על גבי זו, עד שהים נעלם ובערוץ נחשף מצוק של שכבות משקע: גיר עם מאובנים, אבן חול וחוואר',
    labels: [
      { text: 'גיר', x: 300, y: 0.665 * VB_H, from: 0.41 },
      { text: 'אבן חול', x: 300, y: 0.535 * VB_H, from: 0.52 },
      { text: 'חוואר', x: 300, y: 0.425 * VB_H, from: 0.62 },
      { text: 'מיליוני שנים', x: 82, y: 342, from: 0.12 },
    ],
  },
  metamorphic: {
    duration: 11000,
    description:
      'צילום בהילוך מהיר: מצוק של שכבות משקע שטוחות נלחץ משני הצדדים ומתחמם מלמטה. השכבות מתקפלות לקשתות ומשנות את אופיין לסלע מותמר בעל פסים: שיש וצפחה',
    labels: [
      { text: 'סלעים קיימים', x: 320, y: 180, from: 0, until: 0.3 },
      // below the arrows: the sample card covers the top half of the right edge
      { text: 'לחץ', x: 48, y: 236, from: 0.1 },
      { text: 'לחץ', x: 592, y: 236, from: 0.1 },
      { text: 'חום', x: 320, y: 326, from: 0.12, until: 0.92 },
      { text: 'שיש וצפחה', x: 268, y: 158, from: 0.84 },
    ],
  },
};

/** Hand-specimen photo of the rock family (tabs + sample card). */
export function RockSpecimen({ kind, className }: { kind: RockKind; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized
    <img
      src={`${BASE}/specimens/${kind}.webp`}
      alt=""
      aria-hidden
      width={480}
      height={480}
      draggable={false}
      className={cn('block object-cover', className)}
    />
  );
}

export function RockDiorama({ kind, reduce }: { kind: RockKind; reduce: boolean }) {
  const film = FILMS[kind];
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tlRef = useRef<Timelapse | null>(null);
  const inView = useInView(wrapRef, { amount: 0.35 });
  const [mode, setMode] = useState<'loading' | 'gl' | 'fallback'>('loading');
  const [p, setP] = useState(reduce ? 1 : 0);
  const [playing, setPlaying] = useState(false);
  const pRef = useRef(p);
  const autoplayed = useRef(false);

  const setProgress = (next: number) => {
    pRef.current = next;
    setP(next);
  };

  // upload both photos and compile this rock's shader
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    createTimelapse(canvas, photoUrl(kind, 'start'), photoUrl(kind, 'end'), SHADERS[kind]).then(
      (tl) => {
        if (!alive) return tl.dispose();
        tlRef.current = tl;
        tl.draw(pRef.current, 0);
        setMode('gl');
      },
      () => alive && setMode('fallback'),
    );
    const ro = new ResizeObserver(() => {
      tlRef.current?.resize();
      tlRef.current?.draw(pRef.current, performance.now() / 1000);
    });
    ro.observe(canvas);
    return () => {
      alive = false;
      ro.disconnect();
      tlRef.current?.dispose();
      tlRef.current = null;
    };
  }, [kind]);

  // play once, the first time the board is on screen
  useEffect(() => {
    if (!inView || autoplayed.current || reduce || mode === 'loading') return;
    autoplayed.current = true;
    setProgress(0);
    setPlaying(true);
  }, [inView, reduce, mode]);

  // the clock: advances the process while playing; keeps the living detail moving while visible
  useEffect(() => {
    if (mode !== 'gl' && !playing) return;
    const live = inView && !reduce && (playing || pRef.current < 1);
    if (!live) {
      tlRef.current?.draw(pRef.current, 0);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (playing) {
        const next = Math.min(1, pRef.current + dt / film.duration);
        setProgress(next);
        if (next >= 1) setPlaying(false);
      }
      tlRef.current?.draw(pRef.current, now / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, inView, reduce, playing, film.duration]);

  // scrubbing with the clock stopped (reduced motion / off-screen) still redraws
  useEffect(() => {
    if (mode === 'gl') tlRef.current?.draw(p, reduce ? 0 : performance.now() / 1000);
  }, [p, mode, reduce]);

  const done = p >= 1;
  const onPlay = () => {
    if (done) {
      setProgress(0);
      setPlaying(true);
    } else setPlaying((x) => !x);
  };

  return (
    <div ref={wrapRef}>
      <div role="img" aria-label={film.description} className="relative aspect-video">
        <canvas ref={canvasRef} className={cn('absolute inset-0 size-full', mode === 'fallback' && 'hidden')} />
        {mode === 'fallback' && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized */}
            <img src={photoUrl(kind, 'start')} alt="" className="absolute inset-0 size-full object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized */}
            <img
              src={photoUrl(kind, 'end')}
              alt=""
              className="absolute inset-0 size-full object-cover"
              style={{ opacity: ease(seg(p, 0.2, 0.85)) }}
            />
          </>
        )}
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden className="pointer-events-none absolute inset-0 size-full">
          <Diagram kind={kind} p={p} />
          {film.labels.map((l, i) => {
            const shown = mode !== 'loading' && p >= l.from && (l.until === undefined || p < l.until);
            return (
              <motion.g
                key={`${l.text}-${i}`}
                initial={false}
                animate={{ opacity: shown ? 1 : 0 }}
                transition={{ duration: reduce ? 0 : 0.4 }}
              >
                <Tag x={l.x} y={l.y} text={l.text} to={l.to} />
              </motion.g>
            );
          })}
        </svg>
      </div>
      {/* controls sit outside the role="img" figure so they stay operable */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={onPlay}
          aria-label={playing ? 'השהיה' : done ? 'הפעלה חוזרת' : 'הפעלה'}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-elevated text-fg transition-colors hover:border-accent hover:text-accent"
        >
          {playing ? <Pause aria-hidden className="size-4" /> : done ? <RotateCcw aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={1000}
          step={1}
          value={Math.round(p * 1000)}
          onChange={(e) => {
            setPlaying(false);
            setProgress(Number(e.target.value) / 1000);
          }}
          aria-label="התקדמות התהליך"
          aria-valuetext={`${Math.round(p * 100)}%`}
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-accent"
        />
      </div>
    </div>
  );
}

/** Diagram marks that belong to the explanation, drawn in step with the process. */
function Diagram({ kind, p }: { kind: RockKind; p: number }) {
  if (kind === 'sediment') {
    // the pile grows: the arrow's tip follows the top of the deposit
    const x = 0.045 * VB_W;
    const bottom = 0.88 * VB_H;
    const tip = Math.max(0.2, sedLevel(p)) * VB_H;
    const show = p >= 0.12;
    return (
      <motion.g initial={false} animate={{ opacity: show ? 1 : 0 }} transition={{ duration: 0.4 }}>
        {tip < bottom - 20 && (
          <polygon
            points={arrowPoints(x, bottom, x, tip, 7, 14, 20)}
            fill="#FDFBF3"
            stroke={INK_SOFT}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        )}
      </motion.g>
    );
  }
  if (kind === 'metamorphic') {
    // the vice: both sides push in while the beds fold
    const k = ease(seg(p, 0.16, 0.8));
    const y = 0.56 * VB_H;
    const show = p >= 0.1;
    return (
      <motion.g initial={false} animate={{ opacity: show ? 1 : 0 }} transition={{ duration: 0.4 }}>
        {(
          [
            [0.015, 0.125, 1],
            [0.985, 0.875, -1],
          ] as const
        ).map(([from, to, dir]) => (
          <polygon
            key={dir}
            points={arrowPoints(from * VB_W + dir * 10 * k, y, to * VB_W + dir * 10 * k, y, 10, 18, 26)}
            fill="#FDFBF3"
            stroke={INK_SOFT}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        ))}
      </motion.g>
    );
  }
  return null;
}
