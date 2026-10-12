'use client';
/* ─────────── היטל UTM — "אטלס הפלחים" (חלופה 2) ───────────
   Brief: design/mockups/utm-concepts-2026-10-12/README.md; mockup 02-zone-atlas.png.

   One point drives everything (utmAtlas.ts): the world locator map, the
   enlargement, the zone, the hemisphere, the zone's range, E/N and the
   explanation are all derived from it. Practice ("מצאו את גריניץ׳", then three
   new points) runs in the same card on its own state, so going back to the
   exploration finds the point where it was. */

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { L } from '../Ltr';
import { fromUtm } from '../reference-systems/utm';
import { AtlasMap, type Chip, type Marks, type TopLabel } from './AtlasMap';
import { BODY, Cell, Changing, Feedback, HEADING, HEMI_ITEMS, LABEL, Segmented, VALUE, ZoneRow } from './atlasControls';
import {
  FRAME_ASPECT, WORLD_VIEW, fracX, fracY, gridStep, latForN, lonForE, readingLines, regionView, scaleBarKm, viewBottom, viewTop, zoneGrid, zoneWindow,
  KM_PER_DEG, type View,
} from './atlasGeometry';
import { useBasemap } from './useBasemap';
import {
  DATUM, GREENWICH_ZONE, HEMI_NAME, NORTH_LIMIT, OPENING, PRESETS, SOUTH_LIMIT, TRANSFER, centralMeridian, clampLat, fmtLat, fmtLon, fmtRange,
  inCoverage, moveToHemisphere, moveToZone, normLon, readUtm, regularZone, utmZoneOf, wrapZone, zoneBoundarySegments, zoneEast,
  zoneRangeAt, zoneStep, zoneWest, type Hemisphere, type LatLon, type Place, type UtmReading,
} from './utmAtlas';

type InsetKind = 'zones' | 'grid';
type Mode = 'explore' | 'greenwich' | 'transfer' | 'done';

type Event =
  | { kind: 'start' }
  | { kind: 'pick'; prev: UtmReading }
  | { kind: 'zone'; prev: UtmReading }
  | { kind: 'hemi'; prev: UtmReading }
  | { kind: 'preset'; place: Place }
  | { kind: 'outside'; lat: number }
  | { kind: 'view'; to: InsetKind };

type Check = { zone: number; hemi: Hemisphere | null; zoneOk: boolean; hemiOk: boolean };

