'use client';
import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { ModelLoading } from '@/components/lesson/ModelLoading';
import { GEOID_ANCHOR, GeoidHeight, GeoidLabel, MeasurementLandscapeRenders, StationPin } from './MeasurementLandscapeRenders';
import { MEASUREMENT_FALLBACK as FB } from './measurementFallback.data';
import { MEASUREMENT_LANDSCAPE as L } from './measurementLandscape.data';
import { STATION_IDS, SURVEY_SPAN, displayed, geoidZ, groundZ, stationWorld, type Vec3 } from './measurementLayout';
import { STATIONS } from './measurementMission.data';
import type { StationId } from './measurementMission.data';
import type { BodyTab } from './MeasurementSection';
import { MODEL_URLS, heightGrid, hiddenBy, projectWith, type HeightGrid, type LandCamera, type LivePin, type ModelState } from './measurementView';
import { arrowTurn, useDragTurn } from './viewControls';

/**
 * Where the turnable model stands:
 *   pending   before the first effect (server render, first paint)
 *   loading   WebGL is there; the heights, the code, the ground image or the first frame are on their way
 *   live      the model has drawn a frame with its ground image on it
 *   lost      the browser took the model's WebGL context away (it may give it back)
 *   failed    a file or the code did not arrive, or nothing was drawn in time
 *   no-webgl  this browser cannot draw it
 * In every state but `live` the stage shows the stills, and nothing offers to turn.
 */
export type LandscapeStatus = 'pending' | 'loading' | 'live' | 'lost' | 'failed' | 'no-webgl';
/** What went wrong, for the QA scripts and the console — the reader sees one plain sentence. */
export type LandscapeFailure = 'heights' | 'code' | 'image' | 'webgl' | 'timeout';

export type LandscapeSource = {
  status: LandscapeStatus;
  failure: LandscapeFailure | null;
  /** 'pending' until WebGL is known; 'renders' without it (or when the model fails). */
  mode: 'pending' | '3d' | 'renders';
  grid: HeightGrid | null;
  /** The model is up and drawn: the overlay moves onto it. */
  ready: boolean;
  /** Bumped by retry(): the model is built again from scratch (a fresh WebGL context). */
  attempt: number;
  onReady: () => void;
  onFail: (why: LandscapeFailure) => void;
  onLost: () => void;
  retry: () => void;
};

/** The heights file has this long to arrive (ms) before the model gives up and the stills stay. */
const HEIGHTS_TIMEOUT_MS = 15000;

/**
 * Whether this browser draws WebGL 2 — asked once per page. The probe's context is
 * given back at once: it would otherwise count against the browser's limit of live
 * contexts until garbage collection, a few more on every visit to this sub-topic.
 */
let webglProbe: boolean | null = null;
function canDrawWebGL(): boolean {
  if (webglProbe !== null) return webglProbe;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    webglProbe = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglProbe = false;
  }
  return webglProbe;
}

/**
 * WebGL or not, the model's status, and the height grid the model and the
 * overlay's hiding test share (loaded either way: without WebGL it still says
 * what the ground hides). Every request is aborted when the scene unmounts, and
 * nothing that answers after that touches the state.
 */
export function useLandscapeSource(): LandscapeSource {
  const [status, setStatus] = useState<LandscapeStatus>('pending');
  const [failure, setFailure] = useState<LandscapeFailure | null>(null);
  const [grid, setGrid] = useState<HeightGrid | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const webgl = canDrawWebGL();
    if (webgl) setStatus((s) => (s === 'live' ? s : 'loading'));
    else setStatus('no-webgl');
    if (grid) return;
    let live = true;
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), HEIGHTS_TIMEOUT_MS);
    fetch(MODEL_URLS.heights, { signal: ac.signal })
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((buf) => live && setGrid(heightGrid(buf)))
      .catch((e) => {
        if (!live) return;
        console.warn('[measurement] heights did not load:', e?.message ?? e);
        // without WebGL the stills need nothing more; with it, the model cannot be built
        if (webgl) {
          setFailure('heights');
          setStatus('failed');
        }
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      live = false;
      window.clearTimeout(timer);
      ac.abort();
    };
    // a retry asks again only for what has not arrived
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const onReady = useCallback(() => {
    setFailure(null);
    setStatus((s) => (s === 'loading' || s === 'lost' ? 'live' : s));
  }, []);
  const onFail = useCallback((why: LandscapeFailure) => {
    console.warn('[measurement] the 3-D model is not shown:', why);
    setFailure(why);
    setStatus((s) => (s === 'no-webgl' ? s : 'failed'));
  }, []);
  const onLost = useCallback(() => setStatus((s) => (s === 'live' || s === 'loading' ? 'lost' : s)), []);
  const retry = useCallback(() => {
    setFailure(null);
    setStatus('loading');
    setAttempt((n) => n + 1);
  }, []);

  const mode: LandscapeSource['mode'] = status === 'pending' ? 'pending' : status === 'loading' || status === 'live' || status === 'lost' ? '3d' : 'renders';
  return { status, failure, mode, grid, ready: status === 'live', attempt, onReady, onFail, onLost, retry };
}

