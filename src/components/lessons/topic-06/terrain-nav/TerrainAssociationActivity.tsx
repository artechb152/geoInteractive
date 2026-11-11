'use client';

import { useEffect, useId, useMemo, useReducer, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, ChevronDown, CircleHelp, Info, Lightbulb, ListTree, Maximize2, Minimize2, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import { cn } from '@/lib/utils';
import { CHECKPOINT_LABEL, START, type CheckpointId, type Point } from './terrainNavScenario';
import { formatBearing, formatMetres } from './terrainNavGeometry';
import { checkpoint, prepareTerrain, routePoints } from './terrainNavTerrain';
import {
  LEGS,
  candidateLetters,
  candidatePoint,
  featureDirection,
  legStart,
  measuredTo,
  plannedLeg,
  type CandidateId,
  type Evidence,
  type FeatureId,
  type Leg,
} from './terrainNavPractice';
import { EVIDENCE_COUNT, INITIAL_STATE, reducer, view as viewOf, type Evaluation, type State } from './terrainNavState';
import { createViewStore, type ViewStore } from './terrainNavViewStore';
import { LEARN_FEATURES, featureInfo, pickFeature } from './terrainNavFeatures';
import { MAP_ASPECT, MapSymbolLegend, RouteGlyph, TerrainNavMap, type MapLayer, type RouteGlyphKind } from './TerrainNavMap';
import { FALLBACK, TerrainNavModel } from './TerrainNavModel';
import { RadioRow } from './RadioRow';
import type { ModelLabel, ModelProps } from './TerrainNav3D';

/**
 * "ניווט לפי השטח" — the terrain-association lab of lesson 6 (alternative 1 of
 * design/mockups/combatnav-concepts-2026-10-12). One workspace: the live 3D
 * terrain model (inline start) and the topographic map drawn from the same data,
 * side by side at one height with the route legend under them.
 *
 *   לימוד   the views take the whole width: a feature bar over them, one shared
 *           info strip (the chosen feature, the route plan) under them. The whole
 *           route — A, כיפה 1–3, the square (B) — with names. A click in either
 *           view (or the bar) selects the same feature in both.
 *   תרגול   leg by leg from the navigator's eye: no marker, name or label gives
 *           the place away. The learner marks the point on the map (or with the
 *           buttons), picks two pieces of evidence, compares direction and
 *           distance with the plan, and checks. Hints are graded; only
 *           "הצגת הסבר" shows the answer. A verified leg walks the navigator on.
 *           The task sits in a column beside the map (inline end).
 *
 * The mode switch is the one way between the two (learning keeps its selection, practice its legs).
 *
 * Copy for the technique itself (principle, caption, legend) lives in
 * CombatNavScene and is not repeated in here.
 */

/** A value kept left-to-right inside Hebrew text (U+2066 … U+2069 isolate). */
const ltr = (s: string) => `⁦${s}⁩`;
const Deg = ({ v }: { v: number }) => (
  <bdi dir="ltr" className="tabular-nums">
    {formatBearing(v)}
  </bdi>
);

const LEG_NAME = (to: CheckpointId) => CHECKPOINT_LABEL[to];
const FROM_NAME = (leg: Leg) => (leg.from === 'A' ? 'נקודת המוצא A' : CHECKPOINT_LABEL[leg.from]);
/** The previous sign of the route, as a short name for feedback sentences. */
const LEG_FROM_SHORT = (leg: Leg) => (leg.from === 'A' ? 'A' : CHECKPOINT_LABEL[leg.from]);
/** "In" a checkpoint, for sentences (the label of B starts with the article, so it cannot just take ב־). */
const AT_NAME: Record<CheckpointId, string> = { H1: 'בכיפה 1', H2: 'בכיפה 2', H3: 'בכיפה 3', B: 'בכיכר המרכזית' };

/** What a statement is about, as a noun for feedback sentences, with its grammatical gender. */
type Noun = { readonly text: string; readonly f: boolean };
const NOUN: Partial<Record<FeatureId, Noun>> = {
  'track-east': { text: 'דרך העפר', f: true },
  'road-west': { text: 'דרך העפר', f: true },
  'road-north': { text: 'הדרך הצפונית', f: true },
  G1: { text: 'החורשה שליד כיפה 1', f: true },
  G2: { text: 'החורשה שליד כיפה 3', f: true },
  G3: { text: 'החורשה הצפונית', f: true },
  stream: { text: 'ערוץ הנחל', f: false },
  'gully-north': { text: 'הערוץ הצר', f: false },
  village: { text: 'הכפר', f: false },
  tower: { text: 'מגדל המים', f: false },
  square: { text: 'הכיכר', f: true },
};
const nounOf = (id: FeatureId): Noun => NOUN[id] ?? { text: 'הסימן', f: false };

/** The technique's approved board copy, owned by CombatNavScene (SUPPORT.handrail). */
export type TerrainNavCopy = {
  readonly badge?: string;
  readonly caption: string;
  readonly legend: readonly { readonly kind: RouteGlyphKind | (string & {}); readonly label: string }[];
};

/**
 * Laptop fit (the screen is at most 760 px tall at the 1344 px reference). The views are VIEW_H
 * tall in both modes, so the map is the same sheet in each (learning's tallest state — details
 * and the plan open — fills the 760 px). Practice adds the task column, TASK_COLUMN_W wide; its
 * feedback box keeps one height (FEEDBACK_H, its tallest verdict + hint), so no state moves the views.
 */
const VIEW_H = 448;
const TASK_COLUMN_W = 440;
/** The map panel's width for the sheet at a view height (1 px border on each side). */
const mapPanelW = (h: number) => Math.round((h - 2) * MAP_ASPECT + 2);
/** The feedback box: its tallest content (a wrong point with both hints) at the column's width. */
const FEEDBACK_H = 222;
/** Step ג: the measured line and the two answers, kept before a point is marked too. */
const COMPARE_H = 68;

/** `title` / `intro` / `footer` — the technique's own text: its title (set beside the mode
 *  switch), its principle under it, and anything at the foot of the card (one envelope per activity). */
export function TerrainAssociationActivity({
  copy,
  onContinue,
  title,
  intro,
  footer,
}: {
  copy: TerrainNavCopy;
  onContinue?: () => void;
  title?: ReactNode;
  intro?: ReactNode;
  footer?: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [view] = useState(createViewStore);
  const [terrainReady, setTerrainReady] = useState(false);
  const reduce = !!useReducedMotion();
  const uid = useId();
  const v = viewOf(state);
  const leg = v.leg;

  useEffect(() => {
    let alive = true;
    prepareTerrain().then(() => alive && setTerrainReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // Dev-only handle for scripts/qa/shot-terrain-nav.mjs (read the state, drive the view).
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __tn?: unknown };
    w.__tn = { state, view };
    return () => {
      delete w.__tn;
    };
  }, [state, view]);

  // ---- camera follows the mode and the leg
  const legKey = `${state.mode}:${state.leg}`;
  const prevLeg = useRef<{ mode: string; leg: number }>({ mode: 'learn', leg: 0 });
  useEffect(() => {
    const prev = prevLeg.current;
    prevLeg.current = { mode: state.mode, leg: state.leg };
    if (state.mode === 'learn') {
      view.resumeOrbit();
      return;
    }
    const k = Math.min(state.leg, LEGS.length - 1);
    const target = LEGS[k];
    const at = checkpoint(target.to);
    const yaw = plannedLeg(target).bearingDeg;
    if (state.leg >= LEGS.length) return; // finished: stay where the route ended
    if (prev.mode === 'practice' && prev.leg === state.leg - 1 && state.leg > 0) {
      // a verified leg: walk on at eye level from the last checkpoint to the next
      view.walkTo([legStart(target), at], yaw, reduce ? 0 : 1600);
    } else {
      view.standAt(at, yaw);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legKey]);

  const setMode = (mode: 'learn' | 'practice') => dispatch({ type: 'setMode', mode });

  // ---- what both views show
  const confirmed = useMemo(() => {
    const out: CheckpointId[] = [];
    for (let k = 0; k < LEGS.length; k++) if (state.outcomes[k]) out.push(LEGS[k].to);
    return out;
  }, [state.outcomes]);

  const highlights: FeatureId[] = useMemo(() => {
    if (state.mode === 'learn') return state.learnFeature ? [state.learnFeature] : [];
    if (!leg) return [];
    if (v.closed) {
      const ev = leg.correctEvidence.map((id) => leg.evidence.find((e) => e.id === id)!.feature);
      return [leg.to === 'B' ? 'square' : leg.to, ...ev].filter((x, i, a) => a.indexOf(x) === i).slice(0, 3) as FeatureId[];
    }
    return state.hint >= 2 ? [leg.hint2.feature] : [];
  }, [state.mode, state.learnFeature, state.hint, leg, v.closed]);

  const letters = leg ? candidateLetters(leg) : null;
  const measure =
    state.mode === 'practice' && leg && state.sel.candidate
      ? (() => {
          const m = measuredTo(leg, state.sel.candidate);
          return { from: legStart(leg), to: candidatePoint(state.sel.candidate), text: `${ltr(formatBearing(m.bearingDeg))} · ${formatMetres(m.distanceM)}` };
        })()
      : null;

  const mapLayer: MapLayer = {
    mode: state.mode,
    fullRoute: state.mode === 'learn',
    confirmed: v.closed && leg && !confirmed.includes(leg.to) ? [...confirmed, leg.to] : confirmed,
    candidates: state.mode === 'practice' && leg && !v.closed ? leg.candidates.map((id) => ({ id, letter: letters![id] })) : [],
    selectedCandidate: state.sel.candidate,
    measure: v.closed ? null : measure,
    highlights,
  };

  const info = terrainReady ? featureInfo() : null;
  const modelProps: Omit<ModelProps, 'view' | 'reduce' | 'onReady'> = useMemo(() => {
    if (!terrainReady) return { highlights: [], route: null, labels: [], pins: [] };
    const fi = featureInfo();
    const pts = routePoints();
    if (state.mode === 'learn') {
      const labels: ModelLabel[] = [
        { id: 'A', text: 'A', at: START, liftM: 34, tone: 'start' },
        ...(['H1', 'H2', 'H3'] as const).map((id) => ({ id, text: fi.get(id)!.name, at: fi.get(id)!.anchor, liftM: 34, tone: 'route' as const })),
        { id: 'B', text: 'B · הכיכר', at: checkpoint('B'), liftM: 34, tone: 'route' },
      ];
      if (state.learnFeature && !['A', 'H1', 'H2', 'H3', 'square'].includes(state.learnFeature)) {
        const f = fi.get(state.learnFeature)!;
        labels.push({ id: f.id, text: f.name, at: f.anchor, liftM: 26, tone: 'feature' });
      }
      return {
        highlights,
        route: { pts, dashed: true },
        labels,
        pins: [{ id: 'A', at: START, tone: 'start' as const }, ...(['H1', 'H2', 'H3', 'B'] as const).map((id) => ({ id, at: checkpoint(id), tone: 'checkpoint' as const }))],
      };
    }
    // practice: A and the verified checkpoints only — never the place being checked
    const shown = confirmed.filter((id) => id !== leg?.to);
    // The ground you stand on is lit on the map only: seen from inside, its outline would ring the view.
    const underfoot: FeatureId | null = leg ? (leg.to === 'B' ? 'square' : leg.to) : null;
    return {
      highlights: highlights.filter((h) => h !== underfoot),
      // The walked route is drawn on the map; from the eye it would only cross the view (its last vertex is underfoot).
      route: null,
      labels: [{ id: 'A', text: 'A', at: START, liftM: 34, tone: 'start' as const }, ...shown.map((id) => ({ id, text: id === 'B' ? 'B · הכיכר' : fi.get(id as FeatureId)!.name, at: checkpoint(id), liftM: 34, tone: 'route' as const }))],
      pins: [{ id: 'A', at: START, tone: 'start' as const }, ...shown.map((id) => ({ id, at: checkpoint(id), tone: 'checkpoint' as const }))],
    };
  }, [terrainReady, state.mode, state.learnFeature, highlights, confirmed, leg]);

  const onPickGround = useMemo(() => {
    if (state.mode !== 'learn') return undefined;
    return (p: Point) => dispatch({ type: 'selectFeature', id: pickFeature(p, 12) });
  }, [state.mode]);

  const fallbackSrc = state.mode === 'learn' ? FALLBACK.overview : FALLBACK.leg(Math.min(state.leg, LEGS.length - 1));
  const titleId = `${uid}-title`;
  const learn = state.mode === 'learn';
  const selectFeature = (id: FeatureId | null) => dispatch({ type: 'selectFeature', id });

  return (
    <div className="surface-elevated p-6" data-activity="terrain-association" data-mode={state.mode} aria-labelledby={titleId}>
      {/* One screen: the technique, the task line, the two views and their legend. Learning spans the
          whole width; practice puts its task (steps, check, feedback) in a column at the end, beside the map. */}
      <div className="grid gap-x-8" style={{ gridTemplateColumns: learn ? 'minmax(0, 1fr)' : `minmax(0, 1fr) ${TASK_COLUMN_W}px` }}>
        <div className="flex min-w-0 flex-col">
          {/* The technique's title, with the mode (and the practice's reset beside it) */}
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 pt-0.5">{title}</div>
            <div className="flex shrink-0 items-center gap-3">
              {/* The practice's reset, beside the mode it belongs to (the summary has its own). */}
              {state.mode === 'practice' && !v.finished && (
                <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'restart' })}>
                  <RotateCcw className="size-4" aria-hidden />
                  התחלה מחדש
                </Button>
              )}
              <ModeSwitch mode={state.mode} onChange={setMode} />
            </div>
          </div>
          {intro && <div className="mt-1">{intro}</div>}

          {/* Task line: the activity's title and what to do, on one line. Learning puts its feature bar
              here (what to do is in the info strip under the views) and the map tools over the map. */}
          {learn ? (
            <div className="mt-2 flex items-center gap-3" data-feature-bar>
              <h4 id={titleId} className="shrink-0 font-display text-lg font-bold leading-snug text-black md:text-xl">
                חקרו את השטח
              </h4>
              {copy.badge && <StatusChip tone="badge">{copy.badge}</StatusChip>}
              <FeatureBar selected={state.learnFeature} info={info} onSelect={selectFeature} />
              <div className="ms-auto flex shrink-0 items-center gap-2">
                <MapKeyButton below />
                <MapFullscreenButton fullscreen={false} />
              </div>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h4 id={titleId} className="font-display text-lg font-bold leading-snug text-black md:text-xl">
                {v.finished ? 'סיכום הציר' : 'איפה אתם עכשיו?'}
              </h4>
              {copy.badge && <StatusChip tone="badge">{copy.badge}</StatusChip>}
              {/* How to turn and zoom the model is written on the model itself. */}
              <p className="text-base leading-snug text-black">
                {v.finished
                  ? 'כל ארבעת קטעי הדרך נבדקו. אפשר להתחיל מחדש או לעבור לניווט עיוור.'
                  : 'זהו את מיקומכם לפי התצפית. בחרו נקודה במפה, השלימו את שלבים ב–ג ולחצו ״בדיקת המיקום״.'}
              </p>
            </div>
          )}

          {/* The two views, one height: model at the inline start (right), map at the end (left) */}
          <div className="mt-2.5 flex gap-4">
            <TerrainNavModel
              view={view}
              mode={state.mode}
              reduce={reduce}
              fallbackSrc={fallbackSrc}
              modelProps={{ ...modelProps, onPick: onPickGround }}
              ariaLabel={
                learn
                  ? 'מודל תלת־ממדי של שטח האימון: שלוש כיפות לאורך הציר, נחל, חורשות, דרכי עפר וכפר עם כיכר. אפשר לסובב ולהתקרב; הסימנים נבחרים גם במפה ובפס הסימנים.'
                  : 'התצפית מעמדת המנווט. אפשר להסתכל סביב ולהגדיל, בלי לזוז ממקומכם.'
              }
              className="min-w-0 flex-1"
              style={{ height: VIEW_H }}
            />
            <MapPanel ready={terrainReady} height={VIEW_H} layer={mapLayer} copy={copy} onPickFeature={selectFeature} onPickCandidate={(id) => dispatch({ type: 'selectCandidate', id })} />
          </div>

          {/* Under the views: learning's info strip, then the route legend (drawn with the map's own marks),
              the caption and — in practice — the map tools */}
          {learn && <LearnInfo state={state} info={info} view={view} />}
          <RouteLegend copy={copy} row={learn} />
        </div>

        {/* Practice: the one task, beside the views */}
        {!learn && (
          <div className="min-w-0">
            {v.finished ? (
              <Summary state={state} onRestart={() => dispatch({ type: 'restart' })} onContinue={onContinue} />
            ) : (
              leg && letters && <PracticeStrip state={state} leg={leg} letters={letters} dispatch={dispatch} />
            )}
          </div>
        )}
      </div>

      {footer}
    </div>
  );
}

