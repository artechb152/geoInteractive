'use client';

import { useState } from 'react';
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
    detail: "ארגון טרור מבין מראש שהוא לא יכול להשמיד צבא של מדינה, אז המטרה שלו היא פשוט לא להפסיד. מבחינתו, כל יום שבו הוא נשאר בחיים וממשיך לירות – נחשב לניצחון. הוא מנצל את העובדה שלמדינה יש 'שעון חול': המלחמה עולה לה מיליארדים, חיילי המילואים נשחקים, ויש לחץ בינלאומי. החלש פשוט מנסה להישאר על הרגליים עד שהחזק יקרוס מבפנים.",
    color: 'text-accent-cool',
  },
  {
    id: 'deterrence',
    label: 'הרתעה אסימטרית',
    icon: 'megaphone',
    oneLiner: 'עוקפים את החזית – תוקפים את האזרחים בעורף במקום את החיילים.',
    detail: "כשהצד החלש לא מצליח לחדור שריון של טנק או להפיל מטוסי קרב, הוא פשוט 'מדלג' עליהם. במקום להילחם מול הצבא פנים אל פנים, הוא יורה טילים זולים ורחפנים ישירות על הערים של המדינה החזקה. המטרה היא לשתק את הכלכלה, לזרוע פאניקה ולגרום לאזרחים המפוחדים ללחוץ על הממשלה שלהם לעצור את המלחמה מיד.",
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
    desc: "החוק הראשון הוא לא לבלוט. אין להם מדים, אין שיירות ג'יפים מאורגנות ואין בסיסים מסודרים במדבר. הלוחמים מתלבשים כמו אזרחים רגילים ונבלעים בסביבה. למה? כי הם מבינים שברגע שמטוס קרב או רחפן מזהה אותם – ייקח בדיוק 10 שניות להשמיד אותם.",
  },
  {
    icon: 'people',
    title: 'להתערבב עם אזרחים',
    desc: 'במקום שדה קרב פתוח, הם ממקמים מפקדות ומשגרי טילים בתוך בתי חולים, בתי ספר ושכונות מגורים צפופות. זה תוקע את הצבא החזק בדילמה אכזרית: האם לתקוף ולחטוף אש מהעולם על פגיעה בחפים מפשע, או פשוט לוותר על חיסול המטרה ולתת למחבלים לברוח?',
  },
  {
    icon: 'eye',
    title: 'להיות "שקטים" טכנולוגית',
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
  const [days, setDays] = useState(60);

  return (
    <section id="scene-asymmetric" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="01.3"
        eyebrow="לחימה אסימטרית"
        title={
          <>
            כשצבא ענק נלחם בכוח קטן — <span className="gradient-text">הכללים משתנים</span>
          </>
        }
        intro={`פעם, מלחמות היו פשוטות כמו בסרטים: צבא מול צבא, טנק מול טנק. היום המציאות נראית כמו 'באג' במשחק: מעצמות ענק עם טכנולוגיה מטורפת (כמו ארה"ב או ישראל) מוצאות את עצמן נלחמות מול ארגוני טרור קטנים. הפער העצום הזה בכוח יוצר מלחמה עם חוקים חדשים לגמרי, שבהם הצד החלש פשוט חייב לשבור את כל הכללים כדי לשרוד.`}
      />

      <div className="surface-elevated p-5 mb-6 border-r-4 border-r-accent-cool">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">מילון קצר:</strong>
            <ul className="mt-2 space-y-1 text-fg-muted">
              <li>· <strong className="text-fg">צד חזק (צבא סדיר)</strong> — המדינה. גוף שיש לו צבא מאורגן, חיילים במדים, שרשרת פיקוד מסודרת, מטוסי קרב, טנקים ותקציבי עתק.</li>
              <li>· <strong className="text-fg">צד חלש (לא-סדיר)</strong> —   ארגון ללא מדינה (טרור או גרילה). חבורה של לוחמים בלי מדים, שנטמעים בכוונה בתוך אוכלוסייה אזרחית ברחוב ומשתמשים בנשק פשוט וזול.</li>
              <li>· <strong className="text-fg">אסימטריה</strong> — בשתי מילים – "לא כוחות". המילה 'סימטרי' אומרת ששני הצדדים שווים. 'אסימטרי' זה מצב של חוסר שוויון קיצוני, שבו צד אחד חזק משמעותית מהשני על הנייר – מה שמשנה לגמרי את כל אופי הלחימה.</li>
            </ul>
          </div>
        </div>
      </div>

      <GapVisual />

      <div className="my-12">
        <div className="mb-5">
          <h3 className="text-xl font-bold mb-1">3 עמודי האסטרטגיה של הצד החלש</h3>
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
                  <div className="text-xs font-mono text-fg-dim mb-0.5 tracking-widest uppercase">
                    עמוד {i + 1} · האסטרטגיה של החלש
                  </div>
                  <h4 className="font-display font-bold leading-tight text-lg">{p.label}</h4>
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

<div className="surface-elevated p-6 md:p-8 my-12">
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-1">למה הזמן הוא הנשק הסודי של הצד החלש?</h3>
          <p className="text-fg-muted text-sm">גררו את ציר הזמן וראו איך כל יום שעובר שוחק את היתרון של המעצמה — ומחזק את הצד החלש</p>
        </div>

        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <div className="text-xs font-mono text-fg-dim mb-1 tracking-widest uppercase">
              כמה זמן המלחמה כבר נמשכת
            </div>
            <div className="font-display font-bold text-5xl md:text-6xl tabular-nums">
              {days}
              <span className="text-2xl text-fg-muted ms-1">ימים</span>
            </div>
          </div>
          <span className={cn(
            'chip border',
            days < 60 ? 'border-status-ok/40 bg-status-ok/10 text-status-ok'
            : days < 180 ? 'border-status-warn/40 bg-status-warn/10 text-status-warn'
            : 'border-status-danger/40 bg-status-danger/10 text-status-danger'
          )}>
            {days < 60
              ? 'ימי החסד — הציבור מאוחד והתקשורת תומכת'
              : days < 180
              ? 'המלחמה נתקעת — חללים, חובות וסדקים בקונצנזוס'
              : 'הציבור נשבר — דרישה ציבורית לצאת בכל מחיר'}
          </span>
        </div>

        <input
          type="range"
          min={1}
          max={365}
          step={1}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-full accent-accent"
          aria-label="ימים"
        />
        <div className="flex justify-between text-xs font-mono text-fg-dim mt-1 mb-6">
          <span>יום 1</span>
          <span>3 חודשים</span>
          <span>חצי שנה</span>
          <span>שנה</span>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <CostCard days={days} />
          <SupportCard days={days} />
          <SurvivalCard days={days} />
        </div>

        <WarTimeline currentDays={days} />

        <div className="mt-6 surface p-5 border-r-4 border-r-accent">
          <div className="text-xs font-mono text-accent mb-1.5 tracking-widest uppercase">
            התובנה
          </div>
          <p className="text-sm text-fg leading-relaxed text-pretty">
            למעצמה יש שעון עצר שלא רואים — אבל שומעים בכל מקום: מלחמה ארוכה שורפת מיליארדים, מערערת את הכלכלה, ומפיצה לוויות לתוך כל סלון בארץ. בלוח הזמנים של המעצמה יש בחירות, יש בורסה, ויש דעת קהל בינלאומית. אצל ארגון טרור — אין כלום מזה: אין לו דדליין, אין לו אופוזיציה ואין לו בוחר שמתלונן על המחיר. הוא צריך לשרוד עוד יום, ועוד יום, עד שהענק שמולו פשוט מתעייף ועוזב.
            {/* ארה"ב באפגניסטן 20 שנה / וייטנאם הן הדוגמאות הקנוניות לדפוס הזה */}
            <strong className="text-fg block mt-2">ארה"ב יצאה מווייטנאם אחרי 10 שנים, ומאפגניסטן אחרי 20. במלחמת התשה לא מנצח מי שחזק יותר — אלא מי שמצמץ אחרון.</strong>
          </p>
        </div>
      </div>
          
      <div className="my-12">
        <div className="mb-5">
          <h3 className="text-xl font-bold mb-1">5 טקטיקות של הצד החלש</h3>
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
              whileHover={{ y: -3 }}
              className="surface p-5 hover:border-accent/40 hover:shadow-elevated transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute -end-8 -top-8 size-20 rounded-full bg-accent/5 group-hover:bg-accent/10 blur-2xl transition-colors pointer-events-none" />
              <div className="relative flex items-start justify-between mb-3">
                <div className="size-11 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center group-hover:scale-110 group-hover:border-accent/60 transition-all">
                  <Icon name={t.icon} size={22} className="text-accent" />
                </div>
                <span className="font-mono text-xs text-fg-dim group-hover:text-accent transition-colors">
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
        className="surface-elevated p-6 border-r-4 border-r-accent flex gap-4 items-start"
      >
        <Icon name="spark" size={22} className="text-accent shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-mono text-accent mb-1 tracking-widest uppercase">
            המסקנה: זורקים את ספר החוקים הישן לפח
          </div>
          <p className="text-fg leading-relaxed text-pretty">
צבא מסורתי התאמן במשך שנים להילחם "ראש בראש": חזית מול חזית, מדים מול מדים. אבל כשאתה נלחם באויב שנעלם מתחת לאדמה ויורה מתוך גן ילדים – כל החוקים הישנים קורסים. כדי לנצח כאוס כזה, אי אפשר רק לשלוח עוד טנקים. הצבא חייב לשנות דיסקט, להמציא טכנולוגיות חדשות, ולאסוף מודיעין מסוג אחר לגמרי. את הכלים האלה בדיוק נלמד בשיעורים הבאים.          </p>
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
          <div className="text-xs font-mono text-fg-dim tracking-widest uppercase">השוואה</div>
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
          <span className="text-xs font-mono text-accent tracking-widest uppercase">פער אסימטרי</span>
        </div>
        <div className="p-4 col-span-2 text-xs text-fg-muted leading-relaxed border-r border-border-subtle">
על הנייר, הצד החזק אמור למחוץ את הצד החלש ביום אחד. בדיוק בגלל זה הצד החלש בורח מקרב "ראש בראש" בשטח פתוח. במקום זה, הוא גורר את הצבא הגדול למגרש שלו: סמטאות צפופות ומנהרות – המקום היחיד שבו המטוסים והטנקים מאבדים את היתרון הטכנולוגי שלהם.        </div>
      </div>
    </div>
  );
}

