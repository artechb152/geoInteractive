'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { IntelCard } from '@/components/lesson/IntelCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type View = 'access' | 'obstacles' | 'cover' | 'concealment';

type Step = {
  id: View;
  label: string;
  icon: IconName;
  popupTitle: string;
  popupBody: string;
};

const STEPS: Step[] = [
  {
    id: 'access',
    label: 'האם אנחנו בכלל יכולים לעבור פה?',
    icon: 'truck',
    popupTitle: 'עבִירוּת: השאלה הראשונה לפני שזזים',
    popupBody:
      `לפני שמתכננים מסלול, צריך לשאול שאלה פיזית פשוטה: האם אנחנו והרכבים שלנו מסוגלים בכלל לעבור פה? היכולת הזאת נקראת "עבירות", והיא תלויה בשני דברים עיקריים: עד כמה השטח תלול (השיפוע), ומה סוג האדמה (סלע קשה? חול שוקע? בוץ?). למשל, ג'יפ או משאית ייעצרו בעלייה של 30%, בזמן שטנק (שנע על שרשראות/זחלים) יצליח לטפס גם שיפוע של 60%. מעבר לזה, חול רטוב עלול לבלוע משאית פנימה, ושטח "טרשי" (מלא בסלעים חדים שבולטים החוצה) יקרע לה את הצמיגים. השורה התחתונה: אם השטח לא עביר — אי אפשר לבצע את המשימה.`,
  },
  {
    id: 'obstacles',
    label: 'מה יעצור אותנו בדרך?',
    icon: 'shield',
    popupTitle: 'מכשולים: כשהטבע והאויב משלבים כוחות',
    popupBody:
      'גם אם האדמה נוחה לנסיעה, האויב תמיד ינסה לעצור אותנו. לרוב הוא ייקח מכשול שהטבע יצר (כמו נחל שקשה לחצות) ויוסיף עליו מלכודות משלו: הוא יכול לפזר שדה מוקשים בדיוק על גדת הנחל, לפוצץ גשר, או לחפור תעלה עמוקה שנועדה לעצור טנקים (תעלת נ"ט). השילוב הזה הופך שטח פתוח למעין "מבצר". כדי להתגבר על זה, חיל ההנדסה מפעיל כלים כבדים כדי לפרוץ את הדרך מחדש (פעולה שנקראת בשפה הצבאית "קידום ניידות") — למשל באמצעות נטרול מוקשים, פריצת דרכים חדשות או הנחת גשרים ניידים.',
  },
  {
    id: 'cover',
    label: 'איפה אפשר להסתתר מאש?',
    icon: 'mountain',
    popupTitle: 'מחסה (Cover): מה באמת יכול לעצור כדור?',
    popupBody:
      'בזמן לחימה, מי שנמצא בשטח פתוח וחשוף נמצא בסכנת חיים. לכן, מתכננים מסלול שמדלג בין נקודות "מחסה": סלע ענק, שקע עמוק באדמה, או קיר בטון עבה. מחסה אמיתי חייב להיות עשוי מחומר חזק ועבה מספיק כדי לעצור פיזית כדורים, רסיסים והדף של פיצוץ. להתחבא מאחורי שיח זה ממש לא מחסה. גם גזע עץ דק לא יעזור. רק עצם קשיח וגדול מספיק באמת יספק הגנה וישמור עליכם בחיים.',
  },
  {
    id: 'concealment',
    label: 'מה מסתיר אותנו מהעיניים של האויב?',
    icon: 'eye',
    popupTitle: 'הסתרה (Concealment): להיות רואים ואינם נראים',
    popupBody:
'בניגוד למחסה, הסתרה לא מגינה עלינו מפני פגיעה – היא רק מונעת מהאויב לגלות אותנו. שיח גדול, יער צפוף, ערפל, צל ואפילו קירות דקים במבנה נטוש, יכולים להעלים אותנו מהעין (ואפילו ממצלמות תרמיות שמזהות חום גוף), אבל אף אחד מהם לא יעצור כדור שנירה לעברנו. השילוב המושלם הוא "הסתרה + מחסה": ככה קשה מאוד למצוא אותנו, ואם במקרה התגלינו וירו עלינו – אנחנו מוגנים פיזית מאש.',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'לחצות תעלה ענקית בלילה אחד',
    place: 'תעלת סואץ · מלחמת יום הכיפורים 1973 ',
    lesson: 'תעלת סואץ היא תעלת מים עמוקה ורחבה שהיוותה מכשול טבעי עצום. כדי להעביר את הטנקים של צה"ל לתוך מצרים, חיל ההנדסה יצא למבצע מורכב תחת אש ובחסות החשיכה, ובנה גשרים צפים מעל המים. ההתגברות על המכשול הזה פתחה לכוחותינו את הדרך לעומק מצרים, אפשרה לנו לעבור להתקפה ושינתה לחלוטין את מהלך המלחמה.',
    icon: 'wave',
    accent: 'text-accent-cool',
  },
  {
    headline: 'השיחים שעצרו טנקים ענקיים',
    place: 'נורמנדי (צרפת) · קיץ 1944',
    lesson: `באזור הלחימה בנורמנדי, השדות החקלאיים הופרדו בגדרות שנקראות "בוקאז'" – חומות של אדמה דחוסה שמעליהן צמחו שיחים סבוכים וקוצניים. הטנקים האמריקאים פשוט לא הצליחו לעבור דרכן! כל חלקה חקלאית קטנה הפכה למבצר טבעי, כי הגדרות האלו סיפקו לגרמנים גם מניעת ראייה ("הסתרה" בזכות השיחים) וגם הגנה פיזית ("מחסה" שעוצר כדורים בזכות סוללות האדמה). לבסוף, האמריקאים נאלצו לאלתר ולרתך "מזלגות" פלדה לקדמת הטנקים כדי לעקור את השיחים.`,
    icon: 'mountain',
    accent: 'text-terrain-ridge',
  },
  {
    headline: `הג'ונגל שנתן אשליה של ביטחון`,
    place: 'מלחמת וייטנאם · 1965–1973',
    lesson: `חיילים אמריקאים סמכו על צמחיית הג'ונגל הצפופה כדי להסתתר. הבעיה התחילה כשהתברר שגם מול קליעים של נשק קל, עלים וענפים לא עוצרים כלום. הלוחמים המקומיים (הוייטקונג) פשוט ירו בצרורות עיוורים לתוך הצמחייה ופגעו בהם בקלות. זה הוכיח בדרך הקשה שהסתרה היא ממש לא מחסה. הלקח: בשדה הקרב, מותר לסמוך רק על עצמים שיכולים פיזית לעצור כדור.`,
    icon: 'eye',
    accent: 'text-status-warn',
  },
  {
    headline: 'השילוב הקטלני: בונקרים בתוך יערות סבוכים',
    place: 'דרום לבנון · מלחמת לבנון השנייה (2006)',
    lesson: 'חיזבאללה בנה בונקרים תת-קרקעיים עמוקים ויצוקים מבטון, ומיקם אותם בדיוק בתוך יערות וצמחייה צפופה. העצים והשיחים מנעו ממטוסים ורחפנים לזהות את הפתחים מלמעלה ("הסתרה"), והבטון העבה שמתחת לאדמה הגן על המחבלים מפני ההפצצות ("מחסה"). זה היה שילוב מושלם של טבע והנדסה, שבגללו צה"ל הצליח לגלות את רוב העמדות האלה רק כשחיילים ממש הגיעו אליהן ברגל.',
    icon: 'shield',
    accent: 'text-status-danger',
  },
];

