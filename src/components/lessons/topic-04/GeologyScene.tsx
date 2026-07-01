'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
type Rock = {
id: 'igneous' | 'sediment' | 'metamorphic';
label: string;
english: string;
description: string;
examples: string;
military: string;
color: string;
};
const ROCKS: Rock[] = [
 {
id: 'igneous',
label: 'סלעי יסוד',
english: 'Igneous',
description: 'אלו סלעים שנוצרו מהתקרבות של מאגמה רותחת (לבה). הם נחשבים לסלעים הקשים והחזקים ביותר בטבע.',
examples: 'גרניט, בזלת',
military: 'כמעט בלתי אפשרי לחפור בהם ידנית. הם מהווים בסיס מעולה לבונקרים ומבנים כבדים, אך בגלל חוזקם, הם יוצרים לעיתים נוף חשוף וחד שקשה למצוא בו מחסה טבעי.',
color: 'text-accent-hot',
 },
 {
id: 'sediment',
label: 'סלעי משקע',
english: 'Sedimentary',
description: 'הצטברות של שכבות חול, שרידי בעלי חיים וצמחייה שנדחסו לאורך מיליוני שנים. אלו הסלעים הנפוצים ביותר בישראל (כמו גיר).',
examples: 'גיר, חוואר, אבן חול',
military: 'סלעים רכים יחסית שמאפשרים חפירה מהירה (גם של מנהרות ותעלות). הם נוטים ליצור נוף"רך" ומעוגל, אך הם פגיעים יותר להפצצות ועלולים להתפורר בקלות תחת אש ארטילרית.',
color: 'text-accent',
 },
 {
id: 'metamorphic',
label: 'סלעים מותמרים',
english: 'Metamorphic',
description: 'סלעים קיימים שעברו"גלגול" (התמרה) כתוצאה מחום קיצוני או לחץ אדיר בעומק האדמה, מה ששינה לחלוטין את תכונותיהם.',
examples: 'שיש, צפחה',
military: 'סלעים אלו מופיעים לרוב בשכבות דקות ושבירות, מה שהופך את המדרונות שלהם למסוכנים מאוד לטיפוס או לתנועה. הם נדירים באזורנו אך נפוצים מאוד ברכסי הרים גבוהים בעולם.',
color: 'text-accent-intel',
 },
];
type Force = {
id: 'endo' | 'exo';
label: string;
english: string;
scale: string;
what: string;
examples: string[];
icon: IconName;
};
const FORCES: Force[] = [
 {
id: 'endo',
label: 'כוחות מבפנים (אנדוגניים)',
english: 'Endogenic',
scale: 'מקרו-טופוגרפיה · הרים שלמים',
what: 'אלו הכוחות ה"בונים": תהליכים שמתרחשים עמוק מתחת לפני השטח (כמו תזוזת לוחות טקטוניים). הם אלו שיוצרים את המקרו-טופוגרפיה – רכסי ההרים העצומים, בקעים עמוקים והרי געש. הם קובעים את"המבנה הגדול" של שדה הקרב.',
examples: ['רכסי הרים שלמים', 'שברים ארוכים (כמו השבר הסורי-אפריקני)', 'הרי געש', 'רעידות אדמה'],
icon: 'mountain',
 },
 {
id: 'exo',
label: 'כוחות מבחוץ (אקסוגניים)',
english: 'Exogenic',
scale: 'מיקרו-טופוגרפיה · קפלי קרקע מקומיים',
what: 'אלו הכוחות ה"מפסלים": השפעות של מזג האוויר (גשם, רוח, שינויי טמפרטורה) שגורמות לבלייה (התפוררות הסלע). הם אלו שיוצרים את המיקרו-טופוגרפיה – ערוצי נחלים קטנים, מצוקים ודרדרות. הם אלו שקובעים אם תוכל להסתיר כוח בתוך כפל קרקע קטן.',
examples: ['ערוצי נחל וגיאיות', 'מצוקים שנגרסים מגלים', 'דיונות חול בנוצרות מרוח', 'דרדרות סלעים במדרונות'],
icon: 'wave',
 },
];
export function GeologyScene() {
const [rock, setRock] = useState<Rock['id']>('sediment');
const [force, setForce] = useState<Force['id']>('endo');
const rockData = ROCKS.find((r) => r.id === rock)!;
const forceData = FORCES.find((f) => f.id === force)!;
return (
 <section id="scene-geology" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="04.1"
eyebrow="גיאולוגיה צבאית"
title = {
  <>
    <span className="gradient-text">כדי להבין שטח — צריך להבין ממה הוא בנוי</span>
  </>
}intro='גיאולוגיה היא"תורת הסלע". היא מסבירה איך נוצר החומר שנמצא לנו מתחת לרגליים ואיך הוא מעצב את ההרים והעמקים שמעליו. בלי להבין את המבנה הפנימי של הקרקע, לא נוכל להעריך נכון את האתגרים שהשטח מציב לנו.'
 />

 <div className="grid md:grid-cols-2 gap-4 mb-12 items-stretch">
 <article className="surface-elevated p-5 sm:p-6 rounded-2xl">
 <div className="flex items-center gap-2 mb-3">
 <span className="size-2 rounded-full bg-accent shrink-0" aria-hidden />
 <span className="text-sm font-display font-semibold text-accent tracking-wider">למה זה קריטי?</span>
 </div>
 <h3 className="font-display font-bold text-lg leading-tight text-accent-hover mb-2">סוג הסלע = הצלחת המשימה</h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 סוג הסלע קובע אם הכוח שלך יתקע בבוץ אחרי הגשם הראשון, אם תוכל לחפור עמדות הגנה יציבות, ואם השטח עביר לטנקים או רק ללוחמים רגליים.
 </p>
 </article>
 <article className="surface-elevated p-5 sm:p-6 rounded-2xl">
 <div className="flex items-center gap-2 mb-3">
 <span className="size-2 rounded-full bg-accent shrink-0" aria-hidden />
 <span className="text-sm font-display font-semibold text-accent tracking-wider">מה זה משנה בפועל?</span>
 </div>
 <h3 className="font-display font-bold text-lg leading-tight text-accent-hover mb-2">מניחוש להחלטה מבצעית חכמה</h3>
 <p className="text-base text-fg leading-relaxed text-pretty">
 הבנת המסלע (סוג הסלע) הופכת ניחוש להחלטה: איפה לבסס בונקרים, איפה לנוע, איפה להניח גשר ואיפה לחפור מארב. בלי זה — אתה מתכנן באוויר.
 </p>
 </article>
 </div>

 <div className="my-12">
 <div className="mb-5">
 <h3 className="font-display font-bold text-xl leading-tight mb-1">3 סוגי הסלעים</h3>
 <p className="text-fg-muted text-sm">
 כל הסלעים בעולם נכנסים לאחת משלוש הקבוצות האלה. כל קבוצה — אופי שונה והשלכות צבאיות שונות.
 </p>
 </div>

 <div className="grid sm:grid-cols-3 gap-3 mb-4">
 {ROCKS.map((r, i) => {
const active = rock === r.id;
return (
 <button
key={r.id}
type="button"
onClick={() => setRock(r.id)}
className={cn(
 'surface p-4 text-right transition-all relative overflow-hidden',
active ? 'border-accent bg-bg-elevated' : 'border-border bg-bg-elevated hover:border-accent/50'
 )}
 >
 {active && (
 <motion.span
 layoutId="t4-rock-bar"
 className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
 />
 )}
 <div className="flex items-start gap-3 mb-2">
 <span
 className={cn(
 'size-10 rounded-xl flex items-center justify-center shrink-0 border transition-all font-display font-bold text-sm',
 active ? 'bg-accent text-bg-elevated border-accent' : 'bg-bg-accent text-fg-muted border-border'
 )}
 >
 {i + 1}
 </span>
 <div className="flex-1 min-w-0">
 <div className="font-display font-bold text-base text-fg leading-tight">{r.label}</div>
 <div className="font-display font-medium tracking-wide text-xs text-fg-dim mt-0.5">{r.english}</div>
 </div>
 </div>
 <div className="text-xs text-fg-muted leading-relaxed">{r.examples}</div>
 </button>
 );
 })}
 </div>

 <motion.div
key={rock}
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
className="surface-elevated p-5 sm:p-6 grid md:grid-cols-2 gap-6"
 >
 <div className="flex gap-4 items-start">
 <Icon name="layers" size={22} className="text-accent-cool shrink-0 mt-0.5" />
 <div>
 <div className="text-sm font-display font-semibold text-accent-cool mb-1.5 tracking-wider">
 איך נוצר ומאיפה?
 </div>
 <p className="text-sm leading-relaxed text-fg">{rockData.description}</p>
 </div>
 </div>
 <div className="flex gap-4 items-start">
 <Icon name="crosshair" size={22} className="text-accent shrink-0 mt-0.5" />
 <div>
 <div className="text-sm font-display font-semibold text-accent mb-1.5 tracking-wider">
 המשמעות הצבאית
 </div>
 <p className="text-sm leading-relaxed text-fg">{rockData.military}</p>
 </div>
 </div>
 </motion.div>
 </div>

 <div className="my-12">
 <div className="mb-5">
 <h3 className="font-display font-bold text-xl leading-tight mb-1">2 כוחות שמעצבים כל הר בכוכב הזה</h3>
 <p className="text-fg-muted text-sm">
 הנוף לא קיים סתם ככה. הוא נוצר מ-2 סוגי כוחות: כוחות שדוחפים מבפנים (יוצרים הרים), וכוחות
 שמבלים מבחוץ (חורצים גיאיות).
 </p>
 </div>

 <div className="grid lg:grid-cols-[1fr_1fr] gap-3 mb-4">
 {FORCES.map((f) => {
const active = force === f.id;
return (
 <button
key={f.id}
type="button"
onClick={() => setForce(f.id)}
className={cn(
 'surface p-5 text-right transition-all flex items-start gap-3 relative overflow-hidden',
active ? 'border-accent bg-bg-elevated' : 'border-border bg-bg-elevated hover:border-accent/50'
 )}
 >
 {active && (
 <motion.span
 layoutId="t4-force-bar"
 className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
 />
 )}
 <span
 className={cn(
 'size-10 rounded-xl flex items-center justify-center shrink-0 border transition-all',
 active ? 'bg-accent text-bg-elevated border-accent' : 'bg-bg-accent text-fg-muted border-border'
 )}
 >
 <Icon name={f.icon} size={20} />
 </span>
 <div className="flex-1 min-w-0">
 <div className="font-display font-bold text-base text-fg leading-tight">{f.label}</div>
 <div className="font-display font-medium tracking-wide text-xs text-fg-dim mt-0.5">{f.english}</div>
 <div className="font-display font-medium tracking-wide text-xs text-fg-muted mt-1.5">{f.scale}</div>
 </div>
 </button>
 );
 })}
 </div>

 <motion.div
key={force}
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
className="surface-elevated p-5 sm:p-6"
 >
 <p className="text-sm sm:text-base text-fg leading-relaxed mb-4">{forceData.what}</p>
 <div className="text-sm font-display font-semibold text-fg-muted mb-2 tracking-wider">דוגמאות בנוף</div>
 <div className="grid sm:grid-cols-2 gap-2">
 {forceData.examples.map((e) => (
 <div key={e} className="flex gap-2 items-start text-sm">
 <Icon name="check" size={14} className="text-accent mt-1 shrink-0" strokeWidth={2.5} />
 <span className="text-fg-muted">{e}</span>
 </div>
 ))}
 </div>
 </motion.div>
 </div>

 <motion.div
initial={{ opacity: 0 }}
whileInView={{ opacity: 1 }}
viewport={{ once: true }}
className="surface-elevated p-6 flex gap-4 items-start"
 >
 <Icon name="spark" size={22} className="text-accent shrink-0 mt-0.5" />
 <div>
 <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">בשורה התחתונה</div>
 <p className="text-fg leading-relaxed text-pretty">
 הנוף הוא"מאבק" תמידי: הכוחות הפנימיים דוחפים למעלה ובונים הרים, בעוד הכוחות החיצוניים מנסים לשחוק ולשטח אותם. סוג הסלע הוא זה שקובע מי מנצח ובאיזו מהירות – וזה ההבדל בין צוק בזלת חד ובלתי עביר לבין גבעת גיר רכה ונוחה לתנועה.
 </p>
 </div>
 </motion.div>
 </section>
 );
}
