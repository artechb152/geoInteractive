'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { CoordinateSystemsComparison } from './CoordinateSystemsComparison';
export function CoordinatesScene() {
const [shift, setShift] = useState(0);
return (
 <section id="scene-coordinates" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
 <SceneHeader
step="02.3"
eyebrow="קואורדינטות · נ״צ"
title={
          <>
          קואורדינטות: כיצד מציינים מיקום במפה ובשטח?
          </>
        }
        intro={`קואורדינטות הן ערכים מספריים המתארים מיקום במערכת ייחוס מוגדרת. בחלק זה נלמד לקרוא נקודת ציון, לזהות את המערכת שבה היא נכתבה ולסמן את המיקום המתאים במפה.`}
 />

 {/* Concept · two plain info columns (pattern 9: demoted so the
     first strong surface on the screen is the datum-shift workspace) */}
 <div className="grid md:grid-cols-2 gap-6 md:gap-10 mb-12">
 <div>
 <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance mb-2">
 נקודת ציון <span className="font-medium text-fg-muted text-base md:text-lg">(Grid Reference)</span>
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 נקודת ציון, או נ״צ, מתארת מיקום על גבי רשת המפה. ברשת שנלמד כאן קוראים <strong className="text-fg">ערך מזרח וערך צפון</strong>. כדי לפרש אותם נכון, יש לדעת באיזו מערכת ובאילו יחידות נכתבו.
 </p>
 </div>

 <div>
 <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance mb-2">
 מדוע חשוב לבדוק את הנ״צ?
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 שגיאה בספרה, בסדר הערכים או בזיהוי המערכת עלולה להצביע על מיקום אחר. <strong className="text-fg">גודל הסטייה תלוי בסוג הטעות ובמקום הספרה במספר.</strong> לכן בודקים את הערכים ואת הגדרות המערכת לפני השימוש.
 </p>
 </div>
 </div>

 {/* ITM / WGS84 — "אותה נקודה. שתי שפות." (one map, one fixed point,
     two readings; design/docs/2026-09-29-coordinates-opus-handoff.md) */}
 <CoordinateSystemsComparison />

 {/* Simulation */}
 <DatumShiftDemo shift={shift} setShift={setShift} />

 {/* Digit-by-digit anatomy + hands-on pinpoint drill */}
 <DigitAnatomy />
 <GridReferenceExercise />

 {/* Final Summary Component */}
 <CoordinateAnatomy />
 </section>
 );
}
// Slider geometry, same recipe as topic-06 PlanningScene's pacing slider: the
// native thumb's centre only travels between THUMB/2 and 100% − THUMB/2, so the
// ember fill and the tick marks are placed on that same inset scale.
const DATUM_THUMB_PX = 24;
const datumTrack = (fr: number) => `calc(${DATUM_THUMB_PX / 2}px + (100% - ${DATUM_THUMB_PX}px) * ${fr})`;
const DATUM_TICKS = [0, 50, 100] as const;