// ---------------------------------------------------------------- pieces

function ModeSwitch({ mode, onChange }: { mode: 'learn' | 'practice'; onChange: (m: 'learn' | 'practice') => void }) {
  const opts = [
    { id: 'learn' as const, label: 'לימוד' },
    { id: 'practice' as const, label: 'תרגול' },
  ];
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    let n = -1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') n = (i + 1) % 2;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') n = (i + 1) % 2;
    if (n < 0) return;
    e.preventDefault();
    onChange(opts[n].id);
    refs.current[n]?.focus();
  };
  return (
    <div role="radiogroup" aria-label="מצב הפעילות" className="flex shrink-0 rounded-xl border border-border bg-bg-accent p-1" data-mode-switch>
      {opts.map((o, i) => {
        const on = o.id === mode;
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'h-9 min-w-[5.5rem] cursor-pointer rounded-lg px-4 font-display text-base leading-none transition-colors duration-200 ease-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              on ? 'bg-brand-dark font-bold text-white shadow-sm' : 'font-semibold text-black hover:bg-bg-elevated',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function MapPanel({ ready, height, layer, copy, onPickFeature, onPickCandidate }: { ready: boolean; height: number; layer: MapLayer; copy: TerrainNavCopy; onPickFeature: (id: FeatureId | null) => void; onPickCandidate: (id: CandidateId) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  return (
    // The sheet at the size of its own aspect, beside the model. Full screen takes the route legend
    // and the map tools along, in a column at the sheet's outer side (under the views they stay behind).
    <div
      ref={ref}
      className={cn('relative flex shrink-0 rounded-xl border border-border/70 bg-white', fullscreen && 'h-full rounded-none p-4')}
      style={fullscreen ? undefined : { width: mapPanelW(height), height }}
      data-panel="map"
    >
      <div className={cn('flex min-w-0 flex-1 items-center justify-center overflow-hidden', fullscreen ? 'rounded-s-xl' : 'rounded-xl')}>
        {ready ? (
          <TerrainNavMap layer={layer} onPickFeature={onPickFeature} onPickCandidate={onPickCandidate} className="block h-full max-h-full w-full" />
        ) : (
          <span className="font-display text-base font-semibold text-black" data-loading>
            טוען את המפה…
          </span>
        )}
      </div>
      {fullscreen && <RouteLegend copy={copy} fullscreen />}
    </div>
  );
}

/** Opens the map panel full screen, or leaves it — from the legend, so it never covers the sheet. */
function MapFullscreenButton({ fullscreen }: { fullscreen: boolean }) {
  return (
    <button
      type="button"
      onClick={() => (fullscreen ? document.exitFullscreen() : (document.querySelector('[data-activity="terrain-association"] [data-panel="map"]') as HTMLElement | null)?.requestFullscreen?.())}
      className={cn(
        'inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-paper-bright/70 px-3 font-display text-base font-semibold text-black hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        fullscreen && 'h-10 w-full',
      )}
    >
      {fullscreen ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
      {fullscreen ? 'יציאה ממסך מלא' : 'מפה במסך מלא'}
    </button>
  );
}

/** The map key on demand (map symbols, not lesson text). `below`: opened from over the views. */
function MapKeyButton({ fullscreen, below }: { fullscreen?: boolean; below?: boolean }) {
  return (
    <Popover
      label="מקרא המפה"
      below={below}
      trigger={
        <span className={cn('inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-paper-bright/70 px-3 font-display text-base font-semibold text-black', fullscreen && 'h-10 w-full')}>
          <ListTree className="size-4" aria-hidden />
          מקרא המפה
        </span>
      }
      wide
    >
      <MapSymbolLegend />
    </Popover>
  );
}

/**
 * The approved route legend of the technique (CombatNavScene SUPPORT.handrail), drawn with this
 * map's own marks, with the lab's caption and the map tools. Under the views: the marks over the
 * caption and the tools; `row` (learning, whose map tools sit over the map): marks and caption on
 * one line. In full screen: a column at the sheet's outer side.
 */
function RouteLegend({ copy, fullscreen, row }: { copy: TerrainNavCopy; fullscreen?: boolean; row?: boolean }) {
  const items = copy.legend.map((it) => (
    <li key={it.label} className="flex items-start gap-2 text-base leading-snug text-black">
      <span className="mt-0.5 shrink-0">
        <RouteGlyph kind={it.kind} />
      </span>
      <span>{it.label}</span>
    </li>
  ));
  if (fullscreen)
    return (
      <div className="flex w-[200px] shrink-0 flex-col justify-between gap-3 border-s border-border-subtle bg-paper-bright/40 p-3" data-legend="route">
        <ul className="space-y-2.5">{items}</ul>
        <div className="flex flex-col gap-2">
          <MapKeyButton fullscreen />
          <MapFullscreenButton fullscreen />
        </div>
      </div>
    );
  if (row)
    return (
      <div className="mt-2.5 flex items-start justify-between gap-6" data-legend="band">
        <ul className="flex flex-wrap gap-x-5 gap-y-1" data-legend="route">
          {items}
        </ul>
        <p className="min-w-0 text-base leading-snug text-black" data-legend="caption">
          {copy.caption}
        </p>
      </div>
    );
  return (
    <div className="mt-2.5" data-legend="band">
      <ul className="flex flex-wrap gap-x-5 gap-y-1" data-legend="route">
        {items}
      </ul>
      <div className="mt-1.5 flex items-center justify-between gap-4">
        <p className="min-w-0 text-base leading-snug text-black" data-legend="caption">
          {copy.caption}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <MapKeyButton />
          <MapFullscreenButton fullscreen={false} />
        </div>
      </div>
    </div>
  );
}

/**
 * A small disclosure: a trigger and a note next to it; Esc or a click outside closes it. `below`
 * opens it under the trigger (from over the views); `children` may take a `close` that returns focus.
 */
function Popover({
  label,
  trigger,
  children,
  wide,
  below,
  data,
}: {
  label: string;
  trigger: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  wide?: boolean;
  below?: boolean;
  data?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = () => {
    setOpen(false);
    btn.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      if (ref.current?.contains(document.activeElement)) btn.current?.focus();
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <span ref={ref} className="relative flex shrink-0">
      <button ref={btn} type="button" aria-expanded={open} aria-controls={id} aria-label={label} onClick={() => setOpen((o) => !o)} className="w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" data-popover={data}>
        {trigger}
      </button>
      {open && (
        <span
          id={id}
          role="note"
          className={cn('absolute end-0 z-30 rounded-xl border border-border bg-bg-elevated p-4 text-start shadow-elevated', below ? 'top-full mt-2' : 'bottom-full mb-2', wide ? 'w-[34rem]' : 'w-80')}
        >
          {typeof children === 'function' ? children(close) : children}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------- learn

/** The route's own features — always in the bar; the rest open from "כל הסימנים". */
const ROUTE_FEATURES: readonly FeatureId[] = ['A', 'H1', 'H2', 'H3', 'square'];
const MORE_FEATURES = LEARN_FEATURES.filter((id) => !ROUTE_FEATURES.includes(id));

/** One feature button — in the bar (`data-feature`) or in the full list (`data-feature-option`). */
function FeatureButton({ id, on, name, onClick, option }: { id: FeatureId; on: boolean; name: string; onClick: () => void; option?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-3 font-display text-base leading-none text-black transition-colors duration-200 ease-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        on ? 'border-2 border-accent bg-accent/10 font-bold' : 'border border-border bg-bg-elevated font-semibold hover:border-accent/60',
      )}
      {...(option ? { 'data-feature-option': id } : { 'data-feature': id })}
    >
      {name}
    </button>
  );
}

/**
 * The feature bar over the views: the route's features, the chosen one when it is not on the route,
 * and every feature behind "כל הסימנים" (grouped as the legend names them: the route, relief, land cover).
 */
function FeatureBar({ selected, info, onSelect }: { selected: FeatureId | null; info: ReturnType<typeof featureInfo> | null; onSelect: (id: FeatureId | null) => void }) {
  const name = (id: FeatureId) => info?.get(id)?.name ?? '';
  const toggle = (id: FeatureId) => onSelect(selected === id ? null : id);
  const extra = selected && !ROUTE_FEATURES.includes(selected) ? selected : null;
  const relief = (id: FeatureId) => !!info?.get(id)?.kind.startsWith('תבליט');
  const groups = [
    { label: 'סימני הציר', ids: ROUTE_FEATURES },
    { label: 'תבליט', ids: MORE_FEATURES.filter(relief) },
    { label: 'תכסית', ids: MORE_FEATURES.filter((id) => !relief(id)) },
  ];
  return (
    <div className="flex min-w-0 items-center gap-2" role="group" aria-label="בחירת סימן במודל ובמפה">
      {ROUTE_FEATURES.map((id) => (
        <FeatureButton key={id} id={id} on={selected === id} name={name(id)} onClick={() => toggle(id)} />
      ))}
      {extra && <FeatureButton id={extra} on name={name(extra)} onClick={() => toggle(extra)} />}
      <Popover
        label={`כל הסימנים (${LEARN_FEATURES.length})`}
        below
        wide
        data="all-features"
        trigger={
          <span className="inline-flex h-9 items-center gap-1 rounded-lg px-2 font-display text-base font-semibold text-black underline decoration-border-strong decoration-2 underline-offset-4 hover:decoration-accent">
            כל הסימנים
            <ChevronDown className="size-4" aria-hidden />
          </span>
        }
      >
        {(close) => (
          <span className="flex flex-col gap-3" data-feature-list>
            {groups.map((g) => (
              <span key={g.label} className="flex flex-col gap-1.5">
                <span className="font-display text-base font-bold text-black">{g.label}</span>
                <span className="flex flex-wrap gap-2">
                  {g.ids.map((id) => (
                    <FeatureButton
                      key={id}
                      id={id}
                      option
                      on={selected === id}
                      name={name(id)}
                      onClick={() => {
                        toggle(id);
                        close();
                      }}
                    />
                  ))}
                </span>
              </span>
            ))}
          </span>
        )}
      </Popover>
    </div>
  );
}

/** A route feature's point of the plan (the square is B), or null off the route. */
const routePointOf = (id: FeatureId): 'A' | CheckpointId | null => (id === 'square' ? 'B' : id === 'A' || id === 'H1' || id === 'H2' || id === 'H3' ? id : null);

/**
 * The info strip under the views, shared by both: the chosen feature (its name, how the map shows it,
 * and on request its kind and its legs of the plan) and, beside it, the route plan on request.
 */
function LearnInfo({ state, info, view }: { state: State; info: ReturnType<typeof featureInfo> | null; view: ViewStore }) {
  const f = state.learnFeature && info ? info.get(state.learnFeature) : null;
  const [details, setDetails] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const uid = useId();
  const legs = info ? LEGS.map((l) => ({ l, p: plannedLeg(l) })) : [];
  const legText = (l: Leg, p: ReturnType<typeof plannedLeg>) => (
    <>
      <span className="font-display font-semibold">
        {l.from === 'A' ? 'A' : CHECKPOINT_LABEL[l.from]} ← {l.to === 'B' ? 'B' : LEG_NAME(l.to)}
      </span>
      {': '}
      <Deg v={p.bearingDeg} />, {formatMetres(p.distanceM)}
    </>
  );
  const at = f ? routePointOf(f.id) : null;
  const ownLegs = at ? legs.filter(({ l }) => l.from === at || l.to === at) : [];
  return (
    <div className="mt-2.5 flex items-start gap-5 rounded-xl border border-border bg-bg-accent px-4 py-2" data-learn-info>
      <div className="min-w-0 flex-1" aria-live="polite" data-feature-card={f?.id ?? 'none'}>
        {f ? (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-display text-base font-bold text-black">{f.name}</span>
              <button
                type="button"
                onClick={() => view.orbit('focus', f.anchor)}
                className="font-display text-base font-semibold text-black underline decoration-accent decoration-2 underline-offset-4 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                data-focus-model
              >
                התקרבו במודל
              </button>
              <button
                type="button"
                aria-expanded={details}
                aria-controls={`${uid}-details`}
                onClick={() => setDetails((o) => !o)}
                className="inline-flex items-center gap-1 font-display text-base font-semibold text-black underline decoration-border-strong decoration-2 underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                data-feature-details-toggle
              >
                {details ? 'פחות פרטים' : 'פרטים נוספים'}
                <ChevronDown className={cn('size-4 transition-transform', details && 'rotate-180')} aria-hidden />
              </button>
            </div>
            <p className="mt-0.5 text-base leading-snug text-black">
              <span className="font-semibold">במפה: </span>
              {f.onMap}
            </p>
            {details && (
              <p id={`${uid}-details`} className="mt-0.5 text-base leading-snug text-black" data-feature-details>
                <span className="font-semibold">סוג: </span>
                {f.kind}
                {ownLegs.length > 0 && (
                  <>
                    {' · '}
                    <span className="font-semibold">בתכנון: </span>
                    {ownLegs.map(({ l, p }, i) => (
                      <span key={l.index}>
                        {i > 0 && '; '}
                        {legText(l, p)}
                      </span>
                    ))}
                  </>
                )}
              </p>
            )}
          </>
        ) : (
          <p className="py-0.5 text-base leading-snug text-black">
            בחרו סימן בפס שמעל התצוגות, במפה או במודל. הוא יודגש בשתי התצוגות, וכאן יופיע הסבר על הסימון שלו במפה. כשתכירו את השטח, עברו ל״תרגול״.
          </p>
        )}
      </div>
      <div className="shrink-0 border-s border-border ps-5" data-route-plan>
        <button
          type="button"
          aria-expanded={planOpen}
          aria-controls={`${uid}-plan`}
          onClick={() => setPlanOpen((o) => !o)}
          className="inline-flex items-center gap-1 rounded font-display text-base font-bold text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          id={`${uid}-plan-title`}
        >
          תכנון הציר
          <ChevronDown className={cn('size-4 transition-transform', planOpen && 'rotate-180')} aria-hidden />
        </button>
        {planOpen && (
          <ul id={`${uid}-plan`} className="mt-0.5 grid grid-cols-2 gap-x-6 gap-y-0.5" aria-labelledby={`${uid}-plan-title`} data-plan>
            {legs.map(({ l, p }) => (
              <li key={l.index} className="whitespace-nowrap text-base leading-snug text-black">
                {legText(l, p)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- practice

/** One step's heading (א / ב / ג name the parts the feedback refers to). */
const STEP_HEADING = 'mb-1.5 font-display text-base font-bold text-black';

/** The task column: progress and the plan, the three steps (א point, ב evidence, ג comparison), help and the check, and the feedback. */
function PracticeStrip({ state, leg, letters, dispatch }: { state: State; leg: Leg; letters: Record<CandidateId, string>; dispatch: (a: Parameters<typeof reducer>[1]) => void }) {
  const v = viewOf(state);
  const plan = plannedLeg(leg);
  const sel = state.sel;
  const uid = useId();
  const locked = v.closed;
  const m = sel.candidate ? measuredTo(leg, sel.candidate) : null;
  return (
    <div className="flex flex-col" data-strip="practice" data-leg={leg.index + 1}>
      <Progress state={state} />
      <p className="mt-1 text-base leading-snug text-black" data-plan-leg>
        התכנון: מ{FROM_NAME(leg)} · אזימוט <Deg v={plan.bearingDeg} /> · מרחק {formatMetres(plan.distanceM)}
      </p>

      {/* א. the point */}
      <div className="mt-2">
        <div id={`${uid}-pt`} className={STEP_HEADING}>
          א. השוו לתצפית ובחרו מיקום במפה או כאן
        </div>
        <RadioRow
          labelledBy={`${uid}-pt`}
          options={leg.candidates.map((id) => ({ id, label: letters[id], aria: `נקודה ${letters[id]}` }))}
          value={sel.candidate}
          disabled={locked}
          onChange={(id) => dispatch({ type: 'selectCandidate', id })}
          data="candidates"
        />
      </div>

      {/* Select a position first; then show the evidence and comparison for that position. */}
      {(sel.candidate || locked) && <div className="mt-2">
        <div id={`${uid}-ev`} className={STEP_HEADING}>
          ב. בחרו שני תיאורים שמתאימים לתצפית ולמפה
        </div>
        <ul className="space-y-1" role="group" aria-labelledby={`${uid}-ev`} data-evidence>
          {leg.evidence.map((e) => {
            const on = sel.evidence.includes(e.id);
            const full = !on && sel.evidence.length >= EVIDENCE_COUNT;
            const wrong = on && v.result?.kind === 'partial' && v.result.wrongEvidence.includes(e.id);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-disabled={locked || full}
                  onClick={() => !locked && !full && dispatch({ type: 'toggleEvidence', id: e.id })}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-1 text-start text-base leading-snug text-black transition-colors duration-200 ease-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    wrong ? 'border-2 border-accent-hot/70 bg-bg-accent' : on ? 'border-2 border-accent bg-accent/10' : 'border border-border bg-bg-elevated hover:border-accent/60',
                    (locked || full) && !on && 'cursor-not-allowed opacity-60 hover:border-border',
                  )}
                  data-evidence-id={e.id}
                  data-wrong={wrong || undefined}
                >
                  <span aria-hidden className={cn('mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded border', on ? 'border-accent bg-accent text-white' : 'border-fg-dim bg-white')}>
                    {on && <Check className="size-3.5" strokeWidth={3.5} />}
                  </span>
                  <span className="min-w-0 flex-1">{e.text}</span>
                  {wrong && (
                    <span className="mt-0.5 flex shrink-0 items-center gap-1 font-display text-base font-semibold text-black">
                      <X className="size-4" aria-hidden />
                      <span className="sr-only">לא נכון מכאן</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="sr-only" aria-live="polite">
          {sel.evidence.length >= EVIDENCE_COUNT && !locked ? 'נבחרו שני תיאורים. כדי להחליף תיאור, בטלו את הבחירה באחד מהם.' : ''}
        </p>
      </div>}

      {/* ג. the comparison with the plan — one height before and after a point is marked */}
      {(sel.candidate || locked) && <div className="mt-2">
        <div className={STEP_HEADING} id={`${uid}-cmp`}>
          ג. הכיוון והמרחק מתאימים לתכנון?
        </div>
        <div style={{ minHeight: COMPARE_H }}>
          {m ? (
            <>
              <p className="text-base leading-snug text-black" data-measured>
                במפה, מ{FROM_NAME(leg)} לנקודה {letters[sel.candidate!]}: <Deg v={m.bearingDeg} />, {formatMetres(m.distanceM)}.
              </p>
              <RadioRow
                labelledBy={`${uid}-cmp`}
                options={[
                  { id: 'match', label: 'מתאים לתכנון' },
                  { id: 'mismatch', label: 'לא מתאים לתכנון' },
                ]}
                value={sel.comparison}
                disabled={locked}
                onChange={(value) => dispatch({ type: 'setComparison', value })}
                className="mt-1.5"
                data="comparison"
              />
            </>
          ) : (
            <p className="text-base leading-snug text-black">אחרי שתסמנו נקודה יוצגו כאן הכיוון והמרחק אליה במפה.</p>
          )}
        </div>
      </div>}

      {/* Help and the check, over the feedback they lead to */}
      <div className="mt-2.5 flex min-w-0 items-center justify-between gap-2">
        {locked ? (
          <span />
        ) : (
          <div className="flex items-center gap-1.5">
            <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'hint' })} disabled={state.hint >= 2}>
              <Lightbulb className="size-4" aria-hidden />
              {state.hint === 0 ? 'רמז' : 'רמז נוסף'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'reveal' })} disabled={state.attempts === 0} title={state.attempts === 0 ? 'ההסבר זמין אחרי בדיקה ראשונה' : undefined}>
              <CircleHelp className="size-4" aria-hidden />
              הצגת הסבר
            </Button>
          </div>
        )}
        {locked ? (
          <Button variant="primary" size="sm" onClick={() => dispatch({ type: 'next' })}>
            {leg.index === LEGS.length - 1 ? 'לסיכום הציר' : 'המשך לקטע הדרך הבא'}
            <ArrowLeft className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={() => dispatch({ type: 'check' })}>
            בדיקת המיקום
          </Button>
        )}
      </div>

      {/* the verdict (and any hint) */}
      <div className="mt-2">
        <Feedback state={state} leg={leg} letters={letters} />
      </div>
    </div>
  );
}

function Progress({ state }: { state: State }) {
  const k = Math.min(state.leg, LEGS.length - 1);
  return (
    <div className="flex items-center gap-3" data-progress={`${k + 1}/${LEGS.length}`}>
      <span className="font-display text-base font-bold text-black">
        קטע דרך {k + 1} מתוך {LEGS.length}
      </span>
      <ol className="flex items-center gap-1.5" aria-label="התקדמות בציר">
        {LEGS.map((l, i) => {
          const o = state.outcomes[i];
          const current = i === state.leg;
          return (
            <li key={l.index} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden className={cn('h-0.5 w-4 rounded', state.outcomes[i - 1] ? 'bg-accent' : 'bg-border')} />}
              <span
                className={cn('flex size-6 items-center justify-center rounded-full border-2 font-display text-sm font-bold', o ? 'border-accent bg-accent text-white' : current ? 'border-accent bg-white text-black' : 'border-border bg-white text-black')}
                aria-label={`קטע דרך ${i + 1}: ${o === 'verified' ? 'אומת' : o === 'explained' ? 'הוצג הסבר' : current ? 'הקטע הנוכחי' : 'עוד לא נבדק'}`}
              >
                {o ? <Check className="size-3.5" strokeWidth={3.5} aria-hidden /> : i + 1}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------- feedback

const fromSector = (sector: string) => `מ${sector}`;

/** One concrete mismatch from the chosen point: where a true statement's feature would be from there, against the view. */
function mismatchLine(leg: Leg, chosen: CandidateId, letter: string): ReactNode {
  const here = candidatePoint(leg.answer);
  const there = candidatePoint(chosen);
  const e = leg.correctEvidence.map((id) => leg.evidence.find((x) => x.id === id)!).find((x) => x.predicate.kind === 'direction');
  if (!e) return null;
  const a = featureDirection(e, there);
  const b = featureDirection(e, here);
  if (!a || !b) return null;
  const n = nounOf(e.feature);
  const round = (m: number) => Math.round(m / 10) * 10;
  if (a.sector === b.sector) {
    return `מנקודה ${letter}, ${n.text} ${n.f ? 'הייתה אמורה' : 'היה אמור'} להיות במרחק של כ־${round(a.distanceM)} מ׳ — אבל בתצפית ${n.f ? 'היא' : 'הוא'} במרחק של כ־${round(b.distanceM)} מ׳.`;
  }
  return `מנקודה ${letter}, ${n.text} ${n.f ? 'הייתה אמורה' : 'היה אמור'} להיות ${fromSector(a.sector)} לכם — אבל בתצפית ${n.f ? 'היא' : 'הוא'} ${fromSector(b.sector)} לכם.`;
}

function whyWrong(e: Evidence, at: Point): string {
  const d = featureDirection(e, at);
  const n = nounOf(e.feature);
  if (d) return `מכאן ${n.text} ${n.f ? 'נמצאת' : 'נמצא'} ${fromSector(d.sector)} לכם, כ־${Math.round(d.distanceM / 10) * 10} מ׳.`;
  if (e.predicate.kind === 'houses-only') return 'כאן יש בתים מכל הצדדים.';
  return 'זה לא מה שרואים מכאן.';
}

/** Before a check: only what is still missing (א / ב / ג name the parts above), or that the check is ready. */
function waitingLine(candidate: CandidateId | null, evidence: number, comparison: State['sel']['comparison']): string {
  if (!candidate) return 'בחרו אחת מהנקודות המסומנות במפה, או את האות שלה בכפתורים למעלה.';
  const missing = [
    evidence < EVIDENCE_COUNT && (evidence === 0 ? 'שני תיאורים מתאימים (ב)' : 'תיאור מתאים נוסף (ב)'),
    !comparison && 'בחירה אם הכיוון והמרחק מתאימים (ג)',
  ].filter((x): x is string => !!x);
  if (missing.length === 0) return 'אפשר ללחוץ ״בדיקת המיקום״.';
  const list = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(', ')} ו${missing[missing.length - 1]}`;
  return `נשאר להשלים: ${list}.`;
}

function Feedback({ state, leg, letters }: { state: State; leg: Leg; letters: Record<CandidateId, string> }) {
  const v = viewOf(state);
  const r: Evaluation | null = v.result;
  const plan = plannedLeg(leg);
  let tone = 'border-dashed border-border bg-bg-accent/50';
  let icon: ReactNode = <Info className="size-5 shrink-0" aria-hidden />;
  let title: ReactNode = waitingLine(state.sel.candidate, state.sel.evidence.length, state.sel.comparison);
  let lines: ReactNode[] = [];
  let kind = 'empty';
  if (v.stale) {
    kind = 'stale';
    tone = 'border-dashed border-border-strong bg-bg-accent';
    icon = <RotateCcw className="size-5 shrink-0" aria-hidden />;
    title = 'הבחירה השתנתה — בדקו שוב.';
  } else if (r?.kind === 'missing') {
    kind = 'missing';
    tone = 'border-border bg-bg-accent';
    title = 'סמנו במפה היכן אתם נמצאים, או בחרו נקודה בכפתורים.';
  } else if (r?.kind === 'wrong-location') {
    kind = 'wrong';
    tone = 'border-accent-hot/60 bg-bg-accent';
    icon = <X className="size-5 shrink-0" aria-hidden />;
    const L = letters[r.candidate];
    const m = measuredTo(leg, r.candidate);
    title = `נקודה ${L} אינה מתאימה למה שרואים מכאן.`;
    // The order of the route tells which point comes next: the plan from the previous sign, against the marked point.
    lines = [
      mismatchLine(leg, r.candidate, L),
      <>
        לפי סדר הציר, הסימן הבא אחרי {LEG_FROM_SHORT(leg)} נמצא ב־<Deg v={plan.bearingDeg} />, {formatMetres(plan.distanceM)}. אל נקודה {L}: <Deg v={m.bearingDeg} />, {formatMetres(m.distanceM)}.
        {r.comparisonRight === true && ' צדקתם: הכיוון והמרחק לא מתאימים לתכנון.'}
      </>,
    ].filter(Boolean);
  } else if (r?.kind === 'partial') {
    kind = 'partial';
    tone = 'border-border-strong bg-bg-accent';
    icon = <CircleHelp className="size-5 shrink-0" aria-hidden />;
    title = 'הנקודה נכונה. בדקו את התיאורים ואת ההשוואה לתכנון.';
    const here = candidatePoint(leg.answer);
    // The false statements are marked ✕ in the list; here, only why.
    lines = [
      ...r.wrongEvidence.map((id) => {
        const e = leg.evidence.find((x) => x.id === id)!;
        return `✕ ${whyWrong(e, here)}`;
      }),
      // (a statement marked ✕ already says one is missing)
      r.evidenceMissing > 0 && r.wrongEvidence.length === 0 ? (r.evidenceMissing === EVIDENCE_COUNT ? 'בחרו שני תיאורים שמתאימים לתצפית ולמפה.' : 'בחרו תיאור מתאים נוסף לפי התצפית והמפה.') : null,
      r.comparison === 'missing' ? 'בחרו אם הכיוון והמרחק מתאימים לתכנון.' : null,
      r.comparison === 'wrong' ? 'בדקו שוב: הכיוון והמרחק אל הנקודה כן מתאימים לתכנון.' : null,
    ].filter(Boolean);
  } else if (r?.kind === 'verified') {
    kind = state.revealed ? 'explained' : 'verified';
    tone = 'border-brand bg-brand/10';
    icon = <Check className="size-5 shrink-0" aria-hidden />;
    const here = candidatePoint(leg.answer);
    title = state.revealed ? `ההסבר: אתם ${AT_NAME[leg.to]}.` : `אימתתם את המיקום: ${LEG_NAME(leg.to)}.`;
    const ev = leg.correctEvidence.map((id) => leg.evidence.find((x) => x.id === id)!);
    lines = [
      ...ev.map((e) => {
        const d = featureDirection(e, here);
        return d ? `${e.text.replace(/\.$/, '')} (${ltr(formatBearing(d.bearingDeg))}).` : e.text;
      }),
      <>
        הכיוון והמרחק מתאימים לתכנון: <Deg v={plan.bearingDeg} /> ו־{formatMetres(plan.distanceM)}.
      </>,
    ];
  }
  // A hint is help, not a verdict: on its own it takes the empty box; after a check it follows the verdict.
  const hint = state.hint > 0 && !v.closed ? (state.hint >= 2 ? leg.hint2.text : leg.hint1) : null;
  if (hint && kind === 'empty') {
    kind = 'hint';
    icon = <Lightbulb className="size-5 shrink-0" aria-hidden />;
    title = hint;
  }
  const hintAfter = hint && kind !== 'hint';
  return (
    // One height (the tallest verdict with a hint): no state moves the column. Announced once per check.
    <div role="status" aria-live="polite" aria-atomic="true" className={cn('rounded-xl border px-4 py-2', tone)} style={{ height: FEEDBACK_H }} data-feedback={kind} data-hint={hint ? state.hint : undefined}>
      <div key={`${kind}-${state.attempts}-${state.revealed}-${state.hint}`}>
        <div className="flex items-start gap-2 font-display text-base font-bold leading-snug text-black">
          {icon}
          <span>{title}</span>
        </div>
        {lines.length > 0 && (
          <ul className="mt-1.5 space-y-1 text-base leading-snug text-black">
            {lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
        {hintAfter && (
          <p className="mt-2 flex items-start gap-2 border-t border-border-subtle pt-2 text-base leading-snug text-black">
            <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{hint}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- summary

function Summary({ state, onRestart, onContinue }: { state: State; onRestart: () => void; onContinue?: () => void }) {
  return (
    <div data-strip="summary">
      <div className="flex flex-col gap-3">
        <p className="min-w-0 text-base leading-relaxed text-black">
          השלמתם את הציר מנקודת המוצא A עד הכיכר המרכזית בכפר. כך הבחנתם בין מקומות דומים: לפי סדר הסימנים בציר, הכיוון והמרחק מהסימן הקודם, והסימנים שליד כל נקודה.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="md" onClick={onRestart}>
            <RotateCcw className="size-4" aria-hidden />
            התחלה מחדש
          </Button>
          {onContinue && (
            <Button variant="primary" size="md" onClick={onContinue}>
              המשך לניווט עיוור
              <ArrowLeft className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>
      <ol className="mt-3 grid grid-cols-1 gap-2" data-summary>
        {LEGS.map((l) => {
          const p = plannedLeg(l);
          const o = state.outcomes[l.index];
          const ev = l.correctEvidence.map((id) => l.evidence.find((x) => x.id === id)!.text.replace(/\.$/, ''));
          return (
            <li key={l.index} className="rounded-xl border border-border bg-bg-accent px-3.5 py-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-base font-bold text-black">
                <span>
                  קטע דרך {l.index + 1} · {LEG_NAME(l.to)}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold">
                  {o === 'verified' ? <Check className="size-4" aria-hidden /> : <Info className="size-4" aria-hidden />}
                  {o === 'verified' ? 'אומת' : 'הוצג הסבר'}
                </span>
              </div>
              <p className="mt-1 text-base leading-snug text-black">
                {ev.join('; ')}. <Deg v={p.bearingDeg} />, {formatMetres(p.distanceM)}.
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

