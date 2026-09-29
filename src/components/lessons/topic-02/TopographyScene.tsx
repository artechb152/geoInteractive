'use client';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

// One generated terrain shown three ways (3D model / aerial photo / map) in a
// single live canvas — client-only, and nothing loads until it nears the viewport.
const TopographyTerrain3D = dynamic(() => import('./TopographyTerrain3D'), {
  ssr: false,
  loading: () => <div className="h-full min-h-[560px] w-full rounded-xl bg-bg-accent/40" />,
});
type View = '3d' | 'photo' | 'topo';
const VIEWS: { id: View; label: string; icon: IconName; pros: string[]; cons: string[]; whatItIs: string; whyItMatters: string }[] = [
 {
id: '3d',
label: 'מודל תלת־ממדי',
icon: 'mountain',
whatItIs: 'ייצוג של פני השטח בשלושה ממדים, המבוסס על נתוני גובה ומאפשר לבחון את השטח מזוויות שונות.',
pros: [
 'ממחיש את צורת ההרים, הגבעות והעמקים',
 'מסייע להבין את הפרשי הגובה ואת היחסים בין צורות השטח'
 ],
cons: [
 'רמת הדיוק תלויה בנתונים שעליהם נבנה',
 'מדידת מרחקים ושיפועים דורשת כלים מתאימים',
 'הצגת מודל דיגיטלי דורשת מכשיר ומקור חשמל'
 ],
whyItMatters: 'המודל מסייע להכיר את השטח לפני היציאה אליו. בתדרוך אפשר לבחון באמצעותו את מבנה השטח ולהמחיש את המסלול המתוכנן.',
 },
 {
id: 'photo',
label: 'תצ״א (תצלום אוויר)',
icon: 'eye',
whatItIs: 'תצלום של פני השטח שצולם מכלי טיס, כגון מטוס או רחפן. כאן מוצגת הדמיה של מבט מלמעלה.',
pros: [
 'מציג את מראה השטח במועד הצילום',
 'מסייע לזהות מבנים, דרכים וצמחייה לפי איכות התצלום'
 ],
cons: [
 'קשה להעריך גבהים ושיפועים מתצלום בודד',
 'שינויים שחלו בשטח לאחר הצילום אינם מופיעים בו',
 'צמחייה ומבנים עלולים להסתיר פרטים'
 ],
whyItMatters: 'תצלום האוויר מסייע לזהות פרטים בשטח ולהכיר את סביבת היעד. לתכנון מסלול יש לשלב אותו עם נתוני גובה ושיפוע ולבדוק את מועד הצילום.',
 },
 {
id: 'topo',
label: 'מפה טופוגרפית',
icon: 'layers',
whatItIs: 'ייצוג של השטח בקנה מידה מוגדר, באמצעות סימנים מוסכמים וקווי גובה. קווי הגובה מתארים את גובה הקרקע ואת צורתה על משטח דו־ממדי.',
pros: [
 'מאפשרת למדוד מרחקים ולהעריך שיפועים',
 'מציגה מידע נבחר על התבליט והתכסית',
 'ניתנת לשימוש בשטח גם בגרסה מודפסת'
 ],
cons: [
 'קריאת הסימנים וקווי הגובה דורשת למידה ותרגול',
 'רמת הפירוט והדיוק תלויה בקנה המידה ובנתוני המקור'
 ],
whyItMatters: 'המפה מסייעת להבין את מבנה השטח, להשוות בין מסלולים ולתכנן תנועה. כדי להשתמש בה נכון, יש להכיר את סימניה ולבדוק את מועד העדכון שלה.',
 },
];
/** Describe the simulated terrain shown in each view. */
const ALTS: Record<View, string> = {
  '3d': 'מודל תלת־ממדי הממחיש את צורת פני השטח ואת הפרשי הגובה',
  photo: 'הדמיה של תצלום אוויר המציג את פני השטח במבט מלמעלה',
  topo: 'מפה טופוגרפית של השטח המודגם, ובה קווי גובה וסימנים מוסכמים',
};
export function TopographyScene() {
  const [idx, setIdx] = useState(0); // default: מודל תלת־ממדי — הרצף מתקדם מהמוחשי אל המפה
  const [stacked, setStacked] = useState(false); // "כל התצוגות יחד": the model lifted off its map
  const reduce = useReducedMotion();
  // Choosing a view — tab, pager, dot, arrow key or a layer of the stack —
  // always shows just that view: it leaves "all together".
  const select = (i: number) => {
    setIdx(i);
    setStacked(false);
  };
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
    select(next);
    if ((e.target as HTMLElement).getAttribute('role') === 'tab') tabRefs.current[next]?.focus();
  };

  return (
    <section id="scene-topography" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="02.1"
        eyebrow="טופוגרפיה"
        title="ממרחב למישור: כיצד מייצגים את פני השטח?"
        intro="טופוגרפיה עוסקת בתיאור צורת פני השטח, הגבהים והשיפועים. כאן מוצג אותו שטח בשלוש דרכים. עברו בין התצוגות והשוו בין היתרונות, המגבלות והשימושים של כל אחת."
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
                onClick={() => select(i)}
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
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>

        {/* One card, one screen: the explanation (first in DOM → visual right,
            where RTL reading starts) beside a large live viewer. The pager sits
            at the end of the text, so reading ends at "next". */}
        <div
          role="tabpanel"
          id={panelId}
          aria-labelledby={tabId(idx)}
          className="surface-elevated p-5 sm:p-6"
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8">
            <div className="flex min-w-0 flex-col">
              {/* All three texts share one grid cell, so the column — and the
                  viewer beside it — keeps the height of the tallest view:
                  switching never makes the layout jump. */}
              <div className="grid [&>*]:[grid-area:1/1]">
                {VIEWS.map((v, i) => {
                  const isActive = i === idx;
                  return (
                    <motion.div
                      key={v.id}
                      aria-hidden={!isActive}
                      initial={false}
                      animate={
                        isActive
                          ? { opacity: 1, visibility: 'visible' }
                          : { opacity: 0, transitionEnd: { visibility: 'hidden' } }
                      }
                      transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-4"
                    >
                      <div className="font-display text-lg font-bold leading-snug text-fg md:text-xl">
                        {v.label}
                      </div>

                      <div>
                        <div className="mb-1 font-display text-base font-bold text-fg">
                          תיאור התצוגה
                        </div>
                        <p className="text-base leading-relaxed text-fg">{v.whatItIs}</p>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center gap-2 font-display text-base font-bold text-fg">
                          <Icon name="check" size={18} strokeWidth={2.25} className="shrink-0 text-fg-muted" />
                          יתרונות
                        </div>
                        <ul className="space-y-1.5 text-base leading-relaxed">
                          {v.pros.map((p) => (
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
                          מגבלות
                        </div>
                        <ul className="space-y-1.5 text-base leading-relaxed">
                          {v.cons.map((c) => (
                            <li key={c} className="flex gap-2">
                              <span className="text-fg-muted">·</span>
                              <span className="text-fg">{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-xl bg-bg-accent/60 p-4">
                        <div className="mb-1 font-display text-base font-bold text-fg">
                          שימוש בתכנון
                        </div>
                        <p className="text-base leading-relaxed text-fg text-pretty">{v.whyItMatters}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Prev / progress dots / Next — matches the LandformsScene pager convention.
                  RTL: "next" advances left (◀), "prev" retreats right (▶) — design-spec §10. */}
              <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                <button
                  type="button"
                  onClick={() => select(Math.max(0, idx - 1))}
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
                        onClick={() => select(i)}
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
                  onClick={() => select(Math.min(total - 1, idx + 1))}
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

            {/* The viewer — second in DOM → visual left. It stretches to the
                text column's height (never below 560 px). */}
            <div className="relative min-h-[560px]">
              <div className="absolute inset-0">
                <TopographyTerrain3D
                  view={meta.id}
                  stacked={stacked}
                  onToggleStacked={() => setStacked((s) => !s)}
                  onSelectView={(v) => select(VIEWS.findIndex((x) => x.id === v))}
                  ariaLabel={ALTS[meta.id]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
