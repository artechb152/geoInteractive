'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  formatDistance, formatNumber, formatRatio, groundDistanceM, insideSheet, lonLatToSheet, metersPerSheetCm, readCm, readingPrecisionM,
  sheetCm, sheetToLonLat, type LatLon, type SheetPoint,
} from './geo';
import { ATTRIBUTION, SHEETS, SHEET_IDS, type SheetId, type SheetMeta } from './scaleSheets.data';
import { EXAMPLE_PAIR, LANDMARKS, LOCATE, ZOOM_SENTENCE, shownSuffix, type LandmarkId } from './scaleContent.data';
import { SheetViewport } from './SheetViewport';
import { MeasureOverlay } from './MeasureOverlay';
import { FOCUS_RING, INSET, OPTION_ACTIVE, OPTION_BASE, OPTION_IDLE, SheetPicker, T5, T6, ViewModeToggle, useRovingKeys, type ViewMode } from './controls';
import { CURTAIN_LABELS, asset, layersFor, preloadFor } from './layers';
import { INK, Label, Ring, dash, pillSize, sw } from './overlayParts';

type LabMode = 'explore' | 'measure';
const MODES: { id: LabMode; label: string }[] = [
  { id: 'explore', label: 'חקירה' },
  { id: 'measure', label: 'מדידה' },
];
const MODE_IDS = MODES.map((m) => m.id);
const tabId = (m: LabMode) => `scale-lab-tab-${m}`;
const PANEL_ID = 'scale-lab-panel';

// The mode tabs head the controls column and the map spans both rows (controls at inline-start, map at
// inline-end), so the map starts at the top of the workspace.
const WORKSPACE_GRID = 'grid gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-[auto_1fr]';

const LETTERS = ['א', 'ב'] as const;
type Pair = [LatLon | null, LatLon | null];

// "הגדלה לעומת פירוט": the 1:250,000 map enlarged ×5 beside the real 1:50,000 of the same extent.
const S50 = SHEETS['50k'];
const S250 = SHEETS['250k'];
const MAGNIFY = S250.groundWidthM / S50.groundWidthM; // 5
const ZOOM_LEFT = `${formatRatio(S250.denominator)} מוגדלת פי ${MAGNIFY}`;
const ZOOM_RIGHT = formatRatio(S50.denominator);
// Opens at ×1.6 on Tavor, where the ×5 blur and the missing details read at a glance; 0 shows the whole 12 km.
const ZOOM_VIEW = { k: 1.6 };
// The curtain handle sits at mid-height, i.e. on Tavor: at 0.5 it hid the summit.
const INITIAL_CURTAIN = 0.65;

const RING_PX = 14;
const HORIZONTAL_NOTE = 'זהו מרחק אופקי בקו ישר. אורך דרך מתפתלת, או הליכה במעלה מדרון, ארוכים ממנו.';
const RULER_NOTE = 'הסרגל מודד ס״מ על דף המפה המודפס (24 ס״מ), לא על המסך.';
/** Quiet time after the last change before the new distance is announced (drags and key repeats settle first). */
const ANNOUNCE_MS = 700;

