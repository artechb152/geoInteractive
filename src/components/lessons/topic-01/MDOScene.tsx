'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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

// AI-generated per-object video loops (sea/land only — see below for why
// air isn't one of them; cyber's mast stays a still image with a
// signal-pulse ring per the motion-kit brief, space is an illustrative
// medallion, not real footage). These clips have NO alpha channel (plain
// H.264/mp4) — the generator was prompted for a plain near-black
// background instead, keyed to transparent at runtime by
// DomainObjectLayer's canvas loop below. Falls back to the static PNG via
// onError/videoReady gating, same pattern as MDOSceneBackdrop's video.
//
// `air` was generated and keyed the same way but dropped after review: the
// model rendered the jet banking/climbing instead of the level side-on
// pose the prompt asked for (reads as unrealistic next to the flat,
// hand-cut PNGs everywhere else), and because OBJECT_VIDEO_FRAME below can
// only crop a FIXED rectangle, the plane's own in-clip motion carried it
// outside that crop before the loop finished, clipping it mid-loop. Both
// are the video content's own fault, not something the crop or playback
// rate could fix, so the jet stays a static PNG with only the gentle
// DOMAIN_IDLE_MOTION bob below — same as before this video experiment.
const OBJECT_VIDEO_SRC: Partial<Record<MdoDomainId, string>> = {
  sea: `${ASSET_BASE}/mdo-sea-object-loop.mp4`,
  land: `${ASSET_BASE}/mdo-land-object-loop.mp4`,
};

// Each clip's own visible-subject box, as a 0–1 fraction of the clip's
// FULL frame — the generator renders the subject small and off-center
// inside a much larger plain background (unlike the tightly-cropped
// static PNGs), so the raw frame can't be dropped into the domain's
// existing `box` as-is. Eyeballed from one extracted preview frame per
// clip (there's no alpha channel to scan the way the land PNG's bbox
// was measured — see its own DOMAIN_VISUALS comment) and used to crop the
// video onto the SAME box/anchor calibration the PNG already uses, rather
// than re-deriving new position math just for video.
//
// Deliberately generous margins, NOT a tight bounding box: this rectangle
// is measured from a single still frame, but the subject itself moves
// within the clip (suspension bounce shifts the whole vehicle, wheels
// extend further at points in their rotation than they appeared at the
// sampled instant) — a tight crop clips those extremes mid-loop (this bit
// `land`'s front wheels in review). Better to show a bit more empty
// margin around the subject than to slice a moving part off at the crop
// boundary.
const OBJECT_VIDEO_FRAME: Partial<Record<MdoDomainId, { xStart: number; xEnd: number; yStart: number; yEnd: number }>> = {
  sea: { xStart: 0.06, xEnd: 0.94, yStart: 0.16, yEnd: 0.92 },
  land: { xStart: 0.01, xEnd: 0.99, yStart: 0, yEnd: 1 },
};

// The generated clips' own baked motion read as too lively/fast at native
// speed — even at first-pass half speed it still read as exaggerated per
// direct user feedback, so this is slowed further rather than
// re-generating; applied as the <video>'s own playbackRate in
// DomainObjectLayer.
const OBJECT_VIDEO_PLAYBACK_RATE = 0.35;

// Soft luma-key thresholds (0–255, on max(r,g,b) per pixel): at/under LOW
// is fully transparent, at/over HIGH is fully opaque, ramped in between so
// the keyed edge doesn't look like a hard cutout. The clips were generated
// against a near-black plain background specifically so a simple luma key
// (no green/blue-screen tooling available here) can pull it back out.
const VIDEO_KEY_LOW = 16;
const VIDEO_KEY_HIGH = 52;

// The draw+key step below is a real per-pixel JS loop plus a
// getImageData/putImageData round trip (canvas readback) — CPU work, not
// GPU-composited. Up to three of these can run at once (land/air/sea all
// active by default), so it's throttled to this cadence instead of every
// rAF tick (~60fps): the source video itself has no motion fast enough to
// need more than this to read as smooth, and it cuts the CPU cost by
// more than half. `requestAnimationFrame` is still scheduled every tick
// (cheap) so the throttle self-corrects to actual elapsed time rather than
// drifting, but the expensive body only runs once the interval has passed.
const VIDEO_KEY_FRAME_INTERVAL_MS = 1000 / 24;

