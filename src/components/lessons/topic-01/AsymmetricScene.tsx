'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { cn } from '@/lib/utils';

/* ─────────────────────────── 3-ACTOR TYPOLOGY ──────────────────────────
   Neutral palette only — no per-actor colour, no icons, no English.
   The three categories are distinguished by label + position. */

type ActorType = 'regular' | 'guerrilla' | 'terror';

type ActorMeta = {
  id: ActorType;
  label: string;
  shortDesc: string;
  oneLiner: string;
  identity: string;
  goals: string;
  targets: string;
  structure: string;
};

const ACTORS_LIST: ActorMeta[] = [
  {
    id: 'regular',
    label: 'צבא סדיר',
    shortDesc: 'זרוע רשמית של מדינה',
    oneLiner: 'הצבא הרשמי של מדינה ריבונית. במדים, היררכי, מתקציב המדינה.',
    identity: 'זרוע רשמית של מדינה ריבונית — שייך לממשלה, מפוקח על ידה, ומחוייב לחוקי המדינה.',
    goals: 'להגן על המדינה, לכפות את רצונה במלחמה ולהחזיק שטח.',
    targets: 'יחידות צבא של אויב. מחוייב לדין בינלאומי (אמנת ז\'נבה).',
    structure: 'היררכי, מדים וסמלים גלויים, תקציב מדינה, מצבת מילואים.',
  },
  {
    id: 'guerrilla',
    label: 'ארגון גרילה',
    shortDesc: 'פועל בתוך מדינה — שולט בטריטוריה',
    oneLiner: 'ארגון פוליטי-צבאי שפועל בתוך מדינה ושולט בפועל באזורים שלה.',
    identity: 'שחקן לא-מדינתי בתוך מדינה. בעל שליטה טריטוריאלית (כפרים, ערים, רובעים). לעיתים גם עם מושבים בפרלמנט.',
    goals: 'שליטה פוליטית או טריטוריאלית, אוטונומיה לקבוצה אתנית או דתית, סילוק כיבוש זר.',
    targets: 'בעיקר יחידות צבא וסמלי שלטון. חוקי הלחימה מוצהרים — אך לא תמיד מקויימים בשטח.',
    structure: 'חצי-היררכי, יחידות לוחמים מאומנות, מימון מקומי או אזורי, מערך מודיעין ולוגיסטיקה משלו.',
  },
  {
    id: 'terror',
    label: 'ארגון טרור',
    shortDesc: 'רשת תאים — לא באחריות מדינה',
    oneLiner: 'רשת תאים מבוזרת ללא טריטוריה ברורה. תוקפת בעיקר אזרחים כדי להפיץ אימה.',
    identity: 'שחקן לא-מדינתי, ללא טריטוריה ברורה, אינו באחריות מדינה (גם אם מדינה מממנת — אין לוגיקה מדינית רשמית).',
    goals: 'הפצת אידיאולוגיה, זרע פחד באוכלוסיה, יצירת לחץ פוליטי דרך פגיעה באזרחים.',
    targets: 'בעיקר אזרחים — מטרת ההפחדה היא הציבור, לא הצבא. מתעלם מחוקי לחימה.',
    structure: 'רשת תאים מבוזרת ללא היררכיה ברורה, מימון תרומות, פשע או הלבנה, פעילות חוצת-מדינות.',
  },
];

const ACTORS: Record<ActorType, ActorMeta> = {
  regular: ACTORS_LIST[0],
  guerrilla: ACTORS_LIST[1],
  terror: ACTORS_LIST[2],
};

/* ───────────────────────── 3-COL COMPARISON DATA ───────────────────── */
type CompareRow = { label: string; regular: string; guerrilla: string; terror: string };
const COMPARE_ROWS: CompareRow[] = [
  {
    label: 'דוגמאות',
    regular: 'צה"ל, צבא ארה"ב, צבא רוסיה, בונדסוור גרמני',
    guerrilla: 'חיזבאללה, חות׳ים, טאליבאן (היסטורית), פאר"ק קולומביה',
    terror: 'אל-קאעידה, דאע"ש, בוקו חראם, אש-שבאב',
  },
  {
    label: 'תקציב שנתי',
    regular: 'עשרות עד מאות מיליארדי דולרים מתקציב המדינה',
    guerrilla: 'מאות מיליונים — מיסוי מקומי, נפט, סיוע איראני או אחר',
    terror: 'מיליונים — תרומות, פשע, הלבנת הון',
  },
  {
    label: 'מטרת לחימה ראשית',
    regular: 'יחידות צבא אויב — קונבנציונאלי',
    guerrilla: 'יחידות צבא וסמלי שלטון — להחליש סדר קיים',
    terror: 'אזרחים — להפיץ פחד וליצור לחץ פוליטי',
  },
  {
    label: 'שטח שליטה',
    regular: 'כל שטח המדינה הריבונית',
    guerrilla: 'אזורים מוגדרים — מעוזים, עמקים, רובעים',
    terror: 'אין טריטוריה — תאים פזורים בעולם',
  },
  {
    label: 'חוקי לחימה',
    regular: 'מחוייב לדין בינלאומי (אמנת ז\'נבה)',
    guerrilla: 'מצהיר על מחויבות — מפר בפועל',
    terror: 'מתעלם לחלוטין',
  },
];

