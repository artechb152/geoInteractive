'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
type Checkpoint = {
id: string;
label: string;
feature: string;
icon: IconName;
};
const CHECKPOINTS: Checkpoint[] = [
 { id: '1', label: 'נקודה 1: יוצאים לדרך (נ.ה)', feature: 'אזימוט 070° (מזרח), כ-400 מ׳ (±50): הולכים בקשת חדה לכיוון מזרח אל עבר תחילת ערוץ הנחל.', icon: 'flag' },
 { id: '2', label: 'נקודה 2: עיקול הנחל', feature: 'אזימוט 035° (צפון-מזרח), כ-500 מ׳ (±50) מנקודה 1: מגיעים לערוץ משמעותי ובו זרימת נחל. חוצים את הנחל ונכנסים בשיפוע מתון לכיוון צפון מזרח.', icon: 'wave' },
 { id: '3', label: 'נקודה 3: אוכף הרכס', feature: 'אזימוט 065°, כ-700 מ׳ (±50) מנקודה 2: עולים אל קו הרכס ומכוונים אל האוכף — המעבר הנמוך בין שתי הפסגות. הקרקע עולה משני הצדדים ויורדת במעבר, סימן ודאי שאתם על הציר.', icon: 'mountain' },
 { id: '4', label: 'נקודה 4: חציית ציר', feature: 'אזימוט 050°, כ-500 מ׳ (±50) מנקודה 3: מגיעים לדרך עפר רחבה וחוצים אותה בזהירות.', icon: 'truck' },
 { id: '5', label: 'היעד: נקודת הסיום (נ.ס)', feature: 'אזימוט 040°, כ-600 מ׳ (±50) מנקודה 4: נכנסים לחורשת העצים ומגיעים לקרקע סלעית עם קבוצת עצי אורן בולטים — זהו היעד. מוודאים אימות אחרון ועוצרים.', icon: 'target' },
];
export function PlanningScene() {
return (
 <section id="scene-planning" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="03.2"
eyebrow="תכנון ציר ותנועה"
title={
          <>
          לא רק למתוח קו: איך בונים <span className="gradient-text">סיפור דרך</span> שיעבוד לכם גם בחושך
          </>
        }
intro="לפני שיוצאים לשטח, אנחנו בונים תוכנית מפורטת — מעין 'ספוילר' של מה שהעיניים שלכם אמורות לראות בכל קטע בדרך. ככה גם אם הלילה קשה והדרך מורכבת, אתם לא מאבדים את החוט."
 />

 {/* Concept · matched pair feature cards */}
 <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-12 items-stretch">
 <div className="surface-elevated p-6 sm:p-8 rounded-[4px] flex flex-col">
 <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent-hover mb-2.5">
 <span className="size-1.5 rounded-full bg-accent" aria-hidden />
 הכלי המנחה
 </div>
 <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight mb-3 text-accent-hover">
 סיפור דרך <span className="text-fg-muted font-medium text-base sm:text-lg">(Route Story)</span>
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 תוכנית מפורטת שמתארת מראש <strong className="text-fg">מה העיניים אמורות לראות בכל קטע</strong>. ככה גם בלילה קשה או בדרך מורכבת — לא מאבדים את החוט.
 </p>
 </div>

 <div className="surface-elevated p-6 sm:p-8 rounded-[4px] flex flex-col">
 <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent-hover mb-2.5">
 <span className="size-1.5 rounded-full bg-accent" aria-hidden />
 למה מראש
 </div>
 <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight text-accent-hover mb-3">
 בחושך, המוח עובד פחות — התסריט עובד תמיד
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 תחת לחץ או אחרי שעות של הליכה, המוח עובד פחות טוב. סיפור דרך מוכן מאפשר לנווט <strong className="text-fg">על אוטומט</strong> — עוקבים אחרי ההוראות של עצמכם, בלי חישובים מיותרים.
 </p>
 </div>
 </div>

 <RouteStoryBuilder />

 <div className="my-12">
 <PacingDemo />
 </div>

 <ConclusionCard />
 </section>
 );
}
function RouteStoryBuilder() {
const [active, setActive] = useState(0);
return (
 <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-stretch">
 <div className="space-y-3">
 <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">
 המסלול ב-5 נקודות אימות
 </div>
 <p className="text-xs text-fg-dim leading-relaxed mb-2">
 כל נקודה בסיפור דרך נפתחת ב<strong className="text-fg-muted">אזימוט</strong> וב<strong className="text-fg-muted">מרחק במטרים</strong> (עם טווח משוער) — ורק אז מגיע תיאור הדרך או המקום.
 </p>
 {CHECKPOINTS.map((c, i) => {
const isActive = active === i;
const passed = active > i;
return (
 <motion.button
key={c.id}
onClick={() => setActive(i)}
whileHover={{ x: -3 }}
whileTap={{ scale: 0.98 }}
className={cn(
 'w-full surface p-4 text-right transition-all flex items-start gap-3 relative overflow-hidden rounded-[3px]',
isActive ? 'border-accent bg-bg-elevated' : 'bg-bg-elevated border-border hover:border-accent/50',
passed && !isActive && 'opacity-80'
 )}
 >
 {isActive && (
 <motion.span
layoutId="t3-route-bar"
className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
 />
 )}
 <span
className={cn(
 'size-10 rounded-[3px] flex items-center justify-center shrink-0 border transition-all',
isActive
 ? 'bg-accent text-bg-elevated border-accent'
 : passed
 ? 'bg-status-ok/15 text-status-ok border-status-ok/30'
 : 'bg-bg-accent text-fg-muted border-border'
 )}
 >
 {passed && !isActive ? (
 <Icon name="check" size={16} strokeWidth={2.5} />
 ) : (
 <Icon name={c.icon} size={16} />
 )}
 </span>
 <div className="flex-1 min-w-0 text-right">
 <div className="font-display font-bold text-base text-fg leading-tight">
 {c.label}
 </div>
 <div className="text-xs font-display font-medium tracking-wide text-fg-dim mt-1 leading-relaxed">{c.feature}</div>
 </div>
 </motion.button>
 );
 })}
 </div>

 <div className="surface-elevated bg-bg relative overflow-hidden">
 <RouteMap activeStep={active} />
 </div>
 </div>
 );
}
// ——— Illustrated-map helpers (visual only — no data/logic changes) ———
type Pt = { x: number; y: number };
type Deco = { x: number; y: number; s?: number };

