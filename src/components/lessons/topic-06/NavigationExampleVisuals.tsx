'use client';
/**
 * NavigationExampleVisuals — the four explanatory figures of lesson 6's
 * "why navigation skills matter" examples (NavigationExamplesPanel).
 *
 * Every figure is drawn in one 560 × 420 (4:3) frame, north up, and is never
 * mirrored for RTL. Callouts are HTML pills placed in the same frame (percent
 * of the 4:3 box, physical left/top because the map does not flip), so the
 * Hebrew gets real text layout instead of SVG width guesses. `compact` drops
 * the callouts and cover-crops the frame for the selector cards' previews.
 *
 * The figures are schematic: they show the navigation idea of each example,
 * not a reconstruction of a real place or map.
 */
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Bush, Pine, Rock, HAIR, INK, ORANGE, ORANGE_DEEP, PAPER, FONT } from './PlanningRouteMap';

const W = 560;
const H = 420;

// Illustration paints not covered by a token (hex mirrors, as in PlanningRouteMap).
const STREAM_WIDE = '#7FB4C6';
const STREAM_LINE = '#4f8397';
const ROAD_WIDE = '#C9A56B'; // tanline.contour
const ROAD_LINE = '#9c7e48';
const STAR = '#FDFBF3'; // paper.bright
const MUTED = '#8A8873'; // fg.dim
const ALERT = '#e2553a'; // accent.hot

type Pt = { x: number; y: number };
const fx = (n: number) => Math.round(n * 10) / 10;
function polar(c: Pt, az: number, r: number): Pt {
  const a = (az * Math.PI) / 180;
  return { x: fx(c.x + r * Math.sin(a)), y: fx(c.y - r * Math.cos(a)) };
}
/** Deterministic scatter, so server and client draw the same points. */
function scatter(n: number, seed: number) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  return Array.from({ length: n }, () => ({ x: fx(rnd() * W), y: fx(rnd() * H), k: rnd() }));
}

// ——— Frame + callouts ———

type FigureProps = { compact?: boolean };

function Frame({
  label,
  compact,
  children,
  callouts,
}: {
  label: string;
  compact?: boolean;
  children: ReactNode;
  callouts?: ReactNode;
}) {
  return (
    <div
      className="relative size-full overflow-hidden"
      role={compact ? undefined : 'img'}
      aria-label={compact ? undefined : label}
      aria-hidden={compact || undefined}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio={compact ? 'xMidYMid slice' : 'xMidYMid meet'}
        className="absolute inset-0 block size-full select-none"
        style={FONT}
        aria-hidden
      >
        {children}
      </svg>
      {!compact && <div aria-hidden>{callouts}</div>}
    </div>
  );
}

type Extend = 'left' | 'right' | 'center';
type Tone = 'paper' | 'route' | 'alert' | 'night';

/** A label pill anchored at frame point (x, y); `extend` is the side the pill grows toward. */
function Callout({
  x,
  y,
  extend = 'center',
  tone = 'paper',
  children,
}: {
  x: number;
  y: number;
  extend?: Extend;
  tone?: Tone;
  children: ReactNode;
}) {
  const tx = extend === 'left' ? '-100%' : extend === 'right' ? '0%' : '-50%';
  return (
    <span
      className={cn(
        'pointer-events-none absolute whitespace-nowrap rounded-md border px-2 py-0.5 font-display text-sm font-semibold leading-snug shadow-sm',
        tone === 'paper' && 'border-tanline bg-paper-bright text-fg',
        tone === 'route' && 'border-ember bg-paper-bright text-ember-deep',
        tone === 'alert' && 'border-accent-hot/60 bg-paper-bright text-fg',
        tone === 'night' && 'border-paper-bright/30 bg-pine-lo/85 text-paper-bright'
      )}
      style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, transform: `translate(${tx}, -50%)` }}
    >
      {children}
    </span>
  );
}

