'use client';
import { cn } from '@/lib/utils';
import { STATION_IDS, type SectionGeometry } from './measurementLayout';
import { STATIONS, type StationId } from './measurementMission.data';
import { orthometric, signed } from './measurementMission';
import { C_ACCENT, C_ELL, C_GEO, C_GROUND, C_GROUND_DIM, C_H, C_INK, C_SEA, REVEAL_H_DELAY, REVEAL_H_FADE } from './referenceBodiesStyle';

export type BodyTab = 'surface' | 'ellipsoid' | 'geoid' | 'undulation';

/** Least distance between the centres of the h and N labels, stacked on one side of the arrows (px; a label is 23 px). */
const LABEL_GAP = 26;
/** A height arrow shorter than this (px) cannot carry its label, and two reference lines closer than this leave unclear
 *  which one an arrow starts from: the section opens a close-up of the station instead. */
const LENS_BELOW = 16;
/** The close-up: its box (px; flush with the section's top and inline-end edge), title row, least padding round the
 *  station's heights inside it, and where the station stands across it. */
const LENS = { w: 184, h: 126, title: 20, pad: 12, stationX: 76 } as const;
/** Arrow columns beside a station (px from its point): H on the left, h and N on the right, then the labels. */
const COLS = { H: -14, h: 8, N: 24, label: 31 } as const;

/**
 * "H = ?" until the station is solved, then its value; h and N always with their values — the readings beside
 * the task, in metres there (the chips stay narrow enough to keep clear of the next station's pin).
 */
function heightTexts(id: StationId, solved: boolean) {
  const { h, N } = STATIONS[id];
  return { H: solved ? `= ${orthometric(id)}` : '= ?', h: `= ${h}`, N: `= ${signed(N)}` };
}

/**
 * The section along the survey line over SURVEY_SPAN (the dashed line on the
 * landscape, the line across the ellipsoid's marked area): ground, geoid
 * (gently wavy, the sea surface offshore) and ellipsoid (smooth). Profile, N
 * and every arrow end come from measurementLayout.sectionGeometry(): the
 * landscape's own heights and N field, one horizontal and one vertical scale.
 * Each view draws only the surfaces it is about — the ground alone, the ground
 * and the ellipsoid, the geoid with the ellipsoid as a quieter second line
 * (and, once the reference surfaces are revealed in the model, both firm and H
 * at the picked station, coming in with the model's H), then all three with the
 * heights at the picked station. In the task each arrow carries its label with
 * the station's value (the same numbers as the readings under the figures; H is
 * "?" until solved). Hierarchy is line weight first, colour second.
 *
 * Where the station's arrows are too short to carry their labels (A: h ≈ 15 px,
 * N ≈ 10 px), the section opens a close-up of it: the framed stretch around the
 * station drawn again, the same in both directions, an exact whole number of
 * times larger — so H, h and N keep their proportions — in the orange frame the
 * ellipsoid view's enlargement uses, tied to the frame by its dashed corners.
 *
 * Each station has one marker, a lettered pin on its ground point (the model's
 * pins, smaller); the line's two ends carry the same orange dots as the line on
 * the model and the marked area on the ellipsoid.
 */