type Model3D = (typeof import('./MeasurementLandscape3D'))['default'];
/** How long the model may take, while its view is on screen, to draw its first frame (ms). */
const DRAW_TIMEOUT_MS = 20000;

/**
 * The model's code, fetched on first need and again on a retry (a chunk that failed
 * to load is requested afresh). A failure is reported, never thrown: the stills stay.
 */
function useModel3D(wanted: boolean, attempt: number, onFail: (why: LandscapeFailure) => void) {
  const [Comp, setComp] = useState<Model3D | null>(null);
  useEffect(() => {
    if (!wanted || Comp) return;
    let live = true;
    import('./MeasurementLandscape3D')
      .then((m) => live && setComp(() => m.default))
      .catch((e) => {
        console.warn('[measurement] the model code did not load:', e?.message ?? e);
        if (live) onFail('code');
      });
    return () => {
      live = false;
    };
  }, [wanted, attempt, Comp, onFail]);
  return Comp;
}

/** The surface view names what its text names: mountains, a wadi, the sea. */
const PLACES: { at: Vec3; name: string }[] = [
  { at: displayed(L.features.ridge), name: 'הרים' },
  { at: displayed(L.features.valley), name: 'גיא' },
  { at: displayed(L.features.sea), name: 'ים' },
];

/** The survey line's two ends over SURVEY_SPAN, on the ground (or the water) — the same anchors as the section's. */
const SPAN_ENDS: Vec3[] = [SURVEY_SPAN.s0, SURVEY_SPAN.s1].map((s) => {
  const i = Math.round(s / L.line.step);
  const H = L.line.H[i];
  const N = L.line.N[i];
  return [(s - (L.width / 2) * L.mPerUnit) / L.mPerUnit, L.lineY, Math.max(groundZ(H, N), geoidZ(N)) + 0.006] as Vec3;
});

/**
 * The landscape stage of the three landscape views. With WebGL it is the
 * turnable model (drag, or the arrow keys once it has focus) with its HTML layer
 * over it — the station pins, the place names and the survey line's ends — all
 * placed by the model's own camera. Until the model is up, and wherever there
 * is no WebGL, it is the renders (the same landscape from the surface view's
 * profile), and nothing offers to turn.
 */
