'use client';
import { cn } from '@/lib/utils';
import { STATION_IDS, type SectionGeometry } from './measurementLayout';
import { STATIONS, type StationId } from './measurementMission.data';
import { C_ACCENT, C_ELL, C_GEO, C_GROUND, C_GROUND_DIM, C_H, C_INK, C_SEA } from './referenceBodiesStyle';

export type BodyTab = 'surface' | 'ellipsoid' | 'geoid' | 'undulation';

/** Distance between two stacked height letters' centres (px; the letters are 16 px). */
const LETTER_GAP = 17;

/**
 * The section along the survey line over SURVEY_SPAN (the dashed line on the
 * landscape, the line across the ellipsoid's marked area): ground, geoid
 * (gently wavy, the sea surface offshore) and ellipsoid (smooth). Profile, N
 * and every arrow end come from measurementLayout.sectionGeometry(): the
 * landscape's own heights and N field, one horizontal and one vertical scale.
 * Each view draws only the surfaces it is about — the ground alone, the ground
 * and the ellipsoid, the geoid with the ellipsoid as a quieter second line
 * (both firm once the reference surfaces are revealed in the model), then all
 * three with the heights at the picked station: the only place the H, h and N
 * arrows are drawn. Hierarchy is line weight first, colour second.
 *
 * Each station has one marker, a lettered pin on its ground point (the model's
 * pins, smaller); the line's two ends carry the same orange dots as the line on
 * the model and the marked area on the ellipsoid.
 */