/* ───────────────────────── 3 PILLARS OF NON-STATE ──────────────────── */
type Pillar = { id: string; label: string; oneLiner: string; detail: string };

const PILLARS: Pillar[] = [
  {
    id: 'persistence',
    label: 'ספיגה והתמדה',
    oneLiner: 'הזמן עובד לטובתם. המטרה היא פשוט לשרוד את המכות.',
    detail:
      'השחקן הלא-סדיר מבין מראש שהוא לא יכול להשמיד צבא של מדינה, אז המטרה שלו היא פשוט לא להפסיד. מבחינתו, כל יום שבו הוא נשאר בחיים וממשיך לירות – נחשב לניצחון. הוא מנצל את העובדה שלמדינה יש "שעון חול": המלחמה עולה לה מיליארדים, חיילי המילואים נשחקים, ויש לחץ בינלאומי.',
  },
  {
    id: 'deterrence',
    label: 'הרתעה אסימטרית',
    oneLiner: 'עוקפים את החזית – תוקפים את האזרחים בעורף במקום את החיילים.',
    detail:
      'כשהשחקן הלא-סדיר לא מצליח לחדור שריון של טנק או להפיל מטוסי קרב, הוא פשוט "מדלג" עליהם. במקום להילחם מול הצבא פנים אל פנים, הוא יורה טילים זולים ורחפנים ישירות על הערים של המדינה. המטרה היא לשתק את הכלכלה, לזרוע פאניקה ולגרום לאזרחים המפוחדים ללחוץ על הממשלה לעצור את המלחמה מיד.',
  },
  {
    id: 'attrition',
    label: 'התשה',
    oneLiner: 'להפוך את המלחמה לבוץ יקר, מתסכל וחסר תועלת.',
    detail:
      'השחקן הלא-סדיר עובד בשיטת "עקיצות קטנות": צלף יורה מהחלון ונעלם לפיר של מנהרה, או מטען חבלה קטן שמתפוצץ משום מקום. הלוחמים גורמים למדינה להוציא מאות אלפי דולרים על פצצות נגד מטרות ריקות או רחפנים מפלסטיק. הטפטוף המעצבן והבלתי פוסק הזה נועד לייאש את הצבא הסדיר ולגרום לו להרגיש שהוא מנסה להילחם ברוחות רפאים.',
  },
];

