'use client';
/**
 * BufferVisuals — copy-free illustration kit for BufferScene (11.2).
 *
 *   - BufferMap — plan view of the approach to our line, drawn to ONE km
 *     scale (12 SVG units per km, scale bar bottom-left). Enemy land on the
 *     left, our land on the right; never mirrored for RTL. Each active layer
 *     draws its detection footprint at the range the scene states (fence 1 km,
 *     sensors 8 km, radar 25 km at the lane); the physical buffer pushes the
 *     enemy line 4 km back ("קילומטרים ספורים" — schematic width).
 *   - The intrusion demo: an enemy unit advances from 29 km out. It is drawn
 *     dashed while undetected and solid once it enters the outermost active
 *     footprint; a bracket then marks the warning distance to our line with
 *     the scene's warning time. Plays once per layer change and on replay;
 *     reduced motion shows the end state.
 *   - WidthGauge — the example strips' widths on a shared 0–10 km tape.
 *
 * All Hebrew labels are passed in from BufferScene.tsx (copy stays in one place).
 */
import { useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
  type AnimationPlaybackControls,
} from 'framer-motion';

export type BufferLayer = 'physical' | 'fence' | 'sensors' | 'radar';

/** Detection range of each collection layer (km) — the scene's numbers. */
export const LAYER_RANGE_KM: Partial<Record<BufferLayer, number>> = { fence: 1, sensors: 8, radar: 25 };

/* ── Palette (illustration only, inside SVG) ─────────────────────────── */
const INK = '#38432E';
const PAPER = { cream: '#E8DCC4', rim: '#C9B892', g1: '#8A9163', g2: '#6E7A4E', g3: '#55613C' } as const;
const ENEMY = { wash: '#EAD5CB', line: '#A85A4A', unit: '#9B3F33', ink: '#8A3A2E' } as const;
/** Layer hues — blue for ground sensors, violet for radar; both far from the UI orange. */
const SENSOR = '#4F86C6';
const RADAR = '#7E6BB0';
/** Darker text variants of the two layer hues (≥ 4.5:1 on the paper tint). */
const SENSOR_INK = '#3A6BA5';
const RADAR_INK = '#5E4D96';
/** State lines (borders) are dash-dot; dashes alone are kept for movement. */
const BORDER_DASH = '12 4 3 4';

/* ── Geometry ────────────────────────────────────────────────────────── */
const W = 600;
const H = 330;
const MAP_X0 = 8;
const MAP_X1 = 592;
const MAP_TOP = 36;
const MAP_BOT = 256;
const X_US = 410; // our line
const KM = 12; // SVG units per km
const LANE_Y = 150;
const START_KM = 29;
const BUFFER_KM = 4;
const RADAR_AT = { x: 500, y: LANE_Y };
const FONT = 14;

/** x of a point `d` km in front of our line (toward the enemy). */
const dx = (d: number) => X_US - d * KM;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const textW = (s: string, size = FONT) => s.length * size * 0.56;

/* ── Demo engine (same contract as DepthVisuals) ─────────────────────── */
function useDemo(run: number, duration: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduce = !!useReducedMotion();
  const [p, setP] = useState(1);
  const played = useRef<number | null>(null);
  const ctl = useRef<AnimationPlaybackControls | null>(null);

  useEffect(() => {
    if (reduce) {
      ctl.current?.stop();
      played.current = run;
      setP(1);
      return;
    }
    if (!inView || played.current === run) return;
    played.current = run;
    ctl.current?.stop();
    setP(0);
    ctl.current = animate(0, 1, { duration, ease: 'linear', onUpdate: setP });
  }, [run, inView, reduce, duration]);

  useEffect(() => () => ctl.current?.stop(), []);
  return { ref, p, reduce };
}

export type BufferMapLabels = {
  enemy: string;
  buffer: string;
  ours: string;
  fence: string;
  sensors: string;
  radar: string;
  radarScan: string;
  noDefense: string;
  km: string;
};