const RAD = Math.PI / 180;
/** Keeps a unit on the line of its number ("500000 מ׳"). */
const NBSP = ' ';
const GREENWICH_LAT = 51.48;
const TRANSFER_LETTERS = ['B', 'C', 'D'];
const VIEW_ITEMS = [
  { id: 'zones' as const, label: 'פלחים' },
  { id: 'grid' as const, label: 'מודדים במטרים' },
];

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
  const [rowCenter, setRowCenter] = useState(36);
  /** The zone row stays put while the chosen zone is on it; it pages only when it must. */
  const follow = (set: (f: (c: number) => number) => void, z: number) => set((c) => (Math.abs(zoneStep(c, z)) <= 2 ? c : z));
  const [presetIdx, setPresetIdx] = useState(0);
  const gesture = useRef<UtmReading | null>(null);
  const [announce, setAnnounce] = useState('');

  /* practice state */
  const [mode, setMode] = useState<Mode>('explore');
  const [pick, setPick] = useState<number | null>(null);
  const [hemiPick, setHemiPick] = useState<Hemisphere | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [item, setItem] = useState(0);
  const [practiceRow, setPracticeRow] = useState(GREENWICH_ZONE);

  const worldRef = useRef<HTMLDivElement>(null);
  const insetRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const insetPinRef = useRef<HTMLButtonElement>(null);
  const worldPinRef = useRef<HTMLButtonElement>(null);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);

  const target = mode === 'transfer' || mode === 'done' ? TRANSFER[Math.min(item, TRANSFER.length - 1)] : null;
  const targetReading = useMemo(() => (target ? readUtm(target) : null), [target]);
  const revealed = mode === 'done' || (mode === 'transfer' && Boolean(check?.zoneOk && check?.hemiOk));

  /* ── the enlargement's window per mode ── */
  const insetTarget: View = useMemo(() => {
    if (mode === 'explore') return exploreView.view;
    if (mode === 'greenwich') {
      const z = check ? check.zone : pick;
      return z ? zoneWindow({ w: zoneWest(z), e: zoneEast(z) }, GREENWICH_LAT, 'zones') : regionView(0, GREENWICH_LAT, 21);
    }
    return regionView(target!.lon, target!.lat, 21);
  }, [mode, exploreView, pick, check, target]);
  const inset = useTweenedView(insetTarget, reduce);

  /* ── exploration actions ── */
  const recenter = (r: UtmReading, kind = insetKind, force = false) => {
    setExploreView((cur) => (!force && keepsPoint(cur.view, r, kind, cur.zone) ? cur : { view: windowFor(r, kind), zone: r.zone }));
    follow(setRowCenter, r.zone);
  };

  /** One short announcement per settled change: held arrow keys or a burst of clicks say it once. */
  const sayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = (r: UtmReading) => {
    if (sayTimer.current) clearTimeout(sayTimer.current);
    sayTimer.current = setTimeout(() => setAnnounce(`פלח ${r.zone} ${HEMI_NAME[r.hemisphere]}, מזרח ${r.eText}, צפון ${r.nText} מטרים.`), 500);
  };
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
    follow(setRowCenter, r.zone);
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

  const goHemisphere = (h: Hemisphere) => {
    if (h === reading.hemisphere) return;
    const next = moveToHemisphere(point, h);
    const r = readUtm(next);
    setPoint(next);
    setEvent({ kind: 'hemi', prev: reading });
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
  const startGreenwich = () => {
    setMode('greenwich');
    setPick(null);
    setHemiPick(null);
    setCheck(null);
    setPracticeRow(GREENWICH_ZONE);
    requestAnimationFrame(() => panelHeadingRef.current?.focus({ preventScroll: true }));
  };
  const startTransfer = (i = 0) => {
    setMode('transfer');
    setItem(i);
    setPick(null);
    setHemiPick(null);
    setCheck(null);
    setPracticeRow(GREENWICH_ZONE);
    requestAnimationFrame(() => panelHeadingRef.current?.focus({ preventScroll: true }));
  };
  const backToExplore = () => {
    setMode('explore');
    setCheck(null);
    requestAnimationFrame(() => panelHeadingRef.current?.focus({ preventScroll: true }));
  };
  const choose = (z: number) => {
    if (revealed || (mode === 'greenwich' && check?.zoneOk)) return;
    setPick(z);
    setCheck(null);
    follow(setPracticeRow, z);
  };
  const chooseHemi = (h: Hemisphere) => {
    if (revealed) return;
    setHemiPick(h);
    setCheck(null);
  };
  const runCheck = () => {
    if (pick == null) return;
    if (mode === 'greenwich') setCheck({ zone: pick, hemi: null, zoneOk: pick === GREENWICH_ZONE, hemiOk: true });
    else if (targetReading && hemiPick) setCheck({ zone: pick, hemi: hemiPick, zoneOk: pick === targetReading.zone, hemiOk: hemiPick === targetReading.hemisphere });
  };
  const nextItem = () => {
    if (item + 1 < TRANSFER.length) startTransfer(item + 1);
    else {
      setMode('done');
      requestAnimationFrame(() => panelHeadingRef.current?.focus({ preventScroll: true }));
    }
  };
  const practicePointer = (p: LatLon, phase: 'start' | 'move' | 'end') => {
    if (phase !== 'start') return;
    choose(regularZone(p.lon));
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
  const worldChips: Chip[] = [
    { key: 'lat84', lat: NORTH_LIMIT, fx: 0.012, children: <L>84°N</L>, style: { transform: 'translateY(3px)' } },
    { key: 'lat0', lat: 0, fx: 0.012, children: <L>0°</L>, style: { transform: 'translateY(calc(-100% - 3px))' } },
    { key: 'lat80', lat: SOUTH_LIMIT, fx: 0.012, children: <L>80°S</L>, style: { transform: 'translateY(calc(-100% - 3px))' } },
    { key: 'outside', lat: -85, fx: 0.5, style: { transform: 'translate(-50%, -50%)' }, children: <span dir="rtl">מחוץ לתחום <L>UTM</L></span> },
  ];
  const insetChips: Chip[] = [];
  let focusZone: number | null = null;

  if (mode === 'explore') {
    focusZone = reading.zone;
    worldMarks.focusZone = reading.zone;
    worldMarks.pin = { lat: point.lat, lon: point.lon, label: 'A' };
    worldMarks.locator = inset;
    insetMarks.focusZone = reading.zone;
    insetMarks.pin = { lat: point.lat, lon: point.lon, label: 'A' };
    if (crossed) {
      worldMarks.boundary = { lon: crossed.lon, s: SOUTH_LIMIT, n: NORTH_LIMIT };
      insetMarks.boundary = { lon: crossed.lon, s: Math.max(SOUTH_LIMIT, viewBottom(inset)), n: Math.min(NORTH_LIMIT, viewTop(inset)) };
      insetChips.push({ key: 'crossed', lon: crossed.lon, fy: 0.78, tone: 'accent', style: { transform: 'translate(-50%, -50%)' }, children: <span dir="rtl">גבול <L>{fmtLon(crossed.lon)}</L></span> });
    }
    if ((event.kind === 'hemi' || (event.kind === 'pick' && event.prev.hemisphere !== reading.hemisphere)) && mode === 'explore') {
      worldMarks.equator = 'highlight';
      insetMarks.equator = 'highlight';
    }
  } else if (mode === 'greenwich') {
    const z = check ? check.zone : pick;
    focusZone = z;
    worldMarks.greenwich = true;
    insetMarks.greenwich = true;
    worldMarks.locator = inset;
    if (z) {
      const tone = check?.zoneOk ? 'accent' : 'pick';
      worldMarks.focusZone = z;
      worldMarks.focusTone = tone;
      insetMarks.focusZone = z;
      insetMarks.focusTone = tone;
    }
    if (check && !check.zoneOk && check.zone === 30) {
      insetMarks.boundary = { lon: 0, s: Math.max(SOUTH_LIMIT, viewBottom(inset)), n: Math.min(NORTH_LIMIT, viewTop(inset)) };
    }
    insetChips.push({ key: 'greenwich', lon: 0, fy: 0.16, tone: 'strong', style: { transform: 'translate(6px, 0)' }, children: <span dir="rtl">גריניץ׳ <L>0°</L></span> });
    worldChips.push({ key: 'greenwich', lon: 0, fy: 0.06, tone: 'strong', style: { transform: 'translate(5px, 0)' }, children: <span dir="rtl">גריניץ׳</span> });
    if (check && z) {
      insetChips.push(
        { key: 'w', lon: zoneWest(z), fy: 0.78, tone: check.zoneOk || z === 30 ? 'accent' : 'strong', style: { transform: 'translate(-50%, -50%)' }, children: <L>{fmtLon(zoneWest(z))}</L> },
        { key: 'e', lon: zoneEast(z), fy: 0.78, tone: check.zoneOk || z === 30 ? 'accent' : 'strong', style: { transform: 'translate(-50%, -50%)' }, children: <L>{fmtLon(zoneEast(z))}</L> },
      );
    }
  } else if (target && targetReading) {
    const letter = TRANSFER_LETTERS[Math.min(item, TRANSFER.length - 1)];
    worldMarks.pin = { lat: target.lat, lon: target.lon, label: letter };
    insetMarks.pin = { lat: target.lat, lon: target.lon, label: letter };
    worldMarks.locator = inset;
    if (revealed) {
      focusZone = targetReading.zone;
      worldMarks.focusZone = insetMarks.focusZone = targetReading.zone;
    } else if (check) {
      worldMarks.focusZone = insetMarks.focusZone = check.zone;
      worldMarks.focusTone = insetMarks.focusTone = 'pick';
      if (!check.zoneOk) {
        const lon = zoneStep(check.zone, targetReading.zone) > 0 ? targetReading.range.w : targetReading.range.e;
        worldMarks.boundary = { lon, s: SOUTH_LIMIT, n: NORTH_LIMIT };
        insetMarks.boundary = { lon, s: Math.max(SOUTH_LIMIT, viewBottom(inset)), n: Math.min(NORTH_LIMIT, viewTop(inset)) };
        insetChips.push({ key: 'boundary', lon, fy: 0.78, tone: 'accent', style: { transform: 'translate(-50%, -50%)' }, children: <span dir="rtl">גבול <L>{fmtLon(lon)}</L></span> });
      }
      if (!check.hemiOk) worldMarks.equator = insetMarks.equator = 'highlight';
    }
  }

  /* world: zone numbers along the top */
  const worldTop: TopLabel[] = [1, 15, 30, 45, 60]
    .filter((z) => focusZone == null || Math.abs(zoneStep(z, focusZone)) >= 4)
    .map((z) => ({ key: `z${z}`, fx: fracX(WORLD_VIEW, zoneWest(z) + 3), text: z }));
  if (focusZone != null) worldTop.push({ key: 'focus', fx: fracX(WORLD_VIEW, zoneWest(focusZone) + 3), text: focusZone, tone: 'accent' });

  /* enlargement: boundary longitudes along the top; zone numbers inside (hidden in transfer until revealed) */
  const insetTop: TopLabel[] = useMemo(() => {
    const west = inset.lon0 - inset.w / 2;
    const east = inset.lon0 + inset.w / 2;
    const lons = new Set<number>();
    for (const [[x1, y1], [x2, y2]] of zoneBoundarySegments()) {
      if (x1 !== x2) continue;
      if (Math.min(y1, y2) > viewTop(inset) || Math.max(y1, y2) < viewBottom(inset)) continue;
      const x = inset.lon0 + normLon(x1 - inset.lon0);
      if (x > west + 0.3 && x < east - 0.3) lons.add(normLon(x1));
    }
    const focusRange = focusZone != null ? zoneRangeAt(focusZone, inset.lat0) : null;
    return [...lons].map((lon) => ({
      key: `b${lon}`,
      fx: fracX(inset, lon),
      text: <L>{fmtLon(lon)}</L>,
      tone: focusRange && (lon === normLon(focusRange.w) || lon === normLon(focusRange.e)) ? ('strong' as const) : ('muted' as const),
    }));
  }, [inset, focusZone]);

  const showZoneNumbers = mode !== 'transfer' || revealed;
  if (showZoneNumbers && !(mode === 'explore' && insetKind === 'grid')) {
    const midLat = Math.max(SOUTH_LIMIT, Math.min(NORTH_LIMIT - 0.01, inset.lat0));
    const seen = new Set<number>();
    for (let lon = inset.lon0 - inset.w / 2; lon <= inset.lon0 + inset.w / 2; lon += 0.5) {
      const z = utmZoneOf({ lat: midLat, lon });
      if (seen.has(z)) continue;
      seen.add(z);
      const r = zoneRangeAt(z, midLat);
      if (!r) continue;
      const fx = fracX(inset, (r.w + r.e) / 2);
      if (fx < 0.05 || fx > 0.95) continue;
      insetChips.push({
        key: `zone${z}`,
        fx,
        fy: 0.05,
        tone: z === focusZone ? 'accent' : 'strong',
        style: { transform: 'translateX(-50%)' },
        children: <span data-zone-number={z} className="text-base">{z}</span>,
      });
    }
  }

  /* grid view: the zone's own grid, its labels and the point's reading lines */
  const gridMode = mode === 'explore' && insetKind === 'grid';
  const grid = useMemo(() => (gridMode ? zoneGrid(reading.zone, inset) : null), [gridMode, reading.zone, inset]);
  const [frames, setFrames] = useState<{ world: DOMRect; inset: DOMRect; box: DOMRect } | null>(null);
  const insetPx = frames?.inset.width ?? 488;
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
  const mapsRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = mapsRef.current;
    if (!el) return;
    const measure = () => {
      if (!worldRef.current || !insetRef.current) return;
      setFrames({ world: worldRef.current.getBoundingClientRect(), inset: insetRef.current.getBoundingClientRect(), box: el.getBoundingClientRect() });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (worldRef.current) ro.observe(worldRef.current);
    if (insetRef.current) ro.observe(insetRef.current);
    return () => ro.disconnect();
  }, [mode]);

  const connectors = useMemo(() => {
    if (!frames || mode === 'done') return null;
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
  }, [frames, inset, mode]);

  /* ── text ── */
  const insetTitle =
    mode === 'explore' ? (
      <>
        תקריב · פלח {reading.zone}
      </>
    ) : mode === 'greenwich' ? (
      'תקריב · סביב גריניץ׳'
    ) : (
      'תקריב · סביב הנקודה'
    );
  const worldTitle =
    mode === 'explore'
      ? 'בחרו נקודה בעולם ובחנו את הפלח שלה'
      : mode === 'greenwich'
        ? 'תרגול: מצאו את גריניץ׳'
        : mode === 'transfer'
          ? 'תרגול: נקודה חדשה'
          : 'תרגול: סיום';

  const step = gridStep(inset);
  const insetCaption =
    mode !== 'explore' ? (
      <>לכל פלח רשת מקומית משלו. בתקריב מסומנים גבולות הפלחים, ומעליהם קווי האורך.</>
    ) : insetKind === 'zones' ? (
      <>לכל פלח רשת מקומית משלו. בתקריב: הפלח של הנקודה ושני שכניו.</>
    ) : (
      <>
        רשת פלח {reading.zone}, קו בכל <L>{step / 1000}</L> ק״מ; המספרים במטרים. מזרחה <L>E</L> גדל, צפונה <L>N</L> גדל.
      </>
    );

  const pinHelpId = `${uid}-pin-help`;
  const worldDesc =
    mode === 'explore'
      ? `מפת איתור עולמית עם 60 פלחי UTM. נקודה A ב־${latLonText(point.lat, point.lon)}, פלח ${reading.zone} מודגש.`
      : 'מפת איתור עולמית עם 60 פלחי UTM.';
  const insetDesc =
    mode === 'explore'
      ? insetKind === 'grid'
        ? `תקריב של פלח ${reading.zone} עם רשת המטרים שלו. A: מזרח ${reading.eText}, צפון ${reading.nText}.`
        : `תקריב של פלח ${reading.zone} ושכניו, ${fmtRange(reading.range)}. נקודה A מסומנת.`
      : 'תקריב אזורי עם גבולות הפלחים.';

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
      data-event={event.kind}
    >
      {/* maps */}
      <div ref={mapsRef} className="relative grid gap-6 lg:grid-cols-2 lg:gap-x-12">
        <section aria-labelledby={`${uid}-world`} className="min-w-0">
          <h4 id={`${uid}-world`} className={cn(HEADING, 'mb-2 text-center')}>
            {worldTitle}
          </h4>
          <AtlasMap
            kind="world"
            name="מפת איתור עולמית"
            description={worldDesc}
            view={WORLD_VIEW}
            basemap={basemap}
            marks={worldMarks}
            topLabels={worldTop}
            chips={worldChips}
            frameRef={worldRef}
            pinRef={worldPinRef}
            onPointer={mode === 'explore' ? (p, phase, onPin) => placeAt(p, phase, 'world', onPin) : mode === 'done' ? undefined : practicePointer}
            onPinKey={mode === 'explore' ? (e) => nudge(e, 'world') : undefined}
            pinAria={mode === 'explore' ? `נקודה A במפת העולם, ${latLonText(point.lat, point.lon)}` : undefined}
            pinDescribedBy={pinHelpId}
          />
          <p className={cn(BODY, 'mt-3')}>
            מפת איתור, לא מפת <L>UTM</L>. הקווים הדקים מחלקים את העולם ל־60 פלחים, בדרך כלל ברוחב <L>6°</L> של אורך, ממוספרים מזרחה החל מ־
            <L>180°W</L>. <L>UTM</L> משמשת בין <L>80°S</L> ל־<L>84°N</L>.
          </p>
        </section>

        <section aria-labelledby={`${uid}-inset`} className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 id={`${uid}-inset`} className={HEADING}>
              {insetTitle}
            </h4>
            {mode === 'explore' && (
              <Segmented items={VIEW_ITEMS} value={insetKind} onChange={switchInset} label="תצוגת התקריב" className="w-[17rem]" />
            )}
          </div>
          <AtlasMap
            kind="inset"
            name="תקריב אזורי"
            description={insetDesc}
            view={inset}
            basemap={basemap}
            marks={insetMarks}
            topLabels={insetTop}
            chips={insetChips}
            frameRef={insetRef}
            pinRef={insetPinRef}
            onPointer={mode === 'explore' ? (p, phase, onPin) => placeAt(p, phase, 'inset', onPin) : mode === 'done' ? undefined : practicePointer}
            onPinKey={mode === 'explore' ? (e) => nudge(e, 'inset') : undefined}
            pinAria={mode === 'explore' ? `נקודה A בתקריב, ${latLonText(point.lat, point.lon)}` : undefined}
            pinDescribedBy={pinHelpId}
          >
            <ScaleBar view={inset} />
            {gridMode && <Axes />}
          </AtlasMap>
          <p className={cn(BODY, 'mt-3')}>{insetCaption}</p>
        </section>

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
      <p className="sr-only" aria-live="polite" data-announce>
        {announce}
      </p>
      {failed && (
        <p className={cn(BODY, 'mt-4')} data-basemap-failed>
          מפת היבשות לא נטענה. הפלחים, הנקודה והמספרים פועלים גם בלעדיה.
        </p>
      )}

      {/* panel */}
      <div className="mt-6" data-panel={mode}>
        {mode === 'explore' ? (
          <ExplorePanel
            headingRef={panelHeadingRef}
            reading={reading}
            event={event}
            reduce={reduce}
            rowCenter={rowCenter}
            insetKind={insetKind}
            rowRef={rowRef}
            onZone={goZone}
            onPage={(d) => setRowCenter((c) => wrapZone(c + d))}
            onHemisphere={goHemisphere}
            onPreset={nextPreset}
            onGreenwich={startGreenwich}
          />
        ) : mode === 'done' ? (
          <DonePanel headingRef={panelHeadingRef} onBack={backToExplore} onAgain={startGreenwich} />
        ) : (
          <PracticePanel
            headingRef={panelHeadingRef}
            mode={mode}
            item={item}
            target={target}
            targetReading={targetReading}
            pick={pick}
            hemiPick={hemiPick}
            check={check}
            rowCenter={practiceRow}
            onPick={choose}
            onPage={(d) => setPracticeRow((c) => wrapZone(c + d))}
            onHemi={chooseHemi}
            onCheck={runCheck}
            onBack={backToExplore}
            onTransfer={() => startTransfer(0)}
            onNext={nextItem}
          />
        )}
      </div>
    </div>
  );
}