export function MeasurementSection({
  geo,
  tab,
  station,
  onSelect,
  revealed = false,
  linked = false,
  ariaLabel,
}: {
  geo: SectionGeometry;
  tab: BodyTab;
  /** The picked station (surface and undulation views); its heights are drawn in the undulation view. */
  station: StationId | null;
  /** Where stations are picked: a station pin here picks it too (the station buttons are the keyboard way). */
  onSelect?: (id: StationId) => void;
  /** The geoid view with the reference surfaces revealed in the model: both reference lines are drawn firm. */
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
  // the geoid view: the picked station's H alone — measured from the geoid, no numbers
  const gs = station && tab === 'geoid' ? geo.stations[station] : null;
  const N = station ? STATIONS[station].N : 0;
  const fade = 'transition-[opacity,stroke-width] duration-200 motion-reduce:transition-none';
  const pos = (x: number, y: number) => ({ left: `${x}px`, top: `${y}px` });
  // Arrow columns beside the station point: H left of it, h and N right of it.
  const ax = st ? { H: st.x - 13, h: st.x + 6, N: st.x + 22, letters: N === 0 ? st.x + 14 : st.x + 31 } : null;
  const yN = st ? (st.ellipsoid + st.geoid) / 2 : 0;
  let yh = st ? st.ground + (st.ellipsoid - st.ground) * 0.3 : 0;
  if (st && N !== 0 && Math.abs(yh - yN) < 22) yh = yN - 22;
  // Too short to carry a letter each (A: h ≈ 11 px, N ≈ 7 px): h and N stand one above the other beside the
  // stack, at and above its top, clear of the lines, each tied to the middle of its own arrow by a short leader.
  const tight = !!st && N !== 0 && Math.abs(st.ellipsoid - st.ground) < 2 * LETTER_GAP;
  const tag = st && tight ? { x: st.x + 34, h: Math.min(st.ground, st.geoid, st.ellipsoid) - LETTER_GAP, N: Math.min(st.ground, st.geoid, st.ellipsoid) } : null;
  const firm = (layer: 'ellipsoid' | 'geoid') => tab === layer || (tab === 'geoid' && revealed);
  const weight = (layer: 'ellipsoid' | 'geoid') => (firm(layer) ? 3.5 : 2.25);
  const groundFirm = tab === 'surface' || mission;

  return (
    <div dir="ltr" role="img" aria-label={ariaLabel} className="relative w-full" style={{ height: geo.height }}>
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
          className={cn(fade, shown('ellipsoid') ? (firm('ellipsoid') || mission ? 'opacity-100' : 'opacity-75') : 'opacity-0')}
        />
        <path d={geo.geoidPath} fill="none" stroke={C_GEO} strokeWidth={weight('geoid')} strokeLinejoin="round" className={cn(fade, shown('geoid') ? 'opacity-100' : 'opacity-0')} />
        <path
          d={geo.terrainPath}
          fill="none"
          stroke={groundFirm ? C_INK : C_GROUND_DIM}
          strokeWidth={tab === 'surface' ? 3.5 : 2.25}
          strokeLinejoin="round"
          className={fade}
        />

        {st && ax && (
          <g strokeWidth="2.5">
            <line x1={ax.H} y1={st.geoid} x2={ax.H} y2={st.ground + 1} stroke={C_H} markerEnd="url(#msArH)" />
            <line x1={ax.h} y1={st.ellipsoid} x2={ax.h} y2={st.ground + 1} stroke={C_ELL} markerEnd="url(#msArE)" />
            {N !== 0 && <line x1={ax.N} y1={st.ellipsoid} x2={ax.N} y2={st.geoid + (st.geoid < st.ellipsoid ? 1 : -1)} stroke={C_GEO} markerEnd="url(#msArG)" />}
            {/* the levels' ticks start just past H's arrow, so they never run under its letter */}
            <line x1={st.x - 17} y1={st.geoid} x2={st.x + 30} y2={st.geoid} stroke={C_GEO} strokeWidth="1.5" strokeDasharray="4 3" />
            <line x1={st.x - 17} y1={st.ellipsoid} x2={st.x + 30} y2={st.ellipsoid} stroke={C_ELL} strokeWidth="1.5" strokeDasharray="4 3" />
            {tag && ax && (
              <g strokeWidth="1" data-section-leaders>
                <line x1={tag.x - 4} y1={tag.h} x2={ax.h + 2} y2={(st.ellipsoid + st.ground) / 2} stroke={C_ELL} />
                <line x1={tag.x - 4} y1={tag.N} x2={ax.N + 2} y2={yN} stroke={C_GEO} />
              </g>
            )}
          </g>
        )}

        {gs && (
          <g strokeWidth="2.5" data-geoid-h>
            <line x1={gs.x - 14} y1={gs.geoid} x2={gs.x + 14} y2={gs.geoid} stroke={C_GEO} strokeWidth="1.5" strokeDasharray="4 3" />
            <line x1={gs.x - 10} y1={gs.geoid} x2={gs.x - 10} y2={gs.ground + 1} stroke={C_H} markerEnd="url(#msArH)" />
          </g>
        )}

        {/* the line's two ends: the same orange dots as on the model and on the ellipsoid's marked area */}
        {geo.spanEnds.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={linked ? 6 : 4} fill={C_ACCENT} stroke="#FDFBF3" strokeWidth={1.5} className="transition-[r] duration-200 motion-reduce:transition-none" />
        ))}
      </svg>

      {/* the heights' letters, beside their arrows */}
      {st && ax && (
        <div aria-hidden className="pointer-events-none font-display text-base font-bold leading-none">
          <span className="absolute" style={{ ...pos(ax.H - 7, (st.geoid + st.ground) / 2), transform: 'translate(-100%, -50%)', color: C_H }}>
            H
          </span>
          <span className="absolute" style={{ ...(tag ? pos(tag.x, tag.h) : pos(ax.letters, N === 0 ? (st.ellipsoid + st.ground) / 2 : yh)), transform: 'translate(0, -50%)', color: C_ELL }}>
            h
          </span>
          {N !== 0 && (
            <span className="absolute" style={{ ...(tag ? pos(tag.x, tag.N) : pos(ax.letters, yN)), transform: 'translate(0, -50%)', color: C_GEO }}>
              N
            </span>
          )}
        </div>
      )}

      {gs && (
        <span
          aria-hidden
          className="pointer-events-none absolute font-display text-base font-bold leading-none"
          style={{ ...pos(gs.x - 17, (gs.geoid + gs.ground) / 2), transform: 'translate(-100%, -50%)', color: C_H }}
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
