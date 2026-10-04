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
who: 'תכנון מקומי מפורט',
use: 'תכנון תנועה בתוך יישוב או במרחב מצומצם, תוך התייחסות למבנים ולדרכים.',
detail: ['מציג שטח מצומצם ברמת פירוט גבוהה', 'מאפשר להציג מבנים ודרכים מקומיות', 'כל ס״מ במפה מייצג 100 מטר בשטח'],
mapAsset: {
assetId: 'TOPIC02-SCALE-10K',
src: '/assets/lessons/topic02/scene-scale/TOPIC02-SCALE-10K.webp',
alt: 'המחשה לקנה מידה 1:10,000: יישוב עם מבנים, כבישים ונחל',
},
 },
 {
id: '50k',
ratio: 50000,
label: '1:50,000',
size: 'בינוני',
who: 'ניווט ותכנון תנועה',
use: 'בחינת מסלול ניווט והקשר בין צורות השטח, היישובים והדרכים שלאורכו.',
detail: ['משלב פירוט עם הצגת מרחב רחב יותר', 'מציג יישובים, נחלים ודרכי עפר', 'כל ס״מ במפה מייצג 500 מטר בשטח'],
mapAsset: {
assetId: 'TOPIC02-SCALE-50K',
src: '/assets/lessons/topic02/scene-scale/TOPIC02-SCALE-50K.webp',
alt: 'המחשה לקנה מידה 1:50,000: כמה יישובים, נחל וכבישים אזוריים',
},
 },
 {
id: '250k',
ratio: 250000,
label: '1:250,000',
size: 'קטן',
who: 'תכנון אזורי',
use: 'בחינת אזור נרחב והקשרים בין ערים, דרכים ראשיות ומרחבי פעילות.',
detail: ['מציג אזור נרחב ברמת פירוט כללית', 'מדגיש ערים ודרכים ראשיות', 'כל ס״מ במפה מייצג 2.5 ק״מ בשטח'],
mapAsset: {
assetId: 'TOPIC02-SCALE-250K',
src: '/assets/lessons/topic02/scene-scale/TOPIC02-SCALE-250K.webp',
alt: 'המחשה לקנה מידה 1:250,000: אזור נרחב הכולל ערים והרים',
},
 },
];
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
          קנה מידה: הקשר בין המרחק במפה למרחק בשטח
          </>
        }intro={`קנה מידה הוא היחס בין מרחק במפה למרחק האופקי המקביל בשטח, באותן יחידות מידה. למשל, במפה בקנה מידה 1:50,000, ס״מ אחד מייצג 50,000 ס״מ בשטח, שהם 500 מטר.`}
 />

 {/* Concept · two rules read before choosing a scale — plain info text, so the picker below is the first strong surface */}
 <div className="grid md:grid-cols-2 gap-6 md:gap-10 mb-12">
 <div>
 <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance mb-2">
 קנה מידה גדול <span className="font-medium text-fg-muted text-base md:text-lg">שטח מצומצם, יותר פירוט</span>
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 <strong className="text-fg">1:10,000 הוא קנה מידה גדול יותר מ־1:50,000.</strong> באותו גודל של מפה, הוא מציג שטח מצומצם יותר ומאפשר להציג יותר פרטים.
 </p>
 </div>

 <div>
 <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance mb-2">
 ככל שהמכנה גדל, קנה המידה קטן
 </h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 המכנה הוא המספר שאחרי הנקודתיים. ב־1:250,000 כל ס״מ מייצג 2.5 ק״מ בשטח. <strong className="text-fg">באותו גודל של מפה מוצג שטח נרחב יותר, עם פחות פרטים.</strong>
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
 // options sit on the textured page — the tint lives on a ::before layer over an opaque white base, so hover/selected never let the page texture through
 'relative isolate flex flex-col items-center text-center gap-2 px-4 py-5 rounded-xl border bg-bg-elevated text-fg cursor-pointer transition-colors duration-200 ease-snap before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap',
