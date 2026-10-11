'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { MeasurementLandscapeRenders, StationPin } from './MeasurementLandscapeRenders';
import { MEASUREMENT_LANDSCAPE as L } from './measurementLandscape.data';
import { STATION_IDS, geoidZ, undulationAt, type Pt, type Vec3 } from './measurementLayout';
import { STATIONS, type StationId } from './measurementMission.data';
import { DiagramChip, type BodyTab } from './MeasurementSection';
import { FACE_FRONT, MODEL_URLS, faceLabelX, faceSeen, heightGrid, hiddenBy, projectWith, stationArrows, type HeightGrid, type LandCamera, type LivePin, type ModelState } from './measurementView';
import { C_ELL, C_GEO, C_H } from './referenceBodiesStyle';
import { StageControls } from './StageControls';
import { arrowTurn, useDragTurn } from './viewControls';

const MeasurementLandscape3D = dynamic(() => import('./MeasurementLandscape3D'), { ssr: false, loading: () => null });

export type LandscapeSource = {
  /** 'pending' until WebGL is known; 'renders' without it (or when the model fails). */
  mode: 'pending' | '3d' | 'renders';
  grid: HeightGrid | null;
  /** The model is up and drawn: the overlay moves onto it. */
  ready: boolean;
  onReady: () => void;
  onFail: () => void;
};

/** WebGL or not, and the height grid the model and the overlay's hiding test share. */
export function useLandscapeSource(): LandscapeSource {
  const [mode, setMode] = useState<LandscapeSource['mode']>('pending');
  const [grid, setGrid] = useState<HeightGrid | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let ok = false;
    try {
      const c = document.createElement('canvas');
      ok = !!c.getContext('webgl2');
    } catch {
      ok = false;
    }
    if (!ok) {
      setMode('renders');
      return;
    }
    setMode('3d');
    let live = true;
    fetch(MODEL_URLS.heights)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((buf) => live && setGrid(heightGrid(buf)))
      .catch(() => live && setMode('renders'));
    return () => {
      live = false;
    };
  }, []);
  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => {
    setReady(false);
    setMode('renders');
  }, []);
  return { mode, grid, ready, onReady, onFail };
}

/** The surface view names what its text names: mountains, a wadi, the sea. */
const PLACES: { at: Vec3; name: string }[] = [
  { at: L.features.ridge, name: 'הרים' },
  { at: L.features.valley, name: 'גיא' },
  { at: L.features.sea, name: 'ים' },
];
const sideFade = (f: number) => `linear-gradient(to right, transparent 0, #000 ${Math.round(36 * f)}px, #000 calc(100% - ${Math.round(36 * f)}px), transparent 100%)`;

/** The cut face's two reference lines at x (world): where their names go. */
const faceEnds = (x: number): [Vec3, Vec3] => [
  [x, L.lineY - FACE_FRONT, geoidZ(undulationAt(x * L.mPerUnit, L.lineY * L.mPerUnit))],
  [x, L.lineY - FACE_FRONT, 0],
];

/**
 * The landscape stage of the three landscape views. With WebGL it is the
 * turnable model (drag, or the arrow keys once it has focus; "מבט התחלתי"
 * returns to the opening view) with its HTML layer over it — pins, place
 * names, the names on the cut face and the height labels — all placed by the
 * model's own camera. Until the model is up, and wherever there is no WebGL,
 * it is the renders (the same landscape from the opening view), and nothing
 * offers to turn.
 */
