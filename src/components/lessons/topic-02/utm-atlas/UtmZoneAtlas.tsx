'use client';
/* ─────────── היטל UTM — "אטלס הפלחים" (חלופה 2) ───────────
   Brief: design/mockups/utm-concepts-2026-10-12/README.md; mockup 02-zone-atlas.png.
   Focus pass 2026-10-19: the two existing views are the two learning goals, one at a time.
   - "פלחים" asks which zone and hemisphere: the world locator map leads, the enlargement is
     small beside it; the answer card shows only the zone and the hemisphere.
   - "מודדים במטרים" asks how the same point is written in metres: the enlargement with the
     zone's grid leads, the world map is a small locator; E and N together, with the zone,
     the hemisphere and the datum beside them as the context they need.
   One short title, one instruction and one feedback line per view; secondary actions sit
   under the small map; coverage, numbering and exceptions are in "מידע נוסף על UTM".

   One point drives everything (utmAtlas.ts): both maps, the zone, the hemisphere, E/N and
   the explanation are all derived from it, and switching views keeps it. Practice ("מצאו את
   גריניץ׳", then three new points) runs in the same card on its own state, so going back to
   the exploration finds the point where it was.

   Practice, map pass 2026-10-26: the map is the tool. The learner finds the point and clicks
   its zone on either map (or moves the choice with the arrows on the world map); the click's
   side of the equator is the hemisphere, so a choice is a cell — zone 54 north of the
   equator is "54N". Both maps keep what reading needs: zone numbers and boundary longitudes
   in the enlargement, the equator and which side is N / S. The choice is drawn in the pick
   tone (dark), never a verdict; a check marks the checked choice ✓ / ✕ in the card, hints
   grow per wrong part and point at places on the map (1: what to look at, 2: the marked
   boundaries or side); after two failed checks the learner may ask for the answer. A part
   checked right is locked; the answer is drawn in the accent tone only once verified or shown.
   The feedback sits under the enlargement, so the maps never move while the learner works. */

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLessonViewportScale } from '@/components/lesson/LessonViewportFit';
import { cn } from '@/lib/utils';
import { L } from '../Ltr';
import { fromUtm } from '../reference-systems/utm';
import { AtlasMap, type Cell as MapCell, type Chip, type Marks, type TopLabel } from './AtlasMap';
import { BODY, Cell, Changing, Feedback, HEADING, Segmented, VALUE, VerdictMark, ZoneStepper } from './atlasControls';
import {
  FRAME_ASPECT, WORLD_VIEW, fracX, fracY, gridStep, latForN, lonForE, readingLines, regionView, scaleBarKm, viewBottom, viewTop, zoneGrid, zoneWindow,
  KM_PER_DEG, type View,
} from './atlasGeometry';
import { useBasemap } from './useBasemap';
import {
  DATUM, GREENWICH_ZONE, HEMI_NAME, NORTH_LIMIT, OPENING, PRESETS, SOUTH_LIMIT, TRANSFER, cellAt, centralMeridian, clampLat, fmtLat, fmtLon,
  inCoverage, moveToZone, normLon, readUtm, regularZone, utmZoneOf, wrapZone, zoneBoundarySegments, zoneEast,
  zoneRangeAt, zoneStep, zoneWest, type Hemisphere, type LatLon, type Place, type UtmReading,
} from './utmAtlas';

type InsetKind = 'zones' | 'grid';
type Mode = 'explore' | 'greenwich' | 'transfer' | 'done';

type Event =
  | { kind: 'start' }
  | { kind: 'pick'; prev: UtmReading }
  | { kind: 'zone'; prev: UtmReading }
  | { kind: 'preset'; place: Place }
  | { kind: 'outside'; lat: number }
  | { kind: 'view'; to: InsetKind };

type Attempt = { zone: number; hemi: Hemisphere | null; zoneOk: boolean; hemiOk: boolean };
/** One practice task. `pick` / `hemiPick` are the learner's current choice; `last` is the last
    check, which the feedback and the map marks follow; a part checked right is done (locked);
    `zoneMiss` / `hemiMiss` count wrong checks per part and set the hint level. */
type Task = {
  pick: number | null;
  hemiPick: Hemisphere | null;
  last: Attempt | null;
  zoneMiss: number;
  hemiMiss: number;
  fails: number;
  zoneDone: boolean;
  hemiDone: boolean;
  shown: boolean;
};
type Result = 'solved' | 'shown';
const freshTask = (greenwich: boolean): Task => ({
  pick: null,
  hemiPick: null,
  last: null,
  zoneMiss: 0,
  hemiMiss: 0,
  fails: 0,
  zoneDone: false,
  hemiDone: greenwich,
  shown: false,
});
/** Failed checks before "הצגת התשובה" is offered. */
const SHOW_AFTER = 2;

const RAD = Math.PI / 180;
/** Keeps a unit on the line of its number ("500000 מ׳"). */
const NBSP = ' ';
const GREENWICH_LAT = 51.48;
const TRANSFER_LETTERS = ['B', 'C', 'D'];
const VIEW_ITEMS = [
  { id: 'zones' as const, label: 'פלחים' },
  { id: 'grid' as const, label: 'מודדים במטרים' },
];

/* the two-column stage: the leading map at inline-start, the answer column beside it */
const MAIN = 'col-start-1 row-span-3 row-start-1 min-w-0 self-start';
const SIDE_MAP = 'col-start-2 row-start-2 min-w-0';
const VALUE_BOX = 'rounded-lg bg-bg-accent px-4 py-1.5';
const UNIT = 'text-base font-semibold text-fg-muted';

/* ── small helpers ───────────────────────────────────────────────────────── */

const latLonText = (lat: number, lon: number, digits = 2) => `${fmtLat(lat, digits)}, ${fmtLon(lon, digits)}`;
const km = (m: number) => {
  const v = Math.abs(m) / 1000;
  return v >= 10 ? `${Math.round(v)}` : v.toFixed(1);
};
const grew = (d: number) => (Math.abs(d) < 0.5 ? 'לא השתנה' : d > 0 ? 'גדל' : 'קטן');

/** The boundary shared by two adjacent zones at a latitude (null if they do not touch there). */
function sharedBoundary(a: number, b: number, lat: number): number | null {
  const ra = zoneRangeAt(a, lat);
  const rb = zoneRangeAt(b, lat);
  if (!ra || !rb) return null;
  if (normLon(ra.e - rb.w) === 0 || ra.e === rb.w) return rb.w;
  if (normLon(rb.e - ra.w) === 0 || rb.e === ra.w) return ra.w;
  return null;
}

/** Tween a window toward its target (≈ 320 ms, ease-out); instant under reduced motion. */
function useTweenedView(target: View, reduce: boolean): View {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  useEffect(() => {
    const a = shownRef.current;
    if (reduce || (a.lon0 === target.lon0 && a.lat0 === target.lat0 && a.w === target.w)) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const dLon = normLon(target.lon0 - a.lon0);
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 320);
      const e = 1 - (1 - k) ** 3;
      const lat0 = a.lat0 + (target.lat0 - a.lat0) * e;
      const w = a.w + (target.w - a.w) * e;
      const v = k < 1 ? { lon0: normLon(a.lon0 + dLon * e), lat0, w, h: (w * Math.cos(lat0 * RAD)) / FRAME_ASPECT } : target;
      shownRef.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);
  return shown;
}

/** The enlargement's window for a reading — and whether the current one still serves it. */
const windowFor = (r: UtmReading, kind: InsetKind) => zoneWindow(r.range, r.lat, kind);
function keepsPoint(v: View, r: UtmReading, kind: InsetKind, zoneOfView: number) {
  if (r.zone !== zoneOfView) return false;
  const fy = fracY(v, r.lat);
  const fx = fracX(v, r.lon);
  const w = windowFor(r, kind).w;
  return Math.abs(v.w - w) < 1e-6 && fy > 0.12 && fy < 0.88 && fx > 0.04 && fx < 0.96;
}

/* ── the component ───────────────────────────────────────────────────────── */