function DatumShiftDemo({ shift, setShift }: { shift: number; setShift: (n: number) => void }) {
  const dangerLevel = shift < 15 ? 'safe' : shift < 40 ? 'warn' : 'danger';
  const statusText = shift === 0 ? 'ללא סטייה' : dangerLevel === 'safe' ? 'סטייה קטנה בהדמיה' : dangerLevel === 'warn' ? 'סטייה בינונית בהדמיה' : 'סטייה גדולה בהדמיה';
  const consequenceText =
    shift < 15
      ? 'שתי הנקודות קרובות זו לזו. בערך אפס הן חופפות.'
      : shift < 40
        ? 'המרחק בין המיקום המבוקש למיקום המוצג גדל.'
        : shift < 70
          ? 'המיקום המוצג נמצא באזור אחר של המפה ביחס לנקודה המבוקשת.'
          : 'הסטייה בולטת בהדמיה וממחישה את החשיבות של בדיקת התאמה בין המערכות.';
  return (
    <div className="my-10">
      {/* Same block anatomy as DigitAnatomy below: T1 heading + intro on the
          page, then ONE workspace card holding readout insets + the map. */}
      <h3 className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-4 text-balance">
        הדמיה: סטייה בין המיקום המבוקש למיקום המוצג
      </h3>
      <p className="text-fg leading-relaxed text-pretty mb-8 max-w-3xl">
        <strong className="text-fg">אי־התאמה בין מערכות עלולה ליצור שגיאת מיקום.</strong> הזיזו את המחוון ובחנו כיצד גדל הפער בין הנקודות. זוהי המחשה סכמטית: ערכי הסטייה נבחרים לצורך ההדגמה ואינם תוצאה של המרה בין ITM ל־WGS84.
      </p>

      {/* Sidebar (right, DOM-first per this file's RTL convention) + map column
          (left), matching the reference's proportions (map:sidebar ≈ 2.47:1,
          pixel-measured off design/reference/lesson-02/lesson2part5image2.png).
          The map keeps a fixed aspect ratio matching ImpactMap's own SVG viewBox
          (100×56 → 25/14) instead of stretching to the sidebar's content height:
          ImpactMap's overlay SVG uses preserveAspectRatio="none" so its shapes
          (crosshair, deviation ring, impact marker) are only circular/undistorted
          when the box's rendered aspect ratio equals the viewBox's. The meter
          slider + its tick captions live inside this same map column (not
          spanning the whole card) so they're exactly as wide as the map above
          them, per this project's request. */}
      <div className="surface-elevated p-6 lg:p-8 grid lg:grid-cols-[1fr_2.4fr] gap-6 lg:gap-10 items-start">
        <div className="flex flex-col gap-5 min-w-0">
          {/* Readout inset — same recipe as DigitReadout. Severity is carried
              by the dot + the consequence tint only: the raw status hues
              (amber especially) are unreadable as text on the cream insets. */}
          <div className="rounded-xl bg-bg-accent/60 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-display font-semibold mb-2 text-fg-muted">
              <span
                className={cn(
                  'inline-block size-2 rounded-full shrink-0 transition-colors motion-reduce:transition-none',
                  dangerLevel === 'safe' && 'bg-status-ok',
                  dangerLevel === 'warn' && 'bg-status-warn',
                  dangerLevel === 'danger' && 'bg-status-danger',
                )}
                aria-hidden
              />
              {statusText}
            </div>
            <div className="font-display font-bold text-4xl sm:text-5xl tabular-nums text-fg">
              {shift}
              <span className="text-2xl text-fg-muted ms-2">מ׳ סטייה</span>
            </div>
          </div>

          <div
            className={cn(
              'rounded-xl p-4 sm:p-5 transition-colors motion-reduce:transition-none',
              dangerLevel === 'safe' && 'bg-status-ok/10',
              dangerLevel === 'warn' && 'bg-status-warn/10',
              dangerLevel === 'danger' && 'bg-status-danger/10',
            )}
          >
            <div className="text-sm font-display font-semibold text-fg-muted mb-2">משמעות הסטייה בהדמיה</div>
            <p className="text-lg font-bold leading-snug text-fg text-pretty">{consequenceText}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <div className="relative overflow-hidden rounded-xl aspect-[25/14]">
            <ImpactMap shift={shift} />
          </div>

          <div>
            <div className="relative h-8">
              <div aria-hidden className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-bg-accent ring-1 ring-inset ring-border" />
              <div
                aria-hidden
                className="absolute start-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-cta-ember"
                style={{ width: datumTrack(shift / 100) }}
              />
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={shift}
                onChange={(e) => setShift(Number(e.target.value))}
                aria-label="סטייה במטרים"
                aria-valuetext={`${shift} מ׳ — ${statusText}`}
                className={cn(
                  // the global *:focus-visible ring would box the whole input — the focus cue lives on the thumb instead
                  'absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent rounded-full focus-visible:ring-0 focus-visible:ring-offset-0',
                  '[&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent',
                  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:mt-1 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-bg-elevated [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:shadow-cta-ember',
                  '[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-bg-elevated [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-accent',
                  '[&:focus-visible::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(217,126,43,0.45)]',
                  '[&:focus-visible::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(217,126,43,0.45)]',
                )}
              />
            </div>
            <div aria-hidden className="relative h-1.5 mt-0.5">
              {DATUM_TICKS.map((v) => (
                <span
                  key={v}
                  className="absolute top-0 h-1.5 w-px bg-border-strong/70"
                  style={{ insetInlineStart: datumTrack(v / 100) }}
                />
              ))}
            </div>
            {/* 3 equal columns (not justify-between) so the middle caption is
                centred exactly under the 50 m tick regardless of the edge
                captions' differing widths. */}
            <div className="grid grid-cols-3 gap-2 mt-1 text-[13px] font-display font-medium text-fg-muted tabular-nums">
              {(['0 מ׳', '50 מ׳', '100 מ׳'] as const).map((label, i) => (
                <span
                  key={label}
                  className={cn(
                    'transition-colors motion-reduce:transition-none',
                    i === 0 ? 'text-start' : i === 1 ? 'text-center' : 'text-end',
                    shift >= DATUM_TICKS[i] && 'text-fg font-semibold',
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function ImpactMap({ shift }: { shift: number }) {
 // Offset logic for the SVG impact point
const offsetX = Math.min(38, shift * 0.38);
const offsetY = shift * 0.15;
const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
// Dashed "deviation zone" ring around the target — grows with the measured
// distance to the impact point but clamped so it never blows past the
// 100×56 viewBox (unclamped, shift=100's ~41 unit distance would push the
// ring off the top/bottom edges).
const ringRadius = Math.min(20, 4 + distance * 0.4);
// Label positions, expressed as % of the container (viewBox is 100×56,
// mapped 1:1 onto the container by preserveAspectRatio="none" below, so an
// x-unit already IS a %-of-width and a y-unit is %-of-56-of-height).
// Solid HTML chips instead of in-SVG <text> — same convention as this
// file's AnatomyZoomInset legend chip further down — so label legibility
// never depends on a stroke-halo hack over the busy terrain art, and the
// font size stays a real CSS px value instead of a viewBox-relative SVG
// unit that would shrink at the single-column mobile breakpoint.
const targetLeftPct = 50;
const targetTopPct = (44 / 56) * 100;
const impactLeftPct = 50 + offsetX;
const impactTopPct = ((26 - offsetY) / 56) * 100;
const midLeftPct = 50 + offsetX / 2;
const midTopPct = ((32 - offsetY / 2) / 56) * 100;
// The distance chip sits on the line's midpoint; below ~35 m that midpoint
// is still inside the crosshair, so the chip would cover the target it
// measures from. The sidebar readout carries the number until then.
const DISTANCE_CHIP_MIN = 35;
// Colors pixel-sampled from design/reference/lesson-02/lesson2part5image2.png
// (medians of solid-fill/darkest-ink regions, paper background excluded).
// Neither matches an existing token closely enough to reuse: accent.hot
// (#e2553a) and status.danger (#ef4444) are both brighter/more orange than
// the reference's muted brick-red / dark maroon.
const IMPACT_RED = '#a8342a';
const IMPACT_MAROON = '#7a1a12';
// Scale-bar tick positions, in the same 100×56 SVG-unit space as the rest
// of this overlay. Ticks are 0/50/100 — the same three checkpoints this
// exact component's slider caption row already establishes ("0 מ׳" /
// "50 מ׳ (טווח רסיסים)" / "100 מ׳ (החטאה מלאה)") — not new invented values,
// unlike the reference's own 0/50/100/200 (this demo's shift never exceeds
// 100) plus a UTM-style coordinate readout with no backing data here.
const SCALE_X0 = 6;
const SCALE_X50 = 20;
const SCALE_X100 = 34;
const SCALE_Y = 48;
return (
 <>
 {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
 <img
src={DATUM_MAP_SRC}
alt=""
aria-hidden
draggable={false}
className="absolute inset-0 size-full object-cover"
 />
 {/* North indicator — reference uses a bare solid triangle + "N", not a
     circular icon chip; matched here as a small fixed-px HTML glyph (not
     viewBox-relative, so it can't shrink at other breakpoints).
     Physical corner (not logical start/end): like the terrain art itself,
     a map orientation glyph must not move because the page is RTL — the
     reference places it at the map's left, so that's where it stays. */}
 <div className="absolute top-2 left-2 flex flex-col items-center text-fg/85" aria-hidden>
 <span className="text-[9px] font-display font-bold leading-none mb-0.5">N</span>
 <svg width="9" height="11" viewBox="0 0 10 12" fill="currentColor">
 <path d="M5 0 L10 12 L5 9 L0 12 Z" />
 </svg>
 </div>

 <svg viewBox="0 0 100 56" className="absolute inset-0 size-full" preserveAspectRatio="none" aria-hidden>
 <defs>
 {/* Hardcoded hex, not var(--fg): this file's pre-existing var(--accent-cool)
     gradient below had no matching CSS custom-property definition anywhere
     in the project (confirmed by repo-wide search) — an SVG presentation
     attribute referencing an undefined var() silently fails, so that stop
     never actually painted. Using the literal fg hex (#38432E, from
     tailwind.config.ts) avoids repeating that latent bug. */}
 <radialGradient id="targetGrad" cx="50%" cy="50%" r="50%">
 <stop offset="0%" stopColor="#38432E" stopOpacity="0.25" />
 <stop offset="100%" stopColor="#38432E" stopOpacity="0" />
 </radialGradient>
 <marker id="impactArrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse">
 <path d="M0,0 L10,5 L0,10 z" fill={IMPACT_RED} />
 </marker>
 </defs>

 {/* Map grid overlay — light quarter-division lines over the terrain art */}
 {[25, 50, 75].map((x) => (
 <line key={`v${x}`} x1={x} y1="0" x2={x} y2="56" className="stroke-fg/20" strokeWidth="0.15" />
 ))}
 {[14, 28, 42].map((y) => (
 <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} className="stroke-fg/20" strokeWidth="0.15" />
 ))}
 <rect x="0" y="0" width="100" height="56" fill="none" className="stroke-fg/25" strokeWidth="0.2" />

 {/* Deviation zone — dashed ring sized to the current shift */}
 <circle cx="50" cy="32" r={ringRadius} fill="none" className="stroke-fg/45" strokeWidth="0.3" strokeDasharray="1.3 1.1" />

 {/* Target Zone — crosshair marker (dark olive ink, matching the
     reference — not accent-cool blue, which read as a WGS84/GPS color
     cue that isn't actually in the reference art) */}
 <g>
 <circle cx="50" cy="32" r="7" fill="url(#targetGrad)" />
 <circle cx="50" cy="32" r="2.2" fill="none" className="stroke-fg" strokeWidth="0.55" />
 <line x1="46.6" y1="32" x2="53.4" y2="32" className="stroke-fg" strokeWidth="0.55" />
 <line x1="50" y1="28.6" x2="50" y2="35.4" className="stroke-fg" strokeWidth="0.55" />
 </g>

 {/* Impact Point */}
 <motion.g animate={{ x: offsetX, y: -offsetY }} transition={{ type: 'spring', stiffness: 50 }}>
 <circle cx="50" cy="32" r="1.2" fill={IMPACT_RED} />
 <circle cx="50" cy="32" r="5" fill="none" stroke={IMPACT_RED} strokeOpacity="0.4" strokeWidth="0.3">
 <animate attributeName="r" values="3;7;3" dur="1.5s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.5s" repeatCount="indefinite" />
 </circle>
 </motion.g>

 {/* Displacement line — brick-red to match the reference, with a small
     arrowhead at the impact end (also matching the reference) */}
 {shift > 4 && (
 <line
x1="50" y1="32"
x2={50 + offsetX} y2={32 - offsetY}
stroke={IMPACT_RED}
strokeOpacity="0.7"
strokeWidth="0.25"
strokeDasharray="0.6 0.6"
markerEnd="url(#impactArrow)"
 />
 )}

 {/* Scale bar — ticks at 0/50/100, reusing this component's own existing
     scale checkpoints (see const comment above), not new invented values */}
 <g className="stroke-fg" strokeWidth="0.4">
 <line x1={SCALE_X0} y1={SCALE_Y} x2={SCALE_X100} y2={SCALE_Y} />
 <line x1={SCALE_X0} y1={SCALE_Y - 1.4} x2={SCALE_X0} y2={SCALE_Y + 1.4} />
 <line x1={SCALE_X50} y1={SCALE_Y - 1.4} x2={SCALE_X50} y2={SCALE_Y + 1.4} />
 <line x1={SCALE_X100} y1={SCALE_Y - 1.4} x2={SCALE_X100} y2={SCALE_Y + 1.4} />
 </g>
 </svg>

 {/* Labels — solid HTML chips over the SVG, not in-SVG <text>: same
     legibility convention as this file's AnatomyZoomInset legend chip
     (fixed CSS px size, opaque backing) instead of a stroke-halo hack
     over the busy terrain art. */}
 <div
className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg-elevated/90 px-2.5 py-1 text-[13px] leading-tight font-display font-bold text-fg whitespace-nowrap shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
style={{ left: `${targetLeftPct}%`, top: `${targetTopPct}%` }}
 >
מיקום מבוקש
 </div>
 <motion.div
className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg-elevated/90 px-2.5 py-1 text-[13px] leading-tight font-display font-bold whitespace-nowrap shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
style={{ color: IMPACT_MAROON }}
animate={{ left: `${impactLeftPct}%`, top: `${impactTopPct}%` }}
transition={{ type: 'spring', stiffness: 50 }}
 >
מיקום מוצג
 </motion.div>
 {/* Always mounted (never conditionally rendered) so crossing the
     DISTANCE_CHIP_MIN threshold only fades opacity in/out — mounting it fresh at
     that moment made it pop in from wherever an unset left/top defaulted
     to (the container's top-right corner) instead of sliding smoothly
     from the displacement line's midpoint. */}
 <motion.div
className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg-elevated/90 px-2.5 py-1 text-[13px] leading-tight font-display font-bold whitespace-nowrap shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
style={{ color: IMPACT_MAROON }}
initial={{ opacity: 0, left: `${midLeftPct}%`, top: `${midTopPct}%` }}
animate={{ opacity: shift >= DISTANCE_CHIP_MIN ? 1 : 0, left: `${midLeftPct}%`, top: `${midTopPct}%` }}
transition={{ left: { type: 'spring', stiffness: 50 }, top: { type: 'spring', stiffness: 50 }, opacity: { duration: 0.2 } }}
 >
{shift} מ׳
 </motion.div>
 <div
className="absolute -translate-x-1/2 text-[13px] leading-tight font-display font-semibold text-fg/80 whitespace-nowrap"
style={{ left: `${SCALE_X0}%`, top: `${(SCALE_Y / 56) * 100 - 9}%` }}
 >
0
 </div>
 <div
className="absolute -translate-x-1/2 text-[13px] leading-tight font-display font-semibold text-fg/80 whitespace-nowrap"
style={{ left: `${SCALE_X50}%`, top: `${(SCALE_Y / 56) * 100 - 9}%` }}
 >
50
 </div>
 <div
className="absolute -translate-x-1/2 text-[13px] leading-tight font-display font-semibold text-fg/80 whitespace-nowrap"
style={{ left: `${SCALE_X100}%`, top: `${(SCALE_Y / 56) * 100 - 9}%` }}
 >
100
 </div>
 <div
className="absolute text-[13px] leading-tight font-display font-semibold text-fg/80 whitespace-nowrap"
style={{ left: `${SCALE_X100 + 3}%`, top: `${(SCALE_Y / 56) * 100}%`, transform: 'translateY(-50%)' }}
 >
מ׳
 </div>
 </>
 );
}
/* ─────────────────── DIGIT ANATOMY — WHAT EACH DIGIT MEANS ─────────────── */
/* Grid-square constants shared with the pinpoint drill below, so the
   worked example here and the interactive exercise refer to the same
   printed km-square (178 east / 666 north) — matching the corrected ITM
   example above (easting-first ordering). */
const GRID_EAST_KM = '178';
const GRID_NORTH_KM = '666';

/* Anatomy-only demo anchor, in metres. Every precision level (6/8/10
   digits) is derived from this ONE fixed point so the map, the digit
   callouts and the zoom always agree. Fictional area — no real-world tie. */
const ANATOMY_EAST_M = 178350;
const ANATOMY_NORTH_M = 666750;

type Precision = 6 | 8 | 10;
type DigitZone = 'km' | 'fine' | null;

type DigitSplit = { km: string; fine: string; full: string };

function splitDigits(totalMeters: number, precision: Precision): DigitSplit {
  const km = Math.floor(totalMeters / 1000);
  const remainder = totalMeters - km * 1000; // 0..999
  const kmStr = String(km);
  if (precision === 6) return { km: kmStr, fine: '', full: kmStr };
  const d1 = Math.floor(remainder / 100); // hundred-metres digit, 0-9
  if (precision === 8) return { km: kmStr, fine: String(d1), full: `${kmStr}${d1}` };
  const d2 = Math.floor((remainder - d1 * 100) / 10); // ten-metres digit, 0-9
  return { km: kmStr, fine: `${d1}${d2}`, full: `${kmStr}${d1}${d2}` };
}

// Fictional 6 km × 6 km demo tile shared by the map's SVG overlay and the
// zoom inset's background-image crop. 100 SVG units == 1 km, so the
// highlighted km-square always lands on a clean 100-unit cell. East
// increases rightward, north increases upward — never mirrored for RTL.
const MAP_EAST_MIN = 175;
const MAP_EAST_MAX = 181;
const MAP_NORTH_MIN = 663;
const MAP_NORTH_MAX = 669;
const MAP_VB = 600; // svg viewBox is 0 0 600 600
const WORLD_SPAN_KM = MAP_EAST_MAX - MAP_EAST_MIN; // 6

function eastToX(eastKm: number) {
  return (eastKm - MAP_EAST_MIN) * 100;
}
function northToY(northKm: number) {
  return MAP_VB - (northKm - MAP_NORTH_MIN) * 100;
}

const KM_EAST = Number(GRID_EAST_KM);
const KM_NORTH = Number(GRID_NORTH_KM);

const TERRAIN_MAP_SRC = '/reference-assets/coordinate-anatomy/terrain-map.png';

// Painterly topo backdrop for DatumShiftDemo's ImpactMap (reference:
// design/reference/lesson-02/lesson2part5image2.png). Purely decorative —
// the target/impact meaning is carried by the SVG overlay's own crosshair,
// marker and <text> labels, not by this raster layer.
const DATUM_MAP_SRC = '/assets/lessons/topic02/scene-coordinates/TOPIC02-COORDINATES-DATUM-MAP.webp';

// Helper: compute CSS background-position percentage to center a given image
// fraction point inside a container scaled by `scalePct / 100`.
function centeredBgPercent(frac: number, scale: number) {
  // Solve for the CSS background-position percentage P such that the
  // image point at fraction `frac` lands at the CENTER of the container —
  // NOT at container-fraction P (those only coincide when frac === 0.5).
  // scale = background-size expressed as a ratio (e.g. 6 for "600%").
  return ((0.5 - frac * scale) / (1 - scale)) * 100;
}

function DigitAnatomy() {
  const [precision, setPrecision] = useState<Precision>(8);
  const [activeZone, setActiveZone] = useState<DigitZone>(null);

  const east = splitDigits(ANATOMY_EAST_M, precision);
  const north = splitDigits(ANATOMY_NORTH_M, precision);

  return (
    <div className="my-10">
      <h3 className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-4 text-balance">
        מבנה הנ״צ: מזרח, צפון ומיקום בתוך המשבצת
      </h3>
      <p className="text-fg leading-relaxed text-pretty mb-8 max-w-3xl">
        ברשת המוצגת כאן קוראים <strong className="text-fg">מזרח תחילה, ולאחר מכן צפון</strong>. בכל ערך, שלוש הספרות הראשונות מזהות את קו הקילומטר שממנו מתחילים למדוד. הספרות הנוספות מציינות מיקום בתוך המשבצת. למדידה משתמשים ב<strong className="text-fg">מד קואורדינטות (מדקו)</strong>, סרגל שקוף המותאם לקנה המידה של המפה.
      </p>

      {/* Digit readouts (visual right) + map (visual left) — first DOM child
          lands at inline-start/right in this RTL page, matching this same
          file's DatumShiftDemo two-column pattern one section up. */}
      <div className="surface-elevated p-6 lg:p-8 grid lg:grid-cols-[1fr_1.5fr] gap-6 lg:gap-10 items-start">
        <div className="flex flex-col gap-5">
          <DigitReadout
            axisLabel="Easting · מזרח"
            digits={east}
            activeZone={activeZone}
            onZoneChange={setActiveZone}
          />
          <DigitReadout
            axisLabel="Northing · צפון"
            digits={north}
            activeZone={activeZone}
            onZoneChange={setActiveZone}
          />
          <div>
            <p className="text-sm text-fg-muted leading-relaxed">
              <strong className="text-fg">הוספת ספרה לכל ציר מקטינה את אורך צלע התא פי 10.</strong> בשיטת הכתיבה שבדוגמה, 6 ספרות (מזרח {GRID_EAST_KM}, צפון {GRID_NORTH_KM}) מציינות תא של קילומטר; 8 ספרות מציינות תא של 100 מטר; ו־10 ספרות מציינות תא של 10 מטר. <strong className="text-fg">יותר ספרות אינן מבטיחות מדידה מדויקת יותר.</strong> הדיוק תלוי גם במפה, במכשיר ובאופן המדידה.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <PrecisionSelector precision={precision} onChange={setPrecision} />
          <AnatomyMap precision={precision} activeZone={activeZone} east={east} north={north} />
        </div>
      </div>
    </div>
  );
}

function DigitZoneButton({
  children,
  label,
  active,
  disabled,
  onActivate,
  onDeactivate,
  className,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={disabled ? undefined : onActivate}
      onMouseLeave={disabled ? undefined : onDeactivate}
      onFocus={disabled ? undefined : onActivate}
      onBlur={disabled ? undefined : onDeactivate}
      onClick={disabled ? undefined : onActivate}
      aria-pressed={disabled ? undefined : active}
      aria-label={label}
      className={cn(
        'rounded-lg px-1 -mx-1 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg-elevated',
        disabled ? 'opacity-35 cursor-default' : 'cursor-pointer',
        active && !disabled && 'bg-accent/10',
        className,
      )}
    >
      {children}
    </button>
  );
}

function DigitReadout({
  axisLabel,
  digits,
  activeZone,
  onZoneChange,
}: {
  axisLabel: string;
  digits: DigitSplit;
  activeZone: DigitZone;
  onZoneChange: (zone: DigitZone) => void;
}) {
  const hasFine = digits.fine.length > 0;
  return (
    <div className="rounded-xl bg-bg-accent/60 p-4 sm:p-5">
      <div className="text-sm font-display font-semibold mb-2 text-fg-muted">{axisLabel}</div>
      <bdi dir="ltr" className="flex items-baseline gap-1 font-display font-bold text-4xl sm:text-5xl tabular-nums mb-3">
        <DigitZoneButton
          label={`שלוש הספרות הראשונות של ${axisLabel}: ${digits.km} — ערך קו הקילומטר שממנו מודדים`}
          active={activeZone === 'km'}
          onActivate={() => onZoneChange('km')}
          onDeactivate={() => onZoneChange(null)}
          className="text-fg"
        >
          {digits.km}
        </DigitZoneButton>
        <DigitZoneButton
          label={
            hasFine
              ? `הספרות הנוספות של ${axisLabel}: ${digits.fine} — מיקום בתוך המשבצת, נמדד במד הקואורדינטות`
              : `בנ״צ של 6 ספרות אין ספרות לציון מיקום בתוך המשבצת`
          }
          active={activeZone === 'fine'}
          disabled={!hasFine}
          onActivate={() => onZoneChange('fine')}
          onDeactivate={() => onZoneChange(null)}
          className="text-accent"
        >
          {hasFine ? digits.fine : '–'}
        </DigitZoneButton>
      </bdi>
      <div className="flex flex-col gap-1 text-sm text-fg-muted leading-snug">
        <span className={cn('flex items-center gap-1.5 transition-colors motion-reduce:transition-none', activeZone === 'km' && 'text-fg font-semibold')}>
          <span className="inline-block size-1.5 rounded-full shrink-0 bg-fg" aria-hidden />
          ערך קו הקילומטר — מודפס על המפה
        </span>
        <span
          className={cn(
            'flex items-center gap-1.5 transition-colors motion-reduce:transition-none',
            !hasFine && 'opacity-40',
            activeZone === 'fine' && hasFine && 'text-accent font-semibold',
          )}
        >
          <span className="inline-block size-1.5 rounded-full shrink-0 bg-accent" aria-hidden />
          מיקום בתוך המשבצת — נמדד במדקו
        </span>
      </div>
    </div>
  );
}

function AnatomyMap({
  precision,
  activeZone,
  east,
  north,
}: {
  precision: Precision;
  activeZone: DigitZone;
  east: DigitSplit;
  north: DigitSplit;
}) {
  const kmX = eastToX(KM_EAST);
  const kmY = northToY(KM_NORTH + 1); // top edge (higher northing = smaller y)
  const KM_SIZE = 100;

  const showHundredCell = precision === 8 || precision === 10;
  const fineD1e = showHundredCell ? Number(east.fine[0]) : undefined;
  const fineD1n = showHundredCell ? Number(north.fine[0]) : undefined;
  const fineX = fineD1e !== undefined ? kmX + fineD1e * 10 : undefined;
  const fineY = fineD1n !== undefined ? kmY + (9 - fineD1n) * 10 : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square rounded-xl overflow-hidden">
        {/* Raster layer, faded into the page canvas via a graduated CSS
            mask — the pixels themselves are never degraded, so the exact
            same file can be reused unscaled for the zoom inset below. */}
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_82%_82%_at_50%_50%,black_62%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_82%_82%_at_50%_50%,black_62%,transparent_100%)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export; reused pixel-identical for the zoom inset */}
          <img
            src={TERRAIN_MAP_SRC}
            alt="מפת שטח דמיונית להדגמה, ללא שיוך למיקום אמיתי"
            draggable={false}
            className="size-full object-cover"
          />
        </div>

        <svg
          viewBox={`0 0 ${MAP_VB} ${MAP_VB}`}
          className="absolute inset-0 size-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          {Array.from({ length: WORLD_SPAN_KM + 1 }).map((_, i) => {
            const eastKm = MAP_EAST_MIN + i;
            const northKm = MAP_NORTH_MIN + i;
            return (
              <g key={i}>
                <line x1={i * 100} y1="0" x2={i * 100} y2={MAP_VB} className="stroke-fg/20" strokeWidth="1" />
                <line x1="0" y1={MAP_VB - i * 100} x2={MAP_VB} y2={MAP_VB - i * 100} className="stroke-fg/20" strokeWidth="1" />
                {/* direction="ltr" is required here, not just textAnchor: under
                    the page's RTL context, text-anchor="start" alone anchors to
                    the visual RIGHT and grows leftward, which silently pushed
                    every one of these numerals off-frame (worst at the two grid
                    edges — the westmost/topmost label fully invisible, the
                    eastmost clipped mid-digit). The last column/row also gets a
                    boundary flip (anchor="end" / label-below-line) since it sits
                    exactly on the viewBox edge and would otherwise overflow the
                    container the other way once corrected to LTR. */}
                <text
                  x={i === WORLD_SPAN_KM ? i * 100 - 4 : i * 100 + 4}
                  y={MAP_VB - 4}
                  fontSize="11"
                  textAnchor={i === WORLD_SPAN_KM ? 'end' : 'start'}
                  direction="ltr"
                  className="fill-fg/50 font-display font-semibold"
                >
                  {eastKm}
                </text>
                {/* i === 0's default "-6 above the line" position lands in the
                    exact same bottom-corner band as every east-axis label
                    (which all share y={MAP_VB - 4}) — pushed further up here
                    so the two axes' numerals don't overlap at the origin.
                    i === WORLD_SPAN_KM (top edge) sits on the viewBox's top
                    boundary, so it is placed BELOW its line instead (+30) to
                    keep the numeral in-frame at the top edge. */}
                <text
                  x="4"
                  y={
                    i === WORLD_SPAN_KM
                      ? MAP_VB - i * 100 + 30
                      : i === 0
                        ? MAP_VB - 22
                        : MAP_VB - i * 100 - 6
                  }
                  fontSize="11"
                  textAnchor="start"
                  direction="ltr"
                  className="fill-fg/50 font-display font-semibold"
                >
                  {northKm}
                </text>
              </g>
            );
          })}

          <rect
            x={kmX}
            y={kmY}
            width={KM_SIZE}
            height={KM_SIZE}
            fill="none"
            className={cn('transition-all motion-reduce:transition-none', activeZone === 'km' ? 'stroke-fg' : 'stroke-fg/70')}
            strokeWidth={activeZone === 'km' ? 4 : 2.5}
          />

          {fineX !== undefined && fineY !== undefined && (
            <rect
              x={fineX}
              y={fineY}
              width={10}
              height={10}
              className={cn(
                'transition-all motion-reduce:transition-none',
                activeZone === 'fine' ? 'fill-accent/40 stroke-accent' : 'fill-accent/20 stroke-accent/70',
              )}
              strokeWidth={activeZone === 'fine' ? 2.5 : 1.5}
            />
          )}
        </svg>

        <AnatomyZoomInset layout="overlay" precision={precision} activeZone={activeZone} east={east} north={north} />
      </div>

      <AnatomyZoomInset layout="stacked" precision={precision} activeZone={activeZone} east={east} north={north} />
    </div>
  );
}

function AnatomyZoomInset({
  layout,
  precision,
  activeZone,
  east,
  north,
}: {
  layout: 'overlay' | 'stacked';
  precision: Precision;
  activeZone: DigitZone;
  east: DigitSplit;
  north: DigitSplit;
}) {
  const showHundredCell = precision === 8 || precision === 10;
  const showTenCell = precision === 10;

  // Crop window, in km: the whole km-square while showing the 100 m cell;
  // the 100 m cell itself once the 10 m subdivision needs to be legible.
  const cropKm = showTenCell ? 0.1 : 1;
  const scalePct = (WORLD_SPAN_KM / cropKm) * 100;

  // Centre of the cell this crop actually frames — the whole km square
  // (centre 178.5 / 666.5) at 6/8 digits, or the 100 m cell around the
  // fixed anchor (which is that cell's own centre by construction) at 10
  // digits. Centring on the fixed anchor at every precision would show the
  // wrong patch of terrain once the crop widens back out to the km square.
  const centerKmE = showTenCell ? ANATOMY_EAST_M / 1000 : KM_EAST + 0.5;
  const centerKmN = showTenCell ? ANATOMY_NORTH_M / 1000 : KM_NORTH + 0.5;
  const cropFracX = (centerKmE - MAP_EAST_MIN) / WORLD_SPAN_KM;
  const cropFracY = 1 - (centerKmN - MAP_NORTH_MIN) / WORLD_SPAN_KM;

  const d1e = showHundredCell ? Number(east.fine[0]) : 0;
  const d1n = showHundredCell ? Number(north.fine[0]) : 0;
  const d2e = showTenCell ? Number(east.fine[1]) : 0;
  const d2n = showTenCell ? Number(north.fine[1]) : 0;

  // The inset's own local grid is always 0..100, representing whichever
  // physical cell is currently framed (the 1 km square, or — at 10
  // digits — the 100 m cell within it).
  const cellX = showTenCell ? d2e * 10 : d1e * 10;
  const cellY = showTenCell ? (9 - d2n) * 10 : (9 - d1n) * 10;
  const showCell = showHundredCell;

  return (
    <div
      className={cn(
        'relative aspect-square rounded-[4px] overflow-hidden',
        layout === 'overlay'
          ? /* Physical placement (top/right, not logical start/end) — this
               diagram-internal anchor must not flip under RTL, exactly like
               this same file's GridSquare overlay a few hundred lines down.
               Width capped at 30% (not a rounder 38%) so this box's x-range
               (70–100%) never overlaps the highlighted km-square's own
               fixed x-range (50–66.7%) regardless of precision — the square
               is always drawn at KM_EAST/KM_NORTH's position on the map. */
            'hidden lg:block lg:absolute lg:top-3 lg:right-3 lg:w-[30%]'
          : 'lg:hidden w-full max-w-[200px] mx-auto',
      )}
    >
      <div
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: `url(${TERRAIN_MAP_SRC})`,
          backgroundSize: `${scalePct}% ${scalePct}%`,
          backgroundPosition: `${centeredBgPercent(cropFracX, scalePct / 100)}% ${centeredBgPercent(cropFracY, scalePct / 100)}%`,
        }}
        role="img"
        aria-label={showTenCell ? 'תקריב על תא של 10 מטר בתוך משבצת של 100 מטר באותה מפה' : 'תקריב על משבצת הקילומטר באותה מפה'}
      />

      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" preserveAspectRatio="none" aria-hidden>
        {Array.from({ length: 9 }).map((_, i) => (
          <g key={i}>
            <line x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2="100" className="stroke-fg/25" strokeWidth="0.6" />
            <line x1="0" y1={(i + 1) * 10} x2="100" y2={(i + 1) * 10} className="stroke-fg/25" strokeWidth="0.6" />
          </g>
        ))}
        <rect x="0" y="0" width="100" height="100" fill="none" className="stroke-fg/70" strokeWidth="1.2" />

        {showCell && (
          <g transform={`translate(${cellX} ${cellY})`}>
            <rect
              width="10"
              height="10"
              className={cn(
                'transition-all motion-reduce:transition-none',
                activeZone === 'fine' ? 'fill-accent/35 stroke-accent' : 'fill-accent/15 stroke-accent/70',
              )}
              strokeWidth={activeZone === 'fine' ? 1.4 : 0.9}
            />
            {/* Center marker — a visual anchor only, not a claim of finer accuracy. */}
            <circle cx="5" cy="5" r="1.1" className="fill-accent" />
          </g>
        )}
      </svg>

      <div className="absolute bottom-1.5 right-1.5 rounded-full bg-bg-elevated/85 px-2 py-0.5 text-[13px] leading-tight font-display font-semibold text-fg-muted">
        {showTenCell ? '100 מ׳' : '1 ק״מ'}
      </div>
    </div>
  );
}

