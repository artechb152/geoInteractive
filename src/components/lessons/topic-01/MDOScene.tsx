'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
import { cn } from '@/lib/utils';
import {
  MDO_DOMAIN_ORDER,
  MDO_DOMAINS,
  MDO_EDGES,
  MDO_FOUR_ACTIVE_BY_MISSING,
  MDO_COUNT_INTROS,
  type MdoDomainId,
  type MdoEdge,
} from './mdo-interaction-content';

/** A region in the shared ground-level scene's own pixel coordinate system
    (mdo-scene-background-ground.png, FIELD_W×FIELD_H, measured from the
    left/top edge — never mirrored for RTL). Each domain's object layer is an
    independent image positioned by this box; toggling a domain off animates
    the object, its own baked-in contact shadow/dust/wake, and its connector
    to fully transparent — never a dim/grey/mask treatment. */
type Box = { x: number; y: number; width: number; height: number };

type DomainVisual = {
  id: MdoDomainId;
  label: string;
  icon: IconName;
  /** Own transparent-background object layer — not part of the shared
      background image, so it can be animated independently. Absent for
      `standalone` (space), which uses its own circular inset instead. */
  src?: string;
  box: Box;
  /** Where a connection curve attaches / the marker ring is drawn, in field
      px — hand-picked at the object's own visual hub (turret, bridge, dish
      cluster…), not just the padded box center. */
  anchor: [number, number];
  /** Field-px clearance a connection curve must keep from this domain when
      the curve doesn't touch it. */
  avoidR: number;
  /** Space renders as its own circular photographic inset (never part of
      the shared terrain's perspective/lighting), per the design brief. */
  standalone?: boolean;
};

const ASSET_BASE = '/assets/lessons/topic01/scene-mdo';
const SCENE_SRC = `${ASSET_BASE}/mdo-scene-background-ground.png`;
// Optional looping environment video — same framing as SCENE_SRC, waves/
// vegetation/clouds only, locked camera. Not produced yet (see the sibling
// .prompt.txt for the Google-Flow brief); the layer below fails silently
// (onError) to the static photo until this file exists on disk, per "don't
// fabricate a video that wasn't actually produced."
const SCENE_VIDEO_SRC = `${ASSET_BASE}/mdo-scene-background-loop.mp4`;

/** Field-scene dimensions (mdo-scene-background-ground.png) — every layer,
    the SVG overlay and the connection curves share this coordinate system,
    so they all stay pinned to the same background at any container width. */
const FIELD_W = 1536;
const FIELD_H = 1024;

const DOMAIN_VISUALS: DomainVisual[] = [
  {
    id: 'land', label: MDO_DOMAINS.land.label, icon: 'tank',
    src: `${ASSET_BASE}/mdo-land-object.png`,
    // Downscaled to a believable midground vehicle (~22% of frame width,
    // was ~56%): mdo-land-object.png is a 1300×800 canvas with generous
    // transparent padding around the actual vehicle — its own visible-pixel
    // bounding box is x:82–938 × y:91–666 (measured via alpha-channel scan,
    // not eyeballed). Box/anchor/avoidR below are ALL the same 0.3944
    // uniform scale of that same 1300×800 canvas, re-anchored so the visible
    // vehicle's ground-contact point lands in roughly the same spot on the
    // road the old, larger vehicle used — never resized without moving the
    // anchor with it.
    box: { x: 669, y: 581, width: 513, height: 316 },
    anchor: [884, 631], avoidR: 140,
  },
  {
    id: 'air', label: MDO_DOMAINS.air.label, icon: 'plane',
    src: `${ASSET_BASE}/mdo-air-object.png`,
    // The jet, upper-center-right of the sky. Visible-pixel width already
    // measures ~19% of frame width at this scale — inside the 15–19% target
    // band, so left unchanged.
    box: { x: 412, y: 45, width: 825, height: 315 },
    anchor: [973, 127], avoidR: 220,
  },
  {
    id: 'sea', label: MDO_DOMAINS.sea.label, icon: 'ship',
    src: `${ASSET_BASE}/mdo-sea-object.png`,
    // The ship afloat, left third of the frame — anchor sits on the
    // bridge/mast, not the bow, so connections read off its main structure.
    box: { x: 150, y: 300, width: 488, height: 255 },
    anchor: [500, 366], avoidR: 190,
  },
  {
    id: 'space', label: MDO_DOMAINS.space.label, icon: 'satellite',
    // A deliberately separate circular inset — its own image, material and
    // lighting — never part of the shared scene's ground-level perspective.
    // Already ~14% of frame width, inside the 12–14% target band.
    box: { x: 36, y: 24, width: 210, height: 210 },
    anchor: [141, 129], avoidR: 120,
    standalone: true,
  },
  {
    id: 'cyber', label: MDO_DOMAINS.cyber.label, icon: 'bolt',
    src: `${ASSET_BASE}/mdo-cyber-object.png`,
    // The communications mast + dishes + fenced hut, right-hand hillside —
    // anchor lands on the dish cluster near the top, not mid-mast or the
    // fence at its base. box.y nudged from 0 to 20 (mast tip's own visible
    // pixels start only 12px from the old box top) so the tip clears the
    // frame's own top edge with real margin instead of nearly touching it.
    box: { x: 1012, y: 20, width: 412, height: 675 },
    anchor: [1206, 115], avoidR: 150,
  },
];

const SPACE_SRC = `${ASSET_BASE}/mdo-space-medallion.png`;

function byId(id: MdoDomainId) {
  return DOMAIN_VISUALS.find((d) => d.id === id)!;
}

