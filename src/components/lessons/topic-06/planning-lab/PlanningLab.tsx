'use client';

import { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Check, Crosshair, Lightbulb, ListTree, MapPin, Maximize2, Minimize2, Plus, RotateCcw, ScanEye, Spline, Trash2, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusChip } from '@/components/ui/StatusChip';
import { createViewStore } from '../terrain-nav/terrainNavViewStore';
import { MAP } from '../../topic-02/topographyTerrainStyle';
import { heightAt, prepareWorld } from './planningLabTerrain';
import { COMPASS_HE, assess, compassPoint, directLine, featureOf, features, legsOf, passOf, pickFeature, standsOn, type Assessment, type FeatureId, type Leg } from './planningLabPlan';
import { INITIAL_STATE, MAX_POINTS, checkpointsInOrder, editable, reducer, routePoints, type Action, type Notice, type RouteNode, type State, type Tool } from './planningLabState';
import { MAP_ASPECT, PlanningLabMap, PlanningMapLegend } from './PlanningLabMap';
import { PlanningLabModel } from './PlanningLabModel';

/**
 * „לפני שיוצאים: מה צריך לתכנן?” — the planning lab of lesson 6. One open
 * workspace, no stages: the live terrain model, the topographic map of the same
 * ground, and a context panel. Every tool is open from the start and every
 * decision can be changed in any order:
 *
 *   עריכת מסלול   add route points on the map (or the model), drag them, select
 *                  a leg to see its direction and distance, delete, undo.
 *   נקודות אימות   choose an identified feature the route passes — the checkpoint
 *                  is set where the route passes it, without moving the route.
 *   זיהוי בשטח     choose a feature in either view (or the list) and compare how
 *                  it looks on the map and on the ground.
 *
 * The four planning tips are capabilities of the workspace, not stations: the
 * start and destination are identified places, the route is compared with the
 * straight line by its real ground, legs carry direction and distance, and
 * checkpoints are ordered along the route. Feedback comes from the route's own
 * geometry and the height grid — never from which button was pressed — and
 * never calls a route "safe" or "the right one".
 *
 * This example is separate from the route story later in the lesson: nothing
 * planned here is carried into another screen.
 */

/**
 * Laptop fit (1344 px reference; the lesson's screens stay ≤ ~760 px tall): the
 * two views are VIEW_H tall, the map panel takes the sheet's own aspect, the
 * context panel PANEL_W, and the strip under the views STRIP_H — so no state
 * moves the views.
 */
const VIEW_H = 440;
const PANEL_W = 300;
const MAP_W = Math.round((VIEW_H - 2) * MAP_ASPECT + 2);
const STRIP_H = 104;

const TOOLS: { id: Tool; label: string; icon: ReactNode }[] = [
  { id: 'route', label: 'עריכת מסלול', icon: <Spline className="size-4" aria-hidden /> },
  { id: 'checks', label: 'נקודות אימות', icon: <MapPin className="size-4" aria-hidden /> },
  { id: 'identify', label: 'זיהוי בשטח', icon: <ScanEye className="size-4" aria-hidden /> },
];

/** Features in the list, roughly from the start to the destination. */
const FEATURE_ORDER: FeatureId[] = ['building', 'track', 'orchard', 'stream', 'ravine', 'saddle', 'peak-west', 'peak-east', 'road', 'grove', 'rocks'];

const m = (v: number) => Math.round(v).toLocaleString('he-IL');

const pillBtn =
  'inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-paper-bright/70 px-3 font-display text-base font-semibold text-black hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-45';
const ghostBtn =
  'inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 font-display text-base font-semibold text-black hover:bg-bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-45';
const PANEL_TITLE = 'font-display text-lg font-bold leading-snug text-black';
const BODY = 'text-base leading-relaxed text-black';

