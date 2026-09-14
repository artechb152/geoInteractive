'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
import { cn } from '@/lib/utils';
type Scale = {
id: '10k' | '50k' | '250k';
ratio: number;
label: string;
size: 'גדול' | 'בינוני' | 'קטן';
use: string;
who: string;
detail: string[];
mapAsset: { assetId: string; src: string; alt: string };
};
const SCALES: Scale[] = [
 {
id: '10k',
ratio: 10000,
label: '1:10,000',
size: 'גדול',
who: 'מפת עיר / ניווט טקטי',
use: 'תכנון פשיטה או מעצר ברמת הלוחם הבודד והצוות.',
detail: ['"זום חזק" פנימה', 'רואים בניינים, גדרות ועצים בודדים', 'כל קו גובה = 5 מטרים'],
mapAsset: {
assetId: 'TOPIC02-SCALE-10K',
src: '/assets/lessons/topic02/scene-scale/TOPIC02-SCALE-10K.webp',
alt: 'צילום אוויר בקנה מידה 1:10,000 של יישוב בודד עם מבנים, כבישים ונחל',
},
 },
 {
id: '50k',
ratio: 50000,
label: '1:50,000',
size: 'בינוני',
who: 'ניווט רגלי - הסטנדרט הצה"לי',
use: 'השפה המשותפת של הצבא. תכנון תנועת גדוד וחטיבה.',
detail: ['איזון בין פירוט לשטח', 'רואים יישובים, ערוצי נחלים ודרכי עפר', 'כל קו גובה = 10 מטרים'],
mapAsset: {
assetId: 'TOPIC02-SCALE-50K',
src: '/assets/lessons/topic02/scene-scale/TOPIC02-SCALE-50K.webp',
alt: 'צילום אוויר בקנה מידה 1:50,000 של כמה יישובים, נחל וכבישים אזוריים',
},
 },
 {
id: '250k',
ratio: 250000,
label: '1:250,000',
size: 'קטן',
who: 'תכנון אסטרטגי / טיסות',
use: 'ראיית"התמונה הגדולה". תנועת אוגדות ומטוסים במרחב.',
detail: ['"זום החוצה" למבט על', 'רואים ערים ככתם ורק כבישים ארציים', 'קווי גובה כלליים (50-100 מ\')'],
mapAsset: {
assetId: 'TOPIC02-SCALE-250K',
src: '/assets/lessons/topic02/scene-scale/TOPIC02-SCALE-250K.webp',
alt: 'צילום אוויר בקנה מידה 1:250,000 של אזור נרחב הכולל ערים והרים',
},
 },
];
function IconPlaceholder({ className }: { className?: string }) {
return <span aria-hidden className={cn('inline-block shrink-0 rounded-[3px] border border-dashed', className)} />;
}
export function ScaleScene() {
const [scale, setScale] = useState<Scale>(SCALES[1]);
const [mapDistance, setMapDistance] = useState(4); // cm
const realKm = (mapDistance * scale.ratio) / 100000;
return (
 <section id="scene-scale" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
 <SceneHeader
step="02.2"
eyebrow="קנה מידה"
title={
          <>
          איך יחס של מספר אחד קטן — <span className="gradient-text">משנה את כל התמונה המבצעית</span>
          </>
        }intro={`קנה מידה הוא הדרך שלנו להבין כמה השטח"התכווץ" כדי להיכנס למפה. הנוסחה פשוטה: 1 ס"מ במפה = X סנטימטרים במציאות. למשל ב-1:50,000, כל ס"מ במפה שווה ל-500 מטר בשטח.`}
 />

 {/* Concept · matched pair feature cards */}
 <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-12 items-stretch">
 <div className="surface-elevated p-6 sm:p-8 rounded-[4px] flex flex-col">
 <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent-hover mb-2.5">
 <span className="size-1.5 rounded-full bg-accent" aria-hidden />
 הכלל המנחה
 </div>
 <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight mb-3 text-accent-hover">
 גדול או קטן? <span className="text-fg-muted font-medium text-base sm:text-lg">לפי הפירוט — לא המספר</span>
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 אל תסתכלו על המספר הגדול במכנה — תחשבו על רמת הפירוט. <strong className="text-fg">1:10,000 הוא קנה מידה גדול</strong> כי רואים בו פרטים גדולים וברורים (כמו זום חזק פנימה).
 </p>
 </div>

 <div className="surface-elevated p-6 sm:p-8 rounded-[4px] flex flex-col">
 <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent-hover mb-2.5">
 <span className="size-1.5 rounded-full bg-accent" aria-hidden />
 ההיגיון ההפוך
 </div>
 <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight text-accent-hover mb-3">
 ככל שהמספר גדול יותר — קנה המידה קטן יותר
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 ב-1:250,000 כל ס"מ במפה שווה ל-2.5 ק"מ בשטח — רואים את התמונה הגדולה אבל מאבדים את הפרטים. <strong className="text-fg">קנה מידה קטן = זום החוצה</strong>.
 </p>
 </div>
 </div>

 {/* Scale Selection — icon-topped segmented buttons (reference: lesson2part4image1.png) */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
 {SCALES.map((s) => {
const active = s.id === scale.id;
return (
 <motion.button
key={s.id}
onClick={() => setScale(s)}
whileTap={{ scale: 0.97 }}
transition={{ duration: 0.15 }}
className={cn(
 'flex flex-col items-center text-center gap-2 px-4 py-5 rounded-[4px] transition-colors',
active ? 'bg-cta-ember text-bg-elevated shadow-cta-ember' : 'bg-bg-elevated border border-border text-fg hover:border-accent/50'
 )}
 >
 <IconPlaceholder
className={cn('size-10 transition-colors', active ? 'border-bg-elevated/40 bg-bg-elevated/15' : 'border-border bg-bg-accent')}
 />
 <span className="font-display font-bold text-lg tabular-nums">{s.label}</span>
 <span className={cn('text-xs font-display font-medium tracking-wide', active ? 'text-bg-elevated/85' : 'text-fg-dim')}>
 קנה {s.size} · {s.who}
 </span>
 </motion.button>
 );
 })}
 </div>

 {/* Map + sidebar — one unified panel, map at inline-end, info sidebar at inline-start */}
 <div className="surface-elevated overflow-hidden">
 <div className="grid lg:grid-cols-[1fr_1.9fr] items-stretch">
 {/* Map Preview Area — first in DOM (mobile: shown above sidebar), placed at inline-end via order on desktop */}
 <div className="bg-bg relative overflow-hidden min-h-[320px] lg:order-2">
 <ScalePreview scale={scale} />
 </div>

 {/* Sidebar Controls & Info */}
 <div className="p-5 sm:p-6 flex flex-col lg:order-1 lg:border-e lg:border-border-subtle">
 <motion.div
key={scale.id}
initial={{ opacity: 0, x: 10 }}
animate={{ opacity: 1, x: 0 }}
transition={{ duration: 0.25, ease: 'easeOut' }}
 >
 <div className="flex items-center gap-2 mb-2.5">
 <IconPlaceholder className="size-6 border-border bg-bg-accent" />
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 רזולוציה קרטוגרפית
 </div>
 </div>
 <ul className="space-y-2 text-sm mb-4">
 {scale.detail.map((d) => (
 <li key={d} className="flex gap-2 items-start">
 <Icon name="check" size={14} className="text-accent mt-0.5 shrink-0" strokeWidth={3} />
 <span className="leading-tight">{d}</span>
 </li>
 ))}
 </ul>
 <div className="pt-3 border-t border-border-subtle">
 <div className="flex items-center gap-2 mb-1">
 <IconPlaceholder className="size-5 border-border bg-bg-accent" />
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">משימה אופיינית</div>
 </div>
 <div className="text-sm text-fg font-medium leading-relaxed">{scale.use}</div>
 </div>
 </motion.div>

 <div className="mt-5 pt-5 border-t border-border-subtle">
 <div className="flex items-center gap-2 mb-1">
 <IconPlaceholder className="size-6 border-border bg-bg-accent" />
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 מחשבון"מה המרחק?"
 </div>
 </div>
 <div className="text-xs text-fg-muted mb-3">
 כמה נלך ברגל? מדדו בס"מ וקבלו את המרחק האמיתי
 </div>

 <div className="flex items-end gap-2 mb-3">
 <input
type="number"
min={0.1}
max={100}
step={0.1}
value={mapDistance}
onChange={(e) => setMapDistance(Number(e.target.value) || 0)}
className="w-24 bg-bg-accent border border-border rounded-[3px] px-3 py-2 font-display font-medium tracking-wide text-xl tabular-nums focus:border-accent outline-none transition-colors"
 />
 <span className="text-fg-muted text-sm pb-2.5">ס״מ במפה</span>
 </div>

 <div className="flex items-center gap-2 text-fg-dim my-2">
 <svg
width="14"
height="14"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="1.8"
strokeLinecap="round"
strokeLinejoin="round"
className="sm:-rotate-90"
aria-hidden
 >
 <path d="M12 5v14M19 12l-7 7-7-7" />
 </svg>
 <span className="text-xs">מרחק אווירי בשטח</span>
 </div>

 <div className="flex items-baseline gap-2">
 <span className="font-display font-bold text-4xl tabular-nums text-accent">
 {realKm.toFixed(2)}
 </span>
 <span className="text-fg-muted text-sm font-medium">ק״מ</span>
 </div>

 <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] text-fg-dim font-display font-medium tracking-wide italic">
 * טיפ: במפת 1:50,000, פשוט מחלקים את הס"מ ב-2 כדי לקבל ק"מ.
 </div>
 </div>
 </div>
 </div>
 </div>

 <ProjectionCallout />
 </section>
 );
}
function ScalePreview({ scale }: { scale: Scale }) {
return (
 <div className="relative w-full h-full min-h-[320px] bg-bg">
 {SCALES.map((s) => (
 <motion.div
key={s.id}
initial={false}
animate={{ opacity: s.id === scale.id ? 1 : 0 }}
transition={{ duration: 0.35, ease: 'easeInOut' }}
className="absolute inset-0"
style={{ zIndex: s.id === scale.id ? 1 : 0 }}
 >
 <IsometricAsset
assetId={s.mapAsset.assetId}
src={s.mapAsset.src}
alt={s.mapAsset.alt}
aspect="4/3"
fit="cover"
eager
className="absolute inset-0 size-full [aspect-ratio:auto]"
 />
 </motion.div>
 ))}
 </div>
);
}
function ProjectionCallout() {
return (
 <motion.div
initial={{ opacity: 0, y: 20 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
className="mt-8 surface-elevated p-6 rounded-[3px]"
 >
 <div className="flex gap-4 items-start">
 <Icon name="globe" size={24} className="text-accent-cool shrink-0 mt-0.5" />
 <div className="flex-1">
 <div className="text-sm font-display font-semibold text-accent-cool mb-1 tracking-wider font-bold">
 למה כל מפה"משקרת" קצת?
 </div>
 <p className="text-fg leading-relaxed text-sm mb-6 text-pretty">
 כדור הארץ הוא כדור עגול, אבל המפה שלכם היא דף שטוח. אי אפשר לשטח כדור בלי למתוח או לקרוע אותו – תחשבו על ניסיון לשטח קליפה של תפוז על שולחן. 
 השיטה שבה בוחרים"למתוח" את העולם נקראת <strong>היטל</strong>, וכל בחירה כזו היא פשרה בין דיוק במרחק, בצורה או בכיוון.
 </p>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <ProjectionTile name="Transverse Mercator" scope="היטל צבאי מקומי" tradeoff="המדויק ביותר לישראל. משמש את צה''ל לניווט, תצפית וירי ארטילרי." 
 />
 <ProjectionTile name="Web Mercator" scope="גוגל מפות (Web)" tradeoff="נוח לניווט עירוני, אבל מעוות שטחים (גרינלנד נראית גדולה מאפריקה)." 
 />
 <ProjectionTile name="UTM" scope="סטנדרט נאט''ו" tradeoff="מחלק את העולם ל-60 רצועות דיוק. חיוני לעבודה עם צבאות זרים." 
 />
 </div>

 <div className="mt-6 p-4 bg-accent-cool/5 rounded-[3px] border border-accent-cool/10 text-xs text-fg-muted flex items-center gap-3">
 <svg
width="16"
height="16"
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
strokeWidth="2"
strokeLinecap="round"
strokeLinejoin="round"
className="text-accent-cool shrink-0"
aria-hidden
 >
 <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
 <path d="M12 9v4" />
 <path d="M12 17h.01" />
 </svg>
 <span>
 <strong className="text-fg-dim">טעות קריטית:</strong> שימוש בהיטל לא נכון בתכנון מסלול של טיל ארוך טווח יגרום להחטאת המטרה בעשרות קילומטרים בגלל עיוותי המפה.
 </span>
 </div>
 </div>
 </div>
 </motion.div>
 );
}
function ProjectionTile({ name, scope, tradeoff }: { name: string; scope: string; tradeoff: string }) {
return (
 <div className="surface p-4 border-t-2 border-accent-cool/20 rounded-b-lg">
 <div className="font-bold text-sm text-accent-cool mb-1">{name}</div>
 <div className="text-[10px] text-fg-dim mb-3 uppercase tracking-wider font-display font-medium">{scope}</div>
 <div className="text-fg-muted text-xs leading-relaxed">{tradeoff}</div>
 </div>
 );
}