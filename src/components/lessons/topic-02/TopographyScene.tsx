'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
const [view, setView] = useState<View>('topo');
const meta = VIEWS.find((v) => v.id === view)!;
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
        intro="טופוגרפיה = חקר צורת הקרקע (איפה יש הר, גבעה או עמק). את אותו ההר אפשר להציג ב-3 דרכים. לחצו על האפשרויות ובדקו מה היתרונות והחסרונות של כל אחת:"
 />

 <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-stretch">
 {/* Accordion list — first child → RIGHT in RTL (text on right) */}
 <div className="space-y-3">
 {VIEWS.map((v, i) => {
const isActive = view === v.id;
return (
 <div
key={v.id}
className={cn(
 'surface overflow-hidden transition-colors',
isActive ? 'border-brand-dark bg-brand/5' : 'hover:border-border-strong'
 )}
 >
 <button
type="button"
onClick={() => setView(v.id)}
aria-expanded={isActive}
className="w-full p-4 text-right flex items-center gap-3"
 >
 <div className="flex-1 min-w-0">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 תצוגה {String(i + 1).padStart(2, '0')}
 </div>
 <div className={cn('font-medium text-sm leading-tight', isActive && 'text-brand-dark')}>
 {v.label}
 </div>
 </div>
 <motion.span
animate={{ rotate: isActive ? 180 : 0 }}
transition={{ duration: 0.25 }}
className={cn('shrink-0 inline-flex', isActive ? 'text-brand-dark' : 'text-fg-dim')}
 >
 <svg
width="18"
height="18"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="1.8"
strokeLinecap="round"
strokeLinejoin="round"
aria-hidden
 >
 <path d="m6 9 6 6 6-6" />
 </svg>
 </motion.span>
 </button>

 <AnimatePresence initial={false}>
 {isActive && (
 <motion.div
key={`panel-${v.id}`}
initial={{ height: 0, opacity: 0 }}
animate={{ height: 'auto', opacity: 1 }}
exit={{ height: 0, opacity: 0 }}
transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
className="overflow-hidden"
 >
 <div className="px-4 pb-4 pt-1 border-t border-brand/20 space-y-4">
 <div>
 <div className="text-sm font-display font-semibold text-accent-cool mt-3 mb-1.5 tracking-wider">
 במילים פשוטות
 </div>
 <p className="text-sm text-fg leading-relaxed">{v.whatItIs}</p>
 </div>

 <div className="grid sm:grid-cols-2 gap-3">
 <div className="surface p-3">
 <div className="flex items-center gap-2 text-sm font-display font-semibold text-status-ok mb-2 tracking-wider">
 <Icon name="check" size={12} strokeWidth={2.5} />
 מה היתרון
 </div>
 <ul className="space-y-1.5 text-sm">
 {v.pros.map((p) => (
 <li key={p} className="flex gap-2">
 <span className="text-status-ok mt-0.5">·</span>
 <span className="text-fg">{p}</span>
 </li>
 ))}
 </ul>
 </div>

 <div className="surface p-3">
 <div className="flex items-center gap-2 text-sm font-display font-semibold text-status-warn mb-2 tracking-wider">
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
 <ul className="space-y-1.5 text-sm">
 {v.cons.map((c) => (
 <li key={c} className="flex gap-2">
 <span className="text-status-warn mt-0.5">·</span>
 <span className="text-fg">{c}</span>
 </li>
 ))}
 </ul>
 </div>
 </div>

 <div className="surface p-3 flex gap-2.5 items-start">
 <Icon name="spark" size={18} className="text-brand-dark shrink-0 mt-0.5" />
 <div>
 <div className="text-sm font-display font-semibold text-brand-dark mb-1 tracking-wider">
 למה זה חשוב
 </div>
 <p className="text-sm text-fg leading-relaxed text-pretty">{v.whyItMatters}</p>
 </div>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
 })}
 </div>

 {/* Visualization — second child → LEFT in RTL */}
 <div className="surface-elevated relative overflow-hidden h-full flex flex-col">
 <AnimatePresence mode="wait">
 <motion.div
key={view}
initial={{ opacity: 0, scale: 0.96 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 1.02 }}
transition={{ duration: 0.3 }}
className="flex-1 min-h-[18rem]"
 >
 {view === '3d' && <View3D />}
 {view === 'photo' && <ViewPhoto />}
 {view === 'topo' && <ViewTopo />}
 </motion.div>
 </AnimatePresence>

 <div className="absolute bottom-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-xs text-fg-muted">
 <Icon name={meta.icon} size={12} />
 {meta.label}
 </div>
 </div>
 </div>
 </section>
 );
}

// ==========================================
// תצוגות – איורים מבוססי תמונה
// ==========================================
function View3D() {
  return (
    <IsometricAsset
      assetId="TOPIC02-TOPO-3D"
      src="/assets/lessons/topic02/scene-topography/TOPIC02-TOPO-3D.png"
      alt="איור איזומטרי: מודל תלת-ממדי של הר, מציג את פני השטח כמו דגם מוקטן"
      aspect="4/3"
      className="w-full h-full object-cover rounded-[3px]"
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
      className="w-full h-full object-cover rounded-[3px]"
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
      className="w-full h-full object-cover rounded-[3px]"
      prompt="Topographic map illustration with contour lines, papercut style, warm cream background, no text."
    />
  );
}