/* ───────────────────────── 5 TACTICS OF NON-STATE ──────────────────── */
const TRAITS: { title: string; desc: string }[] = [
  {
    title: 'הסתרה והסוואה',
    desc:
      'החוק הראשון הוא לא לבלוט. אין מדים, אין שיירות ג\'יפים מאורגנות ואין בסיסים מסודרים. הלוחמים מתלבשים כמו אזרחים רגילים ונבלעים בסביבה. למה? כי הם מבינים שברגע שמטוס קרב או רחפן מזהה אותם – ייקח בדיוק 10 שניות להשמיד אותם.',
  },
  {
    title: 'להתערבב עם אזרחים',
    desc:
      'במקום שדה קרב פתוח, הם ממקמים מפקדות ומשגרי טילים בתוך בתי חולים, בתי ספר ושכונות מגורים צפופות. זה תוקע את הצבא הסדיר בדילמה אכזרית: לתקוף ולחטוף אש מהעולם על פגיעה בחפים מפשע, או לוותר על חיסול המטרה ולתת להם לברוח?',
  },
  {
    title: 'להיות "שקטים" טכנולוגית',
    desc:
      'איך מתחבאים מצבא שקולט כל שיחת טלפון ורואה הכל מהחלל? יורדים מהרדאר. עוזבים את הסמארטפונים ועוברים להעביר פתקים מנייר דרך שליחים. נמנעים מנסיעה ברכבים שפולטים חום שלוויינים יכולים לקלוט. אי אפשר לעשות מתקפת סייבר על פתק נייר.',
  },
  {
    title: 'לפגוע בזול בנשק יקר',
    desc:
      'מתמטיקה פשוטה: למה לפתח תעשיית נשק אם אפשר לקנות רחפן צעצוע ב-300 דולר, לחבר לו רימון, ולשתק טנק טכנולוגי שעולה 5 מיליון דולר? האסטרטגיה היא כלכלית — להכריח את הצבא הסדיר לבזבז הון וטילי יירוט יקרים על איומים שעולים גרושים.',
  },
  {
    title: 'דעת הקהל היא שדה הקרב האמיתי',
    desc:
      'הסמארטפון קטלני לא פחות מרובה. השחקן הלא-סדיר מתעד בניינים הרוסים ואזרחים פגועים ומפיץ ברשתות כדי לזעזע את העולם. הם יודעים שלחץ בינלאומי וסרטונים ויראליים יבלמו את הצבא הסדיר הרבה לפני שייגמרו לו הטילים.',
  },
];

/* ─────────────────────── DRAG EXERCISE — 9 ORGS ────────────────────── */

type Org = { id: string; label: string; subtitle: string; correct: ActorType; hint: string };

const ORGS: Org[] = [
  { id: 'idf', label: 'צה"ל', subtitle: 'ישראל', correct: 'regular',
    hint: 'הזרוע הצבאית הרשמית של מדינת ישראל — מדים, היררכיה, תקציב מדינה. צבא סדיר במובהק.' },
  { id: 'us-army', label: 'צבא ארה"ב', subtitle: 'ארה"ב', correct: 'regular',
    hint: 'הצבא הרשמי של ארצות הברית, מדינה ריבונית. צבא סדיר.' },
  { id: 'russia-army', label: 'צבא רוסיה', subtitle: 'רוסיה', correct: 'regular',
    hint: 'הצבא הרשמי של רוסיה. צבא סדיר.' },
  { id: 'hezbollah', label: 'חיזבאללה', subtitle: 'לבנון', correct: 'guerrilla',
    hint: 'ארגון פוליטי-צבאי השולט בדרום לבנון, עם מושבים בפרלמנט הלבנוני. בעל שטח והיררכיה — גרילה, לא צבא של מדינה ולא רשת תאים פזורה.' },
  { id: 'houthis', label: 'חות׳ים', subtitle: 'תימן', correct: 'guerrilla',
    hint: 'שולטים בצנעא וצפון תימן בפועל, מנהלים שלטון אזרחי משלהם. בעלי טריטוריה = גרילה, לא טרור.' },
  { id: 'taliban', label: 'טאליבאן (היסטורית)', subtitle: 'אפגניסטן · 2001–2021', correct: 'guerrilla',
    hint: 'במהלך 20 שנות נוכחות אמריקאית באפגניסטן הם לחמו כגרילה — שלטו בשטחים והיו עם מבנה צבאי-פוליטי ברור.' },
  { id: 'al-qaeda', label: 'אל-קאעידה', subtitle: 'גלובלי', correct: 'terror',
    hint: 'רשת תאים גלובלית ללא טריטוריה. תוקפת בעיקר אזרחים (פיגועי 11.9, שגרירויות, רכבות). ארגון טרור במובהק.' },
  { id: 'isis', label: 'דאע"ש', subtitle: 'סוריה-עיראק וגלובלי', correct: 'terror',
    hint: 'בשיא (2014-2017) היה גם בעל שטח, אך התדרדר לרשת תאים פזורה שתוקפת אזרחים בעולם. סיווג טרור.' },
  { id: 'boko-haram', label: 'בוקו חראם', subtitle: 'ניגריה', correct: 'terror',
    hint: 'תוקפים בעיקר אוכלוסייה אזרחית: חוטפים ילדות מבתי-ספר, מפציצים שווקים. ללא טריטוריה רשמית מנוהלת.' },
];

/* ──────────────────────────────── SCENE ───────────────────────────── */

