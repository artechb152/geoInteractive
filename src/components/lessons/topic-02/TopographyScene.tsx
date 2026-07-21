'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { STEEPNESS_RINGS, elevationOpacity } from './LayeredCartographyStage';
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

 {/* View switcher — tab row (drives the same `view` state as before) */}
 <div className="grid grid-cols-3 gap-3 mb-5">
 {VIEWS.map((v, i) => {
const isActive = view === v.id;
return (
 <button
key={v.id}
type="button"
onClick={() => setView(v.id)}
aria-pressed={isActive}
style={{ order: VIEWS.length - 1 - i }}
className={cn(
 'surface relative overflow-hidden flex items-center gap-3 p-4 text-start transition-colors',
isActive ? 'border-accent bg-accent/10 shadow-card-soft' : 'hover:border-border-strong'
 )}
 >
 <Icon
name={v.icon}
size={26}
strokeWidth={1.5}
className={cn('shrink-0', isActive ? 'text-accent' : 'text-fg-dim')}
 />
 <div className="flex-1 min-w-0">
 <div className="text-xs font-display font-semibold text-fg-dim tracking-wider">
 תצוגה {String(i + 1).padStart(2, '0')}
 </div>
 <div className={cn('font-semibold text-sm leading-tight', isActive ? 'text-accent' : 'text-fg')}>
 {v.label}
 </div>
 </div>
 {isActive && (
 <span className="absolute inset-inline-start-0 bottom-0 h-1 w-full bg-accent rounded-full" aria-hidden />
 )}
 </button>
 );
 })}
 </div>

 <div className="grid lg:grid-cols-[1fr_1.7fr] gap-6 items-stretch">
 {/* Info panel — first child → RIGHT in RTL. Always-visible, driven by the active `meta`. */}
 <div className="surface-elevated p-5 flex flex-col overflow-hidden">
 <AnimatePresence mode="wait">
 <motion.div
key={view}
initial={{ opacity: 0, y: 6 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -6 }}
transition={{ duration: 0.25 }}
className="divide-y divide-border/60"
 >
 <div className="pb-4">
 <div className="flex items-center gap-2 text-sm font-display font-semibold text-fg mb-2 tracking-wider">
 <IconWordsSimple />
 במילים פשוטות
 </div>
 <p className="text-sm text-fg leading-relaxed">{meta.whatItIs}</p>
 </div>

 <div className="py-4">
 <div className="flex items-center gap-2 text-sm font-display font-semibold text-accent mb-2 tracking-wider">
 <IconAdvantage />
 מה היתרון
 </div>
 <ul className="space-y-2 text-sm">
 {meta.pros.map((p) => (
 <li key={p} className="flex gap-2">
 <span className="text-accent mt-0.5">·</span>
 <span className="text-fg">{p}</span>
 </li>
 ))}
 </ul>
 </div>

 <div className="py-4">
 <div className="flex items-center gap-2 text-sm font-display font-semibold text-accent mb-2 tracking-wider">
 <IconProblem />
 מה הבעיה
 </div>
 <ul className="space-y-2 text-sm">
 {meta.cons.map((c) => (
 <li key={c} className="flex gap-2">
 <span className="text-accent mt-0.5">·</span>
 <span className="text-fg">{c}</span>
 </li>
 ))}
 </ul>
 </div>

 <div className="pt-4 flex gap-2.5 items-start">
 <Icon name="spark" size={18} className="text-accent shrink-0 mt-0.5" />
 <div>
 <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">
 למה זה חשוב
 </div>
 <p className="text-sm text-fg leading-relaxed text-pretty">{meta.whyItMatters}</p>
 </div>
 </div>
 </motion.div>
 </AnimatePresence>
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
// אייקוני עזר — פאנל המידע (לוקאליים לקובץ זה, לא נוגעים ב-Icon.tsx המשותף)
// באותה שפה חזותית של Icon.tsx: viewBox 24×24, stroke בלבד, ללא צמתי <text>
// ==========================================
function IconWordsSimple({ className }: { className?: string }) {
return (
 <svg
viewBox="0 0 24 24"
width={22}
height={22}
fill="none"
stroke="currentColor"
strokeWidth={1.5}
strokeLinecap="round"
strokeLinejoin="round"
aria-hidden
className={cn('shrink-0', className)}
 >
 <path d="M3 17 9 8l4 6 2-3 4 6H3Z" />
 <path d="M5.5 20a8 8 0 0 0 13 0" opacity="0.5" />
 </svg>
 );
}

function IconAdvantage({ className }: { className?: string }) {
return (
 <svg
viewBox="0 0 24 24"
width={22}
height={22}
fill="none"
stroke="currentColor"
strokeWidth={1.5}
strokeLinecap="round"
strokeLinejoin="round"
aria-hidden
className={cn('shrink-0', className)}
 >
 <rect x="3" y="9.5" width="18" height="6" rx="1.1" transform="rotate(-10 12 12.5)" />
 <path d="M6.2 10.6v2M9.6 9.9v2.6M13 9.2v2M16.4 8.5v2" transform="rotate(-10 12 12.5)" />
 </svg>
 );
}

function IconProblem({ className }: { className?: string }) {
return (
 <svg
viewBox="0 0 24 24"
width={22}
height={22}
fill="none"
stroke="currentColor"
strokeWidth={1.5}
strokeLinecap="round"
strokeLinejoin="round"
aria-hidden
className={cn('shrink-0', className)}
 >
 <path d="M3 8c2 0 2 2 4 2s2-3 4-3 2 4 4 4 2-2 4-2" />
 <path d="M3 14c2 0 2 2 4 2s2-3 4-3 2 4 4 4 2-2 4-2" />
 </svg>
 );
}