export function OnboardingScene() {
  const [view, setView] = useState<View>('access');
  const [expandedStep, setExpandedStep] = useState<View | null>('access');

  const handleStepClick = (id: View) => {
    if (expandedStep === id) {
      setExpandedStep(null);
    } else {
      setView(id);
      setExpandedStep(id);
    }
  };

  return (
    <section id="scene-onboarding" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="05.0"
        eyebrow="רגע לפני שמתחילים"
title = {
  <>
    <span className="gradient-text">איך יודעים אם כוח באמת יכול לעבור בשטח?</span>
  </>
}
        intro='עבור רובנו השטח הוא סתם "נוף", אבל מפקד צבאי מסתכל עליו כעל חידה שצריך לפתור. בואו נראה איך מנתחים תא שטח לקראת תנועה (מושג שנקרא בשפה הצבאית "תמרון"), דרך 4 שאלות מפתח – החל מהשאלה הבסיסית ביותר ("האם בכלל אפשר לעבור פה?") ועד לשאלות של חיים ומוות.'
      />

      <div className="grid md:grid-cols-[2fr_3fr] gap-6">
        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const active = view === s.id;
            const expanded = expandedStep === s.id;
            const passed = STEPS.findIndex((x) => x.id === view) > i;
            return (
              <div
                key={s.id}
                className={cn(
                  'surface overflow-hidden transition-all duration-300 ease-snap',
                  active
                    ? 'border-brand/45 bg-bg-elevated'
                    : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                  passed && !active && 'opacity-80'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleStepClick(s.id)}
                  aria-expanded={expanded}
                  aria-controls={`t5-onb-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t5-onb-bar"
                      className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
                    />
                  )}
                  <span
                    className={cn(
                      'size-9 rounded-[3px] flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                      active ? 'bg-brand-dark text-bg-elevated border-brand-dark' : passed ? 'bg-status-ok/15 text-status-ok border-status-ok/30' : 'bg-bg-accent text-fg-muted border-border'
                    )}
                  >
                    {passed && !active ? (
                      <Icon name="check" size={16} strokeWidth={2.5} />
                    ) : (
                      <span className="font-display text-sm font-bold">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={cn('font-display font-semibold leading-tight transition-colors text-fg')}>{s.label}</div>
                  </div>
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('shrink-0 inline-flex', expanded ? 'text-brand-dark' : 'text-fg-dim')}
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
                  {expanded && (
                    <motion.div
                      key={`t5-onb-panel-${s.id}`}
                      id={`t5-onb-panel-${s.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-brand/20">
                        <div className="text-sm font-display font-semibold text-brand-dark mt-3 mb-2 tracking-wider">
למה זה חשוב?                        </div>
                        <h4 className="font-display font-bold text-base sm:text-lg leading-tight text-balance mb-2">
                          {s.popupTitle}
                        </h4>
                        <p className="text-sm leading-relaxed text-fg-muted text-pretty">
                          {s.popupBody}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="surface-elevated bg-bg relative overflow-hidden min-h-[280px]">
          <ManeuverStage view={view} />
        </div>
      </div>

      <SoftDivider text="מאחורי כל קרב היסטורי גדול, עומד ניתוח נכון של השטח" />

      <div className="grid sm:grid-cols-2 gap-4">
        {HISTORICAL.map((h, i) => (
          <IntelCard
            key={h.headline}
            place={h.place}
            headline={h.headline}
            lesson={h.lesson}
            icon={h.icon}
            accent={h.accent}
          />
        ))}
      </div>

      <ReadyCallout title="עכשיו אתם מוכנים">
        <p>עכשיו בטח הבנתם שתנועה צבאית בשטח ("תמרון") היא הרבה יותר מסתם "ללכת ממקום למקום" – זה פאזל שלם של החלטות קריטיות. בחלקים הבאים של הקורס נצלול לעומק ונגלה: מה הופך אדמה לנוחה למעבר, איך חיל ההנדסה מתגבר על מכשולים בדרך, איך שורדים במקום פתוח וחשוף, ואיך עצים וצמחייה משנים את כל חוקי המשחק.</p>
      </ReadyCallout>
    </section>
  );
}

function ManeuverStage({ view }: { view: View }) {
  const showObstacles = view === 'obstacles' || view === 'cover' || view === 'concealment';
  const showCover = view === 'cover' || view === 'concealment';
  const showConcealment = view === 'concealment';

  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <rect x="0" y="0" width="100" height="75" className="fill-bg-accent" />

        {/* Background ridges (slopes) */}
        <path
          d="M0 55 L20 40 L35 50 L55 30 L75 45 L100 35 L100 75 L0 75 Z"
          className="fill-terrain-ridge/15 stroke-terrain-ridge/40"
          strokeWidth="0.3"
        />
        <path
          d="M0 65 L25 55 L50 65 L75 55 L100 60 L100 75 L0 75 Z"
          className="fill-terrain-sand/15"
        />

        {/* Start (A) and End (B) markers — always visible */}
        <g>
          <circle cx="10" cy="65" r="2.6" className="fill-accent-cool" />
          <text
            x="10"
            y="60"
            textAnchor="middle"
            className="fill-accent-cool font-display font-bold"
            fontSize="4.2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1.3"
            strokeLinejoin="round"
          >
            A
          </text>
        </g>
        <g>
          <circle cx="90" cy="25" r="2.6" className="fill-accent-hot" />
          <text
            x="90"
            y="21"
            textAnchor="middle"
            className="fill-accent-hot font-display font-bold"
            fontSize="4.2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1.3"
            strokeLinejoin="round"
          >
            B
          </text>
        </g>

        {/* Layer 1: Access — direct path with slope warnings */}
        <motion.g initial={false} animate={{ opacity: view === 'access' ? 1 : 0.35 }} transition={{ duration: 0.4 }}>
          <line
            x1="10"
            y1="65"
            x2="90"
            y2="25"
            className="stroke-accent"
            strokeWidth="0.5"
            strokeDasharray="1.5 1"
          />
          <text
            x="50"
            y="42"
            textAnchor="middle"
            className="fill-accent font-display font-bold"
            fontSize="3.6"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeLinejoin="round"
          >
            מסלול ישיר
          </text>
        </motion.g>

        {/* Layer 2: Obstacles */}
        <motion.g initial={false} animate={{ opacity: showObstacles ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          {/* River */}
          <path
            d="M0 50 Q 30 48 50 52 T 100 50"
            fill="none"
            className="stroke-terrain-sky"
            strokeWidth="2"
            opacity="0.7"
          />
          <text
            x="22"
            y="46"
            textAnchor="middle"
            className="fill-terrain-sky font-display font-bold"
            fontSize="3"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.9"
            strokeLinejoin="round"
          >
            נחל
          </text>

          {/* Minefield */}
          <rect
            x="55"
            y="30"
            width="14"
            height="8"
            rx="1"
            className="fill-status-danger/25 stroke-status-danger"
            strokeWidth="0.4"
            strokeDasharray="1 0.5"
          />
          <text
            x="62"
            y="35.5"
            textAnchor="middle"
            className="fill-status-danger font-display font-bold"
            fontSize="3"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.9"
            strokeLinejoin="round"
          >
            שדה מוקשים
          </text>
        </motion.g>

        {/* Layer 3: Cover spots (physical protection) */}
        <motion.g initial={false} animate={{ opacity: showCover ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          {[
            { x: 25, y: 58 },
            { x: 42, y: 45 },
            { x: 78, y: 32 },
          ].map((c, i) => (
            <g key={i}>
              <circle cx={c.x} cy={c.y} r="2.2" className="fill-terrain-ridge stroke-fg" strokeWidth="0.3" />
              <text
                x={c.x}
                y={c.y - 3.5}
                textAnchor="middle"
                className="fill-terrain-ridge font-display font-bold"
                fontSize="2.6"
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth="0.8"
                strokeLinejoin="round"
              >
                סלע (נקודת מחסה)
              </text>
            </g>
          ))}
          {/* Cover-hopping path */}
          <path
            d="M10 65 L25 58 L42 45 L78 32 L90 25"
            fill="none"
            className="stroke-status-ok"
            strokeWidth="0.7"
            strokeDasharray="2 1"
          />
        </motion.g>

        {/* Layer 4: Concealment (vegetation patches) */}
        <motion.g initial={false} animate={{ opacity: showConcealment ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          {[
            { x: 18, y: 60, r: 5 },
            { x: 35, y: 50, r: 4 },
            { x: 65, y: 55, r: 6 },
            { x: 82, y: 38, r: 4.5 },
          ].map((v, i) => (
            <ellipse
              key={i}
              cx={v.x}
              cy={v.y}
              rx={v.r}
              ry={v.r * 0.7}
              className="fill-terrain-olive/45 stroke-terrain-olive/70"
              strokeWidth="0.3"
            />
          ))}
          <text
            x="35"
            y="69"
            textAnchor="middle"
            className="fill-terrain-olive font-display font-bold"
            fontSize="3"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            יער צפוף · הסתרה
          </text>
        </motion.g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        4 שכבות לתנועה חכמה בשטח
      </div>
    </div>
  );
}

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-sm font-display font-semibold text-fg-muted tracking-wider">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