// Catmull-Rom → cubic Bézier, so the orange route reads as an organic trail
// (it still passes exactly through every checkpoint coordinate).
function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  const d = [`M ${pts[0].x} ${pts[0].y}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x} ${p2.y}`);
  }
  return d.join(' ');
}

// Approximate fraction of the route reached at checkpoint `upto`
// (used to reveal the completed orange leg exactly up to the active marker).
function cumulativeFraction(pts: Pt[], upto: number): number {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    seg.push(len);
    total += len;
  }
  if (total === 0) return 0;
  let acc = 0;
  for (let i = 0; i < upto; i++) acc += seg[i] ?? 0;
  return acc / total;
}

function Pine({ x, y, s = 1 }: Deco) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0.25 * s} rx={1.5 * s} ry={0.4 * s} fill="#566b46" opacity={0.16} />
      <rect x={-0.22 * s} y={-0.5 * s} width={0.44 * s} height={1.1 * s} rx={0.15 * s} fill="#8a6a45" />
      <path d={`M0 ${-3.4 * s} L ${1.4 * s} ${-0.9 * s} L ${-1.4 * s} ${-0.9 * s} Z`} fill="#4f7150" />
      <path d={`M0 ${-4.2 * s} L ${1.1 * s} ${-2 * s} L ${-1.1 * s} ${-2 * s} Z`} fill="#6e9a6f" />
      <path d={`M0 ${-4.8 * s} L ${0.82 * s} ${-3.05 * s} L ${-0.82 * s} ${-3.05 * s} Z`} fill="#93b893" />
    </g>
  );
}

function Bush({ x, y, s = 1 }: Deco) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0.15 * s} rx={1.3 * s} ry={0.3 * s} fill="#566b46" opacity={0.14} />
      <circle cx={-0.55 * s} cy={-0.4 * s} r={0.8 * s} fill="#4f7150" />
      <circle cx={0.55 * s} cy={-0.35 * s} r={0.7 * s} fill="#6e9a6f" />
      <circle cx={0} cy={-0.8 * s} r={0.85 * s} fill="#88ad88" />
    </g>
  );
}