/** Cream map paper with a fine grid — the lesson-6 map base (PlanningRouteMap). */
function MapPaper({ id, grid = 40 }: { id: string; grid?: number }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFDF9" />
          <stop offset="55%" stopColor="#FBF3E4" />
          <stop offset="100%" stopColor="#F3E7D2" />
        </linearGradient>
      </defs>
      <rect x={-200} y={-200} width={W + 400} height={H + 400} fill={`url(#${id}-paper)`} />
      {Array.from({ length: Math.ceil(W / grid) + 1 }).map((_, i) => (
        <line key={'gx' + i} x1={i * grid} y1={-200} x2={i * grid} y2={H + 200} stroke="#ECE4D2" strokeWidth={1} />
      ))}
      {Array.from({ length: Math.ceil(H / grid) + 1 }).map((_, i) => (
        <line key={'gy' + i} x1={-200} y1={i * grid} x2={W + 200} y2={i * grid} stroke="#ECE4D2" strokeWidth={1} />
      ))}
    </>
  );
}

function Contours({ paths, opacity = 0.45 }: { paths: string[]; opacity?: number }) {
  return (
    <g fill="none" stroke={ROAD_WIDE} strokeWidth={1.4} strokeLinecap="round" opacity={opacity}>
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
}

function Sparkle({ x, y, s, fill, opacity = 1 }: { x: number; y: number; s: number; fill: string; opacity?: number }) {
  const k = s * 0.3;
  return (
    <path
      d={`M${x} ${y - s} L${x + k} ${y - k} L${x + s} ${y} L${x + k} ${y + k} L${x} ${y + s} L${x - k} ${y + k} L${x - s} ${y} L${x - k} ${y - k} Z`}
      fill={fill}
      opacity={opacity}
    />
  );
}

/** Route marker: filled start/position dot or a target ring. */
function Marker({ x, y, kind }: { x: number; y: number; kind: 'dot' | 'ring' }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 2} rx={13} ry={4} fill="#566b46" opacity={0.15} />
      {kind === 'ring' ? (
        <>
          <circle cx={x} cy={y} r={13} fill={PAPER} stroke={ORANGE} strokeWidth={3} />
          <circle cx={x} cy={y} r={5} fill={ORANGE} />
        </>
      ) : (
        <circle cx={x} cy={y} r={11} fill={ORANGE} stroke={PAPER} strokeWidth={2.5} />
      )}
    </g>
  );
}

// ——— 1. Star compass (Arab navigation) ———

const STAR_C: Pt = { x: 280, y: 212 };
const STAR_R = 150;
/** Rising azimuths of the drawn stars; each sets at 360° − az. */
const STAR_RISES = [34, 66, 98, 130];
const STAR_HERO = 66;

