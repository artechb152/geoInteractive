'use client';
/**
 * ARCHIVED SNAPSHOT — the topography scene as it was before the 2026-09-28
 * "one terrain, three representations" redesign
 * (docs/superpowers/specs/2026-09-28-topography-scene-redesign-design.md).
 * Frozen for side-by-side visual comparison at /archive/topic-02/topography-v1/.
 * Do not edit; the live scene is TopographyScene.tsx.
 */
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
import { cn } from '@/lib/utils';
type View = '3d' | 'photo' | 'topo';
const VIEWS: { id: View; label: string; icon: IconName; pros: string[]; cons: string[]; whatItIs: string; whyItMatters: string }[] = [
 {
id: '3d',
label: 'מודל תלת־ממדי',
icon: 'mountain',
whatItIs: 'העתק מדויק של המציאות. ממש כמו דגם פלסטיק מוקטן של ההר או משחק מחשב.',
pros: [
 'הכי קל ואינטואיטיבי',
 'המוח מזהה מיד מה גבוה ומה נמוך, בלי שנצטרך ללמוד שום דבר מראש'
 ],
cons: [
 'קשה למדוד עליו מרחקים במדויק',
 'דורש מסך וחשמל',
 'אי אפשר לקפל אותו לכיס ולקחת לשטח'
 ],
whyItMatters: 'זהו כלי מעולה לתדרוך בחמ"ל. לוחמים יכולים"לעוף" וירטואלית מעל השטח לפני מבצע כדי להבין איך הוא ייראה במציאות.',
 },
 {
id: 'photo',
label: 'תצ״א (תצלום מהאוויר)',
icon: 'eye',
whatItIs: 'תמונה מציאותית שצולמה ממטוס, רחפן או לוויין, במבט ישר מלמעלה (ממעוף הציפור).',
pros: [
 'מראה את המציאות העדכנית ביותר',
 'רואים כל עץ, מבנה או שביל בדיוק כפי שהם נראים היום'
 ],
cons: [
 'התמונה חסרת עומק ונראית"מעוכה"',
 'אי אפשר לדעת אם כביש הוא תלול או מישורי',
 'צמרות עצים יכולות להסתיר את מה שמתחתן'
 ],
whyItMatters: 'התצ"א מצוינת כדי לדעת איפה יש מבנים ואיך נראה היעד, אבל בלי לדעת מה שיפוע ההר - אי אפשר לתכנן דרכה מסלול נסיעה בטוח.',
 },
 {
id: 'topo',
label: 'מפה טופוגרפית',
icon: 'layers',
whatItIs: 'שרטוט חכם על נייר או מסך, שמשתמש בסמלים מוסכמים וב"קווי גובה" כדי לתאר שטח תלת-ממדי על גבי דף שטוח.',
pros: [
 'מדויקת להפליא. מאפשרת מדידה מתמטית של מרחקים ושיפועים',
 'מסננת"רעשי רקע" שסתם מפריעים לעין',
 'עובדת מעולה גם מודפסת בשטח'
 ],
cons: [
 'דורשת למידה ותרגול',
 'מי שלא מכיר את"שפת המפה", יראה רק אוסף מבלבל של קווים ולא יבין מה הוא קורא'
 ],
whyItMatters: 'המפה היא כלי העבודה מספר 1 של כל מפקד. היא משאירה רק את הנתונים הקריטיים לניווט, ומאפשרת לקבל החלטות מדויקות תחת לחץ.',
 },
];
export function TopographySceneV1() {
  const [idx, setIdx] = useState(0); // default: מודל תלת־ממדי — הרצף מתקדם מהמוחשי אל המפה
  const reduce = useReducedMotion();
  const total = VIEWS.length;
  const meta = VIEWS[idx];
  const isFirst = idx === 0;
  const isLast = idx === total - 1;
  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabId = (i: number) => `${uid}-tab-${i}`;
  const panelId = `${uid}-panel`;

  // ←/→ anywhere inside the viewer switches views (RTL: ← = next, → = back).
  // When focus is on a tab, focus follows the selection (roving tabindex).
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next = -1;
    if (e.key === 'ArrowLeft') next = Math.min(total - 1, idx + 1);
    else if (e.key === 'ArrowRight') next = Math.max(0, idx - 1);
    else if ((e.target as HTMLElement).getAttribute('role') === 'tab') {
      if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = total - 1;
    }
    if (next < 0) return;
    e.preventDefault();
    setIdx(next);
    if ((e.target as HTMLElement).getAttribute('role') === 'tab') tabRefs.current[next]?.focus();
  };

  return (
    <section id="scene-topography" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="02.1"
        eyebrow="טופוגרפיה"
        title="ממרחב למישור: איך מתרגמים מציאות תלת-ממדית לתוך דף שטוח?"
        intro="טופוגרפיה = חקר צורת הקרקע (איפה יש הר, גבעה או עמק). את אותו ההר אפשר להציג ב-3 דרכים. עברו בין האפשרויות ובדקו מה היתרונות והחסרונות של כל אחת:"
      />

      <div className="mb-12" onKeyDown={onKeyDown}>
        {/* Segmented view switcher — the three views are directly selectable.
            The running number (formerly an absolute "01" badge that overlapped
            the card's corner) now lives inside each segment. */}
        <div
          role="tablist"
          aria-label="ניווט בין תצוגות"
          className="mx-auto mb-4 flex max-w-3xl flex-col gap-2 sm:flex-row"
        >
          {VIEWS.map((v, i) => {
            const isActive = i === idx;
            return (
              <button
                key={v.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={tabId(i)}
                aria-selected={isActive}
                aria-controls={panelId}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setIdx(i)}
                className={cn(
                  // Tabs sit on the textured page, so the translucent option tints ride
                  // on an opaque white base via ::before (same recipe as Geology/Density).
                  'relative isolate flex flex-1 items-center justify-center gap-2 rounded-xl border bg-bg-elevated px-3 py-2.5 font-display text-base font-bold text-fg transition-colors duration-200 ease-snap cursor-pointer',
                  'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap',
                  isActive
                    ? 'border-accent before:bg-accent/10'
                    : 'border-border hover:border-brand/30 hover:before:bg-brand/[0.03]',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'size-6 shrink-0 rounded-full text-[13px] tabular-nums flex items-center justify-center transition-colors duration-200 ease-snap',
                    isActive ? 'bg-accent text-white' : 'bg-bg-accent text-fg-muted',
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Icon name={v.icon} size={18} className="shrink-0 text-fg-muted" />
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>

        {/* Central content panel — one view at a time, full-width image, replaces the former accordion + cropped side-image layout */}
        <div
          role="tabpanel"
          id={panelId}
          aria-labelledby={tabId(idx)}
          className="surface-elevated p-5 sm:p-6"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={meta.id}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-4 text-center font-display text-lg font-bold leading-snug text-fg md:text-xl">
                {meta.label}
              </div>

              <div className="mx-auto max-w-2xl overflow-hidden rounded-xl">
                {meta.id === '3d' && <View3D />}
                {meta.id === 'photo' && <ViewPhoto />}
                {meta.id === 'topo' && <ViewTopo />}
              </div>

              <div className="mt-6 space-y-6">
                <div>
                  <div className="mb-1 font-display text-base font-bold text-fg">
                    במילים פשוטות
                  </div>
                  <p className="text-base leading-relaxed text-fg">{meta.whatItIs}</p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center gap-2 font-display text-base font-bold text-fg">
                      <Icon name="check" size={18} strokeWidth={2.25} className="shrink-0 text-fg-muted" />
                      מה היתרון
                    </div>
                    <ul className="space-y-1.5 text-base leading-relaxed">
                      {meta.pros.map((p) => (
                        <li key={p} className="flex gap-2">
                          <span className="text-fg-muted">·</span>
                          <span className="text-fg">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 font-display text-base font-bold text-fg">
                      <svg
                        width="18"
                        height="18"
                        className="shrink-0 text-fg-muted"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                      מה הבעיה
                    </div>
                    <ul className="space-y-1.5 text-base leading-relaxed">
                      {meta.cons.map((c) => (
                        <li key={c} className="flex gap-2">
                          <span className="text-fg-muted">·</span>
                          <span className="text-fg">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-xl bg-bg-accent/60 p-4">
                  <div className="mb-1 font-display text-base font-bold text-fg">
                    למה זה חשוב
                  </div>
                  <p className="text-base leading-relaxed text-fg text-pretty">{meta.whyItMatters}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Prev / progress dots / Next — matches the LandformsScene pager convention.
            RTL: "next" advances left (◀), "prev" retreats right (▶) — design-spec §10. */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIdx((v) => Math.max(0, v - 1))}
            disabled={isFirst}
            aria-label="התצוגה הקודמת"
            className={cn(
              'relative isolate size-11 rounded-xl border flex items-center justify-center shrink-0 transition-colors duration-200 ease-snap before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap',
              isFirst
                ? 'border-border-subtle bg-transparent text-fg-dim opacity-40 cursor-not-allowed'
                : 'border-border bg-bg-elevated text-brand-dark hover:border-brand/30 hover:before:bg-brand/[0.03] cursor-pointer',
            )}
          >
            <ChevronRight size={22} strokeWidth={2} aria-hidden />
          </button>

          {/* Progress dots — a mouse shortcut mirroring the tab row above
              (hidden from assistive tech, which uses the tablist). */}
          <div className="flex items-center gap-2" aria-hidden>
            {VIEWS.map((v, i) => {
              const isActive = i === idx;
              return (
                <button
                  key={v.id}
                  type="button"
                  tabIndex={-1}
                  onClick={() => setIdx(i)}
                  className="group flex h-6 items-center justify-center px-0.5 cursor-pointer"
                >
                  <span
                    className={cn(
                      'block h-2.5 rounded-full transition-all duration-300 ease-snap',
                      isActive ? 'w-8 bg-accent' : 'w-2.5 bg-border-strong/70 group-hover:bg-fg-dim',
                    )}
                  />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIdx((v) => Math.min(total - 1, v + 1))}
            disabled={isLast}
            aria-label="התצוגה הבאה"
            className={cn(
              'relative isolate size-11 rounded-xl border flex items-center justify-center shrink-0 transition-colors duration-200 ease-snap before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap',
              isLast
                ? 'border-border-subtle bg-transparent text-fg-dim opacity-40 cursor-not-allowed'
                : 'border-border bg-bg-elevated text-brand-dark hover:border-brand/30 hover:before:bg-brand/[0.03] cursor-pointer',
            )}
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// תצוגות – איורים מבוססי תמונה (מוצגות במלואן, בלי חיתוך)
// ==========================================
function View3D() {
  return (
    <IsometricAsset
      assetId="TOPIC02-TOPO-3D"
      src="/assets/lessons/topic02/scene-topography/TOPIC02-TOPO-3D.png"
      alt="איור איזומטרי: מודל תלת-ממדי של הר, מציג את פני השטח כמו דגם מוקטן"
      aspect="4/3"
      className="w-full rounded-lg"
      prompt="Isometric papercut illustration of a 3D terrain model of a mountain, layered-paper shading, warm cream background, no text."
    />
  );
}
function ViewPhoto() {
  return (
    <IsometricAsset
      assetId="TOPIC02-TOPO-PHOTO"
      src="/assets/lessons/topic02/scene-topography/TOPIC02-TOPO-PHOTO.png"
      alt="תצלום אווירי של שטח, מבט ישר מלמעלה"
      aspect="4/3"
      className="w-full rounded-lg"
      prompt="Aerial photograph style illustration of terrain viewed from directly above, warm cream background, no text."
    />
  );
}
function ViewTopo() {
  return (
    <IsometricAsset
      assetId="TOPIC02-TOPO-MAP"
      src="/assets/lessons/topic02/scene-topography/TOPIC02-TOPO-MAP.png"
      alt="מפה טופוגרפית עם קווי גובה המתארים שטח תלת-ממדי על גבי דף שטוח"
      aspect="4/3"
      className="w-full rounded-lg"
      prompt="Topographic map illustration with contour lines, papercut style, warm cream background, no text."
    />
  );
}