// ==========================================
// פונקציות הציור – איורים מבוססי קוד SVG
// ==========================================
function View3D() {
return (
 <svg viewBox="0 0 100 75" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
 {/* Sky */}
 <rect x="0" y="0" width="100" height="75" className="fill-bg-elevated" />

 {/* Back ridges */}
 <path d="M0 50 L25 32 L45 42 L65 28 L85 38 L100 30 L100 75 L0 75 Z" className="fill-terrain-ridge/55" />

 {/* Front mountain */}
 <path d="M0 60 L20 45 L40 38 L55 25 L70 35 L85 48 L100 55 L100 75 L0 75 Z" className="fill-terrain-olive/75" />

 {/* Ridge lines */}
 <path d="M0 60 L20 45 L40 38 L55 25 L70 35 L85 48 L100 55" fill="none" className="stroke-fg" strokeWidth="0.3" opacity="0.4" />

 {/* Sun */}
 <circle cx="80" cy="15" r="4" className="fill-accent/60" />

 {/* Label */}
 <text x="55" y="22" textAnchor="middle" className="fill-fg text-[3px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >פסגה · 412 מ׳</text>
 </svg>
 );
}
function ViewPhoto() {
 // Pseudo-aerial photo — patches of color
return (
 <svg viewBox="0 0 100 75" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
 <defs>
 <radialGradient id="photo-vignette">
 <stop offset="60%" stopColor="transparent" />
 <stop offset="100%" stopColor="black" stopOpacity="0.3" />
 </radialGradient>
 </defs>

 {/* Patchy aerial-like terrain */}
 <rect x="0" y="0" width="100" height="75" className="fill-terrain-ridge/40" />
 <ellipse cx="35" cy="40" rx="28" ry="22" className="fill-terrain-olive/50" />
 <ellipse cx="70" cy="50" rx="22" ry="18" className="fill-terrain-sand/40" />
 <ellipse cx="50" cy="25" rx="16" ry="10" className="fill-terrain-ridge/60" />
 {/* Roads */}
 <path d="M0 55 Q 40 50 60 48 T 100 45" fill="none" className="stroke-fg-muted" strokeWidth="0.6" opacity="0.5" />
 {/* Building cluster */}
 {[
 [40, 50], [42, 52], [44, 50], [46, 51],
 [70, 55], [72, 53],
 ].map(([x, y], i) => (
 <rect key={i} x={x} y={y} width="1.2" height="1.2" className="fill-fg/60" />
 ))}
 {/*"Camera grain" */}
 {Array.from({ length: 30 }).map((_, i) => {
const x = (i * 37) % 100;
const y = (i * 17) % 75;
return <circle key={i} cx={x} cy={y} r="0.2" className="fill-fg/20" />;
 })}
 <rect x="0" y="0" width="100" height="75" fill="url(#photo-vignette)" />
 </svg>
 );
}
function ViewTopo() {
return (
 <svg viewBox="0 0 100 75" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
 <rect x="0" y="0" width="100" height="75" className="fill-bg" />

 {/* Grid */}
 {Array.from({ length: 10 }).map((_, i) => (
 <line key={'gx' + i} x1={i * 10} y1="0" x2={i * 10} y2="75" className="stroke-border-subtle" strokeWidth="0.1" />
 ))}
 {Array.from({ length: 8 }).map((_, i) => (
 <line key={'gy' + i} x1="0" y1={i * 10} x2="100" y2={i * 10} className="stroke-border-subtle" strokeWidth="0.1" />
 ))}

 {/* Concentric contour lines forming a hill at center — the SAME
 landform (`mixed` steepness) drawn again in the "קווי גובה" scene,
 so this map and that one read as the same place, not two unrelated
 hills that both happen to have rings */}
 {STEEPNESS_RINGS.mixed.map((c, i) => (
 <ellipse
 key={i} cx="48" cy="38" rx={c.rx} ry={c.ry} fill="none" className="stroke-accent"
 strokeWidth={i === STEEPNESS_RINGS.mixed.length - 1 ? 0.5 : 0.3}
 opacity={elevationOpacity(i, STEEPNESS_RINGS.mixed.length)}
 />
 ))}

 {/* Index contour every 5th — slightly bolder */}
 <ellipse cx="48" cy="38" rx="35" ry="24" fill="none" className="stroke-accent" strokeWidth="0.5" opacity="0.7" />

 {/* Height labels */}
 <text x="48" y="36" textAnchor="middle" className="fill-accent text-[2.5px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >412</text>
 <text x="48" y="40" textAnchor="middle" className="fill-fg-muted text-[2px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >מ׳</text>
 <text x="13" y="60" textAnchor="start" direction="ltr" className="fill-fg-muted text-[2.2px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >300</text>
 <text x="79" y="55" textAnchor="start" direction="ltr" className="fill-fg-muted text-[2.2px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >350</text>

 {/* Symbol: small triangle = peak marker */}
 <polygon points="48,33 46,37 50,37" className="fill-accent" />

 {/* Path/road */}
 <path d="M5 65 Q 25 60 40 55 L 50 38" fill="none" className="stroke-fg-muted" strokeWidth="0.4" strokeDasharray="1.2 0.8" />

 {/* Building */}
 <rect x="20" y="58" width="2" height="2" className="fill-fg" />
 <text x="22" y="63" className="fill-fg-muted text-[2px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >מבנה</text>

 {/* Coordinate corner */}
 <text x="2" y="73" textAnchor="start" direction="ltr" className="fill-fg-dim text-[2px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >N31°45'</text>
 <text x="84" y="73" textAnchor="start" direction="ltr" className="fill-fg-dim text-[2px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >E35°12'</text>
 </svg>
 );
}