/* ── exploration panel (the mockup's two data rows, feedback and actions) ─── */

function ExplorePanel({
  headingRef,
  reading,
  event,
  reduce,
  rowCenter,
  insetKind,
  rowRef,
  onZone,
  onPage,
  onHemisphere,
  onPreset,
  onGreenwich,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  reading: UtmReading;
  event: Event;
  reduce: boolean;
  rowCenter: number;
  insetKind: InsetKind;
  rowRef: React.RefObject<HTMLDivElement | null>;
  onZone: (z: number) => void;
  onPage: (d: number) => void;
  onHemisphere: (h: Hemisphere) => void;
  onPreset: () => void;
  onGreenwich: () => void;
}) {
  const hemiId = useId();
  const box = 'rounded-lg bg-bg-accent px-4 py-1.5';
  return (
    <div className="flex flex-col gap-4">
      <h4 ref={headingRef} tabIndex={-1} className="sr-only">
        נתוני הנקודה A
      </h4>
      <div className="grid grid-cols-2 rounded-xl border border-border/80 lg:grid-cols-4 lg:[&>*+*]:border-s lg:[&>*+*]:border-border/60" data-row="place">
        <Cell label="פלח נבחר">
          <span className={cn(VALUE, box, 'min-w-[4.5rem]')} data-value="zone">
            <Changing value={String(reading.zone)} reduce={reduce}>
              {reading.zone}
            </Changing>
          </span>
        </Cell>
        <Cell label="חצי כדור" id={hemiId}>
          <Segmented items={HEMI_ITEMS} value={reading.hemisphere} onChange={onHemisphere} labelledBy={hemiId} className="w-[13.5rem]" />
        </Cell>
        <Cell label="תחום האורך של הפלח">
          <span className={cn(VALUE, box)} data-value="range">
            <L>{fmtRange(reading.range)}</L>
          </span>
        </Cell>
        <Cell label="הנקודה ברוחב ובאורך">
          <span className={cn(VALUE, 'py-1.5 text-lg')} data-value="latlon">
            <L>{latLonText(reading.lat, reading.lon)}</L>
          </span>
        </Cell>
      </div>

      <div className="grid grid-cols-2 rounded-xl border border-border/80 lg:grid-cols-[minmax(0,1.75fr)_1fr_1fr_0.8fr] lg:[&>*+*]:border-s lg:[&>*+*]:border-border/60" data-row="grid">
        <Cell label="פלחים סמוכים" className="col-span-2 lg:col-span-1">
          <div ref={rowRef}>
            <ZoneRow center={rowCenter} selected={reading.zone} onSelect={onZone} onPage={onPage} label="פלחים סמוכים: בחירה מעבירה את הנקודה לפלח" />
          </div>
        </Cell>
        <Cell label={<>מזרח <L>E</L></>}>
          <span className={VALUE} data-value="e">
            <Changing value={reading.eText} reduce={reduce}>
              <L>{reading.eText}</L>
            </Changing>{' '}
            <span className="text-base font-semibold text-fg-muted">מ׳</span>
          </span>
        </Cell>
        <Cell label={<>צפון <L>N</L></>}>
          <span className={VALUE} data-value="n">
            <Changing value={reading.nText} reduce={reduce}>
              <L>{reading.nText}</L>
            </Changing>{' '}
            <span className="text-base font-semibold text-fg-muted">מ׳</span>
          </span>
        </Cell>
        <Cell label="דאטום">
          <span className={VALUE} data-value="datum">
            <L>{DATUM}</L>
          </span>
        </Cell>
      </div>

      <Feedback tone="info" className="min-h-[5.25rem]">
        <p data-explain={event.kind}>{explain(reading, event, insetKind)}</p>
      </Feedback>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button variant="primary" size="md" className="min-w-[15rem]" onClick={onPreset}>
          נסו נקודה אחרת
        </Button>
        <Button variant="secondary" size="md" className="min-w-[15rem]" onClick={onGreenwich}>
          מצאו את גריניץ׳
        </Button>
      </div>
    </div>
  );
}

