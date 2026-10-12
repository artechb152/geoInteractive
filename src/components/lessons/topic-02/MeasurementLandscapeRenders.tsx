'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MEASUREMENT_FALLBACK as FB } from './measurementFallback.data';
import { MEASUREMENT_LANDSCAPE as L } from './measurementLandscape.data';
import { STATION_IDS, SURVEY_SPAN, displayed, geoidZ, groundZ, stationWorld, undulationAt, type Pt, type Vec3 } from './measurementLayout';
import { C_GEO, C_H } from './referenceBodiesStyle';
import { STATIONS, type StationId } from './measurementMission.data';
import type { BodyTab } from './MeasurementSection';
import { LAND_START, hiddenBy, landCamera, livePins, projectWith, type HeightGrid } from './measurementView';

const BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/reference-assets/measurement-mission`;
/** The surface view names what the text names: mountains, a wadi, the sea (words from its own sentence). */
const PLACES: { at: Vec3; name: string }[] = [
  { at: displayed(L.features.ridge), name: 'הרים' },
  { at: displayed(L.features.valley), name: 'גיא' },
  { at: displayed(L.features.sea), name: 'ים' },
];
const SPAN_ENDS: Vec3[] = [SURVEY_SPAN.s0, SURVEY_SPAN.s1].map((s) => {
  const i = Math.round(s / L.line.step);
  return [(s - (L.width / 2) * L.mPerUnit) / L.mPerUnit, L.lineY, Math.max(groundZ(L.line.H[i], L.line.N[i]), geoidZ(L.line.N[i])) + 0.006] as Vec3;
});
type Still = keyof typeof FB.files;

/**
 * The landscape without WebGL (and while the model loads): stills of the turnable
 * model itself in the surface view's profile (scripts/qa/capture-measurement-fallback.mjs
 * draws them from the same height grid and image), so the fallback is the model's
 * opening view. Over them, from the same camera solve (landCamera(LAND_START)):
 * the A/B/C pins, the place names and the survey line's ends. Nothing turns here
 * and no turning is offered; the geoid view's reveal and the task view's receiver
 * are stills of their own, cross-faded.
 */
export function MeasurementLandscapeRenders({
  width,
  tab,
  station,
  solved,
  clear,
  reduce,
  grid,
  onSelect,
  label,
  geoidLabel,
}: {
  width: number;
  tab: BodyTab;
  station: StationId;
  solved: ReadonlySet<StationId>;
  /** The geoid view's reveal: the see-through ground. */
  clear: boolean;
  reduce: boolean;
  /** The height grid, when it has loaded: what the ground hides from the profile. */
  grid: HeightGrid | null;
  onSelect: (id: StationId) => void;
  label: string;
  /** The geoid's name on the see-through still. */
  geoidLabel: string;
}) {
  const height = Math.round((width * FB.frame.h) / FB.frame.w);
  const size = useMemo(() => ({ w: width, h: height }), [width, height]);
  // the stills' own camera: the profile, registered with the section as it was when they were taken
  const cam = useMemo(() => landCamera(LAND_START, size, FB.span ? (FB.span * size.w) / FB.frame.w : undefined), [size]);
  const mission = tab === 'undulation';
  // where a station is picked: the bare surface, the geoid view (from which surface H is measured), the task
  const picking = tab !== 'ellipsoid';
  const pins = livePins(cam, size, grid);
  const seen = (p: Vec3) => !grid || !hiddenBy(grid, p, cam.eye);
  const shown: Still = mission ? (`task-${station}` as Still) : tab === 'geoid' && clear ? 'clear' : 'land';

  return (
    <div className="relative w-full" style={{ height }}>
      <div role="img" aria-label={label} className="absolute inset-0">
        {(Object.keys(FB.files) as Still[]).map((id) => (
          // eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized
          <img
            key={id}
            src={`${BASE}/${FB.files[id]}`}
            alt=""
            aria-hidden
            draggable={false}
            decoding="async"
            className="pointer-events-none absolute inset-0 h-full w-full select-none"
            style={{ opacity: id === shown ? 1 : 0, transition: reduce ? 'none' : 'opacity 420ms ease' }}
          />
        ))}
      </div>

      {/* place names on the bare surface */}
      <div aria-hidden className={cn('transition-opacity duration-300 motion-reduce:transition-none', tab === 'surface' ? 'opacity-100' : 'opacity-0')}>
        {PLACES.map(({ at, name }) => {
          const p = projectWith(cam.matrix, at, size);
          return (
            <span
              key={name}
              className="absolute flex flex-col items-center"
              style={{ left: p.x, top: p.y, transform: 'translate(-50%, calc(-100% + 2px))', opacity: seen(at) ? 1 : 0 }}
            >
              <span className="rounded-md bg-paper-card/90 px-1.5 py-0.5 font-display text-[13px] font-bold leading-tight text-fg shadow-[0_1px_3px_rgba(40,50,35,0.25)]">{name}</span>
              <span className="h-2.5 w-px bg-fg/70" />
              <span className="-mt-px size-1 rounded-full bg-fg/70" />
            </span>
          );
        })}
      </div>

      {/* the survey line's two ends (the line itself is in the stills) */}
      <div aria-hidden className="pointer-events-none">
        {SPAN_ENDS.map((w, i) => {
          const p = projectWith(cam.matrix, w, size);
          return (
            <span
              key={i}
              className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper-bright bg-accent"
              style={{ left: p.x, top: p.y, opacity: seen(w) ? 1 : 0 }}
            />
          );
        })}
      </div>

      {/* the see-through still: H measured from the geoid at the picked station, and the geoid named, as on the live model */}
      <GeoidHeight
        foot={projectWith(cam.matrix, [stationWorld(station)[0], stationWorld(station)[1], geoidZ(STATIONS[station].N)], size)}
        top={projectWith(cam.matrix, stationWorld(station), size)}
        shown={tab === 'geoid' && clear}
        reduce={reduce}
      />
      {(() => {
        const g = projectWith(cam.matrix, GEOID_ANCHOR, size);
        return <GeoidLabel x={g.x} y={g.y} shown={tab === 'geoid' && clear} text={geoidLabel} />;
      })()}

      {/* A/B/C — buttons where a station can be picked */}
      <div className="pointer-events-none absolute inset-0">
        {STATION_IDS.map((id) => (
          <StationPin
            key={id}
            id={id}
            x={pins[id].x}
            y={pins[id].y}
            hidden={pins[id].hidden}
            active={picking && id === station}
            solved={mission && solved.has(id)}
            interactive={picking}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Where the geoid's name is anchored: its edge on the model's front face, under the land (between
 * C and B) — below the ground, where the see-through block holds nothing else.
 */
const GEOID_LABEL_X = -2.1;
export const GEOID_ANCHOR: Vec3 = [GEOID_LABEL_X, -L.depth / 2, geoidZ(undulationAt(GEOID_LABEL_X * L.mPerUnit, (-L.depth / 2) * L.mPerUnit))];

/** The geoid named on the see-through model: a short leader down from its edge under the land to the name. */
export function GeoidLabel({ x, y, shown, text }: { x: number; y: number; shown: boolean; text: string }) {
  return (
    <span
      aria-hidden
      data-geoid-label
      className="pointer-events-none absolute flex flex-col items-center transition-opacity duration-300 motion-reduce:transition-none"
      style={{ left: x, top: y, transform: 'translate(-50%, -3px)', opacity: shown ? 1 : 0 }}
    >
      <span className="size-1.5 rounded-full" style={{ background: C_GEO }} />
      <span className="h-4 w-px" style={{ background: C_GEO }} />
      <span
        className="whitespace-nowrap rounded-md border-[1.5px] bg-paper-card/95 px-1.5 py-0.5 font-display text-[13px] font-bold leading-tight shadow-[0_1px_3px_rgba(40,50,35,0.2)]"
        style={{ borderColor: C_GEO, color: C_GEO }}
      >
        {text}
      </span>
    </span>
  );
}

/**
 * The geoid view, see-through, with a station picked: H measured from the geoid — a line from the
 * geoid right under the station up to its ground point, a dot where it leaves the geoid, and its
 * letter. Projected with the model's (or the stills') camera; it comes in once the geoid has swept
 * in under the land. Shared by the turnable model's overlay and the stills.
 */
export function GeoidHeight({ foot, top, shown, reduce }: { foot: Pt; top: Pt; shown: boolean; reduce: boolean }) {
  // only on the page while it is shown: no stray letter over the model in the other views
  if (!shown) return null;
  return (
    <motion.div
      aria-hidden
      data-geoid-height
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : 1 }}
    >
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <line x1={foot.x} y1={foot.y} x2={top.x} y2={top.y} stroke="#FDFBF3" strokeWidth={6} strokeLinecap="round" opacity={0.7} />
        <line x1={foot.x} y1={foot.y} x2={top.x} y2={top.y} stroke={C_H} strokeWidth={3} strokeLinecap="round" />
        <circle cx={foot.x} cy={foot.y} r={4} fill={C_H} stroke="#FDFBF3" strokeWidth={1.5} />
      </svg>
      <span
        className="absolute font-display text-base font-bold leading-none"
        style={{ left: (foot.x + top.x) / 2 + 8, top: (foot.y + top.y) / 2, transform: 'translate(0, -50%)', color: C_H, textShadow: '0 0 3px #FDFBF3, 0 0 3px #FDFBF3' }}
      >
        H
      </span>
    </motion.div>
  );
}

/** A station's pin: a lettered head on a short stem, its foot on the ground point. Shared with the turnable model's overlay. */
export function StationPin({
  id,
  x,
  y,
  active,
  solved,
  interactive,
  onSelect,
  hidden = false,
}: {
  id: StationId;
  x: number;
  y: number;
  active: boolean;
  solved: boolean;
  interactive: boolean;
  onSelect: (id: StationId) => void;
  /** The ground hides the point from this angle: the pin stays (and stays pickable), drawn as behind. */
  hidden?: boolean;
}) {
  const head = cn(
    'grid place-items-center rounded-full border-2 font-display font-bold leading-none shadow-[0_2px_6px_rgba(40,50,35,0.35)] transition-colors duration-200 ease-snap motion-reduce:transition-none',
    active
      ? 'size-9 border-paper-bright bg-accent text-base text-white ring-2 ring-accent'
      : solved
        ? 'size-8 border-paper-bright bg-brand-dark text-sm text-white'
        : 'size-8 border-brand-dark bg-bg-elevated text-sm text-brand-dark',
    interactive && !active && 'group-hover:border-accent',
    hidden && 'border-dashed shadow-none',
    'group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2',
  );
  const body = (
    <>
      <span className={head}>{id}</span>
      <span className={cn('h-3 w-0.5', active ? 'bg-accent' : 'bg-brand-dark', hidden && 'opacity-0')} />
      <span className={cn('-mt-px size-1.5 rounded-full', active ? 'bg-accent' : 'bg-brand-dark')} />
    </>
  );
  const place = { left: x, top: y, transform: 'translate(-50%, calc(-100% + 3px))', opacity: hidden ? 0.55 : 1 };
  if (!interactive) {
    return (
      <span aria-hidden className="absolute flex flex-col items-center" style={place}>
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={`תחנה ${id}${solved ? ' (נפתרה)' : ''}`}
      aria-pressed={active}
      onClick={() => onSelect(id)}
      className="group pointer-events-auto absolute flex cursor-pointer flex-col items-center focus-visible:outline-none"
      style={place}
    >
      {body}
    </button>
  );
}