/** "קנה מידה" — one map, two modes: explore (scale, layer, locate, enlargement vs detail) and measure. */
export function ScaleLab() {
  const [mode, setMode] = useState<LabMode>('explore');
  const [sheetId, setSheetId] = useState<SheetId>('50k');
  const [view, setView] = useState<ViewMode>('map');
  const [curtain, setCurtain] = useState(INITIAL_CURTAIN);
  const [zoomCompare, setZoomCompare] = useState(false);
  const [zoomCurtain, setZoomCurtain] = useState(INITIAL_CURTAIN);
  const [locate, setLocate] = useState<LandmarkId | null>(null);
  const [pts, setPts] = useState<Pair>([null, null]);
  const preload = useMemo(() => preloadFor(SHEET_IDS), []);
  const keys = useRovingKeys(MODE_IDS, mode, (m) => switchMode(m));
  // The visible centre of the map, for "הוספת נקודה במרכז המפה" (kept current by the overlay render).
  const centerRef = useRef<SheetPoint>({ x: 500, y: 500 });

  const sheet = SHEETS[sheetId];
  const D = sheet.denominator;
  const km = formatNumber(sheet.groundWidthM / 1000, 1);
  const idx = SHEET_IDS.indexOf(sheetId);
  const child = idx > 0 ? SHEETS[SHEET_IDS[idx - 1]] : null;
  const layers = layersFor(sheet, view);
  const comparing = mode === 'explore' && zoomCompare;

  function switchMode(m: LabMode) {
    setMode(m);
    // The comparison belongs to explore; measuring needs one of the three sheets.
    if (m !== 'explore') setZoomCompare(false);
  }

  // Measure: points live in lat/lon, so a scale switch keeps them on the ground.
  const sp = pts.map((p) => (p ? lonLatToSheet(sheet, p) : null)) as [SheetPoint | null, SheetPoint | null];
  const inside = sp.map((q) => q !== null && insideSheet(q));
  const bothInside = inside[0] && inside[1];
  const place = (p: SheetPoint) => {
    const ll = sheetToLonLat(sheet, p);
    setPts(([a, b]) => {
      if (!a) return [ll, b];
      if (!b) return [a, ll];
      // Both placed: the click moves the nearer point.
      const [qa, qb] = [lonLatToSheet(sheet, a), lonLatToSheet(sheet, b)];
      return Math.hypot(qa.x - p.x, qa.y - p.y) <= Math.hypot(qb.x - p.x, qb.y - p.y) ? [ll, b] : [a, ll];
    });
  };
  const move = (which: 0 | 1, p: SheetPoint) => {
    const ll = sheetToLonLat(sheet, p);
    setPts((cur) => (which === 0 ? [ll, cur[1]] : [cur[0], ll]));
  };

  let label: string;
  if (comparing) {
    label = `השוואה: מפת ${formatRatio(S250.denominator)} מוגדלת פי ${MAGNIFY} מול מפת ${formatRatio(S50.denominator)} של אותו תחום${shownSuffix('compare')}`;
  } else if (mode === 'measure') {
    label = `מדידה במפה ${formatRatio(D)} סביב הר תבור, ${km} על ${km} ק״מ. לחיצה מסמנת נקודה${shownSuffix(view)}`;
  } else {
    label = `קטע מפה בקנה מידה ${formatRatio(D)} סביב הר תבור, ${km} על ${km} ק״מ${shownSuffix(view)}`;
  }

  const located = locate ? lonLatToSheet(sheet, LANDMARKS[locate]) : null;
  const locateLabel = locate ? (LOCATE.find((l) => l.id === locate)?.label ?? LANDMARKS[locate].name) : '';

  return (
    <section data-qa="scale-lab" aria-label="מעבדת קנה מידה">
      <div className={cn('surface-elevated p-5 sm:p-6', WORKSPACE_GRID)}>
        <div role="tablist" aria-label="מצב העבודה" onKeyDown={keys.onKeyDown} className="flex gap-2 lg:col-start-1 lg:row-start-1">
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

        <div role="tabpanel" id={PANEL_ID} aria-labelledby={tabId(mode)} className="flex flex-col gap-5 lg:col-start-1 lg:row-start-2">
          {!comparing && (
            <div>
              <div className={cn(T5, 'mb-2')}>קנה מידה</div>
              <SheetPicker value={sheetId} onChange={setSheetId} label="קנה מידה של המפה" />
            </div>
          )}
          {mode === 'explore' ? (
            <ExplorePanel
              sheet={sheet}
              comparing={comparing}
              onCompare={setZoomCompare}
              locate={locate}
              locateLabel={locateLabel}
              locatedInside={located !== null && insideSheet(located)}
              onLocate={setLocate}
            />
          ) : (
            <MeasurePanel
              sheet={sheet}
              pts={pts}
              inside={inside as [boolean, boolean]}
              onCenter={() => place(centerRef.current)}
              onExample={() => setPts([LANDMARKS[EXAMPLE_PAIR[0]], LANDMARKS[EXAMPLE_PAIR[1]]])}
              onClear={() => setPts([null, null])}
            />
          )}
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="mb-2">
            {comparing ? (
              // Same height as the representation toggle, so the map does not jump.
              <div data-qa="zoom-compare-caption" className={cn(T5, 'flex h-[46px] items-center')}>
                {`השוואה: ${ZOOM_LEFT} מול ${ZOOM_RIGHT}`}
              </div>
            ) : (
              <ViewModeToggle value={view} onChange={setView} />
            )}
          </div>
          <SheetViewport
            label={label}
            sheetKey={comparing ? 'zoom-compare' : sheetId}
            initialView={comparing ? ZOOM_VIEW : undefined}
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
            preload={preload}
            note={mode === 'explore' && !comparing ? `סרגל המרחק מתעדכן כשמתקרבים; קנה המידה של הדף נשאר ${formatRatio(D)}.` : undefined}
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
                    names={[0, 1].map((i) => `נקודה ${LETTERS[i]}. חיצים להזזה במילימטר על הדף, Shift לסנטימטר`) as [string, string]}
                  />
                );
              }
              const { ppu } = ctx;
              const extentLabel = child ? `תחום ${formatRatio(child.denominator)}` : '';
              const locateDy = located && locate ? locateLabelDy(located, locateLabel, ppu, child ? (child.groundWidthM / sheet.groundWidthM) * 1000 : null, extentLabel) : 0;
              return (
                <>
                  {child && (
                    <ChildExtent ratio={child.groundWidthM / sheet.groundWidthM} ppu={ppu} label={extentLabel} onOpen={() => setSheetId(child.id)} />
                  )}
                  {located && locate && insideSheet(located) && (
                    <g data-qa="locate-marker">
                      <Ring p={located} ppu={ppu} r={RING_PX} />
                      <Label p={located} ppu={ppu} text={locateLabel} dy={locateDy} qa="locate-label" />
                    </g>
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
  sheet, comparing, onCompare, locate, locateLabel, locatedInside, onLocate,
}: {
  sheet: SheetMeta;
  comparing: boolean;
  onCompare: (on: boolean) => void;
  locate: LandmarkId | null;
  locateLabel: string;
  locatedInside: boolean;
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
            משמאל לקו: מפת&nbsp;{ZOOM_LEFT}. מימין: מפת&nbsp;{ZOOM_RIGHT} של אותו תחום. גררו את הווילון והשוו.
          </p>
          <p data-qa="zoom-sentence" className={cn(INSET, 'font-display text-base font-bold leading-relaxed text-fg')}>
            {ZOOM_SENTENCE}
          </p>
        </div>
      ) : (
        <>
          <dl className={cn(INSET, 'grid gap-2.5')} data-qa="explore-readouts">
            <ReadoutRow
              term="שטח הדף"
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
            {`מפה ${formatRatio(D)}: ${km} × ${km} ק״מ, 1 ס״מ על הדף = ${groundPerCm}`}
          </p>

          <div>
            <div id="scale-lab-locate" className={cn(T5, 'mb-2')}>איתור במפה</div>
            <div role="group" aria-labelledby="scale-lab-locate" className="flex flex-wrap gap-2">
              {LOCATE.map((l) => {
                const on = locate === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onLocate(on ? null : l.id)}
                    className={cn(OPTION_BASE, FOCUS_RING, on ? OPTION_ACTIVE : OPTION_IDLE, 'px-3 py-1.5 font-display text-sm font-bold text-fg')}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
            {/* Live region stays mounted; empty it takes no space. */}
            <p className={cn(T6, 'mt-2 empty:mt-0')} aria-live="polite" data-qa="locate-line">
              {locate ? (locatedInside ? `${locateLabel}: סומן על המפה.` : `${locateLabel} מחוץ לקטע הזה. עברו לקנה מידה קטן יותר.`) : ''}
            </p>
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
          className={cn(OPTION_BASE, FOCUS_RING, comparing ? OPTION_ACTIVE : OPTION_IDLE, 'h-10 px-4 font-display text-sm font-bold text-fg')}
        >
          הגדלה לעומת פירוט
        </button>
        {comparing && (
          <button type="button" onClick={back} className="btn-secondary h-10 px-4 text-sm">
            חזרה למפות
          </button>
        )}
      </div>
    </>
  );
}

function MeasurePanel({
  sheet, pts, inside, onCenter, onExample, onClear,
}: {
  sheet: SheetMeta;
  pts: Pair;
  inside: [boolean, boolean];
  onCenter: () => void;
  onExample: () => void;
  onClear: () => void;
}) {
  const D = sheet.denominator;
  const precision = readingPrecisionM(D);
  const groundM = pts[0] && pts[1] ? groundDistanceM(pts[0], pts[1]) : null;
  const both = inside[0] && inside[1];
  const reading = groundM !== null && both ? readCm(sheetCm(groundM, D)) : null;
  const ground = groundM !== null ? formatDistance(groundM, precision) : null;
  const out = [0, 1].filter((i) => pts[i] !== null && !inside[i]).map((i) => LETTERS[i]);
  const outsideNote = out.length === 2 ? 'נקודות א ו־ב מחוץ לקטע הזה.' : out.length === 1 ? `נקודה ${out[0]} מחוץ לקטע הזה.` : '';
  const relation = `ב־${formatRatio(D)}, כל ס״מ על הדף הוא ${formatDistance(metersPerSheetCm(D))} בשטח.`;

  // Announced once the points rest (not on every drag frame or key repeat).
  const summary = ground !== null ? `המרחק בין א ל־ב: ${ground} בשטח${reading !== null ? `, ${formatNumber(reading, 1)} ס״מ על הדף` : ''}.` : '';
  const [live, setLive] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setLive(summary), ANNOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [summary]);

  return (
    <>
      <p className={T6} data-qa="measure-hint">
        לחיצה על המפה מסמנת את א ואחר כך את ב; לחיצה נוספת מזיזה את הנקודה הקרובה. גררו נקודה או הזיזו אותה בחיצים.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onCenter} className="btn-secondary h-10 px-4 text-sm">
          הוספת נקודה במרכז המפה
        </button>
        <button type="button" onClick={onExample} className="btn-secondary h-10 px-4 text-sm">
          הצג דוגמה
        </button>
        <button type="button" onClick={onClear} disabled={!pts[0] && !pts[1]} className="btn-secondary h-10 px-4 text-sm disabled:opacity-50">
          ניקוי
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
              {reading !== null ? `${formatNumber(reading, 1)} ס״מ על הדף` : 'על הדף הזה אי אפשר למדוד את הקטע.'}
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
              <ChainRow term="על הדף" value={<Ltr>{`${formatNumber(reading, 1)} ס״מ`}</Ltr>} />
              <ChainRow term="כפול המכנה" value={<Ltr>{`${formatNumber(reading, 1)} × ${formatNumber(D)} = ${formatNumber(reading * D)} ס״מ`}</Ltr>} />
              <ChainRow term="בשטח" value={<Ltr>{`${ground} (±${formatDistance(precision)})`}</Ltr>} />
            </ol>
          ) : (
            <p>החישוב יופיע כששתי הנקודות בתוך הקטע.</p>
          )}
          <p className="text-fg-muted">{`מילימטר אחד על הדף הוא ${formatDistance(precision)} בשטח, ולכן המרחק מעוגל ל־${formatDistance(precision)}.`}</p>
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

