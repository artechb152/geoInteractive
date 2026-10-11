'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EllipsoidModel } from './EllipsoidModel';
import { patchView, type EllView } from './ellipsoidView';
import { MeasurementLandscape, useLandscapeSource } from './MeasurementLandscape';
import { MEASUREMENT_LANDSCAPE as L } from './measurementLandscape.data';
import { ELLIPSOID_EXTRA, GAP, SECTION, illustrationSplit, sectionGeometry, stationPins } from './measurementLayout';
import type { StationId } from './measurementMission.data';
import { MeasurementSection, type BodyTab } from './MeasurementSection';
import { LAND_START, landCamera, livePins, type LandView, type ModelState } from './measurementView';
import { C_ACCENT } from './referenceBodiesStyle';

export type IllustrationLabels = {
  terrain: string;
  section: string;
  ellipsoid: string;
  /** How to turn a model, added to the turnable landscape's description. */
  turn: string;
  hint: string;
  ellipsoidNote: string;
};

/** The landscape's framing (measurementView.Framing): glides to the survey line in the task view, at once under reduced motion. */
function useFraming(goal: number, reduce: boolean) {
  const [f, setF] = useState(goal);
  const cur = useRef(goal);
  useEffect(() => {
    if (reduce) {
      cur.current = goal;
      setF(goal);
      return;
    }
    const from = cur.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const u = Math.min(1, (t - t0) / 650);
      cur.current = from + (goal - from) * (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
      setF(cur.current);
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [goal, reduce]);
  return f;
}

/**
 * The reference-bodies illustration: a stage on top and the section along the
 * survey line below it, together exactly `height` px tall (the screen-fitted
 * column). Each view puts a different body on the stage —
 *   surface    the landscape itself; pick A/B/C on it
 *   ellipsoid  the smooth mathematical body; its marked area tied to the section
 *   geoid      the landscape opened along the survey line: the geoid sheet runs
 *              on beneath the land, the ellipsoid beside it
 *   undulation the landscape opened, the receiver and the heights at the station
 * Both bodies turn. ONE camera per body, computed here, places everything that
 * depends on the angle — the WebGL model, the pins over it, and the links
 * down to the section — so they move together. The section is data along the
 * survey line and does not turn: it answers the turning through its links, the
 * picked station, and (ellipsoid view) its focus on the marked area.
 */
export function MeasurementIllustration({
  tab,
  station,
  solved,
  onSelect,
  cutOpen,
  land,
  onLandTurn,
  onLandReset,
  landAtStart,
  ell,
  onEllTurn,
  onEllReset,
  ellAtStart,
  height,
  footer,
  labels,
}: {
  tab: BodyTab;
  station: StationId;
  solved: ReadonlySet<StationId>;
  onSelect: (id: StationId) => void;
  cutOpen: boolean;
  land: LandView;
  onLandTurn: (round: number, tilt: number) => void;
  onLandReset: () => void;
  landAtStart: boolean;
  ell: EllView;
  onEllTurn: (round: number, tilt: number) => void;
  onEllReset: () => void;
  ellAtStart: boolean;
  height: number;
  footer?: React.ReactNode;
  labels: IllustrationLabels;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(612);
  const [footH, setFootH] = useState(104);
  const reduce = !!useReducedMotion();
  const source = useLandscapeSource();
  const ellipsoid = tab === 'ellipsoid';
  const mission = tab === 'undulation';
  const picking = tab === 'surface' || mission;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = footRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setFootH(Math.round(e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [mission]);

  const split = illustrationSplit(height, mission, footH);
  const extra = ellipsoid ? ELLIPSOID_EXTRA : 0;
  const stageH = split.stage + extra;
  const sectionH = split.section - extra;
  const landH = split.stage;
  const box = useMemo(() => ({ w: width, h: landH }), [width, landH]);

  // ── the landscape: one camera for the model, the pins and the links ─────────
  const open = mission || (tab === 'geoid' && cutOpen);
  const model: ModelState = {
    open,
    geoidSheet: tab === 'geoid' || mission,
    ellipsoidSheet: open,
    survey: tab === 'surface',
    face: open,
    ring: tab === 'surface' ? station : null,
    arrows: mission ? station : null,
    tripod: mission ? station : null,
  };
  const framing = useFraming(mission ? 1 : 0, reduce);
  const cam = useMemo(() => landCamera(land, box, framing), [land, box, framing]);
  const live = source.mode === '3d' && source.ready;
  const rendersPins = useMemo(() => {
    // the renders keep their proportions, centred in the stage (MeasurementLandscape)
    const rw = Math.min(width, Math.round(landH * (L.image.w / L.image.h)));
    const rh = Math.round(rw / (L.image.w / L.image.h));
    const p = stationPins({ w: rw, h: rh });
    const off = (q: { x: number; y: number }) => ({ x: q.x + (width - rw) / 2, y: q.y + (landH - rh) / 2, hidden: false });
    return { A: off(p.A), B: off(p.B), C: off(p.C) };
  }, [width, landH]);
  const pins = live ? livePins(cam, box, source.grid, open) : rendersPins;
  // the section registers with the opening view (it does not turn): B under its pin there
  // (the renders, without WebGL, only ever show the whole model)
  const regFraming = mission && source.mode !== 'renders' ? 1 : 0;
  const startPins = useMemo(() => livePins(landCamera(LAND_START, box, regFraming), box, null, false), [box, regFraming]);
  const geo = sectionGeometry(width, sectionH, ellipsoid ? undefined : { A: startPins.A.x, B: startPins.B.x, C: startPins.C.x });
  const link = picking ? { pin: pins[station], point: geo.stations[station] } : null;

  // ── the ellipsoid: its marked area, and the callout down to the section ─────
  const pv = ellipsoid ? patchView(ell, width, stageH) : null;
  const plotTop = stageH + GAP + SECTION.padTop - 6;
  const plotRight = width - SECTION.padRight;

  const swap = reduce ? 'transition-none' : 'transition-[opacity,transform] duration-300 ease-snap';

  return (
    <div
      ref={ref}
      className="relative min-w-0"
      style={{ height }}
      // the shared view states, for the QA scripts
      data-land={`${land.az.toFixed(1)},${land.elev.toFixed(1)}`}
      data-ell={`${ell.az.toFixed(1)},${ell.elev.toFixed(1)}`}
      data-focus={pv ? pv.focus.toFixed(2) : ''}
    >
      <div className="relative w-full" style={{ height: stageH }}>
        <div
          aria-hidden={ellipsoid}
          className={cn('absolute inset-x-0 top-0', swap, ellipsoid ? 'invisible scale-[0.985] opacity-0' : 'visible scale-100 opacity-100')}
          style={{ height: landH }}
        >
          <MeasurementLandscape
            width={width}
            height={landH}
            source={source}
            cam={cam}
            pins={pins}
            framing={framing}
            model={model}
            tab={tab}
            station={station}
            solved={solved}
            cutOpen={tab === 'geoid' && cutOpen}
            reduce={reduce}
            active={!ellipsoid}
            atStart={landAtStart}
            onSelect={onSelect}
            onTurn={onLandTurn}
            onReset={onLandReset}
            label={labels.terrain}
            turnLabel={`${labels.terrain} ${labels.turn}`}
            hint={labels.hint}
          />
        </div>
        {ellipsoid && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <EllipsoidModel
              width={width}
              height={stageH}
              view={ell}
              onTurn={onEllTurn}
              atStart={ellAtStart}
              onReset={onEllReset}
              label={labels.ellipsoid}
              hint={labels.hint}
              note={labels.ellipsoidNote}
            />
          </motion.div>
        )}
      </div>

      <svg aria-hidden className="pointer-events-none absolute inset-0 overflow-visible" width="100%" height="100%">
        {/* the picked station on the landscape ↔ the same point in the section; dashed fainter while the ground hides it */}
        {link && (
          <line
            x1={link.pin.x}
            y1={link.pin.y}
            x2={link.point.x}
            y2={stageH + GAP + link.point.ground}
            stroke={C_ACCENT}
            strokeWidth="1.5"
            strokeDasharray={link.pin.hidden ? '2 4' : '4 3'}
            opacity={link.pin.hidden ? 0.55 : 1}
          />
        )}
        {/* the marked area's line on the body ↔ the section drawn along it: the callout follows the body as it turns */}
        {pv && (
          <g opacity={pv.front ? 0.25 + 0.75 * pv.focus : 0} className="transition-opacity duration-200 motion-reduce:transition-none">
            <line x1={pv.line[0].x} y1={pv.line[0].y} x2={geo.leftEnds.x} y2={plotTop} stroke={C_ACCENT} strokeWidth="1.5" strokeDasharray={pv.focus > 0.98 ? undefined : '4 3'} />
            <line x1={pv.line[1].x} y1={pv.line[1].y} x2={plotRight} y2={plotTop} stroke={C_ACCENT} strokeWidth="1.5" strokeDasharray={pv.focus > 0.98 ? undefined : '4 3'} />
            <line x1={geo.leftEnds.x} y1={plotTop} x2={plotRight} y2={plotTop} stroke={C_ACCENT} strokeWidth={pv.focus > 0.98 ? 2.5 : 1.5} opacity={0.4 + 0.6 * pv.focus} />
          </g>
        )}
      </svg>

      <div style={{ marginTop: GAP, height: sectionH }}>
        <MeasurementSection
          geo={geo}
          tab={tab}
          station={picking ? station : null}
          onSelect={picking ? onSelect : undefined}
          focus={pv ? pv.focus : 1}
          ariaLabel={labels.section}
        />
      </div>
      {footer && (
        <div ref={footRef} style={{ marginTop: GAP }}>
          {footer}
        </div>
      )}
    </div>
  );
}
