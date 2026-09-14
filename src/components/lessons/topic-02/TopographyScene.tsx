'use client';
import { useState } from 'react';
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
export function TopographyScene() {
  const [idx, setIdx] = useState(2); // default: מפה טופוגרפית
  const reduce = useReducedMotion();
  const total = VIEWS.length;
  const meta = VIEWS[idx];
  const isFirst = idx === 0;
  const isLast = idx === total - 1;

  return (
    <section id="scene-topography" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="02.1"
        eyebrow="טופוגרפיה"
        title={
          <>
            ממרחב למישור: איך מתרגמים מציאות תלת-ממדית לתוך <span className="gradient-text">דף שטוח</span>?
          </>
        }
        intro="טופוגרפיה = חקר צורת הקרקע (איפה יש הר, גבעה או עמק). את אותו ההר אפשר להציג ב-3 דרכים. עברו בין האפשרויות ובדקו מה היתרונות והחסרונות של כל אחת:"
      />

      <div className="mb-12">
        {/* Central content panel — one view at a time, full-width image, replaces the former accordion + cropped side-image layout */}
        <div className="surface-elevated relative p-5 sm:p-8">
          <span
            aria-hidden
            className="absolute bottom-4 end-4 size-9 rounded-[3px] flex items-center justify-center bg-brand-dark text-bg-elevated font-display text-sm font-bold"
          >
            {String(idx + 1).padStart(2, '0')}
          </span>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={meta.id}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-5 text-center flex items-center justify-center gap-2">
                <Icon name={meta.icon} size={16} className="text-brand-dark" />
                <div className="font-display font-bold text-xl text-brand-dark leading-tight">{meta.label}</div>
              </div>

              <div className="rounded-[4px] bg-warm/50 p-2 sm:p-3 flex items-center justify-center">
                {meta.id === '3d' && <View3D />}
                {meta.id === 'photo' && <ViewPhoto />}
                {meta.id === 'topo' && <ViewTopo />}
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="text-sm font-display font-bold text-black mb-1 tracking-wider">
                    במילים פשוטות
                  </div>
                  <p className="text-sm leading-relaxed text-black">{meta.whatItIs}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="surface p-3">
                    <div className="flex items-center gap-1.5 text-sm font-display font-bold text-black mb-1 tracking-wider">
                      <Icon name="check" size={12} strokeWidth={2.5} />
                      מה היתרון
                    </div>
                    <ul className="space-y-1 text-sm">
                      {meta.pros.map((p) => (
                        <li key={p} className="flex gap-2">
                          <span className="text-status-ok mt-0.5">·</span>
                          <span className="text-black">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="surface p-3">
                    <div className="flex items-center gap-1.5 text-sm font-display font-bold text-black mb-1 tracking-wider">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                      מה הבעיה
                    </div>
                    <ul className="space-y-1 text-sm">
                      {meta.cons.map((c) => (
                        <li key={c} className="flex gap-2">
                          <span className="text-status-warn mt-0.5">·</span>
                          <span className="text-black">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="surface p-3 flex gap-2.5 items-start">
                  <Icon name="spark" size={18} className="text-brand-dark shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-display font-bold text-black mb-1 tracking-wider">
                      למה זה חשוב
                    </div>
                    <p className="text-sm leading-relaxed text-black text-pretty">{meta.whyItMatters}</p>
                  </div>
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
              'size-11 flex items-center justify-center shrink-0 transition-colors',
              isFirst
                ? 'rounded-2xl border border-border-subtle text-fg-dim opacity-40 cursor-not-allowed'
                : 'surface-elevated text-accent hover:bg-bg-accent cursor-pointer',
            )}
          >
            <ChevronRight size={20} strokeWidth={1.8} aria-hidden />
          </button>

          <div className="flex items-center gap-1.5" role="tablist" aria-label="ניווט בין תצוגות">
            {VIEWS.map((v, i) => {
              const isActive = i === idx;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={v.label}
                  onClick={() => setIdx(i)}
                  className={cn('h-2 rounded-full transition-all', isActive ? 'w-6 bg-accent' : 'w-2 bg-fg hover:bg-fg-dim')}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIdx((v) => Math.min(total - 1, v + 1))}
            disabled={isLast}
            aria-label="התצוגה הבאה"
            className={cn(
              'size-11 flex items-center justify-center shrink-0 transition-colors',
              isLast
                ? 'rounded-2xl border border-border-subtle text-fg-dim opacity-40 cursor-not-allowed'
                : 'surface-elevated text-accent hover:bg-bg-accent cursor-pointer',
            )}
          >
            <ChevronLeft size={20} strokeWidth={1.8} aria-hidden />
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
      className="w-full max-w-2xl rounded-[3px]"
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
      className="w-full max-w-2xl rounded-[3px]"
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
      className="w-full max-w-2xl rounded-[3px]"
      prompt="Topographic map illustration with contour lines, papercut style, warm cream background, no text."
    />
  );
}