export function MeasurementSection({
  geo,
  tab,
  station,
  solved = false,
  onSelect,
  revealed = false,
  linked = false,
  ariaLabel,
}: {
  geo: SectionGeometry;
  tab: BodyTab;
  /** The picked station (every view but the ellipsoid); its heights are drawn in the task and in the revealed geoid view. */
  station: StationId | null;
  /** The picked station is solved in the task: its H label gives the value. */
  solved?: boolean;
  /** Where stations are picked: a station pin here picks it too (the station buttons are the keyboard way). */
  onSelect?: (id: StationId) => void;
  /** The geoid view with the reference surfaces revealed in the model: both reference lines firm, and H at the station. */
  revealed?: boolean;
  /** The ellipsoid's marked area is pointed at or turned beside: the stretch it covers (the whole line) lights up. */
  linked?: boolean;
  ariaLabel: string;
}) {
  // which reference lines each view draws: none on the bare surface, its own one otherwise
  const shown = (layer: 'ellipsoid' | 'geoid') => tab === 'undulation' || tab === layer || (tab === 'geoid' && layer === 'ellipsoid');
  const mission = tab === 'undulation';
  // where a station is picked: the bare surface, the geoid view (from which surface H is measured), the task
  const picking = tab !== 'ellipsoid';
  const st = station && mission ? geo.stations[station] : null;
  // the geoid view: the picked station's H alone — measured from the geoid, no numbers — once revealed
  const gs = station && tab === 'geoid' ? geo.stations[station] : null;
  const N = station ? STATIONS[station].N : 0;
  const texts = station ? heightTexts(station, solved) : null;
  const fade = 'transition-[opacity,stroke-width] duration-200 motion-reduce:transition-none';
  const pos = (x: number, y: number) => ({ left: `${x}px`, top: `${y}px` });
  const ax = st ? { H: st.x + COLS.H, h: st.x + COLS.h, N: st.x + COLS.N, letters: N === 0 ? st.x + COLS.h + 6 : st.x + COLS.label } : null;
  const yN = st ? (st.ellipsoid + st.geoid) / 2 : 0;
  let yh = st ? st.ground + (st.ellipsoid - st.ground) * 0.3 : 0;
  if (st && N !== 0 && Math.abs(yh - yN) < LABEL_GAP) yh = yN - LABEL_GAP;
  // the close-up, where the station's heights are drawn but too short to read (the task; the geoid view, with the reveal)
  const lens = station && (st ?? gs) ? lensOf(geo, (st ?? gs)!, N) : null;
  const lensShown = mission || revealed;
  const firm = (layer: 'ellipsoid' | 'geoid') => tab === layer || (tab === 'geoid' && revealed);
  const weight = (layer: 'ellipsoid' | 'geoid') => (firm(layer) ? 3.5 : 2.25);
  const groundFirm = tab === 'surface' || mission;
  // the revealed H comes in with the model's H; taking the reveal back hides it at once
  const revealFade = { transitionDuration: `${REVEAL_H_FADE * 1000}ms`, transitionDelay: revealed ? `${REVEAL_H_DELAY * 1000}ms` : '0ms' };

  return (
    <div dir="ltr" role="img" aria-label={ariaLabel} className="relative w-full" style={{ height: geo.height }} data-section-station={station ?? ''}>
      <svg viewBox={`0 0 ${geo.width} ${geo.height}`} width="100%" height={geo.height} aria-hidden className="absolute inset-0 overflow-visible">
        <defs>
          {(
            [
              ['msArH', C_H],
              ['msArE', C_ELL],
              ['msArG', C_GEO],
            ] as const
          ).map(([id, c]) => (
            <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={c} />
            </marker>
          ))}
          <linearGradient id="msGround" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C_GROUND} stopOpacity="1" />
            <stop offset="1" stopColor={C_GROUND} stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* the marked area's stretch, in its orange, while the area on the body is pointed at or turned */}
        <g aria-hidden className={cn('transition-opacity duration-200 motion-reduce:transition-none', linked ? 'opacity-100' : 'opacity-0')} data-section-linked={linked}>
          <rect x={geo.spanEnds[0].x} y={0} width={geo.spanEnds[1].x - geo.spanEnds[0].x} height={geo.height} fill={C_ACCENT} fillOpacity={0.07} />
          {geo.spanEnds.map((p, i) => (
            <line key={i} x1={p.x} y1={0} x2={p.x} y2={geo.height} stroke={C_ACCENT} strokeWidth={1.5} strokeDasharray="4 3" />
          ))}
        </g>
        <SectionLayers geo={geo} tab={tab} revealed={revealed} fade={fade} groundFirm={groundFirm} shown={shown} firm={firm} weight={weight} />

        {st && ax && (
          <g strokeWidth="2.5">
            <line x1={ax.H} y1={st.geoid} x2={ax.H} y2={st.ground + 1} stroke={C_H} markerEnd="url(#msArH)" />
            <line x1={ax.h} y1={st.ellipsoid} x2={ax.h} y2={st.ground + 1} stroke={C_ELL} markerEnd="url(#msArE)" />
            {N !== 0 && <line x1={ax.N} y1={st.ellipsoid} x2={ax.N} y2={st.geoid + (st.geoid < st.ellipsoid ? 1 : -1)} stroke={C_GEO} markerEnd="url(#msArG)" />}
            {/* the levels' ticks start just past H's arrow, so they never run under its label */}
            <line x1={st.x - 17} y1={st.geoid} x2={st.x + 30} y2={st.geoid} stroke={C_GEO} strokeWidth="1.5" strokeDasharray="4 3" />
            <line x1={st.x - 17} y1={st.ellipsoid} x2={st.x + 30} y2={st.ellipsoid} stroke={C_ELL} strokeWidth="1.5" strokeDasharray="4 3" />
          </g>
        )}

        {/* the close-up's frame round the station, and its dashed corners up to the close-up */}
        {lens && (
          <g
            fill="none"
            stroke={C_ACCENT}
            strokeWidth={1.5}
            data-section-lens-frame
            className={cn('transition-opacity motion-reduce:!duration-0 motion-reduce:!delay-0', lensShown ? 'opacity-100' : 'opacity-0')}
            style={mission ? undefined : revealFade}
          >
            <rect x={lens.frame.x} y={lens.frame.y} width={lens.frame.w} height={lens.frame.h} rx={2} strokeWidth={2} />
            <line x1={lens.frame.x} y1={lens.frame.y} x2={lens.box.x} y2={lens.box.y + lens.box.h} strokeDasharray="4 3" />
            <line x1={lens.frame.x + lens.frame.w} y1={lens.frame.y} x2={lens.box.x + lens.box.w} y2={lens.box.y + lens.box.h} strokeDasharray="4 3" />
          </g>
        )}

        {gs && (
          <g strokeWidth="2.5" data-geoid-h={revealed} className={cn('transition-opacity motion-reduce:!duration-0 motion-reduce:!delay-0', revealed ? 'opacity-100' : 'opacity-0')} style={revealFade}>
            <line x1={gs.x - 14} y1={gs.geoid} x2={gs.x + 14} y2={gs.geoid} stroke={C_GEO} strokeWidth="1.5" strokeDasharray="4 3" />
            <line x1={gs.x - 10} y1={gs.geoid} x2={gs.x - 10} y2={gs.ground + 1} stroke={C_H} markerEnd="url(#msArH)" />
          </g>
        )}

        {/* the line's two ends: the same orange dots as on the model and on the ellipsoid's marked area */}
        {geo.spanEnds.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={linked ? 6 : 4} fill={C_ACCENT} stroke="#FDFBF3" strokeWidth={1.5} className="transition-[r] duration-200 motion-reduce:transition-none" />
        ))}
      </svg>

      {/* the heights' labels with the station's values, beside their arrows (in the close-up when they are too short) */}
      {st && ax && texts && !lens && (
        <div aria-hidden className="pointer-events-none" data-section-labels>
          <DiagramChip color={C_H} style={{ ...pos(ax.H - 6, st.ground + (st.geoid - st.ground) * 0.7), transform: 'translate(-100%, -50%)' }}>
            <Letter c={C_H}>H</Letter> {texts.H}
          </DiagramChip>
          <DiagramChip color={C_ELL} style={{ ...pos(ax.letters, N === 0 ? (st.ellipsoid + st.ground) / 2 : yh), transform: 'translate(0, -50%)' }}>
            <Letter c={C_ELL}>h</Letter> {texts.h}
          </DiagramChip>
          <DiagramChip color={C_GEO} style={{ ...(N === 0 ? pos(ax.letters, st.ellipsoid - 6) : pos(ax.letters, yN)), transform: N === 0 ? 'translate(0, -100%)' : 'translate(0, -50%)' }}>
            <Letter c={C_GEO}>N</Letter> {texts.N}
          </DiagramChip>
        </div>
      )}

      {lens && station && texts && (
        <div
          className={cn('transition-opacity motion-reduce:!duration-0 motion-reduce:!delay-0', lensShown ? 'opacity-100' : 'opacity-0')}
          style={mission ? undefined : revealFade}
        >
          <SectionLens geo={geo} lens={lens} station={station} texts={texts} tab={tab} revealed={revealed} layers={{ groundFirm, shown, firm, weight }} />
        </div>
      )}

      {gs && !lens && (
        <span
          aria-hidden
          className={cn('pointer-events-none absolute font-display text-base font-bold leading-none transition-opacity motion-reduce:!duration-0 motion-reduce:!delay-0', revealed ? 'opacity-100' : 'opacity-0')}
          style={{ ...pos(gs.x - 17, (gs.geoid + gs.ground) / 2), transform: 'translate(-100%, -50%)', color: C_H, ...revealFade }}
        >
          H
        </span>
      )}

      {/* one marker per station: a lettered pin on its ground point */}
      {STATION_IDS.map((id) => {
        const p = geo.stations[id];
        const active = picking && id === station;
        const head = cn(
          'grid place-items-center rounded-full border-2 font-display font-bold leading-none transition-colors duration-200 motion-reduce:transition-none',
          active ? 'size-7 border-paper-bright bg-accent text-sm text-white shadow-[0_2px_5px_rgba(40,50,35,0.3)]' : 'size-6 border-brand-dark bg-bg-elevated text-[13px] text-brand-dark',
          !picking && 'opacity-80',
        );
        const body = (
          <>
            <span className={head}>{id}</span>
            <span className={cn('h-2 w-0.5', active ? 'bg-accent' : 'bg-brand-dark')} />
            <span className={cn('-mt-px size-1.5 rounded-full', active ? 'bg-accent' : 'bg-brand-dark')} />
          </>
        );
        const place = { ...pos(p.x, p.ground), transform: 'translate(-50%, calc(-100% + 3px))' };
        return picking && onSelect ? (
          // pointer only: the same pick as the pins and the station buttons
          <button
            key={id}
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => onSelect(id)}
            className={cn('absolute z-10 flex cursor-pointer flex-col items-center', !active && 'hover:[&>span:first-child]:border-accent')}
            style={place}
          >
            {body}
          </button>
        ) : (
          <span key={id} aria-hidden className="absolute flex flex-col items-center" style={place}>
            {body}
          </span>
        );
      })}

      {/* line names, left of the plot */}
      <div aria-hidden dir="rtl" className="pointer-events-none font-display text-[13px] font-bold leading-tight">
        <span className={cn('absolute whitespace-nowrap', fade, groundFirm ? 'opacity-100' : 'opacity-60')} style={{ ...pos(geo.leftEnds.x - 8, geo.leftEnds.ground), transform: 'translate(-100%, -50%)', color: C_INK }}>
          פני השטח
        </span>
        <span className={cn('absolute whitespace-nowrap', fade, shown('geoid') ? 'opacity-100' : 'opacity-0')} style={{ ...pos(geo.leftEnds.x - 8, geo.leftEnds.geoid), transform: 'translate(-100%, calc(-100% + 3px))', color: C_GEO }}>
          גיאואיד · פני הים
        </span>
        <span className={cn('absolute whitespace-nowrap', fade, shown('ellipsoid') ? 'opacity-100' : 'opacity-0')} style={{ ...pos(geo.leftEnds.x - 8, geo.leftEnds.ellipsoid), transform: 'translate(-100%, 1px)', color: C_ELL }}>
          אליפסואיד
        </span>
      </div>
    </div>
  );
}

