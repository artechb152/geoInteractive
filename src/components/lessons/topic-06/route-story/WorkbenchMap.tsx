'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Compass, ListOrdered, MapPin, Route, Ruler } from 'lucide-react';
import { cn } from '@/lib/utils';
import { POINT_XY, POINTS, LEGS, FEATURES, M_PER_UNIT, polar, type Pt, type EndOption } from './routeStoryModel';
import {
  BOX, GRID_M, GRID_X, GRID_Y, PARKED, PROTRACTOR_R, PROTRACTOR_TICKS, RULER_TICKS, RULER_U, SCALE_BAR_M, SCALE_BAR_SEGMENTS,
  aimAt, armTip, clampToBox, norm360, snap, snapPoint, type Instruments, type ToolPose,
} from './workbenchTools';

export type WorkbenchMapTool = 'select' | 'azimuth' | 'distance' | 'landmarks';
export type MapView = 'ortho' | 'topo';
export type WorkbenchMapProps = {
  selectedLeg: number;
  selectedPoint: number | null;
  tool: WorkbenchMapTool;
  done: boolean;
  /** Changes when the exercise is reset: the hand tools go back to where they lay. */
  resetSignal: number;
  onTool: (tool: WorkbenchMapTool) => void;
  onSelectLeg: (index: number) => void;
  onSelectPoint: (index: number) => void;
  onSelectLandmark: (value: EndOption) => void;
};

export const MAP_TOOLS = [
  { id: 'select', label: 'בחירת קטע', Icon: Route },
  { id: 'azimuth', label: 'אזימוט', Icon: Compass },
  { id: 'distance', label: 'מרחק', Icon: Ruler },
  { id: 'landmarks', label: 'סימני שטח', Icon: MapPin },
] as const;
const VIEWS: { id: MapView; label: string }[] = [
  { id: 'ortho', label: 'תצ״א' },
  { id: 'topo', label: 'מפה טופוגרפית' },
];
const ASSETS = '/assets/lessons/topic06/route-story';
const LANDMARKS: EndOption[] = ['stream-bend', 'saddle', 'road', 'grove', 'pines-rocks'];
/** Landmark labels moved off the tool row and off the summits. */
const LABEL_AT: Partial<Record<EndOption, Pt>> = { saddle: { x: 34, y: 43 }, 'pines-rocks': { x: 103, y: 28 } };
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';
/** Lesson map language (topic-02 topographyTerrainStyle MAP) — the topo sheet's own colours, for its legend. */
const SYM = { contour: '#8A6F4D', ink: '#38432E', vegFill: '#D5E0C4', vegInk: '#6E7A4E', roadCasing: '#8A6F4D', roadFill: '#E3C996', water: '#4f8397' };

type Which = keyof Instruments;
type Drag = { which: Which; kind: 'move' | 'turn'; offset: Pt };

/**
 * The workbench map: the same ground as a photo (תצ״א) or as a topographic
 * map, one north-up frame shared by both pictures, the 100 m grid, the route
 * and the hand tools. The tools are placed and turned by the learner and never
 * print a value; the learner reads the scale and types it into the card.
 * The tool row, the view switch and the legend float inside the frame, clear of
 * the route, the points, the north arrow and the scale bar.
 */
