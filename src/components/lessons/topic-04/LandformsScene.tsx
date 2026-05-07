'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Form = 'hill' | 'spur' | 'valley' | 'saddle' | 'depression';

type FormData = {
  id: Form;
  label: string;
  english: string;
  description: string;
  contourHint: string;
  tactical: string;
  example: string;
};

const FORMS: FormData[] = [
  {
    id: 'hill',
    label: 'כיפה',
    english: 'Hill / Peak',
    description: 'הר או גבעה — נקודה גבוהה שעולה מעל הסביבה. הכי "פשוט" לזיהוי ולכן הכי חשוב.',
    contourHint: 'במפה: סדרת מעגלים סגורים אחד בתוך השני, כמו טבעות בצל. הקטן ביותר הוא הפסגה.',
    tactical: 'יעד קלאסי. מי שתופס אותו רואה את כל הסביבה ויורה ראשון. תוקפים שואפים לכבוש אותה — מגנים מבססים שם את העיגון.',
    example: 'במלחמת יום הכיפורים: כל הקרבות בגולן היו על כיפות (תל פאריס, חרמונית, ועוד). מי שאיבד את הכיפה — איבד את הקרב המקומי.',
  },
  {
    id: 'spur',
    label: 'שלוחה',
    english: 'Spur / Ridge',
    description: 'אזור גבוה צר וארוך שיורד בהדרגה מפסגה אל השטח הנמוך. כמו "אצבע" שיוצאת מהר.',
    contourHint: 'במפה: קווי גובה בצורת V או U עם הקודקוד פונה למטה (לכיוון השטח הנמוך).',
    tactical: 'נתיב התקדמות מועדף לחי"ר — אפשר ללכת לאורכה עם תצפית מצוינת על העמקים מסביב. הצד השני: הולכים בחשיפה למעלה.',
    example: 'בלחימה בלבנון, יחידות הסיור נצמדו לשלוחות ככל האפשר — תצפית רחבה, מעט מארבים, יציאה נוחה אם מסתבכים.',
  },
  {
    id: 'valley',
    label: 'גיא / ואדי',
    english: 'Valley / Draw',
    description: 'אזור נמוך בין שתי שלוחות. בדרך כלל ערוץ של נחל זמני או קבוע.',
    contourHint: 'במפה: קווי גובה בצורת V שמצביעים כלפי מעלה (הפוך משלוחה). חבל הניקוז של מי גשם.',
    tactical: 'נסתר מתצפית — מצוין להחבאה, פחות טוב לתנועה. כי אתה בעמק = הצד השני מעליך משני הצדדים. סכנת מארבים גבוהה.',
    example: 'במבצע "לבנון השנייה" 2006: יחידות שעברו בוואדיות סבלו ממארבים מהשלוחות. כל ואדי לא מאובטח = מלכודת פוטנציאלית.',
  },
  {
    id: 'saddle',
    label: 'אוכף',
    english: 'Saddle',
    description: 'נקודת השפל הנמוכה ביותר בין שתי כיפות סמוכות על קו רכס. כמו "מעבר" בין שני הרים.',
    contourHint: 'במפה: שני זוגות של מעגלי כיפה סמוכים, ובאמצע ביניהם — האוכף.',
    tactical: 'מעבר נוח — לכן כולם נמשכים אליו (אפקט המשפך). לכן: כוח מגן יודע מראש שהאויב יבוא דרכו, ומכין שם "שטח השמדה".',
    example: 'מעבר ה-Ardennes במלחמת העולם השנייה — אוכף שכולם חשבו שאי אפשר לעבור בו. הגרמנים הפתיעו ועברו בו.',
  },
  {
    id: 'depression',
    label: 'שקע',
    english: 'Depression',
    description: 'אזור סגור שנמוך ממה שמסביבו. כמו "בור" בנוף.',
    contourHint: 'במפה: קווי גובה עם זיזים קטנים פונים פנימה (לסמן שהשטח שם נמוך).',
    tactical: 'מסתור מצוין מתצפית ואש ישירה — כי הוא מוקף ממעל. נהוג להשתמש לבסיסי לוגיסטיקה, מפקדות ותותחים.',
    example: 'תותחי הסורים במלחמת יום הכיפורים הוסתרו בשקעים על רמת הגולן — ולכן צה"ל התקשה לזהות אותם מהאוויר.',
  },
];

type Slope = {
  id: string;
  label: string;
  description: string;
  contourHint: string;
};