/** A height's letter in its arrow's colour, at the head of its label. */
function Letter({ c, children }: { c: string; children: React.ReactNode }) {
  return <span style={{ color: c }}>{children}</span>;
}

type SectionStation = SectionGeometry['stations'][StationId];
type Lens = {
  /** Times larger than the section, in both directions. */
  k: number;
  /** The close-up's box in the section (px). */
  box: { x: number; y: number; w: number; h: number };
  /** The stretch of the section it shows, framed round the station (px of the section). */
  frame: { x: number; y: number; w: number; h: number };
};

/** The close-up for a station whose arrows are too short to carry their labels, or null when they are long enough. */
function lensOf(geo: SectionGeometry, st: SectionStation, N: number): Lens | null {
  // H and h, and N (also the gap H and N start across) — none where the surfaces meet (N = 0)
  const spans = [Math.abs(st.ground - st.geoid), Math.abs(st.ground - st.ellipsoid), ...(N === 0 ? [] : [Math.abs(st.geoid - st.ellipsoid)])];
  if (Math.min(...spans) >= LENS_BELOW) return null;
  const top = Math.min(st.ground, st.geoid, st.ellipsoid);
  const bottom = Math.max(st.ground, st.geoid, st.ellipsoid);
  const inner = LENS.h - LENS.title - 3; // the title row and the borders
  // a whole number of times larger, the most that leaves the padding round the station's heights
  const k = Math.max(2, Math.floor((inner - 2 * LENS.pad) / Math.max(1, bottom - top)));
  const box = { x: geo.width - LENS.w, y: 0, w: LENS.w, h: LENS.h };
  const fw = (LENS.w - 3) / k;
  const fh = inner / k;
  return { k, box, frame: { x: st.x - LENS.stationX / k, y: (top + bottom) / 2 - fh / 2, w: fw, h: fh } };
}