const EXCEPTION_NOTE = {
  norway: (
    <>
      חריג: בדרום־מערב נורווגיה פלח 32 מורחב מערבה עד <L>3°E</L>.
    </>
  ),
  svalbard: (
    <>
      חריג: באזור סבאלברד הפלחים 31, 33, 35 ו־37 רחבים יותר, ופלחים 32, 34 ו־36 לא קיימים.
    </>
  ),
};

/** The explanation under the data: where the point is, then what the last action changed. */
function explain(r: UtmReading, ev: Event, insetKind: InsetKind): ReactNode {
  const where = (
    <>
      A נמצאת בפלח {r.zone}, בחצי הכדור ה{HEMI_NAME[r.hemisphere]}.{' '}
    </>
  );
  const side =
    Math.abs(r.e - 500000) < 0.5 ? (
      <>
        היא על קו האמצע של הפלח, ולכן <L>E</L> שלה הוא בדיוק <L>500000</L>{NBSP}מ׳.
      </>
    ) : (
      <>
        <L>E</L> {r.e > 500000 ? 'גדול' : 'קטן'} מ־<L>500000</L>{NBSP}מ׳, כי הנקודה {r.e > 500000 ? 'מזרחית' : 'מערבית'} לקו האמצע של הפלח.
      </>
    );
  const note = r.exception ? <> {EXCEPTION_NOTE[r.exception]}</> : null;

  switch (ev.kind) {
    case 'start':
      return (
        <>
          {where}
          {side}
        </>
      );
    case 'outside':
      return (
        <>
          <L>UTM</L> משמשת בין <L>80°S</L> ל־<L>84°N</L>. באזורי הקטבים משתמשים במערכת אחרת, ולכן אין כאן ערכי <L>UTM</L>. הנקודה נשארה במקומה.
        </>
      );
    case 'view':
      return ev.to === 'grid' ? (
        <>
          A לא זזה: אותו מקום נכתב עכשיו כמזרח <L>E</L> וצפון <L>N</L> במטרים, ברשת של פלח {r.zone}. הזיזו את הנקודה ובדקו אילו מספרים משתנים.
        </>
      ) : (
        <>
          {where}
          {side}
        </>
      );
    case 'preset':
      return (
        <>
          A הועברה ל{ev.place.name}: פלח {r.zone}, חצי הכדור ה{HEMI_NAME[r.hemisphere]}. {side}
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
    case 'zone': {
      const d = zoneStep(ev.prev.zone, r.zone);
      const same = Math.abs(r.e - ev.prev.e) < 0.5 && Math.abs(r.n - ev.prev.n) < 0.5;
      return same ? (
        <>
          A הועברה <L>{Math.abs(d) * 6}°</L> {d > 0 ? 'מזרחה' : 'מערבה'}, לפלח {r.zone}. <L>E</L> ו־<L>N</L> נשארו זהים, כי היא באותו מרחק מקו האמצע של הפלח החדש,
          אבל זה מקום אחר. לכן תמיד מציינים את הפלח.
        </>
      ) : (
        <>
          A הועברה לפלח {r.zone}, ולכן היא נמדדת ברשת של פלח {r.zone}. {side}
          {note}
        </>
      );
    }
    case 'hemi':
      return (
        <>
          A הועברה ל־<L>{fmtLat(r.lat, 2)}</L>, באותו קו אורך, מעבר לקו המשווה.{' '}
          {r.hemisphere === 'S' ? (
            <>
              בחצי הכדור הדרומי <L>N</L> נמדד מ־<L>10000000</L>{NBSP}מ׳ בקו המשווה וקטן דרומה, ולכן <L>N = {r.nText}</L>{NBSP}מ׳.
            </>
          ) : (
            <>
              בחצי הכדור הצפוני <L>N</L> נמדד מ־<L>0</L> בקו המשווה וגדל צפונה, ולכן <L>N = {r.nText}</L>{NBSP}מ׳.
            </>
          )}
          {r.zone !== ev.prev.zone ? <> גם הפלח השתנה, ל־{r.zone}.</> : null}
          {note}
        </>
      );
    case 'pick': {
      const p = ev.prev;
      if (p.zone === r.zone && p.hemisphere === r.hemisphere) {
        const dE = r.e - p.e;
        const dN = r.n - p.n;
        if (Math.abs(dE) < 0.5 && Math.abs(dN) < 0.5)
          return (
            <>
              {where}
              {side}
            </>
          );
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
            . {insetKind === 'grid' ? 'ברשת רואים זאת ישירות: ' : ''}מזרחה <L>E</L> גדל, צפונה <L>N</L> גדל.
            {note}
          </>
        );
      }
      if (p.hemisphere !== r.hemisphere) {
        return (
          <>
            A חצתה את קו המשווה ועברה לחצי הכדור ה{HEMI_NAME[r.hemisphere]}
            {p.zone !== r.zone ? <>, בפלח {r.zone}</> : null}.{' '}
            {r.hemisphere === 'S' ? (
              <>
                כאן <L>N</L> נמדד מ־<L>10000000</L>{NBSP}מ׳ בקו המשווה וקטן דרומה.
              </>
            ) : (
              <>
                כאן <L>N</L> נמדד מ־<L>0</L> בקו המשווה וגדל צפונה.
              </>
            )}
            {note}
          </>
        );
      }
      const step = zoneStep(p.zone, r.zone);
      const lon = Math.abs(step) === 1 ? sharedBoundary(p.zone, r.zone, r.lat) : null;
      return lon != null ? (
        <>
          A חצתה את קו האורך <L>{fmtLon(lon)}</L> ועברה מפלח {p.zone} לפלח {r.zone}. מעכשיו המספרים נמדדים ברשת של פלח {r.zone}, ולכן <L>E</L> השתנה מ־
          <L>{p.eText}</L> ל־<L>{r.eText}</L>.{note}
        </>
      ) : (
        <>
          A עברה מפלח {p.zone} לפלח {r.zone}, בחצי הכדור ה{HEMI_NAME[r.hemisphere]}. בפלח החדש היא נמדדת ברשת אחרת. {side}
          {note}
        </>
      );
    }
  }
}