export function StarCompassFigure({ compact }: FigureProps) {
  const id = useId().replace(/:/g, '');
  const sky = scatter(54, 7);
  const heroRise = polar(STAR_C, STAR_HERO, STAR_R);
  const heroSet = polar(STAR_C, 360 - STAR_HERO, STAR_R);
  const tip = polar(STAR_C, STAR_HERO, STAR_R - 30);
  const head = [polar(STAR_C, STAR_HERO, STAR_R - 18), polar(tip, STAR_HERO - 90, 8), polar(tip, STAR_HERO + 90, 8)];

  return (
    <Frame
      compact={compact}
      label="המחשה סכמטית של מצפן כוכבים: האופק מחולק ל־32 כיוונים. כוכבים זורחים במזרח ושוקעים במערב בנקודות קבועות, והספינה שבמרכז שטה לעבר נקודת הזריחה של כוכב מוכר."
      callouts={
        <>
          <Callout x={heroRise.x + 4} y={heroRise.y - 34} tone="route">
            הכוכב זורח כאן בכל לילה
          </Callout>
          <Callout x={heroSet.x - 4} y={heroSet.y - 34} tone="night">
            ושוקע כאן
          </Callout>
          <Callout x={STAR_C.x + 2} y={STAR_C.y + 52} tone="night">
            כיוון השיט
          </Callout>
        </>
      }
    >
      <defs>
        <linearGradient id={`${id}-night`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#232d20" />
          <stop offset="100%" stopColor="#3b4756" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor={ORANGE} stopOpacity={0.55} />
          <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={-200} y={-200} width={W + 400} height={H + 400} fill={`url(#${id}-night)`} />
      {sky.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={0.8 + p.k * 1.2} fill={STAR} opacity={0.18 + p.k * 0.35} />
      ))}

      {/* Horizon ring with the 32 points */}
      <circle cx={STAR_C.x} cy={STAR_C.y} r={STAR_R} fill="#000" fillOpacity={0.12} stroke={STAR} strokeOpacity={0.45} strokeWidth={1.6} />
      <circle cx={STAR_C.x} cy={STAR_C.y} r={STAR_R - 18} fill="none" stroke={STAR} strokeOpacity={0.14} strokeWidth={1} />
      {Array.from({ length: 32 }).map((_, i) => {
        const az = i * 11.25;
        const major = i % 8 === 0;
        const mid = i % 4 === 0;
        const a = polar(STAR_C, az, STAR_R - (major ? 18 : mid ? 13 : 8));
        const b = polar(STAR_C, az, STAR_R);
        return (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={STAR} strokeOpacity={major ? 0.8 : mid ? 0.6 : 0.4} strokeWidth={major ? 2.2 : mid ? 1.7 : 1.2} />
        );
      })}

      {/* Each star's path from its rising point to its setting point */}
      {STAR_RISES.map((az) => {
        const r = polar(STAR_C, az, STAR_R);
        const s = polar(STAR_C, 360 - az, STAR_R);
        const hero = az === STAR_HERO;
        return (
          <path
            key={'p' + az}
            d={`M${r.x} ${r.y} Q ${STAR_C.x} ${fx(r.y + 96)} ${s.x} ${s.y}`}
            fill="none"
            stroke={hero ? ORANGE : STAR}
            strokeOpacity={hero ? 0.75 : 0.26}
            strokeWidth={hero ? 2 : 1.4}
            strokeDasharray="5 6"
          />
        );
      })}
      {STAR_RISES.map((az) => {
        const r = polar(STAR_C, az, STAR_R);
        const s = polar(STAR_C, 360 - az, STAR_R);
        const hero = az === STAR_HERO;
        return (
          <g key={'s' + az}>
            {hero && <circle cx={r.x} cy={r.y} r={24} fill={`url(#${id}-glow)`} />}
            <Sparkle x={r.x} y={r.y} s={hero ? 12 : 8} fill={hero ? ORANGE : STAR} />
            <Sparkle x={s.x} y={s.y} s={hero ? 9 : 7} fill={hero ? ORANGE : STAR} opacity={hero ? 0.75 : 0.55} />
          </g>
        );
      })}

      {/* Heading toward the known star's rising point */}
      <line x1={STAR_C.x} y1={STAR_C.y} x2={tip.x} y2={tip.y} stroke={ORANGE} strokeWidth={4} strokeLinecap="round" />
      <path d={`M${head[0].x} ${head[0].y} L${head[1].x} ${head[1].y} L${head[2].x} ${head[2].y} Z`} fill={ORANGE} />
      {/* Boat seen from above */}
      <g transform={`translate(${STAR_C.x} ${STAR_C.y}) rotate(${STAR_HERO})`}>
        <path d="M0 -24 C 9 -12, 10 8, 6 20 L -6 20 C -10 8, -9 -12, 0 -24 Z" fill="#c2a26b" stroke="#8a6a45" strokeWidth={1.4} />
        <line x1={0} y1={-14} x2={0} y2={14} stroke="#8a6a45" strokeWidth={1.2} />
        <circle cx={0} cy={-3} r={2.4} fill="#6f5230" />
      </g>

      {/* Cardinal points — north up, east right (never mirrored) */}
      {!compact && (
        <g fill={STAR} fontWeight={700} fontSize={16} textAnchor="middle">
          <text x={STAR_C.x} y={STAR_C.y - STAR_R - 14}>צפון</text>
          <text x={STAR_C.x} y={STAR_C.y + STAR_R + 27}>דרום</text>
          <text x={STAR_C.x + STAR_R + 38} y={STAR_C.y + 6}>מזרח</text>
          <text x={STAR_C.x - STAR_R - 38} y={STAR_C.y + 6}>מערב</text>
        </g>
      )}
    </Frame>
  );
}

