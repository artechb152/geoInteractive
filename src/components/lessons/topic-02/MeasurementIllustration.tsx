'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EllipsoidModel } from './EllipsoidModel';
import { EllipsoidZoom } from './EllipsoidZoom';
import { patchView, zoomGeometry, type EllView } from './ellipsoidView';
import { MeasurementLandscape, type LandscapeSource } from './MeasurementLandscape';
import { SECTION, sectionGeometry } from './measurementLayout';
import type { StationId } from './measurementMission.data';
import { MeasurementSection, type BodyTab } from './MeasurementSection';
import { landCamera, livePins, type LandView, type ModelState } from './measurementView';
import { C_ACCENT } from './referenceBodiesStyle';
import { ViewButton } from './StageControls';

export type IllustrationLabels = {
  terrain: string;
  section: string;
  ellipsoid: string;
  /** How to turn a model, added to the turnable landscape's description. */
  turn: string;
  ellipsoidNote: string;
  /** Under the model while the ground is see-through (the geoid view). */
  clearNote: string;
  /** The geoid's name on the see-through model. */
  geoidName: string;
  /** Under the stills while the turnable model is on its way (after a moment), lost, failed or impossible. */
  modelLoading: string;
  modelLost: string;
  modelFailed: string;
  noWebgl: string;
  /** The button that builds the model again (after a failure or a lost context). */
  retry: string;
};

/** A load shorter than this (ms) says nothing: the stills simply give way to the model. */
const QUIET_LOAD_MS = 1200;

/** The ellipsoid view's second figure: the section alone, the marked area growing out of the body, or the two linked. */
export type ZoomPhase = 'identify' | 'zooming' | 'linked';

/** Gap between the enlargement and the section under it (px). */
const GAP = 8;
/** Height of the plain caption line under a figure (px). */
const NOTE_H = 26;
/** The enlargement's share of the second figure while the area is enlarged. */
const zoomHeight = (h: number) => Math.round(Math.min(200, Math.max(118, h * 0.44)));

