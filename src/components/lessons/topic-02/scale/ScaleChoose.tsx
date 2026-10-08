'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as geo from './geo';
import { SHEET_UNITS, formatNumber, formatRatio, insideSheet, lonLatToSheet, type SheetPoint } from './geo';
import { SHEETS, SHEET_IDS, type SheetId, type SheetMeta } from './scaleSheets.data';
import { LANDMARKS, SCENARIOS, shownSuffix, type LandmarkId, type Scenario, type ScenarioId } from './scaleContent.data';
import { evaluateChoice } from './choose';
import { SheetViewport } from './SheetViewport';
import { FOCUS_RING, INSET, OPTION_ACTIVE, OPTION_BASE, OPTION_IDLE, SheetPicker, T1, T1_INTRO, T3, T5, ViewModeToggle, useRovingKeys, type ViewMode } from './controls';
import { CURTAIN_LABELS, layersFor, preloadFor } from './layers';
import { ACCENT, Label, PAPER, Ring, pillSize, sw } from './overlayParts';

const SCENARIO_IDS = SCENARIOS.map((s) => s.id);

// Same workspace as screen B: the scenario tabs head the controls column and the map spans both rows,
// so the map starts at the top of the workspace (spec §6: controls at inline-start, map at inline-end).
const WORKSPACE_GRID = 'grid gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-[auto_1fr]';
const CONTROLS_CELL = 'flex flex-col gap-5 lg:col-start-1 lg:row-start-2';
const MAP_CELL = 'lg:col-start-2 lg:row-span-2 lg:row-start-1';
const tabId = (s: ScenarioId) => `scale-choose-tab-${s}`;
const panelId = (s: ScenarioId) => `scale-choose-panel-${s}`;
// Programmatic focus target: no ring. globals.css draws *:focus-visible rings as a box-shadow, so outline-none alone isn't enough.
const FOCUS_TARGET = 'outline-none focus-visible:ring-0 focus-visible:ring-offset-0';

