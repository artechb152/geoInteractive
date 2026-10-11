'use client';
import { cn } from '@/lib/utils';
import { STATION_IDS, type SectionGeometry } from './measurementLayout';
import { STATIONS, type StationId } from './measurementMission.data';
import { C_ACCENT, C_ELL, C_GEO, C_GROUND, C_GROUND_DIM, C_H, C_INK, C_SEA } from './referenceBodiesStyle';

export type BodyTab = 'surface' | 'ellipsoid' | 'geoid' | 'undulation';

/**
 * The section along the survey line (the dashed line on the landscape, the
 * plane its cut opens along): ground, geoid (gently wavy, the sea surface
 * offshore) and ellipsoid (smooth). Profile, N and every arrow end come from
 * measurementLayout.sectionGeometry(): the landscape's own heights and N
 * field, one horizontal and one vertical scale. Each view draws only the
 * surfaces it is about — the ground alone, the ground and the ellipsoid, the
 * geoid with the ellipsoid as a quieter second line, then all three with the
 * heights. Hierarchy is line weight first, colour second. Line names and the
 * not-to-scale note keep the former diagram's text.
 */
export function MeasurementSection({
  geo,
  tab,
  station,
  onSelect,
  focus = 1,
  ariaLabel,
}: {
  geo: SectionGeometry;
  tab: BodyTab;
  /** The picked station (surface and undulation views); its heights are drawn in the undulation view. */
  station: StationId | null;
  /** Where stations are picked: a station point here picks it too (the station buttons are the keyboard way). */
  onSelect?: (id: StationId) => void;
  /** The ellipsoid view: how squarely the marked area faces the reader up on the body (0 … 1) — the section is that area's. */
  focus?: number;
  ariaLabel: string;
}) {
  // which reference lines each view draws: none on the bare surface, its own one otherwise
  const shown = (layer: 'ellipsoid' | 'geoid') =>
    tab === 'undulation' || tab === layer || (tab === 'geoid' && layer === 'ellipsoid');
  const main = (layer: BodyTab) => tab === layer;
  const mission = tab === 'undulation';
  const st = station && mission ? geo.stations[station] : null;
  const N = station ? STATIONS[station].N : 0;
  const fade = 'transition-[opacity,stroke-width] duration-200 motion-reduce:transition-none';
  const pos = (x: number, y: number) => ({ left: `${x}px`, top: `${y}px` });
  // Arrow columns beside the station point: H left of it, h and N right of it.
  const ax = st ? { H: st.x - 13, h: st.x + 5, N: st.x + 24, chips: N === 0 ? st.x + 15 : st.x + 40 } : null;
  const yN = st ? (st.ellipsoid + st.geoid) / 2 : 0;
  let yh = st ? st.ground + (st.ellipsoid - st.ground) * 0.3 : 0;
  if (st && N !== 0 && Math.abs(yh - yN) < 26) yh = yN - 26;
  const weight = (layer: 'ellipsoid' | 'geoid') => (main(layer) ? 3.5 : 2.25);

  return (
    <div dir="ltr" role="img" aria-label={ariaLabel} className="relative w-full" style={{ height: geo.height }}>
      {/* the plot answers the area up on the body: dim while it is turned away, full once it faces the reader */}
      <div className="absolute inset-0" style={{ opacity: 0.4 + 0.6 * focus }}>
      <svg viewBox={`0 0 ${geo.width} ${geo.height}`} width="100%" height={geo.height} aria-hidden className="absolute inset-0 overflow-visible">
        <defs>
          {(
            [
              ['msArH', C_H],
              ['msArE', C_ELL],
              ['msArG', C_GEO],
            ] as const
          ).map(([id, c]) => (
            <marker key={id} id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={c} />
            </marker>
          ))}
          <linearGradient id="msGround" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C_GROUND} stopOpacity="1" />
            <stop offset="1" stopColor={C_GROUND} stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <path d={geo.groundFillPath} fill="url(#msGround)" className={cn(fade, tab === 'surface' || mission ? 'opacity-100' : 'opacity-60')} />
        {geo.seaPath && <path d={geo.seaPath} fill={C_SEA} className={cn(fade, tab === 'geoid' ? 'opacity-75' : 'opacity-50')} />}

        {/* the gap between geoid and ellipsoid = undulation */}
        <path d={geo.gapPath} fill={C_GEO} className={cn(fade, mission ? 'opacity-25' : 'opacity-0')} />

        <path
          d={geo.ellipsoidPath}
          fill="none"
          stroke={C_ELL}
          strokeWidth={weight('ellipsoid')}
          strokeLinejoin="round"
          className={cn(fade, shown('ellipsoid') ? (main('ellipsoid') || mission ? 'opacity-100' : 'opacity-75') : 'opacity-0')}
        />
        <path
          d={geo.geoidPath}
          fill="none"
          stroke={C_GEO}
          strokeWidth={weight('geoid')}
          strokeLinejoin="round"
          className={cn(fade, shown('geoid') ? 'opacity-100' : 'opacity-0')}
        />
        <path
          d={geo.terrainPath}
          fill="none"
          stroke={tab === 'surface' ? C_INK : C_GROUND_DIM}
          strokeWidth={tab === 'surface' ? 3.5 : 2.25}
          strokeLinejoin="round"
          className={fade}
        />

        {st && ax && (
          <g strokeWidth="3">
            <line x1={ax.H} y1={st.geoid} x2={ax.H} y2={st.ground + 4} stroke={C_H} markerEnd="url(#msArH)" />
            <line x1={ax.h} y1={st.ellipsoid} x2={ax.h} y2={st.ground + 4} stroke={C_ELL} markerEnd="url(#msArE)" />
            {N !== 0 && (
              <line x1={ax.N} y1={st.ellipsoid} x2={ax.N} y2={st.geoid + (st.geoid < st.ellipsoid ? 3 : -3)} stroke={C_GEO} markerEnd="url(#msArG)" />
            )}
            <line x1={st.x - 24} y1={st.geoid} x2={st.x + 34} y2={st.geoid} stroke={C_GEO} strokeWidth="1.5" strokeDasharray="4 3" />
            <line x1={st.x - 24} y1={st.ellipsoid} x2={st.x + 34} y2={st.ellipsoid} stroke={C_ELL} strokeWidth="1.5" strokeDasharray="4 3" />
          </g>
        )}
      </svg>

      {/* station points on the ground — the active one carries the measurement */}
      {STATION_IDS.map((id) => {
        const p = geo.stations[id];
        const active = id === station && (tab === 'surface' || mission);
        return (
          <span key={id} aria-hidden>
            {onSelect && (
              // pointer only: the same pick as the pins and the station buttons
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => onSelect(id)}
                className="absolute z-10 size-8 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full"
                style={pos(p.x, p.ground)}
              />
            )}
            <span
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2 rounded-full',
                active
                  ? 'grid size-[18px] place-items-center border-[3px] border-accent bg-paper-bright shadow-[0_2px_6px_rgba(40,50,35,0.35)]'
                  : 'size-2.5 border-2 border-paper-bright bg-brand-dark',
              )}
              style={pos(p.x, p.ground)}
            />
            {active ? (
              <DiagramChip color={C_ACCENT} style={{ ...pos(p.x, p.ground), transform: 'translate(-50%, calc(-100% - 12px))' }}>
                {id}
              </DiagramChip>
            ) : (
              // the other stations: a quiet letter, so the active one's arrows keep the stage
              <span
                className="absolute font-display text-[13px] font-bold leading-none text-brand-dark"
                style={{ ...pos(p.x, p.ground), transform: 'translate(-50%, calc(-100% - 8px))' }}
              >
                {id}
              </span>
            )}
          </span>
        );
      })}

      {st && ax && (
        <>
          <DiagramChip color={C_H} style={{ ...pos(ax.H, (st.geoid + st.ground) / 2), transform: 'translate(calc(-100% - 6px), -50%)' }}>
            H
          </DiagramChip>
          <DiagramChip color={C_ELL} style={{ ...pos(ax.chips, N === 0 ? (st.ellipsoid + st.ground) / 2 : yh), transform: 'translate(0, -50%)' }}>
            h
          </DiagramChip>
          {N !== 0 && (
            <DiagramChip color={C_GEO} style={{ ...pos(ax.chips, yN), transform: 'translate(0, -50%)' }}>
              N
            </DiagramChip>
          )}
        </>
      )}

      </div>

      {/* line names, left of the plot; a quiet line keeps a readable name */}
      <DiagramChip color={C_INK} wide dim={tab !== 'surface' && !mission} style={{ ...pos(geo.leftEnds.x - 8, geo.leftEnds.ground), transform: 'translate(-100%, -50%)' }}>
        פני השטח
      </DiagramChip>
      <DiagramChip color={C_GEO} wide hidden={!shown('geoid')} style={{ ...pos(geo.leftEnds.x - 8, geo.leftEnds.geoid), transform: 'translate(-100%, calc(-100% + 2px))' }}>
        גיאואיד · פני הים
      </DiagramChip>
      <DiagramChip color={C_ELL} wide hidden={!shown('ellipsoid')} style={{ ...pos(geo.leftEnds.x - 8, geo.leftEnds.ellipsoid), transform: 'translate(-100%, 2px)' }}>
        אליפסואיד
      </DiagramChip>
      <span className="absolute top-0 rounded bg-paper-card/85 px-1.5 text-[13px] font-medium text-fg-muted" style={{ right: 8 }}>
        ללא קנה מידה · הגבהים מוגזמים
      </span>
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