/** Runs a draw+key loop (throttled to VIDEO_KEY_FRAME_INTERVAL_MS, see
    above) while `enabled`: crops the video's own `frame` region onto the
    canvas, then keys near-black pixels to transparent in place (see
    VIDEO_KEY_LOW/HIGH above). Stops the rAF loop (and leaves the canvas as
    last drawn) whenever disabled — caller is responsible for hiding the
    canvas (opacity) in that case. */
function useLumaKeyVideoCanvas(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  frame: { xStart: number; xEnd: number; yStart: number; yEnd: number } | undefined,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled || !frame) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    let rafId = 0;
    let lastDrawTime = 0;
    const draw = (time: number) => {
      rafId = requestAnimationFrame(draw);
      if (time - lastDrawTime < VIDEO_KEY_FRAME_INTERVAL_MS) return;
      lastDrawTime = time;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw && vh) {
        const sx = frame.xStart * vw;
        const sy = frame.yStart * vh;
        const sw = (frame.xEnd - frame.xStart) * vw;
        const sh = (frame.yEnd - frame.yStart) * vh;
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        const shot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px = shot.data;
        for (let i = 0; i < px.length; i += 4) {
          const bright = Math.max(px[i], px[i + 1], px[i + 2]);
          px[i + 3] =
            bright <= VIDEO_KEY_LOW
              ? 0
              : bright >= VIDEO_KEY_HIGH
                ? 255
                : Math.round(((bright - VIDEO_KEY_LOW) / (VIDEO_KEY_HIGH - VIDEO_KEY_LOW)) * 255);
        }
        ctx.putImageData(shot, 0, 0);
      }
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [videoRef, canvasRef, frame, enabled]);
}

/** The visible-pixel bounding box of each domain's object, as a 0–1
    fraction of that domain's OWN `box` above (same uniform scale, so these
    fractions apply directly to box.x/y/width/height) — used to tighten the
    multi-select hit-rect to the actual object instead of its padded PNG
    canvas. `land` is derived from the alpha-channel scan documented on its
    own DOMAIN_VISUALS entry (canvas 1300×800, visible bbox x:82–938 ×
    y:91–666). `air`/`sea`/`cyber` don't have a full 2D bbox measurement in
    their own comments (air only states an overall width %, sea and cyber
    say nothing about visible-pixel extents) — for those a conservative flat
    15% inset on all four sides is used instead of guessing. `space` is the
    circular photographic inset itself (no padding to trim), so its box is
    used as-is. */
const VISIBLE_BBOX_FRACTION: Record<MdoDomainId, { xStart: number; xEnd: number; yStart: number; yEnd: number }> = {
  land: { xStart: 82 / 1300, xEnd: 938 / 1300, yStart: 91 / 800, yEnd: 666 / 800 },
  air: { xStart: 0.15, xEnd: 0.85, yStart: 0.15, yEnd: 0.85 },
  sea: { xStart: 0.15, xEnd: 0.85, yStart: 0.15, yEnd: 0.85 },
  cyber: { xStart: 0.15, xEnd: 0.85, yStart: 0.15, yEnd: 0.85 },
  space: { xStart: 0, xEnd: 1, yStart: 0, yEnd: 1 },
};

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
function composeSummary(active: Set<MdoDomainId>): { lines: string[] } {
  const n = active.size;

  if (n === 5) return { lines: [MDO_COUNT_INTROS['5']] };
  if (n === 0) return { lines: [MDO_COUNT_INTROS['0']] };
  if (n === 4) {
    const missingId = MDO_DOMAIN_ORDER.find((id) => !active.has(id))!;
    return { lines: [MDO_COUNT_INTROS['4'], MDO_FOUR_ACTIVE_BY_MISSING[missingId]] };
  }

  const activeIds = MDO_DOMAIN_ORDER.filter((id) => active.has(id));
  const inactiveIds = MDO_DOMAIN_ORDER.filter((id) => !active.has(id));

  const stillPossible = n === 1
    ? `מה הממד הפעיל תורם: ${MDO_DOMAINS[activeIds[0]].label} — ${MDO_DOMAINS[activeIds[0]].contribution}.`
    : `מה עדיין אפשר לשלב: ${activeIds.map((id) => `${MDO_DOMAINS[id].label} — ${MDO_DOMAINS[id].contribution}`).join('; ')}.`;
  const missing = `מה עדיין לא זמין: ${inactiveIds.map((id) => MDO_DOMAINS[id].missing).join('. ')}.`;

  return { lines: [MDO_COUNT_INTROS[String(n) as '1' | '2' | '3'], stillPossible, missing] };
}