const PRECISION_OPTIONS: { value: Precision; label: string; meters: string }[] = [
  { value: 6, label: '6 ספרות', meters: 'תא של 1 ק״מ בכל ציר' },
  { value: 8, label: '8 ספרות', meters: 'תא של 100 מ׳ בכל ציר' },
  { value: 10, label: '10 ספרות', meters: 'תא של 10 מ׳ בכל ציר' },
];

function PrecisionGlyph({ level }: { level: Precision }) {
  const tone = 'stroke-fg-muted';
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="shrink-0" aria-hidden>
      <rect x="2" y="2" width="24" height="24" className={tone} strokeWidth="1.5" />
      {level !== 6 && <rect x="7" y="7" width="14" height="14" className={tone} strokeWidth="1.5" />}
      {level === 10 && <rect x="11" y="11" width="6" height="6" className={tone} strokeWidth="1.5" />}
      <circle cx="14" cy="14" r="1.4" className="fill-fg-muted" />
    </svg>
  );
}

function PrecisionSelector({ precision, onChange }: { precision: Precision; onChange: (p: Precision) => void }) {
  return (
    <div>
      <div className="text-sm font-display font-semibold text-fg mb-4">בחרו מספר ספרות ובחנו כיצד גודל התא משתנה</div>
      <div role="group" aria-label="מספר הספרות בנ״צ" className="grid grid-cols-3 gap-2">
        {PRECISION_OPTIONS.map((opt) => (
          <div key={opt.value} className="flex">
            <button
              type="button"
              aria-pressed={precision === opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-start cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                precision === opt.value ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
              )}
            >
              <PrecisionGlyph level={opt.value} />
              <span>
                <span className="block text-sm font-display font-bold text-fg">
                  {opt.label}
                </span>
                <span className="block text-[13px] text-fg-muted">{opt.meters}</span>
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── PINPOINT DRILL — "דקירת נ&quot;צ" ──────────────────── */
/* Scaffolding + fading (per interactions-and-practice.md): a narrated
   worked example first (Walkthrough), then independent practice with
   near-transfer variants (Practice) — each click computes the grid
   reference of the cell the learner picked and checks it against the
   target, satisfying the "click a point, get a correctness check of the
   computed נ"צ" requirement. Both share one 10×10 GridSquare so a cell's
   (eDigit, nDigit) IS its own reference — no pointer-position math needed. */

type GridTarget = { eDigit: number; nDigit: number };

const DEMO_TARGET: GridTarget = { eDigit: 4, nDigit: 7 };

const PRACTICE_TARGETS: GridTarget[] = [
  { eDigit: 2, nDigit: 8 },
  { eDigit: 7, nDigit: 3 },
  { eDigit: 5, nDigit: 5 },
];

function refOf(t: GridTarget) {
  return `מזרח ${GRID_EAST_KM}${t.eDigit}, צפון ${GRID_NORTH_KM}${t.nDigit}`;
}

/* Reference-art grid card (design/reference/lesson-02/lesson2part5image4.png,
   source art "ChatGPT Image Sep 14, 2026, 02_55_34 PM.png"): the 10×10 frame,
   ruler ticks, corner brackets and 0–9 axis digits are baked into the art
   itself (chroma-keyed to real alpha + trimmed — see design/docs/assumptions.md).
   GRID_INSET is measured directly off that art's own printed orange frame
   (pixel-scanned + visually verified with an overlay-gridline render on the
   1206×1171 trimmed asset: left 365px/1206, right 1132px/1206, top
   223px/1171, bottom 999px/1171) so the dynamic overlay below lines up
   exactly with the printed grid lines. NOTE: an earlier pass mis-measured
   "left" by scanning a row that crossed the art's own decorative dashed
   orange route line in the background instead of the grid's real border —
   re-measured using only y-rows confirmed clear of that line. */
const GRID_CARD_SRC = '/assets/lessons/topic02/scene-coordinates/TOPIC02-COORDINATES-GRID-CARD.webp';
/* Expressed as left/top/width/height (not left/right/top/bottom) on purpose:
   <svg> is a CSS replaced element with an intrinsic ratio from its own
   viewBox (1:1 here). With all four inset sides set and width/height left
   auto, browsers derive the used width from left+right but then re-derive
   height from THAT width via the intrinsic ratio — silently overriding
   top/bottom and forcing the box back to square. Giving explicit
   width/height sidesteps that algorithm (it only triggers when both are
   auto), so the box matches the plain-<div> overlay exactly. */
const GRID_INSET = { left: '30.3%', top: '19.0%', width: 'calc(100% - 36.4%)', height: 'calc(100% - 33.7%)' } as const;

function GridSquare({
  interactive,
  onCellClick,
  highlightCol,
  highlightRow,
  target,
  guess,
}: {
  interactive: boolean;
  onCellClick?: (eDigit: number, nDigit: number) => void;
  highlightCol?: number;
  highlightRow?: number;
  target?: GridTarget;
  guess?: GridTarget & { correct: boolean };
}) {
  return (
    <div className="w-full max-w-[360px] mx-auto">
      <div className="flex items-center justify-between px-1 mb-1.5 text-[13px] font-display font-semibold text-fg-muted">
        <span>צפון (Northing) {GRID_NORTH_KM}–{Number(GRID_NORTH_KM) + 1}</span>
      </div>
      <div className="relative" style={{ aspectRatio: '1206 / 1171' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized */}
        <img
          src={GRID_CARD_SRC}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute inset-0 size-full pointer-events-none select-none"
        />
        {/* dynamic layer only (highlights + markers) — the frame/ticks/digits
            live in the art. Positioned in physical (non-logical) px/%
            because it must line up exactly with the printed grid inside the
            art — a diagram-alignment concern, not RTL text flow. */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute" style={GRID_INSET} aria-hidden>
          {highlightCol !== undefined && (
            <rect x={highlightCol * 10} y="0" width="10" height="100" className="fill-accent/15" />
          )}
          {highlightRow !== undefined && (
            <rect x="0" y={90 - highlightRow * 10} width="100" height="10" className="fill-accent-cool/15" />
          )}
          {target && (
            <g transform={`translate(${target.eDigit * 10 + 5} ${95 - target.nDigit * 10})`}>
              <circle r="3.2" fill="none" className="stroke-status-ok" strokeWidth="0.6" strokeDasharray="1.2 1" />
              <circle r="0.9" className="fill-status-ok" />
            </g>
          )}
          {guess && (
            <g transform={`translate(${guess.eDigit * 10 + 5} ${95 - guess.nDigit * 10})`}>
              <circle r="2.6" className={guess.correct ? 'fill-status-ok/70' : 'fill-status-danger/70'} />
            </g>
          )}
        </svg>
        {/* 10×10 clickable/focusable overlay — cell (col,row) IS (eDigit,nDigit).
            dir="ltr" pins CSS Grid's column order to true left→right so cell
            (eDigit=0) sits under the art's own printed "0" on the visual
            LEFT, matching the baked easting ticks — under the page's dir=rtl
            a plain grid-cols-10 reverses column order (right→left), which
            would silently register clicks against the mirrored digit. */}
        <div dir="ltr" className="absolute grid grid-cols-10 grid-rows-10" style={GRID_INSET}>
          {Array.from({ length: 10 }).flatMap((_, row) =>
            Array.from({ length: 10 }).map((_, col) => {
              const eDigit = col;
              const nDigit = 9 - row;
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  disabled={!interactive}
                  aria-label={`משבצת ${GRID_EAST_KM}${eDigit} / ${GRID_NORTH_KM}${nDigit}`}
                  onClick={() => onCellClick?.(eDigit, nDigit)}
                  className={cn(
                    'focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
                    interactive && 'hover:bg-accent/8 cursor-pointer',
                  )}
                />
              );
            }),
          )}
        </div>
      </div>
      <div className="flex items-center justify-between px-1 mt-1.5 text-[13px] font-display font-semibold text-fg-muted">
        <span>מזרח (Easting) {GRID_EAST_KM}–{Number(GRID_EAST_KM) + 1}</span>
      </div>
    </div>
  );
}

const WALKTHROUGH_STEPS: { title: string; body: string; highlightCol?: number; highlightRow?: number; showTarget?: boolean }[] = [
  {
    title: '1 · זיהוי משבצת הקילומטר',
    body: `זהו את הקווים התוחמים את המשבצת ממערב ומדרום: מזרח ${GRID_EAST_KM}, צפון ${GRID_NORTH_KM}. ערכים אלה הם שלוש הספרות הראשונות בכל ציר בדוגמה.`,
  },
  {
    title: '2 · קריאת ערך המזרח',
    body: 'קראו במד הקואורדינטות כמה עשיריות משבצת מפרידות בין הקו השמאלי לנקודה. מספר העשיריות השלמות הוא הספרה הרביעית בערך המזרח.',
    highlightCol: DEMO_TARGET.eDigit,
  },
  {
    title: '3 · קריאת ערך הצפון',
    body: 'קראו כמה עשיריות משבצת מפרידות בין הקו התחתון לנקודה. מספר העשיריות השלמות הוא הספרה הרביעית בערך הצפון.',
    highlightRow: DEMO_TARGET.nDigit,
  },
  {
    title: '4 · כתיבת הנ״צ',
    body: `כתבו תחילה מזרח ${GRID_EAST_KM}${DEMO_TARGET.eDigit}, ולאחר מכן צפון ${GRID_NORTH_KM}${DEMO_TARGET.nDigit}. בשיטת הכתיבה שבדוגמה, שמונה הספרות מזהות את התא שבו נמצאת הנקודה: 100 מטר בכל ציר.`,
    highlightCol: DEMO_TARGET.eDigit,
    highlightRow: DEMO_TARGET.nDigit,
    showTarget: true,
  },
];

function useWalkthrough() {
  const [step, setStep] = useState(0);
  const s = WALKTHROUGH_STEPS[step];
  const last = step === WALKTHROUGH_STEPS.length - 1;

  const grid = (
    <GridSquare
      interactive={false}
      highlightCol={s.highlightCol}
      highlightRow={s.highlightRow}
      target={s.showTarget ? DEMO_TARGET : undefined}
    />
  );

  const text = (
    <>
      <div className="mb-2 flex items-baseline gap-2">
        <div className="font-display text-sm font-bold tabular-nums text-fg">
          {String(step + 1).padStart(2, '0')}
        </div>
        <div className="text-sm font-display font-semibold text-fg-muted">הדגמה מונחית</div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          <h4 className="font-display text-lg font-bold leading-snug text-fg md:text-xl mb-2">{s.title}</h4>
          <p className="text-base text-fg-muted leading-relaxed mb-5">{s.body}</p>
        </motion.div>
      </AnimatePresence>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((v) => Math.max(0, v - 1))}
          className="btn-secondary text-sm px-4 py-2 disabled:opacity-40"
        >
          הקודם
        </button>
        {!last && (
          <button
            type="button"
            onClick={() => setStep((v) => Math.min(WALKTHROUGH_STEPS.length - 1, v + 1))}
            className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5"
          >
            הבא
            <Icon name="arrow-left" size={16} />
          </button>
        )}
      </div>
    </>
  );

  return { grid, text };
}

function usePractice() {
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState<(GridTarget & { correct: boolean }) | null>(null);
  const [solvedCount, setSolvedCount] = useState(0);

  const target = PRACTICE_TARGETS[index];
  const done = index >= PRACTICE_TARGETS.length;

  const handleClick = (eDigit: number, nDigit: number) => {
    const correct = eDigit === target?.eDigit && nDigit === target?.nDigit;
    setAttempt({ eDigit, nDigit, correct });
    if (correct) setSolvedCount((c) => c + 1);
  };

  const next = () => {
    setAttempt(null);
    setIndex((i) => i + 1);
  };

  const reset = () => {
    setAttempt(null);
    setIndex(0);
    setSolvedCount(0);
  };

  if (done) {
    return {
      done: true as const,
      grid: null,
      text: (
        <div className="text-center py-8">
          <div className="text-4xl font-display font-bold text-fg tabular-nums mb-2">
            {solvedCount}/{PRACTICE_TARGETS.length}
          </div>
          <p className="text-fg-muted text-sm mb-4">זיהיתם את המשבצות הנכונות בכל {PRACTICE_TARGETS.length} התרגילים.</p>
          <button type="button" onClick={reset} className="btn-secondary text-sm px-4 py-2">
            תרגלו שוב
          </button>
        </div>
      ),
    };
  }

  const grid = (
    <GridSquare
      interactive={!attempt}
      onCellClick={handleClick}
      target={attempt && !attempt.correct ? target : undefined}
      guess={attempt ?? undefined}
    />
  );

  const text = (
    <>
      <div className="mb-2 flex items-baseline gap-2">
        <div className="font-display text-sm font-bold tabular-nums text-fg">
          {String(index + 1).padStart(2, '0')}
        </div>
        <div className="text-sm font-display font-semibold text-fg-muted">
          תרגול עצמאי — תרגיל {index + 1} מתוך {PRACTICE_TARGETS.length}
        </div>
      </div>
      <p className="text-base text-fg leading-relaxed mb-4">
        סמנו את המשבצת המתאימה לנ״צ: <strong className="text-fg tabular-nums">{refOf(target)}</strong>
      </p>
      <AnimatePresence mode="wait">
        {attempt && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'rounded-xl p-4 text-sm leading-relaxed mb-4',
              attempt.correct
                ? 'bg-status-ok/10 text-status-ok'
                : 'bg-status-danger/10 text-status-danger',
            )}
          >
            {attempt.correct
              ? `נכון. המשבצת שסימנתם תואמת לנ״צ ${refOf(attempt)}.`
              : `סימנתם ${refOf(attempt)}. הנ״צ המבוקש הוא ${refOf(target)}, ומיקומו מסומן בעיגול מקווקו. בדקו תחילה את ערך המזרח ולאחר מכן את ערך הצפון, ונסו שוב.`}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex gap-2">
        {attempt && !attempt.correct && (
          <button type="button" onClick={() => setAttempt(null)} className="btn-secondary text-sm px-4 py-2">
            נסו שוב
          </button>
        )}
        {attempt?.correct && (
          <button type="button" onClick={next} className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5">
            התרגיל הבא
            <Icon name="arrow-left" size={16} />
          </button>
        )}
      </div>
    </>
  );

  return { done: false as const, grid, text };
}

function GridReferenceExercise() {
  const [mode, setMode] = useState<'demo' | 'practice'>('demo');
  const demo = useWalkthrough();
  const practice = usePractice();
  const active = mode === 'demo' ? demo : practice;
  const collapsed = mode === 'practice' && practice.done;

  return (
    <div className="surface-elevated p-6 lg:p-8 my-10">
      <div className="grid md:grid-cols-[1fr_1.15fr] gap-8 md:gap-10 items-start">
        {/* right column (inline-start) — static header + per-mode text, DOM-first per this codebase's RTL convention */}
        <div>
          <h3 className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl text-balance">תרגיל: דקירת נ&quot;צ</h3>
          <p className="mt-2 text-base leading-relaxed text-fg-muted mb-6 max-w-md">דקירת נ״צ היא סימון מיקום במפה לפי הקואורדינטות שלו. עברו על ההדגמה, ולאחר מכן סמנו בתרגול את המשבצת המתאימה לכל נ״צ וקבלו משוב.</p>

          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setMode('demo')}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-display font-semibold text-fg border cursor-pointer transition-colors duration-200 ease-snap',
                mode === 'demo' ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
              )}
            >
              1. הדגמה
            </button>
            <button
              type="button"
              onClick={() => setMode('practice')}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-display font-semibold text-fg border cursor-pointer transition-colors duration-200 ease-snap',
                mode === 'practice' ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
              )}
            >
              2. תרגול עצמאי
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={mode + (collapsed ? '-done' : '')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {active.text}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* left column (inline-end) — the grid card; empty once practice is done */}
        {!collapsed && (
          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {active.grid}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function CoordinateAnatomy() {
return (
 <div className="surface p-5 sm:p-6">
 <div>
 <div className="font-display text-lg font-bold leading-snug text-fg md:text-xl mb-2">
 סיכום: קריאה והעברה של נקודת ציון
 </div>
 <p className="text-base text-fg leading-relaxed max-w-3xl">
 ברשת שהוצגה כאן קוראים תחילה את ערך ה<strong className="text-fg">מזרח (E)</strong>, ולאחר מכן את ערך ה<strong className="text-fg">צפון (N)</strong>.
 <br/>
 מספר הספרות קובע את גודל התא המתואר; דיוק המדידה תלוי במקורות המידע ובאופן הקריאה.
 <br/><br/>
 <span className="font-semibold text-fg">לפני העברת נ״צ:</span> בדקו את הספרות, את סדר הערכים ואת יחידות המידה.
 <strong className="text-fg"> ציינו גם את מערכת הקואורדינטות, כדי שהנמען יוכל לפרש את המיקום נכון.</strong>
 </p>
 </div>
 </div>
 );
}