export function UtmZoneAtlas() {
  const reduce = Boolean(useReducedMotion());
  const { basemap, failed } = useBasemap();
  const uid = useId();

  /* exploration state — kept while practising */
  const [point, setPoint] = useState<LatLon>({ lat: OPENING.lat, lon: OPENING.lon });
  const [event, setEvent] = useState<Event>({ kind: 'start' });
  const [insetKind, setInsetKind] = useState<InsetKind>('zones');
  const reading = useMemo(() => readUtm(point), [point]);
  const [exploreView, setExploreView] = useState<{ view: View; zone: number }>(() => ({ view: windowFor(readUtm(OPENING), 'zones'), zone: 36 }));
  const [presetIdx, setPresetIdx] = useState(0);
  const gesture = useRef<UtmReading | null>(null);
  const [announce, setAnnounce] = useState('');

  /* practice state */
  const [mode, setMode] = useState<Mode>('explore');
  const [task, setTask] = useState<Task>(() => freshTask(true));
  const [item, setItem] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  /** Practice: the cell a click would choose, under the mouse. */
  const [hover, setHover] = useState<MapCell | null>(null);

  const worldRef = useRef<HTMLDivElement>(null);
  const insetRef = useRef<HTMLDivElement>(null);
  const insetPinRef = useRef<HTMLButtonElement>(null);
  const worldPinRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const focusTitle = () => requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));

  const target = mode === 'transfer' || mode === 'done' ? TRANSFER[Math.min(item, TRANSFER.length - 1)] : null;
  const targetReading = useMemo(() => (target ? readUtm(target) : null), [target]);
  /** What the current task asks for (Greenwich has no hemisphere part). */
  const answer = mode === 'greenwich' ? { zone: GREENWICH_ZONE, hemi: null } : targetReading ? { zone: targetReading.zone, hemi: targetReading.hemisphere } : null;
  const solved = task.zoneDone && task.hemiDone;
  /** The answer may be drawn: verified by a check, shown on request, or the practice is over. */
  const over = mode === 'done' || (mode !== 'explore' && (solved || task.shown));
  /** The metres view: the enlargement and its grid lead, the world map is the small locator. */
  const gridMode = mode === 'explore' && insetKind === 'grid';
  const worldLeads = !gridMode;

  /* ── the enlargement's window per mode ── */
  /* In practice the window never follows a choice: it frames Greenwich, or the new point, and stays. */
  const insetTarget: View = useMemo(() => {
    if (mode === 'explore') return exploreView.view;
    if (mode === 'greenwich') return regionView(0, GREENWICH_LAT, 21);
    return regionView(target!.lon, target!.lat, 21);
  }, [mode, exploreView, target]);
  const inset = useTweenedView(insetTarget, reduce);

  /* ── exploration actions ── */
  const recenter = (r: UtmReading, kind = insetKind, force = false) => {
    setExploreView((cur) => (!force && keepsPoint(cur.view, r, kind, cur.zone) ? cur : { view: windowFor(r, kind), zone: r.zone }));
  };

  /** One short announcement per settled change: held arrow keys or a burst of clicks say it once. */
  const sayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sayLater = (text: string) => {
    if (sayTimer.current) clearTimeout(sayTimer.current);
    sayTimer.current = setTimeout(() => setAnnounce(text), 500);
  };
  const say = (r: UtmReading) =>
    sayLater(
      insetKind === 'grid'
        ? `מזרח ${r.eText}, צפון ${r.nText} מטרים, בפלח ${r.zone} ${HEMI_NAME[r.hemisphere]}.`
        : `פלח ${r.zone}, חצי הכדור ה${HEMI_NAME[r.hemisphere]}.`,
    );
  useEffect(() => () => void (sayTimer.current && clearTimeout(sayTimer.current)), []);

  const placeAt = (p: LatLon, phase: 'start' | 'move' | 'end', source: 'world' | 'inset', onPin: boolean) => {
    if (phase === 'start') {
      if (!onPin && !inCoverage(p.lat)) {
        gesture.current = null;
        setEvent({ kind: 'outside', lat: p.lat });
        setAnnounce('מחוץ לתחום UTM. הנקודה נשארה במקומה.');
        return;
      }
      gesture.current = reading;
    }
    const prev = gesture.current;
    if (!prev) return;
    const next = { lat: clampLat(p.lat), lon: normLon(p.lon) };
    const r = readUtm(next);
    setPoint(next);
    setEvent({ kind: 'pick', prev });
    if (source === 'world') recenter(r, insetKind, true);
    if (phase === 'end') {
      if (source === 'inset') recenter(r);
      gesture.current = null;
      say(r);
    }
  };

  const nudge = (e: KeyboardEvent<HTMLButtonElement>, source: 'world' | 'inset') => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!dir) return;
    e.preventDefault();
    let next: LatLon;
    if (source === 'inset' && insetKind === 'grid') {
      // in the grid view the arrows move in metres: 10 km (Shift: 1 km) along E or N
      const step = e.shiftKey ? 1000 : 10000;
      const p = fromUtm({ e: reading.e + dir[0] * step, n: reading.n + dir[1] * step }, { zone: reading.zone, hemisphere: reading.hemisphere });
      next = p;
    } else if (source === 'inset') {
      const step = e.shiftKey ? 0.1 : 0.5;
      next = { lat: point.lat + dir[1] * step, lon: point.lon + dir[0] * step };
    } else {
      next = { lat: point.lat + dir[1] * (e.shiftKey ? 1 : 5), lon: point.lon + dir[0] * (e.shiftKey ? 1 : 6) };
    }
    next = { lat: clampLat(next.lat), lon: normLon(next.lon) };
    const r = readUtm(next);
    setPoint(next);
    setEvent({ kind: 'pick', prev: reading });
    recenter(r);
    say(r);
  };

  const goZone = (z: number) => {
    if (z === reading.zone) return;
    const next = moveToZone(point, z);
    const r = readUtm(next);
    setPoint(next);
    setEvent({ kind: 'zone', prev: reading });
    recenter(r, insetKind, true);
    say(r);
  };

  const nextPreset = () => {
    const place = presetIdx < PRESETS.length ? PRESETS[presetIdx] : OPENING;
    const next = { lat: place.lat, lon: place.lon };
    const r = readUtm(next);
    setPoint(next);
    setEvent(place === OPENING ? { kind: 'start' } : { kind: 'preset', place });
    setPresetIdx((presetIdx + 1) % (PRESETS.length + 1));
    recenter(r, insetKind, true);
    say(r);
  };

  const switchInset = (k: InsetKind) => {
    if (k === insetKind) return;
    setInsetKind(k);
    setEvent({ kind: 'view', to: k });
    recenter(reading, k, true);
  };

  /* ── practice actions ── */
  /* The choice is made on the map: a click (or the arrows) chooses a zone and, for a point, the
     side of the equator. It is the learner's choice only — nothing says whether it is right. */
  const startGreenwich = () => {
    setMode('greenwich');
    setTask(freshTask(true));
    setResults([]);
    setHover(null);
    focusTitle();
  };
  const startTransfer = (i = 0) => {
    setMode('transfer');
    setItem(i);
    setTask(freshTask(false));
    setHover(null);
    focusTitle();
  };
  const backToExplore = () => {
    setMode('explore');
    setHover(null);
    focusTitle();
  };
  /** What choosing a cell gives: a part already checked right stays as it is; Greenwich has no hemisphere. */
  const chosenCell = (zone: number | null, hemisphere: Hemisphere | null) => ({
    zone: task.zoneDone ? task.pick : zone,
    hemisphere: mode === 'greenwich' ? null : task.hemiDone ? task.hemiPick : hemisphere,
  });
  const choose = (zone: number | null, hemisphere: Hemisphere | null) => {
    if (over) return;
    const c = chosenCell(zone, hemisphere);
    if (c.zone === task.pick && c.hemisphere === task.hemiPick) return;
    setTask((t) => ({ ...t, pick: c.zone, hemiPick: c.hemisphere }));
    // a screen reader hears the choice and the strip's longitudes — what the eye reads above the enlargement
    const r = c.zone != null ? zoneRangeAt(c.zone, insetTarget.lat0) : null;
    const parts: string[] = [];
    if (c.zone != null) parts.push(`פלח ${c.zone}${r ? `, בין ${fmtLon(r.w)} ל־${fmtLon(r.e)}` : ''}`);
    if (c.hemisphere) parts.push(`חצי הכדור ה${HEMI_NAME[c.hemisphere]}`);
    sayLater(`בחרתם: ${parts.join(', ')}.`);
  };
  const pickAt = (p: LatLon, phase: 'start' | 'move' | 'end') => {
    if (phase === 'end' || !inCoverage(p.lat)) return;
    const c = cellAt(p);
    choose(c.zone, c.hemisphere);
  };
  const hoverAt = (p: LatLon | null) => {
    let next: MapCell | null = null;
    if (p && inCoverage(p.lat) && !over) {
      const at = cellAt(p);
      const c = chosenCell(at.zone, at.hemisphere);
      if (c.zone != null) next = { zone: c.zone, hemisphere: c.hemisphere };
    }
    setHover((h) => (h?.zone === next?.zone && h?.hemisphere === next?.hemisphere ? h : next));
  };
  /** The arrows on the world map: ← / → the zone to the west / east (map order), ↑ / ↓ the side of the equator. */
  const pickKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const dz = ({ ArrowLeft: -1, ArrowRight: 1 } as Record<string, number>)[e.key];
    const h = ({ ArrowUp: 'N', ArrowDown: 'S' } as Record<string, Hemisphere>)[e.key];
    if (!dz && !h) return;
    e.preventDefault();
    if (over) return;
    if (dz) {
      if (task.zoneDone) return sayLater(`הפלח כבר נכון.${mode === 'transfer' ? ' בחרו את חצי הכדור: חץ למעלה או למטה.' : ''}`);
      // nothing chosen yet: start at the enlargement's west (→) or east (←) edge, not at the point
      const edge = insetTarget.lon0 + (dz > 0 ? -1 : 1) * (insetTarget.w / 2 - 0.01);
      choose(task.pick == null ? utmZoneOf({ lat: insetTarget.lat0, lon: normLon(edge) }) : wrapZone(task.pick + dz), task.hemiPick);
    } else if (mode === 'transfer') {
      if (task.hemiDone) return sayLater('חצי הכדור כבר נכון. בחרו פלח בחץ ימינה או שמאלה.');
      choose(task.pick, h);
    }
  };
  const record = (r: Result) =>
    setResults((rs) => {
      const next = [...rs];
      next[mode === 'greenwich' ? 0 : item + 1] = r;
      return next;
    });
  const runCheck = () => {
    if (!answer || task.pick == null || (answer.hemi && !task.hemiPick)) return;
    const zoneOk = task.pick === answer.zone;
    const hemiOk = !answer.hemi || task.hemiPick === answer.hemi;
    setTask((t) => ({
      ...t,
      last: { zone: t.pick!, hemi: t.hemiPick, zoneOk, hemiOk },
      zoneMiss: t.zoneMiss + (zoneOk ? 0 : 1),
      hemiMiss: t.hemiMiss + (hemiOk ? 0 : 1),
      fails: t.fails + (zoneOk && hemiOk ? 0 : 1),
      zoneDone: t.zoneDone || zoneOk,
      hemiDone: t.hemiDone || hemiOk,
    }));
    if (zoneOk && hemiOk) record('solved');
  };
  const showAnswer = () => {
    setTask((t) => ({ ...t, shown: true }));
    record('shown');
  };
  const nextItem = () => {
    if (item + 1 < TRANSFER.length) startTransfer(item + 1);
    else {
      setMode('done');
      focusTitle();
    }
  };

  /* ── what each map shows ── */
  const crossed = useMemo(() => {
    if (mode !== 'explore' || (event.kind !== 'pick' && event.kind !== 'zone')) return null;
    if (event.prev.zone === reading.zone || Math.abs(zoneStep(event.prev.zone, reading.zone)) !== 1 || event.kind === 'zone') return null;
    const lon = sharedBoundary(event.prev.zone, reading.zone, reading.lat);
    return lon == null ? null : { lon, from: event.prev.zone, to: reading.zone };
  }, [mode, event, reading]);

  const worldMarks: Marks = { equator: 'plain' };
  const insetMarks: Marks = { equator: 'plain' };
  /* the small locator carries no labels; leading, it names the equator and the veiled polar bands */
  const worldChips: Chip[] = gridMode
    ? []
    : [
        { key: 'equator', lat: 0, fx: 0.012, children: <span dir="rtl">קו המשווה</span>, style: { transform: 'translateY(calc(-100% - 3px))' } },
        { key: 'outside', lat: -85, fx: 0.5, style: { transform: 'translate(-50%, -50%)' }, children: <span dir="rtl">מחוץ לתחום <L>UTM</L></span> },
      ];
  const insetChips: Chip[] = [];
  /** The verified zone (accent) and the learner's choice (pick tone), for the labels above both maps. */
  let focusZone: number | null = null;
  let pickZone: number | null = null;
  /** Boundary longitudes above the enlargement that a state points at (accent wins over pick). */
  const lonTone = new Map<number, 'accent' | 'pick'>();
  const markLon = (lon: number, tone: 'accent' | 'pick') => {
    const k = normLon(lon);
    if (lonTone.get(k) !== 'accent') lonTone.set(k, tone);
  };
  const worldLine = (lon: number) => ({ lon, s: SOUTH_LIMIT, n: NORTH_LIMIT });
  const insetLine = (lon: number) => ({ lon, s: Math.max(SOUTH_LIMIT, viewBottom(inset)), n: Math.min(NORTH_LIMIT, viewTop(inset)) });
  const pointAt = (lines: number[]) => {
    worldMarks.boundaries = lines.map(worldLine);
    insetMarks.boundaries = lines.map(insetLine);
  };
  /** The hemisphere the maps may name as the point's: always in exploration, in practice only once verified or shown. */
  let namedHemi: Hemisphere | null = null;
  /** Practice: the side of the equator the learner chose, in the pick tone until it is verified. */
  let chosenHemi: Hemisphere | null = null;

  if (mode === 'explore') {
    focusZone = reading.zone;
    namedHemi = reading.hemisphere;
    worldMarks.focusZone = reading.zone;
    worldMarks.pin = { lat: point.lat, lon: point.lon, label: 'A' };
    worldMarks.locator = inset;
    insetMarks.focusZone = reading.zone;
    insetMarks.pin = { lat: point.lat, lon: point.lon, label: 'A' };
    if (crossed) {
      pointAt([crossed.lon]);
      markLon(crossed.lon, 'accent');
    }
    if (event.kind === 'pick' && event.prev.hemisphere !== reading.hemisphere) {
      worldMarks.equator = 'highlight';
      insetMarks.equator = 'highlight';
    }
  } else if (mode === 'greenwich') {
    worldMarks.greenwich = true;
    insetMarks.greenwich = true;
    worldMarks.locator = inset;
    // "the western boundary" is read on the map: west is its left side
    insetChips.push(
      { key: 'greenwich', lon: 0, fy: 0.16, tone: 'strong', style: { transform: 'translate(6px, 0)' }, children: <span dir="rtl">גריניץ׳</span> },
      { key: 'west', fx: 0.015, fy: 0.5, style: { transform: 'translateY(-50%)' }, children: <span dir="rtl">מערב</span> },
      { key: 'east', fx: 0.985, fy: 0.5, style: { transform: 'translate(-100%, -50%)' }, children: <span dir="rtl">מזרח</span> },
    );
    worldChips.push({ key: 'greenwich', lon: 0, fy: 0.06, tone: 'strong', style: { transform: 'translate(5px, 0)' }, children: <span dir="rtl">גריניץ׳</span> });
    if (over) {
      focusZone = GREENWICH_ZONE;
      worldMarks.focusZone = insetMarks.focusZone = GREENWICH_ZONE;
      markLon(zoneWest(GREENWICH_ZONE), 'accent');
      markLon(zoneEast(GREENWICH_ZONE), 'accent');
    } else if (task.last && (task.last.zone === 30 || task.zoneMiss >= 2)) {
      // hint 1 after 30: Greenwich is its EASTERN edge; hint 2: the line the zone asked for starts at
      pointAt([0]);
      if (task.zoneMiss >= 2) markLon(0, 'accent');
    }
  } else if (target && targetReading) {
    const letter = TRANSFER_LETTERS[Math.min(item, TRANSFER.length - 1)];
    worldMarks.pin = { lat: target.lat, lon: target.lon, label: letter };
    insetMarks.pin = { lat: target.lat, lon: target.lon, label: letter };
    worldMarks.locator = inset;
    if (over || task.zoneDone) {
      // the verified zone; its side of the equator too once that is verified (or shown)
      focusZone = targetReading.zone;
      worldMarks.focusZone = insetMarks.focusZone = targetReading.zone;
      if (over || task.hemiDone) worldMarks.focusHemisphere = insetMarks.focusHemisphere = targetReading.hemisphere;
      markLon(targetReading.range.w, 'accent');
      markLon(targetReading.range.e, 'accent');
    } else if (task.zoneMiss >= 2) {
      // hint 2: the two boundaries the point lies between — the number above them is the learner's to read
      pointAt([targetReading.range.w, targetReading.range.e]);
      markLon(targetReading.range.w, 'accent');
      markLon(targetReading.range.e, 'accent');
    }
    if (over || task.hemiDone) namedHemi = targetReading.hemisphere;
    else if (task.hemiMiss >= 1) worldMarks.equator = insetMarks.equator = 'highlight';
  }

  /* practice: the choice on the map in the pick tone — the learner's, not a verdict. Once the answer
     is shown, a different last choice stays drawn as theirs beside it. */
  if (mode === 'greenwich' || mode === 'transfer') {
    const pick: MapCell | null = task.pick != null ? { zone: task.pick, hemisphere: task.hemiPick } : null;
    const isAnswer = pick != null && answer != null && pick.zone === answer.zone && pick.hemisphere === answer.hemi;
    if (pick && !solved && !(task.shown && isAnswer)) {
      worldMarks.pick = insetMarks.pick = pick;
      if (!task.zoneDone) {
        pickZone = pick.zone;
        const r = zoneRangeAt(pick.zone, insetTarget.lat0) ?? { w: zoneWest(pick.zone), e: zoneEast(pick.zone) };
        markLon(r.w, 'pick');
        markLon(r.e, 'pick');
      }
    }
    if (!over && !task.hemiDone) chosenHemi = task.hemiPick;
    if (hover && !over && !(pick && hover.zone === pick.zone && hover.hemisphere === pick.hemisphere)) worldMarks.hover = insetMarks.hover = hover;
  }

  /* which side of the equator is N and which S, by the equator at the map's east edge; the point's
     side in the accent tone (exploration, or verified), the learner's choice in the pick tone */
  const hemiChips = (fx: number): Chip[] =>
    (['N', 'S'] as const).map((h) => ({
      key: `hemi-${h}`,
      fx,
      lat: 0,
      tone: namedHemi === h ? 'accent' : chosenHemi === h ? 'pick' : 'plain',
      style: { transform: h === 'N' ? 'translate(-100%, calc(-100% - 3px))' : 'translate(-100%, 3px)' },
      children: (
        <span dir="rtl" data-hemi-chip={h}>
          {HEMI_NAME[h]} <L>{h}</L>
        </span>
      ),
    }));
  if (!gridMode && mode !== 'greenwich') worldChips.push(...hemiChips(0.988));

  /* world: zone numbers along the top as anchors (the small locator shows none) */
  const near = (z: number, other: number | null) => other != null && Math.abs(zoneStep(z, other)) < 4;
  const worldTop: TopLabel[] = [1, 15, 30, 45, 60]
    .filter((z) => !near(z, focusZone) && !near(z, pickZone))
    .map((z) => ({ key: `z${z}`, fx: fracX(WORLD_VIEW, zoneWest(z) + 3), text: z }));
  if (focusZone != null) worldTop.push({ key: 'focus', fx: fracX(WORLD_VIEW, zoneWest(focusZone) + 3), text: focusZone, tone: 'accent' });
  // a choice beside the shown answer keeps its number in the enlargement and the card; here the two would collide
  if (pickZone != null && !(focusZone != null && Math.abs(zoneStep(pickZone, focusZone)) < 3))
    worldTop.push({ key: 'pick', fx: fracX(WORLD_VIEW, zoneWest(pickZone) + 3), text: pickZone, tone: 'pick' });

  /* enlargement: boundary longitudes along the top — the focus zone's in bold, the ones a state points at underlined */
  const insetLons = useMemo(() => {
    const west = inset.lon0 - inset.w / 2;
    const east = inset.lon0 + inset.w / 2;
    const lons = new Set<number>();
    for (const [[x1, y1], [x2, y2]] of zoneBoundarySegments()) {
      if (x1 !== x2) continue;
      if (Math.min(y1, y2) > viewTop(inset) || Math.max(y1, y2) < viewBottom(inset)) continue;
      const x = inset.lon0 + normLon(x1 - inset.lon0);
      if (x > west + 0.3 && x < east - 0.3) lons.add(normLon(x1));
    }
    return [...lons];
  }, [inset]);
  const focusRange = focusZone != null ? zoneRangeAt(focusZone, inset.lat0) : null;
  const insetTop: TopLabel[] = insetLons.map((lon) => ({
    key: `b${lon}`,
    fx: fracX(inset, lon),
    text: <L>{fmtLon(lon)}</L>,
    tone: lonTone.get(lon) ?? (focusRange && (lon === normLon(focusRange.w) || lon === normLon(focusRange.e)) ? 'strong' : 'muted'),
  }));

  /* zone numbers inside the enlargement: read on the map, in exploration and in practice alike;
     the verified zone in the accent tone, the learner's choice in the pick tone */
  const midLat = Math.max(SOUTH_LIMIT, Math.min(NORTH_LIMIT - 0.01, inset.lat0));
  if (!gridMode) {
    const seen = new Set<number>();
    for (let lon = inset.lon0 - inset.w / 2; lon <= inset.lon0 + inset.w / 2; lon += 0.5) {
      const z = utmZoneOf({ lat: midLat, lon });
      if (seen.has(z)) continue;
      seen.add(z);
      const r = zoneRangeAt(z, midLat);
      const fx = r ? fracX(inset, (r.w + r.e) / 2) : -1;
      if (fx < 0.05 || fx > 0.95) continue;
      insetChips.push({
        key: `zone${z}`,
        fx,
        fy: 0.05,
        tone: z === focusZone ? 'accent' : z === pickZone ? 'pick' : 'strong',
        style: { transform: 'translateX(-50%)' },
        children: (
          <span data-zone-number={z} className="text-base">
            {z}
          </span>
        ),
      });
    }
  }

  /* the enlargement names the equator when it is in view (the metres grid names it below); with a
     point to place in practice, also which side is N and which S — the equator's name moves west */
  if (!gridMode && viewBottom(inset) < -0.5 && viewTop(inset) > 0.5) {
    const fy = fracY(inset, 0);
    const sides = mode === 'transfer';
    if (fy > 0.12 && fy < 0.92) {
      insetChips.push({
        key: 'eq',
        fx: sides ? 0.015 : 0.97,
        lat: 0,
        tone: insetMarks.equator === 'highlight' ? 'accent' : 'strong',
        style: { transform: sides ? 'translateY(calc(-100% - 3px))' : 'translate(-100%, calc(-100% - 3px))' },
        children: <span dir="rtl">קו המשווה</span>,
      });
      if (sides) insetChips.push(...hemiChips(0.985));
    }
  }

  /* grid view: the zone's own grid, its labels and the point's reading lines */
  const grid = useMemo(() => (gridMode ? zoneGrid(reading.zone, inset) : null), [gridMode, reading.zone, inset]);
  const [frames, setFrames] = useState<{ world: DOMRect; inset: DOMRect; box: DOMRect } | null>(null);
  const insetPx = frames?.inset.width ?? 800;
  if (gridMode && grid) {
    insetMarks.grid = grid;
    insetMarks.focusZone = null;
    const lines = readingLines(reading.zone, reading.hemisphere, reading.e, reading.n, inset);
    insetMarks.readingLines = lines;
    const top = Math.min(viewTop(inset), reading.hemisphere === 'S' ? 0 : NORTH_LIMIT);
    const chosenE = fracX(inset, lonForE(reading.zone, reading.hemisphere, reading.e, top));
    const chosenN = fracY(inset, latForN(reading.zone, reading.hemisphere, reading.n, lines.westLon));
    const westFx = fracX(inset, lines.westLon);
    insetChips.push(
      { key: 'chosenE', fx: chosenE, fy: 0, tone: 'accent', style: { transform: 'translate(-50%, 4px)' }, children: reading.eText },
      { key: 'chosenN', fx: westFx, fy: chosenN, tone: 'accent', style: { transform: 'translate(4px, -50%)' }, children: reading.nText },
    );
    for (const g of grid) {
      if (g.hemisphere !== reading.hemisphere) continue;
      if (g.kind === 'e') {
        const fx = fracX(inset, lonForE(reading.zone, reading.hemisphere, g.value, top));
        if (fx < 0.06 || fx > 0.94 || Math.abs(fx - chosenE) * insetPx < 60) continue;
        insetChips.push({ key: `e${g.value}`, fx, fy: 0, tone: g.value === 500000 ? 'strong' : 'plain', style: { transform: 'translate(-50%, 4px)' }, children: g.value });
      } else {
        const fy = fracY(inset, latForN(reading.zone, reading.hemisphere, g.value, lines.westLon));
        if (fy < 0.14 || fy > 0.86 || Math.abs(fy - chosenN) * (insetPx / FRAME_ASPECT) < 26) continue;
        insetChips.push({ key: `n${g.value}`, fx: westFx, fy, style: { transform: 'translate(4px, -50%)' }, children: g.value });
      }
    }
    const cm = centralMeridian(reading.zone);
    insetChips.push({ key: 'cm', lon: cm, fy: 0.96, tone: 'strong', style: { transform: 'translate(-50%, -100%)' }, children: <span dir="rtl">קו האמצע</span> });
    if (viewBottom(inset) < 0 && viewTop(inset) > 0) {
      insetChips.push({ key: 'eq', fx: 0.97, lat: 0, tone: 'strong', style: { transform: 'translate(-100%, calc(-100% - 3px))' }, children: <span dir="rtl">קו המשווה</span> });
    }
  }

  /* ── frames, for the connectors ── */
  /* in layout px: under the laptop fit (LessonViewportFit) the screen rects are shrunk by `fitScale` */
  const mapsRef = useRef<HTMLDivElement>(null);
  const fitScale = useLessonViewportScale();
  useLayoutEffect(() => {
    const el = mapsRef.current;
    if (!el) return;
    const local = (r: DOMRect) => new DOMRect(r.x / fitScale, r.y / fitScale, r.width / fitScale, r.height / fitScale);
    const measure = () => {
      if (!worldRef.current || !insetRef.current) return;
      setFrames({ world: local(worldRef.current.getBoundingClientRect()), inset: local(insetRef.current.getBoundingClientRect()), box: local(el.getBoundingClientRect()) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (worldRef.current) ro.observe(worldRef.current);
    if (insetRef.current) ro.observe(insetRef.current);
    // the answer column above the small enlargement grows with feedback: the enlargement moves down
    if (sideRef.current) ro.observe(sideRef.current);
    return () => ro.disconnect();
  }, [mode, fitScale, insetKind]);

  /* Only while the world map leads: the enlargement then sits beside it, under the answer card.
     In the metres view the locator's window is a few pixels wide; its frame, the pin and the
     highlighted zone carry the link, and lines would cross the readings. */
  const connectors = useMemo(() => {
    if (!frames || mode === 'done' || !worldLeads) return null;
    const { world, inset: ins, box } = frames;
    const x = (f: number) => world.left - box.left + f * world.width;
    const y = (f: number) => world.top - box.top + f * world.height;
    const lx = fracX(WORLD_VIEW, inset.lon0 - inset.w / 2);
    const fy0 = fracY(WORLD_VIEW, viewTop(inset));
    const fy1 = fracY(WORLD_VIEW, viewBottom(inset));
    const right = ins.right - box.left;
    return [
      [x(lx), y(fy0), right, ins.top - box.top],
      [x(lx), y(fy1), right, ins.bottom - box.top],
    ];
  }, [frames, inset, mode, worldLeads]);

  /* ── text ── */
  const letter = TRANSFER_LETTERS[Math.min(item, TRANSFER.length - 1)];
  const title =
    mode === 'explore'
      ? gridMode
        ? 'כיצד מתארים את הנקודה במטרים בתוך הפלח?'
        : 'באיזה פלח ובאיזה חצי כדור נמצאת הנקודה?'
      : mode === 'greenwich'
        ? 'משימה 1 מתוך 4 · גריניץ׳'
        : mode === 'transfer'
          ? `משימה ${item + 2} מתוך 4 · פלח וחצי כדור`
          : 'סיימתם את התרגול';
  const instruction: ReactNode =
    mode === 'explore' ? (
      gridMode ? (
        <>
          גררו את A בתקריב ובדקו איך משתנים <L>E</L> ו־<L>N</L>.
        </>
      ) : (
        'לחצו במפה או גררו את A. הפלח שלה מודגש, וחצי הכדור מסומן ליד קו המשווה.'
      )
    ) : mode === 'greenwich' ? (
      <>
        באיזה פלח קו גריניץ׳ (<L>0°</L>) הוא הגבול המערבי? לחצו במפה על הפלח, ואחר כך על ״בדיקת הבחירה״.
      </>
    ) : mode === 'transfer' ? (
      <>
        באיזה פלח ובאיזה חצי כדור נמצאת {letter}? לחצו במפה על הפלח שלה, בצד של קו המשווה שבו היא נמצאת, ואחר כך על ״בדיקת הבחירה״.
      </>
    ) : (
      'אפשר לחזור לחקירה ולבדוק נקודות נוספות, או לתרגל שוב.'
    );

  const pinHelpId = `${uid}-pin-help`;
  const pickHelpId = `${uid}-pick-help`;
  const practising = mode === 'greenwich' || mode === 'transfer';
  /* In practice the descriptions give a screen reader what the eye reads: the point's place and the
     zones in the enlargement (the arrows then name each zone's longitudes). */
  const targetText = target ? `נקודה ${letter}, ${target.name}, ב־${latLonText(target.lat, target.lon)}.` : '';
  const insetZones = insetChips.filter((c) => c.key.startsWith('zone')).map((c) => c.key.slice(4));
  const worldDesc =
    mode === 'explore'
      ? `מפת איתור עולמית עם 60 פלחי UTM. נקודה A ב־${latLonText(point.lat, point.lon)}, פלח ${reading.zone} מודגש.`
      : `מפת איתור עולמית עם 60 פלחי UTM, קו המשווה${mode === 'greenwich' ? ' וקו גריניץ׳' : ''}. ${targetText}`.trim();
  const insetDesc =
    mode === 'explore'
      ? gridMode
        ? `תקריב של פלח ${reading.zone} עם רשת המטרים שלו. A: מזרח ${reading.eText}, צפון ${reading.nText}.`
        : `תקריב של פלח ${reading.zone} ושכניו. נקודה A מסומנת.`
      : `תקריב אזורי: פלחים ${insetZones.join(', ')}, עם הגבולות וקווי האורך שלהם${mode === 'greenwich' ? ' וקו גריניץ׳' : ''}. ${targetText}`.trim();
  const step = gridStep(inset);

  return (
    <div
      className="surface-elevated p-6 lg:p-8"
      data-activity="utm-atlas"
      data-mode={mode}
      data-lat={point.lat}
      data-lon={point.lon}
      data-zone={reading.zone}
      data-hemisphere={reading.hemisphere}
      data-inset={insetKind}
      data-lead={worldLeads ? 'world' : 'inset'}
      data-event={event.kind}
      data-task-state={mode === 'greenwich' || mode === 'transfer' ? (solved ? 'solved' : task.shown ? 'shown' : task.last ? 'tried' : 'open') : undefined}
    >
      {/* what this view teaches, its one action, and the switch between the two views */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h4 ref={titleRef} tabIndex={-1} className={cn(HEADING, 'outline-none')} data-title>
            {title}
          </h4>
          <p className={cn(BODY, 'mt-1')} data-prompt={mode === 'greenwich' || mode === 'transfer' || undefined} data-instruction>
            {instruction}
          </p>
        </div>
        {mode === 'explore' ? (
          <Segmented items={VIEW_ITEMS} value={insetKind} onChange={switchInset} label="מה בודקים" className="w-[17rem] shrink-0" />
        ) : mode !== 'done' ? (
          <Button variant="secondary" size="sm" className="shrink-0" onClick={backToExplore}>
            חזרה לחקירה
          </Button>
        ) : null}
      </div>

      {/* the stage: the leading map at inline-start; the answer, the small map and the secondary actions beside it */}
      <div ref={mapsRef} className="relative mt-5 grid grid-cols-[minmax(0,1fr)_27.5rem] grid-rows-[auto_auto_1fr] gap-x-10 gap-y-4">
        <section aria-label="מפת איתור עולמית" className={cn(worldLeads ? MAIN : SIDE_MAP, !worldLeads && 'flex items-end gap-4')} data-map-role={worldLeads ? 'main' : 'locator'}>
          <div className={worldLeads ? undefined : 'w-[19rem] shrink-0'}>
            <AtlasMap
              kind="world"
              name="מפת איתור עולמית"
              description={worldDesc}
              view={WORLD_VIEW}
              basemap={basemap}
              marks={worldMarks}
              topLabels={worldTop}
              showTop={worldLeads}
              chips={worldChips}
              frameRef={worldRef}
              pinRef={worldPinRef}
              onPointer={mode === 'explore' ? (p, phase, onPin) => placeAt(p, phase, 'world', onPin) : practising ? (p, phase) => pickAt(p, phase) : undefined}
              onHover={practising ? hoverAt : undefined}
              keyboard={practising ? { label: mode === 'greenwich' ? 'בחירת פלח במפה' : 'בחירת פלח וחצי כדור במפה', describedBy: pickHelpId, onKey: pickKey } : undefined}
              onPinKey={mode === 'explore' ? (e) => nudge(e, 'world') : undefined}
              pinAria={mode === 'explore' ? `נקודה A במפת העולם, ${latLonText(point.lat, point.lon)}` : undefined}
              pinDescribedBy={pinHelpId}
            />
          </div>
          <p className={cn(BODY, worldLeads && 'mt-2')} data-locator-note>
            מפת איתור, לא מפת <L>UTM</L>.{worldLeads && ' כל רצועה היא פלח; המסגרת הכתומה מוגדלת בתקריב.'}
            {practising && ' בוחרים בלחיצה על הפלח בכל אחת משתי המפות, או בחצים.'}
          </p>
        </section>

        <section aria-label="תקריב אזורי" className={worldLeads ? SIDE_MAP : MAIN} data-map-role={worldLeads ? 'side' : 'main'}>
          <AtlasMap
            kind="inset"
            name="תקריב אזורי"
            description={insetDesc}
            view={inset}
            basemap={basemap}
            marks={insetMarks}
            topLabels={insetTop}
            linked={worldLeads && mode !== 'done'}
            chips={insetChips}
            frameRef={insetRef}
            pinRef={insetPinRef}
            onPointer={mode === 'explore' ? (p, phase, onPin) => placeAt(p, phase, 'inset', onPin) : practising ? (p, phase) => pickAt(p, phase) : undefined}
            onHover={practising ? hoverAt : undefined}
            onPinKey={mode === 'explore' ? (e) => nudge(e, 'inset') : undefined}
            pinAria={mode === 'explore' ? `נקודה A בתקריב, ${latLonText(point.lat, point.lon)}` : undefined}
            pinDescribedBy={pinHelpId}
          >
            {gridMode && <ScaleBar view={inset} />}
            {gridMode && <Axes />}
          </AtlasMap>
          {gridMode && (
            <p className={cn(BODY, 'mt-2')} data-grid-note>
              רשת פלח {reading.zone}: קו בכל <L>{step / 1000}</L> ק״מ, המספרים במטרים.
            </p>
          )}
        </section>

        <div ref={sideRef} className="col-start-2 row-start-1 min-w-0" data-panel={mode}>
          {mode === 'explore' ? (
            gridMode ? (
              <MetresCard reading={reading} event={event} reduce={reduce} onStep={(d) => goZone(wrapZone(reading.zone + d))} />
            ) : (
              <ZonesCard reading={reading} event={event} reduce={reduce} />
            )
          ) : mode === 'done' ? (
            <DoneCard results={results} onBack={backToExplore} onAgain={startGreenwich} />
          ) : (
            <PracticeCard
              mode={mode}
              item={item}
              target={target}
              targetReading={targetReading}
              task={task}
              reduce={reduce}
              onCheck={runCheck}
              onShow={showAnswer}
              onTransfer={() => startTransfer(0)}
              onNext={nextItem}
            />
          )}
        </div>

        {/* under the enlargement: the hints point at the maps right above them, and the maps stay put */}
        {(mode === 'greenwich' || mode === 'transfer') && (task.last || task.shown) && (
          <div className="col-start-2 row-start-3 min-w-0 self-start" data-practice-feedback={mode}>
            {mode === 'greenwich' ? (
              <GreenwichFeedback task={task} />
            ) : (
              <TransferFeedback task={task} target={target!} r={targetReading!} letter={letter} />
            )}
          </div>
        )}

        {mode === 'explore' && (
          <div className="col-start-2 row-start-3 flex flex-wrap items-start gap-3 self-start" data-secondary>
            <Button variant="secondary" size="sm" onClick={nextPreset}>
              נסו נקודה אחרת
            </Button>
            {!gridMode && (
              <Button variant="secondary" size="sm" onClick={startGreenwich}>
                תרגול: מצאו את גריניץ׳
              </Button>
            )}
          </div>
        )}

        {connectors && (
          <svg aria-hidden className="pointer-events-none absolute inset-0 z-[4] hidden size-full overflow-visible lg:block" data-connectors>
            {connectors.map(([x1, y1, x2, y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-accent/70" strokeWidth={1.25} strokeDasharray="5 4" />
            ))}
          </svg>
        )}
      </div>

      <p id={pinHelpId} className="sr-only">
        אפשר לגרור את הנקודה, ללחוץ במפה או להזיז אותה בחצים. במפת העולם צעד החץ הוא 6 מעלות מזרחה או מערבה ו־5 מעלות צפונה או דרומה; בתקריב
        חצי מעלה, וברשת המטרים 10 קילומטרים. עם Shift הצעד קטן יותר.
      </p>
      <p id={pickHelpId} className="sr-only">
        {mode === 'greenwich'
          ? 'חץ ימינה או שמאלה מעביר לפלח הסמוך, מזרחה או מערבה. אחר כך Tab אל ״בדיקת הבחירה״.'
          : 'חץ ימינה או שמאלה מעביר לפלח הסמוך, מזרחה או מערבה; חץ למעלה בוחר את חצי הכדור הצפוני, וחץ למטה את הדרומי. אחר כך Tab אל ״בדיקת הבחירה״.'}
      </p>
      <p className="sr-only" aria-live="polite" data-announce>
        {announce}
      </p>
      {failed && (
        <p className={cn(BODY, 'mt-4')} data-basemap-failed>
          מפת היבשות לא נטענה. הפלחים, הנקודה והמספרים פועלים גם בלעדיה.
        </p>
      )}

      {/* secondary background, closed by default */}
      <Accordion type="single" collapsible className="mt-5">
        <AccordionItem value="more" className="border-border bg-bg-elevated hover:border-brand/30 data-[state=open]:border-brand/45" data-more>
          <AccordionTrigger>
            <span className="flex-1 font-display text-base font-bold leading-tight text-black transition-colors md:text-lg">
              מידע נוסף על <L>UTM</L>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc space-y-1.5 ps-5 text-base leading-relaxed text-black">
              <li>
                הפלחים ממוספרים מזרחה, מפלח 1 שמתחיל ב־<L>180°W</L> ועד פלח 60. כל פלח רחב בדרך כלל <L>6°</L> של אורך.
              </li>
              <li>
                <L>UTM</L> משמשת בין <L>80°S</L> ל־<L>84°N</L>. באזורי הקטבים, המוצללים במפה, משתמשים במערכת אחרת.
              </li>
              <li>
                חריגים: בדרום־מערב נורווגיה פלח 32 מורחב מערבה עד <L>3°E</L>. באזור סבאלברד הפלחים 31, 33, 35 ו־37 רחבים יותר, ופלחים 32, 34 ו־36
                לא קיימים.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/* ── exploration: the answer card of each view ───────────────────────────── */

/** "פלחים": only the zone and the hemisphere, then why. */
function ZonesCard({ reading, event, reduce }: { reading: UtmReading; event: Event; reduce: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 rounded-xl border border-border/80 [&>*+*]:border-s [&>*+*]:border-border/60" data-row="place">
        <Cell label="פלח">
          <span className={cn(VALUE, VALUE_BOX, 'min-w-[4.5rem]')} data-value="zone">
            <Changing value={String(reading.zone)} reduce={reduce}>
              {reading.zone}
            </Changing>
          </span>
        </Cell>
        <Cell label="חצי כדור">
          <span className={cn(VALUE, VALUE_BOX)} data-value="hemisphere">
            <Changing value={reading.hemisphere} reduce={reduce}>
              {HEMI_NAME[reading.hemisphere]} <L>{reading.hemisphere}</L>
            </Changing>
          </span>
        </Cell>
      </div>
      <Feedback tone="info" className="min-h-[5rem]">
        <p data-explain={event.kind}>{explainZones(reading, event)}</p>
      </Feedback>
    </div>
  );
}

/** "מודדים במטרים": E and N together, with the zone, the hemisphere and the datum they are read in. */
function MetresCard({ reading, event, reduce, onStep }: { reading: UtmReading; event: Event; reduce: boolean; onStep: (d: -1 | 1) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border/80">
        <div className="grid grid-cols-2 [&>*+*]:border-s [&>*+*]:border-border/60" data-row="metres">
          <Cell
            label={
              <>
                מזרח <L>E</L>
              </>
            }
          >
            <span className={VALUE} data-value="e">
              <Changing value={reading.eText} reduce={reduce}>
                <L>{reading.eText}</L>
              </Changing>{' '}
              <span className={UNIT}>מ׳</span>
            </span>
          </Cell>
          <Cell
            label={
              <>
                צפון <L>N</L>
              </>
            }
          >
            <span className={VALUE} data-value="n">
              <Changing value={reading.nText} reduce={reduce}>
                <L>{reading.nText}</L>
              </Changing>{' '}
              <span className={UNIT}>מ׳</span>
            </span>
          </Cell>
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] border-t border-border/60 [&>*+*]:border-s [&>*+*]:border-border/60" data-row="context">
          <Cell label="פלח" className="px-3">
            <ZoneStepper zone={reading.zone} onStep={onStep} reduce={reduce} />
          </Cell>
          <Cell label="חצי כדור" className="px-3">
            <span className={cn(VALUE, 'py-1.5 text-lg')} data-value="hemisphere">
              {HEMI_NAME[reading.hemisphere]} <L>{reading.hemisphere}</L>
            </span>
          </Cell>
          <Cell label="דאטום" className="px-3">
            <span className={cn(VALUE, 'py-1.5 text-lg')} data-value="datum">
              <L>{DATUM}</L>
            </span>
          </Cell>
        </div>
      </div>
      <Feedback tone="info" className="min-h-[5rem]">
        <p data-explain={event.kind}>{explainMetres(reading, event)}</p>
      </Feedback>
    </div>
  );
}

const EXCEPTION_NOTE = {
  norway: (
    <>
      בדרום־מערב נורווגיה פלח 32 מורחב מערבה עד <L>3°E</L>.
    </>
  ),
  svalbard: <>באזור סבאלברד הפלחים 31, 33, 35 ו־37 רחבים יותר.</>,
};

const OUTSIDE = (
  <>
    מחוץ לתחום: <L>UTM</L> משמשת בין <L>80°S</L> ל־<L>84°N</L>, ולכן אין כאן פלח. הנקודה נשארה במקומה.
  </>
);

const sideOfEquator = (r: UtmReading) => (r.hemisphere === 'N' ? 'מצפון' : 'מדרום');

/** Why the point has its zone and hemisphere: the zone's longitudes and its side of the equator. */
const whyZone = (r: UtmReading) => (
  <>
    בין <L>{fmtLon(r.range.w)}</L> ל־<L>{fmtLon(r.range.e)}</L>, בתחום פלח {r.zone}, ו{sideOfEquator(r)} לקו המשווה.
  </>
);

/** The zones view's feedback: where the point is, or what the last action changed. */
function explainZones(r: UtmReading, ev: Event): ReactNode {
  const note = r.exception ? <> {EXCEPTION_NOTE[r.exception]}</> : null;
  switch (ev.kind) {
    case 'outside':
      return OUTSIDE;
    case 'preset':
      return (
        <>
          A הועברה ל{ev.place.name}: {whyZone(r)}
          {r.exception === 'norway' ? (
            <>
              {' '}
              לפי החלוקה הרגילה זה היה פלח {regularZone(r.lon)}, אבל בדרום־מערב נורווגיה פלח 32 מורחב מערבה עד <L>3°E</L>.
            </>
          ) : (
            note
          )}
        </>
      );
    case 'pick': {
      const p = ev.prev;
      const hemiChanged = p.hemisphere !== r.hemisphere;
      if (p.zone === r.zone && !hemiChanged)
        return (
          <>
            A עדיין {whyZone(r)}
            {note}
          </>
        );
      const lon = Math.abs(zoneStep(p.zone, r.zone)) === 1 ? sharedBoundary(p.zone, r.zone, r.lat) : null;
      if (lon != null && !hemiChanged)
        return (
          <>
            A חצתה את קו האורך <L>{fmtLon(lon)}</L> ועברה מפלח {p.zone} לפלח {r.zone}.{note}
          </>
        );
      if (p.zone === r.zone)
        return (
          <>
            A חצתה את קו המשווה, ולכן היא עכשיו בחצי הכדור ה{HEMI_NAME[r.hemisphere]}.{note}
          </>
        );
      return (
        <>
          A עברה לפלח {r.zone}: {whyZone(r)}
          {note}
        </>
      );
    }
    default:
      return (
        <>
          A נמצאת {whyZone(r)}
          {note}
        </>
      );
  }
}

/** E against the zone's central meridian (E = 500000 m there). */
const sideOfMiddle = (r: UtmReading) =>
  Math.abs(r.e - 500000) < 0.5 ? (
    <>
      A על קו האמצע של הפלח, ולכן <L>E</L> הוא בדיוק <L>500000</L>
      {NBSP}מ׳.
    </>
  ) : (
    <>
      <L>E</L> {r.e > 500000 ? 'גדול' : 'קטן'} מ־<L>500000</L>
      {NBSP}מ׳, כי A {r.e > 500000 ? 'מזרחית' : 'מערבית'} לקו האמצע של הפלח.
    </>
  );

/** The metres view's feedback: what the last action did to E and N. */
function explainMetres(r: UtmReading, ev: Event): ReactNode {
  switch (ev.kind) {
    case 'outside':
      return OUTSIDE;
    case 'view':
      return <>A לא זזה: אותו מקום נכתב עכשיו במטרים, ברשת של פלח {r.zone}.</>;
    case 'preset':
      return (
        <>
          A הועברה ל{ev.place.name}, בפלח {r.zone}. {sideOfMiddle(r)}
        </>
      );
    case 'zone': {
      const d = zoneStep(ev.prev.zone, r.zone);
      const same = Math.abs(r.e - ev.prev.e) < 0.5 && Math.abs(r.n - ev.prev.n) < 0.5;
      return same ? (
        <>
          A הועברה <L>{Math.abs(d) * 6}°</L> {d > 0 ? 'מזרחה' : 'מערבה'}, לפלח {r.zone}. <L>E</L> ו־<L>N</L> לא השתנו, אבל זה מקום אחר: לכן תמיד
          מציינים את הפלח.
        </>
      ) : (
        <>
          A הועברה לפלח {r.zone}, ולכן היא נמדדת ברשת שלו. {sideOfMiddle(r)}
        </>
      );
    }
    case 'pick': {
      const p = ev.prev;
      if (p.zone === r.zone && p.hemisphere === r.hemisphere) {
        const dE = r.e - p.e;
        const dN = r.n - p.n;
        if (Math.abs(dE) < 0.5 && Math.abs(dN) < 0.5) return sideOfMiddle(r);
        return (
          <>
            A זזה בתוך פלח {r.zone}: <L>E</L> {grew(dE)}
            {Math.abs(dE) >= 0.5 && (
              <>
                {' '}
                ב־<L>{km(dE)}</L> ק״מ
              </>
            )}
            , ו־<L>N</L> {grew(dN)}
            {Math.abs(dN) >= 0.5 && (
              <>
                {' '}
                ב־<L>{km(dN)}</L> ק״מ
              </>
            )}
            . מזרחה <L>E</L> גדל, צפונה <L>N</L> גדל.
          </>
        );
      }
      if (p.hemisphere !== r.hemisphere)
        return r.hemisphere === 'S' ? (
          <>
            A עברה לחצי הכדור הדרומי. כאן <L>N</L> נמדד מ־<L>10000000</L>
            {NBSP}מ׳ בקו המשווה וקטן דרומה.
          </>
        ) : (
          <>
            A עברה לחצי הכדור הצפוני. כאן <L>N</L> נמדד מ־<L>0</L> בקו המשווה וגדל צפונה.
          </>
        );
      const lon = Math.abs(zoneStep(p.zone, r.zone)) === 1 ? sharedBoundary(p.zone, r.zone, r.lat) : null;
      return lon != null ? (
        <>
          A חצתה את <L>{fmtLon(lon)}</L> לפלח {r.zone}, ולכן היא נמדדת ברשת שלו: <L>E</L> השתנה מ־<L>{p.eText}</L> ל־<L>{r.eText}</L>.
        </>
      ) : (
        <>
          A עברה לפלח {r.zone}, ולכן היא נמדדת ברשת שלו. {sideOfMiddle(r)}
        </>
      );
    }
    default:
      return sideOfMiddle(r);
  }
}

/* ── practice ─────────────────────────────────────────────────────────────── */

/** "בין 132°E ל־138°E": a zone's two boundaries — the lines the maps label above the enlargement. */
const between = (z: number, lat: number) => {
  const r = zoneRangeAt(z, lat) ?? { w: zoneWest(z), e: zoneEast(z) };
  return (
    <>
      בין <L>{fmtLon(r.w)}</L> ל־<L>{fmtLon(r.e)}</L>
    </>
  );
};
const SIDE: Record<Hemisphere, string> = { N: 'מצפון', S: 'מדרום' };
const tryAgain = (fails: number) => (fails >= SHOW_AFTER ? 'בחרו שוב במפה ובדקו, או הציגו את התשובה.' : 'בחרו שוב במפה ובדקו.');

/** The task, the choice read back from the map (the exploration card's cells, filled by the learner;
    ✓ / ✕ only on a checked choice) and the actions. The feedback sits under the enlargement. */
function PracticeCard({
  mode,
  item,
  target,
  targetReading,
  task,
  reduce,
  onCheck,
  onShow,
  onTransfer,
  onNext,
}: {
  mode: 'greenwich' | 'transfer';
  item: number;
  target: Place | null;
  targetReading: UtmReading | null;
  task: Task;
  reduce: boolean;
  onCheck: () => void;
  onShow: () => void;
  onTransfer: () => void;
  onNext: () => void;
}) {
  const solved = task.zoneDone && task.hemiDone;
  const over = solved || task.shown;
  /* a check needs a full choice that differs from the one just checked */
  const changed = !task.last || task.last.zone !== task.pick || task.last.hemi !== task.hemiPick;
  const complete = task.pick != null && (mode === 'greenwich' || task.hemiPick != null);
  const ready = complete && changed;
  const letter = TRANSFER_LETTERS[item];
  /* ✓ / ✕ belong to the checked choice only: a new choice drops the mark until it is checked */
  const zoneVerdict = task.zoneDone ? 'right' : task.last && task.pick === task.last.zone ? 'wrong' : null;
  const hemiVerdict = task.hemiDone ? 'right' : task.last && task.hemiPick === task.last.hemi ? 'wrong' : null;

  /* A short verdict for screen readers (the explanation stays readable text, not a live region);
     a solved or shown task swaps its button for the way forward, and focus moves there. */
  const [status, setStatus] = useState('');
  const actionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!task.last && !task.shown) {
      setStatus('');
      return;
    }
    const hemiPart = (h: Hemisphere | null) => (h ? `, חצי הכדור ה${HEMI_NAME[h]}` : '');
    let text: string;
    if (task.shown && targetReading) text = `התשובה: פלח ${targetReading.zone}${hemiPart(targetReading.hemisphere)}.`;
    else if (task.shown) text = `התשובה: פלח ${GREENWICH_ZONE}.`;
    else if (solved) text = `נכון: פלח ${task.last!.zone}${hemiPart(task.last!.hemi)}.`;
    else {
      const parts = [task.last!.zoneOk ? 'הפלח נכון' : 'הפלח לא נכון'];
      if (mode === 'transfer') parts.push(task.last!.hemiOk ? 'חצי הכדור נכון' : 'חצי הכדור לא נכון');
      text = `${parts.join(', ')}. הרמז מופיע מתחת לתקריב; בחרו שוב במפה.`;
    }
    setStatus((s) => (s === text ? `${text}​` : text));
    if (solved || task.shown) requestAnimationFrame(() => actionRef.current?.querySelector('button')?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.last, task.shown]);

  return (
    <div className="flex flex-col gap-3" data-practice={mode}>
      <p role="status" className="sr-only" data-verdict>
        {status}
      </p>
      {/* the place, not its coordinates: where it is, and so its zone and side, is read on the map */}
      {mode === 'transfer' && target && (
        <p className={BODY} data-task-data>
          <span className="font-display font-bold">נקודה {letter}</span> · {target.name}
        </p>
      )}
      <div
        className={cn('grid rounded-xl border border-border/80 [&>*+*]:border-s [&>*+*]:border-border/60', mode === 'transfer' ? 'grid-cols-2' : 'grid-cols-1')}
        data-row="choice"
      >
        <Cell label="הפלח שבחרתם">
          <span className={cn(VALUE, VALUE_BOX, 'relative min-w-[4.5rem]')} data-choice="zone">
            <Changing value={String(task.pick ?? '')} reduce={reduce}>
              {task.pick ?? '—'}
            </Changing>
            {zoneVerdict && <VerdictMark verdict={zoneVerdict} />}
          </span>
        </Cell>
        {mode === 'transfer' && (
          <Cell label="חצי הכדור שבחרתם">
            <span className={cn(VALUE, VALUE_BOX, 'relative')} data-choice="hemisphere">
              <Changing value={task.hemiPick ?? ''} reduce={reduce}>
                {task.hemiPick ? (
                  <>
                    {HEMI_NAME[task.hemiPick]} <L>{task.hemiPick}</L>
                  </>
                ) : (
                  '—'
                )}
              </Changing>
              {hemiVerdict && <VerdictMark verdict={hemiVerdict} />}
            </span>
          </Cell>
        )}
      </div>
      <div ref={actionRef} className="flex flex-wrap items-center gap-3">
        {over ? (
          <Button variant="primary" size="md" className="min-w-[12rem]" onClick={mode === 'greenwich' ? onTransfer : onNext}>
            {mode === 'greenwich' ? 'לנקודות חדשות' : item + 1 < TRANSFER.length ? 'לנקודה הבאה' : 'לסיום התרגול'}
          </Button>
        ) : (
          <>
            {/* unchanged since the last check: dimmed but still focused (a wrong check keeps the keyboard here) */}
            <Button
              variant="primary"
              size="md"
              className={cn('min-w-[12rem]', complete && !ready && 'cursor-not-allowed opacity-45 hover:brightness-100 active:translate-y-0')}
              onClick={() => ready && onCheck()}
              disabled={!complete}
              aria-disabled={(complete && !ready) || undefined}
            >
              בדיקת הבחירה
            </Button>
            {task.fails >= SHOW_AFTER && (
              <Button variant="secondary" size="md" onClick={onShow} data-show-answer>
                הצגת התשובה
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Greenwich: right → why 31 (the line is its western, left-hand edge); wrong → what the checked
    zone's edges are (1), then where to look on the map (2). */
function GreenwichFeedback({ task }: { task: Task }) {
  if (task.zoneDone)
    return (
      <Feedback tone="right" className="[&_p+p]:mt-1.5">
        <p>
          נכון: פלח 31. קו גריניץ׳ (<L>0°</L>) הוא הגבול המערבי שלו, הקו בצד השמאלי שלו במפה, והפלח משתרע ממנו מזרחה עד <L>6°E</L>. פלח 30, שממערב לקו,
          מסתיים בו.
        </p>
      </Feedback>
    );
  if (task.shown)
    return (
      <Feedback tone="info">
        <p data-answer>
          התשובה: פלח 31. הוא מתחיל בקו גריניץ׳ (<L>0°</L>) ומשתרע מזרחה עד <L>6°E</L>, ולכן הקו הוא הגבול המערבי שלו. פלח 30 מסתיים בקו, ואצלו זה הגבול
          המזרחי.
        </p>
      </Feedback>
    );
  const z = task.last!.zone;
  const level = Math.min(task.zoneMiss, 2);
  return (
    <Feedback tone="wrong" className="[&_p+p]:mt-1.5">
      <p data-hint="zone" data-level={level}>
        {z === 30 ? (
          <>בחרתם בפלח 30. הוא נמצא ממערב לקו גריניץ׳ ומסתיים בו, ולכן אצלו הקו הוא הגבול המזרחי.</>
        ) : (
          <>
            בחרתם בפלח {z}, {between(z, GREENWICH_LAT)}: קו גריניץ׳ אינו הגבול המערבי שלו.
          </>
        )}{' '}
        {level >= 2
          ? 'רמז: במפה מערב הוא שמאל. מצאו בתקריב את הרצועה שקו גריניץ׳ המודגש הוא הקו השמאלי שלה, וקראו את המספר שבראשה.'
          : z === 30
            ? 'הגבול המערבי של פלח הוא הקו בצד השמאלי שלו במפה.'
            : 'מצאו בתקריב את הקו הכהה של גריניץ׳ ובדקו אילו פלחים נוגעים בו.'}
      </p>
      <p>{tryAgain(task.fails)}</p>
    </Feedback>
  );
}

/** A new point: right → how the point, the zone's boundaries and the equator give the cell (and its
    E/N there); wrong → per part, hint 1 says what to look at on the map, hint 2 points at what the
    maps now mark; a part right is said once. */
function TransferFeedback({ task, target, r, letter }: { task: Task; target: Place; r: UtmReading; letter: string }) {
  const where = (
    <>
      {letter} ב־<L>{fmtLon(target.lon, 2)}</L>, {between(r.zone, r.lat)}, שהם גבולות פלח {r.zone}, וב־<L>{fmtLat(target.lat, 2)}</L>, {SIDE[r.hemisphere]} לקו המשווה
    </>
  );
  const cell = <L>{`${r.zone}${r.hemisphere}`}</L>;
  if (task.zoneDone && task.hemiDone)
    return (
      <Feedback tone="right" className="[&_p+p]:mt-1.5">
        <p>
          נכון: {cell}. {where}, ולכן בחצי הכדור ה{HEMI_NAME[r.hemisphere]}.
        </p>
        <p>
          במטרים, ברשת {cell}: <L>E {r.eText}</L>
          {NBSP}מ׳, <L>N {r.nText}</L>
          {NBSP}מ׳ (<L>{DATUM}</L>).
        </p>
      </Feedback>
    );
  if (task.shown)
    return (
      <Feedback tone="info">
        <p data-answer>
          התשובה: {cell}, פלח {r.zone} בחצי הכדור ה{HEMI_NAME[r.hemisphere]}. {where}.
        </p>
      </Feedback>
    );
  const last = task.last!;
  const zl = Math.min(task.zoneMiss, 2);
  const hl = Math.min(task.hemiMiss, 2);
  return (
    <Feedback tone="wrong" className="[&_p+p]:mt-1.5">
      {task.zoneDone ? (
        <p data-hint="zone" data-level={0}>
          הפלח נכון: {r.zone}.
        </p>
      ) : (
        <p data-hint="zone" data-level={zl}>
          בחרתם בפלח {last.zone}, {between(last.zone, target.lat)}, ו־{letter} לא נמצאת בתחום הזה.{' '}
          {zl >= 2 ? (
            <>
              רמז: {letter} נמצאת בין <L>{fmtLon(r.range.w)}</L> ל־<L>{fmtLon(r.range.e)}</L>, הקווים הכתומים. קראו בתקריב את המספר שבראש הרצועה
              שביניהם.
            </>
          ) : (
            <>בתקריב, בדקו בין אילו שני קווים מקווקווים נמצאת הסיכה {letter}.</>
          )}
        </p>
      )}
      {task.hemiDone ? (
        <p data-hint="hemi" data-level={0}>
          חצי הכדור נכון: {HEMI_NAME[r.hemisphere]} (<L>{r.hemisphere}</L>).
        </p>
      ) : (
        <p data-hint="hemi" data-level={hl}>
          בחרתם בחצי הכדור ה{HEMI_NAME[last.hemi!]} (<L>{last.hemi}</L>).{' '}
          {hl >= 2 ? (
            <>
              רמז: במפה הסיכה {letter} נמצאת {r.hemisphere === 'N' ? 'מעל ' : 'מתחת ל'}קו המשווה, כלומר {SIDE[r.hemisphere]} לו.
            </>
          ) : (
            <>
              חצי הכדור נקבע לפי צד קו המשווה שבו נמצאת הסיכה. בדקו במפה: {letter} מעל הקו המודגש או מתחתיו?
            </>
          )}
        </p>
      )}
      <p>{tryAgain(task.fails)}</p>
    </Feedback>
  );
}

function DoneCard({ results, onBack, onAgain }: { results: Result[]; onBack: () => void; onAgain: () => void }) {
  const total = 1 + TRANSFER.length;
  const own = results.filter((r) => r === 'solved').length;
  return (
    <div className="flex flex-col gap-3" data-practice="done">
      <Feedback tone={own === total ? 'right' : 'info'} className="[&_p+p]:mt-1.5">
        <p data-summary={own}>{own === total ? 'פתרתם את כל המשימות בעצמכם.' : `פתרתם ${own} מתוך ${total} משימות בעצמכם; ${total - own === 1 ? 'במשימה אחת' : `ב־${total - own} משימות`} הוצגה התשובה.`}</p>
        <p>
          כדי לפרש מספרי <L>E</L> ו־<L>N</L> צריך לדעת שלושה דברים: הפלח, חצי הכדור והדאטום.
        </p>
      </Feedback>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="md" onClick={onBack}>
          חזרה לחקירה
        </Button>
        <Button variant="secondary" size="md" onClick={onAgain}>
          תרגול מחדש
        </Button>
      </div>
    </div>
  );
}

/* ── map furniture ───────────────────────────────────────────────────────── */

/** Scale of the enlargement's lon/lat window along its centre latitude (exact there, close
    elsewhere in so small a window), drawn like the reference-systems maps' bar; frame-relative
    widths via the frame's container query units. */
function ScaleBar({ view }: { view: View }) {
  const kmLen = scaleBarKm(view);
  const frameKm = view.w * KM_PER_DEG * Math.cos(view.lat0 * RAD);
  const w = `${((kmLen / frameKm) * 100).toFixed(3)}cqw`;
  return (
    <div
      aria-hidden
      data-scale-bar={kmLen}
      className="absolute z-[2] flex items-end gap-2 rounded-md bg-bg-elevated/85 px-2.5 pb-1.5 pt-1 font-display text-[13px] font-semibold leading-none tabular-nums text-fg"
      style={{ left: 8, bottom: 8 }}
    >
      <div className="shrink-0" style={{ width: w }}>
        <div className="relative mb-1 h-3.5">
          <span className="absolute -translate-x-1/2" style={{ left: 0 }}>
            0
          </span>
          <span className="absolute -translate-x-1/2" style={{ left: '50%' }}>
            {kmLen / 2}
          </span>
          <span className="absolute translate-x-1/2" style={{ right: 0 }}>
            {kmLen}
          </span>
        </div>
        <div className="flex h-1.5 border border-fg">
          <span className="flex-1 bg-fg" />
          <span className="flex-1 bg-bg-elevated" />
        </div>
      </div>
      <span dir="rtl" className="ps-1 leading-[14px]">
        ק״מ
      </span>
    </div>
  );
}

/** The grid's axes: E grows to the east, N to the north. */
function Axes() {
  return (
    <div aria-hidden data-axes className="absolute z-[2] rounded-md bg-bg-elevated/85 p-1.5" style={{ right: 8, bottom: 8 }}>
      <svg width="58" height="50" viewBox="0 0 58 50" className="block">
        <path d="M10 42 H42 M36 37 l6 5 -6 5 M10 42 V10 M5 16 l5 -6 5 6" fill="none" className="stroke-fg" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <text x="46" y="46" textAnchor="start" className="fill-fg font-display text-[13px] font-bold">
          E
        </text>
        <text x="18" y="12" textAnchor="start" className="fill-fg font-display text-[13px] font-bold">
          N
        </text>
      </svg>
    </div>
  );
}