function useWidth(ref: React.RefObject<HTMLElement | null>, initial: number) {
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/**
 * The reference-bodies illustration: two figures side by side, each under a
 * plain caption with its own controls beside it — the model at inline-start,
 * the section (or, in the ellipsoid view, the marked area enlarged over its
 * section) at inline-end — both `height` px tall (the screen-fitted height).
 * The model is one element through the three landscape views, so nothing
 * reloads; the ellipsoid takes its place in the ellipsoid view.
 *
 * ONE camera per body, computed here, places everything that depends on the
 * angle (the WebGL model and the pins over it). The section is data along the
 * survey line and does not turn; it answers the model through the picked
 * station (the same orange pin in both), the line's two ends (the same orange
 * dots), and in the geoid view the reveal (both reference lines drawn firm).
 * In the ellipsoid view the enlargement takes the body's angle (it turns as
 * the body does, fading while the area is round the back), and the marked area
 * and the section light each other while either is pointed at or turned.
 */
export function MeasurementIllustration({
  tab,
  station,
  solved,
  onSelect,
  clear,
  source,
  land,
  onLandTurn,
  ell,
  onEllTurn,
  landZoom,
  ellZoom,
  onWheelZoom,
  phase,
  onZoom,
  height,
  modelControls,
  sectionControls,
  reduce,
  labels,
}: {
  tab: BodyTab;
  station: StationId;
  solved: ReadonlySet<StationId>;
  onSelect: (id: StationId) => void;
  /** The geoid view's reveal: the ground is see-through. */
  clear: boolean;
  source: LandscapeSource;
  land: LandView;
  onLandTurn: (round: number, tilt: number) => void;
  ell: EllView;
  onEllTurn: (round: number, tilt: number) => void;
  /** The wheel's zoom on each body (1: the fitted framing). */
  landZoom: number;
  ellZoom: number;
  /** The wheel over the model: scale the shown body's zoom by `factor` (held within MODEL_ZOOM). */
  onWheelZoom: (body: 'land' | 'ell', factor: number) => void;
  phase: ZoomPhase;
  /** Enlarge the marked area (a click on it on the body; the same as "הגדלת האזור"). */
  onZoom: () => void;
  height: number;
  modelControls?: React.ReactNode;
  sectionControls?: React.ReactNode;
  reduce: boolean;
  labels: IllustrationLabels;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const modelW = useWidth(stageRef, 520);
  const sectionW = useWidth(colRef, 480);
  const ellipsoid = tab === 'ellipsoid';
  const mission = tab === 'undulation';
  // where a station is picked: the bare surface, the geoid view (from which surface H is measured), the task
  const picking = tab !== 'ellipsoid';
  // the model's status, said under the stills whenever they stand in for it (a short load says nothing)
  const status = source.status;
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (status !== 'loading') {
      setSlow(false);
      return;
    }
    const t = window.setTimeout(() => setSlow(true), QUIET_LOAD_MS);
    return () => window.clearTimeout(t);
  }, [status, source.attempt]);
  const statusNote =
    status === 'failed' ? labels.modelFailed : status === 'lost' ? labels.modelLost : status === 'no-webgl' ? labels.noWebgl : status === 'loading' && slow ? labels.modelLoading : '';
  const canRetry = !ellipsoid && (status === 'failed' || status === 'lost');
  // one caption line under the model in every view (empty where there is nothing to add): the model
  // keeps one size through the four views, and the no-WebGL stills one frame
  const note = ellipsoid ? labels.ellipsoidNote : statusNote || (tab === 'geoid' && clear ? labels.clearNote : '');
  const stageH = height - NOTE_H;

  // ── the landscape: one camera for the model and the pins ────────────────────
  const box = useMemo(() => ({ w: modelW, h: stageH }), [modelW, stageH]);
  const model: ModelState = { clear: tab === 'geoid' && clear, survey: true, tripod: mission ? station : null, plumb: tab === 'geoid' && clear ? station : null };
  // the survey line's stretch is drawn no longer in the model than in the section: one scale along the line
  const spanPx = sectionW - SECTION.plotLeft - SECTION.padRight;
  const cam = useMemo(() => landCamera(land, box, spanPx, landZoom), [land, box, spanPx, landZoom]);
  const pins = livePins(cam, box, source.grid, model.clear);

  // ── the wheel over the model zooms it (the turnable landscape, or the ellipsoid) ──
  // a native listener: React's wheel handler is passive and could not keep the page from scrolling
  const wheelBody: 'land' | 'ell' | null = ellipsoid ? 'ell' : source.ready ? 'land' : null;
  const wheel = useRef({ body: wheelBody, onWheelZoom });
  wheel.current = { body: wheelBody, onWheelZoom };
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const { body, onWheelZoom: zoomBy } = wheel.current;
      if (!body || e.ctrlKey) return;
      const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      // the wheel stays with the model, at a limit too: the page never scrolls from over it
      e.preventDefault();
      zoomBy(body, Math.exp(-px * 0.0015));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  const zoomedIn = (ellipsoid ? ellZoom : landZoom) > 1;

  // ── the second figure: the section, and in the ellipsoid view the enlargement over it ──
  const zoomed = ellipsoid && phase !== 'identify';
  const zoomH = zoomed ? zoomHeight(stageH) : 0;
  const sectionH = zoomed ? stageH - zoomH - GAP : stageH;
  const geo = sectionGeometry(sectionW, sectionH);
  // the enlargement shows the area from the body's angle: turning the body turns it too
  const zoom = useMemo(() => zoomGeometry(zoomH || zoomHeight(stageH), { left: SECTION.plotLeft, right: sectionW - SECTION.padRight }, ell), [zoomH, stageH, sectionW, ell]);
  const areaInSight = ellipsoid && patchView(ell, modelW, stageH, ellZoom).front;
  // the link between the two figures, lit from either side: the marked area on the body (hovered or turned
  // by hand) lights the section it is drawn along, and the section lights the area on the body
  const [bodyHot, setBodyHot] = useState(false);
  const [sectionHot, setSectionHot] = useState(false);
  useEffect(() => {
    if (ellipsoid) return;
    setBodyHot(false);
    setSectionHot(false);
  }, [ellipsoid]);

  // the marked area's frame flies from the body to the enlargement when it opens
  const [flight, setFlight] = useState<{ key: number; from: DOMRectLike; to: DOMRectLike } | null>(null);
  const flights = useRef(0);
  useLayoutEffect(() => {
    if (phase !== 'zooming' || reduce || !gridRef.current || !stageRef.current || !colRef.current) {
      setFlight(null);
      return;
    }
    const g = gridRef.current.getBoundingClientRect();
    const s = stageRef.current.getBoundingClientRect();
    const c = colRef.current.getBoundingClientRect();
    const p = patchView(ell, modelW, stageH, ellZoom);
    const from = p.front
      ? { x: s.left - g.left + p.box.x, y: s.top - g.top + p.box.y, w: p.box.w, h: p.box.h }
      : { x: s.left - g.left + modelW / 2 - 20, y: s.top - g.top + stageH / 2 - 10, w: 40, h: 20 };
    const z = zoomGeometry(zoomHeight(stageH), { left: SECTION.plotLeft, right: sectionW - SECTION.padRight }, ell).box;
    setFlight({ key: ++flights.current, from, to: { x: c.left - g.left + z.x, y: c.top - g.top + z.y, w: z.w, h: z.h } });
    // the angle at the moment of the click is where the frame leaves from
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reduce]);

  const caption = 'mb-2 flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-1 lg:self-start';
  // side by side the two figures share one caption row, one stage row and one note row: a caption that
  // wraps (the geoid view's controls) pushes both stages down together, so the two drawings stay level
  const fig = 'm-0 min-w-0 lg:row-span-3 lg:grid lg:grid-rows-subgrid lg:gap-y-0';
  const swap = reduce ? 'transition-none' : 'transition-opacity duration-300 ease-snap';

  return (
    <div
      ref={gridRef}
      className="relative grid gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]"
      // the shared view states, for the QA scripts
      data-land={`${land.az.toFixed(1)},${land.elev.toFixed(1)}`}
      data-ell={`${ell.az.toFixed(1)},${ell.elev.toFixed(1)}`}
      data-span-px={spanPx}
      data-phase={ellipsoid ? phase : ''}
    >
      {/* ── the model ── */}
      <figure className={fig}>
        <figcaption className={caption}>
          <span className="font-display text-sm font-bold text-fg">מודל תלת־ממדי</span>
          {(modelControls || canRetry) && (
            <div className="flex flex-wrap items-center gap-2">
              {modelControls}
              {canRetry && <ViewButton onClick={source.retry}>{labels.retry}</ViewButton>}
            </div>
          )}
        </figcaption>
        <div
          ref={stageRef}
          // zoomed in, the body runs past the stage: clipped to it, with room for the focus ring
          className={cn('relative w-full', zoomedIn && 'overflow-clip rounded-lg')}
          style={{ height: stageH, overflowClipMargin: zoomedIn ? 4 : undefined }}
        >
          <div aria-hidden={ellipsoid} className={cn('absolute inset-0', swap, ellipsoid ? 'invisible opacity-0' : 'visible opacity-100')}>
            <MeasurementLandscape
              width={modelW}
              height={stageH}
              source={source}
              cam={cam}
              pins={pins}
              model={model}
              tab={tab}
              station={station}
              solved={solved}
              reduce={reduce}
              active={!ellipsoid}
              onSelect={onSelect}
              onTurn={onLandTurn}
              label={labels.terrain}
              turnLabel={`${labels.terrain} ${labels.turn}`}
              geoidLabel={labels.geoidName}
            />
          </div>
          {ellipsoid && (
            <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}>
              <EllipsoidModel
                width={modelW}
                height={stageH}
                view={ell}
                zoom={ellZoom}
                onTurn={onEllTurn}
                focused={phase !== 'identify'}
                hot={sectionHot}
                onLink={setBodyHot}
                onPick={phase === 'identify' ? onZoom : undefined}
                label={labels.ellipsoid}
              />
            </motion.div>
          )}
        </div>
        <p className="pt-1 text-sm leading-5 text-fg-muted" style={{ height: NOTE_H }} aria-live={ellipsoid ? undefined : 'polite'} data-model-note>
          {note}
        </p>
      </figure>

      {/* ── the section (and the enlarged area over it) ── */}
      <figure className={fig}>
        <figcaption className={caption}>
          <span className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="font-display text-sm font-bold text-fg">חתך השטח</span>
            <span className="text-sm text-fg-muted">· ללא קנה מידה · הגבהים מוגזמים</span>
          </span>
          {sectionControls && <div className="flex flex-wrap items-center gap-2">{sectionControls}</div>}
        </figcaption>
        <div
          ref={colRef}
          dir="ltr"
          className="relative w-full"
          style={{ height: stageH }}
          onPointerEnter={ellipsoid ? () => setSectionHot(true) : undefined}
          onPointerLeave={ellipsoid ? () => setSectionHot(false) : undefined}
        >
          {zoomed && (
            <motion.div
              key="zoom"
              className="absolute inset-x-0 top-0"
              style={{ height: zoomH }}
              initial={reduce ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <EllipsoidZoom width={sectionW} height={zoomH} zoom={zoom} linked={phase === 'linked'} inSight={areaInSight} hot={bodyHot} />
            </motion.div>
          )}
          <motion.div
            key={zoomed ? 'under' : 'whole'}
            className="absolute inset-x-0"
            style={{ top: zoomed ? zoomH + GAP : 0, height: sectionH }}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: zoomed && phase === 'zooming' ? 0.45 : 1 }}
            transition={{ duration: reduce ? 0 : 0.3, delay: reduce || phase === 'zooming' ? 0 : 0.05 }}
          >
            <MeasurementSection
              geo={geo}
              tab={tab}
              station={picking ? station : null}
              onSelect={picking ? onSelect : undefined}
              revealed={tab === 'geoid' && clear}
              linked={ellipsoid && bodyHot}
              ariaLabel={labels.section}
            />
          </motion.div>
          {/* linked: the line's ends on the enlarged area down to the section's ends */}
          {zoomed && (
            <svg aria-hidden className="pointer-events-none absolute inset-0 overflow-visible" width="100%" height="100%">
              <g className={cn(swap, phase === 'linked' ? 'opacity-100' : 'opacity-0')}>
                {zoom.line.map((p, i) => (
                  <line key={i} x1={p.x} y1={p.y + 5} x2={geo.spanEnds[i].x} y2={zoomH + GAP + geo.spanEnds[i].y - 5} stroke={C_ACCENT} strokeWidth={1.5} strokeDasharray="4 3" />
                ))}
              </g>
            </svg>
          )}
        </div>
      </figure>

      {/* the marked area's frame on its way from the body to the enlargement */}
      {flight && (
        <motion.span
          key={flight.key}
          aria-hidden
          className="pointer-events-none absolute z-20 rounded-sm border-2"
          style={{ borderColor: C_ACCENT, left: 0, top: 0 }}
          initial={{ x: flight.from.x, y: flight.from.y, width: flight.from.w, height: flight.from.h, opacity: 1 }}
          animate={{ x: flight.to.x, y: flight.to.y, width: flight.to.w, height: flight.to.h, opacity: [1, 1, 0] }}
          transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1], opacity: { duration: 0.75, times: [0, 0.75, 1] } }}
          onAnimationComplete={() => setFlight(null)}
        />
      )}
    </div>
  );
}

type DOMRectLike = { x: number; y: number; w: number; h: number };