export function AsymmetricScene() {
  const [placement, setPlacement] = useState<Record<string, ActorType | null>>(
    Object.fromEntries(ORGS.map((o) => [o.id, null])) as Record<string, ActorType | null>,
  );
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const allPlaced = ORGS.every((o) => placement[o.id] != null);
  const correctCount = ORGS.filter((o) => placement[o.id] === o.correct).length;

  const handleMove = (id: string, bucket: ActorType | null) => {
    setPlacement((p) => ({ ...p, [id]: bucket }));
    setSelectedOrg(null);
    setSubmitted(false);
  };

  const reset = () => {
    setPlacement(Object.fromEntries(ORGS.map((o) => [o.id, null])) as Record<string, ActorType | null>);
    setSelectedOrg(null);
    setSubmitted(false);
  };

  return (
    <section id="scene-asymmetric" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="01.3"
        eyebrow="לחימה אסימטרית"
        title={
          <>
           צבא סדיר, טרור וגרילה —<br />
           <span className="gradient-text">שלושה שחקנים, שלוש לוגיקות שונות</span>
          </>
        }
        intro={`פעם, מלחמות היו פשוטות: צבא מול צבא. היום זה לא תמיד ככה. צבא רגיל של מדינה נפגש עם ארגוני גרילה (שיש להם שטח ושליטה) ועם ארגוני טרור (רשת תאים מפוזרת בלי שטח). שלושת השחקנים פועלים בלוגיקה שונה לגמרי — חוקי המלחמה משתנים בכל אחת מהזירות.`}
      />

      {/* 3-actor typology cards — neutral, label-only */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {ACTORS_LIST.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="surface-elevated rounded-2xl p-6 flex flex-col border border-border"
          >
            <div className="mb-3">
              <div className="font-display font-bold text-lg leading-tight text-fg">
                {a.label}
              </div>
              <div className="text-[11px] font-display font-medium tracking-wide text-fg-dim mt-0.5">
                {a.shortDesc}
              </div>
            </div>
            <p className="text-sm text-fg leading-relaxed text-pretty mb-4">{a.oneLiner}</p>
            <dl className="text-xs space-y-2.5 pt-3 border-t border-border-subtle mt-auto">
              <div>
                <dt className="font-display font-semibold tracking-wider mb-0.5 text-fg-muted">זהות</dt>
                <dd className="text-fg leading-relaxed">{a.identity}</dd>
              </div>
              <div>
                <dt className="font-display font-semibold tracking-wider mb-0.5 text-fg-muted">מטרות</dt>
                <dd className="text-fg leading-relaxed">{a.goals}</dd>
              </div>
              <div>
                <dt className="font-display font-semibold tracking-wider mb-0.5 text-fg-muted">מטרות לחימה</dt>
                <dd className="text-fg leading-relaxed">{a.targets}</dd>
              </div>
              <div>
                <dt className="font-display font-semibold tracking-wider mb-0.5 text-fg-muted">מבנה</dt>
                <dd className="text-fg leading-relaxed">{a.structure}</dd>
              </div>
            </dl>
          </motion.div>
        ))}
      </div>

      <TypologyTable />

      {/* PILLARS */}
      <div className="my-12">
        <div className="mb-5">
          <h3 className="font-display font-bold text-xl leading-tight mb-1">
            שלושה עמודי האסטרטגיה של השחקן הלא-סדיר
          </h3>
          <p className="text-fg-muted text-sm">
            לא משנה אם זה ארגון גרילה או רשת טרור — הם חולקים את אותה אסטרטגיית-יסוד מול הצבא הסדיר.
          </p>
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
              <div className="mb-3">
                <div className="text-sm font-display font-semibold text-fg-muted mb-0.5 tracking-wider">
                  עמוד {i + 1}
                </div>
                <h4 className="font-display font-bold text-base sm:text-lg leading-tight text-balance">
                  {p.label}
                </h4>
              </div>

              <p className="text-sm leading-relaxed text-fg-muted mb-3">{p.oneLiner}</p>
              <p className="text-sm leading-relaxed text-fg pt-3 border-t border-border-subtle">{p.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <TimeAsymmetry />

      {/* TRAITS */}
      <div className="my-12">
        <div className="mb-5">
          <h3 className="font-display font-bold text-xl leading-tight mb-1">
            חמש טקטיקות של השחקן הלא-סדיר
          </h3>
          <p className="text-fg-muted text-sm">
            איך הוא משתמש במרחב, באוכלוסייה ובטכנולוגיה כדי לשרוד מול ענק.
          </p>
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
              <h4 className="font-display font-semibold mb-1.5 leading-tight">{t.title}</h4>
              <p className="text-sm text-fg-muted leading-relaxed">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <DragExercise
        placement={placement}
        selectedOrg={selectedOrg}
        submitted={submitted}
        allPlaced={allPlaced}
        correctCount={correctCount}
        onSelect={setSelectedOrg}
        onMove={handleMove}
        onSubmit={() => setSubmitted(true)}
        onReset={reset}
      />

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="surface-elevated p-6 mt-8"
      >
        <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">
          המסקנה: זורקים את ספר החוקים הישן לפח
        </div>
        <p className="text-fg leading-relaxed text-pretty">
          צבא מסורתי התאמן במשך שנים להילחם "ראש בראש": חזית מול חזית, מדים מול מדים. אבל כשאתה נלחם בארגון גרילה שנעלם מתחת לאדמה — או ברשת טרור שתוקפת אזרחים בכל מקום בעולם — כל החוקים הישנים קורסים. כדי לנצח כאוס כזה, אי אפשר רק לשלוח עוד טנקים. הצבא הסדיר חייב לשנות דיסקט, להמציא טכנולוגיות חדשות, ולאסוף מודיעין מסוג אחר לגמרי. את הכלים האלה בדיוק נלמד בשיעורים הבאים.
        </p>
      </motion.div>
    </section>
  );
}