export function WorkbenchMap(props: WorkbenchMapProps) {
  const { selectedLeg, selectedPoint, tool, done, resetSignal, onTool, onSelectLeg, onSelectPoint, onSelectLandmark } = props;
  const uid = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const [view, setView] = useState<MapView>('ortho');
  const [legend, setLegend] = useState(false);
  const [inst, setInst] = useState<Instruments>(PARKED);
  const firstReset = useRef(resetSignal);
  useEffect(() => { if (resetSignal !== firstReset.current) setInst(PARKED); }, [resetSignal]);

  const measuring = tool === 'azimuth' || tool === 'distance';
  const from = selectedLeg + 1, to = selectedLeg + 2;
  const pose = (which: Which, next: Partial<ToolPose>) => setInst(s => ({ ...s, [which]: { ...s[which], ...next } }));

  const toUnits = (e: PointerEvent): Pt | null => {
    const m = svgRef.current?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const grab = (which: Which, kind: Drag['kind']) => (e: PointerEvent<SVGGElement>) => {
    if (e.button !== 0) return;
    const p = toUnits(e);
    if (!p) return;
    e.preventDefault();
    e.stopPropagation();
    const at = inst[which].at;
    drag.current = { which, kind, offset: { x: at.x - p.x, y: at.y - p.y } };
    svgRef.current?.setPointerCapture(e.pointerId);
    (e.currentTarget as SVGGElement).focus({ preventScroll: true });
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    const p = d && toUnits(e);
    if (!d || !p) return;
    if (d.kind === 'move') pose(d.which, { at: snap({ x: p.x + d.offset.x, y: p.y + d.offset.y }) });
    else pose(d.which, { az: aimAt(inst[d.which].at, p) });
  };
  const release = (e: PointerEvent<SVGSVGElement>) => {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  /** Body keys: arrows slide the tool (Shift: further), 1–5 put its centre / zero on that route point. */
  const moveKeys = (which: Which) => (e: KeyboardEvent<SVGGElement>) => {
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= POINT_XY.length) {
      e.preventDefault();
      pose(which, { at: POINT_XY[n - 1] });
      return;
    }
    const v = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[e.key];
    if (!v) return;
    e.preventDefault();
    const step = e.shiftKey ? 2.5 : 0.5;
    const at = inst[which].at;
    pose(which, { at: clampToBox({ x: at.x + v[0] * step, y: at.y + v[1] * step }) });
  };
  /** Handle keys: turn clockwise with → / ↑, anticlockwise with ← / ↓ (1°; Shift 5°; Page 10°). */
  const turnKeys = (which: Which) => (e: KeyboardEvent<SVGGElement>) => {
    const d = ({ ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 } as Record<string, number>)[e.key];
    if (d === undefined && e.key !== 'Home') return;
    e.preventDefault();
    pose(which, { az: e.key === 'Home' ? 0 : norm360(Math.round(inst[which].az) + d * (e.shiftKey && Math.abs(d) === 1 ? 5 : 1)) });
  };
  const activate = (e: KeyboardEvent<SVGGElement>, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); action(); }
  };
  const on = (which: Which) => {
    const i = snapPoint(inst[which].at);
    return i !== null && POINT_XY[i] === inst[which].at ? i : null;
  };

  const instruction = done
    ? 'הקטע הושלם. אפשר להמשיך לקטע הבא או לחזור ולבחון את הציר.'
    : tool === 'select' ? 'בחרו נקודה או קטע במפה.'
    : tool === 'landmarks' ? 'בחרו במפה את הסימן שמאשר הגעה לסוף הקטע.'
    : tool === 'azimuth' ? `גררו את מרכז מד־הזווית לנקודה ${from}, כוונו את הזרוע לנקודה ${to} וקראו את השנתות מהצפון עם כיוון השעון.`
    : `הניחו את ה־0 של הסרגל על נקודה ${from} וסובבו אותו עד נקודה ${to}. אפשר גם לספור משבצות.`;

  return (
    <div className="min-w-0 self-start overflow-hidden rounded-xl border border-border bg-bg-accent" data-qa="workbench-map" data-view={view}>
      <div className="relative">
        <svg
          ref={svgRef}
          data-testid="workbench-map"
          viewBox={`${BOX.x} ${BOX.y} ${BOX.width} ${BOX.height}`}
          style={{ direction: 'ltr' }}
          className="block h-auto w-full touch-none select-none"
          role="group"
          aria-label={`מפת סיפור הדרך, ${view === 'topo' ? 'מפה טופוגרפית' : 'תצ״א'}, צפון למעלה. רשת של משבצות 100 מ׳. קטע ${LEGS[selectedLeg].letter} נבחר. ${instruction}`}
          onPointerMove={onMove}
          onPointerUp={release}
          onPointerCancel={release}
        >
          {/* Two pictures of one ground in one frame: the topographic map fades over the photo, as in lesson 2's scale lab. */}
          <image href={`${ASSETS}/workbench-ortho.webp`} x={BOX.x} y={BOX.y} width={BOX.width} height={BOX.height} preserveAspectRatio="none" aria-hidden="true" />
          <image
            href={`${ASSETS}/workbench-topo.webp`}
            x={BOX.x} y={BOX.y} width={BOX.width} height={BOX.height} preserveAspectRatio="none" aria-hidden="true"
            data-qa="topo-layer"
            className="transition-opacity duration-200 ease-snap motion-reduce:transition-none"
            style={{ opacity: view === 'topo' ? 1 : 0 }}
          />
          <Grid view={view} />

          {LEGS.map((leg, i) => {
            const a = POINT_XY[i], b = POINT_XY[i + 1], active = selectedLeg === i;
            const selecting = tool === 'select';
            return (
              <g key={i} role={selecting ? 'button' : undefined} tabIndex={selecting ? 0 : -1} aria-label={selecting ? `בחירת קטע ${leg.letter}, מנקודה ${i + 1} לנקודה ${i + 2}` : undefined} aria-pressed={selecting ? active : undefined}
                className={cn('group outline-none', selecting && 'cursor-pointer')} pointerEvents={selecting ? undefined : 'none'}
                onClick={() => { if (selecting) onSelectLeg(i); }} onKeyDown={e => activate(e, () => { if (selecting) onSelectLeg(i); })}>
                <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} fill="none" className="stroke-accent opacity-0 group-focus-visible:opacity-100" strokeWidth={2} pointerEvents="none" />
                <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} fill="none" className="stroke-bg-elevated" strokeWidth={1.4} opacity={.85} />
                <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} fill="none" className={active ? 'stroke-accent' : 'stroke-brand-dark'} strokeWidth={active ? .7 : .5} />
                {selecting && <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} fill="none" stroke="transparent" strokeWidth={4} />}
              </g>
            );
          })}

          {POINT_XY.map((p, i) => {
            const active = selectedPoint === i || i === selectedLeg || i === selectedLeg + 1;
            const clickable = tool === 'select';
            return (
              <g key={i} transform={`translate(${p.x} ${p.y})`} role={clickable ? 'button' : undefined} tabIndex={clickable ? 0 : -1} pointerEvents={clickable ? undefined : 'none'}
                aria-label={clickable ? (done && i === selectedLeg + 1 ? `נקודה ${i + 1}: ${POINTS[i].name}` : `נקודה ${i + 1}`) : undefined} className="cursor-pointer outline-none group"
                onClick={() => { if (clickable) onSelectPoint(i); }} onKeyDown={e => activate(e, () => { if (clickable) onSelectPoint(i); })}>
                <circle r={2.55} className={cn('fill-bg-elevated', active ? 'stroke-accent' : 'stroke-brand-dark')} strokeWidth={.42} />
                <circle r={3.4} fill="none" className="stroke-accent opacity-0 group-focus-visible:opacity-100" strokeWidth={.3} />
                <text x={0} y={1} textAnchor="middle" fontSize={2.8} fontWeight={800} className="fill-fg" pointerEvents="none">{i + 1}</text>
                {POINTS[i].abbr && <g pointerEvents="none"><rect x={-3.5} y={3.1} width={7} height={3.4} rx={.7} className="fill-bg-elevated" fillOpacity={.9} /><text x={0} y={5.5} textAnchor="middle" fontSize={1.9} fontWeight={700} className="fill-fg">{POINTS[i].abbr}</text></g>}
              </g>
            );
          })}

          {/* The tools lie on top of the map, like the transparent sheet and the ruler on a paper map: the points show through them. */}
          {tool === 'azimuth' && <ProtractorBody pose={inst.protractor} onPointerDown={grab('protractor', 'move')} onKeyDown={moveKeys('protractor')} on={on('protractor')} />}
          {tool === 'distance' && <RulerBody pose={inst.ruler} onPointerDown={grab('ruler', 'move')} onKeyDown={moveKeys('ruler')} on={on('ruler')} />}
          {tool === 'azimuth' && <Handle tip={armTip(inst.protractor, PROTRACTOR_R + 4.5)} from={inst.protractor.at} label="זרוע מד־הזווית" az={inst.protractor.az} onPointerDown={grab('protractor', 'turn')} onKeyDown={turnKeys('protractor')} arm />}
          {tool === 'distance' && <Handle tip={armTip(inst.ruler, RULER_U + 5.6)} from={inst.ruler.at} label="סיבוב הסרגל" az={inst.ruler.az} onPointerDown={grab('ruler', 'turn')} onKeyDown={turnKeys('ruler')} />}

          {tool === 'landmarks' && LANDMARKS.map(id => {
            const f = FEATURES[id], p = f.at;
            const labelAt = LABEL_AT[id] ?? f.labelAt ?? p;
            return (
              <g key={id} role="button" tabIndex={done ? -1 : 0} aria-label={`בחירת סימן: ${f.label}`} onClick={() => { if (!done) onSelectLandmark(id); }} onKeyDown={e => activate(e, () => { if (!done) onSelectLandmark(id); })} className="cursor-pointer outline-none group">
                <ellipse cx={p.x} cy={p.y} rx={f.rx + 1} ry={f.ry + 1} transform={f.rotate ? `rotate(${f.rotate} ${p.x} ${p.y})` : undefined} className="fill-bg-elevated/10 stroke-accent group-focus-visible:stroke-fg" strokeWidth={.3} strokeDasharray=".7 .45" />
                <g transform={`translate(${labelAt.x} ${labelAt.y - 1})`}><rect x={-10} y={-2.4} width={20} height={4.7} rx={.7} className="fill-bg-elevated stroke-border group-focus-visible:stroke-accent" strokeWidth={.15} /><text x={0} y={.7} textAnchor="middle" fontSize={1.6} fontWeight={600} className="fill-fg">{f.label}</text></g>
              </g>
            );
          })}

          {/* Printed orientation and scale are physical map furniture, unaffected by the RTL document. */}
          <g transform="translate(-10.5 85)" pointerEvents="none" className="fill-fg" data-qa="north-arrow">
            <rect x={-3.2} y={-7.4} width={6.4} height={11.6} rx={.8} className="fill-bg-elevated" fillOpacity={.9} />
            <text x={0} y={-4.4} textAnchor="middle" fontSize={2.5} fontWeight={700}>צ</text>
            <path d="M0-3L1.8 3L0 1.8L-1.8 3Z" />
            <path d="M0-3V1.8L-1.8 3Z" className="fill-bg-elevated" />
          </g>
          <ScaleBar />
        </svg>

        {/* Floating map controls: tools at inline-start (right), the view switch and legend at inline-end (left). */}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3">
          <div role="group" aria-label="כלי המפה" data-qa="map-tools" className="pointer-events-auto flex gap-1 rounded-xl border border-border bg-bg-elevated/95 p-1 shadow-elevated">
            {MAP_TOOLS.map(({ id, label, Icon }) => (
              <button key={id} type="button" aria-pressed={tool === id} onClick={() => onTool(id)}
                className={cn('inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 font-display text-[15px] font-bold transition-colors duration-200 ease-snap', FOCUS,
                  tool === id ? 'bg-brand-dark text-white shadow-sm' : 'text-fg hover:bg-bg-accent')}>
                <Icon className="size-[18px]" aria-hidden />
                {label}
              </button>
            ))}
          </div>
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              <ViewSwitch value={view} onChange={setView} />
              <button type="button" aria-expanded={legend} aria-controls={`${uid}-legend`} onClick={() => setLegend(v => !v)}
                className={cn('inline-flex h-11 items-center gap-1.5 rounded-xl border bg-bg-elevated/95 px-3 font-display text-[15px] font-bold shadow-elevated transition-colors duration-200 ease-snap', FOCUS,
                  legend ? 'border-accent text-fg' : 'border-border text-fg-muted hover:text-fg')}>
                <ListOrdered className="size-[18px]" aria-hidden />
                מקרא
              </button>
            </div>
            {legend && <Legend id={`${uid}-legend`} view={view} />}
          </div>
        </div>
      </div>
      <p className="border-t border-border bg-bg-accent px-3 py-2 text-base leading-snug text-fg-muted" aria-live="polite" data-qa="map-instruction">{instruction}</p>
    </div>
  );
}