/** The section's own layers (sea, the N band, the two reference lines, the ground line) — drawn once in the section and again in the close-up. */
function SectionLayers({
  geo,
  tab,
  revealed,
  fade,
  groundFirm,
  shown,
  firm,
  weight,
  thin = false,
}: {
  geo: SectionGeometry;
  tab: BodyTab;
  revealed: boolean;
  fade: string;
  groundFirm: boolean;
  shown: (layer: 'ellipsoid' | 'geoid') => boolean;
  firm: (layer: 'ellipsoid' | 'geoid') => boolean;
  weight: (layer: 'ellipsoid' | 'geoid') => number;
  /** In the close-up: lines keep the section's stroke widths though the drawing is larger. */
  thin?: boolean;
}) {
  const mission = tab === 'undulation';
  const ve = thin ? ('non-scaling-stroke' as const) : undefined;
  return (
    <>
      <path d={geo.groundFillPath} fill="url(#msGround)" className={cn(fade, groundFirm ? 'opacity-100' : 'opacity-60')} />
      {geo.seaPath && <path d={geo.seaPath} fill={C_SEA} className={cn(fade, tab === 'geoid' ? 'opacity-75' : 'opacity-50')} />}
      {/* the gap between geoid and ellipsoid = undulation */}
      <path d={geo.gapPath} fill={C_GEO} className={cn(fade, mission || (tab === 'geoid' && revealed) ? 'opacity-25' : 'opacity-0')} />
      <path
        d={geo.ellipsoidPath}
        fill="none"
        stroke={C_ELL}
        strokeWidth={weight('ellipsoid')}
        strokeLinejoin="round"
        vectorEffect={ve}
        className={cn(fade, shown('ellipsoid') ? (firm('ellipsoid') || mission ? 'opacity-100' : 'opacity-75') : 'opacity-0')}
      />
      <path d={geo.geoidPath} fill="none" stroke={C_GEO} strokeWidth={weight('geoid')} strokeLinejoin="round" vectorEffect={ve} className={cn(fade, shown('geoid') ? 'opacity-100' : 'opacity-0')} />
      <path
        d={geo.terrainPath}
        fill="none"
        stroke={groundFirm ? C_INK : C_GROUND_DIM}
        strokeWidth={tab === 'surface' ? 3.5 : 2.25}
        strokeLinejoin="round"
        vectorEffect={ve}
        className={fade}
      />
    </>
  );
}