/* ─────────────────────── 3-COL COMPARISON TABLE ─────────────────────── */
function TypologyTable() {
  return (
    <div className="surface-elevated overflow-hidden rounded-2xl">
      <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr] border-b border-border-strong">
        <div className="p-4 bg-bg-accent/40">
          <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">השוואה</div>
        </div>
        {ACTORS_LIST.map((a) => (
          <div key={a.id} className="p-4 border-r border-border-strong bg-bg-accent/20">
            <div className="font-display font-bold text-sm leading-tight text-fg">{a.label}</div>
            <div className="text-[11px] font-display font-medium tracking-wide text-fg-dim mt-1 leading-tight">
              {a.shortDesc}
            </div>
          </div>
        ))}
      </div>

      {COMPARE_ROWS.map((row, i) => (
        <motion.div
          key={row.label}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ delay: i * 0.05 }}
          className={cn(
            'grid grid-cols-[1.1fr_1fr_1fr_1fr] border-b border-border-subtle last:border-b-0',
            i % 2 === 0 ? 'bg-bg-card/40' : 'bg-transparent',
          )}
        >
          <div className="p-4 bg-bg-accent/30 flex items-center">
            <div className="text-sm font-medium">{row.label}</div>
          </div>
          <div className="p-4 border-r border-border-subtle text-sm text-fg leading-snug">{row.regular}</div>
          <div className="p-4 border-r border-border-subtle text-sm text-fg leading-snug">{row.guerrilla}</div>
          <div className="p-4 border-r border-border-subtle text-sm text-fg leading-snug">{row.terror}</div>
        </motion.div>
      ))}
    </div>
  );
}

/* ───────────────────────── TIME ASYMMETRY ─────────────────────────── */

const OPPONENTS: { title: string; desc: string; regularActive: boolean; nonStateActive: boolean }[] = [
  { title: 'האויב בשטח', desc: 'לוחמי גרילה או מחבלים — היריב הצבאי המוצהר.', regularActive: true, nonStateActive: true },
  { title: 'משרד האוצר', desc: 'תקציב המדינה נשרף — מיליארדי דולרים בשבוע, מילואים, פגיעה בעורף.', regularActive: true, nonStateActive: false },
  { title: 'דעת הקהל', desc: 'תמונות מהזירה, לוויות חיילים, תמיכה ציבורית שנשחקת מיום ליום.', regularActive: true, nonStateActive: false },
  { title: 'הפוליטיקה הפנימית', desc: 'הכנסת, הקונגרס, אופוזיציה, ועדות חקירה, שעון הבחירות.', regularActive: true, nonStateActive: false },
  { title: 'הבמה הבינלאומית', desc: 'או"ם, בעלות ברית, האג, סנקציות — כולם דורשים "הפסקת אש מיד".', regularActive: true, nonStateActive: false },
];

