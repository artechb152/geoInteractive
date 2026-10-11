'use client';
import { cn } from '@/lib/utils';
import { LANDSCAPE_LAYERS } from './measurementLandscapeLayers.data';
import { MEASUREMENT_LANDSCAPE as L } from './measurementLandscape.data';
import { LANDSCAPE_ASPECT, STATION_IDS, cutFaceLines, project, stationPins, stationRing, surveyLinePath, type Vec3 } from './measurementLayout';
import type { StationId } from './measurementMission.data';
import { DiagramChip, type BodyTab } from './MeasurementSection';
import { C_ACCENT, C_ELL, C_GEO, C_INK } from './referenceBodiesStyle';

const BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/reference-assets/measurement-mission`;
type LayerId = keyof typeof LANDSCAPE_LAYERS;
/** Overlay drawing space = the render frame; strokes keep their CSS width at any size. */
const FRAME = { w: L.image.w, h: L.image.h };
const SURVEY_LINE = surveyLinePath(FRAME);
const FACE = cutFaceLines(FRAME);
const RINGS = Object.fromEntries(STATION_IDS.map((id) => [id, stationRing(id, FRAME)])) as Record<StationId, string>;
/** The surface view names what the text names: mountains, a wadi, the sea (words from its own sentence). */
const PLACES: { at: Vec3; name: string }[] = [
  { at: L.features.ridge, name: 'הרים' },
  { at: L.features.valley, name: 'גיא' },
  { at: L.features.sea, name: 'ים' },
];

/**
 * The landscape as the renders show it: real terrain (SRTM) rendered in Cycles
 * as a stack of layers from one fixed camera — the opening view of the
 * turnable model (MeasurementLandscape3D) — with the analytic layer drawn over
 * it from the same camera: survey line, station rings, the lines on the cut
 * face, A/B/C pins. Shown while the model loads, and instead of it where there
 * is no WebGL: then nothing turns, and no turning is offered. Layers
 * cross-fade; the sheets are wiped in when the slab opens.
 */
export function MeasurementLandscapeRenders({
  width,
  tab,
  station,
  solved,
  cutOpen,
  reduce,
  onSelect,
  label,
}: {
  width: number;
  tab: BodyTab;
  station: StationId;
  solved: ReadonlySet<StationId>;
  cutOpen: boolean;
  reduce: boolean;
  onSelect: (id: StationId) => void;
  label: string;
}) {
  const height = Math.round(width / LANDSCAPE_ASPECT);
  const k = width / L.image.w;
  const cut = tab === 'geoid' && cutOpen;
  const mission = tab === 'undulation';
  const picking = tab === 'surface' || mission;
  const pins = stationPins({ w: width, h: height });

  const shown: Record<LayerId, boolean> = {
    land: !cut,
    'land-cut': cut,
    geoid: tab === 'geoid' && !cut,
    'geoid-cut': cut,
    'ellipsoid-cut': cut,
    'tripod-A': mission && station === 'A',
    'tripod-B': mission && station === 'B',
    'tripod-C': mission && station === 'C',
  };
  const ease = reduce ? 'none' : undefined;

  return (
    <div className="relative w-full" style={{ height }}>
      <div role="img" aria-label={label} className="absolute inset-0">
        {(Object.keys(LANDSCAPE_LAYERS) as LayerId[]).map((id) => {
          const r = LANDSCAPE_LAYERS[id];
          const sheet = id === 'geoid-cut' || id === 'ellipsoid-cut' || id === 'geoid';
          const on = shown[id];
          return (
            // eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized
            <img
              key={id}
              src={`${BASE}/${r.file}`}
              alt=""
              aria-hidden
              draggable={false}
              decoding="async"
              className="pointer-events-none absolute select-none"
              style={{
                left: r.x * k,
                top: r.y * k,
                width: r.w * k,
                height: r.h * k,
                maxWidth: 'none',
                opacity: on ? 1 : 0,
                // the sheets sweep in across the open slab; the land cross-fades under them
                clipPath: sheet ? (on ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)') : undefined,
                transition:
                  ease ??
                  (sheet
                    ? `opacity 380ms ease ${on ? 160 : 0}ms, clip-path 620ms cubic-bezier(0.22,1,0.36,1) ${on ? 160 : 0}ms`
                    : 'opacity 420ms ease'),
              }}
            />
          );
        })}
      </div>

      {/* live analytic layer, in render-frame units */}
      <svg aria-hidden viewBox={`0 0 ${FRAME.w} ${FRAME.h}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        <g className={cn('transition-opacity duration-300 motion-reduce:transition-none', picking ? 'opacity-100' : 'opacity-0')}>
          <path d={SURVEY_LINE} fill="none" stroke={C_ACCENT} strokeWidth={1.75} strokeDasharray="7 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={0.9} />
          {STATION_IDS.map((id) => (
            <path
              key={id}
              d={RINGS[id]}
              fill={C_ACCENT}
              fillOpacity={0.16}
              stroke={C_ACCENT}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              className={cn('transition-opacity duration-200 motion-reduce:transition-none', id === station ? 'opacity-100' : 'opacity-0')}
            />
          ))}
        </g>
        {/* the cut face is the section along the survey line: the same three lines as below */}
        <g className={cn('transition-opacity motion-reduce:transition-none', cut ? 'opacity-100 delay-300 duration-500' : 'opacity-0 duration-150')}>
          <path d={FACE.ellipsoid} fill="none" stroke={C_ELL} strokeWidth={2.5} strokeDasharray="8 5" vectorEffect="non-scaling-stroke" />
          <path d={FACE.geoid} fill="none" stroke={C_GEO} strokeWidth={4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={FACE.ground} fill="none" stroke={C_INK} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.85} />
        </g>
      </svg>

      {/* place names on the bare surface */}
      <div aria-hidden className={cn('transition-opacity duration-300 motion-reduce:transition-none', tab === 'surface' ? 'opacity-100' : 'opacity-0')}>
        {PLACES.map(({ at, name }) => {
          const p = project(at, FRAME);
          return (
            <span key={name} className="absolute flex flex-col items-center" style={{ left: p.x * k, top: p.y * k, transform: 'translate(-50%, calc(-100% + 2px))' }}>
              <span className="rounded-md bg-paper-card/90 px-1.5 py-0.5 font-display text-[13px] font-bold leading-tight text-fg shadow-[0_1px_3px_rgba(40,50,35,0.25)]">{name}</span>
              <span className="h-2.5 w-px bg-fg/70" />
              <span className="-mt-px size-1 rounded-full bg-fg/70" />
            </span>
          );
        })}
      </div>

      {/* the face's two reference lines, named where they leave the model's left edge */}
      <div aria-hidden className={cn('transition-opacity motion-reduce:transition-none', cut ? 'opacity-100 delay-300 duration-500' : 'opacity-0 duration-150')}>
        <DiagramChip color={C_GEO} wide style={{ left: FACE.geoidLeft.x * k + 6, top: FACE.geoidLeft.y * k, transform: 'translate(0, calc(-100% - 3px))' }}>
          גיאואיד · פני הים
        </DiagramChip>
        <DiagramChip color={C_ELL} wide style={{ left: FACE.ellipsoidLeft.x * k + 6, top: FACE.ellipsoidLeft.y * k, transform: 'translate(0, 4px)' }}>
          אליפסואיד
        </DiagramChip>
      </div>

      {/* A/B/C — buttons where a station can be picked, quiet markers on the cut view */}
      <div className="pointer-events-none absolute inset-0">
        {STATION_IDS.map((id) => (
          <StationPin
            key={id}
            id={id}
            x={pins[id].x}
            y={pins[id].y}
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
