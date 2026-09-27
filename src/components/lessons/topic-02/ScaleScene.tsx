'use client';
import { useState } from 'react';
import { SceneHeader } from './SceneHeader';
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
return <span aria-hidden className={cn('inline-block shrink-0 rounded-lg border border-dashed', className)} />;
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
          איך יחס של מספר אחד קטן — משנה את כל התמונה המבצעית
          </>
        }intro={`קנה מידה הוא הדרך שלנו להבין כמה השטח"התכווץ" כדי להיכנס למפה. הנוסחה פשוטה: 1 ס"מ במפה = X סנטימטרים במציאות. למשל ב-1:50,000, כל ס"מ במפה שווה ל-500 מטר בשטח.`}
 />

 {/* Concept · two rules read before choosing a scale — plain info text, so the picker below is the first strong surface */}
 <div className="grid md:grid-cols-2 gap-6 md:gap-10 mb-12">
 <div>
 <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance mb-2">
 גדול או קטן? <span className="font-medium text-fg-muted text-base md:text-lg">לפי הפירוט — לא המספר</span>
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 אל תסתכלו על המספר הגדול במכנה — תחשבו על רמת הפירוט. <strong className="text-fg">1:10,000 הוא קנה מידה גדול</strong> כי רואים בו פרטים גדולים וברורים (כמו זום חזק פנימה).
 </p>
 </div>

 <div>
 <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance mb-2">
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
 <button
