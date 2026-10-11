'use client';

import { useId, useState, type CSSProperties, type FocusEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LAND_COVER_RENDERS } from './landCoverRenders.data';

/**
 * LandCoverMap — מבט-על ריאליסטי על שטח לדוגמה לתת-הנושא „תכסית”.
 *
 * רינדור Blender (scripts/blender/render_land_cover.py) במצלמה אורתוגרפית ישר מלמעלה,
 * נעולה 1:1 על אריח המפה (400 × 250), כך שגבולות האזורים, התוויות, קווי ההדגשה ואזורי
 * הלחיצה זהים לגרסת ה-papercut (בארכיון: LandCoverMapV1.tsx).
 * הרמז הלימודי נשמר בשטח עצמו: צומח טבעי = כתמים לא סדורים, צומח נטוע = שורות ומרווחים קבועים.
 * כל אזור הוא שכבה שקופה משלו (ואזור מורם גם שכבת צל), כך שקטגוריה פעילה מודגשת והשאר
 * דהויות; עונה מחליפה בין רינדור חורף לרינדור קיץ, וירוקי־עד (יער נטוע, מטע) לא משתנים.
 *
 * המפה לא משוקפת ב-RTL. כל <text> עם textAnchor מפורש.
 */

export type CoverCat = 'vegetation' | 'human' | 'infra';
export type CoverSeason = 'winter' | 'summer';
export type CoverMapFeature = { id: string; label: string; cat: CoverCat };

