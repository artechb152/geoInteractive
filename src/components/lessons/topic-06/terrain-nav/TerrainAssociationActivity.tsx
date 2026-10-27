'use client';

import { useEffect, useId, useMemo, useReducer, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, CircleHelp, Info, Lightbulb, ListTree, Maximize2, Minimize2, RotateCcw, X } from 'lucide-react';
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
import { MapSymbolLegend, RouteGlyph, TerrainNavMap, type MapLayer, type RouteGlyphKind } from './TerrainNavMap';
import { FALLBACK, TerrainNavModel } from './TerrainNavModel';
import { RadioRow } from './RadioRow';
import type { ModelLabel, ModelProps } from './TerrainNav3D';

/**
 * "ניווט לפי השטח" — the terrain-association lab of lesson 6 (alternative 1 of
 * design/mockups/combatnav-concepts-2026-10-12). One workspace: the live 3D
 * terrain model (inline start, ~55 %) and the topographic map drawn from the same
 * data (~45 %), with one task under them.
 *
 *   לימוד   the whole route — A, כיפה 1–3, the square (B) — with names. A click in
 *           either view (or the feature list) selects the same feature in both,
 *           and the card says what it is and how the map shows it.
 *   תרגול   leg by leg from the navigator's eye: no marker, name or label gives
 *           the place away. The learner marks the point on the map (or with the
 *           buttons), picks two pieces of evidence, compares direction and
 *           distance with the plan, and checks. Hints are graded; only
 *           "הצגת הסבר" shows the answer. A verified leg walks the navigator on.
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

/** `header` / `footer` — the technique's own text, set at the top and the foot of the card
 *  (one envelope per activity). */