/**
 * The close-up: the framed stretch drawn `k` times larger (both directions, so the heights keep their
 * proportions), the station's arrows on it at their full length with their labels and values, the station's
 * ground point, and a title naming the station and the factor.
 */
function SectionLens({
  geo,
  lens,
  station,
  texts,
  tab,
  revealed,
  layers,
}: {
  geo: SectionGeometry;
  lens: Lens;
  station: StationId;
  texts: ReturnType<typeof heightTexts>;
  tab: BodyTab;
  revealed: boolean;
  /** The section's own emphasis (which lines are firm, the ground's tone), so the close-up reads as the same drawing. */
  layers: Pick<React.ComponentProps<typeof SectionLayers>, 'groundFirm' | 'shown' | 'firm' | 'weight'>;
}) {
  const { k, box, frame } = lens;
  const st = geo.stations[station];
  const N = STATIONS[station].N;
  const inner = { w: box.w - 3, h: box.h - LENS.title - 3 };
  // a point of the section → the close-up's own px (inside its border, under the title)
  const X = (x: number) => (x - frame.x) * k;
  const Y = (y: number) => (y - frame.y) * k;
  const sx = X(st.x);
  const s = { ground: Y(st.ground), geoid: Y(st.geoid), ellipsoid: Y(st.ellipsoid) };
  const col = { H: sx + COLS.H, h: sx + COLS.h, N: sx + COLS.N, label: sx + COLS.label };
  const yh = (s.ground + s.ellipsoid) / 2;
  const yN = (s.geoid + s.ellipsoid) / 2;
  const task = tab === 'undulation';
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute overflow-hidden rounded-md border-[1.5px] bg-paper-card shadow-[0_2px_6px_rgba(40,50,35,0.18)]"
      style={{ left: box.x, top: box.y, width: box.w, height: box.h, borderColor: C_ACCENT }}
      data-section-lens={k}
    >
      <p dir="rtl" className="px-2 text-end font-display text-[13px] font-bold leading-5 text-fg" style={{ height: LENS.title }}>
        תחנה {station} · תקריב פי {k}
      </p>
      <div className="relative" style={{ width: inner.w, height: inner.h }}>
        <svg viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`} width={inner.w} height={inner.h} preserveAspectRatio="none" className="absolute inset-0">
          <SectionLayers geo={geo} tab={tab} revealed={revealed} fade="" {...layers} thin />
        </svg>
        <svg width={inner.w} height={inner.h} className="absolute inset-0 overflow-visible">
          <g strokeWidth="2.5">
            <line x1={col.H} y1={s.geoid} x2={col.H} y2={s.ground + 1} stroke={C_H} markerEnd="url(#msArH)" />
            {task && <line x1={col.h} y1={s.ellipsoid} x2={col.h} y2={s.ground + 1} stroke={C_ELL} markerEnd="url(#msArE)" />}
            {task && N !== 0 && <line x1={col.N} y1={s.ellipsoid} x2={col.N} y2={s.geoid + (s.geoid < s.ellipsoid ? 1 : -1)} stroke={C_GEO} markerEnd="url(#msArG)" />}
          </g>
          {/* the station's ground point, as the pin's foot */}
          <circle cx={sx} cy={s.ground} r={3.5} fill={C_ACCENT} stroke="#FDFBF3" strokeWidth={1.5} />
        </svg>
        {!task && (
          // the geoid view names H alone, as in the section
          <span className="absolute font-display text-base font-bold leading-none" style={{ left: col.H - 7, top: (s.geoid + s.ground) / 2, transform: 'translate(-100%, -50%)', color: C_H }}>
            H
          </span>
        )}
        {task && (
          <DiagramChip color={C_H} style={{ left: col.H - 6, top: yh, transform: 'translate(-100%, -50%)' }}>
            <Letter c={C_H}>H</Letter> {texts.H}
          </DiagramChip>
        )}
        {task && <DiagramChip color={C_ELL} style={{ left: col.label, top: yh, transform: 'translate(0, -50%)' }}>
          <Letter c={C_ELL}>h</Letter> {texts.h}
        </DiagramChip>}
        {task && N !== 0 && (
          <DiagramChip color={C_GEO} style={{ left: col.label, top: yN, transform: 'translate(0, -50%)' }}>
            <Letter c={C_GEO}>N</Letter> {texts.N}
          </DiagramChip>
        )}
      </div>
    </div>
  );
}

export function DiagramChip({
  children,
  color,
  style,
  wide,
  dim,
  hidden,
}: {
  children: React.ReactNode;
  color: string;
  style: React.CSSProperties;
  wide?: boolean;
  dim?: boolean;
  /** Not part of this view: faded out (it fades back when the view needs it). */
  hidden?: boolean;
}) {
  return (
    <span
      aria-hidden
      dir={wide ? 'rtl' : 'ltr'}
      className={cn(
        'absolute whitespace-nowrap rounded-md border-[1.5px] bg-paper-card/95 px-1.5 py-0.5 font-display text-[13px] font-bold leading-tight text-fg transition-opacity duration-200 motion-reduce:transition-none',
        hidden ? 'opacity-0' : dim ? 'opacity-55' : 'opacity-100',
        !wide && 'text-base leading-none',
      )}
      style={{ borderColor: color, ...style }}
    >
      {children}
    </span>
  );
}