export function PlanningLab({ title, intro }: { title: string; intro: string }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [view] = useState(createViewStore);
  const [ready, setReady] = useState(false);
  const reduce = !!useReducedMotion();
  const uid = useId();

  useEffect(() => {
    let alive = true;
    prepareWorld().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // Dev-only handle for scripts/qa (read the state, drive the view).
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __pl?: unknown };
    w.__pl = { state, view, dispatch };
    return () => {
      delete w.__pl;
    };
  }, [state, view]);

  const pts = useMemo(() => routePoints(state.nodes), [state.nodes]);
  const assessment = useMemo(() => (ready ? assess(pts) : null), [ready, pts]);
  const direct = useMemo(() => (ready ? directLine().assessment : null), [ready]);

  const selNode = state.selection?.kind === 'node' ? state.nodes.find((n) => n.id === (state.selection as { id: string }).id) ?? null : null;
  const highlights: FeatureId[] = useMemo(() => {
    const out: FeatureId[] = [];
    if (state.selection?.kind === 'feature') out.push(state.selection.id);
    if (selNode?.feature && !out.includes(selNode.feature)) out.push(selNode.feature);
    if (selNode?.kind === 'start') out.push('building');
    if (selNode?.kind === 'end') out.push('rocks');
    return out;
  }, [state.selection, selNode]);

  // A click on the model's ground does what a click on the map's ground does: the tool decides.
  const dispatchGround = useCallback((tool: Tool, p: { E: number; N: number }) => groundAction(tool, p, dispatch), []);

  const modelProps = useMemo(
    () => ({
      nodes: state.nodes,
      selection: state.selection,
      showDirect: state.showDirect,
      highlights,
      dragging: state.dragging,
      tool: state.tool,
      dispatch,
      onGround: (p: { E: number; N: number }) => dispatchGround(state.tool, p),
    }),
    [state.nodes, state.selection, state.showDirect, highlights, state.dragging, state.tool, dispatchGround],
  );

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z' || e.key === 'ז')) {
      e.preventDefault();
      dispatch({ type: 'undo' });
    } else if (e.key === 'Escape' && state.selection) {
      dispatch({ type: 'select', selection: null });
    }
  };

  const checks = checkpointsInOrder(state.nodes);

  return (
    <div
      className="surface-elevated p-6"
      role="group"
      aria-labelledby={`${uid}-title`}
      onKeyDown={onKeyDown}
      data-activity="planning-lab"
      data-tool={state.tool}
      data-crossing={assessment?.crossing}
      data-length={assessment ? Math.round(assessment.profile.lengthM) : undefined}
      data-points={state.nodes.length}
      data-checks={checks.map((c) => c.node.feature).join(',')}
      data-direct={state.showDirect || undefined}
    >
      {/* Title (with the example note at the inline end) and lead */}
      <div className="flex items-start justify-between gap-6">
        <h3 id={`${uid}-title`} className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
          {title}
        </h3>
        <StatusChip tone="badge" className="mt-1.5 text-sm">
          דוגמה לימודית · שטח בדיוני, נפרד מסיפור הדרך שבהמשך
        </StatusChip>
      </div>
      <p className="mt-1.5 text-base leading-relaxed text-fg-muted">{intro}</p>

      {/* Tools — all open, none numbered; the actions at the inline end */}
      <div className="mt-4 flex items-center justify-between gap-4" data-toolbar>
        <div className="flex items-center gap-3">
          <ToolSwitch tool={state.tool} onChange={(tool) => dispatch({ type: 'tool', tool })} />
          <button type="button" aria-pressed={state.showDirect} onClick={() => dispatch({ type: 'toggleDirect' })} className={cn(pillBtn, state.showDirect && 'border-accent/60 bg-accent/10')} data-toggle="direct">
            <span aria-hidden className={cn('flex size-[18px] items-center justify-center rounded border', state.showDirect ? 'border-accent bg-accent text-white' : 'border-fg-dim bg-white')}>
              {state.showDirect && <Check className="size-3.5" strokeWidth={3.5} />}
            </span>
            השוואה לקו הישיר
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className={ghostBtn} onClick={() => dispatch({ type: 'example' })} disabled={!ready} data-action="example">
            <Lightbulb className="size-4" aria-hidden />
            דוגמת תכנון
          </button>
          <button type="button" className={ghostBtn} onClick={() => dispatch({ type: 'undo' })} disabled={!state.past.length} aria-keyshortcuts="Control+Z" data-action="undo">
            <Undo2 className="size-4" aria-hidden />
            ביטול פעולה
          </button>
          <button type="button" className={ghostBtn} onClick={() => dispatch({ type: 'reset' })} data-action="reset" title="המסלול חוזר להתחלה; אפשר לבטל את האיפוס">
            <RotateCcw className="size-4" aria-hidden />
            איפוס
          </button>
        </div>
      </div>

      {/* The workspace: model (inline start = right) · map · context panel (inline end = left) */}
      <div className="mt-3 grid gap-x-4 gap-y-3" style={{ gridTemplateColumns: `minmax(0, 1fr) ${MAP_W}px ${PANEL_W}px`, gridTemplateRows: `${VIEW_H}px ${STRIP_H}px` }}>
        <PlanningLabModel view={view} reduce={reduce} modelProps={modelProps} className="min-w-0" style={{ height: VIEW_H }} />
        <MapPanel ready={ready} state={state} dispatch={dispatch} />
        <div className="row-span-2 flex min-h-0 flex-col gap-3">
          {ready ? <ContextPanel state={state} dispatch={dispatch} view={view} /> : <div className="flex-1 rounded-xl border border-border bg-bg-accent/50" />}
          <MapTools />
        </div>
        <div className="col-span-2 min-w-0">
          <FeedbackStrip assessment={assessment} direct={direct} state={state} />
        </div>
      </div>
    </div>
  );
}