// ——— 2. Dense forest (Hürtgen) ———

/** Firebreak lanes cut through the forest; they cross at FOREST_X. */
const LANE_NS = 'M226 -20 L 254 440';
const LANE_WE = 'M-20 263 L 580 236';
const FOREST_X: Pt = { x: 242, y: 251 };
const FOREST_CELL = { x: 200, y: 206, s: 90 };
const SOLDIER: Pt = { x: 112, y: 112 };
const STREAM = 'M590 60 C 520 90, 470 130, 452 190 C 436 246, 452 300, 420 352 C 404 380, 396 404, 392 440';

export function ForestFigure({ compact }: FigureProps) {
  const id = useId().replace(/:/g, '');
  const toX = { x: FOREST_X.x - SOLDIER.x, y: FOREST_X.y - SOLDIER.y };
  const len = Math.hypot(toX.x, toX.y);
  const u = { x: toX.x / len, y: toX.y / len };
  const end = { x: fx(FOREST_X.x - u.x * 24), y: fx(FOREST_X.y - u.y * 24) };
  const head = `M${fx(end.x + u.x * 2)} ${fx(end.y + u.y * 2)} L${fx(end.x - u.x * 12 - u.y * 7)} ${fx(end.y - u.y * 12 + u.x * 7)} L${fx(end.x - u.x * 12 + u.y * 7)} ${fx(end.y - u.y * 12 - u.x * 7)} Z`;
  const mid = { x: SOLDIER.x + toX.x * 0.5, y: SOLDIER.y + toX.y * 0.5 };

  return (
    <Frame
      compact={compact}
      label="המחשה סכמטית של יער צפוף במבט מלמעלה: חייל בתוך היער רואה רק סביבה קרובה. שני שבילים שנפרצו ביער מצטלבים, ובהצטלבות סימון ממוספר שמתאים לריבוע במפה. ממזרח עובר ערוץ תלול."
      callouts={
        <>
          <Callout x={SOLDIER.x} y={SOLDIER.y - 50}>טווח ראייה קצר</Callout>
          <Callout x={mid.x - 18} y={mid.y + 14} extend="left" tone="route">
            כיוון לפי מצפן
          </Callout>
          <Callout x={FOREST_CELL.x - 8} y={FOREST_X.y + 38} extend="left">
            סימון ממוספר בהצטלבות
          </Callout>
          <Callout x={FOREST_CELL.x + FOREST_CELL.s + 8} y={FOREST_CELL.y + 12} extend="right">
            ריבוע 47 במפה
          </Callout>
          <Callout x={486} y={318}>ערוץ תלול</Callout>
        </>
      }
    >
      <defs>
        <pattern id={`${id}-canopy`} width={28} height={26} patternUnits="userSpaceOnUse">
          <rect width={28} height={26} fill="#66734a" />
          <circle cx={7} cy={8} r={8} fill="#55613C" />
          <circle cx={21} cy={17} r={8.5} fill="#5c6842" />
          <circle cx={9} cy={21} r={5} fill="#7d875a" opacity={0.85} />
          <circle cx={22} cy={4} r={4.5} fill="#8A9163" opacity={0.7} />
          <circle cx={5} cy={6} r={2.5} fill="#8A9163" opacity={0.55} />
        </pattern>
      </defs>
      <rect x={-200} y={-200} width={W + 400} height={H + 400} fill={`url(#${id}-canopy)`} />

      {/* Steep ravine: crowded contours either side of the stream */}
      <g fill="none" stroke="#F3E7D2" strokeLinecap="round" opacity={0.45}>
        {[-42, -30, -19, 19, 30, 42].map((dx) => (
          <path key={dx} d={STREAM} transform={`translate(${dx} 0)`} strokeWidth={1.5} />
        ))}
      </g>
      <path d={STREAM} fill="none" stroke={STREAM_WIDE} strokeWidth={8} strokeLinecap="round" opacity={0.85} />
      <path d={STREAM} fill="none" stroke={STREAM_LINE} strokeWidth={1.6} strokeLinecap="round" />

      {/* Firebreak lanes (cleared strips) */}
      {[LANE_NS, LANE_WE].map((d) => (
        <g key={d}>
          <path d={d} fill="none" stroke="#F3E7D2" strokeWidth={17} />
          <path d={d} fill="none" stroke={ROAD_LINE} strokeWidth={1.3} strokeDasharray="7 6" opacity={0.6} />
        </g>
      ))}

      {/* The map square the marker's number points to */}
      <rect
        x={FOREST_CELL.x}
        y={FOREST_CELL.y}
        width={FOREST_CELL.s}
        height={FOREST_CELL.s}
        fill={PAPER}
        fillOpacity={0.12}
        stroke={PAPER}
        strokeWidth={2}
        strokeDasharray="6 5"
      />
      {/* Numbered survey marker at the crossing */}
      <g>
        <line x1={FOREST_CELL.x - 10} y1={FOREST_X.y + 30} x2={FOREST_X.x - 12} y2={FOREST_X.y + 10} stroke={PAPER} strokeWidth={1.4} />
        <rect x={FOREST_X.x - 14} y={FOREST_X.y - 14} width={28} height={28} rx={3} fill="#dcd7ca" stroke="#6f6a5d" strokeWidth={1.8} />
        <text x={FOREST_X.x} y={FOREST_X.y + 6} textAnchor="middle" fontSize={16} fontWeight={800} fill={INK}>
          47
        </text>
      </g>

      {/* Short sight range around the soldier */}
      <circle cx={SOLDIER.x} cy={SOLDIER.y} r={34} fill={PAPER} fillOpacity={0.22} stroke={PAPER} strokeWidth={1.6} strokeDasharray="4 4" />
      {/* Compass bearing toward the crossing */}
      <line x1={SOLDIER.x} y1={SOLDIER.y} x2={end.x} y2={end.y} stroke={ORANGE} strokeWidth={3} strokeDasharray="8 6" strokeLinecap="round" />
      <path d={head} fill={ORANGE} />
      <circle cx={SOLDIER.x} cy={SOLDIER.y} r={9} fill={ORANGE} stroke={PAPER} strokeWidth={2.5} />
    </Frame>
  );
}