function CostCard({ days }: { days: number }) {
  // Iraq war: ~$2T over 8y → ~$685M/day; we model 0.7B/day so 60d≈$42B, 365d≈$255B
  const billions = Math.round(15 + (days / 365) * 240);
  const cap = 260;
  const context =
    billions < 50
      ? 'בערך כל תקציב הביטחון השנתי של ישראל'
      : billions < 130
      ? 'יותר מתקציב הבריאות השנתי של מדינה בינונית'
      : 'מספיק כדי לבנות מאות בתי חולים — או לכסות 5 שנות הוצאות חינוך';

  return (
    <div className="surface p-5 relative overflow-hidden">
      <div aria-hidden className="absolute -top-12 -end-12 size-32 rounded-full bg-accent-hot/15 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="size-9 rounded-xl bg-accent-hot/10 border border-accent-hot/30 flex items-center justify-center">
            <Icon name="fuel" size={18} className="text-accent-hot" />
          </div>
          <span className="chip border-accent-hot/30 bg-accent-hot/10 text-accent-hot text-xs">↑ עולה</span>
        </div>
        <div className="text-xs font-mono text-fg-dim mb-2 tracking-widest uppercase leading-tight">
          ההוצאה הצבאית של המעצמה
        </div>
        <div className="font-display font-bold tabular-nums text-accent-hot leading-none mb-1">
          <span className="text-4xl md:text-5xl">${billions}</span>
          <span className="text-xl text-fg-muted ms-1">מיליארד</span>
        </div>
        <div className="text-xs text-fg-muted mb-4">מצטבר מתחילת המלחמה</div>
        <div className="h-2 rounded-full bg-bg-accent overflow-hidden mb-3">
          <motion.div
            className="h-full rounded-full bg-gradient-to-l from-accent-hot to-accent-hot/60"
            animate={{ width: `${Math.min(100, (billions / cap) * 100)}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="text-xs text-fg-dim leading-relaxed">{context}</div>
      </div>
    </div>
  );
}

function SupportCard({ days }: { days: number }) {
  const support = Math.max(15, Math.round(85 - (days / 365) * 60));
  const filled = Math.round(support / 10);
  const context =
    support > 70
      ? 'הציבור עוד מאוחד — התקשורת תומכת והבנקים שקטים'
      : support > 45
      ? 'התקשורת מתחילה לבקר. הפגנות בערים גדלות'
      : 'דרישה ציבורית רחבה לסיים את המלחמה — מיד';

  return (
    <div className="surface p-5 relative overflow-hidden">
      <div aria-hidden className="absolute -top-12 -end-12 size-32 rounded-full bg-status-warn/15 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="size-9 rounded-xl bg-status-warn/10 border border-status-warn/30 flex items-center justify-center">
            <Icon name="megaphone" size={18} className="text-status-warn" />
          </div>
          <span className="chip border-status-warn/30 bg-status-warn/10 text-status-warn text-xs">↓ יורד</span>
        </div>
        <div className="text-xs font-mono text-fg-dim mb-2 tracking-widest uppercase leading-tight">
          תמיכת הציבור במלחמה
        </div>
        <div className="font-display font-bold tabular-nums text-status-warn leading-none mb-1">
          <span className="text-4xl md:text-5xl">{support}</span>
          <span className="text-xl text-fg-muted ms-1">%</span>
        </div>
        <div className="text-xs text-fg-muted mb-4">סקרים בקרב אזרחי הצד החזק</div>
        <div className="grid grid-cols-10 gap-1 mb-3" aria-hidden>
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                'h-6 rounded-sm flex items-center justify-center transition-colors',
                i < filled ? 'bg-status-warn/80 text-bg' : 'bg-bg-accent border border-border-subtle text-fg-dim'
              )}
              animate={{ opacity: i < filled ? 1 : 0.4 }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 21a7 7 0 0 1 14 0" />
              </svg>
            </motion.div>
          ))}
        </div>
        <div className="text-xs text-fg-dim leading-relaxed">{context}</div>
      </div>
    </div>
  );
}

function SurvivalCard({ days }: { days: number }) {
  const context =
    days < 30
      ? 'בקרבות הראשונים. הפסד פחות חשוב מהעובדה שעוד יורים.'
      : days < 180
      ? 'התבסס במנהרות, התרגל לתקיפות. כבר אי אפשר לחסל אותו במכה.'
      : 'הוכיח לכל ארגון בעולם שאפשר לעמוד מול מעצמה. ניצחון תעמולתי.';

  return (
    <div className="surface p-5 relative overflow-hidden">
      <div aria-hidden className="absolute -top-12 -end-12 size-32 rounded-full bg-accent-intel/15 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="size-9 rounded-xl bg-accent-intel/10 border border-accent-intel/30 flex items-center justify-center">
            <Icon name="hourglass" size={18} className="text-accent-intel" />
          </div>
          <span className="chip border-accent-intel/30 bg-accent-intel/10 text-accent-intel text-xs">✓ עומד</span>
        </div>
        <div className="text-xs font-mono text-fg-dim mb-2 tracking-widest uppercase leading-tight">
          ימי שרידות של הצד החלש
        </div>
        <div className="font-display font-bold tabular-nums text-accent-intel leading-none mb-1">
          <span className="text-4xl md:text-5xl">{days}</span>
          <span className="text-xl text-fg-muted ms-1">ימים</span>
        </div>
        <div className="text-xs text-fg-muted mb-4">הוא לא צריך לנצח — מספיק לא למות</div>
        {/* Day tally — small dashes by week */}
        <div className="flex flex-wrap gap-[3px] mb-3" aria-hidden>
          {Array.from({ length: Math.min(52, Math.ceil(days / 7)) }).map((_, i) => (
            <motion.span
              key={i}
              className="h-3 w-1 rounded-sm bg-accent-intel/70"
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ delay: i * 0.005, duration: 0.2 }}
            />
          ))}
          {days > 52 * 7 && (
            <span className="text-xs font-mono text-accent-intel ms-1">+{Math.floor((days - 52 * 7) / 7)} שבועות</span>
          )}
        </div>
        <div className="text-xs text-fg-dim leading-relaxed">{context}</div>
      </div>
    </div>
  );
}

const WARS: { name: string; days: number; meta: string; color: string }[] = [
  { name: 'ששת הימים',          days: 6,    meta: 'ישראל · 1967',         color: 'bg-fg-muted' },
  { name: 'יום הכיפורים',       days: 19,   meta: 'ישראל · 1973',         color: 'bg-fg-muted' },
  { name: 'לבנון השנייה',        days: 34,   meta: 'ישראל · 2006',         color: 'bg-fg-muted' },
  { name: 'מלחמת המפרץ',         days: 42,   meta: "ארה\"ב · 1991",         color: 'bg-fg-muted' },
  { name: 'חרבות ברזל',          days: 470,  meta: 'ישראל · מ-2023',       color: 'bg-accent-hot' },
  { name: 'ברה"מ באפגניסטן',    days: 3340, meta: '~9 שנים · 1979–89',     color: 'bg-fg-muted' },
  { name: 'וייטנאם',              days: 3650, meta: "ארה\"ב · ~10 שנים",     color: 'bg-fg-muted' },
  { name: 'אפגניסטן',             days: 7300, meta: "ארה\"ב · ~20 שנים",     color: 'bg-fg-muted' },
];

function WarTimeline({ currentDays }: { currentDays: number }) {
  // Log scale: 1d → 0%, 10000d (~27y) → 100%
  const log = (d: number) => (Math.log10(Math.max(1, d)) / Math.log10(10000)) * 100;
  const ticks = [
    { d: 1,    label: 'יום' },
    { d: 30,   label: 'חודש' },
    { d: 365,  label: 'שנה' },
    { d: 3650, label: '10 שנים' },
    { d: 10000,label: '~30 שנים' },
  ];

  // Two-row stagger to keep labels from colliding
  const rowFor = (i: number) => (i % 2 === 0 ? 0 : 1);

  return (
    <div className="mt-8 surface-elevated p-5 sm:p-6 relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 topo-bg opacity-10 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="clock" size={14} className="text-accent" />
          <div className="text-xs font-mono text-accent tracking-widest uppercase">
            איפה אתה על ציר ההיסטוריה?
          </div>
        </div>
        <p className="text-sm text-fg-muted mb-8">
          השוואה למלחמות אמיתיות. הציר לוגריתמי — כדי שגם 6 ימים וגם 20 שנה יוכלו להיכנס לאותה תמונה.
        </p>

        {/* Vertical layout:
            0–62  : war labels (two staggered rows)
            64    : war dots
            72    : track
            80    : tick labels
            108   : "you are here" chip
            stem from chip up to track at 72                                       */}
        <div className="relative" style={{ height: '170px' }}>
          {/* Track */}
          <div className="absolute inset-x-0 top-[72px] h-1 rounded-full bg-bg-accent" />
          <motion.div
            className="absolute top-[72px] start-0 h-1 rounded-full bg-gradient-to-l from-accent to-accent-cool shadow-glow"
            animate={{ width: `${log(currentDays)}%` }}
            transition={{ duration: 0.3 }}
          />

          {/* Tick marks below track */}
          {ticks.map((t) => (
            <div
              key={t.d}
              className="absolute -translate-x-1/2"
              style={{ insetInlineStart: `${log(t.d)}%`, top: '78px' }}
            >
              <div className="h-2 w-px bg-border-strong mx-auto" />
              <div className="text-xs font-mono text-fg-dim mt-1 whitespace-nowrap">{t.label}</div>
            </div>
          ))}

          {/* War markers — all above the track, in 2 staggered rows */}
          {WARS.map((w, i) => {
            const left = log(w.days);
            const row = rowFor(i);
            const labelTop = row === 0 ? 0 : 30;
            return (
              <div
                key={w.name}
                className="absolute -translate-x-1/2 text-center"
                style={{ insetInlineStart: `${left}%` }}
              >
                <div
                  className="absolute -translate-x-1/2 whitespace-nowrap"
                  style={{ insetInlineStart: '50%', top: `${labelTop}px` }}
                >
                  <div className="text-xs text-fg leading-tight font-medium">{w.name}</div>
                  <div className="text-xs font-mono text-fg-dim">{w.days} ימים</div>
                </div>
                {/* connector */}
                <div
                  className="absolute -translate-x-1/2 w-px bg-border-subtle"
                  style={{ insetInlineStart: '50%', top: `${labelTop + 28}px`, height: `${64 - (labelTop + 28)}px` }}
                />
                {/* dot on track */}
                <div
                  className={cn('absolute -translate-x-1/2 h-2.5 w-2.5 rounded-full ring-2 ring-bg-elevated', w.color)}
                  style={{ insetInlineStart: '50%', top: '63px' }}
                />
              </div>
            );
          })}

          {/* "You are here" marker — below the track */}
          <motion.div
            className="absolute -translate-x-1/2 z-10 pointer-events-none"
            style={{ top: '108px' }}
            animate={{ insetInlineStart: `${log(currentDays)}%` }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-0.5 h-9 bg-accent mx-auto -mt-9" />
            <div className="chip border-accent bg-accent text-bg shadow-glow whitespace-nowrap font-mono">
              אתה כאן · {currentDays}d
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