const W = 400;
const H = 250;
const EASE = [0.22, 1, 0.36, 1] as const;
const ASSET_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/land-cover`;

type RenderId = keyof typeof LAND_COVER_RENDERS;

/** Tile frame and tag tones (the map's own illustration palette). */
const C = {
  rim: '#C9B892',
  edge: '#D3C4A3',
  shade: '#3E3018',
} as const;

/* ───────────────────────────── geometry ───────────────────────────── */

/** Region hulls — the hit areas and outlines; the render is framed on the same units. */
const HULL = {
  grove:
    'M14,20 C22,6 48,3 66,8 C84,3 110,5 122,15 C132,28 129,46 125,58 C129,72 117,88 97,86 C78,90 58,84 40,88 C22,90 7,78 10,62 C4,48 8,32 14,20 Z',
  garrigue:
    'M12,124 C30,113 60,117 80,115 C100,111 124,116 128,130 C132,146 124,164 104,166 C84,170 60,164 40,168 C20,170 8,158 10,144 C8,136 8,128 12,124 Z',
  terraces:
    'M12,186 C40,173 96,172 127,182 C134,200 133,226 125,245 C90,251 40,251 12,245 C5,226 5,204 12,186 Z',
  batha:
    'M270,212 C290,202 330,206 356,204 C378,202 394,210 394,222 C396,236 386,246 366,246 C340,248 300,246 280,244 C266,240 262,222 270,212 Z',
  planted: 'M150,10 H236 V86 H150 Z',
  fields: 'M147,115 H241 V183 H147 Z',
  reservoir: 'M160,193 H226 Q237,193 237,204 V232 Q237,243 226,243 H160 Q149,243 149,232 V204 Q149,193 160,193 Z',
  village:
    'M268,8 C300,3 360,3 389,9 C397,30 397,62 391,85 C356,92 300,92 266,87 C259,62 259,30 268,8 Z',
  orchard: 'M270,126 H388 V196 H270 Z',
} as const;

const ROAD = 'M-6,108 C80,97 160,113 250,102 S362,90 406,94';
const TRACK = 'M249,103 C247,132 251,150 249,172 S247,222 249,256 M249,160 H268';
const POWER_X = 139;
const POWER = `M${POWER_X},-4 V${H + 4}`;
const FENCE = 'M268,156 V124 H390 V198 H268 V164';

type Shape = { kind: 'area'; d: string } | { kind: 'line'; d: string; w: number };

const SHAPES: Record<string, Shape> = {
  grove: { kind: 'area', d: HULL.grove },
  garrigue: { kind: 'area', d: HULL.garrigue },
  batha: { kind: 'area', d: HULL.batha },
  planted: { kind: 'area', d: HULL.planted },
  terraces: { kind: 'area', d: HULL.terraces },
  fields: { kind: 'area', d: HULL.fields },
  village: { kind: 'area', d: HULL.village },
  orchard: { kind: 'area', d: HULL.orchard },
  reservoir: { kind: 'area', d: HULL.reservoir },
  road: { kind: 'line', d: ROAD, w: 13 },
  track: { kind: 'line', d: TRACK, w: 10 },
  power: { kind: 'line', d: POWER, w: 12 },
  fence: { kind: 'line', d: FENCE, w: 8 },
};

/** Where each region's name tag sits (map units). */
const TAG_AT: Record<string, [number, number]> = {
  grove: [68, 47],
  garrigue: [70, 141],
  batha: [332, 226],
  planted: [193, 48],
  terraces: [69, 213],
  fields: [194, 149],
  village: [326, 44],
  orchard: [329, 160],
  reservoir: [193, 218],
  road: [196, 108],
  track: [249, 133],
  power: [POWER_X, 148],
  fence: [329, 124],
};

/** Hit groups, in the papercut's order (later ones win where they overlap; same tab order). */
const REGION_ORDER = [
  'grove', 'garrigue', 'batha', 'planted', 'terraces', 'fields', 'village', 'orchard', 'reservoir',
  'track', 'road', 'power', 'fence',
] as const;

/* ───────────────────────────── render layers ───────────────────────────── */

/** Drawn below the cast shadows (nothing in them stands up). */
const FLAT = ['batha', 'terraces', 'fields', 'track', 'road'] as const;
/** Each casts a shadow on the land around it (drawn under all of them, dimmed with its own region). */
const RAISED = ['grove', 'garrigue', 'planted', 'village', 'orchard', 'reservoir', 'power', 'fence'] as const;
/** Rendered once per season; the rest look the same all year. */
const SEASONAL = new Set<string>(['grove', 'garrigue', 'batha', 'terraces', 'fields']);

const SEASON_MS = 700;
const DIM_STYLE = 'transition-opacity duration-300 ease-snap motion-reduce:transition-none';

/** One rendered layer, placed in map units. Never a hit target. */
function Render({ id, style }: { id: RenderId; style?: CSSProperties }) {
  const r = LAND_COVER_RENDERS[id];
  return (
    <image
      href={`${ASSET_BASE}/${r.file}`}
      x={r.x}
      y={r.y}
      width={r.w}
      height={r.h}
      preserveAspectRatio="none"
      pointerEvents="none"
      style={style}
    />
  );
}

/**
 * Winter ↔ summer: the summer layer fades over a fully drawn winter layer (like the
 * papercut's 700 ms colour change), and winter is dropped only once summer covers it.
 */
function Seasonal({ id, season, reduce }: { id: string; season: CoverSeason; reduce: boolean }) {
  if (!SEASONAL.has(id) && id !== 'ground') return <Render id={id as RenderId} />;
  const summer = season === 'summer';
  return (
    <>
      <Render
        id={`${id}-winter` as RenderId}
        style={{ opacity: summer ? 0 : 1, transition: reduce || !summer ? 'none' : `opacity 0s linear ${SEASON_MS}ms` }}
      />
      <Render
        id={`${id}-summer` as RenderId}
        style={{ opacity: summer ? 1 : 0, transition: reduce ? 'none' : `opacity ${SEASON_MS}ms cubic-bezier(0.22,1,0.36,1)` }}
      />
    </>
  );
}

/* ───────────────────────────── overlays ───────────────────────────── */

function Outline({ shape, mode }: { shape: Shape; mode: 'selected' | 'hover' | 'focus' }) {
  if (shape.kind === 'line') {
    if (mode === 'selected')
      return (
        <>
          <path d={shape.d} fill="none" stroke="#D97E2B" strokeOpacity={0.28} strokeWidth={shape.w} strokeLinecap="round" strokeLinejoin="round" />
          <path d={shape.d} fill="none" stroke="#D97E2B" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    return (
      <path
        d={shape.d}
        fill="none"
        stroke={mode === 'focus' ? '#D97E2B' : '#38432E'}
        strokeOpacity={mode === 'focus' ? 0.35 : 0.14}
        strokeWidth={shape.w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (mode === 'selected')
    return (
      <>
        <path d={shape.d} fill="#D97E2B" fillOpacity={0.08} stroke="#D97E2B" strokeOpacity={0.25} strokeWidth={6} strokeLinejoin="round" />
        <path d={shape.d} fill="none" stroke="#D97E2B" strokeWidth={1.8} strokeLinejoin="round" />
      </>
    );
  return (
    <>
      <path d={shape.d} fill="#FFFFFF" fillOpacity={0.12} stroke="#FFFFFF" strokeWidth={3} strokeLinejoin="round" />
      <path
        d={shape.d}
        fill="none"
        stroke={mode === 'focus' ? '#D97E2B' : '#38432E'}
        strokeWidth={mode === 'focus' ? 1.6 : 1.1}
        strokeDasharray="3.5 2.5"
        strokeLinejoin="round"
      />
    </>
  );
}

function Tag({ x, y, label, selected }: { x: number; y: number; label: string; selected: boolean }) {
  const w = label.length * 4.7 + 13;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-w / 2 + 0.6} y={-6.3} width={w} height={14} rx={7} fill={C.shade} opacity={0.14} />
      <rect
        x={-w / 2}
        y={-7.5}
        width={w}
        height={14}
        rx={7}
        fill={selected ? '#D97E2B' : '#FFFFFF'}
        fillOpacity={selected ? 1 : 0.95}
        stroke={selected ? '#C96714' : '#DCCDB2'}
        strokeWidth={0.7}
      />
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="middle"
        direction="rtl"
        fontSize={8.4}
        fontWeight={700}
        fill={selected ? '#FFFFFF' : '#38432E'}
      >
        {label}
      </text>
    </g>
  );
}

/* ───────────────────────────── the map ───────────────────────────── */

export function LandCoverMap({
  features,
  cat,
  selectedId,
  season,
  onSelect,
  ariaLabel,
}: {
  features: CoverMapFeature[];
  cat: CoverCat;
  selectedId: string | null;
  season: CoverSeason;
  onSelect: (id: string) => void;
  ariaLabel: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const reduce = !!useReducedMotion();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const featureOf = (id: string) => features.find((f) => f.id === id)!;
  const lit = (id: string) => featureOf(id).cat === cat || selectedId === id;
  const ids = {
    tile: `${uid}-tile`,
    dim: `${uid}-dim`,
  };

  /** A region's rendered layers: full strength in the active category, faded and greyed otherwise. */
  const visual = (id: string) => (
    <g
      key={id}
      className={DIM_STYLE}
      style={{ opacity: lit(id) ? 1 : 0.38 }}
      filter={lit(id) ? undefined : `url(#${ids.dim})`}
    >
      <Seasonal id={id} season={season} reduce={reduce} />
    </g>
  );

  const region = (id: string) => {
    const f = featureOf(id);
    const inCat = f.cat === cat;
    const shape = SHAPES[id];
    return (
      <g
        key={id}
        data-region={id}
        role="button"
        tabIndex={inCat ? 0 : -1}
        aria-label={f.label}
        aria-pressed={selectedId === id}
        onClick={() => onSelect(id)}
        onKeyDown={(e: KeyboardEvent<SVGGElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(id);
          }
        }}
        onMouseEnter={() => setHoverId(id)}
        onMouseLeave={() => setHoverId((h) => (h === id ? null : h))}
        onFocus={(e: FocusEvent<SVGGElement>) => {
          if (e.currentTarget.matches(':focus-visible')) setFocusId(id);
        }}
        onBlur={() => setFocusId((h) => (h === id ? null : h))}
        className="cursor-pointer outline-none"
      >
        {shape.kind === 'area' ? (
          <path d={shape.d} fill="transparent" />
        ) : (
          <path d={shape.d} fill="none" stroke="transparent" strokeWidth={shape.w} pointerEvents="stroke" />
        )}
      </g>
    );
  };

  const hotId = focusId ?? hoverId;
  const tagIds = features
    .filter((f) => f.cat === cat || f.id === hotId || f.id === selectedId)
    .map((f) => f.id);

  return (
    <svg
      viewBox={`-6 -6 ${W + 12} ${H + 14}`}
      className="w-full h-auto select-none"
      role="group"
      aria-label={ariaLabel}
    >
      <defs>
        <clipPath id={ids.tile}>
          <rect x={0} y={0} width={W} height={H} rx={10} />
        </clipPath>
        <filter id={ids.dim}>
          <feColorMatrix type="saturate" values="0.15" />
        </filter>
      </defs>

      {/* tile: rim + rendered land */}
      <rect x={0} y={3} width={W} height={H} rx={10} fill={C.rim} />
      <g clipPath={`url(#${ids.tile})`}>
        <Seasonal id="ground" season={season} reduce={reduce} />

        {/* flat regions, then every cast shadow, then the raised regions */}
        {FLAT.map(visual)}
        <g pointerEvents="none">
          {RAISED.map((id) => (
            <g key={id} className={DIM_STYLE} style={{ opacity: lit(id) ? 1 : 0.38 }}>
              <Render id={`shadow-${id}` as RenderId} />
            </g>
          ))}
        </g>
        {RAISED.map(visual)}

        {/* hit areas — the hulls, transparent, in the original order */}
        {REGION_ORDER.map(region)}

        {/* overlays — never intercept the pointer */}
        <g pointerEvents="none" aria-hidden>
          {hotId && hotId !== selectedId && <Outline shape={SHAPES[hotId]} mode={focusId ? 'focus' : 'hover'} />}
          <AnimatePresence>
            {selectedId && SHAPES[selectedId] && (
              <motion.g
                key={selectedId}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
              >
                <Outline shape={SHAPES[selectedId]} mode="selected" />
              </motion.g>
            )}
          </AnimatePresence>
          {tagIds.map((id) => (
            <Tag key={id} x={TAG_AT[id][0]} y={TAG_AT[id][1]} label={featureOf(id).label} selected={id === selectedId} />
          ))}
        </g>
      </g>
      <rect x={0.4} y={0.4} width={W - 0.8} height={H - 0.8} rx={9.6} fill="none" stroke={C.edge} strokeWidth={0.8} pointerEvents="none" />
    </svg>
  );
}