active ? 'border-accent before:bg-accent/10' : 'border-border hover:border-brand/30 hover:before:bg-brand/[0.03]'
 )}
 >
 {/* Zoom-level icon goes here once the user supplies it (assumptions 2026-09-14). The empty dashed slot was removed by the 2026-09-28 cleanup decision — it read as unfinished. */}
 <span className="font-display font-bold text-lg tabular-nums">{s.label}</span>
 <span className="text-sm leading-snug text-fg-muted">
 קנה מידה {s.size} · {s.who}
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
 חישוב מרחק בשטח
 </div>
 <div className="text-sm leading-snug text-fg-muted mb-3">
 בחרו קנה מידה והזינו מרחק בס״מ במפה כדי לחשב את המרחק בשטח.
 </div>

 <div className="flex items-end gap-2 mb-3">
 <input
type="number"
min={0.1}
max={100}
step={0.1}
value={mapDistance}
aria-label="מרחק במפה בסנטימטרים"
onChange={(e) => setMapDistance(Number(e.target.value) || 0)}
className="w-24 bg-bg-elevated border border-border rounded-xl px-3 py-2 font-display font-medium text-xl tabular-nums hover:border-brand/30 focus:border-accent outline-none transition-colors duration-200 ease-snap"
 />
 <span className="text-fg-muted text-sm pb-2.5">ס״מ במפה</span>
 </div>

 {/* result — changes with the input above and the selected scale */}
 <div className="rounded-xl bg-bg-accent/60 px-4 py-3">
 <div className="text-sm text-fg-muted">מרחק אופקי בשטח</div>
 <div className="flex items-baseline gap-2">
 <span className="font-display font-bold text-4xl tabular-nums text-fg">
 {realKm.toFixed(2)}
 </span>
 <span className="text-fg-muted text-sm font-medium">ק״מ</span>
 </div>
 </div>

 <div className="mt-3 text-sm leading-snug text-fg-muted">
 במפה בקנה מידה 1:50,000, מחלקים את המרחק בס״מ ב־2 לקבלת ק״מ. החישוב אינו כולל את השפעת השיפועים על אורך המסלול.
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
 רמת הפירוט והמרחקים
 </div>
 <ul className="list-disc ps-5 space-y-1.5 text-sm leading-snug text-fg marker:text-fg-dim mb-5">
 {scale.detail.map((d) => (
 <li key={d}>{d}</li>
 ))}
 </ul>
 <div>
 <div className="text-base font-display font-bold text-fg mb-1">דוגמה לשימוש</div>
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
 מדוע נוצרים עיוותים במפה?
 </div>
 <p className="text-base text-fg leading-relaxed mb-6 text-pretty">
 פני כדור הארץ קמורים, והמפה שטוחה. השיטה המתמטית להעברת פני השטח למפה נקראת <strong>היטל</strong>.
 אין היטל ששומר בו־זמנית על כל המרחקים, השטחים, הצורות והכיוונים. לכן בוחרים היטל שמתאים לאזור המוצג ולמטרת המפה.
 </p>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <ProjectionTile name="Transverse Mercator" scope="היטל מרקטור רוחבי" tradeoff="מאפשר לצמצם עיוותים לאורך רצועה מצפון לדרום. רשת ישראל החדשה (ITM) מבוססת על היטל זה."
 />
 <ProjectionTile name="Web Mercator" scope="היטל נפוץ במפות מקוונות" tradeoff="משמש להצגת מפות באינטרנט. עיוותי השטח והמרחק גדלים ככל שמתרחקים מקו המשווה."
 />
 <ProjectionTile name="UTM" scope="מערכת קואורדינטות אזורית" tradeoff="מחלקת את העולם ל־60 אזורים לאורך קווי האורך, למעט אזורי הקטבים. בכל אזור משתמשים בהיטל מרקטור רוחבי המותאם לו."
 />
 </div>

 <div className="mt-6 rounded-xl bg-bg-accent/60 p-4 text-sm leading-relaxed text-fg-muted">
 <span>
 <strong className="text-fg">לפני מדידה או שילוב מפות:</strong> בדקו את קנה המידה ואת מערכת הקואורדינטות. הבדלים בין מערכות עלולים ליצור שגיאות במיקום ובמדידה אם לא מבצעים המרה מתאימה.
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