const SLOPES: Slope[] = [
  { id: 'even',     label: 'מדרון קצוב',   description: 'שיפוע אחיד מההתחלה עד הסוף. לא משתנה.',                                                                  contourHint: 'קווי גובה במרווחים אחידים (קבועים) — לא הולכים ומתקרבים או מתרחקים.' },
  { id: 'convex',   label: 'מדרון קמור',   description: 'תלול בתחתית, מתון כשעולים. כמו "כיפה" שמתעגלת למעלה.',                                                  contourHint: 'בתחתית — קווים צפופים. למעלה — קווים מתרחקים.' },
  { id: 'concave',  label: 'מדרון קעור',   description: 'מתון בתחתית, תלול למעלה. אם תטפס — תרגיש שזה "כבד" יותר ככל שעולה.',                                       contourHint: 'בתחתית — קווים מרוחקים. למעלה — קווים מתקרבים.' },
  { id: 'shoulder', label: 'כתף',           description: 'מדרון תלול שנעצר ונפתח לקטע מתון או מישורי, ואז ממשיך. מין "מדרגה" באמצע ההר.',                          contourHint: 'קווים צפופים → קווים מרוחקים פתאום → קווים צפופים שוב.' },
];

export function LandformsScene() {
  const [active, setActive] = useState<Form>('hill');
  const [slope, setSlope] = useState(SLOPES[0].id);
  const meta = FORMS.find((f) => f.id === active)!;

  return (
    <section id="scene-landforms" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="04.2"
        eyebrow="תבניות נוף"
        title={
          <>
            5 צורות נוף ש<span className="gradient-text">חוזרות בכל מלחמה</span>
          </>
        }
        intro="מתוך עשרות צורות אפשריות, יש 5 שמופיעות שוב ושוב בקרבות. אם אתה יודע לזהות אותן ולהבין מה הן עושות לקרב — אתה במקום אחר לגמרי."
      />

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-stretch mb-12">
        <div className="space-y-2">
          {FORMS.map((f, i) => {
            const isActive = active === f.id;
            return (
              <motion.button
                key={f.id}
                onClick={() => setActive(f.id)}
                whileHover={{ x: -3 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full surface p-4 text-right transition-all flex items-center gap-3 relative overflow-hidden',
                  isActive ? 'border-accent shadow-glow bg-accent/5' : 'hover:border-border-strong'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="t4-form-bar"
                    className="absolute inset-y-0 end-0 w-1 bg-accent rounded-l-full"
                  />
                )}
                <span
                  className={cn(
                    'size-9 rounded-xl flex items-center justify-center shrink-0 transition-all font-mono text-sm font-bold',
                    isActive ? 'bg-accent text-bg shadow-glow' : 'bg-bg-accent text-fg-muted'
                  )}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={cn('font-display font-bold leading-tight', isActive ? 'text-accent' : 'text-fg')}>
                    {f.label}
                  </div>
                  <div className="text-[10px] font-mono text-fg-dim mt-0.5">{f.english}</div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="surface-elevated relative overflow-hidden min-h-[320px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <FormVisual form={active} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="grid md:grid-cols-3 gap-4 mb-12"
        >
          <div className="surface-elevated p-5 border-r-4 border-r-accent-cool">
            <div className="text-[10px] font-mono text-accent-cool mb-2 tracking-widest uppercase">
              מה זה
            </div>
            <p className="text-sm leading-relaxed text-fg">{meta.description}</p>
          </div>
          <div className="surface-elevated p-5 border-r-4 border-r-accent">
            <div className="text-[10px] font-mono text-accent mb-2 tracking-widest uppercase">
              איך מזהים במפה
            </div>
            <p className="text-sm leading-relaxed text-fg">{meta.contourHint}</p>
          </div>
          <div className="surface-elevated p-5 border-r-4 border-r-status-warn">
            <div className="text-[10px] font-mono text-status-warn mb-2 tracking-widest uppercase">
              משמעות צבאית
            </div>
            <p className="text-sm leading-relaxed text-fg">{meta.tactical}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="surface p-5 mb-12 border-r-4 border-r-accent flex gap-3 items-start"
      >
        <Icon name="spark" size={20} className="text-accent shrink-0 mt-0.5" />
        <div>
          <div className="text-[10px] font-mono text-accent mb-1 tracking-widest uppercase">דוגמה היסטורית</div>
          <p className="text-sm text-fg-muted leading-relaxed">{meta.example}</p>
        </div>
      </motion.div>

      <SoftDivider text="עוד שכבה: לא רק צורת ההר — גם צורת המדרון" />

      <SlopeAnalyzer slopes={SLOPES} active={slope} onSelect={setSlope} />
    </section>
  );
}

function FormVisual({ form }: { form: Form }) {
  return (
    <div className="aspect-[4/3] sm:aspect-auto h-full relative">
      <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width="100" height="75" className="fill-bg" />
        {/* Grid */}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={'gx' + i} x1={i * 10} y1="0" x2={i * 10} y2="75" className="stroke-border-subtle" strokeWidth="0.08" />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={'gy' + i} x1="0" y1={i * 9.4} x2="100" y2={i * 9.4} className="stroke-border-subtle" strokeWidth="0.08" />
        ))}

        {form === 'hill' && <HillContours />}
        {form === 'spur' && <SpurContours />}
        {form === 'valley' && <ValleyContours />}
        {form === 'saddle' && <SaddleContours />}
        {form === 'depression' && <DepressionContours />}
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <Icon name="layers" size={11} className="text-accent" />
        תצוגה במפה טופוגרפית
      </div>
    </div>
  );
}

function HillContours() {
  return (
    <g>
      {[
        { rx: 36, ry: 22 },
        { rx: 28, ry: 17 },
        { rx: 20, ry: 12 },
        { rx: 12, ry: 7 },
        { rx: 5, ry: 3 },
      ].map((c, i) => (
        <ellipse key={i} cx="50" cy="38" rx={c.rx} ry={c.ry} fill="none" className="stroke-accent" strokeWidth={i === 0 ? 0.5 : 0.3} />
      ))}
      <polygon points="50,36 47,42 53,42" className="fill-accent" />
      <text x="50" y="38" textAnchor="middle" className="fill-accent text-[2.3px] font-mono">פסגה</text>
    </g>
  );
}

function SpurContours() {
  // V-shapes pointing down (toward lower ground at bottom)
  return (
    <g>
      {[18, 26, 34, 42, 50].map((y, i) => (
        <path
          key={i}
          d={`M ${20} ${y} Q ${50} ${y + 12} ${80} ${y}`}
          fill="none"
          className="stroke-accent"
          strokeWidth={i === 0 ? 0.5 : 0.3}
        />
      ))}
      <text x="50" y="68" textAnchor="middle" className="fill-accent text-[2.5px] font-mono font-bold">↓ שלוחה יורדת</text>
      <text x="50" y="14" textAnchor="middle" className="fill-fg-muted text-[2.2px] font-mono">הרכס</text>
    </g>
  );
}

function ValleyContours() {
  // V-shapes pointing UP (opposite of spur)
  return (
    <g>
      {[58, 50, 42, 34, 26].map((y, i) => (
        <path
          key={i}
          d={`M ${20} ${y} Q ${50} ${y - 12} ${80} ${y}`}
          fill="none"
          className="stroke-accent"
          strokeWidth={i === 0 ? 0.5 : 0.3}
        />
      ))}
      <text x="50" y="68" textAnchor="middle" className="fill-accent text-[2.5px] font-mono font-bold">↑ הגיא יורד</text>
      <line x1="20" y1="58" x2="50" y2="46" className="stroke-terrain-sky" strokeWidth="0.6" />
      <line x1="50" y1="46" x2="80" y2="58" className="stroke-terrain-sky" strokeWidth="0.6" />
      <text x="50" y="44" textAnchor="middle" className="fill-terrain-sky text-[2.2px] font-mono">קו ניקוז</text>
    </g>
  );
}

function SaddleContours() {
  // Two hills with low pass between
  return (
    <g>
      {/* Left hill */}
      {[
        { rx: 14, ry: 9 },
        { rx: 10, ry: 6 },
        { rx: 6, ry: 4 },
      ].map((c, i) => (
        <ellipse key={'l' + i} cx="28" cy="38" rx={c.rx} ry={c.ry} fill="none" className="stroke-accent" strokeWidth={i === 0 ? 0.5 : 0.3} />
      ))}
      {/* Right hill */}
      {[
        { rx: 14, ry: 9 },
        { rx: 10, ry: 6 },
        { rx: 6, ry: 4 },
      ].map((c, i) => (
        <ellipse key={'r' + i} cx="72" cy="38" rx={c.rx} ry={c.ry} fill="none" className="stroke-accent" strokeWidth={i === 0 ? 0.5 : 0.3} />
      ))}
      {/* Saddle indicator */}
      <ellipse cx="50" cy="38" rx="5" ry="3" fill="none" className="stroke-accent-hot" strokeWidth="0.5" strokeDasharray="0.8 0.6" />
      <text x="50" y="39" textAnchor="middle" className="fill-accent-hot text-[2.5px] font-mono font-bold">אוכף</text>
      <text x="28" y="28" textAnchor="middle" className="fill-fg-muted text-[2px] font-mono">כיפה</text>
      <text x="72" y="28" textAnchor="middle" className="fill-fg-muted text-[2px] font-mono">כיפה</text>
    </g>
  );
}

function DepressionContours() {
  return (
    <g>
      {[
        { rx: 28, ry: 18 },
        { rx: 20, ry: 13 },
        { rx: 13, ry: 8 },
        { rx: 7, ry: 4 },
      ].map((c, i) => (
        <g key={i}>
          <ellipse cx="50" cy="38" rx={c.rx} ry={c.ry} fill="none" className="stroke-accent" strokeWidth={i === 0 ? 0.5 : 0.3} />
          {/* Tick marks pointing inward to indicate depression */}
          {Array.from({ length: 8 }).map((_, j) => {
            const a = (j * 45 * Math.PI) / 180;
            const x1 = 50 + Math.cos(a) * c.rx;
            const y1 = 38 + Math.sin(a) * c.ry;
            const x2 = 50 + Math.cos(a) * (c.rx - 1.5);
            const y2 = 38 + Math.sin(a) * (c.ry - 1.5);
            return <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-accent" strokeWidth="0.2" />;
          })}
        </g>
      ))}
      <text x="50" y="40" textAnchor="middle" className="fill-accent text-[2.5px] font-mono font-bold">↓ שקע</text>
      <text x="50" y="14" textAnchor="middle" className="fill-fg-muted text-[2.2px] font-mono">הזיזים פונים פנימה = השטח שם נמוך</text>
    </g>
  );
}

function SlopeAnalyzer({ slopes, active, onSelect }: { slopes: Slope[]; active: string; onSelect: (id: string) => void }) {
  const meta = slopes.find((s) => s.id === active)!;

  return (
    <div className="surface-elevated p-6 sm:p-8">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-1">4 סוגי מדרונות — איך השלוחות בנויות בפועל</h3>
        <p className="text-fg-muted text-sm">
          אפילו שלוחה "פשוטה" יכולה להיות מורכבת ממקטעי שיפוע שונים. ההבחנה ביניהם משנה לחלוטין את קצב התנועה ואת קווי הראייה.
        </p>
      </div>

      <div className="grid sm:grid-cols-4 gap-2 mb-5">
        {slopes.map((s) => {
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={cn(
                'p-3 rounded-xl border-2 text-center transition-all',
                isActive ? 'border-accent bg-accent/10' : 'border-border bg-bg-card hover:border-border-strong'
              )}
            >
              <div className={cn('font-display font-bold text-sm leading-tight', isActive && 'text-accent')}>
                {s.label}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 items-stretch">
        <div className="surface relative overflow-hidden aspect-[4/3]">
          <SlopeProfile slope={active} />
        </div>

        <motion.div
          key={active}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-3"
        >
          <div className="surface-elevated p-5 border-r-4 border-r-accent-cool">
            <div className="text-[10px] font-mono text-accent-cool mb-2 tracking-widest uppercase">
              מה זה
            </div>
            <p className="text-sm leading-relaxed text-fg">{meta.description}</p>
          </div>
          <div className="surface p-5 border-r-4 border-r-accent">
            <div className="text-[10px] font-mono text-accent mb-2 tracking-widest uppercase">
              איך מזהים במפה
            </div>
            <p className="text-sm leading-relaxed text-fg-muted">{meta.contourHint}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function SlopeProfile({ slope }: { slope: string }) {
  const PATHS: Record<string, string> = {
    even:     'M 5 60 L 90 12',
    convex:   'M 5 60 Q 30 50 60 25 L 90 18',
    concave:  'M 5 60 L 35 50 Q 65 35 90 12',
    shoulder: 'M 5 60 L 30 35 L 60 32 L 90 12',
  };

  return (
    <svg viewBox="0 0 100 75" className="w-full h-full">
      <rect x="0" y="0" width="100" height="75" className="fill-bg-elevated" />

      {/* Grid */}
      {Array.from({ length: 10 }).map((_, i) => (
        <g key={i}>
          <line x1={i * 10} y1="0" x2={i * 10} y2="75" className="stroke-border-subtle" strokeWidth="0.08" />
          <line x1="0" y1={i * 9.4} x2="100" y2={i * 9.4} className="stroke-border-subtle" strokeWidth="0.08" />
        </g>
      ))}

      {/* Ground line */}
      <line x1="0" y1="65" x2="100" y2="65" className="stroke-border-strong" strokeWidth="0.3" strokeDasharray="1 0.5" />

      {/* The slope profile */}
      <path d={PATHS[slope]} fill="none" className="stroke-accent" strokeWidth="0.8" />

      {/* Filled below */}
      <path d={`${PATHS[slope]} L 90 65 L 5 65 Z`} className="fill-terrain-ridge/20" />

      {/* Labels */}
      <text x="5" y="69" className="fill-fg-muted text-[2.5px] font-mono">תחתית</text>
      <text x="90" y="9" textAnchor="end" className="fill-fg-muted text-[2.5px] font-mono">פסגה</text>
    </svg>
  );
}

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-[10px] font-mono text-fg-dim tracking-widest uppercase">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