function pct(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

/** The scale a selected domain's own object image renders at (spec: "כ-4%
    הגדלה עדינה") — also drives how far its connector anchor moves in
    effectiveAnchor() below, so the two stay geometrically consistent. */
const SELECTED_SCALE = 1.04;

/** The point a domain's own image visually scales FROM when selected — the
    exact same point its `transformOrigin` CSS uses, so the object's own
    ground/water-contact line never shifts (spec: "שמור את נקודת המגע
    בקרקע"). Grounded/airborne domains pivot from their box's own
    bottom-center (their lowest visible pixel = the contact line); `space`
    is a genuinely separate circular inset with no ground contact, so it
    pivots from its own center instead. */
function domainPivot(d: DomainVisual): [number, number] {
  return d.standalone
    ? [d.box.x + d.box.width / 2, d.box.y + d.box.height / 2]
    : [d.box.x + d.box.width / 2, d.box.y + d.box.height];
}

/** A domain's own connector anchor, recomputed for the SAME 4% scale its
    image renders at around the SAME pivot as domainPivot() — so a
    connection curve keeps landing on the scaled object's visual hub
    instead of the pre-scale point (spec: "התאם את עוגני הקווים"). Returns
    the unmodified anchor when not selected. */
function effectiveAnchor(d: DomainVisual, isSelected: boolean): [number, number] {
  if (!isSelected) return d.anchor;
  const [px, py] = domainPivot(d);
  return [px + (d.anchor[0] - px) * SELECTED_SCALE, py + (d.anchor[1] - py) * SELECTED_SCALE];
}

/* The panel's ONE active/inactive visual language, reused by the control
   column's toggle switches; active = filled accent, inactive = hollow. */
function flipTransition(motionOk: boolean) {
  return motionOk ? 'transition-[background-color,border-color,box-shadow,color,margin] duration-200 ease-snap' : 'transition-none';
}

/** Compose the summary from activeIds identity, never just active.size —
    per the design brief, every count reuses the SAME defined text building
    blocks (contribution / missing / countIntros / fourActiveByMissing),
    never states a percentage or a total-collapse claim, and — per the
    2026-09-21 layout brief — never repeats the connection-pair NAMES the
    lines themselves already show (that's the one line this revision drops;
    every other composed sentence is untouched). */
function composeSummary(active: Set<MdoDomainId>): { badge: string; lines: string[] } {
  const n = active.size;
  const badge = `${n}/5 ממדים פעילים`;

  if (n === 5) return { badge, lines: [MDO_COUNT_INTROS['5']] };
  if (n === 0) return { badge, lines: [MDO_COUNT_INTROS['0']] };
  if (n === 4) {
    const missingId = MDO_DOMAIN_ORDER.find((id) => !active.has(id))!;
    return { badge, lines: [MDO_COUNT_INTROS['4'], MDO_FOUR_ACTIVE_BY_MISSING[missingId]] };
  }

  const activeIds = MDO_DOMAIN_ORDER.filter((id) => active.has(id));
  const inactiveIds = MDO_DOMAIN_ORDER.filter((id) => !active.has(id));

  const stillPossible = n === 1
    ? `מה הממד הפעיל תורם: ${MDO_DOMAINS[activeIds[0]].label} — ${MDO_DOMAINS[activeIds[0]].contribution}.`
    : `מה עדיין אפשר לשלב: ${activeIds.map((id) => `${MDO_DOMAINS[id].label} — ${MDO_DOMAINS[id].contribution}`).join('; ')}.`;
  const missing = `מה עדיין לא זמין: ${inactiveIds.map((id) => MDO_DOMAINS[id].missing).join('. ')}.`;

  return { badge, lines: [MDO_COUNT_INTROS[String(n) as '1' | '2' | '3'], stillPossible, missing] };
}

/** The right column's own selection-explainer content — composed ONLY from
    existing MDO_DOMAINS/MDO_EDGES fields (contribution / label / aToB /
    bToA), reusing the exact connective phrasing composeSummary() and
    MDOEdgeCard already use elsewhere in this file, never a new sentence
    describing a capability the data doesn't state. Independent of
    composeSummary(): this reads the object multi-select, not the on/off
    toggles. */
function composeSelectionExplainer(selected: Set<MdoDomainId>): { heading: string; lines: string[] } {
  const ids = MDO_DOMAIN_ORDER.filter((id) => selected.has(id));

  if (ids.length === 0) {
    return {
      heading: 'השוואת ממדים',
      lines: ['לחצו על אובייקט פעיל בתמונה כדי לבחור אותו ולהשוות בין ממדים.'],
    };
  }

  if (ids.length === 1) {
    const d = MDO_DOMAINS[ids[0]];
    return { heading: d.label, lines: [`מה הממד תורם: ${d.contribution}.`] };
  }

  if (ids.length === 2) {
    const edge = MDO_EDGES.find((e) => (e.a === ids[0] && e.b === ids[1]) || (e.a === ids[1] && e.b === ids[0]));
    if (!edge) return { heading: `${MDO_DOMAINS[ids[0]].label} + ${MDO_DOMAINS[ids[1]].label}`, lines: [] };
    const aLabel = MDO_DOMAINS[edge.a].label;
    const bLabel = MDO_DOMAINS[edge.b].label;
    return {
      heading: edge.label,
      lines: [`תרומת ${aLabel} ל${bLabel}: ${edge.aToB}`, `תרומת ${bLabel} ל${aLabel}: ${edge.bToA}`],
    };
  }

  // 3+ selected: compose each selected domain's own contribution plus the
  // labels of every edge whose BOTH ends are in the selection — the set of
  // relevant connections grows as more objects are added (spec's own
  // example: חלל+ים vs חלל+ים+סייבר), without repeating full aToB/bToA
  // prose for every pair (would overflow the 190px column at 4-5 picks).
  const contributions = ids.map((id) => `${MDO_DOMAINS[id].label} — ${MDO_DOMAINS[id].contribution}`).join('; ');
  const pairLabels = MDO_EDGES.filter((e) => selected.has(e.a) && selected.has(e.b)).map((e) => e.label);
  return {
    heading: ids.map((id) => MDO_DOMAINS[id].label).join(' + '),
    lines: [`מה כל ממד תורם: ${contributions}.`, ...(pairLabels.length ? [`קשרים ביניהם: ${pairLabels.join(', ')}.`] : [])],
  };
}

export function MDOScene() {
  const [active, setActive] = useState<Set<MdoDomainId>>(new Set(MDO_DOMAIN_ORDER));
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  // Multi-select on the field-photo objects themselves — fully independent
  // of `active` (on/off) and `selectedEdgeId` (line-click explanation
  // card); 0–5 members, driven by clicking an active object in the image.
  const [selectedObjects, setSelectedObjects] = useState<Set<MdoDomainId>>(new Set());
  const [announcement, setAnnouncement] = useState('');
  const motionOk = !useReducedMotion();
  // Any programmatic close of the card (Reset, or a domain going off under
  // it) shouldn't yank focus onto the — now merely inactive, not unmounted —
  // edge hit-path it used to belong to; only an explicit user close (✕ /
  // Escape) should return focus to the opener. Both auto-close paths flip
  // this before clearing selectedEdgeId; the restore effect consumes and
  // resets it.
  const suppressEdgeFocusRestoreRef = useRef(false);

  function toggleDomain(id: MdoDomainId) {
    setActive((prev) => {
      const next = new Set(prev);
      const wasOn = next.has(id);
      if (wasOn) next.delete(id);
      else next.add(id);
      setAnnouncement(`${MDO_DOMAINS[id].label}: ${wasOn ? 'כבוי' : 'פעיל'}`);
      return next;
    });
  }
  function selectEdge(id: string) {
    setSelectedEdgeId((prev) => (prev === id ? null : id));
  }
  function closeCard() {
    setSelectedEdgeId(null);
  }
  function toggleObjectSelection(id: MdoDomainId) {
    setSelectedObjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function resetAll() {
    suppressEdgeFocusRestoreRef.current = true;
    setActive(new Set(MDO_DOMAIN_ORDER));
    setSelectedEdgeId(null);
    setSelectedObjects(new Set());
    setAnnouncement('כל הממדים חוברו מחדש');
  }

  // A selected line's own explanation closes automatically the moment
  // either of its two domains is switched off — never left open pointing at
  // a connection that can no longer be drawn.
  useEffect(() => {
    if (!selectedEdgeId) return;
    const edge = MDO_EDGES.find((e) => e.id === selectedEdgeId);
    if (edge && (!active.has(edge.a) || !active.has(edge.b))) {
      suppressEdgeFocusRestoreRef.current = true;
      setSelectedEdgeId(null);
    }
  }, [active, selectedEdgeId]);

  // Turning a domain off also drops it out of the multi-select (spec:
  // "כיבוי ממד מסיר אותו גם מהבחירה") — never the reverse; selecting an
  // object never changes `active`.
  useEffect(() => {
    setSelectedObjects((prev) => {
      const next = new Set([...prev].filter((id) => active.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [active]);

  return (
    <section id="scene-mdo" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
      <SceneHeader
        step="01.2"
        eyebrow="לחימה בכל הממדים יחד · MDO"
        underline
        title={
          <>
          המערכה המודרנית: שדה הקרב כבר מזמן לא מוגבל ל<span className="gradient-text">קרקע</span>
          </>
        }
        intro="פעם צבאות נלחמו בשדה קרב שטוח, פנים מול פנים. היום מלחמה מזכירה משחק רשת מורכב שמתנהל ב-5 ממדים במקביל. הפעילו וכבו כל ממד בפקדים שמימין לתמונה, ובדקו אילו קשרים בין הממדים עדיין זמינים ואילו יכולות חסרות כשממד יוצא מהתמונה."
      />

      <div className="surface-elevated relative overflow-hidden grid sm:grid-cols-[7fr_3fr]">
        <div className="p-6 sm:p-8">
          <h3 className="font-display text-2xl font-bold leading-tight text-black sm:text-3xl">מה זה MDO?</h3>
          <span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-accent" />
          <p className="mt-2 text-base leading-relaxed text-fg-muted">
            ראשי תיבות של <span className="font-mono text-brand-dark">Multi-Domain Operations</span> (מבצעים רב-ממדיים).
            במקום שחיל האוויר יילחם לבד והשריון לבד – הכל קורה ביחד. כל 5 הממדים עובדים מסונכרנים באותה שנייה בדיוק.
            זה&quot;המולטי-טאסקינג&quot; שבלעדיו שום צבא לא יכול לנצח היום.
          </p>
        </div>
        <div className="flex items-center justify-center bg-bg-accent p-6 sm:p-8">
          <IsometricAsset
            assetId="TOPIC01-MDO-PENTAGON-DIAGRAM"
            src="/reference-assets/mdo-explainer-card/pentagon-diagram.png"
            alt="דיאגרמת פנטגון: חמישה תחומי לחימה — יבשה, אוויר, ים, חלל וסייבר — מחוברים סביב MDO במרכז"
            aspect="1/1"
            fit="contain"
            className="w-full max-w-[150px] bg-bg-accent sm:max-w-[180px]"
          />
        </div>
      </div>

      {/* One connected surface: summary on top, image + control column
          below sharing the same background/border/radius/shadow — the
          control column must never read as its own floating card. */}
      <div className="surface-elevated overflow-hidden mt-12">
        <div className="border-b border-border-strong p-4 sm:p-5">
          <MDOSummary active={active} />
        </div>
        {/* grid (not flex) so the 190px control column and the image column
            share one row and stretch to the SAME height by construction —
            the image's own 3:2 aspect-ratio sets the row's height (it's the
            taller of the two), and the column fills it via h-full below,
            never a ResizeObserver measuring one to force the other. */}
        <div className="grid grid-cols-[190px_1fr] items-stretch gap-4 p-4">
          <MDOControlColumn active={active} selectedObjects={selectedObjects} motionOk={motionOk} onToggle={toggleDomain} onReset={resetAll} />
          <MDOGroundScene
            active={active}
            selectedEdgeId={selectedEdgeId}
            selectedObjects={selectedObjects}
            motionOk={motionOk}
            onSelectEdge={selectEdge}
            onToggleObject={toggleObjectSelection}
            onCloseCard={closeCard}
            suppressFocusRestoreRef={suppressEdgeFocusRestoreRef}
          />
        </div>
      </div>

      <RealWorldExamples />

      <ChokepointBand eyebrow="המסקנה: החוליה החלשה" className="mt-12">
        אי אפשר לנצח מלחמה היום רק עם הטנקים הכי טובים או חיל האוויר הכי חזק. כשממד אחד חסר, שאר הממדים עדיין יכולים לתרום מיכולותיהם — אבל היכולת המשולבת נחלשת. צבא חכם מתכנן מכה שמשלבת את כל הממדים יחד, ובמקביל דואג &apos;לנתק&apos; לאויב את החיבורים שלו כדי לשבש את הפעולה המשולבת שלו.
      </ChokepointBand>
    </section>
  );
}

/** Keeps a Bézier control point inside the visible frame (with a small
    margin) so a connection arc never bows out past the scene's own edges. */
function clampToField([x, y]: [number, number], margin = 14): [number, number] {
  return [Math.min(FIELD_W - margin, Math.max(margin, x)), Math.min(FIELD_H - margin, Math.max(margin, y))];
}

function quadPoint(a: [number, number], c: [number, number], b: [number, number], t: number): [number, number] {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
}

/** Samples strictly BETWEEN the curve's two fixed endpoints (never i=0/24,
    which are `a`/`b` themselves) — an endpoint's own proximity to an
    obstacle isn't something the control point can fix, so including it
    would make every candidate control point look equally non-clearing
    whenever an obstacle sits close to a domain's own anchor (e.g. the
    floating card's fixed corner sitting near the `space` anchor), starving
    the `best` branch below for every edge touching that domain. */
function minDistToCurve(a: [number, number], c: [number, number], b: [number, number], p: [number, number]) {
  let best = Infinity;
  for (let i = 1; i < 24; i++) {
    const [x, y] = quadPoint(a, c, b, i / 24);
    best = Math.min(best, Math.hypot(x - p[0], y - p[1]));
  }
  return best;
}

const EXTRA_CLEARANCE_MARGIN = 24;

function rotateVec(v: [number, number], deg: number): [number, number] {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [v[0] * cos - v[1] * sin, v[0] * sin + v[1] * cos];
}

const CONTROL_ANGLES = [0, 25, -25, 45, -45, 65, -65, 85, -85];
const CONTROL_MAGNITUDES = [1, 1.3, 1.7, 2.1];

/** Quadratic-Bézier control point, bowed outward from the visible edges'
    own centroid so curves fan out through open sky/sea instead of
    overlapping, while clearing every domain the edge doesn't touch (plus
    the floating card's own corner) by at least its own avoidR. */
function edgeControl(
  a: [number, number],
  b: [number, number],
  centroid: [number, number],
  avoid: { point: [number, number]; radius: number }[],
): [number, number] {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  let dx = mx - centroid[0];
  let dy = my - centroid[1];
  const dlen = Math.hypot(dx, dy) || 1;
  dx /= dlen;
  dy /= dlen;
  const edgeLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const baseBow = Math.min(110, Math.max(48, edgeLen * 0.2));

  let best: [number, number] | null = null;
  let bestScore = -Infinity;
  let fallback: [number, number] = clampToField([mx + dx * baseBow, my + dy * baseBow]);
  let fallbackMargin = -Infinity;

  for (const angle of CONTROL_ANGLES) {
    const [rx, ry] = rotateVec([dx, dy], angle);
    for (const mag of CONTROL_MAGNITUDES) {
      const bow = baseBow * mag;
      const control: [number, number] = clampToField([mx + rx * bow, my + ry * bow]);
      const margin = avoid.length
        ? Math.min(...avoid.map((p) => minDistToCurve(a, control, b, p.point) - (p.radius + EXTRA_CLEARANCE_MARGIN)))
        : Infinity;
      if (margin > fallbackMargin) {
        fallbackMargin = margin;
        fallback = control;
      }
      if (margin >= 0) {
        const score = -Math.abs(angle) * 10 - mag;
        if (score > bestScore) {
          bestScore = score;
          best = control;
        }
      }
    }
  }
  return best ?? fallback;
}

function edgePath(a: [number, number], b: [number, number], c: [number, number]) {
  return `M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`;
}

// A generous field-space stand-in for the floating card's own footprint
// (bottom-4 end-4, width min(320px, 44%)) — included as a permanent curve
// obstacle so an edge never routes behind the (opaque) card.
const CARD_OBSTACLE = { point: [257, 818] as [number, number], radius: 300 };

// Visible line weight targets are real CSS px, not viewBox units — at this
// container's typical rendered width the 1536-wide viewBox is scaled down
// by roughly 0.7×, so a *viewBox* strokeWidth of e.g. 2.75 would only ever
// paint ~1.9 CSS px. `vectorEffect="non-scaling-stroke"` makes strokeWidth
// mean real screen pixels regardless of that transform, so these numbers
// ARE the rendered line weight.
const LINE_WIDTH_CORE = 2.75;
const LINE_WIDTH_CORE_EMPHASIS = 3.75;
const LINE_WIDTH_HALO = 8;
const LINE_HIT_WIDTH = 20; // 16–24 CSS px transparent hit ribbon, per brief

/**
 * MDOGroundScene — the ground-level scene: a clean background photo (with
 * an optional looping environment video layer) and one independent object
 * layer per domain (each carrying its own baked-in contact shadow/dust/
 * wake), an orange SVG layer of the domain-pair connections — the lines
 * themselves ARE the connection interface, clickable along their whole
 * length — and one shared floating explanation card. Every domain/edge
 * layer stays mounted and is driven by an animated opacity/pathLength
 * target instead of conditional unmounting, so rapid toggling during an
 * in-flight transition reverses smoothly instead of leaving duplicates or
 * snapping.
 */
function MDOGroundScene({
  active,
  selectedEdgeId,
  selectedObjects,
  motionOk,
  onSelectEdge,
  onToggleObject,
  onCloseCard,
  suppressFocusRestoreRef,
}: {
  active: Set<MdoDomainId>;
  selectedEdgeId: string | null;
  selectedObjects: Set<MdoDomainId>;
  motionOk: boolean;
  onSelectEdge: (id: string) => void;
  onToggleObject: (id: MdoDomainId) => void;
  onCloseCard: () => void;
  suppressFocusRestoreRef: React.MutableRefObject<boolean>;
}) {
  const centroid = useMemo<[number, number]>(() => {
    const n = DOMAIN_VISUALS.length;
    const sx = DOMAIN_VISUALS.reduce((s, d) => s + d.anchor[0], 0);
    const sy = DOMAIN_VISUALS.reduce((s, d) => s + d.anchor[1], 0);
    return [sx / n, sy / n];
  }, []);

  // Recomputed whenever `active` changes: a curve only needs to clear the
  // domains that are actually visible right now, not every domain that
  // exists — one fewer obstacle to bow around once something is switched off.
  const edges = useMemo(
    () =>
      MDO_EDGES.map((edge) => {
        const a = byId(edge.a);
        const b = byId(edge.b);
        const aAnchor = effectiveAnchor(a, selectedObjects.has(a.id));
        const bAnchor = effectiveAnchor(b, selectedObjects.has(b.id));
        const avoid = [
          ...DOMAIN_VISUALS.filter((d) => d.id !== edge.a && d.id !== edge.b && active.has(d.id)).map((d) => ({ point: d.anchor, radius: d.avoidR })),
          CARD_OBSTACLE,
        ];
        const control = edgeControl(aAnchor, bAnchor, centroid, avoid);
        return { edge, a, b, d: edgePath(aAnchor, bAnchor, control), mid: quadPoint(aAnchor, control, bAnchor, 0.5) };
      }),
    [active, centroid, selectedObjects],
  );

  const reduceMotion = useReducedMotion();
  const [inView, setInView] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const motionEnabled = inView && !reduceMotion;

  const selectedEdge = selectedEdgeId ? edges.find((e) => e.edge.id === selectedEdgeId) ?? null : null;
  const [focusedEdgeId, setFocusedEdgeId] = useState<string | null>(null);

  const closeBtnRestoreRef = useRef<HTMLButtonElement | null>(null);
  const edgePathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedEdgeId === null && prevSelectedRef.current) {
      if (suppressFocusRestoreRef.current) {
        suppressFocusRestoreRef.current = false;
      } else {
        edgePathRefs.current[prevSelectedRef.current]?.focus();
      }
    }
    prevSelectedRef.current = selectedEdgeId;
  }, [selectedEdgeId, suppressFocusRestoreRef]);

  const air = byId('air');
  const airOn = active.has('air');

  return (
    // Physical `left`/`top` (not inset-inline-start/logical) is deliberate
    // for every domain box, anchor and connection here — each is a
    // scene-pixel coordinate that must land on the same object regardless
    // of page direction. Logical properties would mirror them under RTL,
    // which the project rule explicitly forbids for this photo.
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden rounded-2xl" style={{ aspectRatio: '3 / 2' }}>
      <MDOSceneBackdrop inView={inView} reduceMotion={!!reduceMotion} />

      {/* Independent object layers — each domain's own transparent PNG,
          with its own baked-in contact shadow/dust/wake. Always mounted;
          only the animated opacity target changes, so a rapid off→on
          re-toggle reverses the in-flight fade instead of restarting it. */}
      {DOMAIN_VISUALS.filter((d) => !d.standalone).map((d) => {
        const isSelected = selectedObjects.has(d.id);
        return (
          <motion.img
            key={d.id}
            src={d.src}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute"
            style={{
              left: pct(d.box.x, FIELD_W),
              top: pct(d.box.y, FIELD_H),
              width: pct(d.box.width, FIELD_W),
              height: pct(d.box.height, FIELD_H),
              // Bottom-center pivot = this object's own ground/water
              // contact line (see domainPivot()) — scaling up never
              // moves that point.
              transformOrigin: '50% 100%',
              filter: isSelected ? 'url(#mdoSelectionOutline)' : undefined,
            }}
            initial={false}
            animate={{ opacity: active.has(d.id) ? 1 : 0, scale: isSelected ? SELECTED_SCALE : 1 }}
            transition={{ duration: motionOk ? 0.3 : 0 }}
          />
        );
      })}

      {/* Space — a genuinely separate circular inset (own image, material,
          lighting), never part of the shared scene's perspective. */}
      <motion.div
        className="pointer-events-none absolute overflow-hidden rounded-full shadow-elevated"
        style={{
          left: pct(byId('space').box.x, FIELD_W),
          top: pct(byId('space').box.y, FIELD_H),
          width: pct(byId('space').box.width, FIELD_W),
          height: pct(byId('space').box.height, FIELD_H),
          border: '4px solid #FDFBF3',
          // `space` is a masked circle, not a raster silhouette (see
          // domainPivot()'s comment) — feMorphology has no alpha edge to
          // trace here, so its "selected" outline is a second white ring
          // outside the existing border instead of the filter used above.
          boxShadow: selectedObjects.has('space') ? '0 0 0 3px #FDFBF3' : undefined,
          transformOrigin: '50% 50%',
        }}
        initial={false}
        animate={{ opacity: active.has('space') ? 1 : 0, scale: selectedObjects.has('space') ? SELECTED_SCALE : 1 }}
        transition={{ duration: motionOk ? 0.3 : 0 }}
      >
        <img src={SPACE_SRC} alt="" aria-hidden="true" draggable={false} className="size-full object-cover" />
      </motion.div>

      {/* This SVG is NOT aria-hidden as a whole — it hosts the real,
          focusable edge hit-paths at the bottom. Every purely decorative
          element inside (contrail, the visible line pair, marker rings) is
          individually aria-hidden instead: aria-hidden on the root would
          have hidden its interactive descendants too, tabIndex and all. */}
      <svg
        viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="pointer-events-none absolute inset-0 size-full"
      >
        <defs>
          <filter id="mdoLineGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="mdoNodeGlow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="mdoContrailBlur" x="-40%" y="-150%" width="180%" height="400%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          {/* Thin white outline traced around a selected object's own
              alpha silhouette (dilate the PNG's real transparent-pixel
              edge, flood it white, keep only the dilated ring, then draw
              the original image back on top) — spec: "קו מתאר לבן דק סביב
              צורת האובייקט, לא סביב מלבן התמונה". Applied via CSS
              `filter: url(#mdoSelectionOutline)` on the object's own
              <img>, not inside this <svg>'s own render tree. */}
          <filter id="mdoSelectionOutline" x="-30%" y="-30%" width="160%" height="160%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="2.2" result="dilated" />
            <feFlood floodColor="#FDFBF3" result="outlineColor" />
            <feComposite in="outlineColor" in2="dilated" operator="in" result="outline" />
            <feMerge>
              <feMergeNode in="outline" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* The raster contrail didn't survive background removal (too soft
            for the matting step) — redrawn here as a short SVG streak, tied
            to air's own opacity so it disappears with it. */}
        <motion.line
          aria-hidden="true"
          x1={air.anchor[0] - 6} y1={air.anchor[1] + 4}
          x2={air.anchor[0] - air.box.width * 0.38} y2={air.anchor[1] + air.box.height * 0.34}
          stroke="#FDFBF3" strokeWidth={7} strokeLinecap="round"
          filter="url(#mdoContrailBlur)"
          initial={false}
          animate={{ opacity: airOn ? 0.55 : 0 }}
          transition={{ duration: motionOk ? 0.3 : 0 }}
        />

        {/* Connections — an edge shows iff BOTH its own endpoints are
            active (never an aggregate/threshold rule); the line itself is
            the only visible affordance (no midpoint label, no separate
            list). Selected/focused edges get a visibly thicker core, never
            a color change. Always mounted so pathLength can animate a real
            retract/redraw, not just fade. */}
        {edges.map(({ edge, d, mid }) => {
          const bothActive = active.has(edge.a) && active.has(edge.b);
          const isSelected = edge.id === selectedEdgeId;
          const isFocused = edge.id === focusedEdgeId;
          const touchesSelected = selectedEdgeId != null && !!selectedEdge && (
            edge.id === selectedEdgeId
            || edge.a === selectedEdge.edge.a || edge.a === selectedEdge.edge.b
            || edge.b === selectedEdge.edge.a || edge.b === selectedEdge.edge.b
          );
          const dimmedBySelection = selectedEdgeId != null && !touchesSelected;
          const inObjectSelection = selectedObjects.has(edge.a) && selectedObjects.has(edge.b);
          const emphasize = isSelected || isFocused || inObjectSelection;
          const targetOpacity = bothActive ? (dimmedBySelection ? 0.32 : 1) : 0;
          return (
            <g key={edge.id} aria-hidden="true">
              <motion.path
                d={d} fill="none" stroke="#D97E2B" strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={false}
                animate={{
                  pathLength: bothActive ? 1 : 0,
                  opacity: targetOpacity * 0.3,
                  strokeWidth: emphasize ? LINE_WIDTH_HALO + 2 : LINE_WIDTH_HALO,
                }}
                transition={bothActive
                  ? { pathLength: { duration: motionOk ? 0.22 : 0, delay: motionOk ? 0.09 : 0 }, opacity: { duration: motionOk ? 0.3 : 0, delay: motionOk ? 0.09 : 0 } }
                  : { pathLength: { duration: motionOk ? 0.2 : 0 }, opacity: { duration: motionOk ? 0.18 : 0 } }}
                filter="url(#mdoLineGlow)"
              />
              <motion.path
                d={d} fill="none" stroke="#D97E2B" strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={false}
                animate={{
                  pathLength: bothActive ? 1 : 0,
                  opacity: targetOpacity,
                  strokeWidth: emphasize ? LINE_WIDTH_CORE_EMPHASIS : LINE_WIDTH_CORE,
                }}
                transition={bothActive
                  ? { pathLength: { duration: motionOk ? 0.22 : 0, delay: motionOk ? 0.09 : 0 }, opacity: { duration: motionOk ? 0.3 : 0, delay: motionOk ? 0.09 : 0 } }
                  : { pathLength: { duration: motionOk ? 0.2 : 0 }, opacity: { duration: motionOk ? 0.18 : 0 } }}
              />
              {motionEnabled && bothActive && !dimmedBySelection && (
                <circle r="3.5" fill="#D97E2B" opacity="0.85">
                  <animateMotion dur="4.2s" repeatCount="indefinite" path={d} />
                </circle>
              )}
            </g>
          );
        })}

        {/* Marker rings — one per domain, at its own connector point;
            purely decorative (the real controls live in the column beside
            the image), so they carry no independent state of their own. */}
        {DOMAIN_VISUALS.map((d) => {
          const isSelected = selectedObjects.has(d.id);
          const [mcx, mcy] = effectiveAnchor(d, isSelected);
          return (
            <motion.g
              key={'marker-' + d.id}
              aria-hidden="true"
              initial={false}
              animate={{ opacity: active.has(d.id) ? 1 : 0 }}
              transition={{ duration: motionOk ? 0.3 : 0 }}
            >
              <circle cx={mcx} cy={mcy} r="24" fill="#D97E2B" opacity="0.16" filter="url(#mdoNodeGlow)" />
              <circle cx={mcx} cy={mcy} r="14" fill="none" stroke="#FDFBF3" strokeWidth="3.5" vectorEffect="non-scaling-stroke" opacity="0.4" />
              <circle cx={mcx} cy={mcy} r="14" fill="none" stroke="#D97E2B" strokeWidth="2.5" vectorEffect="non-scaling-stroke" opacity="0.9" />
              <circle cx={mcx} cy={mcy} r="5" fill="#D97E2B" />
            </motion.g>
          );
        })}

        {/* Multi-select hit targets — one per domain, transparent HTML
            buttons (not SVG, for free keyboard semantics matching the rest
            of this file's controls), rendered only while that domain is
            active (spec: click target only exists on an active object).
            Sit right after the markers in DOM order but are NOT inside
            this <svg> (see the sibling block just below it, after this
            svg's closing tag) — kept out of the SVG so pointer-events on
            an HTML <button> behave normally; they still receive clicks
            despite the decorative SVG painting on top of them, because
            this svg's own root is pointer-events-none except its
            explicitly-enabled descendants (the edge hit-paths). */}

        {/* Real, accessible controls — ONE per connection (no duplicate Tab
            stop): a wide transparent hit-path running the line's FULL
            length via pointer-events:stroke, not just its midpoint, so any
            third of the curve is clickable. Keyboard-operable directly (SVG
            path, tabIndex + Enter/Space), with a visible focus emphasis on
            the line itself above rather than a box-shadow ring (SVG paths
            can't carry one). */}
        {edges.map(({ edge, a, b, d }) => {
          const bothActive = active.has(edge.a) && active.has(edge.b);
          return (
            <path
              key={'hit-' + edge.id}
              ref={(el) => { edgePathRefs.current[edge.id] = el; }}
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={LINE_HIT_WIDTH}
              tabIndex={bothActive ? 0 : -1}
              role="button"
              aria-expanded={selectedEdgeId === edge.id}
              aria-controls={selectedEdgeId === edge.id ? 'mdo-edge-card' : undefined}
              aria-label={`קשר בין ${a.label} ל${b.label}: ${edge.label}. הצגת הסבר`}
              style={{ pointerEvents: bothActive ? 'stroke' : 'none', cursor: bothActive ? 'pointer' : undefined, outline: 'none' }}
              onClick={() => bothActive && onSelectEdge(edge.id)}
              onKeyDown={(e) => {
                if (!bothActive) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectEdge(edge.id);
                }
              }}
              onFocus={() => setFocusedEdgeId(edge.id)}
              onBlur={() => setFocusedEdgeId((f) => (f === edge.id ? null : f))}
            />
          );
        })}
      </svg>

      {DOMAIN_VISUALS.map((d) => {
        if (!active.has(d.id)) return null;
        const isSelected = selectedObjects.has(d.id);
        return (
          <button
            key={'select-' + d.id}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${isSelected ? 'ביטול בחירת' : 'בחירת'} ${d.label} להשוואה בין ממדים`}
            onClick={() => onToggleObject(d.id)}
            className="absolute rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            style={{
              left: pct(d.box.x, FIELD_W),
              top: pct(d.box.y, FIELD_H),
              width: pct(d.box.width, FIELD_W),
              height: pct(d.box.height, FIELD_H),
              background: 'transparent',
              cursor: 'pointer',
            }}
          />
        );
      })}

      {selectedEdge && (
        <MDOEdgeCard
          edge={selectedEdge.edge}
          aLabel={selectedEdge.a.label}
          bLabel={selectedEdge.b.label}
          motionOk={motionOk}
          onClose={onCloseCard}
          onRequestFocusBack={() => edgePathRefs.current[selectedEdge.edge.id]?.focus()}
          closeBtnRef={closeBtnRestoreRef}
        />
      )}
    </div>
  );
}

/** The static photo, with an optional looping environment video composited
    on top (waves/vegetation/clouds only — a locked camera, no zoom or
    lighting change, per the brief). The video has no audio and pauses
    off-screen (reusing the same IntersectionObserver `inView` the
    connection animations already gate on) or under reduced motion, where
    only the static photo ever renders. If SCENE_VIDEO_SRC doesn't exist on
    disk yet, onError silently falls back to the photo alone — this never
    claims a video plays when none was actually produced. */
function MDOSceneBackdrop({ inView, reduceMotion }: { inView: boolean; reduceMotion: boolean }) {
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const showVideo = !reduceMotion && !videoUnavailable && videoReady;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (inView && !paused && !reduceMotion) el.play().catch(() => {});
    else el.pause();
  }, [inView, paused, reduceMotion]);

  return (
    <>
      <IsometricAsset
        assetId="TOPIC01-MDO-GROUND-SCENE"
        src={SCENE_SRC}
        alt="נוף חוף ים-תיכוני בגובה הקרקע: ים משמאל, דרך עפר וגבעות מכוסות שיח מימין, שמיים פתוחים למעלה — חמשת ממדי הלחימה מוצבים בו כשכבות עצמאיות"
        aspect="4/3"
        fit="cover"
        eager
        className={cn('absolute inset-0 size-full [aspect-ratio:auto] transition-opacity duration-300', showVideo && 'opacity-0')}
      />
      {!reduceMotion && (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- decorative environment loop, no dialogue/audio track
        <video
          ref={videoRef}
          className={cn('pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-300', showVideo ? 'opacity-100' : 'opacity-0')}
          src={SCENE_VIDEO_SRC}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoUnavailable(true)}
        />
      )}
      {showVideo && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={paused ? 'הפעלת תנועת הרקע' : 'השהיית תנועת הרקע'}
          className="absolute bottom-3 start-3 z-10 flex size-8 items-center justify-center rounded-full border border-border/70 bg-bg-elevated/90 text-fg shadow-elevated backdrop-blur-sm transition-colors hover:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          {paused ? (
            <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
          )}
        </button>
      )}
    </>
  );
}

/** The one shared explanation card for a domain PAIR. Selecting, switching
    or closing it never touches `active` — only its own close button (or a
    domain going off underneath it) can close it. */
function MDOEdgeCard({
  edge,
  aLabel,
  bLabel,
  motionOk,
  onClose,
  onRequestFocusBack,
  closeBtnRef,
}: {
  edge: MdoEdge;
  aLabel: string;
  bLabel: string;
  motionOk: boolean;
  onClose: () => void;
  onRequestFocusBack: () => void;
  closeBtnRef: React.MutableRefObject<HTMLButtonElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    containerRef.current?.focus({ preventScroll: true });
  }, [edge.id]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'Tab' && e.shiftKey && (e.target === containerRef.current || e.target === closeBtnRef.current)) {
      e.preventDefault();
      onRequestFocusBack();
    }
  }

  return (
    <div
      ref={containerRef}
      id="mdo-edge-card"
      role="region"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      aria-label={`הסבר על הקשר בין ${aLabel} ל${bLabel}`}
      // Physical bottom-left corner (approved position) — a patch of the
      // composition kept clear of every domain's own footprint (the
      // downsized vehicle sits center-right of the road, the ship stays in
      // the left THIRD but higher up, near the horizon) so opening it never
      // covers an active tool.
      style={{ insetInlineEnd: '1rem', insetBlockEnd: '1rem', width: 'min(320px, 44%)' }}
      className={cn(
        'absolute z-10 rounded-2xl border border-border bg-bg-elevated/95 p-4 shadow-elevated backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        flipTransition(motionOk),
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-base font-bold leading-tight text-black">{edge.label}</div>
          <div className="text-xs font-medium text-fg-muted">כך הם יכולים לתרום זה לזה</div>
        </div>
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="סגירת ההסבר"
          className="shrink-0 rounded-full p-1 text-fg-dim transition-colors hover:bg-bg-accent hover:text-fg focus-visible:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Icon name="x" size={16} />
        </button>
      </div>
      <div className="mt-3 space-y-2 text-sm leading-relaxed">
        <p>
          <span className="font-display font-bold text-fg">תרומת {aLabel} ל{bLabel}: </span>
          <span className="text-fg-muted">{edge.aToB}</span>
        </p>
        <p>
          <span className="font-display font-bold text-fg">תרומת {bLabel} ל{aLabel}: </span>
          <span className="text-fg-muted">{edge.bToA}</span>
        </p>
      </div>
    </div>
  );
}

/** A domain's own toggle row inside the fixed right-hand column — the ONLY
    control that changes `active`, and the only one that keeps working once
    the domain's object layer has faded out. */
function DomainToggleRow({
  domain,
  isOn,
  motionOk,
  onToggle,
}: {
  domain: DomainVisual;
  isOn: boolean;
  motionOk: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <Icon name={domain.icon} size={18} className={cn('shrink-0', isOn ? 'text-fg' : 'text-fg-dim', flipTransition(motionOk))} />
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-display text-sm font-bold text-fg">{domain.label}</span>
          {/* Always in the DOM (just invisible when on) so every row keeps
              the SAME fixed height regardless of state — toggling never
              reflows a sibling row or the reset button beneath it. */}
          <span className={cn('block text-[11px] font-medium text-fg-muted', isOn && 'invisible')}>כבוי</span>
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={`${domain.label}: ${isOn ? 'פעיל' : 'כבוי'}. לחיצה ${isOn ? 'תכבה' : 'תפעיל'} את הממד`}
        onClick={onToggle}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
          flipTransition(motionOk),
          isOn ? 'border-accent bg-accent' : 'border-border bg-bg-elevated',
        )}
      >
        <span
          className={cn(
            'block size-[1.125rem] rounded-full bg-white shadow',
            flipTransition(motionOk),
            isOn ? 'ms-auto' : 'me-auto',
          )}
        />
      </button>
    </div>
  );
}

/** Fixed right-hand control column: one row per domain (stays usable even
    once the domain's object has faded out — it's the only way to bring it
    back), then Reset pinned to the column's own bottom edge. `h-full` +
    flex-col is what lets it fill the exact height the grid row stretches it
    to (driven by the image's own 3:2 box) without inflating each row. */
function MDOControlColumn({
  active,
  selectedObjects,
  motionOk,
  onToggle,
  onReset,
}: {
  active: Set<MdoDomainId>;
  selectedObjects: Set<MdoDomainId>;
  motionOk: boolean;
  onToggle: (id: MdoDomainId) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-bg-accent/60 p-3">
      <div className="shrink-0">
        {DOMAIN_VISUALS.map((domain, i) => (
          <div key={domain.id} className={cn(i < DOMAIN_VISUALS.length - 1 && 'border-b border-border-subtle')}>
            <DomainToggleRow domain={domain} isOn={active.has(domain.id)} motionOk={motionOk} onToggle={() => onToggle(domain.id)} />
          </div>
        ))}
      </div>
      <MDOSelectionExplainer selected={selectedObjects} />
      <button
        type="button"
        onClick={onReset}
        className="mt-3 shrink-0 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-bg-elevated px-3 py-2 text-sm font-display font-bold text-fg transition-colors hover:bg-bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <Icon name="refresh" size={15} />
        איפוס
      </button>
    </div>
  );
}

/** The right column's own middle region — its own bounded, internally
    scrollable slot between the toggle rows and Reset, so the column's and
    image's shared total height never changes regardless of how long the
    composed explanation gets (spec: "הטור והתמונה נשארים באותו גובה").
    Still the same bg-bg-accent/60 surface as the rest of the column — no
    border/shadow/radius of its own, so it never reads as a detached card. */
function MDOSelectionExplainer({ selected }: { selected: Set<MdoDomainId> }) {
  const { heading, lines } = useMemo(() => composeSelectionExplainer(selected), [selected]);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto border-t border-border-subtle pt-3">
      <div className="font-display text-xs font-bold leading-tight text-fg">{heading}</div>
      <div className="mt-1.5 space-y-1.5 text-[11px] leading-relaxed text-fg-muted">
        {lines.map((line, i) => <p key={i}>{line}</p>)}
      </div>
    </div>
  );
}

/** The summary: badge + at most 2–3 composed sentences. No connection-name
    listing and no chip list here any more — the lines themselves, clickable
    along their whole length, are the only interface to a pair's
    explanation. Position (top of the shared card) never changes with
    scene state. */
// The most lines composeSummary() ever returns (its 1/2/3-active branches);
// MDOSummary below always renders exactly this many <p> slots so the
// summary's own height never depends on `active` — see that component.
const SUMMARY_LINE_SLOTS = 3;

function MDOSummary({ active }: { active: Set<MdoDomainId> }) {
  const { badge, lines } = useMemo(() => composeSummary(active), [active]);
  // Padded to a constant slot count so this block's height stays fixed
  // across every active-count state, per the design brief: no truncation,
  // no font shrink, and the [control column | image] row below never gets
  // pushed down when the composed text gets shorter or longer. Unused
  // slots render a non-breaking space so their line-height is identical
  // to a real line, just invisible (and hidden from assistive tech).
  const paddedLines = [...lines, ...Array(SUMMARY_LINE_SLOTS - lines.length).fill(null)];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-display text-sm font-bold text-fg">{badge}</span>
        <span aria-hidden="true" className="flex gap-1.5">
          {MDO_DOMAIN_ORDER.map((id) => (
            <span key={id} className={cn('size-2 rounded-full', active.has(id) ? 'bg-accent' : 'bg-border')} />
          ))}
        </span>
      </div>
      <div className="mt-2 space-y-1.5 text-sm leading-relaxed text-fg-muted">
        {paddedLines.map((line, i) => (
          <p key={i} aria-hidden={line ? undefined : true} className={line ? undefined : 'invisible'}>
            {line ?? ' '}
          </p>
        ))}
      </div>
    </div>
  );
}

function RealWorldExamples() {
  const reduceMotion = useReducedMotion();
  const cases = [
    {
      title: 'אוקראינה נגד רוסיה',
      year: '2022 ואילך',
      desc: "אוקראינה בולמת צבא ענק בעזרת שילוב זירות: חיילים בשוחות (יבשה) מפעילים רחפנים קטלניים (אוויר) כדי לתקוף ספינות (ים), כשהם מנווטים דרך אינטרנט לווייני של 'סטארלינק' (חלל), בזמן שרוסיה מנסה להפיל להם את הרשת ללא הפסקה (סייבר).",
      domainIds: ['land', 'air', 'sea', 'space', 'cyber'] as MdoDomainId[],
      photoAssetId: 'TOPIC01-MDO-CASE-UKRAINE',
      photoSrc: '/assets/lessons/topic01/scene-mdo/TOPIC01-MDO-CASE-UKRAINE.png',
      photoAlt: 'חייל בשטח מפעיל רחפן תקיפה, בשמיים מעליו לוויין תקשורת',
    },
    {
      title: "החות'ים משתקים את הים האדום",
      year: '2023–2024',
      desc: 'איך ארגון טרור מתימן משתק את הסחר העולמי? הם תוקפים אוניות סחר (ים) בעזרת כטב"מים וטילים (אוויר), ומקבלים מיקומים מדויקים על האוניות ממערכות ולוויינים של איראן (חלל וסייבר). הוכחה שגם ארגון קטן יכול לשלב ממדים.',
      domainIds: ['air', 'sea', 'space', 'cyber'] as MdoDomainId[],
      photoAssetId: 'TOPIC01-MDO-CASE-HOUTHIS',
      photoSrc: '/assets/lessons/topic01/scene-mdo/TOPIC01-MDO-CASE-HOUTHIS.png',
      photoAlt: 'אוניית סחר בים האדום, כטב"ם תוקף מהאוויר ותצפית חופית עוקבת',
    },
    {
      title: 'תקיפת איראן (אוקטובר 2024)',
      year: '2024',
      desc: "מטוסי קרב (אוויר) הפציצו מטרות במרחק אלפי קילומטרים. כדי שזה יצליח, לוויינים (חלל) שידרו להם מיקום מדויק בזמן אמת, ולוחמי סייבר 'עיוורו' את מערכות ההגנה של איראן עוד לפני שהמטוסים התקרבו. שילוב מושלם ששמר על כוחותינו.",
      domainIds: ['air', 'space'] as MdoDomainId[],
      photoAssetId: 'TOPIC01-MDO-CASE-IRAN',
      photoSrc: '/assets/lessons/topic01/scene-mdo/TOPIC01-MDO-CASE-IRAN.png',
      photoAlt: 'מטוס קרב בטיסה מעל שטח איראן, לוויין משדר מיקום ממעל',
    },
  ];
  return (
    <div className="mt-12">
      <div>
        <div className="mb-5">
          <h3 className="font-display text-2xl font-bold leading-tight text-black sm:text-3xl">איך זה נראה בעולם האמיתי</h3>
          <span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-accent" />
          <p className="mt-2 text-base leading-relaxed text-fg-muted">3 דוגמאות עכשוויות שבהן ראינו MDO בפועל</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {cases.map((c, i) => (
            <motion.article
              key={c.title}
              initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={reduceMotion ? { duration: 0 } : { delay: i * 0.08 }}
              className="surface p-5 text-center"
            >
              <div className="text-sm font-display font-semibold tracking-wider text-fg-muted">
                {c.year}
              </div>
              <h4 className="font-display font-bold leading-tight text-black text-lg md:text-xl text-balance mt-0.5 mb-3">{c.title}</h4>
              <IsometricAsset
                assetId={c.photoAssetId}
                src={c.photoSrc}
                alt={c.photoAlt}
                aspect="4/3"
                fit="cover"
                className="rounded-lg overflow-hidden"
              />
              <p className="mt-3 text-base leading-relaxed text-black text-pretty">{c.desc}</p>
              <div className="mt-4 flex flex-wrap items-start justify-center gap-3">
                {DOMAIN_VISUALS.filter((d) => c.domainIds.includes(d.id)).map((d) => (
                  <div key={d.id} className="flex flex-col items-center gap-1.5">
                    <div className="flex size-9 items-center justify-center rounded-full border border-border">
                      <Icon name={d.icon} size={16} className="text-fg" />
                    </div>
                    <span className="text-[11px] text-fg-muted">{d.label}</span>
                  </div>
                ))}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
function ChokepointBand({
  eyebrow,
  className,
  children,
}: {
  eyebrow: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('relative isolate overflow-hidden rounded-[28px] bg-pine-grad p-5 shadow-pine-card sm:p-7 md:p-8', className)}>
      <div className="grid gap-6 sm:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col justify-center">
          <div className="mb-1 text-sm font-display font-bold tracking-wide text-ember">
            {eyebrow}
          </div>
          <p className="text-base leading-relaxed text-paper-bright/90">{children}</p>
        </div>
        <div className="relative min-h-[200px]">
          <IsometricAsset
            assetId="TOPIC01-MDO-CHAIN-BROKEN"
            src="/assets/lessons/topic01/scene-mdo/TOPIC01-MDO-CHAIN-BROKEN.png"
            alt="שרשרת שבורה — סמל לחוליה חלשה המנתקת את החיבור בין הממדים"
            aspect="4/3"
            fit="cover"
            className="rounded-xl border border-border [aspect-ratio:auto] h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