/* ── practice ─────────────────────────────────────────────────────────────── */

function PracticePanel({
  headingRef,
  mode,
  item,
  target,
  targetReading,
  pick,
  hemiPick,
  check,
  rowCenter,
  onPick,
  onPage,
  onHemi,
  onCheck,
  onBack,
  onTransfer,
  onNext,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  mode: 'greenwich' | 'transfer';
  item: number;
  target: Place | null;
  targetReading: UtmReading | null;
  pick: number | null;
  hemiPick: Hemisphere | null;
  check: Check | null;
  rowCenter: number;
  onPick: (z: number) => void;
  onPage: (d: number) => void;
  onHemi: (h: Hemisphere) => void;
  onCheck: () => void;
  onBack: () => void;
  onTransfer: () => void;
  onNext: () => void;
}) {
  const hemiId = useId();
  const solved = Boolean(check && check.zoneOk && check.hemiOk);
  const ready = pick != null && (mode === 'greenwich' || hemiPick != null);
  const letter = TRANSFER_LETTERS[item];
  const verdict = check ? (check.zoneOk ? 'right' : 'wrong') : null;

  /* A short verdict for screen readers (the explanation stays readable text, not a live region);
     a solved check disables its button, so focus moves on to the way forward. */
  const [status, setStatus] = useState('');
  const nextRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!check) {
      setStatus('');
      return;
    }
    const ok = check.zoneOk && check.hemiOk;
    const text = ok
      ? `נכון: פלח ${check.zone}${check.hemi ? `, חצי הכדור ה${HEMI_NAME[check.hemi]}` : ''}.`
      : 'לא נכון. ההסבר מופיע מתחת לבחירה; נסו שוב.';
    setStatus((s) => (s === text ? `${text}​` : text));
    if (ok) requestAnimationFrame(() => nextRef.current?.querySelector('button')?.focus());
  }, [check]);

  return (
    <div className="flex flex-col gap-4" data-practice={mode}>
      <p role="status" className="sr-only" data-verdict>
        {status}
      </p>
      <div className="rounded-xl border border-border/80 px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h4 ref={headingRef} tabIndex={-1} className={cn(HEADING, 'outline-none')}>
            {mode === 'greenwich' ? 'משימה 1 מתוך 4 · גריניץ׳' : `משימה ${item + 2} מתוך 4 · נקודה ${letter}`}
          </h4>
        </div>
        <p className={cn(BODY, 'mt-1.5')} data-prompt>
          {mode === 'greenwich' ? (
            <>
              בחרו את הפלח שגבולו המערבי הוא קו גריניץ׳, <L>0°</L>.
            </>
          ) : (
            <>
              הנקודה {letter}: {target!.name}, <L>{latLonText(target!.lat, target!.lon)}</L>. באיזה פלח ובאיזה חצי כדור היא נמצאת?
            </>
          )}{' '}
          בחרו פלח בכפתורים או במפה, ואז לחצו ״בדיקת הבחירה״.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <div className={cn(LABEL, 'mb-2')}>פלח</div>
            <ZoneRow center={rowCenter} selected={pick} onSelect={onPick} onPage={onPage} label="בחירת פלח" verdict={verdict} />
          </div>
          {mode === 'transfer' && (
            <div>
              <div id={hemiId} className={cn(LABEL, 'mb-2')}>
                חצי כדור
              </div>
              <Segmented items={HEMI_ITEMS} value={hemiPick} onChange={onHemi} labelledBy={hemiId} className="w-[13.5rem]" />
            </div>
          )}
          <Button variant="primary" size="md" className="ms-auto min-w-[12rem]" onClick={onCheck} disabled={!ready || solved}>
            בדיקת הבחירה
          </Button>
        </div>
      </div>

      <div className="min-h-[5.25rem]">
        {check && (mode === 'greenwich' ? <GreenwichFeedback check={check} /> : <TransferFeedback check={check} target={target!} r={targetReading!} letter={letter} />)}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <div ref={nextRef} className="contents">
          {mode === 'greenwich' && solved && (
            <Button variant="primary" size="md" className="min-w-[15rem]" onClick={onTransfer}>
              לנקודות חדשות
            </Button>
          )}
          {mode === 'transfer' && solved && (
            <Button variant="primary" size="md" className="min-w-[15rem]" onClick={onNext}>
              {item + 1 < TRANSFER.length ? 'לנקודה הבאה' : 'לסיום התרגול'}
            </Button>
          )}
        </div>
        <Button variant="secondary" size="md" className="min-w-[15rem]" onClick={onBack}>
          חזרה לחקירה
        </Button>
      </div>
    </div>
  );
}

