'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  formatDistance, formatNumber, formatRatio, groundDistanceM, insideSheet, lonLatToSheet, metersPerSheetCm, readCm, readingPrecisionM,
  sheetCm, sheetToLonLat, type LatLon, type SheetPoint,
} from './geo';
import { ATTRIBUTION, SHEETS, SHEET_IDS, type SheetId, type SheetMeta } from './scaleSheets.data';
import { EXAMPLE_PAIR, LANDMARKS, LOCATE, LOCATE_RULE, ZOOM_SENTENCE, shownSuffix, type LandmarkId } from './scaleContent.data';
import { SheetViewport, type OverlayContext } from './SheetViewport';
import { MeasureOverlay } from './MeasureOverlay';
import { FOCUS_RING, INSET, OPTION_ACTIVE, OPTION_BASE, OPTION_IDLE, SheetPicker, T5, T6, useRovingKeys } from './controls';
import type { InitialView } from './useMapView';
import { CURTAIN_LABELS, asset, layersFor, preloadFor } from './layers';
import { ACCENT, INK, Label, PAPER, Ring, dash, pillSize, sw } from './overlayParts';

type LabMode = 'explore' | 'measure';
const MODES: { id: LabMode; label: string }[] = [
  { id: 'explore', label: 'חקירה' },
  { id: 'measure', label: 'מדידה' },
];
const MODE_IDS = MODES.map((m) => m.id);
const tabId = (m: LabMode) => `scale-lab-tab-${m}`;
const PANEL_ID = 'scale-lab-panel';

// The mode tabs head the controls column and the map spans both rows (controls at inline-start, map at
// inline-end), so the map starts at the top of the workspace. The map column is 600 px so the whole lab
// (p-6, the square map and the curtain slider under it) stays within LESSON_FIT_MAX_HEIGHT and fits one laptop
// screen at the lesson's shared width; the controls take the rest.
const WORKSPACE_GRID = 'grid gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,600px)] lg:grid-rows-[auto_1fr]';

const LETTERS = ['א', 'ב'] as const;
type Pair = [LatLon | null, LatLon | null];
/** Undo steps kept for the measure points (Ctrl+Z; Ctrl+Shift+Z or Ctrl+Y redoes). */
const HISTORY = 50;
const samePt = (p: LatLon | null, q: LatLon | null) => p === q || (!!p && !!q && p.lat === q.lat && p.lon === q.lon);
const samePair = (p: Pair, q: Pair) => samePt(p[0], q[0]) && samePt(p[1], q[1]);

// "הגדלה לעומת פירוט": the 1:250,000 map enlarged ×5 beside the real 1:50,000 of the same extent.
const S50 = SHEETS['50k'];
const S250 = SHEETS['250k'];
const MAGNIFY = S250.groundWidthM / S50.groundWidthM; // 5
const ZOOM_LEFT = `מפת\u00a0${formatRatio(S250.denominator)} מוגדלת פי ${MAGNIFY}`;
const ZOOM_RIGHT = `מפת\u00a0${formatRatio(S50.denominator)}`;
// Opens at ×1.6 on Tavor, where the ×5 blur and the missing details read at a glance; 0 shows the whole 12 km.
const ZOOM_VIEW = { k: 1.6 };
// The curtain handle sits at mid-height, i.e. on Tavor: at 0.5 it hid the summit.
const INITIAL_CURTAIN = 0.65;

// The map always shows the orthophoto/map curtain (the lab has no representation toggle).
const VIEW = 'compare' as const;
// Zoom on a sheet that holds a more detailed one goes a little past that sheet's extent (k = 1/ratio), so
// the visible square can come to lie inside it — that hands over to the detailed sheet.
const PAST_CHILD = 1.2;
const OUT_STEP = 1.5;

const RING_PX = 18;
const HORIZONTAL_NOTE = 'זהו המרחק האופקי בקו ישר. בדרך מתפתלת או במעלה מדרון המרחק בפועל ארוך יותר.';
const RULER_NOTE = 'הסרגל מראה ס״מ של דף מודפס ברוחב 24 ס״מ, לא של המסך.';
/** Quiet time after the last change before the new distance is announced (drags and key repeats settle first). */
const ANNOUNCE_MS = 700;