export function MeasurementLandscape({
  width,
  height,
  source,
  cam,
  pins,
  framing,
  model,
  tab,
  station,
  solved,
  cutOpen,
  reduce,
  active,
  atStart,
  onSelect,
  onTurn,
  onReset,
  label,
  turnLabel,
  hint,
}: {
  width: number;
  height: number;
  source: LandscapeSource;
  cam: LandCamera;
  pins: Record<StationId, LivePin>;
  /** 0 the whole model … 1 the survey line (the task view). */
  framing: number;
  model: ModelState;
  tab: BodyTab;
  station: StationId;
  solved: ReadonlySet<StationId>;
  /** The renders' cut state (the geoid view's toggle). */
  cutOpen: boolean;
  reduce: boolean;
  /** The landscape is on the stage (not the ellipsoid view). */
  active: boolean;
  atStart: boolean;
  onSelect: (id: StationId) => void;
  /** Turn by (round, tilt) degrees of the model — round + brings its right side forward. */
  onTurn: (round: number, tilt: number) => void;
  onReset: () => void;
  /** The landscape's description; and with how to turn it, for the turnable model. */
  label: string;
  turnLabel: string;
  hint: string;
}) {
  const live = source.mode === '3d' && source.ready;
  const size = { w: width, h: height };
  const { dragging, handlers } = useDragTurn((dx, dy) => onTurn(dx * 0.32, dy * 0.28));
  const mission = tab === 'undulation';
  const picking = tab === 'surface' || mission;
  const at = (p: Vec3) => projectWith(cam.matrix, p, size);
  const seen = (p: Vec3) => !source.grid || !hiddenBy(source.grid, p, cam.eye, model.open);
  const face = model.face && faceSeen(cam);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => arrowTurn(e, onTurn);

  // the renders keep their own proportions, centred in the stage
  const rw = Math.min(width, Math.round(height * (L.image.w / L.image.h)));
  const rh = Math.round(rw / (L.image.w / L.image.h));

  return (
    <div
      className={cn('relative h-full w-full select-none', live && (dragging ? 'cursor-grabbing' : 'cursor-grab'))}
      style={{ touchAction: live ? 'pan-y' : undefined }}
      // the state the page shows, for the QA scripts (scripts/qa/shot-measurement-mission.mjs)
      data-landscape={live ? 'live' : source.mode === 'renders' ? 'renders' : 'loading'}
      data-open={model.open}
      data-framing={framing.toFixed(2)}
      data-arrows={model.arrows ?? ''}
      data-tripod={model.tripod ?? ''}
      {...(live ? handlers : {})}
    >
      {/* the renders: until the model is drawn, and instead of it without WebGL */}
      {!live && (
        <div className="absolute" style={{ left: (width - rw) / 2, top: (height - rh) / 2, width: rw, height: rh }}>
          <MeasurementLandscapeRenders width={rw} tab={tab} station={station} solved={solved} cutOpen={cutOpen} reduce={reduce} onSelect={onSelect} label={label} />
        </div>
      )}

      {source.mode === '3d' && source.grid && (
        <div
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
          {/* the task view leaves the model's sides out of frame: they fade instead of ending on a cut */}
          <div
            className="absolute inset-0"
            style={framing > 0.01 ? { maskImage: sideFade(framing), WebkitMaskImage: sideFade(framing) } : undefined}
          >
          <MeasurementLandscape3D
            grid={source.grid}
            cam={cam}
            height={height}
            state={model}
            reduce={reduce}
            active={active}
            onReady={source.onReady}
            onFail={source.onFail}
          />
          </div>
        </div>
      )}

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
                  style={{ left: p.x, top: p.y, transform: 'translate(-50%, calc(-100% + 2px))', opacity: seen(w) ? 1 : 0 }}
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

          {/* the cut face's two reference lines, named where they leave the model's left side */}
          <div aria-hidden className={cn('pointer-events-none transition-opacity motion-reduce:transition-none', face ? 'opacity-100 delay-300 duration-500' : 'opacity-0 duration-150')}>
            {(() => {
              const [gw, ew] = faceEnds(faceLabelX(framing));
              const g = at(gw);
              const e = at(ew);
              return (
                <>
                  <DiagramChip color={C_GEO} wide style={{ left: g.x + 6, top: g.y, transform: 'translate(0, calc(-100% - 3px))' }}>
                    גיאואיד · פני הים
                  </DiagramChip>
                  <DiagramChip color={C_ELL} wide style={{ left: e.x + 6, top: e.y, transform: 'translate(0, 4px)' }}>
                    אליפסואיד
                  </DiagramChip>
                </>
              );
            })()}
          </div>

          {/* the picked station's heights on the cut face */}
          {mission && model.arrows && <ArrowLabels id={model.arrows} at={at} />}

          {/* A/B/C — pickable where the view picks stations, quiet markers on the cut view */}
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

          <StageControls atStart={atStart} onReset={onReset} hint={hint} />
        </>
      )}
    </div>
  );
}

/** H, h and N beside their arrows on the cut face (the arrows are in the model). */
function ArrowLabels({ id, at }: { id: StationId; at: (p: Vec3) => Pt }) {
  const a = stationArrows(id);
  const mid = (s: [Vec3, Vec3]) => at([(s[0][0] + s[1][0]) / 2, s[0][1], (s[0][2] + s[1][2]) / 2]);
  const H = mid(a.H);
  const h = mid(a.h);
  const N = mid(a.N);
  // N is short at true scale: its label sits below H's, never on top of it
  const nY = Math.max(N.y, H.y + 22);
  return (
    <div aria-hidden className="pointer-events-none">
      <DiagramChip color={C_H} style={{ left: H.x - 6, top: H.y, transform: 'translate(-100%, -50%)' }}>
        H
      </DiagramChip>
      <DiagramChip color={C_ELL} style={{ left: h.x + 6, top: h.y, transform: 'translate(0, -50%)' }}>
        h
      </DiagramChip>
      {STATIONS[id].N !== 0 && (
        <DiagramChip color={C_GEO} style={{ left: N.x - 6, top: nY, transform: 'translate(-100%, -50%)' }}>
          N
        </DiagramChip>
      )}
    </div>
  );
}