function Rock({ x, y, s = 1 }: Deco) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0.18 * s} rx={1.1 * s} ry={0.28 * s} fill="#4a5663" opacity={0.16} />
      <path
        d={`M${-1.05 * s} ${0.25 * s} Q ${-1.2 * s} ${-0.7 * s} ${-0.35 * s} ${-1 * s} Q ${0.6 * s} ${-1.2 * s} ${1 * s} ${-0.45 * s} Q ${1.25 * s} ${0.1 * s} ${0.9 * s} ${0.3 * s} Z`}
        fill="#9aa1a8"
      />
      <path d={`M${-0.35 * s} ${-1 * s} Q ${0.6 * s} ${-1.2 * s} ${1 * s} ${-0.45 * s} L ${0.15 * s} ${-0.5 * s} Z`} fill="#bcc3c9" />
    </g>
  );
}

function Cairn({ x, y, s = 1 }: Deco) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={0.1 * s} rx={1 * s} ry={0.25 * s} fill="#4a5663" opacity={0.16} />
      <ellipse cx={0} cy={-0.2 * s} rx={0.95 * s} ry={0.5 * s} fill="#a7884f" />
      <ellipse cx={0.08 * s} cy={-0.95 * s} rx={0.7 * s} ry={0.42 * s} fill="#c2a26b" />
      <ellipse cx={-0.05 * s} cy={-1.5 * s} rx={0.48 * s} ry={0.32 * s} fill="#d8c08a" />
    </g>
  );
}

const PINES: Deco[] = [
  // grove around the hill (checkpoint 3)
  { x: 41, y: 31, s: 0.85 },
  { x: 44.5, y: 28, s: 0.95 },
  { x: 50.5, y: 26, s: 1 },
  { x: 54.5, y: 29, s: 0.9 },
  { x: 58, y: 32, s: 0.8 },
  // grove the route walks through toward the target (checkpoint 4 → 5)
  { x: 73, y: 27, s: 0.82 },
  // pine cluster on the rocky target ground (checkpoint 5)
  { x: 83, y: 15, s: 0.9 },
  { x: 90, y: 13, s: 1 },
  { x: 86, y: 11, s: 0.8 },
  { x: 93, y: 17, s: 0.8 },
  // scattered cover along the route
  { x: 34, y: 45, s: 0.8 },
  { x: 62, y: 42, s: 0.85 },
  { x: 75, y: 39, s: 0.8 },
];

const BUSHES: Deco[] = [
  { x: 8, y: 66, s: 0.85 },
  { x: 18, y: 64, s: 0.7 },
  { x: 16, y: 55, s: 0.9 },
  { x: 30, y: 57, s: 0.8 },
  { x: 24, y: 46, s: 0.7 },
  { x: 58, y: 46, s: 0.85 },
  { x: 70, y: 41, s: 0.8 },
];

const ROCKS: Deco[] = [
  { x: 22, y: 58, s: 0.7 },
  { x: 40, y: 47, s: 0.7 },
  { x: 63, y: 27, s: 0.7 },
  { x: 84, y: 26, s: 1 },
  { x: 90.5, y: 26, s: 0.85 },
  { x: 80, y: 23, s: 0.75 },
];

const CAIRNS: Deco[] = [
  { x: 38, y: 43, s: 0.8 },
  { x: 78, y: 26, s: 0.8 },
];