key={s.id}
onClick={() => setScale(s)}
className={cn(
 'flex flex-col items-center text-center gap-2 px-4 py-5 rounded-xl border text-fg cursor-pointer transition-colors duration-200 ease-snap',
active ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]'
 )}
 >
 <IconPlaceholder className="size-10 border-border bg-bg-accent" />
 <span className="font-display font-bold text-lg tabular-nums">{s.label}</span>
 <span className="text-sm leading-snug text-fg-muted">
 קנה {s.size} · {s.who}
 </span>
 </button>
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
 <div className="p-5 sm:p-6 flex flex-col lg:order-1">
 {/* כל שלושת בלוקי המידע ממוקמים באותו תא גריד — גובה הסיידבר קבוע (לפי הגבוה
     מביניהם), כך שמעבר בין קני מידה לא משנה את גובה הפאנל ולא מכריח
     re-layout / re-raster של תמונות המפה. */}
 <div className="grid">
 {SCALES.map((s) => (
 <ScaleInfo key={s.id} scale={s} active={s.id === scale.id} />
 ))}
 </div>

 {/* the workspace's one divider — scale readout above, distance calculator below */}
 <div className="mt-5 pt-5 border-t border-border-subtle">
 <div className="text-base font-display font-bold text-fg mb-1">
 מחשבון"מה המרחק?"
 </div>
 <div className="text-sm leading-snug text-fg-muted mb-3">
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
className="w-24 bg-bg-elevated border border-border rounded-xl px-3 py-2 font-display font-medium text-xl tabular-nums hover:border-brand/30 focus:border-accent outline-none transition-colors duration-200 ease-snap"
 />
 <span className="text-fg-muted text-sm pb-2.5">ס״מ במפה</span>
 </div>

 {/* result — changes with the input above and the selected scale */}
 <div className="rounded-xl bg-bg-accent/60 px-4 py-3">
 <div className="text-sm text-fg-muted">מרחק אווירי בשטח</div>
 <div className="flex items-baseline gap-2">
 <span className="font-display font-bold text-4xl tabular-nums text-fg">
 {realKm.toFixed(2)}
 </span>
 <span className="text-fg-muted text-sm font-medium">ק״מ</span>
 </div>
 </div>

 <div className="mt-3 text-sm leading-snug text-fg-muted">
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
function ScaleInfo({ scale, active }: { scale: Scale; active: boolean }) {
return (
 // מעבר CSS ולא framer-motion: בסוף אנימציית WAAPI של framer יש פריים אחד שבו
 // הערך חוזר לערך הקודם (הבהוב). הבלוק היוצא נעלם מיד — בלי חפיפת טקסטים.
 <div
aria-hidden={!active}
className={cn(
 '[grid-area:1/1] will-change-[opacity,transform]',
active
 ? 'opacity-100 translate-x-0 transition-[opacity,transform] duration-[250ms] ease-out motion-reduce:transition-none'
 : 'invisible opacity-0 translate-x-[10px]',
 )}
 >
 <div className="text-base font-display font-bold text-fg mb-2">
 רזולוציה קרטוגרפית
 </div>
 <ul className="list-disc ps-5 space-y-1.5 text-sm leading-snug text-fg marker:text-fg-dim mb-5">
 {scale.detail.map((d) => (
 <li key={d}>{d}</li>
 ))}
 </ul>
 <div>
 <div className="text-base font-display font-bold text-fg mb-1">משימה אופיינית</div>
 <div className="text-sm text-fg leading-relaxed">{scale.use}</div>
 </div>
 </div>
);
}
function ScalePreview({ scale }: { scale: Scale }) {
return (
 <div className="relative w-full h-full min-h-[320px] bg-bg">
 {SCALES.map((s) => {
const active = s.id === scale.id;
return (
 // מעבר CSS ולא framer-motion: בסוף אנימציית WAAPI של framer הייתה חוזרת
 // לפריים אחד המפה הקודמת. המפה הנכנסת דוהה פנימה מעל היוצאת, והיוצאת
 // נשארת מלאה מתחתיה עד סוף ה-fade ורק אז נעלמת — בלי "שקיפות כפולה".
 // will-change: שכבת קומפוזיטור קבועה — ה-fade בלי re-raster של התמונה.
 <div
key={s.id}
className={cn(
 'absolute inset-0 will-change-[opacity] motion-reduce:transition-none',
active
 ? 'z-[1] opacity-100 transition-opacity duration-[350ms] ease-in-out'
 : 'z-0 opacity-0 transition-opacity duration-0 delay-[350ms]',
 )}
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
 </div>
 );
 })}
 </div>
);
}
function ProjectionCallout() {
return (
 <div className="mt-8 surface p-5 sm:p-6">
 <div className="font-display text-lg font-bold leading-snug text-fg md:text-xl mb-2">
 למה כל מפה"משקרת" קצת?
 </div>
 <p className="text-base text-fg leading-relaxed mb-6 text-pretty">
 כדור הארץ הוא כדור עגול, אבל המפה שלכם היא דף שטוח. אי אפשר לשטח כדור בלי למתוח או לקרוע אותו – תחשבו על ניסיון לשטח קליפה של תפוז על שולחן. 
 השיטה שבה בוחרים"למתוח" את העולם נקראת <strong>היטל</strong>, וכל בחירה כזו היא פשרה בין דיוק במרחק, בצורה או בכיוון.
 </p>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <ProjectionTile name="Transverse Mercator" scope="היטל צבאי מקומי" tradeoff="המדויק ביותר לישראל. משמש את צה''ל לניווט, תצפית וירי ארטילרי." 
 />
 <ProjectionTile name="Web Mercator" scope="גוגל מפות (Web)" tradeoff="נוח לניווט עירוני, אבל מעוות שטחים (גרינלנד נראית גדולה מאפריקה)." 
 />
 <ProjectionTile name="UTM" scope="סטנדרט נאט''ו" tradeoff="מחלק את העולם ל-60 רצועות דיוק. חיוני לעבודה עם צבאות זרים." 
 />
 </div>

 <div className="mt-6 rounded-xl bg-bg-accent/60 p-4 text-sm leading-relaxed text-fg-muted">
 <span>
 <strong className="text-fg">טעות קריטית:</strong> שימוש בהיטל לא נכון בתכנון מסלול של טיל ארוך טווח יגרום להחטאת המטרה בעשרות קילומטרים בגלל עיוותי המפה.
 </span>
 </div>
 </div>
 );
}
function ProjectionTile({ name, scope, tradeoff }: { name: string; scope: string; tradeoff: string }) {
return (
 <div>
 <div className="font-display text-base font-bold text-fg">{name}</div>
 <div className="text-sm text-fg-muted mb-2">{scope}</div>
 <div className="text-sm leading-relaxed text-fg">{tradeoff}</div>
 </div>
 );
}