export function BufferMap({
  active,
  range,
  warning,
  run,
  labels,
  ariaLabel,
}: {
  active: ReadonlySet<BufferLayer>;
  /** Outermost detection range of the active layers (km); 0 = none. */
  range: number;
  /** The scene's warning-time text for this configuration. */
  warning: string;
  run: number;
  labels: BufferMapLabels;
  ariaLabel: string;
}) {
  const { ref, p, reduce } = useDemo(run, 4.2);
  const hasBuffer = active.has('physical');
  const enemyEdge = hasBuffer ? dx(BUFFER_KM) : X_US;

  const d = START_KM * (1 - p);
  const unitX = dx(d);
  const detected = range > 0 ? d <= range : p >= 1;

  // One orange pulse at the moment of detection (not on the static end state).
  const [flash, setFlash] = useState(0);
  const wasDetected = useRef(detected);
  useEffect(() => {
    if (detected && !wasDetected.current && !reduce) setFlash((f) => f + 1);
    wasDetected.current = detected;
  }, [detected, reduce]);

  const sensorNodes: { x: number; y: number }[] = [];
  [1.5, 4, 6.5].forEach((km, i) =>
    // Rows kept clear of the warning chip / bracket band above the lane.
    [52, 182, 212, 242].forEach((y, j) => sensorNodes.push({ x: dx(km) + ((i + j) % 2 ? 6 : -6), y: y + (i % 2 ? 6 : 0) })),
  );

  // Radar sector: centred on the mast, radius reaching 25 km in front of our line at the lane.
  const rr = RADAR_AT.x - dx(LAYER_RANGE_KM.radar ?? 25);
  const a = (40 * Math.PI) / 180;
  const top = { x: RADAR_AT.x - rr * Math.cos(a), y: RADAR_AT.y - rr * Math.sin(a) };
  const bot = { x: RADAR_AT.x - rr * Math.cos(a), y: RADAR_AT.y + rr * Math.sin(a) };
  const radarPath = `M ${RADAR_AT.x} ${RADAR_AT.y} L ${top.x} ${top.y} A ${rr} ${rr} 0 0 0 ${bot.x} ${bot.y} Z`;

  const showBracket = detected;
  const bracketX0 = range > 0 ? dx(range) : X_US;
  const chipW = textW(warning) + 22;
  const chipX = clamp(range > 0 ? (bracketX0 + X_US) / 2 : X_US - 44, MAP_X0 + chipW / 2 + 4, X_US + 60);

  const bufferW = textW(labels.buffer);
  const enemyX = (MAP_X0 + enemyEdge) / 2;

  return (
    <div ref={ref} className="relative w-full rounded-xl overflow-hidden bg-bg-accent">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" role="img" aria-label={ariaLabel}>
        <defs>
          <clipPath id="t11-buffer-map">
            <rect x={MAP_X0} y={MAP_TOP} width={MAP_X1 - MAP_X0} height={MAP_BOT - MAP_TOP} rx={12} />
          </clipPath>
          <pattern id="t11-buffer-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={PAPER.rim} strokeWidth="2.2" />
          </pattern>
        </defs>

        <g clipPath="url(#t11-buffer-map)">
          {/* Land: enemy · buffer strip · ours */}
          <rect x={MAP_X0} y={MAP_TOP} width={enemyEdge - MAP_X0} height={MAP_BOT - MAP_TOP} fill={ENEMY.wash} />
          {hasBuffer && (
            <motion.g initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
              <rect x={enemyEdge} y={MAP_TOP} width={X_US - enemyEdge} height={MAP_BOT - MAP_TOP} fill={PAPER.cream} />
              <rect x={enemyEdge} y={MAP_TOP} width={X_US - enemyEdge} height={MAP_BOT - MAP_TOP} fill="url(#t11-buffer-hatch)" opacity={0.7} />
            </motion.g>
          )}
          <rect x={X_US} y={MAP_TOP} width={MAP_X1 - X_US} height={MAP_BOT - MAP_TOP} fill={PAPER.g1} fillOpacity={0.32} />

          {/* Our rear: a town and a few groves */}
          <g fill={INK} fillOpacity={0.55}>
            {[
              [540, 214, 9, 9],
              [552, 206, 8, 14],
              [562, 216, 10, 8],
              [546, 226, 12, 7],
            ].map(([x, y, w, h], i) => (
              <rect key={i} x={x} y={y} width={w} height={h} rx={1.5} />
            ))}
          </g>
          {[
            [452, 92],
            [470, 220],
            [560, 108],
            [438, 186],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={6} fill={PAPER.g2} fillOpacity={0.7} />
          ))}

          {/* Footprints — widest first so the narrow ones stay visible */}
          {active.has('radar') && (
            <motion.path d={radarPath} fill={RADAR} fillOpacity={0.13} stroke={RADAR} strokeWidth={1.2} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} />
          )}
          {active.has('sensors') && (
            <motion.g initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
              <rect x={dx(LAYER_RANGE_KM.sensors ?? 8)} y={MAP_TOP} width={(LAYER_RANGE_KM.sensors ?? 8) * KM} height={MAP_BOT - MAP_TOP} fill={SENSOR} fillOpacity={0.14} />
              <line x1={dx(LAYER_RANGE_KM.sensors ?? 8)} y1={MAP_TOP} x2={dx(LAYER_RANGE_KM.sensors ?? 8)} y2={MAP_BOT} stroke={SENSOR} strokeWidth={1.2} />
              {sensorNodes.map((n, i) => (
                <g key={i}>
                  <circle cx={n.x} cy={n.y} r={6} fill="none" stroke={SENSOR} strokeWidth={1} strokeOpacity={0.6} />
                  <circle cx={n.x} cy={n.y} r={2.2} fill={SENSOR} />
                </g>
              ))}
            </motion.g>
          )}
          {active.has('fence') && (
            <rect x={dx(LAYER_RANGE_KM.fence ?? 1)} y={MAP_TOP} width={(LAYER_RANGE_KM.fence ?? 1) * KM} height={MAP_BOT - MAP_TOP} fill={INK} fillOpacity={0.12} />
          )}

          {/* Lines: enemy line (if a strip separates us) and our line / the fence */}
          {hasBuffer && <line x1={enemyEdge} y1={MAP_TOP} x2={enemyEdge} y2={MAP_BOT} stroke={ENEMY.line} strokeWidth={1.6} strokeDasharray={BORDER_DASH} />}
          {active.has('fence') ? (
            <g>
              <line x1={X_US} y1={MAP_TOP} x2={X_US} y2={MAP_BOT} stroke={INK} strokeWidth={3} />
              {Array.from({ length: 16 }, (_, i) => MAP_TOP + 8 + i * 14).map((y) => (
                <rect key={y} x={X_US - 2.5} y={y} width={5} height={5} rx={1} fill={INK} />
              ))}
            </g>
          ) : (
            <line x1={X_US} y1={MAP_TOP} x2={X_US} y2={MAP_BOT} stroke={INK} strokeWidth={1.6} strokeDasharray={BORDER_DASH} />
          )}

          {/* Radar mast */}
          {active.has('radar') && (
            <g>
              <line x1={RADAR_AT.x} y1={RADAR_AT.y} x2={RADAR_AT.x} y2={RADAR_AT.y + 16} stroke={INK} strokeWidth={2} />
              <path d={`M ${RADAR_AT.x - 9} ${RADAR_AT.y - 2} A 9 9 0 0 0 ${RADAR_AT.x + 9} ${RADAR_AT.y - 2} Z`} fill={RADAR} stroke={INK} strokeWidth={1.2} />
              <circle cx={RADAR_AT.x} cy={RADAR_AT.y + 17} r={3} fill={INK} />
            </g>
          )}

          {/* Axis of advance + the enemy unit */}
          <line x1={dx(START_KM)} y1={LANE_Y} x2={X_US} y2={LANE_Y} stroke={ENEMY.line} strokeWidth={1.2} strokeDasharray="2 5" strokeLinecap="round" />
          {showBracket && (
            <motion.g initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {range > 0 && (
                <g className="stroke-accent" strokeWidth={2.5} strokeLinecap="round">
                  <line x1={bracketX0} y1={LANE_Y - 24} x2={X_US} y2={LANE_Y - 24} />
                  <line x1={bracketX0} y1={LANE_Y - 30} x2={bracketX0} y2={LANE_Y - 18} />
                  <line x1={X_US} y1={LANE_Y - 30} x2={X_US} y2={LANE_Y - 18} />
                </g>
              )}
              <rect x={chipX - chipW / 2} y={LANE_Y - 62} width={chipW} height={24} rx={12} fill="#FFFFFF" className="stroke-accent" strokeWidth={1.5} />
              <text x={chipX} y={LANE_Y - 45} textAnchor="middle" fill={INK} className="font-display font-bold" fontSize={FONT}>
                {warning}
              </text>
            </motion.g>
          )}
          {flash > 0 && (
            <motion.circle
              key={flash}
              cx={unitX}
              cy={LANE_Y}
              fill="none"
              className="stroke-accent"
              strokeWidth={2.5}
              initial={{ r: 10, opacity: 1 }}
              animate={{ r: 34, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          )}
          <g transform={`translate(${unitX} ${LANE_Y})`}>
            <rect
              x={-12}
              y={-8}
              width={24}
              height={16}
              rx={3}
              fill={detected ? ENEMY.unit : '#FFFFFF'}
              stroke={detected ? '#FFFFFF' : ENEMY.unit}
              strokeWidth={detected ? 1.5 : 2}
              strokeDasharray={detected ? undefined : '4 3'}
            />
            <path d="M -5 -4 L 2 0 L -5 4" fill="none" stroke={detected ? '#FFFFFF' : ENEMY.unit} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {active.size === 0 && (
            <text x={(MAP_X0 + X_US) / 2} y={108} textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize={18}>
              {labels.noDefense}
            </text>
          )}

          {/* Territory names */}
          <text x={enemyX} y={60} textAnchor="middle" fill={ENEMY.ink} className="font-display font-bold" fontSize={FONT}>
            {labels.enemy}
          </text>
          <text x={(X_US + MAP_X1) / 2} y={60} textAnchor="middle" fill={INK} className="font-display font-bold" fontSize={FONT}>
            {labels.ours}
          </text>
          {active.has('radar') && (
            <text x={RADAR_AT.x} y={RADAR_AT.y + 40} textAnchor="middle" fill={INK} className="font-display font-bold" fontSize={FONT}>
              {labels.radar}
            </text>
          )}
        </g>

        {/* Map frame */}
        <rect x={MAP_X0} y={MAP_TOP} width={MAP_X1 - MAP_X0} height={MAP_BOT - MAP_TOP} rx={12} fill="none" stroke={INK} strokeOpacity={0.15} />

        {/* Labels outside the map: buffer above, layer names below */}
        {hasBuffer && (
          <g>
            <line x1={(enemyEdge + X_US) / 2} y1={28} x2={(enemyEdge + X_US) / 2} y2={MAP_TOP + 6} stroke={INK} strokeOpacity={0.45} strokeWidth={1.2} />
            <text x={clamp((enemyEdge + X_US) / 2, bufferW / 2 + 4, W - bufferW / 2 - 4)} y={22} textAnchor="middle" fill={INK} className="font-display font-bold" fontSize={FONT}>
              {labels.buffer}
            </text>
          </g>
        )}
        {active.has('radar') && (
          <text x={160} y={MAP_BOT + 22} textAnchor="middle" fill={RADAR_INK} className="font-display font-bold" fontSize={FONT}>
            {labels.radarScan}
          </text>
        )}
        {active.has('sensors') && (
          <text x={dx(3.5)} y={MAP_BOT + 22} textAnchor="middle" fill={SENSOR_INK} className="font-display font-bold" fontSize={FONT}>
            {labels.sensors}
          </text>
        )}
        {active.has('fence') && (
          <text x={X_US + 62} y={MAP_BOT + 22} textAnchor="middle" fill={INK} className="font-display font-bold" fontSize={FONT}>
            {labels.fence}
          </text>
        )}

        {/* Scale bar — 0 · 5 · 10 km, left→right */}
        <g transform={`translate(${MAP_X0 + 12} ${H - 34})`}>
          <rect x={0} y={0} width={5 * KM} height={6} fill={INK} />
          <rect x={5 * KM} y={0} width={5 * KM} height={6} fill="#FFFFFF" stroke={INK} strokeWidth={1} />
          {[0, 5, 10].map((km) => (
            <text key={km} x={km * KM} y={22} textAnchor="middle" fill={INK} fillOpacity={0.75} className="font-display font-medium tabular-nums" fontSize={14}>
              {km}
            </text>
          ))}
          <text x={10 * KM + 14} y={22} textAnchor="start" direction="ltr" fill={INK} fillOpacity={0.75} className="font-display font-medium" fontSize={14}>
            {labels.km}
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ── Width gauge for the example cards ───────────────────────────────── */
const GAUGE_MAX_KM = 10;

/** A strip's width on a shared 0–10 km tape (left→right, never mirrored). */
export function WidthGauge({ km }: { km: number }) {
  const f = Math.min(1, km / GAUGE_MAX_KM);
  return (
    <div dir="ltr" aria-hidden className="mt-2">
      <div className="relative h-2 rounded-full bg-bg-accent ring-1 ring-inset ring-border">
        <div className="absolute inset-y-0 start-0 rounded-full bg-brand" style={{ width: `${f * 100}%` }} />
      </div>
      <div className="relative mt-1 h-4 text-[13px] leading-4 font-display font-medium text-fg-dim tabular-nums">
        {[0, 5, 10].map((v) => (
          <span key={v} className="absolute top-0 flex w-0 justify-center" style={{ insetInlineStart: `${(v / GAUGE_MAX_KM) * 100}%` }}>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
