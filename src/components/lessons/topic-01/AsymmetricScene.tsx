'use client';
import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
type Pillar = {
id: string;
label: string;
icon: IconName;
oneLiner: string;
detail: string;
color: string;
};
const PILLARS: Pillar[] = [
 {
id: 'persistence',
label: 'ספיגה והתמדה',
icon: 'hourglass',
oneLiner: 'הזמן עובד לטובתם. המטרה היא פשוט לשרוד את המכות.',
detail:"ארגון טרור מבין מראש שהוא לא יכול להשמיד צבא של מדינה, אז המטרה שלו היא פשוט לא להפסיד. מבחינתו, כל יום שבו הוא נשאר בחיים וממשיך לירות – נחשב לניצחון. הוא מנצל את העובדה שלמדינה יש 'שעון חול': המלחמה עולה לה מיליארדים, חיילי המילואים נשחקים, ויש לחץ בינלאומי. החלש פשוט מנסה להישאר על הרגליים עד שהחזק יקרוס מבפנים.",
color: 'text-accent-cool',
 },
 {
id: 'deterrence',
label: 'הרתעה אסימטרית',
icon: 'megaphone',
oneLiner: 'עוקפים את החזית – תוקפים את האזרחים בעורף במקום את החיילים.',
detail:"כשהצד החלש לא מצליח לחדור שריון של טנק או להפיל מטוסי קרב, הוא פשוט 'מדלג' עליהם. במקום להילחם מול הצבא פנים אל פנים, הוא יורה טילים זולים ורחפנים ישירות על הערים של המדינה החזקה. המטרה היא לשתק את הכלכלה, לזרוע פאניקה ולגרום לאזרחים המפוחדים ללחוץ על הממשלה שלהם לעצור את המלחמה מיד.",
color: 'text-accent-hot',
 },
 {
id: 'attrition',
label: 'התשה',
icon: 'shield',
oneLiner: 'להפוך את המלחמה לבוץ יקר, מתסכל וחסר תועלת.',
detail: `הצד החלש עובד בשיטת 'עקיצות קטנות': צלף יורה מהחלון ונעלם לפיר של מנהרה, או מטען חבלה קטן שמתפוצץ משום מקום. הלוחמים גורמים למדינה החזקה להוציא מאות אלפי דולרים על פצצות נגד מטרות ריקות או כטב"מים מפלסטיק. הטפטוף המעצבן והבלתי פוסק הזה נועד לייאש את הצבא החזק ולגרום לו להרגיש שהוא מנסה להילחם ברוחות רפאים.`,
color: 'text-accent-intel',
 },
];
const TRAITS: { icon: IconName; title: string; desc: string }[] = [
 {
icon: 'mask',
title: 'הסתרה והסוואה',
desc:"החוק הראשון הוא לא לבלוט. אין להם מדים, אין שיירות ג'יפים מאורגנות ואין בסיסים מסודרים במדבר. הלוחמים מתלבשים כמו אזרחים רגילים ונבלעים בסביבה. למה? כי הם מבינים שברגע שמטוס קרב או רחפן מזהה אותם – ייקח בדיוק 10 שניות להשמיד אותם.",
 },
 {
icon: 'people',
title: 'להתערבב עם אזרחים',
desc: 'במקום שדה קרב פתוח, הם ממקמים מפקדות ומשגרי טילים בתוך בתי חולים, בתי ספר ושכונות מגורים צפופות. זה תוקע את הצבא החזק בדילמה אכזרית: האם לתקוף ולחטוף אש מהעולם על פגיעה בחפים מפשע, או פשוט לוותר על חיסול המטרה ולתת למחבלים לברוח?',
 },
 {
icon: 'eye',
title: 'להיות"שקטים" טכנולוגית',
desc: 'איך מתחבאים מצבא שקולט כל שיחת טלפון ורואה הכל מהחלל? יורדים מהרדאר. הצד החלש עוזב את הסמארטפונים ועובר להעביר פתקים מנייר דרך שליחים ברגל. בנוסף, נמנעים מנסיעה ברכבים שפולטים חום שלוויינים יכולים לקלוט. הרי אי אפשר לעשות מתקפת סייבר על פתק נייר.',
 },
 {
icon: 'bolt',
title: 'לפגוע בזול בנשק יקר',
desc: 'מתמטיקה פשוטה: למה לפתח תעשיית נשק אם אפשר לקנות רחפן צעצוע ב-300 דולר, לחבר לו רימון, ולשתק טנק טכנולוגי שעולה 5 מיליון דולר? האסטרטגיה היא כלכלית נטו – להכריח את הצד החזק לבזבז הון עתק וטילי יירוט יקרים על איומים שעולים גרושים.',
 },
 {
icon: 'megaphone',
title: 'דעת הקהל היא שדה הקרב האמיתי',
desc: 'הסמארטפון קטלני לא פחות מרובה. הצד החלש מתעד בניינים הרוסים ואזרחים פגועים ומפיץ ברשתות כדי לזעזע את העולם. הם יודעים שלחץ בינלאומי וסרטונים ויראליים שמגיעים לאו"ם, יבלמו ויעצרו את הצבא החזק הרבה לפני שייגמרו לו הטילים במחסנים.',
 },
];
export function AsymmetricScene() {
return (
 <section id="scene-asymmetric" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="01.3"
eyebrow="לחימה אסימטרית"
title={
          <>
          כשעוצמה צבאית פוגשת ארגון לא סדיר — <span className="gradient-text">חוקי המלחמה נכתבים מחדש</span>
          </>
        }
        intro={`פעם, מלחמות היו פשוטות כמו בסרטים: צבא מול צבא, טנק מול טנק. היום המציאות נראית כמו 'באג' במשחק: מעצמות ענק עם טכנולוגיה מטורפת (כמו ארה"ב או ישראל) מוצאות את עצמן נלחמות מול ארגוני טרור קטנים. הפער העצום הזה בכוח יוצר מלחמה עם חוקים חדשים לגמרי, שבהם הצד החלש פשוט חייב לשבור את כל הכללים כדי לשרוד.`}
 />

 <div className="p-5 mb-6">
 <div className="flex gap-3 items-start">
 <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
 <div className="text-sm leading-relaxed">
 <strong className="text-fg">מילון קצר:</strong>
 <ul className="mt-2 space-y-1 text-fg-muted">
 <li>· <strong className="text-fg">צד חזק (צבא סדיר)</strong> — המדינה. גוף שיש לו צבא מאורגן, חיילים במדים, שרשרת פיקוד מסודרת, מטוסי קרב, טנקים ותקציבי עתק.</li>
 <li>· <strong className="text-fg">צד חלש (לא-סדיר)</strong> — ארגון ללא מדינה (טרור או גרילה). חבורה של לוחמים בלי מדים, שנטמעים בכוונה בתוך אוכלוסייה אזרחית ברחוב ומשתמשים בנשק פשוט וזול.</li>
 <li>· <strong className="text-fg">אסימטריה</strong> — בשתי מילים –"לא כוחות". המילה 'סימטרי' אומרת ששני הצדדים שווים. 'אסימטרי' זה מצב של חוסר שוויון קיצוני, שבו צד אחד חזק משמעותית מהשני על הנייר – מה שמשנה לגמרי את כל אופי הלחימה.</li>
 </ul>
 </div>
 </div>
 </div>

 <GapVisual />

 <div className="my-12">
 <div className="mb-5">
 <h3 className="font-display font-bold text-xl leading-tight mb-1">3 עמודי האסטרטגיה של הצד החלש</h3>
 </div>

 <div className="grid gap-3 md:grid-cols-3">
 {PILLARS.map((p, i) => (
 <motion.div
key={p.id}
initial={{ opacity: 0, y: 18 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
transition={{ delay: i * 0.1 }}
className="surface text-right p-5 sm:p-6 relative overflow-hidden flex flex-col"
 >
 <div className="flex items-start gap-3 mb-3 relative">
 <div className="size-10 rounded-xl border border-border bg-bg-accent flex items-center justify-center shrink-0">
 <Icon name={p.icon} size={20} className={p.color} />
 </div>
 <div className="min-w-0 flex-1">
 <div className="text-sm font-display font-semibold text-fg-muted mb-0.5 tracking-wider">
 עמוד {i + 1} · האסטרטגיה של החלש
 </div>
 <h4 className="font-display font-bold text-base sm:text-lg leading-tight text-balance mb-2">{p.label}</h4>
 </div>
 </div>

 <p className="text-sm leading-relaxed text-fg-muted mb-3">
 {p.oneLiner}
 </p>
 <p className="text-sm leading-relaxed text-fg pt-3 border-t border-border-subtle">
 {p.detail}
 </p>
 </motion.div>
 ))}
 </div>
 </div>

 <TimeAsymmetry />

 <div className="my-12">
 <div className="mb-5">
 <h3 className="font-display font-bold text-xl leading-tight mb-1">5 טקטיקות של הצד החלש</h3>
 <p className="text-fg-muted text-sm">איך הוא משתמש במרחב, באוכלוסייה ובטכנולוגיה כדי לשרוד מול ענק</p>
 </div>

 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
 {TRAITS.map((t, i) => (
 <motion.div
key={t.title}
initial={{ opacity: 0, y: 14 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
transition={{ delay: i * 0.06 }}
className="surface p-5 relative overflow-hidden"
 >
 <div className="absolute -end-8 -top-8 size-20 rounded-full bg-accent/5 blur-2xl pointer-events-none" />
 <div className="relative flex items-start justify-between mb-3">
 <div className="size-11 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center">
 <Icon name={t.icon} size={22} className="text-accent" />
 </div>
 <span className="font-mono text-xs text-fg-dim">
 {String(i + 1).padStart(2, '0')}
 </span>
 </div>
 <h4 className="font-display font-semibold mb-1.5 leading-tight">{t.title}</h4>
 <p className="text-sm text-fg-muted leading-relaxed">{t.desc}</p>
 </motion.div>
 ))}
 </div>
 </div>

 <motion.div
initial={{ opacity: 0 }}
whileInView={{ opacity: 1 }}
viewport={{ once: true }}
className="surface-elevated p-6 flex gap-4 items-start"
 >
 <Icon name="spark" size={22} className="text-accent shrink-0 mt-0.5" />
 <div>
 <div className="text-sm font-display font-semibold text-accent-hover mb-1 tracking-wider">
 המסקנה: זורקים את ספר החוקים הישן לפח
 </div>
 <p className="text-fg leading-relaxed text-pretty">
צבא מסורתי התאמן במשך שנים להילחם"ראש בראש": חזית מול חזית, מדים מול מדים. אבל כשאתה נלחם באויב שנעלם מתחת לאדמה ויורה מתוך גן ילדים – כל החוקים הישנים קורסים. כדי לנצח כאוס כזה, אי אפשר רק לשלוח עוד טנקים. הצבא חייב לשנות דיסקט, להמציא טכנולוגיות חדשות, ולאסוף מודיעין מסוג אחר לגמרי. את הכלים האלה בדיוק נלמד בשיעורים הבאים. </p>
 </div>
 </motion.div>
 </section>
 );
}
type CompareRow = {
label: string;
strong: string;
strongExample: string;
weak: string;
weakExample: string;
};
const COMPARE_ROWS: CompareRow[] = [
 {
label: 'מי זה בדרך כלל',
strong: 'מדינה ריבונית (ארה"ב, רוסיה, ישראל).',
strongExample: '',
weak: 'ארגון או מיליציה בלי מדינה (חמאס, חיזבאללה, החות\'ים).',
weakExample: '',
 },
 {
label: 'תקציב שנתי',
strong: 'עשרות ומאות מיליארדי דולרים מתקציב המדינה.',
strongExample: '',
weak: 'מיליונים בודדים (שוק שחור, תרומות והברחות).',
weakExample: '',
 },
 {
label: 'סוגי הנשק',
strong: 'טכנולוגיית קצה חכמה – מטוסי חמקן (F-35 שעולה 80 מיליון $), טנקים, לוויינים מדוייקים.',
strongExample: '',
weak: 'נשק מדף ואלתורים – רובי קלצ\'ניקוב, מטענים ורחפני צעצוע מאמזון עם רימון מחובר.',
weakExample: '',
 },
 {
label: 'מי הלוחמים',
strong: 'חיילים מקצועיים במדים, יחידות מובחרות שעברו מסלול אימונים ארוך.',
strongExample: '',
weak: 'אזרחים בלי מדים. בלתי אפשרי להבדיל בינם לבין עובר אורח תמים ברחוב.',
weakExample: '',
 },
 {
label: 'איפה הם נמצאים',
strong: 'במטרות גלויות על המפה – בסיסים מסודרים, שדות תעופה ומחנות ענק.',
strongExample: '',
weak: 'מתחת לאדמה במנהרות, או מתחבאים בתוך בתי חולים, בתי ספר ודירות מסתור צפופות.',
weakExample: '',
 },
 {
label: 'מה המטרה',
strong: 'נוק-אאוט. להשמיד את כוח האויב לחלוטין ולהכריע את המלחמה כמה שיותר מהר.',
strongExample: '',
weak: 'רק לשרוד. מבינים שלא ינצחו, אז המטרה היא \'לא להפסיד\', למשוך זמן ולייאש את החזק.',
weakExample: '',
 },
];
function GapVisual() {
return (
 <div className="surface-elevated overflow-hidden">
 {/* Header row */}
 <div className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-border-strong">
 <div className="p-4 bg-bg-accent/40">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">השוואה</div>
 </div>
 <div className="p-4 bg-accent-hot/10 border-r border-border-strong">
 <div className="flex items-center gap-2 mb-1">
 <Icon name="tank" size={20} className="text-accent-hot" />
 <div className="font-display font-bold text-base">צד חזק</div>
 </div>
 <div className="text-xs text-accent-hot font-mono">מדינה · צבא סדיר</div>
 </div>
 <div className="p-4 bg-accent-cool/10 border-r border-border-strong">
 <div className="flex items-center gap-2 mb-1">
 <Icon name="mask" size={20} className="text-accent-cool" />
 <div className="font-display font-bold text-base">צד חלש</div>
 </div>
 <div className="text-xs text-accent-cool font-mono">ארגון לא־סדיר · גרילה</div>
 </div>
 </div>

 {/* Comparison rows */}
 {COMPARE_ROWS.map((row, i) => (
 <motion.div
key={row.label}
initial={{ opacity: 0, y: 10 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, amount: 0.2 }}
transition={{ delay: i * 0.05 }}
className={cn(
 'grid grid-cols-[1.2fr_1fr_1fr] border-b border-border-subtle last:border-b-0',
i % 2 === 0 ? 'bg-bg-card/40' : 'bg-transparent'
 )}
 >
 <div className="p-4 bg-bg-accent/30 flex items-center">
 <div className="text-sm font-medium">{row.label}</div>
 </div>
 <div className="p-4 border-r border-border-subtle">
 <div className="text-sm text-fg leading-snug mb-1">{row.strong}</div>
 <div className="text-xs text-fg-dim leading-relaxed">{row.strongExample}</div>
 </div>
 <div className="p-4 border-r border-border-subtle">
 <div className="text-sm text-fg leading-snug mb-1">{row.weak}</div>
 <div className="text-xs text-fg-dim leading-relaxed">{row.weakExample}</div>
 </div>
 </motion.div>
 ))}

 {/* Footer */}
 <div className="grid grid-cols-[1.2fr_1fr_1fr] bg-bg-accent/30">
 <div className="p-4 flex items-center gap-2 border-r border-border-subtle">
 <Icon name="scale" size={18} className="text-accent" />
 <span className="text-sm font-display font-semibold text-accent-hover tracking-wider">פער אסימטרי</span>
 </div>
 <div className="p-4 col-span-2 text-xs text-fg-muted leading-relaxed border-r border-border-subtle">
על הנייר, הצד החזק אמור למחוץ את הצד החלש ביום אחד. בדיוק בגלל זה הצד החלש בורח מקרב"ראש בראש" בשטח פתוח. במקום זה, הוא גורר את הצבא הגדול למגרש שלו: סמטאות צפופות ומנהרות – המקום היחיד שבו המטוסים והטנקים מאבדים את היתרון הטכנולוגי שלהם. </div>
 </div>
 </div>
 );
}

// ────────────────────────────────────────────────────────────────────────────
// TimeAsymmetry — "why is time the secret weapon of the weak side?"
// Reframed as a count of *fronts*. The strong side fights 5 in parallel
// (the enemy + 4 internal pressures that can each force them to stop).
// The weak side fights only 1 (survival). Static comparison, no metaphor.
// ────────────────────────────────────────────────────────────────────────────

const OPPONENTS: {
  title: string;
  desc: string;
  icon: IconName;
  strongActive: boolean;
  weakActive: boolean;
}[] = [
  {
    title: 'האויב בשטח',
    desc: 'לוחמי גרילה, מנהרות, רקטות — היריב הצבאי המוצהר.',
    icon: 'mask',
    strongActive: true,
    weakActive: true,
  },
  {
    title: 'משרד האוצר',
    desc: 'תקציב המדינה נשרף — מיליארדי דולרים בשבוע, מילואים, פגיעה בעורף.',
    icon: 'fuel',
    strongActive: true,
    weakActive: false,
  },
  {
    title: 'דעת הקהל',
    desc: 'תמונות מהזירה, לוויות חיילים, תמיכה ציבורית שנשחקת מיום ליום.',
    icon: 'megaphone',
    strongActive: true,
    weakActive: false,
  },
  {
    title: 'הפוליטיקה הפנימית',
    desc: 'הכנסת, הקונגרס, אופוזיציה, ועדות חקירה, שעון הבחירות.',
    icon: 'capital',
    strongActive: true,
    weakActive: false,
  },
  {
    title: 'הבמה הבינלאומית',
    desc: 'או"ם, בעלות ברית, האג, סנקציות — כולם דורשים "הפסקת אש מיד".',
    icon: 'globe',
    strongActive: true,
    weakActive: false,
  },
];

function TimeAsymmetry() {
  return (
    <div className="my-12">
      <div className="mb-5">
        <h3 className="font-display font-bold text-xl leading-tight mb-1">למה הזמן הוא הנשק הסודי של הצד החלש?</h3>
        <p className="text-fg-muted text-sm">
          המעצמה לא נלחמת רק באויב שמולה — היא לוחמת בו-זמנית בעוד 4 חזיתות פנימיות שכופות עליה לסיים. ארגון הטרור — בחזית אחת בלבד.
        </p>
      </div>

      {/* Two hero stat cards: 5 vs 1 */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="surface-elevated p-5 sm:p-6 relative overflow-hidden"
        >
          <div aria-hidden className="absolute -top-12 -end-12 size-40 rounded-full bg-accent-hot/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="grid place-items-center size-12 rounded-xl bg-accent-hot/10 border border-accent-hot/30 shrink-0">
              <Icon name="tank" size={22} className="text-accent-hot" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-display font-semibold tracking-wider text-accent-hot mb-1">
                צד חזק · מדינה
              </div>
              <div className="flex items-baseline gap-2">
                <div className="font-display font-bold text-5xl tabular-nums text-accent-hot leading-none">
                  5
                </div>
                <div className="text-sm text-fg-muted leading-tight">
                  חזיתות פעילות
                  <br />
                  בו-זמנית
                </div>
              </div>
              <div className="text-xs text-fg-muted mt-3 leading-relaxed">
                צריך לנצח <strong className="text-fg">בכל אחת מהן</strong> — אחרת המלחמה נגמרת מבפנים.
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="surface-elevated p-5 sm:p-6 relative overflow-hidden"
        >
          <div aria-hidden className="absolute -top-12 -end-12 size-40 rounded-full bg-accent-cool/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="grid place-items-center size-12 rounded-xl bg-accent-cool/10 border border-accent-cool/30 shrink-0">
              <Icon name="mask" size={22} className="text-accent-cool" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-display font-semibold tracking-wider text-accent-cool mb-1">
                צד חלש · ארגון לא-סדיר
              </div>
              <div className="flex items-baseline gap-2">
                <div className="font-display font-bold text-5xl tabular-nums text-accent-cool leading-none">
                  1
                </div>
                <div className="text-sm text-fg-muted leading-tight">
                  חזית אחת
                  <br />
                  (לשרוד)
                </div>
              </div>
              <div className="text-xs text-fg-muted mt-3 leading-relaxed">
                צריך רק <strong className="text-fg">לא לאבד אותה</strong> — וזה מספיק לניצחון.
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* The opponent table */}
      <div className="surface-elevated overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] border-b border-border-strong">
          <div className="p-3 sm:p-4 bg-bg-accent/40">
            <div className="text-xs font-display font-semibold text-fg-muted tracking-wider">
              מי באמת יכול להכריח אותך לסיים את המלחמה?
            </div>
          </div>
          <div className="px-3 sm:px-4 py-3 bg-accent-hot/10 border-r border-border-strong text-center min-w-[68px] sm:min-w-[88px]">
            <div className="text-xs font-display font-semibold tracking-wider text-accent-hot">
              חזק
            </div>
          </div>
          <div className="px-3 sm:px-4 py-3 bg-accent-cool/10 border-r border-border-strong text-center min-w-[68px] sm:min-w-[88px]">
            <div className="text-xs font-display font-semibold tracking-wider text-accent-cool">
              חלש
            </div>
          </div>
        </div>

        {OPPONENTS.map((o, i) => (
          <motion.div
            key={o.title}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.06 }}
            className={cn(
              'grid grid-cols-[1fr_auto_auto] border-b border-border-subtle last:border-b-0',
              i % 2 === 0 ? 'bg-bg-card/40' : 'bg-transparent',
            )}
          >
            <div className="p-3 sm:p-4 flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-lg border border-border bg-bg-accent flex items-center justify-center shrink-0">
                <Icon name={o.icon} size={18} className="text-accent" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-semibold text-sm leading-tight">
                  {o.title}
                </div>
                <div className="text-xs text-fg-muted leading-snug mt-0.5">
                  {o.desc}
                </div>
              </div>
            </div>
            <div className="px-3 sm:px-4 py-3 border-r border-border-subtle flex items-center justify-center min-w-[68px] sm:min-w-[88px]">
              {o.strongActive ? (
                <span className="inline-flex items-center justify-center size-7 rounded-full bg-accent-hot/15 text-accent-hot border border-accent-hot/40">
                  <Icon name="check" size={14} strokeWidth={3} />
                </span>
              ) : (
                <span className="inline-flex items-center justify-center size-7 rounded-full bg-bg-accent text-fg-dim border border-border-subtle font-mono text-sm leading-none">
                  —
                </span>
              )}
            </div>
            <div className="px-3 sm:px-4 py-3 border-r border-border-subtle flex items-center justify-center min-w-[68px] sm:min-w-[88px]">
              {o.weakActive ? (
                <span className="inline-flex items-center justify-center size-7 rounded-full bg-accent-cool/15 text-accent-cool border border-accent-cool/40">
                  <Icon name="check" size={14} strokeWidth={3} />
                </span>
              ) : (
                <span className="inline-flex items-center justify-center size-7 rounded-full bg-bg-accent text-fg-dim border border-border-subtle font-mono text-sm leading-none">
                  —
                </span>
              )}
            </div>
          </motion.div>
        ))}

        {/* Totals footer */}
        <div className="grid grid-cols-[1fr_auto_auto] bg-bg-accent/30 border-t border-border-strong">
          <div className="p-3 sm:p-4 flex items-center gap-2">
            <Icon name="scale" size={18} className="text-accent" />
            <span className="text-sm font-display font-semibold text-accent-hover tracking-wider">
              סך החזיתות
            </span>
          </div>
          <div className="px-3 sm:px-4 py-3 border-r border-border-subtle text-center min-w-[68px] sm:min-w-[88px]">
            <div className="font-display font-bold text-2xl tabular-nums text-accent-hot leading-none">
              5
            </div>
          </div>
          <div className="px-3 sm:px-4 py-3 border-r border-border-subtle text-center min-w-[68px] sm:min-w-[88px]">
            <div className="font-display font-bold text-2xl tabular-nums text-accent-cool leading-none">
              1
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 mt-4">
        <div className="text-sm font-display font-semibold text-accent-hover mb-1.5 tracking-wider">
          התובנה
        </div>
        <p className="text-sm text-fg leading-relaxed text-pretty">
          המעצמה רואה את עצמה במלחמה אחת — נגד האויב שבשטח. בפועל, היא לוחמת ב-5 חזיתות בו-זמנית, וכל אחת מ-4 הפנימיות יכולה לבדה לסיים את המלחמה. הצד החלש, לעומת זאת, נלחם רק בחזית אחת. אין לו אוצר שיתרוקן, אין לו ועדת חקירה שתפיל אותו, אין לו או"ם שילחץ. הוא צריך רק לשרוד עוד יום.
          <strong className="text-fg block mt-2">
            ארה"ב יצאה מווייטנאם אחרי 10 שנים, ומאפגניסטן אחרי 20 — לא כי הפסידה בקרבות, אלא כי קרסה ב-4 החזיתות האחרות.
          </strong>
        </p>
      </div>
    </div>
  );
}