/** The tool's action for a click on the ground (map or model). */
function groundAction(tool: Tool, p: { E: number; N: number }, dispatch: (a: Action) => void) {
  if (tool === 'route') {
    dispatch({ type: 'add', at: p });
    return;
  }
  const f = pickFeature(p, 10);
  if (tool === 'checks') dispatch(f ? { type: 'addCheck', feature: f } : { type: 'select', selection: null });
  else dispatch({ type: 'select', selection: f ? { kind: 'feature', id: f } : null });
}

// ---------------------------------------------------------------- toolbar

function ToolSwitch({ tool, onChange }: { tool: Tool; onChange: (t: Tool) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    // RTL: the previous tool is to the right
    const d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + TOOLS.length) % TOOLS.length;
    onChange(TOOLS[n].id);
    refs.current[n]?.focus();
  };
  return (
    <div role="radiogroup" aria-label="כלי העבודה" className="flex shrink-0 rounded-xl border border-border bg-bg-accent p-1" data-tools>
      {TOOLS.map((t, i) => {
        const on = t.id === tool;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            data-tool={t.id}
            className={cn(
              'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3.5 font-display text-base leading-none transition-colors duration-200 ease-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              on ? 'bg-brand-dark font-bold text-white shadow-sm' : 'font-semibold text-black hover:bg-bg-elevated',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- map panel and its tools

function MapPanel({ ready, state, dispatch }: { ready: boolean; state: State; dispatch: (a: Action) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  return (
    <div ref={ref} className={cn('relative flex items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-white', fullscreen && 'rounded-none p-4')} data-panel="map">
      {ready ? (
        <PlanningLabMap overlay={{ nodes: state.nodes, tool: state.tool, selection: state.selection, showDirect: state.showDirect, dragging: state.dragging }} dispatch={dispatch} className="block h-full max-h-full w-full" />
      ) : (
        <span className="font-display text-base font-semibold text-black" data-loading>
          טוען את המפה…
        </span>
      )}
      {fullscreen && (
        <button type="button" onClick={() => document.exitFullscreen()} className={cn(pillBtn, 'absolute bottom-4 end-4')}>
          <Minimize2 className="size-4" aria-hidden />
          יציאה ממסך מלא
        </button>
      )}
    </div>
  );
}

function MapTools() {
  return (
    <div className="shrink-0" data-map-tools>
      <div className="flex items-center gap-2">
        <Popover
          label="מקרא המפה"
          trigger={
            <span className={pillBtn}>
              <ListTree className="size-4" aria-hidden />
              מקרא המפה
            </span>
          }
        >
          <PlanningMapLegend />
        </Popover>
        <button type="button" className={pillBtn} onClick={() => (document.querySelector('[data-activity="planning-lab"] [data-panel="map"]') as HTMLElement | null)?.requestFullscreen?.()} data-map-fullscreen>
          <Maximize2 className="size-4" aria-hidden />
          מפה במסך מלא
        </button>
      </div>
    </div>
  );
}

/** A small disclosure: a trigger and a note above it; Esc or a click outside closes it. */
function Popover({ label, trigger, children }: { label: string; trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <span ref={ref} className="relative flex shrink-0">
      <button type="button" aria-expanded={open} aria-controls={id} aria-label={label} onClick={() => setOpen((o) => !o)} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {trigger}
      </button>
      {open && (
        <span id={id} role="note" className="absolute bottom-full end-0 z-30 mb-2 w-[34rem] rounded-xl border border-border bg-bg-elevated p-4 text-start shadow-elevated">
          {children}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------- the feedback strip

const CROSSING_TITLE: Record<Assessment['crossing'], string> = {
  'peak-west': 'המסלול עולה על הפסגה המערבית',
  'peak-east': 'המסלול עולה על הפסגה המזרחית',
  saddle: 'המסלול חוצה את הרכס באוכף',
  slope: 'המסלול חוצה את הרכס על המדרון',
  around: 'המסלול עוקף את הרכס',
};

/** The route against the ground — read from the route's own points and the height grid, live while dragging. */
function crossingText(a: Assessment): string {
  const p = a.profile;
  const sd = Math.round(a.saddleH);
  if (a.crossing === 'saddle') return `האוכף (${sd} מ׳) הוא הנקודה הנמוכה ברכס שבין שתי הפסגות. הנקודה הגבוהה בדרך: ${m(p.maxH)} מ׳.`;
  if (a.crossing === 'slope') return `הנקודה הגבוהה בדרך: ${m(p.maxH)} מ׳, גבוה ב־${m(p.maxH - a.saddleH)} מ׳ מהאוכף שבין הפסגות.`;
  if (a.crossing === 'around') return `הדרך נשארת מתחת לגובה האוכף (${sd} מ׳). הנקודה הגבוהה בה: ${m(p.maxH)} מ׳.`;
  const peak = featureOf(a.crossing);
  return `הנקודה הגבוהה בדרך: ${m(p.maxH)} מ׳, ליד ${peak.name}. האוכף שבין הפסגות נמוך ממנה ב־${m(p.maxH - a.saddleH)} מ׳.`;
}

function compareText(a: Assessment, d: Assessment): string {
  const dl = a.profile.lengthM - d.profile.lengthM;
  const dc = a.profile.climbM - d.profile.climbM;
  if (Math.abs(dl) < 1 && Math.abs(dc) < 1) return 'המסלול שלכם הוא הקו הישיר.';
  const len = Math.abs(dl) < 1 ? 'באותו אורך' : dl > 0 ? `ארוך ב־${m(dl)} מ׳` : `קצר ב־${m(-dl)} מ׳`;
  const climb = Math.abs(dc) < 1 ? 'ועם אותו טיפוס' : dc < 0 ? `ועם ${m(-dc)} מ׳ טיפוס פחות` : `ועם ${m(dc)} מ׳ טיפוס יותר`;
  return `לעומת הקו הישיר (${m(d.profile.lengthM)} מ׳, טיפוס ${m(d.profile.climbM)} מ׳): ${len}, ${climb}.`;
}

function FeedbackStrip({ assessment, direct, state }: { assessment: Assessment | null; direct: Assessment | null; state: State }) {
  // Announce the result of an edit once it settles — not every frame of a drag.
  const [spoken, setSpoken] = useState('');
  const text = assessment ? `${CROSSING_TITLE[assessment.crossing]}. ${crossingText(assessment)}${state.showDirect && direct ? ` ${compareText(assessment, direct)}` : ''}` : '';
  useEffect(() => {
    if (state.dragging) return;
    const t = window.setTimeout(() => setSpoken(text), 250);
    return () => window.clearTimeout(t);
  }, [text, state.dragging]);
  if (!assessment) return <div className="h-full rounded-xl border border-border bg-bg-accent/50" />;
  const p = assessment.profile;
  const legs = state.nodes.length - 1;
  return (
    <div className="flex h-full min-w-0 items-center gap-5 rounded-xl border border-border bg-bg-accent px-4 py-2.5" data-feedback={assessment.crossing}>
      <div className="min-w-0 flex-1">
        <div className="font-display text-base font-bold leading-snug text-black" data-feedback-title>
          {CROSSING_TITLE[assessment.crossing]}
        </div>
        <p className="mt-0.5 text-base leading-snug text-black" data-feedback-text>
          {state.showDirect && direct ? compareText(assessment, direct) : crossingText(assessment)}
        </p>
        <p className="mt-0.5 text-base leading-snug text-black tabular-nums" data-measures>
          <span className="font-semibold">אורך במפה:</span> {m(p.lengthM)} מ׳ · {legs} {legs === 1 ? 'קטע' : 'קטעים'} · <span className="font-semibold">טיפוס מצטבר:</span> {m(p.climbM)} מ׳
        </p>
        <span className="sr-only" role="status" aria-live="polite">
          {spoken}
        </span>
      </div>
      <ProfileChart route={assessment} direct={state.showDirect ? direct : null} nodes={state.nodes} />
    </div>
  );
}

/** The ground under the route (and the straight line), A on the left and B on the right — a section, never mirrored. */
function ProfileChart({ route, direct, nodes }: { route: Assessment; direct: Assessment | null; nodes: readonly RouteNode[] }) {
  const W = 300;
  const H = 84;
  const pad = { l: 30, r: 8, t: 8, b: 16 };
  const all = [...route.profile.samples, ...(direct?.profile.samples ?? [])];
  const lo = Math.floor((Math.min(...all.map((s) => s.h)) - 4) / 10) * 10;
  const hi = Math.ceil((Math.max(...all.map((s) => s.h)) + 4) / 10) * 10;
  const len = Math.max(route.profile.lengthM, direct?.profile.lengthM ?? 0);
  const x = (s: number) => pad.l + (s / len) * (W - pad.l - pad.r);
  const y = (h: number) => pad.t + (1 - (h - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const path = (ss: readonly { s: number; h: number }[]) => ss.map((s, i) => `${i ? 'L' : 'M'}${x(s.s).toFixed(1)} ${y(s.h).toFixed(1)}`).join('');
  const area = `${path(route.profile.samples)}L${x(route.profile.lengthM).toFixed(1)} ${H - pad.b}L${pad.l} ${H - pad.b}Z`;
  // checkpoints on the profile, at their distance along the route
  let s0 = 0;
  const marks: { s: number; h: number; n: number }[] = [];
  let n = 0;
  for (let k = 0; k < nodes.length; k++) {
    if (k) s0 += Math.hypot(nodes[k].E - nodes[k - 1].E, nodes[k].N - nodes[k - 1].N);
    if (nodes[k].kind === 'check') marks.push({ s: s0, h: heightAt(nodes[k].E, nodes[k].N), n: ++n });
  }
  const sdY = y(route.saddleH);
  return (
    <figure className="shrink-0" dir="ltr" data-profile>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`חתך הגובה לאורך המסלול: מ־${m(route.profile.samples[0].h)} מ׳ במוצא עד ${m(route.profile.maxH)} מ׳ בנקודה הגבוהה, ו־${m(route.profile.samples.at(-1)!.h)} מ׳ ביעד.`}>
        <rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={H - pad.t - pad.b} fill="#FFFFFF" stroke={MAP.hairline} strokeWidth={1} rx={3} />
        {sdY > pad.t && sdY < H - pad.b && <line x1={pad.l} x2={W - pad.r} y1={sdY} y2={sdY} stroke={MAP.contour} strokeWidth={1} strokeDasharray="3 3" />}
        <path d={area} fill={MAP.accent} fillOpacity={0.14} />
        {direct && <path d={path(direct.profile.samples)} fill="none" stroke={MAP.ink} strokeWidth={1.6} strokeDasharray="5 4" />}
        <path d={path(route.profile.samples)} fill="none" stroke={MAP.accent} strokeWidth={2.4} strokeLinejoin="round" />
        {marks.map((mk) => (
          <circle key={mk.n} cx={x(mk.s)} cy={y(mk.h)} r={3.6} fill="#5B7C5C" stroke="#FFFFFF" strokeWidth={1.2} />
        ))}
        <text x={pad.l - 4} y={pad.t + 4} textAnchor="end" dominantBaseline="hanging" fontSize={12} fontWeight={600} fill={MAP.ink} className="font-display tabular-nums">
          {hi}
        </text>
        <text x={pad.l - 4} y={H - pad.b} textAnchor="end" fontSize={12} fontWeight={600} fill={MAP.ink} className="font-display tabular-nums">
          {lo}
        </text>
        <text x={pad.l} y={H - 2} textAnchor="start" fontSize={12} fontWeight={700} fill={MAP.ink} className="font-display">
          A
        </text>
        <text x={W - pad.r} y={H - 2} textAnchor="end" fontSize={12} fontWeight={700} fill={MAP.ink} className="font-display">
          B
        </text>
        <text x={(pad.l + W - pad.r) / 2} y={H - 2} textAnchor="middle" fontSize={12} fontWeight={600} fill={MAP.muted} className="font-display" direction="rtl">
          חתך גובה (מ׳)
        </text>
      </svg>
    </figure>
  );
}

// ---------------------------------------------------------------- the context panel

const NOTICE_TEXT = (n: NonNullable<Notice>): string => {
  const name = n.feature ? featureOf(n.feature).name : '';
  switch (n.kind) {
    case 'not-on-route':
      return `${name}: המסלול אינו עובר כאן, ולכן אי אפשר לבדוק בו את המיקום. שנו את המסלול או בחרו סימן אחר.`;
    case 'already':
      return `${name}: כבר יש כאן נקודת אימות.`;
    case 'is-end':
      return n.feature === 'building' ? `${name}: זה הסימן שמזהה את המוצא A, ולכן אין צורך בנקודת אימות כאן.` : `${name}: זה הסימן שמזהה את היעד B, ולכן אין צורך בנקודת אימות כאן.`;
    case 'limit':
      return `אפשר עד ${MAX_POINTS} נקודות במסלול. מחקו נקודה כדי להוסיף אחרת.`;
    case 'too-close':
      return 'הנקודה קרובה מדי לנקודה אחרת במסלול.';
    case 'reset':
      return 'המסלול חזר להתחלה. ״ביטול פעולה״ מחזיר את מה שהיה.';
    case 'example':
      return 'זו דוגמה אחת לתכנון, לא הדרך היחידה: לאורך הערוץ אל האוכף, עם שלוש נקודות אימות. ״ביטול פעולה״ מחזיר את המסלול שלכם.';
    case 'undo':
      return 'הפעולה האחרונה בוטלה.';
    case 'check-added':
      return `${name}: נקבעה נקודת אימות במקום שבו המסלול עובר. הדרך לא השתנתה.`;
    case 'check-removed':
      return 'נקודת האימות הוסרה. הדרך לא השתנתה.';
    case 'removed':
      return 'הנקודה נמחקה.';
  }
};

function nodeName(n: RouteNode, nodes: readonly RouteNode[]): string {
  if (n.kind === 'start') return 'המוצא A';
  if (n.kind === 'end') return 'היעד B';
  if (n.kind === 'check') return `נקודת אימות ${checkpointsInOrder(nodes).find((c) => c.node.id === n.id)!.n} (${featureOf(n.feature!).name})`;
  return `נקודה ${nodes.indexOf(n)}`;
}

/** An arrow pointing the leg's way on a north-up card (never mirrored). */
function Arrow({ deg }: { deg: number }) {
  return (
    <svg viewBox="-12 -12 24 24" className="size-6 shrink-0" aria-hidden data-arrow={Math.round(deg)}>
      <circle r={11} fill="#FFFFFF" stroke={MAP.hairline} strokeWidth={1.2} />
      <g transform={`rotate(${deg.toFixed(1)})`}>
        <path d="M0 -8 L5 3 L0 0.5 L-5 3 Z" fill={MAP.accent} />
        <path d="M0 0.5 L0 7" stroke={MAP.accent} strokeWidth={2} strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** The arrow and the compass word (the map's north is up). */
function Direction({ deg }: { deg: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap align-middle">
      <Arrow deg={deg} />
      <span>{COMPASS_HE[compassPoint(deg)]}</span>
    </span>
  );
}

function LegLine({ leg, n, onSelect }: { leg: Leg; n: number; onSelect?: () => void }) {
  const dh = leg.toH - leg.fromH;
  const inner = (
    <>
      <span className="w-14 shrink-0 font-display font-bold">קטע {n}</span>
      <Arrow deg={leg.bearingDeg} />
      <span className="w-16 shrink-0 tabular-nums">{m(leg.distanceM)} מ׳</span>
      <span className="tabular-nums text-fg-muted">{Math.abs(dh) < 2 ? 'כמעט מישורי' : dh > 0 ? `עלייה ${m(dh)} מ׳` : `ירידה ${m(-dh)} מ׳`}</span>
    </>
  );
  return onSelect ? (
    <button type="button" onClick={onSelect} className="flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-1.5 py-0.5 text-start text-base leading-snug text-black hover:bg-bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" data-leg-row={n}>
      {inner}
    </button>
  ) : (
    <div className="flex items-center gap-2 whitespace-nowrap text-base leading-snug text-black">{inner}</div>
  );
}

function ContextPanel({ state, dispatch, view }: { state: State; dispatch: (a: Action) => void; view: ReturnType<typeof createViewStore> }) {
  const sel = state.selection;
  const nodes = state.nodes;
  const legs = useMemo(() => legsOf(nodes), [nodes]);
  const focus = (p: { E: number; N: number }) => view.orbit('focus', p);
  let body: ReactNode;

  if (sel?.kind === 'node') {
    const i = nodes.findIndex((n) => n.id === sel.id);
    const n = nodes[i];
    if (!n) body = null;
    else if (n.kind === 'start' || n.kind === 'end') {
      const f = featureOf(n.kind === 'start' ? 'building' : 'rocks');
      body = (
        <>
          <h4 className={PANEL_TITLE}>{n.kind === 'start' ? 'המוצא A' : 'היעד B'}</h4>
          <p className={cn(BODY, 'mt-1')}>{n.kind === 'start' ? 'יוצאים ממקום מזוהה: המבנה הבולט, לצד דרך הגישה.' : 'מגיעים ליעד עצמו, ולא רק לאזור קרוב אליו: הסלעים בתוך חורשת האורנים.'}</p>
          <p className={cn(BODY, 'mt-1.5')}>
            <span className="font-semibold">בשטח: </span>
            {f.onGround}
          </p>
          <p className={BODY}>
            <span className="font-semibold">במפה: </span>
            {f.onMap}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" className={pillBtn} onClick={() => focus(n)} data-action="focus">
              <Crosshair className="size-4" aria-hidden />
              התמקדו בסימן
            </button>
          </div>
        </>
      );
    } else {
      const inLeg = legs[i - 1];
      const outLeg = legs[i];
      const onIt = n.kind === 'check' && n.feature ? standsOn(n.feature, n) : true;
      const at = n.kind === 'way' ? features().find((f) => f.checkpoint && standsOn(f.id, n) && !nodes.some((x) => x.kind === 'check' && x.feature === f.id)) : undefined;
      body = (
        <>
          <h4 className={PANEL_TITLE}>{nodeName(n, nodes)}</h4>
          <p className={cn(BODY, 'mt-1 tabular-nums')}>גובה הקרקע: {m(heightAt(n.E, n.N))} מ׳</p>
          {n.kind === 'check' && n.feature && (
            <p className={cn(BODY, 'mt-1')}>
              {onIt ? (
                <>
                  <span className="font-semibold">מה מחפשים בשטח: </span>
                  {featureOf(n.feature).onGround}
                </>
              ) : (
                <>הנקודה זזה מ{featureOf(n.feature).name} ואינה עומדת עליו עוד. החזירו אותה, או הסירו את נקודת האימות.</>
              )}
            </p>
          )}
          <div className="mt-2 space-y-0.5">
            {inLeg && <LegLine leg={inLeg} n={i} onSelect={() => dispatch({ type: 'select', selection: { kind: 'leg', from: nodes[i - 1].id } })} />}
            {outLeg && <LegLine leg={outLeg} n={i + 1} onSelect={() => dispatch({ type: 'select', selection: { kind: 'leg', from: n.id } })} />}
          </div>
          <p className={cn(BODY, 'mt-2 text-fg-muted')}>גררו את הנקודה, או הזיזו אותה בחיצי המקלדת במפה (Shift: 50 מ׳).</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {n.kind === 'check' ? (
              <>
                <button type="button" className={pillBtn} onClick={() => focus(n)} data-action="focus">
                  <Crosshair className="size-4" aria-hidden />
                  התמקדו בסימן
                </button>
                <button type="button" className={pillBtn} onClick={() => dispatch({ type: 'unCheck', id: n.id })} data-action="uncheck">
                  הסרת נקודת האימות
                </button>
              </>
            ) : (
              at && (
                <button type="button" className={pillBtn} onClick={() => dispatch({ type: 'addCheck', feature: at.id })} data-action="make-check">
                  <MapPin className="size-4" aria-hidden />
                  נקודת אימות: {at.name}
                </button>
              )
            )}
            {editable(n) && (
              <button type="button" className={pillBtn} onClick={() => dispatch({ type: 'remove', id: n.id })} aria-keyshortcuts="Delete" data-action="remove">
                <Trash2 className="size-4" aria-hidden />
                מחיקה
              </button>
            )}
          </div>
        </>
      );
    }
  } else if (sel?.kind === 'leg') {
    const i = nodes.findIndex((n) => n.id === sel.from);
    const leg = legs[i];
    body = leg ? (
      <>
        <h4 className={PANEL_TITLE}>קטע {i + 1}</h4>
        <p className={cn(BODY, 'mt-1')}>
          מ{nodeName(nodes[i], nodes)} אל {nodeName(nodes[i + 1], nodes)}
        </p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-base leading-snug text-black">
          <dt className="font-semibold">כיוון</dt>
          <dd>
            <Direction deg={leg.bearingDeg} />
          </dd>
          <dt className="font-semibold">מרחק במפה</dt>
          <dd className="tabular-nums">{m(leg.distanceM)} מ׳ (קו אופקי)</dd>
          <dt className="font-semibold">שינוי גובה</dt>
          <dd className="tabular-nums">{Math.abs(leg.toH - leg.fromH) < 2 ? 'כמעט ללא שינוי' : leg.toH > leg.fromH ? `עלייה של ${m(leg.toH - leg.fromH)} מ׳` : `ירידה של ${m(leg.fromH - leg.toH)} מ׳`}</dd>
        </dl>
        <p className={cn(BODY, 'mt-2 text-fg-muted')}>הכיוון והמרחק נגזרים משתי נקודות הקטע. כשמזיזים נקודה, הם משתנים.</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button type="button" className={pillBtn} onClick={() => dispatch({ type: 'insertInLeg', from: sel.from })} data-action="insert">
            <Plus className="size-4" aria-hidden />
            נקודה באמצע הקטע
          </button>
        </div>
      </>
    ) : null;
  } else if (sel?.kind === 'feature') {
    const f = featureOf(sel.id);
    const pass = passOf(f.id, routePoints(nodes));
    const has = nodes.some((x) => x.kind === 'check' && x.feature === f.id);
    body = (
      <>
        <h4 className={PANEL_TITLE}>{f.name}</h4>
        <p className={cn(BODY, 'mt-0.5')}>{f.kind}</p>
        <p className={cn(BODY, 'mt-1.5')}>
          <span className="font-semibold">במפה: </span>
          {f.onMap}
        </p>
        <p className={BODY}>
          <span className="font-semibold">בשטח: </span>
          {f.onGround}
        </p>
        <p className={cn(BODY, 'mt-1.5 font-semibold')} data-passes={pass ? 'yes' : 'no'}>
          {f.id === 'building'
            ? 'כאן נמצא המוצא A: הוא כבר מזוהה, ואין צורך בנקודת אימות.'
            : f.id === 'rocks'
              ? 'כאן נמצא היעד B: הוא כבר מזוהה, ואין צורך בנקודת אימות.'
              : pass
                ? `המסלול עובר כאן, כ־${m(pass.s)} מ׳ מהמוצא.`
                : state.tool === 'checks'
                  ? 'המסלול אינו עובר כאן, ולכן אי אפשר לבדוק בו את המיקום. שנו את המסלול או בחרו סימן אחר.'
                  : 'המסלול שלכם אינו עובר כאן.'}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button type="button" className={pillBtn} onClick={() => focus(f.anchor)} data-action="focus">
            <Crosshair className="size-4" aria-hidden />
            התמקדו בסימן
          </button>
          {f.checkpoint && pass && !has && (
            <button type="button" className={pillBtn} onClick={() => dispatch({ type: 'addCheck', feature: f.id })} data-action="add-check">
              <MapPin className="size-4" aria-hidden />
              נקודת אימות כאן
            </button>
          )}
        </div>
      </>
    );
  } else if (state.tool === 'route') {
    body = (
      <>
        <h4 className={PANEL_TITLE}>עריכת מסלול</h4>
        <p className={cn(BODY, 'mt-1')} data-instruction>
          הוסיפו נקודת מעבר במפה או גררו נקודה קיימת, ובחנו את הדרך בשטח.
        </p>
        <p className={cn(BODY, 'mt-1 text-fg-muted')}>לחיצה על קו המסלול בוחרת קטע; גרירה ממנו מוסיפה נקודה.</p>
        <div className="mt-2.5 border-t border-border pt-2">
          <div className="font-display text-base font-bold text-black">קטעי הדרך</div>
          <div className="mt-1 space-y-0.5" data-legs>
            {legs.slice(0, 6).map((l, k) => (
              <LegLine key={nodes[k].id} leg={l} n={k + 1} onSelect={() => dispatch({ type: 'select', selection: { kind: 'leg', from: nodes[k].id } })} />
            ))}
            {legs.length > 6 && <p className={cn(BODY, 'px-1.5 text-fg-muted')}>ועוד {legs.length - 6} קטעים: בחרו אותם על המסלול.</p>}
          </div>
        </div>
      </>
    );
  } else {
    const checks = checkpointsInOrder(nodes);
    body =
      state.tool === 'checks' ? (
        <>
          <h4 className={PANEL_TITLE}>נקודות אימות</h4>
          <p className={cn(BODY, 'mt-1')}>בחרו סימן שהמסלול עובר בו: במפה, במודל או ברשימה. הנקודה נקבעת במקום שבו המסלול עובר בסימן, בלי לשנות את הדרך.</p>
          <ol className="mt-2 space-y-0.5 text-base leading-snug text-black" data-check-list>
            <li>
              <span className="font-display font-bold">A</span> · המבנה הבולט
            </li>
            {checks.slice(0, 5).map((c) => (
              <li key={c.node.id}>
                <button type="button" onClick={() => dispatch({ type: 'select', selection: { kind: 'node', id: c.node.id } })} className="rounded text-start hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <span className="font-display font-bold tabular-nums">{c.n}</span> · {featureOf(c.node.feature!).name}
                </button>
              </li>
            ))}
            {checks.length > 5 && <li className="text-fg-muted">ועוד {checks.length - 5} נקודות אימות</li>}
            <li>
              <span className="font-display font-bold">B</span> · הסלעים בחורשה
            </li>
          </ol>
        </>
      ) : (
        <>
          <h4 className={PANEL_TITLE}>זיהוי בשטח</h4>
          <p className={cn(BODY, 'mt-1')}>בחרו סימן במפה, במודל או ברשימה, והשוו איך הוא נראה בכל תצוגה.</p>
        </>
      );
  }

  const featureList = state.tool !== 'route' && (
    <div className="mt-auto border-t border-border pt-2.5" data-feature-list>
      <div id="pl-features" className="font-display text-base font-bold text-black">
        סימנים בשטח
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-labelledby="pl-features">
        {FEATURE_ORDER.map((id) => {
          const f = featureOf(id);
          const on = sel?.kind === 'feature' && sel.id === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => dispatch(state.tool === 'checks' && f.checkpoint ? { type: 'addCheck', feature: id } : { type: 'select', selection: { kind: 'feature', id } })}
              aria-label={f.name}
              className={cn(
                'h-8 cursor-pointer rounded-lg border px-2 font-display text-base font-semibold leading-none text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                on ? 'border-accent bg-accent/15' : 'border-border bg-white hover:border-accent/60',
              )}
              data-feature={id}
            >
              {f.short}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-white p-4" aria-label="פרטי הכלי והבחירה" data-panel="context">
      <div className="min-h-0" data-context={sel ? sel.kind : state.tool}>
        {body}
      </div>
      <div role="status" aria-live="polite" className="empty:hidden" data-notice={state.notice?.kind}>
        {state.notice && !(sel?.kind === 'feature' && (state.notice.kind === 'not-on-route' || state.notice.kind === 'is-end') && state.notice.feature === sel.id) && (
          <p className={cn('mt-2.5 rounded-lg border px-3 py-2 text-base leading-snug text-black', state.notice.kind === 'not-on-route' || state.notice.kind === 'limit' || state.notice.kind === 'too-close' ? 'border-accent/50 bg-accent/10' : 'border-border bg-bg-accent')}>
            {NOTICE_TEXT(state.notice)}
          </p>
        )}
      </div>
      {featureList}
    </aside>
  );
}

