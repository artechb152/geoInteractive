'use client';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { LessonViewportFit } from '@/components/lesson/LessonViewportFit';
import { ModelLoading } from '@/components/lesson/ModelLoading';
import type { IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

// One generated terrain shown three ways (3D model / aerial photo / map), plus
// all of them together, in a single live canvas — client-only, and nothing loads until it nears the viewport.
const TopographyTerrain3D = dynamic(() => import('./TopographyTerrain3D'), {
  ssr: false,
  loading: () => (
    <div className="relative h-full min-h-[560px] w-full rounded-xl bg-bg-accent/40">
      <ModelLoading card label="טוען שטח תלת־ממדי…" />
    </div>
  ),
});
type View = '3d' | 'photo' | 'topo' | 'all';
const VIEWS: { id: View; label: string; icon: IconName; pros: string[]; cons: string[]; whatItIs: string; whyItMatters: string }[] = [
 {
id: 'topo',
label: 'מפה טופוגרפית',
icon: 'layers',
whatItIs: 'שרטוט של השטח במבט־על, בקנה מידה ידוע. קווי גובה מתארים את צורת הקרקע, וסימנים מוסכמים מתארים את מה שנמצא עליה.',
pros: [
 'אפשר למדוד בה מרחקים ולהעריך שיפועים',
 'מציגה מידע נבחר על התבליט והתכסית',
 'אפשר לעבוד איתה בשטח גם מודפסת'
 ],
cons: [
 'צריך ללמוד לקרוא את הסימנים ואת קווי הגובה',
 'הפירוט והדיוק תלויים בקנה המידה ובנתוני המקור'
 ],
whyItMatters: 'למדידה, להשוואת מסלולים ולתכנון תנועה. בדקו מתי המפה עודכנה.',
 },
 {
id: 'photo',
label: 'תצ״א (תצלום אוויר)',
icon: 'eye',
whatItIs: 'תצלום של פני השטח מכלי טיס, כמו מטוס או רחפן. כאן מוצגת הדמיה של תצלום כזה.',
pros: [
 'מראה את השטח כפי שהיה ביום הצילום',
 'אפשר לזהות בו מבנים, דרכים וצמחייה, לפי איכות התצלום'
 ],
cons: [
 'מתצלום בודד קשה להעריך גבהים ושיפועים',
 'שינויים שקרו אחרי הצילום לא מופיעים בו',
 'צמחייה ומבנים עלולים להסתיר פרטים'
 ],
whyItMatters: 'לזיהוי פרטים ולהיכרות עם סביבת היעד. לתכנון מסלול משלבים אותו עם נתוני גובה ושיפוע.',
 },
 {
id: '3d',
label: 'מודל תלת־ממדי',
icon: 'mountain',
whatItIs: 'פני השטח בשלושה ממדים, על בסיס נתוני גובה. אפשר לבחון בו את השטח מזוויות שונות.',
pros: [
 'ממחיש את צורת ההרים, הגבעות והעמקים',
 'מראה את הפרשי הגובה ואת הקשר בין צורות השטח'
 ],
cons: [
 'הדיוק תלוי בנתונים שעליהם נבנה',
 'מדידת מרחקים ושיפועים דורשת כלים מתאימים',
 'מודל דיגיטלי דורש מכשיר ומקור חשמל'
 ],
whyItMatters: 'להכרת השטח לפני היציאה אליו, ובתדרוך — להמחשת המסלול המתוכנן.',
 },
 {
id: 'all',
label: 'כל התצוגות יחד',
icon: 'layers',
whatItIs: 'המודל מורם מעל המפה של אותו שטח, וכל נקודה בו מתאימה לנקודה במפה. הצביעו על פרט כדי לראות אותו בשתי השכבות.',
pros: [
 'מקשרת בין קווי הגובה לבין צורת השטח',
 'אפשר לזהות את אותו פרט בכל תצוגה'
 ],
cons: [
 'ריבוי שכבות עלול להעמיס על התצוגה',
 'כל מקורות המידע צריכים להיות מעודכנים ומתואמים'
 ],
whyItMatters: 'משלבים את שלושתן: מפה למדידה ולניווט, תצלום לזיהוי פרטים, מודל להמחשת התבליט.',
 },
];
/**
 * Laptop fit — the 1920×1080 view is the reference composition (scale 1).
 * Width: the section's content box there, 1344 px (max-w-lesson minus lg:px-8).
 * The scene header stays outside the fit: with it inside, the composition
 * (header → tabs → card) was 977 px tall, so on a laptop it was bound by the
 * height and came out narrower than the screens before it. Only the viewer
 * (tabs → card, 744 px, measured 2026-10-19 — the same on every view) is
 * fitted, reserving the sticky site header (--header-h, 5rem from lg) plus a
 * 24 px gap above and 24 px below, as in the sibling topic-02 screens.
 */
const FIT_REFERENCE_WIDTH = 1344;
const FIT_REFERENCE_HEIGHT = 744;
const FIT_TOP = 80 + 24;
const FIT_BOTTOM = 24;
/** Describe the simulated terrain shown in each view. */
const ALTS: Record<View, string> = {
  '3d': 'מודל תלת־ממדי הממחיש את צורת פני השטח ואת הפרשי הגובה',
  photo: 'הדמיה של תצלום אוויר המציג את פני השטח במבט מלמעלה',
  topo: 'מפה טופוגרפית של השטח המודגם, ובה קווי גובה וסימנים מוסכמים',
  all: 'המודל התלת־ממדי של השטח מורם מעל המפה הטופוגרפית שלו',
};
export function TopographyScene() {
  const [idx, setIdx] = useState(0); // default: מפה טופוגרפית — הרצף מתקדם מהמפה אל המודל התלת־ממדי
  // The single view last shown — its layer stays highlighted while "all together" is open.
  const [lastSingle, setLastSingle] = useState<Exclude<View, 'all'>>('topo');
  const reduce = useReducedMotion();
  const select = (i: number) => {
    setIdx(i);
    const id = VIEWS[i].id;
    if (id !== 'all') setLastSingle(id);
  };
  const total = VIEWS.length;
  const meta = VIEWS[idx];
  const stacked = meta.id === 'all'; // "כל התצוגות יחד": the model lifted off its map
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
    <section id="scene-topography" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="02.1"
        eyebrow="טופוגרפיה"
        title="איך מייצגים את פני השטח?"
        intro="טופוגרפיה מתארת את צורת פני השטח: גבהים ושיפועים. כאן אותו שטח מוצג בשלוש דרכים ובשילוב ביניהן. עברו בין הלשוניות והשוו מה כל תצוגה מראה ומה חסר בה."
      />

      <LessonViewportFit
        referenceWidth={FIT_REFERENCE_WIDTH}
        referenceHeight={FIT_REFERENCE_HEIGHT}
        reserveTop={FIT_TOP}
        reserveBottom={FIT_BOTTOM}
        className="mb-12"
      >

        {/* One card, one screen: the view tabs head the card they switch (one envelope per activity). */}
        <div onKeyDown={onKeyDown} className="surface-elevated p-5 sm:p-6">
          {/* Segmented view switcher — the four views are directly selectable.
              The running number (formerly an absolute "01" badge that overlapped
              the card's corner) now lives inside each segment. */}
          <div
            role="tablist"
            aria-label="ניווט בין תצוגות"
            className="mb-5 flex flex-col gap-2 sm:flex-row"
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
                    // The translucent option tints ride on an opaque white base via ::before
                    // (same recipe as Geology/Density).
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

          {/* The explanation (first in DOM → visual right, where RTL reading
              starts) beside a large live viewer. The tabs are the only view
              switcher — no prev/next pager duplicating them. */}
          <div
            role="tabpanel"
            id={panelId}
            aria-labelledby={tabId(idx)}
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8">
              <div className="flex min-w-0 flex-col">
                {/* All four texts share one grid cell, so the column — and the
                    viewer beside it — keeps the height of the tallest view:
                    switching never makes the layout jump. The desktop floor is
                    the former text floor (568) plus the removed pager row
                    (pt-5 + 44 px), so the card and viewer keep their size. */}
                <div className="grid lg:min-h-[632px] [&>*]:[grid-area:1/1]">
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
                        className="space-y-5"
                      >
                        {/* T2 card heading → T4 definition, then T3-labelled blocks. */}
                        <div>
                          <h3 className="font-display font-bold leading-tight text-black text-lg md:text-xl">
                            {v.label}
                          </h3>
                          <p className="mt-2 text-base leading-relaxed text-black">{v.whatItIs}</p>
                        </div>

                        <div>
                          <h4 className="text-base font-display font-bold text-black mb-1.5 tracking-wider">
                            יתרונות
                          </h4>
                          <ul className="space-y-1.5 text-base leading-relaxed text-black">
                            {v.pros.map((p) => (
                              <li key={p} className="flex gap-2">
                                <span aria-hidden>·</span>
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-base font-display font-bold text-black mb-1.5 tracking-wider">
                            מגבלות
                          </h4>
                          <ul className="space-y-1.5 text-base leading-relaxed text-black">
                            {v.cons.map((c) => (
                              <li key={c} className="flex gap-2">
                                <span aria-hidden>·</span>
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="border-t border-border-subtle pt-4">
                          <h4 className="text-base font-display font-bold text-black mb-1.5 tracking-wider">
                            בתכנון
                          </h4>
                          <p className="text-base leading-relaxed text-black">{v.whyItMatters}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* The viewer — second in DOM → visual left. It stretches to the
                  text column's height (never below 560 px). */}
              <div className="relative min-h-[560px]">
                <div className="absolute inset-0">
                  <TopographyTerrain3D
                    view={meta.id === 'all' ? lastSingle : meta.id}
                    stacked={stacked}
                    onSelectView={(v) => select(VIEWS.findIndex((x) => x.id === v))}
                    ariaLabel={ALTS[meta.id]}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </LessonViewportFit>
    </section>
  );
}