function RouteMap({ activeStep }: { activeStep: number }) {
  // 5 checkpoints positioned on the terrain (coordinates unchanged)
  const POINTS: Pt[] = [
    { x: 12, y: 60 }, // 1 · start
    { x: 28, y: 50 }, // 2 · river bend
    { x: 48, y: 38 }, // 3 · hill
    { x: 68, y: 32 }, // 4 · dirt road
    { x: 88, y: 22 }, // 5 · target
  ];

  const routeD = smoothPath(POINTS);
  const revealFrac = cumulativeFraction(POINTS, activeStep);
  const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

  return (
    <div className="relative w-full h-full min-h-[360px] bg-bg">
      <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="t3-paper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFDF9" />
            <stop offset="55%" stopColor="#FBF3E4" />
            <stop offset="100%" stopColor="#F1E5CF" />
          </linearGradient>
          <radialGradient id="t3-sun" cx="0.5" cy="0" r="1">
            <stop offset="0%" stopColor="#FFDCB5" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#FFDCB5" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="t3-vignette" cx="0.5" cy="0.5" r="0.75">
            <stop offset="65%" stopColor="#6b5a38" stopOpacity="0" />
            <stop offset="100%" stopColor="#6b5a38" stopOpacity="0.14" />
          </radialGradient>
          <radialGradient id="t3-hill" cx="0.42" cy="0.32" r="0.85">
            <stop offset="0%" stopColor="#d9c89e" />
            <stop offset="100%" stopColor="#a3b083" />
          </radialGradient>
          <filter id="t3-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.34  0 0 0 0 0.2  0 0 0 0.7 0" />
          </filter>
        </defs>

        {/* Paper base + warm sun wash + fine grain */}
        <rect x="0" y="0" width="100" height="75" fill="url(#t3-paper)" />
        <rect x="0" y="0" width="100" height="75" fill="url(#t3-sun)" />
        <rect x="0" y="0" width="100" height="75" filter="url(#t3-grain)" opacity="0.05" />

        {/* Fine map grid */}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={'gx' + i} x1={i * 10} y1="0" x2={i * 10} y2="75" className="stroke-border-subtle" strokeWidth="0.07" />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={'gy' + i} x1="0" y1={i * 9.4} x2="100" y2={i * 9.4} className="stroke-border-subtle" strokeWidth="0.07" />
        ))}

        {/* Broad topographic contour lines */}
        {[
          'M-4 18 C 18 12, 34 22, 54 16 S 88 22, 104 16',
          'M-4 33 C 16 27, 32 39, 54 32 S 88 39, 104 32',
          'M-4 49 C 14 43, 30 53, 52 47 S 86 55, 104 49',
          'M-4 64 C 18 60, 34 68, 56 62 S 88 70, 104 64',
        ].map((d, i) => (
          <path key={'c' + i} d={d} fill="none" stroke="#c2a26b" strokeWidth="0.18" opacity="0.45" strokeLinecap="round" />
        ))}

        {/* River / wadi — crosses the route near checkpoint 2 */}
        <g>
          <path
            d="M-3 58 C 10 54, 20 50, 28 51 C 38 52, 50 56, 64 54 C 78 52, 92 56, 104 55"
            fill="none"
            stroke="#8ba6ba"
            strokeWidth="2.3"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d="M-3 58 C 10 54, 20 50, 28 51 C 38 52, 50 56, 64 54 C 78 52, 92 56, 104 55"
            fill="none"
            stroke="#52738a"
            strokeWidth="0.5"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>

        {/* Ridge saddle — two summits with a low pass the route threads (checkpoint 3) */}
        <g>
          {/* high-ground massif, pinched at the col so it reads as a saddle
              (east lobe kept north of the CP3→CP4 route so the trail passes below it) */}
          <path
            d="M33 34 Q 32 26.5 40 25 Q 46 25.5 47 30.5 Q 48 31.5 49 30.5 Q 50 25.5 54.5 25.3 Q 59.3 25.7 59 29.3 Q 58.2 31.8 54.5 31.9 Q 50.5 32.2 48 34 Q 45.5 36.8 40 37 Q 33.8 37 33 34 Z"
            fill="url(#t3-hill)"
            opacity="0.5"
          />
          {/* west summit — concentric contours */}
          <path d="M33.5 33 Q 33.5 26 40 26 Q 46.5 26.3 46.5 31 Q 46 36 40 36 Q 34 36 33.5 33 Z" fill="none" stroke="#7a8a5a" strokeWidth="0.18" opacity="0.6" />
          <path d="M36.5 31.4 Q 37 28 40 28 Q 43.4 28.3 43.4 31 Q 43.2 33.6 40 33.6 Q 36.8 33.6 36.5 31.4 Z" fill="none" stroke="#7a8a5a" strokeWidth="0.16" opacity="0.55" />
          {/* east summit — concentric contours (pulled clear of the route) */}
          <path d="M50 31.3 Q 50 25.5 54.5 25.5 Q 59 25.8 58.8 29.3 Q 58.6 31.6 54.5 31.6 Q 50.3 31.6 50 31.3 Z" fill="none" stroke="#7a8a5a" strokeWidth="0.18" opacity="0.6" />
          <path d="M52.5 28.8 Q 52.8 26.6 54.5 26.6 Q 57.3 26.8 57.3 28.8 Q 57.2 30.8 54.5 30.8 Q 52.6 30.8 52.5 28.8 Z" fill="none" stroke="#7a8a5a" strokeWidth="0.16" opacity="0.55" />
          {/* saddle name — under the gap between the two summits */}
          <text
            x="48"
            y="45.6"
            textAnchor="middle"
            fontSize="2.5"
            fontWeight={700}
            fill="#5B7C5C"
            paintOrder="stroke"
            stroke="#FFFBF7"
            strokeWidth="0.75"
            strokeLinejoin="round"
            style={{ fontFamily: 'var(--font-rubik), system-ui, sans-serif' }}
          >
            אוכף
          </text>
        </g>

        {/* Wide dirt road the route crosses (checkpoint 4) */}
        <g>
          <path d="M56 21 Q 67 33 80 45" fill="none" stroke="#c2a26b" strokeWidth="1.7" strokeLinecap="round" opacity="0.45" />
          <path d="M56 21 Q 67 33 80 45" fill="none" stroke="#9c7e48" strokeWidth="0.35" strokeDasharray="1.4 1" strokeLinecap="round" opacity="0.6" />
        </g>

        {/* ——— Route ——— */}
        {/* dirt trail bed (draws in on mount) */}
        <motion.path
          d={routeD}
          fill="none"
          stroke="#cdba90"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.55 }}
          transition={{ duration: 1.1, ease }}
        />
        {/* planned route — faint dashed, gently marching toward the target */}
        <motion.path
          d={routeD}
          fill="none"
          stroke="#EB9E48"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeDasharray="1.4 1.1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-5" dur="3s" repeatCount="indefinite" />
        </motion.path>
        {/* completed route — soft glow underlay + sharp line, revealed to the active checkpoint */}
        <motion.path
          d={routeD}
          fill="none"
          stroke="#EB9E48"
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity="0.28"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: revealFrac }}
          transition={{ duration: 0.7, ease }}
        />
        <motion.path
          d={routeD}
          fill="none"
          stroke="#EB9E48"
          strokeWidth="0.85"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: revealFrac }}
          transition={{ duration: 0.7, ease }}
        />

        {/* ——— Terrain objects ——— */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 1 }}>
          {ROCKS.map((r, i) => (
            <Rock key={'r' + i} {...r} />
          ))}
          {BUSHES.map((b, i) => (
            <Bush key={'b' + i} {...b} />
          ))}
          {CAIRNS.map((c, i) => (
            <Cairn key={'k' + i} {...c} />
          ))}
          {PINES.map((p, i) => (
            <Pine key={'p' + i} {...p} />
          ))}
        </motion.g>

        {/* Target beacon (checkpoint 5) */}
        <g>
          {[0, 1.3].map((begin, i) => (
            <circle key={'bc' + i} cx="88" cy="22" r="2.6" fill="none" stroke="#EB9E48" strokeWidth="0.3">
              <animate attributeName="r" values="2.6;7;2.6" dur="2.6s" begin={`${begin}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0;0.7" dur="2.6s" begin={`${begin}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>

        {/* ——— Checkpoint markers ——— */}
        {POINTS.map((p, i) => {
          const isTarget = i === 4;
          const isActive = i === activeStep;
          const isPassed = i < activeStep;
          const filled = isTarget || isActive || isPassed;
          const disc = isTarget ? '#EB9E48' : filled ? '#749C75' : '#FFFFFF';
          const ringCol = isTarget ? '#d4842f' : '#5B7C5C';
          const numCol = disc === '#FFFFFF' ? '#5B7C5C' : '#FFFFFF';
          const r = isTarget ? 2.7 : isActive ? 2.5 : 2.1;
          return (
            <motion.g
              key={i}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 + i * 0.1, duration: 0.4, ease }}
            >
              <ellipse cx={p.x} cy={p.y + r + 0.5} rx={r * 0.85} ry={r * 0.3} fill="#3a3a3a" opacity="0.13" />
              <circle cx={p.x} cy={p.y} r={r + 0.85} fill="#FFFFFF" />
              {isActive && (
                <circle cx={p.x} cy={p.y} r={r + 0.4} fill="none" stroke="#EB9E48" strokeWidth="0.4">
                  <animate attributeName="r" values={`${r + 0.4};${r + 3};${r + 0.4}`} dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0;0.8" dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={p.x} cy={p.y} r={r} fill={disc} stroke={ringCol} strokeWidth={disc === '#FFFFFF' ? 0.4 : 0.3} />
              {disc !== '#FFFFFF' && (
                <ellipse cx={p.x} cy={p.y - r * 0.38} rx={r * 0.58} ry={r * 0.3} fill="#FFFFFF" opacity="0.2" />
              )}
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={isTarget ? 2.7 : 2.4}
                fontWeight={700}
                fill={numCol}
                style={{ fontFamily: 'var(--font-rubik), system-ui, sans-serif' }}
              >
                {isTarget ? 'B' : i + 1}
              </text>
              {(i === 0 || i === 4) && (
                <text
                  x={p.x}
                  y={p.y + r + 2.4}
                  textAnchor="middle"
                  fontSize="2.1"
                  fontWeight={700}
                  fill={isTarget ? '#d4842f' : '#5B7C5C'}
                  paintOrder="stroke"
                  stroke="#FFFBF7"
                  strokeWidth="0.7"
                  strokeLinejoin="round"
                  style={{ fontFamily: 'var(--font-rubik), system-ui, sans-serif' }}
                >
                  {i === 0 ? 'נ.ה' : 'נ.ס'}
                </text>
              )}
            </motion.g>
          );
        })}

        {/* ——— Map furniture ——— */}
        <g transform="translate(11 12)" opacity="0.6">
          <circle r="3.4" fill="#FFFFFF" opacity="0.7" />
          <circle r="3.4" fill="none" stroke="#C5B695" strokeWidth="0.2" />
          <circle r="2.6" fill="none" stroke="#C5B695" strokeWidth="0.12" />
          {[
            [0, -3.4, 0, -2.7],
            [0, 3.4, 0, 2.7],
            [-3.4, 0, -2.7, 0],
            [3.4, 0, 2.7, 0],
          ].map((t, i) => (
            <line key={'t' + i} x1={t[0]} y1={t[1]} x2={t[2]} y2={t[3]} stroke="#8a7c5c" strokeWidth="0.15" />
          ))}
          <path d="M0 -2.3 L 0.7 0 L 0 0.5 L -0.7 0 Z" fill="#EB9E48" />
          <path d="M0 2.3 L 0.7 0 L 0 -0.5 L -0.7 0 Z" fill="#9aa1a8" />
          <text x="0" y="-3.85" textAnchor="middle" fontSize="1.7" fontWeight={700} fill="#5B7C5C" style={{ fontFamily: 'var(--font-rubik), system-ui, sans-serif' }}>
            צ
          </text>
        </g>
        <g transform="translate(7 70)" opacity="0.65">
          <rect x="0" y="0" width="12" height="0.9" fill="#FFFFFF" stroke="#C5B695" strokeWidth="0.12" />
          <rect x="0" y="0" width="3" height="0.9" fill="#5a6b4a" />
          <rect x="6" y="0" width="3" height="0.9" fill="#5a6b4a" />
          <text x="0" y="-0.7" textAnchor="middle" fontSize="1.5" fill="#6a6a6a" style={{ fontFamily: 'var(--font-rubik), system-ui, sans-serif' }}>
            0
          </text>
          <text x="12" y="-0.7" textAnchor="middle" fontSize="1.5" fill="#6a6a6a" style={{ fontFamily: 'var(--font-rubik), system-ui, sans-serif' }}>
            500מ׳
          </text>
        </g>

        {/* edge vignette for depth */}
        <rect x="0" y="0" width="100" height="75" fill="url(#t3-vignette)" pointerEvents="none" />
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        סיפור דרך · 5 נקודות אימות
      </div>
    </div>
  );
}
function PacingDemo() {
const [distance, setDistance] = useState(500);
const stepLength = 1.5; // אורך צמד צעדים ממוצע
const paces = Math.round(distance / stepLength);
return (
 <div className="surface-elevated p-6 sm:p-8">
 <h3 className="font-display font-bold text-xl leading-tight mb-4 text-center">ספירת צעדים — איך מודדים מרחק בלי GPS?</h3>
 <p className="text-sm text-fg-muted text-center mb-8 max-w-2xl mx-auto">
 השיטה הכי פשוטה והכי בטוחה: סופרים כמה 'צעדים כפולים' (כל פעם שרגל ימין פוגשת את הקרקע) אתם עושים.
 זהו 'מד המרחק' האנושי שלכם. גללו את הסרגל כדי לראות כמה צעדים תצטרכו לעשות.
 </p>

 <div className="grid md:grid-cols-2 gap-8 items-center">
 <div className="space-y-6">
 <div className="flex justify-between items-end">
 <span className="text-xs font-display font-medium tracking-wide text-fg-dim uppercase">מרחק שצריך לעבור:</span>
 <span className="text-4xl font-display font-bold text-accent">{distance} מ'</span>
 </div>
 <input
type="range"
min={50}
max={2000}
step={50}
value={distance}
onChange={(e) => setDistance(Number(e.target.value))}
className="w-full accent-accent"
aria-label="מרחק במטרים"
 />
 <div className="relative h-4 text-[10px] font-display font-medium tracking-wide text-fg-dim">
 {[50, 500, 1000, 1500, 2000].map((val) => {
 const pct = ((val - 50) / (2000 - 50)) * 100; // מיקום אמיתי על הסרגל (מהקצה הימני, RTL)
 return (
 <span
 key={val}
 className="absolute translate-x-1/2 whitespace-nowrap"
 style={{ right: `${pct}%` }}
 >
 {val === 50 ? "50 מ'" : val.toLocaleString()}
 </span>
 );
 })}
 </div>
 </div>

 <div className="surface p-6 rounded-[4px] border-2 border-accent/20 flex flex-col items-center justify-center bg-accent/5">
 <div className="text-[10px] font-display font-medium text-accent mb-2 uppercase tracking-widest">כמות צמדי צעדים משוערת</div>
 <div className="text-6xl font-display font-bold text-accent tabular-nums mb-2">{paces}</div>
 <div className="text-sm font-bold text-fg">זוגות צעדים</div>
 <div className="text-[10px] text-fg-dim mt-4">חישוב: {distance} מ' ÷ 1.5 מ' (אורך צמד צעדים) = {paces}</div>
 </div>
 </div>

 <div className="mt-8 grid sm:grid-cols-2 gap-4">
 <div className="surface p-4 flex gap-3 items-start">
 <div className="size-8 rounded-[3px] bg-accent/10 flex items-center justify-center text-accent shrink-0 font-bold">1</div>
 <p className="text-xs text-fg-muted leading-relaxed">
 <strong className="text-fg">מדידה מראש:</strong> כל אחד צועד קצת אחרת. תמדדו כמה צעדים כפולים לוקח לכם לעבור 100 מטרים במישור.
 </p>
 </div>
 <div className="surface p-4 flex gap-3 items-start">
 <div className="size-8 rounded-[3px] bg-status-warn/10 flex items-center justify-center text-status-warn shrink-0 font-bold">!</div>
 <p className="text-xs text-fg-muted leading-relaxed">
 <strong className="text-fg">פקטור שטח:</strong> בעלייה הצעד מתקצר (תספרו יותר), בירידה הוא מתארך. נווט מנוסה יודע 'לפצות' על זה בספירה.
 </p>
 </div>
 </div>
 </div>
 );
}
function ConclusionCard() {
return (
 <motion.div
initial={{ opacity: 0, y: 20 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
className="surface-elevated p-6 flex gap-4 items-start"
 >
 <Icon name="spark" size={22} className="text-accent-cool shrink-0 mt-0.5" />
 <div>
 <div className="text-sm font-display font-semibold text-accent-cool mb-1 tracking-wider">
 סיכום התכנון
 </div>
 <p className="text-fg leading-relaxed text-pretty">
 תכנון ציר הוא לא רק לסמן קו על מפה. זה לבנות <strong className="text-fg">סיפור</strong> שתוכלו לעקוב אחריו תוך כדי תנועה, ולאמת אותו בעזרת <strong className="text-fg">ספירת צעדים</strong> מדויקת. ככה — גם אם פתאום אין GPS, או שחשוך לגמרי — המסלול עצמו מנחה אתכם הביתה.
 </p>
 </div>
 </motion.div>
 );
}