/** "קנה מידה" — one map, two modes: explore (scale, layer, locate, enlargement vs detail) and measure. */
export function ScaleLab() {
  const [mode, setMode] = useState<LabMode>('explore');
  const [sheetId, setSheetId] = useState<SheetId>('50k');
  // The view a zoom hand-over opens the new sheet at (null: a picked sheet opens whole, with the scale morph).
  const [entry, setEntry] = useState<InitialView | null>(null);
  const [curtain, setCurtain] = useState(INITIAL_CURTAIN);
  const [zoomCompare, setZoomCompare] = useState(false);
  const [zoomCurtain, setZoomCurtain] = useState(INITIAL_CURTAIN);
  const [locate, setLocate] = useState<LandmarkId | null>(null);
  const [pts, setPts] = useState<Pair>([null, null]);
  const [hist, setHist] = useState<{ past: Pair[]; future: Pair[] }>({ past: [], future: [] });
  // Animation counters: a point's pulse bumps when it lands somewhere new (click, button, undo), the
  // segment's when A–B first becomes whole; drags and arrow keys move without replaying them.
  const [fx, setFx] = useState<{ pulse: [number, number]; segment: number }>({ pulse: [0, 0], segment: 0 });
  const preload = useMemo(() => preloadFor(SHEET_IDS), []);
  const keys = useRovingKeys(MODE_IDS, mode, (m) => switchMode(m));
  // The visible centre of the map, for "הוספת נקודה במרכז המפה" (kept current by the overlay render).
  const centerRef = useRef<SheetPoint>({ x: 500, y: 500 });

  const sheet = SHEETS[sheetId];
  const D = sheet.denominator;
  const km = formatNumber(sheet.groundWidthM / 1000, 1);
  const idx = SHEET_IDS.indexOf(sheetId);
  const child = idx > 0 ? SHEETS[SHEET_IDS[idx - 1]] : null;
  const parent = idx < SHEET_IDS.length - 1 ? SHEETS[SHEET_IDS[idx + 1]] : null;
  const layers = layersFor(sheet, VIEW);
  const comparing = mode === 'explore' && zoomCompare;

  function pickSheet(id: SheetId) {
    setEntry(null);
    setSheetId(id);
  }

  // Zooming into the detailed sheet's extent opens it at the same ground view (no morph: nothing jumps).
  const childRatio = child ? child.groundWidthM / sheet.groundWidthM : 0;
  const childO = (1000 - childRatio * 1000) / 2;
  const zoomInto =
    child && !comparing
      ? {
          rect: [childO, childO, 1000 - childO, 1000 - childO] as [number, number, number, number],
          minK: 1 / childRatio,
          onEnter: ({ k, center }: { k: number; center: SheetPoint }) => {
            setEntry({ k: k * childRatio, center: { x: (center.x - childO) / childRatio, y: (center.y - childO) / childRatio } });
            setSheetId(child.id);
          },
        }
      : undefined;
  // Zooming out of a whole sheet opens the wider one at the same ground view; a − / button step then zooms
  // out one step (the wheel just keeps zooming from there).
  const zoomOutPast =
    parent && !comparing
      ? (step: boolean) => {
          const r = sheet.groundWidthM / parent.groundWidthM;
          const o = (1000 - r * 1000) / 2;
          const c = centerRef.current;
          setEntry({ k: 1 / r, center: { x: o + c.x * r, y: o + c.y * r }, thenZoom: step ? 1 / OUT_STEP : undefined });
          setSheetId(parent.id);
        }
      : undefined;

  function switchMode(m: LabMode) {
    setMode(m);
    setEntry(null);
    // The comparison belongs to explore; measuring needs one of the three sheets.
    if (m !== 'explore') setZoomCompare(false);
  }

  // Measure: points live in lat/lon, so a scale switch keeps them on the ground.
  const sp = pts.map((p) => (p ? lonLatToSheet(sheet, p) : null)) as [SheetPoint | null, SheetPoint | null];
  const inside = sp.map((q) => q !== null && insideSheet(q));
  const bothInside = inside[0] && inside[1];
  const animateChange = (prev: Pair, next: Pair) =>
    setFx((f) => ({
      pulse: [0, 1].map((i) => (next[i] && !samePt(prev[i], next[i]) ? f.pulse[i] + 1 : f.pulse[i])) as [number, number],
      segment: next[0] && next[1] && !(prev[0] && prev[1]) ? f.segment + 1 : f.segment,
    }));
  const record = () => setHist((h) => ({ past: [...h.past, pts].slice(-HISTORY), future: [] }));
  // One discrete step: one undo entry, animated.
  const commit = (next: Pair) => {
    if (samePair(pts, next)) return;
    record();
    animateChange(pts, next);
    setPts(next);
  };
  const place = (p: SheetPoint) => {
    const ll = sheetToLonLat(sheet, p);
    const [a, b] = pts;
    if (!a) return commit([ll, b]);
    if (!b) return commit([a, ll]);
    // Both placed: the click moves the nearer point.
    const [qa, qb] = [lonLatToSheet(sheet, a), lonLatToSheet(sheet, b)];
    commit(Math.hypot(qa.x - p.x, qa.y - p.y) <= Math.hypot(qb.x - p.x, qb.y - p.y) ? [ll, b] : [a, ll]);
  };
  // A drag, a key press or a held arrow key records one undo step when it starts.
  const move = (which: 0 | 1, p: SheetPoint, start: boolean) => {
    const ll = sheetToLonLat(sheet, p);
    if (start) record();
    setPts((cur) => (which === 0 ? [ll, cur[1]] : [cur[0], ll]));
  };
  const undo = () => {
    const prev = hist.past[hist.past.length - 1];
    if (!prev) return;
    setHist({ past: hist.past.slice(0, -1), future: [pts, ...hist.future] });
    animateChange(pts, prev);
    setPts(prev);
  };
  const redo = () => {
    const next = hist.future[0];
    if (!next) return;
    setHist({ past: [...hist.past, pts], future: hist.future.slice(1) });
    animateChange(pts, next);
    setPts(next);
  };
  // Scoped to the lab (focus inside it), so other scenes keep their own Ctrl+Z. e.code, not e.key, so it
  // also works on the Hebrew layout (where that key types ז).
  const onUndoKeys = (e: KeyboardEvent) => {
    if (mode !== 'measure' || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    const isZ = e.code === 'KeyZ';
    if (!isZ && e.code !== 'KeyY') return;
    e.preventDefault();
    if (isZ && !e.shiftKey) undo();
    else redo();
  };

  let label: string;
  if (comparing) {
    label = `השוואה: מפת ${formatRatio(S250.denominator)} מוגדלת פי ${MAGNIFY} מול מפת ${formatRatio(S50.denominator)} של אותו תחום`;
  } else if (mode === 'measure') {
    label = `מדידה במפה ${formatRatio(D)} סביב הר תבור, ${km} על ${km} ק״מ. לחיצה מסמנת נקודה${shownSuffix(VIEW)}`;
  } else {
    label = `קטע מפה בקנה מידה ${formatRatio(D)} סביב הר תבור, ${km} על ${km} ק״מ${shownSuffix(VIEW)}`;
  }

  const located = locate ? lonLatToSheet(sheet, LANDMARKS[locate]) : null;
  const locateLabel = locate ? (LOCATE.find((l) => l.id === locate)?.label ?? LANDMARKS[locate].name) : '';
  // The first coarser sheet that shows the located place (named in the outside line).
  const cover = locate ? SHEET_IDS.slice(idx + 1).map((id) => SHEETS[id]).find((s) => insideSheet(lonLatToSheet(s, LANDMARKS[locate]))) : undefined;
  // Which of the three sheets show the located place (the coverage row under the locate buttons).
  const coverage = locate ? SHEET_IDS.filter((id) => insideSheet(lonLatToSheet(SHEETS[id], LANDMARKS[locate]))) : [];

  return (
    <section data-qa="scale-lab" aria-label="מעבדת קנה מידה" onKeyDown={onUndoKeys}>
      <div className={cn('surface-elevated p-5 sm:p-6', WORKSPACE_GRID)}>
        <div role="tablist" aria-label="מצב עבודה" onKeyDown={keys.onKeyDown} className="flex gap-2 lg:col-start-1 lg:row-start-1">
          {MODES.map((m) => {
            const on = m.id === mode;
            return (
              <button
                key={m.id}
                ref={keys.register(m.id)}
                id={tabId(m.id)}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={on ? PANEL_ID : undefined}
                tabIndex={on ? 0 : -1}
                onClick={() => switchMode(m.id)}
                className={cn(OPTION_BASE, FOCUS_RING, on ? OPTION_ACTIVE : OPTION_IDLE, 'flex-1 px-4 py-2 text-center font-display text-base font-bold text-fg')}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id={PANEL_ID} aria-labelledby={tabId(mode)} className="flex flex-col gap-5 lg:col-start-1 lg:row-start-2 lg:justify-between">
          {!comparing && (
            <div>
              <div className={cn(T5, 'mb-2')}>קנה מידה</div>
              <SheetPicker value={sheetId} onChange={pickSheet} label="קנה מידה של המפה" />
            </div>
          )}
          {mode === 'explore' ? (
            <ExplorePanel
              sheet={sheet}
              comparing={comparing}
              onCompare={(on) => {
                setEntry(null);
                setZoomCompare(on);
              }}
              locate={locate}
              locateLabel={locateLabel}
              locatedInside={located !== null && insideSheet(located)}
              coverDenominator={cover?.denominator ?? null}
              coverage={coverage}
              sheetId={sheetId}
              onPickSheet={pickSheet}
              onLocate={setLocate}
            />
          ) : (
            <MeasurePanel
              sheet={sheet}
              pts={pts}
              inside={inside as [boolean, boolean]}
              onCenter={() => place(centerRef.current)}
              onExample={() => commit([LANDMARKS[EXAMPLE_PAIR[0]], LANDMARKS[EXAMPLE_PAIR[1]]])}
              onClear={() => commit([null, null])}
              canUndo={hist.past.length > 0}
              onUndo={undo}
            />
          )}
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <SheetViewport
            label={label}
            sheetKey={comparing ? 'zoom-compare' : sheetId}
            initialView={comparing ? ZOOM_VIEW : (entry ?? undefined)}
            morph={!entry || comparing}
            maxK={zoomInto ? zoomInto.minK * PAST_CHILD : undefined}
            zoomInto={zoomInto}
            onZoomOutPast={zoomOutPast}
            groundWidthM={comparing ? S50.groundWidthM : sheet.groundWidthM}
            base={comparing ? { key: '250k-map-x5', src: asset(S250.map.src), magnify: MAGNIFY } : layers.base}
            top={comparing ? { key: '50k-map', src: asset(S50.map.src) } : layers.top}
            display={comparing ? 'curtain' : layers.display}
            curtain={
              comparing
                ? { value: zoomCurtain, onChange: setZoomCurtain, leftLabel: ZOOM_LEFT, rightLabel: ZOOM_RIGHT }
                : { value: curtain, onChange: setCurtain, leftLabel: CURTAIN_LABELS.left, rightLabel: CURTAIN_LABELS.right }
            }
            attribution={comparing ? ATTRIBUTION.map : layers.attribution}
            showFooter={false}
            zoomHint
            preload={preload}
            onPick={mode === 'measure' ? place : undefined}
            overlay={(ctx) => {
              centerRef.current = ctx.center;
              if (comparing) return null;
              if (mode === 'measure') {
                const exact = bothInside ? sheetCm(groundDistanceM(pts[0]!, pts[1]!), D) : null;
                return (
                  <MeasureOverlay
                    a={inside[0] ? sp[0] : null}
                    b={inside[1] ? sp[1] : null}
                    cm={exact}
                    reading={exact !== null ? readCm(exact) : null}
                    ctx={ctx}
                    letters={LETTERS}
                    onMove={move}
                    pulse={fx.pulse}
                    segment={fx.segment}
                    names={[0, 1].map((i) => `נקודה ${LETTERS[i]}. החיצים מזיזים מילימטר אחד על הדף; עם Shift – סנטימטר.`) as [string, string]}
                  />
                );
              }
              const { ppu } = ctx;
              const extentLabel = child ? `תחום ${formatRatio(child.denominator)}` : '';
              const locateDy = located && locate ? locateLabelDy(located, locateLabel, ppu, child ? (child.groundWidthM / sheet.groundWidthM) * 1000 : null, extentLabel) : 0;
              return (
                <>
                  {child && (
                    <ChildExtent ratio={child.groundWidthM / sheet.groundWidthM} ppu={ppu} label={extentLabel} onOpen={() => pickSheet(child.id)} />
                  )}
                  {located && locate && insideSheet(located) && (
                    <g data-qa="locate-marker">
                      <Ring p={located} ppu={ppu} r={RING_PX} strong />
                      <Label p={located} ppu={ppu} text={locateLabel} dy={locateDy} qa="locate-label" strong />
                    </g>
                  )}
                  {located && locate && !inView(located, ctx) && (
                    <OffViewPointer p={located} ctx={ctx} text={insideSheet(located) ? locateLabel : `${locateLabel} · מחוץ לדף`} />
                  )}
                </>
              );
            }}
          />
        </div>
      </div>
    </section>
  );
}

function ExplorePanel({
  sheet, comparing, onCompare, locate, locateLabel, locatedInside, coverDenominator, coverage, sheetId, onPickSheet, onLocate,
}: {
  sheet: SheetMeta;
  comparing: boolean;
  onCompare: (on: boolean) => void;
  locate: LandmarkId | null;
  locateLabel: string;
  locatedInside: boolean;
  coverDenominator: number | null;
  coverage: readonly SheetId[];
  sheetId: SheetId;
  onPickSheet: (id: SheetId) => void;
  onLocate: (id: LandmarkId | null) => void;
}) {
  const D = sheet.denominator;
  const km = formatNumber(sheet.groundWidthM / 1000, 1);
  const groundPerCm = `${formatDistance(metersPerSheetCm(D))} בשטח`;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const back = () => {
    onCompare(false);
    // "חזרה למפות" unmounts with the comparison; focus moves to the toggle that opened it.
    toggleRef.current?.focus();
  };
  return (
    <>
      {comparing ? (
        <div data-qa="zoom-compare" className="flex flex-col gap-3">
          <p className="text-base leading-relaxed text-fg">
            משמאל לקו: {ZOOM_LEFT}. מימין לקו: {ZOOM_RIGHT} של אותו תחום. גררו את הקו והשוו.
          </p>
          <p className="text-base leading-relaxed text-black">
            כשמגדילים מפה, הכבישים, הסמלים והכיתובים נראים גדולים יותר, אבל רמת הפירוט נשארת כפי שהייתה במקור.
            פרט שהושמט מהמפה כדי לשמור על קריאותה לא יופיע בעקבות ההגדלה.
          </p>
          <p className="text-base leading-relaxed text-black">
            לעומת זאת, מפה שהוכנה בקנה מידה גדול יותר יכולה להציג יותר פרטים באותו אזור.
            הזיזו את הקו וחפשו הבדלים בדרכים ובקווי הגובה: האם נוסף מידע, או שרק הסימנים גדלו?
          </p>
          <p data-qa="zoom-sentence" className={cn(INSET, 'font-display text-base font-bold leading-relaxed text-fg')}>
            {ZOOM_SENTENCE}
          </p>
        </div>
      ) : (
        <>
          <dl className={cn(INSET, 'grid gap-2.5')} data-qa="explore-readouts">
            <ReadoutRow
              term="הדף מכסה"
              value={
                <>
                  {/* The product is an LTR isolate (a × b never reverses); the unit stays in the RTL run. */}
                  <bdi dir="ltr">{`${km} × ${km}`}</bdi> ק״מ
                </>
              }
            />
            <ReadoutRow term="1 ס״מ על הדף מייצג" value={groundPerCm} />
          </dl>
          {/* One concise announcement per sheet switch (the list above is not live). */}
          <p className="sr-only" aria-live="polite" data-qa="explore-live">
            {`מפה ${formatRatio(D)}: הדף מכסה ${km} על ${km} ק״מ, וכל ס״מ עליו הוא ${groundPerCm}.`}
          </p>

          <div>
            <div id="scale-lab-locate" className={cn(T5, 'mb-1')}>איתור במפה</div>
            <p className={cn(T6, 'mb-2')}>בחרו מקום ובדקו באילו מפות הוא מופיע.</p>
            <div role="group" aria-labelledby="scale-lab-locate" className="grid grid-cols-3 gap-2">
              {LOCATE.map((l) => {
                const on = locate === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onLocate(on ? null : l.id)}
                    className={cn(OPTION_BASE, FOCUS_RING, on ? OPTION_ACTIVE : OPTION_IDLE, 'h-10 px-3 py-1.5 font-display text-sm font-bold text-fg')}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
            {locate && <LocateCoverage name={locateLabel} coverage={coverage} sheetId={sheetId} onPick={onPickSheet} />}
            {/* Live region stays mounted; empty it takes no space. */}
            <p className={cn(T6, 'mt-2 empty:mt-0')} aria-live="polite" data-qa="locate-line">
              {locate ? (locatedInside ? `${locateLabel}: סומן על המפה.` : outsideLine(locateLabel, coverDenominator)) : ''}
            </p>
            {locate && (
              <p data-qa="locate-rule" className="mt-1 font-display text-sm font-bold text-fg">
                {LOCATE_RULE}
              </p>
            )}
          </div>
        </>
      )}
      {/* The toggle keeps its place in both states (focus survives); "חזרה למפות" is the explicit way back. */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          ref={toggleRef}
          type="button"
          aria-pressed={comparing}
          onClick={() => onCompare(!comparing)}
          data-qa="zoom-compare-toggle"
          className={cn(OPTION_BASE, FOCUS_RING, comparing ? OPTION_ACTIVE : OPTION_IDLE, 'h-10 flex-1 px-4 text-center font-display text-sm font-bold text-fg')}
        >
          הגדלה לעומת פירוט
        </button>
        {comparing && (
          <button type="button" onClick={back} className="btn-secondary h-10 flex-1 px-4 text-sm">
            חזרה למפות
          </button>
        )}
      </div>
    </>
  );
}

function MeasurePanel({
  sheet, pts, inside, onCenter, onExample, onClear, canUndo, onUndo,
}: {
  sheet: SheetMeta;
  pts: Pair;
  inside: [boolean, boolean];
  onCenter: () => void;
  onExample: () => void;
  onClear: () => void;
  canUndo: boolean;
  onUndo: () => void;
}) {
  const D = sheet.denominator;
  const precision = readingPrecisionM(D);
  const groundM = pts[0] && pts[1] ? groundDistanceM(pts[0], pts[1]) : null;
  const both = inside[0] && inside[1];
  const reading = groundM !== null && both ? readCm(sheetCm(groundM, D)) : null;
  const ground = groundM !== null ? formatDistance(groundM, precision) : null;
  const out = [0, 1].filter((i) => pts[i] !== null && !inside[i]).map((i) => LETTERS[i]);
  const outsideNote = out.length === 2 ? 'נקודה א ונקודה ב מחוץ לתחום המפה.' : out.length === 1 ? `נקודה ${out[0]} מחוץ לתחום המפה.` : '';
  const relation = `במפה ${formatRatio(D)}, כל ס״מ על הדף שווה ל־${formatDistance(metersPerSheetCm(D))} בשטח.`;

  // Announced once the points rest (not on every drag frame or key repeat).
  const summary = ground !== null ? `המרחק בין נקודה א לנקודה ב: ${ground} בשטח${reading !== null ? `, ${formatNumber(reading, 1)} ס״מ על הדף` : ''}.` : '';
  const [live, setLive] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setLive(summary), ANNOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [summary]);

  return (
    <>
      <p className={T6} data-qa="measure-hint">
        לחצו על המפה לסימון נקודה א ואז נקודה ב. לחיצה נוספת מזיזה את הנקודה הקרובה. אפשר גם לגרור נקודה או להזיז אותה בחיצים. <bdi dir="ltr">Ctrl+Z</bdi> מבטל את הפעולה האחרונה.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onCenter} className="btn-secondary h-10 px-4 text-sm">
          הוספת נקודה במרכז המפה
        </button>
        <button type="button" onClick={onExample} className="btn-secondary h-10 px-4 text-sm">
          הצג דוגמה
        </button>
        <button type="button" onClick={onClear} disabled={!pts[0] && !pts[1]} className="btn-secondary h-10 px-4 text-sm disabled:opacity-50">
          ניקוי נקודות
        </button>
        {/* aria-disabled, not disabled: a disabled button drops focus out of the lab, and Ctrl+Z with it. */}
        <button
          type="button"
          onClick={canUndo ? onUndo : undefined}
          aria-disabled={!canUndo}
          aria-keyshortcuts="Control+Z"
          data-qa="measure-undo"
          className="btn-secondary h-10 px-4 text-sm aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
          ביטול פעולה
        </button>
      </div>

      {/* data-points: the stored lat/lons (QA reads them to check the readout). */}
      <div className={INSET} data-qa="measure-result" data-points={JSON.stringify(pts)}>
        {ground !== null ? (
          <>
            <p data-qa="result-ground" className="font-display text-2xl font-bold leading-tight text-fg tabular-nums">
              {ground} <span className="text-base font-semibold text-fg-muted">בשטח</span>
            </p>
            <p data-qa="result-sheet" className={cn('mt-1', reading !== null ? 'font-display text-lg font-bold text-fg tabular-nums' : 'text-sm text-fg')}>
              {reading !== null ? `${formatNumber(reading, 1)} ס״מ על הדף` : 'על הדף הזה אי אפשר למדוד את המרחק.'}
            </p>
          </>
        ) : (
          <p data-qa="result-empty" className="text-base text-fg">
            {pts[0] ? 'סמנו את נקודה ב.' : 'סמנו שתי נקודות על המפה.'}
          </p>
        )}
        <p data-qa="outside-note" className={cn(T6, 'mt-1 empty:hidden')}>
          {outsideNote}
        </p>
        <p data-qa="result-relation" className={cn(T6, 'mt-2')}>
          {relation}
        </p>
      </div>
      <p className="sr-only" aria-live="polite" data-qa="measure-live">
        {live}
      </p>

      <details data-qa="calc-details" className="group">
        <summary className={cn('cursor-pointer select-none rounded-lg text-sm font-display font-bold text-fg', FOCUS_RING)}>פרטי החישוב</summary>
        <div className="mt-2 grid gap-2 text-sm leading-relaxed text-fg">
          {reading !== null && ground !== null ? (
            <ol className="grid gap-1" data-qa="calc-chain">
              <ChainRow term="על הדף" value={`${formatNumber(reading, 1)} ס״מ`} />
              <ChainRow
                term="כפול מכנה קנה המידה"
                value={
                  <>
                    <Ltr>{`${formatNumber(reading, 1)} × ${formatNumber(D)} = ${formatNumber(reading * D)}`}</Ltr> ס״מ
                  </>
                }
              />
              <ChainRow term="בשטח" value={`${ground} (±${formatDistance(precision)})`} />
            </ol>
          ) : (
            <p>החישוב יופיע אחרי שתסמנו שתי נקודות בתוך המפה.</p>
          )}
          <p className="text-fg-muted">{`מילימטר אחד על הדף הוא ${formatDistance(precision)} בשטח, לכן המרחק מעוגל ל־${formatDistance(precision)}.`}</p>
          <p className="text-fg-muted">{HORIZONTAL_NOTE}</p>
          <p className="text-fg-muted">{RULER_NOTE}</p>
        </div>
      </details>
    </>
  );
}

/**
 * Where the locate name pill goes (screen px below the point; negative = above): above the ring, unless it
 * would cover the extent frame's label or leave the sheet — then below it.
 */
function locateLabelDy(p: SheetPoint, text: string, ppu: number, extentSide: number | null, extentText: string): number {
  const off = RING_PX + 16;
  const box = (c: SheetPoint, t: string) => {
    const { w, h } = pillSize(t, ppu);
    return { x0: c.x - w / 2, x1: c.x + w / 2, y0: c.y - h / 2, y1: c.y + h / 2 };
  };
  const above = box({ x: p.x, y: p.y - off / ppu }, text);
  const pad = 4 / ppu;
  let clash = above.y0 < 0;
  if (extentSide !== null) {
    const e = box({ x: 500, y: (1000 - extentSide) / 2 - EXTENT_LABEL_DY / ppu }, extentText);
    clash ||= above.x0 < e.x1 + pad && above.x1 > e.x0 - pad && above.y0 < e.y1 + pad && above.y1 > e.y0 - pad;
  }
  return clash ? off : -off;
}

const EXTENT_LABEL_DY = 14;

/** Names the covering scale rather than saying "a smaller scale" (learners read the bigger number as bigger). */
function outsideLine(name: string, coverDenominator: number | null): string {
  return coverDenominator !== null
    ? `${name} מחוץ לתחום המפה. עברו ל־${formatRatio(coverDenominator)}, שמכסה שטח רחב יותר.`
    : `${name} מחוץ לתחום של כל שלוש המפות.`;
}

/**
 * The located place on each of the three sheets, in the picker's order (so each cell sits under its sheet):
 * ✓ on the sheet / ✗ off it. A cell opens that sheet; the shown one is outlined.
 */
function LocateCoverage({ name, coverage, sheetId, onPick }: { name: string; coverage: readonly SheetId[]; sheetId: SheetId; onPick: (id: SheetId) => void }) {
  return (
    <ul data-qa="locate-coverage" aria-label={`${name} בשלוש המפות`} className="mt-2 grid grid-cols-3 gap-2">
      {SHEET_IDS.map((id) => {
        const on = coverage.includes(id);
        const shown = id === sheetId;
        const ratio = formatRatio(SHEETS[id].denominator);
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => onPick(id)}
              aria-current={shown || undefined}
              aria-label={`${ratio}: ${on ? 'מופיע במפה' : 'מחוץ לדף'}`}
              data-qa={`locate-coverage-${id}`}
              data-on={on}
              className={cn(
                'flex w-full flex-col items-center rounded-lg border px-2 py-1 text-center transition-colors duration-200 ease-snap',
                FOCUS_RING,
                shown ? 'border-accent bg-accent/10' : 'border-border-subtle bg-bg-elevated hover:border-brand/30',
              )}
            >
              <span className="font-display text-sm font-bold tabular-nums text-fg">{ratio}</span>
              <span className={cn('flex items-center gap-1 text-[13px] font-semibold', on ? 'text-brand-dark' : 'text-fg-dim')}>
                <CoverMark on={on} />
                {on ? 'מופיע' : 'מחוץ לדף'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function CoverMark({ on }: { on: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {on ? <path d="M2.5 6.5l2.5 2.5 4.5-5.5" /> : <path d="M3 3l6 6M9 3l-6 6" />}
    </svg>
  );
}

/** Half the visible side in sheet units; `p` is in view when it lies within that of the view centre. */
const viewHalf = (ctx: OverlayContext) => 500 / ctx.k;
function inView(p: SheetPoint, ctx: OverlayContext): boolean {
  const h = viewHalf(ctx);
  return Math.abs(p.x - ctx.center.x) <= h && Math.abs(p.y - ctx.center.y) <= h;
}

/** Inset of the pointer tip from the visible edge, in screen px. */
const POINTER_INSET = 44;

/**
 * A place outside the visible square: an ember arrow on the view's edge, pointing from the view centre
 * towards it, with its name on the inner side. North stays up, so the arrow gives the true direction.
 */
function OffViewPointer({ p, ctx, text }: { p: SheetPoint; ctx: OverlayContext; text: string }) {
  const { ppu, center: c } = ctx;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const len = Math.hypot(dx, dy);
  const [ux, uy] = [dx / len, dy / len];
  const half = viewHalf(ctx) - POINTER_INSET / ppu;
  const t = Math.min(Math.abs(dx) > 1e-9 ? half / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-9 ? half / Math.abs(dy) : Infinity);
  const tip = { x: c.x + dx * t, y: c.y + dy * t };
  const u = (px: number) => px / ppu;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const { w, h } = pillSize(text, ppu);
  // The name pill sits behind the arrow's tail, its near edge 8 px past the tail end.
  const back = u(40 + 8) + (Math.abs(ux) * w) / 2 + (Math.abs(uy) * h) / 2;
  const at = { x: tip.x - ux * back, y: tip.y - uy * back };
  return (
    <g data-qa="locate-pointer" aria-hidden>
      <g transform={`translate(${tip.x} ${tip.y}) rotate(${angle})`}>
        <path d={`M${-u(40)} 0H${-u(10)}`} stroke={PAPER} strokeWidth={sw(10, ppu)} strokeLinecap="round" />
        <path d={`M${-u(40)} 0H${-u(14)}`} stroke={ACCENT} strokeWidth={sw(5.5, ppu)} strokeLinecap="round" />
        <path d={`M0 0L${-u(20)} ${-u(13)}V${u(13)}Z`} fill={ACCENT} stroke={PAPER} strokeWidth={sw(2.5, ppu)} strokeLinejoin="round" />
      </g>
      <Label p={at} ppu={ppu} text={text} dy={0} qa="locate-pointer-label" strong />
    </g>
  );
}

/** Extent of the next more detailed sheet: an ink long-dash frame; clicking it opens that sheet. */
function ChildExtent({ ratio, ppu, label, onOpen }: { ratio: number; ppu: number; label: string; onOpen: () => void }) {
  const side = ratio * 1000;
  const o = (1000 - side) / 2;
  return (
    <g data-qa="child-extent">
      <rect data-qa="child-extent-frame" x={o} y={o} width={side} height={side} fill="none" stroke={INK} strokeWidth={sw(2, ppu)} strokeDasharray={dash(ppu, 10, 6)} />
      <rect
        x={o}
        y={o}
        width={side}
        height={side}
        fill="transparent"
        aria-hidden
        style={{ pointerEvents: 'auto', cursor: 'zoom-in' }}
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      />
      <Label p={{ x: 500, y: o }} ppu={ppu} text={label} dy={-EXTENT_LABEL_DY} qa="child-extent-label" />
    </g>
  );
}

function ReadoutRow({ term, value }: { term: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={T6}>{term}</dt>
      <dd className="font-display font-bold tabular-nums text-fg">{value}</dd>
    </div>
  );
}

/**
 * Equations read left to right, as math is written in Hebrew texts; the sentence around stays RTL.
 * Each Hebrew unit gets its own isolate, so it cannot pull the following operators into an RTL run.
 */
function Ltr({ children }: { children: string }) {
  const parts = children.split(/([֐-׿]+)/);
  return <bdi dir="ltr">{parts.map((part, i) => (i % 2 ? <bdi key={i}>{part}</bdi> : part))}</bdi>;
}

function ChainRow({ term, value }: { term: string; value: ReactNode }) {
  return (
    <li className="flex items-baseline gap-3">
      <span className={cn(T6, 'w-24 shrink-0')}>{term}</span>
      <span className="font-display font-bold tabular-nums text-fg">{value}</span>
    </li>
  );
}