export function TerrainAssociationActivity({
  copy,
  onContinue,
  header,
  footer,
}: {
  copy: TerrainNavCopy;
  onContinue?: () => void;
  header?: ReactNode;
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

  return (
    <div className="surface-elevated p-6 lg:p-8" data-activity="terrain-association" data-mode={state.mode} aria-labelledby={titleId}>
      {header}

      {/* Task line + mode */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h4 id={titleId} className="font-display text-lg font-bold leading-snug text-black md:text-xl">
              {state.mode === 'learn' ? 'חקרו את השטח' : v.finished ? 'סיכום הציר' : 'איפה אתם עכשיו?'}
            </h4>
            {copy.badge && <StatusChip tone="badge">{copy.badge}</StatusChip>}
          </div>
          {/* How to turn and zoom the model is written on the model itself. */}
          <p className="mt-1.5 text-base leading-relaxed text-black">
            {state.mode === 'learn'
              ? 'השוו את המודל למפה: בחרו עצם, והוא יודגש בשתי התצוגות.'
              : v.finished
                ? 'כל ארבעת קטעי הדרך נבדקו. אפשר להתחיל מחדש או לעבור לניווט עיוור.'
                : 'אתם בסוף קטע הדרך. סמנו במפה היכן אתם, ואמתו בשתי ראיות מהשטח ובהשוואה לתכנון.'}
          </p>
        </div>
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

      {/* The two views, one height: model at the inline start (right), map at the end (left) */}
      <div className="mt-4 grid gap-6" style={{ gridTemplateColumns: 'minmax(0, 52fr) minmax(0, 48fr)' }}>
        <TerrainNavModel
          view={view}
          mode={state.mode}
          reduce={reduce}
          fallbackSrc={fallbackSrc}
          modelProps={{ ...modelProps, onPick: onPickGround }}
          ariaLabel={
            state.mode === 'learn'
              ? 'מודל תלת־ממדי של שטח האימון: שלוש כיפות לאורך הציר, נחל, חורשות, דרכי עפר וכפר עם כיכר. אפשר לסובב ולהתקרב; העצמים נבחרים גם במפה ובכפתורי הרשימה.'
              : 'התצפית מעמדת המנווט. אפשר להסתכל סביב ולהגדיל, בלי לזוז ממקומכם.'
          }
          className="h-[488px]"
        />
        <MapPanel ready={terrainReady} layer={mapLayer} copy={copy} onPickFeature={(id) => dispatch({ type: 'selectFeature', id })} onPickCandidate={(id) => dispatch({ type: 'selectCandidate', id })} />
      </div>

      {/* The caption under the views; the route legend sits beside the map, inside its panel */}
      <p className="mt-3 text-base leading-relaxed text-black" data-legend="caption">
        {copy.caption}
      </p>

      {/* The one task under the views */}
      <div className="mt-3 border-t border-border-subtle pt-3">
        {state.mode === 'learn' ? (
          <LearnStrip state={state} info={info} onSelect={(id) => dispatch({ type: 'selectFeature', id })} onStart={() => setMode('practice')} view={view} />
        ) : v.finished ? (
          <Summary state={state} onRestart={() => dispatch({ type: 'restart' })} onContinue={onContinue} />
        ) : (
          leg && letters && <PracticeStrip state={state} leg={leg} letters={letters} dispatch={dispatch} />
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

function MapPanel({ ready, layer, copy, onPickFeature, onPickCandidate }: { ready: boolean; layer: MapLayer; copy: TerrainNavCopy; onPickFeature: (id: FeatureId | null) => void; onPickCandidate: (id: CandidateId) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  return (
    // The sheet at the inline start (beside the model); the route legend and the map tools in a column at its outer side.
    <div ref={ref} className={cn('relative flex h-[488px] rounded-xl border border-border/70 bg-white', fullscreen && 'h-full rounded-none p-4')} data-panel="map">
      <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-s-xl">
        {ready ? (
          <TerrainNavMap layer={layer} onPickFeature={onPickFeature} onPickCandidate={onPickCandidate} className="block h-full max-h-full w-full" />
        ) : (
          <span className="font-display text-base font-semibold text-black" data-loading>
            טוען את המפה…
          </span>
        )}
      </div>
      <RouteLegend copy={copy} fullscreen={fullscreen} />
    </div>
  );
}

/** Opens the map panel full screen, or leaves it — from the legend column, so it never covers the sheet. */
function MapFullscreenButton({ fullscreen }: { fullscreen: boolean }) {
  return (
    <button
      type="button"
      onClick={() => (fullscreen ? document.exitFullscreen() : (document.querySelector('[data-activity="terrain-association"] [data-panel="map"]') as HTMLElement | null)?.requestFullscreen?.())}
      className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-paper-bright/70 px-3 font-display text-base font-semibold text-black hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {fullscreen ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
      {fullscreen ? 'יציאה ממסך מלא' : 'מפה במסך מלא'}
    </button>
  );
}

/** The approved route legend of the technique (CombatNavScene SUPPORT.handrail), drawn with this map's own marks, and the map key on demand. */
function RouteLegend({ copy, fullscreen }: { copy: TerrainNavCopy; fullscreen: boolean }) {
  return (
    <div className="flex w-[200px] shrink-0 flex-col justify-between gap-3 border-s border-border-subtle bg-paper-bright/40 p-3" data-legend="route">
      <ul className="space-y-2.5">
        {copy.legend.map((it) => (
          <li key={it.label} className="flex items-start gap-2 text-base leading-snug text-black">
            <span className="mt-0.5 shrink-0">
              <RouteGlyph kind={it.kind} />
            </span>
            <span>{it.label}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <Popover
          label="מקרא המפה"
          trigger={
            <span className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-paper-bright/70 px-3 font-display text-base font-semibold text-black">
              <ListTree className="size-4" aria-hidden />
              מקרא המפה
            </span>
          }
          wide
        >
          <MapSymbolLegend />
        </Popover>
        <MapFullscreenButton fullscreen={fullscreen} />
      </div>
    </div>
  );
}

/** A small disclosure: a trigger and a note next to it; Esc or a click outside closes it. */
function Popover({ label, trigger, children, wide }: { label: string; trigger: ReactNode; children: ReactNode; wide?: boolean }) {
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
      <button type="button" aria-expanded={open} aria-controls={id} aria-label={label} onClick={() => setOpen((o) => !o)} className="w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {trigger}
      </button>
      {open && (
        <span id={id} role="note" className={cn('absolute bottom-full end-0 z-30 mb-2 rounded-xl border border-border bg-bg-elevated p-4 text-start shadow-elevated', wide ? 'w-[34rem]' : 'w-80')}>
          {children}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------- learn

/** The route's own features — shown first; the rest of the list opens on request. */
const ROUTE_FEATURES: readonly FeatureId[] = ['A', 'H1', 'H2', 'H3', 'square'];
const MORE_FEATURES = LEARN_FEATURES.filter((id) => !ROUTE_FEATURES.includes(id));

function LearnStrip({ state, info, onSelect, onStart, view }: { state: State; info: ReturnType<typeof featureInfo> | null; onSelect: (id: FeatureId | null) => void; onStart: () => void; view: ViewStore }) {
  const f = state.learnFeature && info ? info.get(state.learnFeature) : null;
  const legs = info ? LEGS.map((l) => ({ l, p: plannedLeg(l) })) : [];
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();
  // A feature picked in the model or on the map opens the rest of the list, so its button is in view.
  useEffect(() => {
    if (state.learnFeature && MORE_FEATURES.includes(state.learnFeature)) setMoreOpen(true);
  }, [state.learnFeature]);
  const showMore = moreOpen;
  const featureButton = (id: FeatureId) => {
    const on = state.learnFeature === id;
    return (
      <button
        key={id}
        type="button"
        aria-pressed={on}
        onClick={() => onSelect(on ? null : id)}
        className={cn(
          'h-9 cursor-pointer rounded-lg px-3 font-display text-base leading-none text-black transition-colors duration-200 ease-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          on ? 'border-2 border-accent bg-accent/10 font-bold' : 'border border-border bg-bg-elevated font-semibold hover:border-accent/60',
        )}
        data-feature={id}
      >
        {info?.get(id)?.name ?? ''}
      </button>
    );
  };
  return (
    <div data-strip="learn">
      <div className="flex items-center justify-between gap-4">
        <div className="font-display text-base font-bold text-black">עצמים בשטח</div>
        <Button variant="primary" size="md" onClick={onStart}>
          התחילו לתרגל
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="בחירת עצם. הוא יודגש במודל ובמפה.">
        {ROUTE_FEATURES.map(featureButton)}
        {showMore && <span id={moreId} className="contents">{MORE_FEATURES.map(featureButton)}</span>}
        <button
          type="button"
          aria-expanded={showMore}
          aria-controls={showMore ? moreId : undefined}
          onClick={() => setMoreOpen((o) => !o)}
          className="h-9 cursor-pointer rounded-lg px-3 font-display text-base font-semibold leading-none text-black underline decoration-border-strong decoration-2 underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          data-feature-more
        >
          {showMore ? 'פחות עצמים' : `עוד ${MORE_FEATURES.length} עצמים בשטח`}
        </button>
      </div>
      <div className="mt-3 grid items-start gap-6" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)' }}>
        <div className="min-h-[88px] rounded-xl border border-border bg-bg-accent px-4 py-3" aria-live="polite" data-feature-card={f?.id ?? 'none'}>
          {f ? (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-display text-base font-bold text-black">{f.name}</span>
                <span className="text-base text-black">{f.kind}</span>
                <button type="button" onClick={() => view.orbit('focus', f.anchor)} className="font-display text-base font-semibold text-black underline decoration-accent decoration-2 underline-offset-4 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  התקרבו במודל
                </button>
              </div>
              <p className="mt-1 text-base leading-relaxed text-black">
                <span className="font-semibold">במפה: </span>
                {f.onMap}
              </p>
            </>
          ) : (
            <p className="text-base leading-relaxed text-black">כאן יוצג מידע על העצם שתבחרו: מהו ואיך הוא מסומן במפה.</p>
          )}
        </div>
        <div className="min-w-0">
          <div className="mb-1.5 font-display text-base font-bold text-black" id="tn-plan-title">
            תכנון הציר
          </div>
          <ul className="grid grid-cols-2 gap-x-5 gap-y-1" aria-labelledby="tn-plan-title" data-plan>
            {legs.map(({ l, p }) => (
              <li key={l.index} className="whitespace-nowrap text-base leading-snug text-black">
                <span className="font-display font-semibold">
                  {l.from === 'A' ? 'A' : CHECKPOINT_LABEL[l.from]} ← {l.to === 'B' ? 'B' : LEG_NAME(l.to)}
                </span>
                {': '}
                <Deg v={p.bearingDeg} />, {formatMetres(p.distanceM)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- practice

/** Point + comparison · evidence · feedback. */
const PRACTICE_COLUMNS = 'minmax(0, 0.78fr) minmax(0, 1.1fr) minmax(0, 1.22fr)';

function PracticeStrip({ state, leg, letters, dispatch }: { state: State; leg: Leg; letters: Record<CandidateId, string>; dispatch: (a: Parameters<typeof reducer>[1]) => void }) {
  const v = viewOf(state);
  const plan = plannedLeg(leg);
  const sel = state.sel;
  const uid = useId();
  const locked = v.closed;
  const m = sel.candidate ? measuredTo(leg, sel.candidate) : null;
  return (
    <div data-strip="practice" data-leg={leg.index + 1}>
      {/* One grid: progress and the plan over the three inputs; help and the check over the feedback they lead to */}
      <div className="grid items-stretch gap-x-6 gap-y-3" style={{ gridTemplateColumns: PRACTICE_COLUMNS }}>
        <div className="col-span-2 flex min-w-0 items-center gap-x-5">
          <Progress state={state} />
          <p className="min-w-0 text-base text-black" data-plan-leg>
            התכנון: מ{FROM_NAME(leg)} · אזימוט <Deg v={plan.bearingDeg} /> · מרחק {formatMetres(plan.distanceM)}
          </p>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2">
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

        {/* א. the point, and ג. the comparison with the plan */}
        <div className="min-w-0">
          <div id={`${uid}-pt`} className="mb-1.5 font-display text-base font-bold text-black">
            א. היכן אתם? סמנו נקודה במפה או בחרו כאן
          </div>
          <RadioRow
            labelledBy={`${uid}-pt`}
            options={leg.candidates.map((id) => ({ id, label: letters[id], aria: `נקודה ${letters[id]}` }))}
            value={sel.candidate}
            disabled={locked}
            onChange={(id) => dispatch({ type: 'selectCandidate', id })}
            data="candidates"
          />
          <div className="mt-4 mb-1.5 font-display text-base font-bold text-black" id={`${uid}-cmp`}>
            ג. כיוון ומרחק לעומת התכנון
          </div>
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
                className="mt-2"
                data="comparison"
              />
            </>
          ) : (
            <p className="text-base leading-snug text-black">אחרי שתסמנו נקודה יוצגו כאן הכיוון והמרחק אליה במפה.</p>
          )}
        </div>

        {/* ב. evidence */}
        <div className="min-w-0">
          <div id={`${uid}-ev`} className="mb-1.5 font-display text-base font-bold text-black">
            ב. בחרו שתי ראיות שרואים בתצפית ובמפה
          </div>
          <ul className="space-y-1.5" role="group" aria-labelledby={`${uid}-ev`} data-evidence>
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
                      'flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-1.5 text-start text-base leading-snug text-black transition-colors duration-200 ease-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
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
            {sel.evidence.length >= EVIDENCE_COUNT && !locked ? 'נבחרו שתי ראיות. כדי להחליף ראיה, בטלו את הבחירה באחת מהן.' : ''}
          </p>
        </div>

        {/* the verdict (and any hint) — beside the inputs, under the check */}
        <div className="flex min-w-0 flex-col">
          <Feedback state={state} leg={leg} letters={letters} />
        </div>
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
  const missing = [
    !candidate && 'נקודה (א)',
    evidence < EVIDENCE_COUNT && (evidence === 0 ? 'שתי ראיות (ב)' : 'ראיה נוספת (ב)'),
    !comparison && 'השוואה לתכנון (ג)',
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
    title = 'הנקודה נכונה. השלימו את הראיות וההשוואה.';
    const here = candidatePoint(leg.answer);
    // The false statements are marked ✕ in the list; here, only why.
    lines = [
      ...r.wrongEvidence.map((id) => {
        const e = leg.evidence.find((x) => x.id === id)!;
        return `✕ ${whyWrong(e, here)}`;
      }),
      // (a statement marked ✕ already says one is missing)
      r.evidenceMissing > 0 && r.wrongEvidence.length === 0 ? (r.evidenceMissing === EVIDENCE_COUNT ? 'בחרו שתי ראיות שרואים בתצפית ובמפה.' : 'בחרו ראיה נוספת שרואים בתצפית ובמפה.') : null,
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
    // Fixed minimum height: a verdict never moves the views. Announced once per check.
    <div role="status" aria-live="polite" aria-atomic="true" className={cn('min-h-[120px] flex-1 rounded-xl border px-4 py-2.5', tone)} data-feedback={kind} data-hint={hint ? state.hint : undefined}>
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
      <div className="flex items-start justify-between gap-6">
        <p className="min-w-0 text-base leading-relaxed text-black">
          השלמתם את הציר מנקודת המוצא A עד הכיכר המרכזית בכפר. כך הבחנתם בין מקומות דומים: לפי סדר הסימנים בציר, הכיוון והמרחק מהסימן הקודם, והסימנים שליד כל נקודה.
        </p>
        <div className="flex shrink-0 items-center gap-3">
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
      <ol className="mt-3 grid grid-cols-4 gap-4" data-summary>
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