// ——— 3. GNSS interference ———

const GNSS_V: Pt = { x: 112, y: 346 };
const GNSS_B: Pt = { x: 318, y: 104 };
const GNSS_T = 0.46;
const GNSS_SHOWN: Pt = { x: 360, y: 300 };
const SAT: Pt = { x: 470, y: 66 };

export function GnssFigure({ compact }: FigureProps) {
  const id = useId().replace(/:/g, '');
  const here = { x: fx(GNSS_V.x + (GNSS_B.x - GNSS_V.x) * GNSS_T), y: fx(GNSS_V.y + (GNSS_B.y - GNSS_V.y) * GNSS_T) };
  const routeAz = (Math.atan2(GNSS_B.x - GNSS_V.x, GNSS_V.y - GNSS_B.y) * 180) / Math.PI;
  const azArc = polar(GNSS_V, routeAz, 36);

  return (
    <Frame
      compact={compact}
      label="המחשה סכמטית במפה: אות הלוויין משובש. המכשיר מציג מיקום שגוי מחוץ לציר, בעוד שהמיקום בפועל נמצא על הציר שנמדד באזימוט מהנקודה האחרונה שאומתה."
      callouts={
        <>
          <Callout x={GNSS_V.x} y={GNSS_V.y + 34}>נקודה שאומתה</Callout>
          <Callout x={GNSS_B.x + 22} y={GNSS_B.y} extend="right">
            יעד
          </Callout>
          <Callout x={here.x - 20} y={here.y} extend="left" tone="route">
            המיקום בפועל
          </Callout>
          <Callout x={GNSS_SHOWN.x} y={GNSS_SHOWN.y + 36}>המיקום שהמכשיר מציג</Callout>
          <Callout x={SAT.x} y={SAT.y + 66} tone="alert">
            אות לווייני משובש
          </Callout>
          <Callout x={GNSS_V.x - 14} y={GNSS_V.y - 36} extend="left">
            אזימוט במצפן
          </Callout>
        </>
      }
    >
      <MapPaper id={id} />
      <Contours
        paths={[
          'M-10 170 C 80 150, 150 196, 240 176 S 420 200, 570 168',
          'M-10 236 C 90 214, 170 262, 270 244 S 450 262, 570 236',
          'M330 420 C 360 380, 430 372, 470 396 S 540 430, 570 410',
        ]}
      />
      {/* Dirt road */}
      <path d="M-10 300 C 120 286, 220 318, 330 236 S 470 130, 570 120" fill="none" stroke={ROAD_WIDE} strokeWidth={10} opacity={0.35} strokeLinecap="round" />
      <path d="M-10 300 C 120 286, 220 318, 330 236 S 470 130, 570 120" fill="none" stroke={ROAD_LINE} strokeWidth={1.3} strokeDasharray="7 5" opacity={0.6} />
      {[
        { x: 60, y: 120, s: 5 },
        { x: 210, y: 70, s: 4.5 },
        { x: 420, y: 230, s: 5 },
        { x: 500, y: 330, s: 4.5 },
        { x: 190, y: 390, s: 4.5 },
      ].map((b, i) => (
        <Bush key={'b' + i} {...b} />
      ))}
      {[
        { x: 260, y: 360, s: 5 },
        { x: 40, y: 230, s: 4.5 },
      ].map((r, i) => (
        <Rock key={'r' + i} {...r} />
      ))}

      {/* Satellite and the jammed signal */}
      <g>
        <line x1={SAT.x - 14} y1={SAT.y + 14} x2={GNSS_SHOWN.x + 30} y2={GNSS_SHOWN.y - 60} stroke={ALERT} strokeWidth={1.6} strokeDasharray="1 6" strokeLinecap="round" opacity={0.55} />
        <path
          d={`M${SAT.x - 52} ${SAT.y + 40} l8 -9 l7 11 l8 -11 l7 11 l8 -11 l7 9`}
          fill="none"
          stroke={ALERT}
          strokeWidth={2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <g transform={`translate(${SAT.x} ${SAT.y}) rotate(-35)`}>
          <rect x={-30} y={-7} width={18} height={14} rx={1.5} fill="#5b7fa0" stroke={INK} strokeWidth={1.2} />
          <rect x={12} y={-7} width={18} height={14} rx={1.5} fill="#5b7fa0" stroke={INK} strokeWidth={1.2} />
          <line x1={-12} y1={0} x2={12} y2={0} stroke={INK} strokeWidth={1.6} />
          <rect x={-8} y={-10} width={16} height={20} rx={3} fill="#d9d4c7" stroke={INK} strokeWidth={1.4} />
        </g>
      </g>

      {/* Route: walked part solid, the rest dashed, measured by azimuth from the verified point */}
      <line x1={here.x} y1={here.y} x2={GNSS_B.x} y2={GNSS_B.y} stroke={ORANGE} strokeWidth={3} strokeDasharray="9 7" strokeLinecap="round" opacity={0.85} />
      <line x1={GNSS_V.x} y1={GNSS_V.y} x2={here.x} y2={here.y} stroke={ORANGE} strokeWidth={4} strokeLinecap="round" />

      {/* Where the receiver claims we are */}
      <line x1={here.x} y1={here.y} x2={GNSS_SHOWN.x} y2={GNSS_SHOWN.y} stroke={MUTED} strokeWidth={1.6} strokeDasharray="4 5" />
      <g>
        <circle cx={GNSS_SHOWN.x} cy={GNSS_SHOWN.y} r={18} fill={MUTED} fillOpacity={0.12} stroke={MUTED} strokeWidth={1.6} strokeDasharray="4 4" />
        <circle cx={GNSS_SHOWN.x} cy={GNSS_SHOWN.y} r={7} fill="#FFFFFF" stroke={MUTED} strokeWidth={2.4} />
      </g>

      {/* Azimuth at the verified point: north tick + arc to the route */}
      <line x1={GNSS_V.x} y1={GNSS_V.y} x2={GNSS_V.x} y2={GNSS_V.y - 50} stroke={INK} strokeWidth={1.6} strokeDasharray="4 4" />
      <path d={`M${GNSS_V.x} ${GNSS_V.y - 36} A 36 36 0 0 1 ${azArc.x} ${azArc.y}`} fill="none" stroke={INK} strokeWidth={1.6} />
      <Marker x={GNSS_V.x} y={GNSS_V.y} kind="ring" />
      <Marker x={GNSS_B.x} y={GNSS_B.y} kind="ring" />
      <circle cx={here.x} cy={here.y} r={10} fill={ORANGE} stroke={PAPER} strokeWidth={3} />

      {/* North arrow */}
      {!compact && (
        <g transform="translate(518 378)">
          <circle r={19} fill={PAPER} stroke={HAIR} strokeWidth={1.4} />
          <path d="M0 -13 L6 6 L0 2 L-6 6 Z" fill={INK} />
          <text y={-25} textAnchor="middle" fontSize={16} fontWeight={700} fill={INK}>
            צ
          </text>
        </g>
      )}
    </Frame>
  );
}

// ——— 4. Two look-alike junctions (illustrative) ———

const ROAD = 'M78 440 C 110 400, 150 352, 190 306 C 220 272, 246 244, 270 216 C 294 188, 318 160, 340 128 C 362 96, 384 50, 404 -20';
const J1: Pt = { x: 190, y: 306 };
/** The route on the road: walked from A to junction 1, planned on to junction 2. */
const WALKED = 'M109 402 C 130 377, 160 341, 190 306';
const PLANNED = 'M190 306 C 220 272, 246 244, 270 216 C 294 188, 318 160, 340 128';
const J2: Pt = { x: 340, y: 128 };
const BRIDGE: Pt = { x: 270, y: 216 };
/** Both side roads leave westward at the same angle — the junctions look alike. */
const SIDE = { dx: -128, dy: 44 };
const WADI = 'M-10 140 C 70 158, 150 180, 210 196 C 236 203, 254 210, 270 216 C 310 232, 370 262, 430 300 C 480 330, 530 350, 580 360';
const HILL: Pt = { x: 232, y: 74 };

export function JunctionsFigure({ compact }: FigureProps) {
  const id = useId().replace(/:/g, '');
  const sideRoad = (j: Pt) => `M${j.x} ${j.y} C ${j.x - 40} ${j.y + 6}, ${j.x - 84} ${j.y + 22}, ${j.x + SIDE.dx} ${j.y + SIDE.dy}`;

  return (
    <Frame
      compact={compact}
      label="דוגמה מומצאת להמחשה, במפה: ציר לילה מנקודת המוצא עובר בצומת 1, אחרי 1.2 ק״מ, ובצומת 2, אחרי 2.4 ק״מ. שני הצמתים נראים אותו דבר. בין הצמתים יש גשר על ערוץ, וליד צומת 2, שהוא היעד, יש גבעה."
      callouts={
        <>
          <Callout x={J1.x + 24} y={J1.y + 22} extend="right">
            צומת 1 · 1.2 ק״מ
          </Callout>
          <Callout x={BRIDGE.x + 22} y={BRIDGE.y - 16} extend="right">
            גשר על ערוץ
          </Callout>
          <Callout x={J2.x + 24} y={J2.y + 28} extend="right" tone="route">
            צומת 2 · 2.4 ק״מ · היעד
          </Callout>
          <Callout x={HILL.x - 62} y={HILL.y} extend="left">
            גבעה ליד היעד
          </Callout>
        </>
      }
    >
      <MapPaper id={id} />
      {/* Night tint + moon: the example is a night route */}
      <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="#3b4756" opacity={0.07} />
      <g transform="translate(512 46)">
        <circle r={17} fill="#e8dcbd" />
        <circle cx={8} cy={-5} r={15} fill="#F6EEDD" />
      </g>

      <Contours
        paths={['M-10 392 C 60 372, 120 404, 170 420', 'M440 420 C 470 392, 520 384, 570 396']}
        opacity={0.35}
      />
      {/* Hill near the target */}
      <g transform={`translate(${HILL.x} ${HILL.y})`}>
        <ellipse rx={58} ry={30} fill="#d9cfa6" opacity={0.55} stroke="#7a8a5a" strokeWidth={1.2} strokeOpacity={0.55} />
        <ellipse rx={38} ry={19} fill="#c9c79b" opacity={0.5} stroke="#7a8a5a" strokeWidth={1.1} strokeOpacity={0.6} />
        <ellipse rx={17} ry={8} fill="none" stroke="#7a8a5a" strokeWidth={1} strokeOpacity={0.6} />
      </g>

      {/* Wadi */}
      <path d={WADI} fill="none" stroke={STREAM_WIDE} strokeWidth={9} strokeLinecap="round" opacity={0.45} />
      <path d={WADI} fill="none" stroke={STREAM_LINE} strokeWidth={1.6} strokeLinecap="round" opacity={0.6} />

      {/* Main road and the two identical side roads */}
      {[ROAD, sideRoad(J1), sideRoad(J2)].map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke={ROAD_WIDE} strokeWidth={i === 0 ? 14 : 11} strokeLinecap="round" opacity={0.42} />
          <path d={d} fill="none" stroke={ROAD_LINE} strokeWidth={1.3} strokeDasharray="7 5" strokeLinecap="round" opacity={0.6} />
        </g>
      ))}
      {/* Bridge */}
      <g transform={`translate(${BRIDGE.x} ${BRIDGE.y}) rotate(-40)`}>
        <rect x={-8} y={-13} width={16} height={26} rx={2} fill="#efe4cc" stroke="#6f6a5d" strokeWidth={1.4} />
        <line x1={-8} y1={-13} x2={-8} y2={13} stroke="#6f6a5d" strokeWidth={2.6} />
        <line x1={8} y1={-13} x2={8} y2={13} stroke="#6f6a5d" strokeWidth={2.6} />
      </g>
      {/* The same lone tree in the same corner of each junction */}
      {[J1, J2].map((j) => (
        <Pine key={j.x} x={j.x + 30} y={j.y - 8} s={5.2} />
      ))}
      <Bush x={110} y={236} s={5} />
      <Bush x={460} y={220} s={4.5} />
      <Rock x={470} y={384} s={5} />

      {/* Route along the road */}
      <path d={WALKED} fill="none" stroke={ORANGE} strokeWidth={4} strokeLinecap="round" />
      <path d={PLANNED} fill="none" stroke={ORANGE} strokeWidth={3} strokeDasharray="9 7" strokeLinecap="round" opacity={0.9} />
      <circle cx={J1.x} cy={J1.y} r={8} fill={PAPER} stroke={INK} strokeWidth={2.2} />
      <Marker x={J2.x} y={J2.y} kind="ring" />
      <g>
        <circle cx={109} cy={402} r={12} fill={ORANGE} stroke={PAPER} strokeWidth={2.5} />
        <text x={109} y={407} textAnchor="middle" fontSize={13} fontWeight={800} fill={PAPER}>
          A
        </text>
      </g>
    </Frame>
  );
}