export function MeasurementLandscape({
  width,
  height,
  source,
  cam,
  pins,
  model,
  tab,
  station,
  solved,
  reduce,
  active,
  onSelect,
  onTurn,
  label,
  turnLabel,
  geoidLabel,
}: {
  width: number;
  height: number;
  source: LandscapeSource;
  cam: LandCamera;
  pins: Record<StationId, LivePin>;
  model: ModelState;
  tab: BodyTab;
  station: StationId;
  solved: ReadonlySet<StationId>;
  reduce: boolean;
  /** The landscape is on the stage (not the ellipsoid view). */
  active: boolean;
  onSelect: (id: StationId) => void;
  /** Turn by (round, tilt) degrees of the model — round + brings its right side forward. */
  onTurn: (round: number, tilt: number) => void;
  /** The landscape's description; and with how to turn it, for the turnable model. */
  label: string;
  turnLabel: string;
  /** The geoid's name on the see-through model. */
  geoidLabel: string;
}) {
  const live = source.status === 'live';
  const size = { w: width, h: height };
  const building = source.status === 'loading' || source.status === 'live' || source.status === 'lost';
  const Model3D = useModel3D(building && !!source.grid, source.attempt, source.onFail);
  // Nothing drawn in time while the landscape is on screen (a file that never answers, a context
  // that never comes): give up and say so. The clock stops while another view holds the stage,
  // since no frame can be drawn then.
  const { status, attempt, onFail } = source;
  useEffect(() => {
    if (!active || status !== 'loading') return;
    const t = window.setTimeout(() => onFail('timeout'), DRAW_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [active, status, attempt, onFail]);
  const { dragging, handlers } = useDragTurn((dx, dy) => onTurn(dx * 0.32, dy * 0.28));
  const mission = tab === 'undulation';
  // where a station is picked: the bare surface, the geoid view (from which surface H is measured), the task
  const picking = tab !== 'ellipsoid';
  const at = (p: Vec3) => projectWith(cam.matrix, p, size);
  const seen = (p: Vec3) => model.clear || !source.grid || !hiddenBy(source.grid, p, cam.eye);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => arrowTurn(e, onTurn);

  // the stills keep their own proportions, centred in the stage
  const rw = Math.min(width, Math.round((height * FB.frame.w) / FB.frame.h));
  const rh = Math.round((rw * FB.frame.h) / FB.frame.w);

  return (
    <div
      className={cn('relative h-full w-full select-none', live && (dragging ? 'cursor-grabbing' : 'cursor-grab'))}
      style={{ touchAction: live ? 'pan-y' : undefined }}
      // the state the page shows, for the QA scripts (scripts/qa/shot-measurement-mission.mjs)
      data-landscape={live ? 'live' : source.mode === 'renders' ? 'renders' : 'loading'}
      data-landscape-status={source.status}
      data-landscape-failure={source.failure ?? ''}
      data-clear={model.clear}
      data-tripod={model.tripod ?? ''}
      {...(live ? handlers : {})}
    >
      {/* the renders: until the model is drawn, and instead of it without WebGL */}
      {!live && (
        <div className="absolute" style={{ left: (width - rw) / 2, top: (height - rh) / 2, width: rw, height: rh }}>
          <MeasurementLandscapeRenders width={rw} tab={tab} station={station} solved={solved} clear={model.clear} reduce={reduce} grid={source.grid} onSelect={onSelect} label={label} geoidLabel={geoidLabel} />
        </div>
      )}

      {building && source.grid && Model3D && (
        <div
          // a retry builds the model again on a fresh canvas
          key={source.attempt}
          role="img"
          aria-label={turnLabel}
          aria-hidden={!live}
          tabIndex={live ? 0 : -1}
          onKeyDown={live ? onKey : undefined}
          className={cn(
            'absolute inset-0 rounded-lg transition-opacity duration-500 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            live ? 'opacity-100' : 'opacity-0',
          )}
        >
          <Model3D
            grid={source.grid}
            cam={cam}
            state={model}
            reduce={reduce}
            active={active}
            onReady={source.onReady}
            onFail={source.onFail}
            onLost={source.onLost}
          />
        </div>
      )}

      {/* while the model builds: the lessons' model loading indicator, on a card at the foot of the stills (they stay usable) */}
      {source.status === 'loading' && <ModelLoading card label="טוען מודל תלת־ממדי…" className="justify-end pb-3" />}

      {live && (
        <>
          {/* place names on the bare surface */}
          <div aria-hidden className={cn('transition-opacity duration-300 motion-reduce:transition-none', tab === 'surface' ? 'opacity-100' : 'opacity-0')}>
            {PLACES.map(({ at: w, name }) => {
              const p = at(w);
              return (
                <span
                  key={name}
                  className="pointer-events-none absolute flex flex-col items-center transition-opacity duration-150"
                  style={{ left: p.x, top: p.y, transform: 'translate(-50%, calc(-100% + 2px))', opacity: seen(w) && p.ahead ? 1 : 0 }}
                >
                  <span className="rounded-md bg-paper-card/90 px-1.5 py-0.5 font-display text-[13px] font-bold leading-tight text-fg shadow-[0_1px_3px_rgba(40,50,35,0.25)]">
                    {name}
                  </span>
                  <span className="h-2.5 w-px bg-fg/70" />
                  <span className="-mt-px size-1 rounded-full bg-fg/70" />
                </span>
              );
            })}
          </div>

          {/* the survey line's two ends: the same anchors as the section's ends */}
          {model.survey && (
            <div aria-hidden className="pointer-events-none">
              {SPAN_ENDS.map((w, i) => {
                const p = at(w);
                return (
                  <span
                    key={i}
                    className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper-bright bg-accent transition-opacity duration-150"
                    style={{ left: p.x, top: p.y, opacity: seen(w) && p.ahead ? 1 : 0 }}
                  />
                );
              })}
            </div>
          )}

          {/* the see-through model names the geoid, at its edge under the land */}
          {(() => {
            const g = at(GEOID_ANCHOR);
            return <GeoidLabel x={g.x} y={g.y} shown={model.clear && g.ahead} text={geoidLabel} />;
          })()}

          {/* H at the picked station, measured from the geoid (the geoid view, see-through) */}
          <GeoidHeight
            foot={at([stationWorld(station)[0], stationWorld(station)[1], geoidZ(STATIONS[station].N)])}
            top={at(stationWorld(station))}
            shown={!!model.plumb}
            reduce={reduce}
          />

          {/* A/B/C — pickable where the view picks stations */}
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
        </>
      )}
    </div>
  );
}