/** The selection popup's own content — composed ONLY from existing
    MDO_DOMAINS/MDO_EDGES fields (contribution / label / aToB / bToA),
    reusing the exact connective phrasing composeSummary() and MDOEdgeCard
    already use elsewhere in this file, never a new sentence describing a
    capability the data doesn't state. Independent of composeSummary(): this
    reads the object multi-select (capped at 2 — see toggleObjectSelection),
    not the on/off toggles. Only called once ≥1 object is selected — the
    popup itself isn't rendered otherwise. */
function composeSelectionExplainer(selected: Set<MdoDomainId>): { heading: string; lines: string[] } {
  const ids = MDO_DOMAIN_ORDER.filter((id) => selected.has(id));

  if (ids.length === 1) {
    const d = MDO_DOMAINS[ids[0]];
    return { heading: d.label, lines: [`מה הממד תורם: ${d.contribution}.`] };
  }

  const edge = MDO_EDGES.find((e) => (e.a === ids[0] && e.b === ids[1]) || (e.a === ids[1] && e.b === ids[0]));
  if (!edge) return { heading: `${MDO_DOMAINS[ids[0]].label} + ${MDO_DOMAINS[ids[1]].label}`, lines: [] };
  const aLabel = MDO_DOMAINS[edge.a].label;
  const bLabel = MDO_DOMAINS[edge.b].label;
  return {
    heading: edge.label,
    lines: [`תרומת ${aLabel} ל${bLabel}: ${edge.aToB}`, `תרומת ${bLabel} ל${aLabel}: ${edge.bToA}`],
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
  // Capped at 2 selected objects at a time (spec: "לא ניתן לבחור יותר
  // מ-2 אובייקטים") — a third click on a not-yet-selected object swaps out
  // the OLDEST of the two current picks (FIFO) rather than no-op'ing, so
  // there's always a live pair to compare; deselecting always works. `Set`
  // iteration order is insertion order, and we only ever add/delete
  // through this one function, so the first entry is reliably the oldest.
  function toggleObjectSelection(id: MdoDomainId) {
    setSelectedObjects((prev) => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      if (prev.size < 2) return new Set(prev).add(id);
      const [oldest] = prev;
      const next = new Set(prev);
      next.delete(oldest);
      next.add(id);
      return next;
    });
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
        {/* grid (not flex) so the 190px control column and the image column
            share one row and stretch to the SAME height by construction —
            the image's own 3:2 aspect-ratio sets the row's height (it's the
            taller of the two), and the column fills it via h-full below,
            never a ResizeObserver measuring one to force the other. */}
        <div className="grid grid-cols-[190px_1fr] items-stretch gap-4 p-4">
          <MDOControlColumn active={active} motionOk={motionOk} onToggle={toggleDomain} />
          <MDOGroundScene
            active={active}
            selectedEdgeId={selectedEdgeId}
            selectedObjects={selectedObjects}
            motionOk={motionOk}
            onSelectEdge={selectEdge}
            onToggleObject={toggleObjectSelection}
            onCloseCard={closeCard}
            onClearSelection={() => setSelectedObjects(new Set())}
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

/** Per-domain idle motion — a small, continuous "alive" loop applied to a
    domain's own object image whenever it's active, on-screen, motion is
    allowed AND the object isn't multi-select-selected (see `idleOn` at each
    call site). `y`/`rotate` are the loop's own OTHER end (framer's
    `repeatType: 'mirror'` bounces between the element's rest value — 0 —
    and this one), never the selection/hover `scale` channel, so idle
    motion, the ~4% selected-scale and the hover bump can all animate on the
    same element without fighting over one value. `space` and `cyber` are
    deliberately absent: `space`'s idle treatment is a slow zoom on its own
    INNER photo (see the `space` render block) so it doesn't collide with
    the outer circle's selection scale; `cyber`'s is a decorative
    signal-pulse ring next to the mast, not a transform on the mast image
    itself (the mast staying physically still is the point — see the pulse
    rings inside the svg below).

    Idle motion is suspended (not just left running underneath) while
    selected: selection applies `mdoSelectionOutline`, an SVG reference
    filter built from `feMorphology` (alpha-channel dilate) — unlike native
    CSS filter functions (`drop-shadow()`, `blur()`), reference filters
    aren't treated as a cacheable compositor texture Chromium can just
    translate/rotate, so pairing one with a continuously-animating transform
    forces a full filter re-rasterization on every single animation frame
    for as long as the object stays selected. Measured via a CDP raster
    trace: selecting an idle-animated domain (land) cost ~50% more
    `RasterTask` time over the same window than selecting a static one
    (cyber) with the identical filter — and with two idle-animated domains
    selected at once (the multi-select's own max), that compounds further.
    Freezing the loop's `y`/`rotate` back to rest the moment an object is
    selected removes the continuously-changing transform, so the filter
    only needs to rasterize once instead of every frame. */
// Deliberately subtle across the board — an earlier, livelier pass (bigger
// y/rotate, shorter duration) read as exaggerated/distracting per direct
// user feedback, on both this CSS loop and the object videos' own
// playback speed (see OBJECT_VIDEO_PLAYBACK_RATE). A slow, barely-there
// drift is the target: something you'd only consciously notice if you
// stared at one object for a few seconds, not motion that draws the eye.
const DOMAIN_IDLE_MOTION: Partial<Record<MdoDomainId, { y: number; rotate: number; duration: number }>> = {
  air: { y: -1.5, rotate: 0.35, duration: 6.5 },
  sea: { y: -1, rotate: 0.3, duration: 7 },
  land: { y: -1, rotate: 0.3, duration: 4.5 },
};

// Extra scale multiplier + glow while a pointer/keyboard focus hovers an
// active object — layered ON TOP of (never instead of) the idle loop and
// the selected-state scale, per the user's own instruction to add hover as
// an addition to the existing animation rather than a replacement.
const HOVER_SCALE = 1.025;
const HOVER_GLOW = 'drop-shadow(0 0 10px rgba(217,126,43,0.55))';

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
  onClearSelection,
  suppressFocusRestoreRef,
}: {
  active: Set<MdoDomainId>;
  selectedEdgeId: string | null;
  selectedObjects: Set<MdoDomainId>;
  motionOk: boolean;
  onSelectEdge: (id: string) => void;
  onToggleObject: (id: MdoDomainId) => void;
  onCloseCard: () => void;
  onClearSelection: () => void;
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

  // Hover/keyboard-focus emphasis on an active object — independent of
  // click-to-select (`selectedObjects`) and purely additive visual feedback
  // (see HOVER_SCALE/HOVER_GLOW). Cleared if the hovered domain is switched
  // off underneath the pointer (its hit button unmounts, so no mouseleave
  // would otherwise fire).
  const [hoveredId, setHoveredId] = useState<MdoDomainId | null>(null);
  useEffect(() => {
    if (hoveredId && !active.has(hoveredId)) setHoveredId(null);
  }, [active, hoveredId]);

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

      {/* Independent object layers — each domain's own transparent PNG (a
          few also have a real video loop, see DomainObjectLayer), with its
          own baked-in contact shadow/dust/wake. Always mounted; only the
          animated opacity target changes, so a rapid off→on re-toggle
          reverses the in-flight fade instead of restarting it. */}
      {DOMAIN_VISUALS.filter((d) => !d.standalone).map((d) => (
        <DomainObjectLayer
          key={d.id}
          d={d}
          isSelected={selectedObjects.has(d.id)}
          isHovered={hoveredId === d.id}
          isActive={active.has(d.id)}
          motionOk={motionOk}
          motionEnabled={motionEnabled}
        />
      ))}

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
          // trace here, so its "selected"/hover emphasis is an outer ring
          // instead of the filter used on the other domains above.
          boxShadow: selectedObjects.has('space')
            ? '0 0 0 3px #FDFBF3'
            : hoveredId === 'space'
              ? '0 0 0 3px rgba(217,126,43,0.5)'
              : undefined,
          transformOrigin: '50% 50%',
        }}
        initial={false}
        animate={{
          opacity: active.has('space') ? 1 : 0,
          scale: (selectedObjects.has('space') ? SELECTED_SCALE : 1) * (hoveredId === 'space' ? HOVER_SCALE : 1),
        }}
        transition={{ opacity: { duration: motionOk ? 0.3 : 0 }, scale: { duration: motionOk ? 0.2 : 0 } }}
      >
        {/* Idle motion here is a slow "live feed" breathing zoom on the
            photo ITSELF, not the outer circle — the outer div's own scale
            channel is already spoken for by selection/hover, so a second,
            continuous scale loop on the inner image avoids fighting over
            the same value (same reasoning as DOMAIN_IDLE_MOTION above). */}
        <motion.img
          src={SPACE_SRC}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="size-full object-cover"
          initial={false}
          animate={{ scale: motionEnabled && active.has('space') ? [1, 1.06, 1] : 1 }}
          transition={{ duration: 6, repeat: motionEnabled && active.has('space') ? Infinity : 0, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Multi-select hit targets — one per domain, transparent HTML
          buttons (not SVG, for free keyboard semantics matching the rest
          of this file's controls), rendered only while that domain is
          active (spec: click target only exists on an active object).
          Rendered BEFORE the <svg> below, so in paint order the svg sits on
          top of these buttons — the svg's own root is pointer-events-none
          except its explicitly-enabled descendants (the edge hit-paths,
          `pointerEvents: 'stroke'`), so those hit-paths can still intercept
          a click exactly where a connection line crosses a button, while
          everywhere else on a button (i.e. everywhere the svg itself has no
          pointer-events) clicks reach the button normally. Each rect is
          inset from its domain's raw `box` to the object's own
          visible-pixel bounding box (see each DOMAIN_VISUALS entry's own
          comment for the source measurement/fallback), so the hit target
          doesn't cover the padded, mostly-transparent PNG canvas. */}
      {DOMAIN_VISUALS.map((d) => {
        if (!active.has(d.id)) return null;
        const isSelected = selectedObjects.has(d.id);
        const inset = VISIBLE_BBOX_FRACTION[d.id];
        const hitX = d.box.x + d.box.width * inset.xStart;
        const hitY = d.box.y + d.box.height * inset.yStart;
        const hitW = d.box.width * (inset.xEnd - inset.xStart);
        const hitH = d.box.height * (inset.yEnd - inset.yStart);
        return (
          <button
            key={'select-' + d.id}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${isSelected ? 'ביטול בחירת' : 'בחירת'} ${d.label} להשוואה בין ממדים`}
            onClick={() => onToggleObject(d.id)}
            onMouseEnter={() => setHoveredId(d.id)}
            onMouseLeave={() => setHoveredId((h) => (h === d.id ? null : h))}
            onFocus={() => setHoveredId(d.id)}
            onBlur={() => setHoveredId((h) => (h === d.id ? null : h))}
            className="absolute rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            style={{
              left: pct(hitX, FIELD_W),
              top: pct(hitY, FIELD_H),
              width: pct(hitW, FIELD_W),
              height: pct(hitH, FIELD_H),
              background: 'transparent',
              cursor: 'pointer',
            }}
          />
        );
      })}

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

        {/* Cyber's own idle motion: a signal-pulse ring expanding/fading
            from the mast's dish-cluster anchor, staggered into two waves so
            one is always mid-pulse — the mast IMAGE itself stays physically
            still (per DOMAIN_IDLE_MOTION's own note above); this is the
            domain's "alive" cue instead. */}
        {active.has('cyber') && motionEnabled && (
          <g aria-hidden="true">
            {[0, 1].map((i) => (
              <motion.circle
                key={'cyber-pulse-' + i}
                cx={byId('cyber').anchor[0]}
                cy={byId('cyber').anchor[1]}
                r={9}
                fill="none"
                stroke="#D97E2B"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                style={{ transformOrigin: `${byId('cyber').anchor[0]}px ${byId('cyber').anchor[1]}px` }}
                initial={{ opacity: 0.55, scale: 0.6 }}
                animate={{ opacity: 0, scale: 2.4 }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: i * 1.2 }}
              />
            ))}
          </g>
        )}

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

      {/* One shared bottom-left popup slot: an edge click takes priority
          (it's the more specific, momentary action); otherwise, as long as
          1–2 objects are selected in the image, the same slot shows their
          comparison text — never both at once. */}
      {selectedEdge ? (
        <MDOEdgeCard
          edge={selectedEdge.edge}
          aLabel={selectedEdge.a.label}
          bLabel={selectedEdge.b.label}
          motionOk={motionOk}
          onClose={onCloseCard}
          onRequestFocusBack={() => edgePathRefs.current[selectedEdge.edge.id]?.focus()}
          closeBtnRef={closeBtnRestoreRef}
        />
      ) : selectedObjects.size > 0 ? (
        <MDOSelectionPopup selected={selectedObjects} motionOk={motionOk} onClose={onClearSelection} />
      ) : null}
    </div>
  );
}

/** One domain's own object layer: the static transparent PNG, with a real
    AI-generated video loop composited on top for the three domains that
    have one (see OBJECT_VIDEO_SRC) — crossfaded in exactly like
    MDOSceneBackdrop's environment video, never claiming motion that isn't
    actually playing. The CSS idle bounce/rock (DOMAIN_IDLE_MOTION) only
    runs while the video ISN'T showing (not loaded yet, failed, off-screen,
    or reduced motion) — once the clip's own baked motion is visible, the
    two never stack. Selection (~4%) and hover (~2.5%) scale, and the idle
    y/rotate loop, all apply to the SAME wrapping element regardless of
    which of the two (image or video) is currently visible inside it, so
    the outline filter / hover glow / ground-contact pivot behave
    identically to before this had a video option at all. */
function DomainObjectLayer({
  d,
  isSelected,
  isHovered,
  isActive,
  motionOk,
  motionEnabled,
}: {
  d: DomainVisual;
  isSelected: boolean;
  isHovered: boolean;
  isActive: boolean;
  motionOk: boolean;
  motionEnabled: boolean;
}) {
  const videoSrc = OBJECT_VIDEO_SRC[d.id];
  const frame = OBJECT_VIDEO_FRAME[d.id];
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const showVideo = !!videoSrc && !!frame && motionEnabled && isActive && videoReady && !videoUnavailable;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoSrc) return;
    el.playbackRate = OBJECT_VIDEO_PLAYBACK_RATE;
    if (motionEnabled && isActive) el.play().catch(() => {});
    else el.pause();
  }, [motionEnabled, isActive, videoSrc]);

  useLumaKeyVideoCanvas(videoRef, canvasRef, frame, showVideo);

  const idle = DOMAIN_IDLE_MOTION[d.id];
  const idleOn = !!idle && motionEnabled && isActive && !isSelected && !showVideo;
  const idleTransition = idleOn
    ? { duration: idle!.duration, repeat: Infinity, repeatType: 'mirror' as const, ease: 'easeInOut' as const }
    : { duration: motionOk ? 0.3 : 0 };

  // Fixed backing resolution for the keying canvas — capped well below the
  // field-px box size (a few hundred px is plenty for a foreground vehicle
  // this size on screen) since getImageData/putImageData run every frame.
  const canvasW = Math.max(1, Math.min(360, Math.round(d.box.width)));
  const canvasH = Math.max(1, Math.round(canvasW * (d.box.height / d.box.width)));

  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{
        left: pct(d.box.x, FIELD_W),
        top: pct(d.box.y, FIELD_H),
        width: pct(d.box.width, FIELD_W),
        height: pct(d.box.height, FIELD_H),
        // Bottom-center pivot = this object's own ground/water contact
        // line (see domainPivot()) — scaling up never moves that point.
        transformOrigin: '50% 100%',
        filter: isSelected ? 'url(#mdoSelectionOutline)' : isHovered ? HOVER_GLOW : undefined,
      }}
      initial={false}
      animate={{
        opacity: isActive ? 1 : 0,
        // Selection (~4%) and hover (~2.5%) both scale the SAME element,
        // so they compose multiplicatively instead of one silently
        // overriding the other; the idle loop below never touches
        // `scale`, only `y`/`rotate`, so it can't collide with either.
        scale: (isSelected ? SELECTED_SCALE : 1) * (isHovered ? HOVER_SCALE : 1),
        y: idleOn ? idle!.y : 0,
        rotate: idleOn ? idle!.rotate : 0,
      }}
      transition={{
        opacity: { duration: motionOk ? 0.3 : 0 },
        scale: { duration: motionOk ? 0.2 : 0 },
        y: idleTransition,
        rotate: idleTransition,
      }}
    >
      <img
        src={d.src}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={cn('size-full transition-opacity duration-300', showVideo && 'opacity-0')}
      />
      {videoSrc && frame && (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- decorative object loop, no dialogue/audio track */}
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            className="absolute inset-0 size-full opacity-0"
            onLoadedMetadata={(e) => { e.currentTarget.playbackRate = OBJECT_VIDEO_PLAYBACK_RATE; }}
            onCanPlayThrough={() => setVideoReady(true)}
            onError={() => setVideoUnavailable(true)}
          />
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            aria-hidden="true"
            className={cn('absolute inset-0 size-full transition-opacity duration-300', showVideo ? 'opacity-100' : 'opacity-0')}
          />
        </>
      )}
    </motion.div>
  );
}

/** The static photo, with an optional looping environment video composited
    on top (waves/vegetation/clouds only — a locked camera, no zoom or
    lighting change, per the brief). Pauses off-screen (reusing the same
    IntersectionObserver `inView` the connection animations already gate
    on) or under reduced motion, where only the static photo ever renders.
    If SCENE_VIDEO_SRC doesn't exist on disk yet, onError silently falls
    back to the photo alone — this never claims a video plays when none was
    actually produced. No user-facing pause control (removed per request —
    this is decorative environment motion, not content).

    Loop strategy: the produced clip's own last frame doesn't match its
    first (the surf is mid-wave at a different phase), so the native `loop`
    attribute would visibly jump every cycle. Instead this plays forward
    natively, then on `ended` scrubs `currentTime` back down to 0 by hand
    (real elapsed time via rAF — `<video>` has no reliable cross-browser
    reverse playback), then resumes forward. A forward→backward "boomerang"
    always ends exactly where it started, so it reads as seamless
    regardless of the source clip's own loop point. */
function MDOSceneBackdrop({ inView, reduceMotion }: { inView: boolean; reduceMotion: boolean }) {
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const showVideo = !reduceMotion && !videoUnavailable && videoReady;

  const directionRef = useRef<1 | -1>(1);
  const rafIdRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  const stepReverse = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    const now = performance.now();
    const dt = (now - (lastTsRef.current ?? now)) / 1000;
    lastTsRef.current = now;
    const next = el.currentTime - dt;
    if (next <= 0.02) {
      el.currentTime = 0;
      directionRef.current = 1;
      lastTsRef.current = null;
      el.play().catch(() => {});
      return;
    }
    el.currentTime = next;
    rafIdRef.current = requestAnimationFrame(stepReverse);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!inView || reduceMotion) {
      el.pause();
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
      return;
    }
    if (directionRef.current === 1) {
      el.play().catch(() => {});
    } else {
      lastTsRef.current = null;
      rafIdRef.current = requestAnimationFrame(stepReverse);
    }
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    };
  }, [inView, reduceMotion, stepReverse]);

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
          style={{
            // The produced clip renders at 16:9; this scene's coordinate
            // system (FIELD_W×FIELD_H) and every domain object's hand-
            // measured position are calibrated to the reference photo's
            // native 3:2 framing. The clip's left edge (the sun flare)
            // lines up closely with the photo's own left edge, while the
            // extra width picked up when reflowing to 16:9 shows up as
            // regenerated terrain past the photo's own right edge — so the
            // crop is anchored physical-left (never a logical/RTL-mirrored
            // position — this photo is never mirrored, per the project's
            // own rule) instead of the default center crop, to keep the
            // video's ground/hillside registered with the object layers
            // rather than with the newly-invented terrain on the right.
            objectPosition: 'left center',
          }}
          src={SCENE_VIDEO_SRC}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          onEnded={() => {
            directionRef.current = -1;
            lastTsRef.current = null;
            rafIdRef.current = requestAnimationFrame(stepReverse);
          }}
          onCanPlayThrough={() => setVideoReady(true)}
          onError={() => setVideoUnavailable(true)}
        />
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

/** The same bottom-left popup slot as MDOEdgeCard, showing the 1–2 selected
    objects' own comparison text instead of an edge's. Never rendered at the
    same time as MDOEdgeCard — the caller picks one or the other. */
function MDOSelectionPopup({
  selected,
  motionOk,
  onClose,
}: {
  selected: Set<MdoDomainId>;
  motionOk: boolean;
  onClose: () => void;
}) {
  const { heading, lines } = useMemo(() => composeSelectionExplainer(selected), [selected]);
  const containerRef = useRef<HTMLDivElement>(null);
  const idsKey = MDO_DOMAIN_ORDER.filter((id) => selected.has(id)).join('-');
  useEffect(() => {
    containerRef.current?.focus({ preventScroll: true });
  }, [idsKey]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }

  return (
    <div
      ref={containerRef}
      id="mdo-selection-card"
      role="region"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      aria-label="השוואת ממדים נבחרים"
      style={{ insetInlineEnd: '1rem', insetBlockEnd: '1rem', width: 'min(320px, 44%)' }}
      className={cn(
        'absolute z-10 rounded-2xl border border-border bg-bg-elevated/95 p-4 shadow-elevated backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        flipTransition(motionOk),
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Keyed on the selected-domain identity (idsKey), not just a
            static block — so switching which object(s) are selected while
            the popup is already open visibly refreshes this heading
            instead of silently swapping text a user might not notice
            changed (spec: "תתעדכן כל פעם שמשתנה הבחירה"). */}
        <div className="min-w-0 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={idsKey}
              initial={motionOk ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={motionOk ? { opacity: 0, y: -6 } : undefined}
              transition={{ duration: motionOk ? 0.16 : 0 }}
            >
              <div className="font-display text-base font-bold leading-tight text-black">{heading}</div>
              <div className="text-xs font-medium text-fg-muted">השוואת ממדים</div>
            </motion.div>
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="ביטול הבחירה"
          className="shrink-0 rounded-full p-1 text-fg-dim transition-colors hover:bg-bg-accent hover:text-fg focus-visible:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Icon name="x" size={16} />
        </button>
      </div>
      <div className="mt-3 overflow-hidden text-sm leading-relaxed">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={idsKey}
            className="space-y-2"
            initial={motionOk ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={motionOk ? { opacity: 0, y: -6 } : undefined}
            transition={{ duration: motionOk ? 0.16 : 0 }}
          >
            {lines.map((line, i) => (
              <p key={i} className="text-fg-muted">{line}</p>
            ))}
          </motion.div>
        </AnimatePresence>
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
        <span className="block min-w-0 truncate font-display text-sm font-bold text-fg">{domain.label}</span>
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
  motionOk,
  onToggle,
}: {
  active: Set<MdoDomainId>;
  motionOk: boolean;
  onToggle: (id: MdoDomainId) => void;
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
      <MDOSummary active={active} />
    </div>
  );
}

/** The composed summary sentences — sitting below the toggle rows in the
    control column's own bounded, internally scrollable slot so the
    column's and image's shared total height never changes regardless of
    how long the composed text gets (spec: "הטור והתמונה נשארים באותו
    גובה"). Still the same bg-bg-accent/60 surface as the rest of the
    column — no border/shadow/radius of its own, so it never reads as a
    detached card. */
function MDOSummary({ active }: { active: Set<MdoDomainId> }) {
  const { lines } = useMemo(() => composeSummary(active), [active]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto border-t border-border-subtle pt-3">
      <div className="space-y-1.5 text-[11px] leading-relaxed text-fg-muted">
        {lines.map((line, i) => <p key={i}>{line}</p>)}
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