/** Screen C — "איזו מפה מתאימה למשימה?" (spec §6.3). */
export function ScaleChoose() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('local');
  const [sheetId, setSheetId] = useState<SheetId>('50k');
  const [mode, setMode] = useState<ViewMode>('map');
  // As on screen A: at 0.5 the curtain line cut the centred labels.
  const [curtain, setCurtain] = useState(0.65);
  const [choices, setChoices] = useState<Partial<Record<ScenarioId, SheetId>>>({});
  // A solved scenario keeps its ✓ even if the learner later explores a wrong choice there.
  const [solvedIds, setSolvedIds] = useState<ReadonlySet<ScenarioId>>(() => new Set());
  const preload = useMemo(() => preloadFor(SHEET_IDS), []);
  const keys = useRovingKeys(SCENARIO_IDS, scenarioId, setScenarioId);

  // Focus follows the learner's action: a choice → its feedback; "next scenario" (whose button unmounts) → the new task.
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const taskRef = useRef<HTMLParagraphElement>(null);
  const [chooseCount, setChooseCount] = useState(0);
  const focusTask = useRef(false);
  useEffect(() => {
    if (chooseCount > 0) feedbackRef.current?.focus();
  }, [chooseCount]);
  useEffect(() => {
    if (!focusTask.current) return;
    focusTask.current = false;
    taskRef.current?.focus();
  }, [scenarioId]);

  const idx = SCENARIO_IDS.indexOf(scenarioId);
  const sc = SCENARIOS[idx];
  const sheet = SHEETS[sheetId];
  const preview = evaluateChoice(sc, sheet, LANDMARKS, geo);
  const chosen = choices[sc.id];
  const fb = chosen ? evaluateChoice(sc, SHEETS[chosen], LANDMARKS, geo) : null;
  const layers = layersFor(sheet, mode);
  const solved = (id: ScenarioId) => solvedIds.has(id);

  const choose = () => {
    setChoices((c) => ({ ...c, [sc.id]: sheetId }));
    if (sheetId === sc.target) setSolvedIds((s) => new Set(s).add(sc.id));
    setChooseCount((n) => n + 1);
  };
  const nextScenario = () => {
    focusTask.current = true;
    setScenarioId(SCENARIOS[idx + 1].id);
  };

  const feedbackText = (): string => {
    if (!fb || !chosen) return '';
    if (fb.correct) return sc.success;
    const ratio = formatRatio(SHEETS[chosen].denominator);
    const parts: string[] = [];
    if (!fb.covered) parts.push(`אזור המשימה חורג מקטע המפה. כדי לכסות אותו נדרשים לפחות ${formatNumber(fb.sheetsNeeded)} קטעים בקנה מידה ${ratio}.`);
    if (fb.missing.length) parts.push(`${fb.covered ? 'האזור כולו נכנס בקטע, אבל ' : ''}במפה הזו לא מוצגים: ${fb.missing.join(', ')}.`);
    // Never an empty explanation, even if the needs data changes.
    return parts.join(' ') || `מפה ${formatRatio(SHEETS[sc.target].denominator)} מכסה את האזור ומציגה את מה שהמשימה דורשת.`;
  };

  return (
    <section data-qa="scale-choose" aria-labelledby="scale-choose-title" className="mb-14">
      <h3 id="scale-choose-title" className={T1}>איזו מפה מתאימה למשימה?</h3>
      <p className={T1_INTRO}>בחנו את שלוש המפות, ובחרו את זו שמכסה את כל אזור המשימה ומציגה את מה שהמשימה דורשת.</p>
      <div className={cn('surface-elevated mt-5 p-5 sm:p-6', WORKSPACE_GRID)}>
        <div role="tablist" aria-label="תרחישים" onKeyDown={keys.onKeyDown} className="flex flex-wrap gap-2 lg:col-start-1 lg:row-start-1">
          {SCENARIOS.map((s, i) => {
            const on = s.id === scenarioId;
            const done = solved(s.id);
            return (
              <button
                key={s.id}
                ref={keys.register(s.id)}
                id={tabId(s.id)}
                type="button"
                role="tab"
                aria-selected={on}
                // Only the active panel is rendered, so only the selected tab may reference one (no dangling IDREF).
                aria-controls={on ? panelId(s.id) : undefined}
                tabIndex={on ? 0 : -1}
                onClick={() => setScenarioId(s.id)}
                className={cn(OPTION_BASE, FOCUS_RING, on ? OPTION_ACTIVE : OPTION_IDLE, 'flex items-center gap-2 whitespace-nowrap px-3 py-2 font-display text-sm font-bold text-fg')}
              >
                <ScenarioBadge n={i + 1} active={on} done={done} />
                {s.title}
                {done && <span className="sr-only"> (נפתר)</span>}
              </button>
            );
          })}
        </div>

        {/* `display: contents` keeps the panel's two cells in the workspace grid. */}
        <div role="tabpanel" id={panelId(scenarioId)} aria-labelledby={tabId(scenarioId)} className="contents">
          <div className={CONTROLS_CELL}>
            <div className={INSET}>
              <div className={T3}>המשימה</div>
              <p ref={taskRef} tabIndex={-1} className={cn('mt-1 text-base leading-relaxed text-fg', FOCUS_TARGET)}>
                {sc.task}
              </p>
            </div>
            <div>
              <div className={cn(T5, 'mb-2')}>בחנו את המפות</div>
              <SheetPicker value={sheetId} onChange={setSheetId} label="קנה מידה לבחינה" />
            </div>
            {/* Icons as in screen A's table: ✓ shown / ○ outside the sheet. */}
            <p data-qa="coverage" className="flex items-start gap-2 text-sm leading-snug text-fg" aria-live="polite">
              {preview.covered ? (
                <Check size={16} strokeWidth={2.5} aria-hidden className="mt-px shrink-0 text-brand-dark" />
              ) : (
                <Circle size={16} aria-hidden className="mt-px shrink-0 text-fg-dim" />
              )}
              <span>
                {preview.covered
                  ? `במפה ${formatRatio(sheet.denominator)}: כל אזור המשימה בתוך הקטע.`
                  : `במפה ${formatRatio(sheet.denominator)}: אזור המשימה חורג מהקטע (נדרשים לפחות ${formatNumber(preview.sheetsNeeded)} קטעים).`}
              </span>
            </p>
            <button type="button" onClick={choose} className="btn-primary h-11 self-start px-5 text-base">
              בחירה במפה {formatRatio(sheet.denominator)}
            </button>
            {fb && (
              <div data-qa="choice-feedback" className={cn('rounded-xl p-4 text-sm leading-relaxed text-fg', fb.correct ? 'bg-status-ok/10' : 'bg-status-warn/10')}>
                {/* Not live: it takes focus on every choice, which reads it (live as well would announce it twice). */}
                <p ref={feedbackRef} tabIndex={-1} className={FOCUS_TARGET}>
                  {feedbackText()}
                </p>
                {fb.correct && idx < SCENARIOS.length - 1 && (
                  <button type="button" onClick={nextScenario} className="btn-secondary mt-3 h-10 px-4 text-sm">
                    לתרחיש הבא
                  </button>
                )}
              </div>
            )}
          </div>

          <div className={MAP_CELL}>
            <div className="mb-3">
              <ViewModeToggle value={mode} onChange={setMode} />
            </div>
            <SheetViewport
              label={`${sc.title}: ${sc.task} מוצגת מפה ${formatRatio(sheet.denominator)}${shownSuffix(mode)}`}
              sheetKey={sheetId}
              groundWidthM={sheet.groundWidthM}
              base={layers.base}
              top={layers.top}
              display={layers.display}
              curtain={{ value: curtain, onChange: setCurtain, leftLabel: CURTAIN_LABELS.left, rightLabel: CURTAIN_LABELS.right }}
              attribution={layers.attribution}
              preload={preload}
              overlay={({ ppu }) => <TaskOverlay sc={sc} sheet={sheet} ppu={ppu} highlight={!!fb && !fb.correct && chosen === sheetId} />}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

type Box = { x0: number; y0: number; x1: number; y1: number };
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const around = (p: SheetPoint, r: number): Box => ({ x0: p.x - r, y0: p.y - r, x1: p.x + r, y1: p.y + r });
const pillBox = (x: number, cy: number, text: string, ppu: number): Box => {
  const { w, h } = pillSize(text, ppu);
  return { x0: x - w / 2, y0: cy - h / 2, x1: x + w / 2, y1: cy + h / 2 };
};
const within = (b: Box) => b.x0 >= 0 && b.x1 <= SHEET_UNITS && b.y0 >= 0 && b.y1 <= SHEET_UNITS;

// Task points are hollow rings (screen px), so the map's own symbol stays readable inside. A name pill's
// centre stands RING_GAP off its point: ring 14 + half its 2.5 px stroke + half the 22 px pill + 3 px air.
const RING_R = 14;
const RING_FOOT = RING_R + 2;
const RING_GAP = RING_FOOT + 11 + 3;

type Spot = { id: LandmarkId; name: string; p: SheetPoint };

/**
 * The task drawn on the active sheet: the area and the points, labelled. Points or areas only — never a line
 * between points, which on a map reads as a route (spec §6.3). A point off the sheet gets an edge pointer
 * aimed at it from the sheet centre, so "exceeds the sheet" is visible on the map.
 * After a wrong choice (`highlight`) the gap pulses: where the task needs something this map does not show
 * (`Need.at`, when inside the sheet), else the task points themselves.
 */
function TaskOverlay({ sc, sheet, ppu, highlight }: { sc: Scenario; sheet: SheetMeta; ppu: number; highlight: boolean }) {
  const spot = (id: LandmarkId): Spot => ({ id, name: LANDMARKS[id].name, p: lonLatToSheet(sheet, LANDMARKS[id]) });
  const pts = sc.points.map(spot);
  const on = pts.filter(({ p }) => insideSheet(p));
  const off = pts.filter(({ p }) => !insideSheet(p));
  const needIds = highlight ? [...new Set(sc.needs.filter((n) => !n.shownOn.includes(sheet.id)).flatMap((n) => n.at ?? []))] : [];
  const needs = needIds.map(spot).filter(({ p }) => insideSheet(p));
  const pulsePoints = highlight && needs.length === 0;
  // A need spot that is also a task point is drawn (and labelled) once, as the need.
  const plain = on.filter((o) => !needs.some((n) => n.id === o.id));
  const corners = sc.area?.map((c) => lonLatToSheet(sheet, c));
  const area: Box | null = corners
    ? { x0: Math.min(corners[0].x, corners[1].x), y0: Math.min(corners[0].y, corners[1].y), x1: Math.max(corners[0].x, corners[1].x), y1: Math.max(corners[0].y, corners[1].y) }
    : null;

  // Labels go above their point (above the task area when the point is inside it, so the pill never hides
  // what the task is about); when that would leave the sheet or cover another ring or an earlier label, below;
  // then beside the ring (east, west) — on 1:250,000 the task's rings sit a few px apart. Above/below pills
  // shift sideways only as far as it takes to stay on the sheet. Nothing free → above.
  const footprint = RING_FOOT / ppu;
  const gap = RING_GAP / ppu;
  const ringed = [...plain, ...needs];
  const placed: Box[] = [];
  const labels = [...ringed]
    .sort((a, b) => a.p.y - b.p.y)
    .map(({ id, name, p }) => {
      const half = pillSize(name, ppu).w / 2;
      const x = Math.min(SHEET_UNITS - half, Math.max(half, p.x));
      const side = (RING_FOOT + 4) / ppu + half;
      const inArea = area && p.x >= area.x0 && p.x <= area.x1;
      const above = inArea ? Math.min(p.y - gap, area.y0 - 14 / ppu) : p.y - gap;
      const below = inArea ? Math.max(p.y + gap, area.y1 + 14 / ppu) : p.y + gap;
      const blockers = [...placed, ...ringed.filter((o) => o.id !== id).map((o) => around(o.p, footprint))];
      const free = ({ x: cx, cy }: { x: number; cy: number }) => {
        const b = pillBox(cx, cy, name, ppu);
        return within(b) && !blockers.some((o) => overlaps(b, o));
      };
      const options = [
        { x, cy: above },
        { x, cy: below },
        { x: p.x + side, cy: p.y },
        { x: p.x - side, cy: p.y },
      ];
      const at = options.find(free) ?? options[0];
      placed.push(pillBox(at.x, at.cy, name, ppu));
      return { id, name, at: { x: at.x, y: p.y }, dy: (at.cy - p.y) * ppu };
    });

  return (
    <g data-qa="task-overlay">
      {area && (
        <rect
          data-qa="task-area"
          x={area.x0}
          y={area.y0}
          width={area.x1 - area.x0}
          height={area.y1 - area.y0}
          fill={ACCENT}
          fillOpacity={0.15}
          stroke={ACCENT}
          strokeWidth={sw(2, ppu)}
        />
      )}
      {plain.map(({ id, p }) => (
        <Ring key={`ring-${id}`} qa={`task-ring-${id}`} p={p} ppu={ppu} r={RING_R} pulse={pulsePoints} />
      ))}
      {needs.map(({ id, p }) => (
        <Ring key={`need-${id}`} qa={`need-ring-${id}`} p={p} ppu={ppu} r={RING_R} />
      ))}
      {labels.map(({ id, name, at, dy }) => (
        <Label key={`label-${id}`} qa={`task-label-${id}`} p={at} ppu={ppu} text={name} dy={dy} />
      ))}
      {off.map(({ id, name, p }) => (
        <OffSheetPointer key={`off-${id}`} id={id} p={p} ppu={ppu} text={name} highlight={pulsePoints} />
      ))}
    </g>
  );
}

/**
 * Arrowhead on the ray from the sheet centre towards an off-sheet point, 56 px inside the sheet edge
 * (clear of the north arrow, scale bar and zoom buttons at the corners), with the name pill behind it.
 */
function OffSheetPointer({ id, p, ppu, text, highlight }: { id: LandmarkId; p: SheetPoint; ppu: number; text: string; highlight: boolean }) {
  const c = SHEET_UNITS / 2;
  const dx = p.x - c;
  const dy = p.y - c;
  const len = Math.hypot(dx, dy);
  const u = { x: dx / len, y: dy / len };
  const t = (c - 56 / ppu) / Math.max(Math.abs(dx), Math.abs(dy));
  const tip = { x: c + dx * t, y: c + dy * t };
  const L = 14 / ppu;
  const W = 8 / ppu;
  const base = { x: tip.x - u.x * L, y: tip.y - u.y * L };
  const head = `M ${tip.x} ${tip.y} L ${base.x - u.y * W} ${base.y + u.x * W} L ${base.x + u.y * W} ${base.y - u.x * W} Z`;
  const { w, h } = pillSize(text, ppu);
  const reach = (Math.abs(u.x) * w) / 2 + (Math.abs(u.y) * h) / 2 + 5 / ppu;
  const mid = { x: tip.x - (u.x * L) / 2, y: tip.y - (u.y * L) / 2 };
  return (
    <g data-qa={`offsheet-${id}`}>
      {highlight && (
        <circle cx={mid.x} cy={mid.y} r={16 / ppu} fill="none" stroke={ACCENT} strokeWidth={sw(2.5, ppu)}
          className="animate-ping motion-reduce:animate-none" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
      )}
      <path d={head} fill={ACCENT} stroke={PAPER} strokeWidth={sw(1.5, ppu)} strokeLinejoin="round" />
      <Label qa={`task-label-${id}`} p={{ x: base.x - u.x * reach, y: base.y - u.y * reach }} ppu={ppu} text={text} dy={0} />
    </g>
  );
}

/** Square number badge (LandformsScene.tsx convention) whose number turns into a check once the scenario is solved. */
function ScenarioBadge({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold', active ? 'bg-accent text-white' : 'bg-bg-accent text-fg-muted')}>
      {done ? <Check size={15} strokeWidth={3} aria-hidden /> : n}
    </span>
  );
}