/** תצ״א / מפה טופוגרפית — lesson 2's representation switch (ViewModeToggle), as a radio group with arrow keys. */
function ViewSwitch({ value, onChange }: { value: MapView; onChange: (v: MapView) => void }) {
  const refs = useRef(new Map<MapView, HTMLButtonElement>());
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const next = e.key === 'Home' ? VIEWS[0].id : e.key === 'End' ? VIEWS[VIEWS.length - 1].id : VIEWS.find(v => v.id !== value)!.id;
    onChange(next);
    refs.current.get(next)?.focus();
  };
  return (
    <div role="radiogroup" aria-label="תצוגת המפה" data-qa="view-switch" onKeyDown={onKeyDown} className="inline-flex gap-1 rounded-xl border border-border bg-bg-elevated/95 p-1 shadow-elevated">
      {VIEWS.map(v => {
        const on = v.id === value;
        return (
          <button key={v.id} ref={el => { if (el) refs.current.set(v.id, el); else refs.current.delete(v.id); }} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} onClick={() => onChange(v.id)}
            className={cn('h-9 rounded-lg border px-3.5 font-display text-[15px] font-bold transition-colors duration-200 ease-snap', FOCUS,
              on ? 'border-accent bg-accent/10 text-fg' : 'border-transparent text-fg-muted hover:text-fg')}>
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

function Swatch({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 28 14" className="h-3.5 w-7 shrink-0" style={{ direction: 'ltr' }} aria-hidden>{children}</svg>;
}

/** What the symbols mean, for the view on show. */
function Legend({ id, view }: { id: string; view: MapView }) {
  const rows: [ReactNode, string][] = [
    [<><path d="M0 7H28" stroke="#FFFFFF" strokeWidth={3} /><path d="M0 7H28" stroke={SYM.ink} strokeWidth={1.2} /></>, `רשת: משבצת ${GRID_M} מ׳`],
    [<><path d="M0 7H28" stroke="#FFFFFF" strokeWidth={4} /><path d="M0 7H28" stroke={SYM.ink} strokeWidth={2.4} /></>, `קו רשת מודגש: כל ${GRID_M * 5} מ׳`],
    ...(view === 'topo'
      ? ([
          [<path d="M0 9C8 3 18 3 28 8" fill="none" stroke={SYM.contour} strokeWidth={1} />, 'קו גובה, כל 10 מ׳'],
          [<path d="M0 9C8 3 18 3 28 8" fill="none" stroke={SYM.contour} strokeWidth={2.2} />, 'קו גובה ראשי, כל 50 מ׳'],
          [<><circle cx={6} cy={8} r={2} fill={SYM.ink} /><text x={10} y={11} textAnchor="start" fontSize={8} fontWeight={700} fill={SYM.ink}>456</text></>, 'נקודת גובה (מ׳)'],
          [<path d="M0 9C9 4 19 11 28 6" fill="none" stroke={SYM.water} strokeWidth={2} />, 'נחל'],
          [<><path d="M0 7H28" stroke={SYM.roadCasing} strokeWidth={5} /><path d="M0 7H28" stroke={SYM.roadFill} strokeWidth={3.2} /></>, 'דרך עפר'],
          [<><rect x={1} y={1} width={26} height={12} rx={4} fill={SYM.vegFill} stroke={SYM.vegInk} strokeWidth={.8} strokeDasharray="1 2" /><circle cx={9} cy={7} r={2.6} fill="none" stroke={SYM.vegInk} strokeWidth={.8} /><circle cx={19} cy={7} r={2.6} fill="none" stroke={SYM.vegInk} strokeWidth={.8} /></>, 'חורש ועצים'],
          [<><path d="M4 11L7 5L10 11Z M13 10L16 4L19 10Z M21 12L24 6L27 12Z" fill={SYM.ink} /></>, 'קרקע סלעית'],
        ] as [ReactNode, string][])
      : []),
    [<><path d="M2 7H26" stroke="#FFFFFF" strokeWidth={3} /><path d="M2 7H26" className="stroke-accent" strokeWidth={1.6} /><circle cx={14} cy={7} r={4.4} className="fill-bg-elevated stroke-brand-dark" strokeWidth={1.2} /></>, 'נקודה וקטע בציר'],
  ];
  return (
    <div id={id} data-qa="map-legend" className="w-[230px] rounded-xl border border-border bg-bg-elevated/95 p-3 shadow-elevated">
      <div className="mb-1.5 font-display text-[15px] font-bold text-fg">{view === 'topo' ? 'מקרא · מפה טופוגרפית' : 'מקרא · תצ״א'}</div>
      <ul className="space-y-1">
        {rows.map(([sym, label]) => (
          <li key={label} className="flex items-center gap-2 text-sm leading-snug text-fg">
            <Swatch>{sym}</Swatch>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The 100 m grid over both views: a line every square, a heavier line every 500 m (the scale bar's length). */
function Grid({ view }: { view: MapView }) {
  const topo = view === 'topo';
  const line = (major: boolean) => (topo ? { stroke: SYM.ink, strokeWidth: major ? .24 : .085, opacity: major ? .7 : .38 } : { stroke: '#FFFFFF', strokeWidth: major ? .3 : .1, opacity: major ? .95 : .6 });
  return (
    <g pointerEvents="none" data-qa="map-grid" data-grid-m={GRID_M}>
      {/* On the photo, each line rides on a faint dark casing so it reads on pale rock and dark woods alike. */}
      {!topo && [...GRID_X.map(l => ({ ...l, v: true })), ...GRID_Y.map(l => ({ ...l, v: false }))].map((l, i) => (
        <path key={`c${i}`} d={l.v ? `M${l.at} ${BOX.y}V${BOX.y + BOX.height}` : `M${BOX.x} ${l.at}H${BOX.x + BOX.width}`} stroke={SYM.ink} strokeWidth={l.major ? .62 : .26} opacity={l.major ? .38 : .2} />
      ))}
      {GRID_X.map((l, i) => <path key={`x${i}`} d={`M${l.at} ${BOX.y}V${BOX.y + BOX.height}`} {...line(l.major)} />)}
      {GRID_Y.map((l, i) => <path key={`y${i}`} d={`M${BOX.x} ${l.at}H${BOX.x + BOX.width}`} {...line(l.major)} />)}
    </g>
  );
}

/** Scale bar: 0–500 m in five 100 m segments — each segment is exactly one grid square. */
function ScaleBar() {
  const seg = GRID_M / M_PER_UNIT;
  return (
    <g transform="translate(90 84.6)" pointerEvents="none" data-qa="scale-bar">
      <rect x={-2.4} y={-4.6} width={SCALE_BAR_SEGMENTS * seg + 4.9} height={10.4} rx={.8} className="fill-bg-elevated" opacity={.92} />
      {Array.from({ length: SCALE_BAR_SEGMENTS }, (_, i) => <rect key={i} x={i * seg} y={0} width={seg} height={.8} className={i % 2 ? 'fill-bg-elevated stroke-fg' : 'fill-fg stroke-fg'} strokeWidth={.1} />)}
      {Array.from({ length: SCALE_BAR_SEGMENTS + 1 }, (_, i) => <text key={i} x={i * seg} y={-1.1} textAnchor="middle" fontSize={1.6} fontWeight={600} className="fill-fg">{i * GRID_M}</text>)}
      <text x={(SCALE_BAR_SEGMENTS * seg) / 2} y={4.1} textAnchor="middle" fontSize={1.7} fontWeight={700} className="fill-fg" data-scale-m={SCALE_BAR_M}>{`מטרים · משבצת = ${GRID_M} מ׳`}</text>
    </g>
  );
}

const ringPath = (r1: number, r2: number) => `M${r2} 0A${r2} ${r2} 0 1 0 ${-r2} 0A${r2} ${r2} 0 1 0 ${r2} 0ZM${r1} 0A${r1} ${r1} 0 1 1 ${-r1} 0A${r1} ${r1} 0 1 1 ${r1} 0Z`;
const O: Pt = { x: 0, y: 0 };

type BodyProps = { pose: ToolPose; on: number | null; onPointerDown: (e: PointerEvent<SVGGElement>) => void; onKeyDown: (e: KeyboardEvent<SVGGElement>) => void };

/**
 * A transparent 360° protractor, north-up like the map: a division every 1°, a
 * longer one every 5°, a number every 10°, counted clockwise from north (0).
 * Dragging it moves it; dropped near a route point, its centre lands on it.
 */
function ProtractorBody({ pose, on, onPointerDown, onKeyDown }: BodyProps) {
  const R = PROTRACTOR_R, band = 5.6;
  return (
    <g transform={`translate(${pose.at.x} ${pose.at.y})`} role="group" aria-roledescription="מד־זווית" tabIndex={0} data-qa="protractor" data-on-point={on === null ? undefined : on + 1} data-at={`${pose.at.x},${pose.at.y}`}
      aria-label={`מד־זווית, ${on === null ? 'מרכזו אינו על נקודה' : `מרכזו על נקודה ${on + 1}`}. גררו כדי להזיז, או חיצים; המקשים 1 עד 5 מניחים את המרכז על נקודה.`}
      className="group cursor-grab outline-none active:cursor-grabbing" onPointerDown={onPointerDown} onKeyDown={onKeyDown}>
      <circle r={R} fill="#FFFFFF" fillOpacity={.14} />
      <path d={ringPath(R - band, R)} fillRule="evenodd" fill="#FFFFFF" fillOpacity={.62} />
      <circle r={R} fill="none" className="stroke-fg" strokeWidth={.16} />
      <circle r={R - band} fill="none" className="stroke-fg" strokeWidth={.1} opacity={.7} />
      <circle r={R + .9} fill="none" className="stroke-accent opacity-0 group-focus-visible:opacity-100" strokeWidth={.4} />
      {PROTRACTOR_TICKS.map(({ deg, kind }) => {
        const a = polar(O, deg, R - (kind === 'ten' ? 2.3 : kind === 'five' ? 1.5 : .85)), b = polar(O, deg, R);
        return <line key={deg} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-fg" strokeWidth={kind === 'ten' ? .17 : kind === 'five' ? .11 : .06} />;
      })}
      {PROTRACTOR_TICKS.filter(t => t.kind === 'ten').map(({ deg }) => {
        const p = polar(O, deg, R - 3.95);
        return <text key={deg} x={p.x} y={p.y + .62} textAnchor="middle" fontSize={1.75} fontWeight={700} className="fill-fg" pointerEvents="none">{deg}</text>;
      })}
      {/* north index and the clockwise sense of the count */}
      <path d={`M0 ${-R - .3}l-1 -1.7h2Z`} className="fill-fg" />
      <circle cy={-R - 3.1} r={1.45} className="fill-bg-elevated" fillOpacity={.9} />
      <text x={0} y={-R - 2.45} textAnchor="middle" fontSize={1.9} fontWeight={800} className="fill-fg" pointerEvents="none">צ</text>
      <path d={(() => { const a = polar(O, 6, R + 1.5), b = polar(O, 26, R + 1.5); return `M${a.x} ${a.y}A${R + 1.5} ${R + 1.5} 0 0 1 ${b.x} ${b.y}`; })()} fill="none" className="stroke-accent" strokeWidth={.3} strokeLinecap="round" />
      {(() => { const t = polar(O, 28, R + 1.5); return <path d="M0 -.9L1.6 0L0 .9Z" transform={`translate(${t.x} ${t.y}) rotate(${28})`} className="fill-accent" />; })()}
      {/* centre cross: N–S and E–W through the centre, open at the middle so the point under it stays visible */}
      <path d={`M0 ${-(R - band)}V-3.2M0 3.2V${R - band}M${-(R - band)} 0H-3.2M3.2 0H${R - band}`} className="stroke-fg" strokeWidth={.09} opacity={.75} />
      <circle r={.32} className="fill-fg" />
    </g>
  );
}

/**
 * A ruler drawn to the map's scale: 0 at its pivot, a division every 50 m and a
 * number every 100 m (each 100 m is one grid square). It turns about its 0 end.
 */
function RulerBody({ pose, on, onPointerDown, onKeyDown }: BodyProps) {
  const flip = pose.az > 180 && pose.az < 360; // numbers stay upright when the ruler points west
  const W = 3.9;
  return (
    <g transform={`translate(${pose.at.x} ${pose.at.y}) rotate(${pose.az - 90})`} role="group" aria-roledescription="סרגל" tabIndex={0} data-qa="ruler" data-on-point={on === null ? undefined : on + 1} data-at={`${pose.at.x},${pose.at.y}`}
      aria-label={`סרגל ${RULER_TICKS.at(-1)!.m} מ׳, ${on === null ? 'ה־0 אינו על נקודה' : `ה־0 על נקודה ${on + 1}`}. גררו כדי להזיז, או חיצים; המקשים 1 עד 5 מניחים את ה־0 על נקודה.`}
      className="group cursor-grab outline-none active:cursor-grabbing" onPointerDown={onPointerDown} onKeyDown={onKeyDown}>
      <rect x={-1.6} y={0} width={RULER_U + 5} height={W} rx={.45} fill="#FFFFFF" fillOpacity={.74} className="stroke-fg" strokeWidth={.1} />
      <rect x={-2.2} y={-.6} width={RULER_U + 6.2} height={W + 1.2} rx={.8} fill="none" className="stroke-accent opacity-0 group-focus-visible:opacity-100" strokeWidth={.35} />
      <line x1={0} y1={0} x2={RULER_U} y2={0} className="stroke-fg" strokeWidth={.14} />
      {RULER_TICKS.map(({ m, u, major }) => (
        <g key={m}>
          <line x1={u} y1={0} x2={u} y2={major ? 1.55 : .85} className="stroke-fg" strokeWidth={major ? .14 : .08} />
          {major && <text x={u} y={2.25} textAnchor="middle" dominantBaseline="central" fontSize={1.6} fontWeight={700} className="fill-fg" transform={flip ? `rotate(180 ${u} 2.25)` : undefined} pointerEvents="none">{m}</text>}
        </g>
      ))}
      <text x={RULER_U + 1.9} y={2.25} textAnchor="middle" dominantBaseline="central" fontSize={1.45} fontWeight={700} className="fill-fg-muted" transform={flip ? `rotate(180 ${RULER_U + 1.9} 2.25)` : undefined} pointerEvents="none">מ׳</text>
      {/* the 0 end, which goes on the leg's start point */}
      <path d="M0 0l-.9 -1.5h1.8Z" className="fill-accent" />
    </g>
  );
}

/** The arm / turning handle: a line from the tool's centre to a knob that is dragged (or turned with the arrow keys). */
function Handle({ tip, from, label, az, arm, onPointerDown, onKeyDown }: { tip: Pt; from: Pt; label: string; az: number; arm?: boolean; onPointerDown: (e: PointerEvent<SVGGElement>) => void; onKeyDown: (e: KeyboardEvent<SVGGElement>) => void }) {
  return (
    <g data-qa={arm ? 'protractor-arm' : 'ruler-handle'}>
      {arm && <>
        <line x1={from.x} y1={from.y} x2={tip.x} y2={tip.y} stroke="#FFFFFF" strokeWidth={.6} opacity={.75} pointerEvents="none" />
        <line x1={from.x} y1={from.y} x2={tip.x} y2={tip.y} className="stroke-accent" strokeWidth={.22} pointerEvents="none" />
      </>}
      <g transform={`translate(${tip.x} ${tip.y})`} role="slider" tabIndex={0} aria-label={`${label}. גררו את הידית או השתמשו בחיצים כדי לסובב.`}
        aria-valuemin={0} aria-valuemax={359} aria-valuenow={Math.round(az) % 360} aria-valuetext={`${Math.round(az) % 360} מעלות מהצפון`}
        className="group cursor-grab outline-none active:cursor-grabbing" onPointerDown={onPointerDown} onKeyDown={onKeyDown}>
        <circle r={3.1} fill="transparent" />
        <circle r={2.5} fill="none" className="stroke-accent opacity-0 group-focus-visible:opacity-100" strokeWidth={.35} />
        <circle r={1.55} className="fill-accent stroke-bg-elevated" strokeWidth={.35} />
      </g>
    </g>
  );
}