function TimeAsymmetry() {
  return (
    <div className="my-12">
      <div className="mb-5">
        <h3 className="font-display font-bold text-xl leading-tight mb-1">למה הזמן הוא הנשק הסודי של השחקן הלא-סדיר?</h3>
        <p className="text-fg-muted text-sm">
          המעצמה לא נלחמת רק באויב שמולה — היא לוחמת בו-זמנית בעוד 4 חזיתות פנימיות שכופות עליה לסיים. הגרילה והטרור — בחזית אחת בלבד.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="surface-elevated p-5 sm:p-6"
        >
          <div className="text-xs font-display font-semibold tracking-wider text-fg-muted mb-1">
            צבא סדיר · מדינה
          </div>
          <div className="flex items-baseline gap-2">
            <div className="font-display font-bold text-5xl tabular-nums text-fg leading-none">5</div>
            <div className="text-sm text-fg-muted leading-tight">
              חזיתות פעילות<br />בו-זמנית
            </div>
          </div>
          <div className="text-xs text-fg-muted mt-3 leading-relaxed">
            צריך לנצח <strong className="text-fg">בכל אחת מהן</strong> — אחרת המלחמה נגמרת מבפנים.
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="surface-elevated p-5 sm:p-6"
        >
          <div className="text-xs font-display font-semibold tracking-wider text-fg-muted mb-1">
            שחקן לא-סדיר · גרילה או טרור
          </div>
          <div className="flex items-baseline gap-2">
            <div className="font-display font-bold text-5xl tabular-nums text-fg leading-none">1</div>
            <div className="text-sm text-fg-muted leading-tight">
              חזית אחת<br />(לשרוד)
            </div>
          </div>
          <div className="text-xs text-fg-muted mt-3 leading-relaxed">
            צריך רק <strong className="text-fg">לא לאבד אותה</strong> — וזה מספיק לניצחון.
          </div>
        </motion.div>
      </div>

      <div className="surface-elevated overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] border-b border-border-strong">
          <div className="p-3 sm:p-4 bg-bg-accent/40">
            <div className="text-xs font-display font-semibold text-fg-muted tracking-wider">
              מי באמת יכול להכריח אותך לסיים את המלחמה?
            </div>
          </div>
          <div className="px-3 sm:px-4 py-3 bg-bg-accent/20 border-r border-border-strong text-center min-w-[88px]">
            <div className="text-xs font-display font-semibold tracking-wider text-fg">סדיר</div>
          </div>
          <div className="px-3 sm:px-4 py-3 bg-bg-accent/20 border-r border-border-strong text-center min-w-[88px]">
            <div className="text-xs font-display font-semibold tracking-wider text-fg">לא-סדיר</div>
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
            <div className="p-3 sm:p-4 min-w-0">
              <div className="font-display font-semibold text-sm leading-tight">{o.title}</div>
              <div className="text-xs text-fg-muted leading-snug mt-0.5">{o.desc}</div>
            </div>
            <div className="px-3 sm:px-4 py-3 border-r border-border-subtle flex items-center justify-center min-w-[88px]">
              <span className={cn(
                'inline-flex items-center justify-center size-7 rounded-full border text-sm font-display font-bold leading-none',
                o.regularActive ? 'bg-fg/8 text-fg border-fg/30' : 'bg-bg-accent text-fg-dim border-border-subtle',
              )}>
                {o.regularActive ? '✓' : '—'}
              </span>
            </div>
            <div className="px-3 sm:px-4 py-3 border-r border-border-subtle flex items-center justify-center min-w-[88px]">
              <span className={cn(
                'inline-flex items-center justify-center size-7 rounded-full border text-sm font-display font-bold leading-none',
                o.nonStateActive ? 'bg-fg/8 text-fg border-fg/30' : 'bg-bg-accent text-fg-dim border-border-subtle',
              )}>
                {o.nonStateActive ? '✓' : '—'}
              </span>
            </div>
          </motion.div>
        ))}

        <div className="grid grid-cols-[1fr_auto_auto] bg-bg-accent/30 border-t border-border-strong">
          <div className="p-3 sm:p-4">
            <span className="text-sm font-display font-semibold text-fg-muted tracking-wider">סך החזיתות</span>
          </div>
          <div className="px-3 sm:px-4 py-3 border-r border-border-subtle text-center min-w-[88px]">
            <div className="font-display font-bold text-2xl tabular-nums text-fg leading-none">5</div>
          </div>
          <div className="px-3 sm:px-4 py-3 border-r border-border-subtle text-center min-w-[88px]">
            <div className="font-display font-bold text-2xl tabular-nums text-fg leading-none">1</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-bg-accent/30 p-5 mt-4">
        <div className="text-sm font-display font-semibold text-fg-muted mb-1.5 tracking-wider">התובנה</div>
        <p className="text-sm text-fg leading-relaxed text-pretty">
          המעצמה רואה את עצמה במלחמה אחת — נגד האויב שבשטח. בפועל, היא לוחמת ב-5 חזיתות בו-זמנית, וכל אחת מ-4 הפנימיות יכולה לבדה לסיים את המלחמה. השחקן הלא-סדיר נלחם רק בחזית אחת. אין לו אוצר שיתרוקן, אין לו ועדת חקירה שתפיל אותו, אין לו או"ם שילחץ. הוא צריך רק לשרוד עוד יום.
          <strong className="text-fg block mt-2">
            ארה"ב יצאה מווייטנאם אחרי 10 שנים, ומאפגניסטן אחרי 20 — לא כי הפסידה בקרבות, אלא כי קרסה ב-4 החזיתות האחרות.
          </strong>
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────── DRAG EXERCISE UI ──────────────────────── */