function GreenwichFeedback({ check }: { check: Check }) {
  const z = check.zone;
  if (check.zoneOk)
    return (
      <Feedback tone="right">
        <p>
          נכון. פלח 31 משתרע מ־<L>0°</L> עד <L>6°E</L>, ולכן גבולו המערבי הוא גריניץ׳. המספור מתחיל ב־<L>180°W</L>. 30 פלחים של <L>6°</L> מגיעים בדיוק ל־
          <L>0°</L>, ופלח 31 מתחיל שם.
        </p>
      </Feedback>
    );
  if (z === 30)
    return (
      <Feedback tone="wrong">
        <p>
          פלח 30 משתרע מ־<L>6°W</L> עד <L>0°</L>: גריניץ׳ הוא גבולו המזרחי. שם הפלח מסתיים, ולא מתחיל. נסו שוב.
        </p>
      </Feedback>
    );
  return (
    <Feedback tone="wrong">
      <p>
        פלח {z} משתרע מ־<L>{fmtLon(zoneWest(z))}</L> עד <L>{fmtLon(zoneEast(z))}</L>, ולכן גבולו המערבי אינו <L>0°</L>. נסו שוב.
      </p>
    </Feedback>
  );
}

function TransferFeedback({ check, target, r, letter }: { check: Check; target: Place; r: UtmReading; letter: string }) {
  const lonT = <L>{fmtLon(target.lon, 2)}</L>;
  const latT = <L>{fmtLat(target.lat, 2)}</L>;
  const northOf = r.hemisphere === 'N' ? 'מצפון' : 'מדרום';
  if (check.zoneOk && check.hemiOk)
    return (
      <Feedback tone="right">
        <p>
          נכון: פלח {r.zone}, חצי הכדור ה{HEMI_NAME[r.hemisphere]}. {lonT} נמצא בין <L>{fmtLon(r.range.w)}</L> ל־<L>{fmtLon(r.range.e)}</L>, ו־{latT} {northOf}{' '}
          לקו המשווה. ברשת של פלח {r.zone}, הנקודה {letter} היא <L>E {r.eText}</L>{NBSP}מ׳, <L>N {r.nText}</L>{NBSP}מ׳ (<L>{DATUM}</L>).
        </p>
      </Feedback>
    );
  const pickRange = { w: zoneWest(check.zone), e: zoneEast(check.zone) };
  const east = zoneStep(check.zone, r.zone) > 0;
  return (
    <Feedback tone="wrong">
      {!check.zoneOk && (
        <p>
          פלח {check.zone} משתרע מ־<L>{fmtLon(pickRange.w)}</L> עד <L>{fmtLon(pickRange.e)}</L>, ו־{lonT} אינו בתחום הזה: הנקודה {east ? 'מזרחית' : 'מערבית'} לגבול{' '}
          <L>{fmtLon(east ? r.range.w : r.range.e)}</L>.
        </p>
      )}
      {!check.hemiOk && (
        <p>
          {latT} {northOf} לקו המשווה, ולכן חצי הכדור הוא {HEMI_NAME[r.hemisphere]} (<L>{r.hemisphere}</L>).
        </p>
      )}
      <p>נסו שוב.</p>
    </Feedback>
  );
}

function DonePanel({ headingRef, onBack, onAgain }: { headingRef: React.RefObject<HTMLHeadingElement | null>; onBack: () => void; onAgain: () => void }) {
  return (
    <div className="flex flex-col gap-4" data-practice="done">
      <Feedback tone="right">
        <h4 ref={headingRef} tabIndex={-1} className={cn(HEADING, 'mb-1 outline-none')}>
          סיימתם את התרגול
        </h4>
        <p>
          זיהיתם פלח וחצי כדור לשלוש נקודות חדשות. כדי לפרש מספרי <L>E</L> ו־<L>N</L> צריך לדעת שלושה דברים: הפלח, חצי הכדור והדאטום.
        </p>
      </Feedback>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button variant="primary" size="md" className="min-w-[15rem]" onClick={onBack}>
          חזרה לחקירה
        </Button>
        <Button variant="secondary" size="md" className="min-w-[15rem]" onClick={onAgain}>
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