function DragExercise({
  placement,
  selectedOrg,
  submitted,
  allPlaced,
  correctCount,
  onSelect,
  onMove,
  onSubmit,
  onReset,
}: {
  placement: Record<string, ActorType | null>;
  selectedOrg: string | null;
  submitted: boolean;
  allPlaced: boolean;
  correctCount: number;
  onSelect: (id: string | null) => void;
  onMove: (id: string, bucket: ActorType | null) => void;
  onSubmit: () => void;
  onReset: () => void;
}) {
  const pool = ORGS.filter((o) => placement[o.id] == null);

  return (
    <div className="my-12">
      <div className="mb-5">
        <div className="text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-fg-muted mb-2">
          תרגול · סווג שחקנים אמיתיים
        </div>
        <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight mb-2">
          לאיזה סוג שייך כל ארגון?
        </h3>
        <p className="text-fg-muted text-sm sm:text-base leading-relaxed text-pretty">
          גרור (או הקש על ארגון ואז על קטגוריה) את כל 9 הארגונים לקטגוריה הנכונה. אחרי שתשבץ את כולם, לחץ "בדוק תשובות" — וקבל הסבר אם טעית.
        </p>
      </div>

      <div className="surface-elevated p-4 rounded-2xl mb-3">
        <div className="text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider">
          ארגונים לסיווג ({pool.length})
        </div>
        {pool.length === 0 ? (
          <div className="text-center text-sm text-fg-muted py-4">
            שיבצת את כל הארגונים. {submitted ? 'בדוק את התוצאה למטה.' : 'לחץ "בדוק תשובות".'}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pool.map((o) => (
              <OrgChip
                key={o.id}
                org={o}
                state="pool"
                isSelected={selectedOrg === o.id}
                onSelect={() => onSelect(selectedOrg === o.id ? null : o.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        {ACTORS_LIST.map((a) => (
          <CategoryBin
            key={a.id}
            actor={a}
            orgsHere={ORGS.filter((o) => placement[o.id] === a.id)}
            selectedOrg={selectedOrg}
            submitted={submitted}
            onSelect={onSelect}
            onMoveOrg={onMove}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-fg-muted">
          {!submitted && !allPlaced && `סווגת ${ORGS.length - pool.length} מתוך ${ORGS.length}`}
          {!submitted && allPlaced && 'הכל מוכן — לחץ לבדיקה'}
          {submitted && (
            <span className={cn('font-display font-bold', correctCount === ORGS.length ? 'text-status-ok' : 'text-fg')}>
              ציון: {correctCount}/{ORGS.length} {correctCount === ORGS.length && '· מצוין!'}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 rounded-md font-medium text-sm border border-border text-fg-muted hover:bg-bg-accent transition-colors"
          >
            איפוס
          </button>
          {!submitted && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!allPlaced}
              className={cn(
                'px-4 py-2 rounded-md font-bold text-sm transition-colors',
                allPlaced
                  ? 'bg-fg text-bg-elevated hover:bg-fg-muted'
                  : 'bg-bg-accent text-fg-dim cursor-not-allowed',
              )}
            >
              בדוק תשובות
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function OrgChip({
  org,
  state,
  isSelected,
  isCorrect,
  isWrong,
  onSelect,
  submitted,
  compact,
}: {
  org: Org;
  state: 'pool' | 'bin';
  isSelected?: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
  submitted?: boolean;
  compact?: boolean;
  onSelect?: () => void;
}) {
  const draggable = !submitted;
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.setData('text/org', org.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onSelect}
      className={cn(
        'group inline-flex items-center gap-2 text-right transition-all border',
        compact ? 'px-2.5 py-1.5 rounded-md' : 'px-3 py-2 rounded-lg',
        submitted && isCorrect && 'border-status-ok/50 bg-status-ok/10',
        submitted && isWrong && 'border-status-danger/50 bg-status-danger/10',
        !submitted && isSelected && state === 'pool' && 'border-fg bg-bg-accent',
        !submitted && !isSelected && state === 'pool' && 'border-border bg-bg-elevated hover:border-fg-muted',
        !submitted && state === 'bin' && 'border-border bg-bg-elevated',
        draggable && 'cursor-grab active:cursor-grabbing',
      )}
    >
      {submitted && (
        <span
          className={cn(
            'shrink-0 inline-flex items-center justify-center size-4 rounded-full text-[10px] font-bold leading-none',
            isCorrect ? 'bg-status-ok/15 text-status-ok' : 'bg-status-danger/15 text-status-danger',
          )}
        >
          {isCorrect ? '✓' : '✗'}
        </span>
      )}
      <span className="min-w-0">
        <span className={cn('block font-display font-semibold leading-tight', compact ? 'text-xs' : 'text-sm', 'text-fg')}>
          {org.label}
        </span>
        <span className="block text-[10px] font-display font-medium tracking-wide text-fg-dim mt-0.5 leading-tight">
          {org.subtitle}
        </span>
      </span>
    </button>
  );
}

function CategoryBin({
  actor,
  orgsHere,
  selectedOrg,
  submitted,
  onSelect,
  onMoveOrg,
}: {
  actor: ActorMeta;
  orgsHere: Org[];
  selectedOrg: string | null;
  submitted: boolean;
  onSelect: (id: string | null) => void;
  onMoveOrg: (id: string, bucket: ActorType) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <motion.div
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/org');
        if (id) onMoveOrg(id, actor.id);
        setIsOver(false);
      }}
      onClick={() => {
        if (selectedOrg) onMoveOrg(selectedOrg, actor.id);
      }}
      animate={{ scale: isOver ? 1.01 : 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={cn(
        'rounded-xl border bg-bg-elevated p-4 transition-colors flex flex-col gap-3 min-h-[180px]',
        isOver || (selectedOrg && !isOver) ? 'border-fg' : 'border-border',
      )}
    >
      <div>
        <div className="font-display font-bold text-base leading-tight text-fg">{actor.label}</div>
        <div className="text-[10px] font-display font-medium tracking-wide text-fg-dim mt-0.5">
          {orgsHere.length === 0 ? 'ריק · מחכה לסיווג' : `${orgsHere.length} סווגו כאן`}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        {orgsHere.length === 0 ? (
          <div
            className={cn(
              'flex-1 min-h-[80px] rounded-lg flex items-center justify-center text-sm font-display font-semibold transition-colors',
              isOver ? 'bg-bg-accent text-fg' : selectedOrg ? 'bg-bg-accent/40 text-fg-muted' : 'text-fg-dim bg-bg-accent/40',
            )}
          >
            {isOver ? 'שחרר כאן' : selectedOrg ? 'הקש לסיווג כאן' : 'גרור לכאן'}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="flex flex-wrap gap-1.5">
              {orgsHere.map((o) => {
                const isCorrect = submitted && o.correct === actor.id;
                const isWrong = submitted && o.correct !== actor.id;
                return (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                  >
                    <OrgChip
                      org={o}
                      state="bin"
                      isCorrect={isCorrect}
                      isWrong={isWrong}
                      submitted={submitted}
                      compact
                      onSelect={() => {
                        if (submitted) return;
                        onSelect(o.id);
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Per-org feedback on wrong placements */}
      {submitted && orgsHere.some((o) => o.correct !== actor.id) && (
        <div className="pt-2 border-t border-border-subtle space-y-1.5">
          {orgsHere
            .filter((o) => o.correct !== actor.id)
            .map((o) => (
              <div key={o.id} className="text-[11px] text-fg leading-snug">
                <strong className="text-status-danger">{o.label}</strong>{' '}
                <span className="text-fg-muted">← {ACTORS[o.correct].label}.</span>{' '}
                <span className="text-fg-muted">{o.hint}</span>
              </div>
            ))}
        </div>
      )}
    </motion.div>
  );
}
