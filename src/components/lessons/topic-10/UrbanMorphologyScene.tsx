'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Pattern = 'grid' | 'casbah';

type PatternData = {
  id: Pattern;
  label: string;
  english: string;
  desc: string;
  losRange: string;
  movement: string;
  attacker: string;
  defender: string;
  example: string;
  icon: IconName;
  color: string;
  bg: string;
  border: string;
};

const PATTERNS: PatternData[] = [
  {
    id: 'grid',
    label: 'גריד עירוני',
    english: 'Urban Grid',
    desc: 'רחובות ישרים וארוכים שחותכים זה את זה בזוויות של 90 מעלות, כמו לוח שחמט. תחשבו על ערים מודרניות כמו ניו-יורק, וושינגטון או מרכז העיר התחתית בחיפה.',
    losRange: 'אפשר לראות (ולירות) למרחק של מאות מטרים קדימה לאורך השדרה. מצד שני, אי אפשר לראות בכלל מה קורה ברחובות המקבילים, בגלל הבניינים שמסתירים.',
    movement: 'הניווט קל אבל צפוי מראש. החיילים יודעים בדיוק מתי מגיע צומת ואיפה צריך לפנות – אבל גם האויב יודע את זה ויכול לחכות להם שם.',
    attacker: 'יתרון: קל לנווט, לעקוף דרך רחובות מקבילים, ולהבין איפה האויב נמצא. חיסרון: כוח שצועד ברחוב חשוף לגמרי לירי צלפים ארוך טווח (Enfilade) לאורך כל השדרה.',
    defender: 'יתרון: אפשר להפוך צמתים ל"צווארי בקבוק" – נקודות שליטה שכל מי שעובר בהן נחשף לאש. חיסרון: צריך לאבטח המון פינות וכיוונים בו-זמנית בגלל המבנה הפתוח.',
    example: 'בזמן הפלישה לבגדאד ב-2003, האמריקאים נסעו בשדרות הרחבות וחטפו טילי RPG מכל פינה. "רחוב חיפה" בעיר הפך לסיוט בדיוק בגלל זה – האויב פשוט ירה עליהם מרחוק, לאורך כל הרחוב הישר.',
    icon: 'compass',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/40',
  },
  {
    id: 'casbah',
    label: 'קסבה / סמטאות',
    english: 'Casbah / Old Quarter',
    desc: 'מבוך של סמטאות צפופות ומתפתלות, שבהן הבניינים כמעט נוגעים זה בזה. תחשבו על העיר העתיקה בירושלים, מחנות פליטים או קסבות עתיקות.',
    losRange: 'אי אפשר לראות רחוק. שדה הראייה חסום ומוגבל לפעמים למטרים בודדים בלבד. כל סיבוב פינה הוא הפתעה ועלול להוביל להיתקלות מטווח אפס.',
    movement: 'ניווט שהוא סיוט. ה-GPS מאבד קליטה בגלל הצפיפות והסמטאות המקורות, ומפות לא תמיד עוזרות. כדי באמת להתמצא שם, צריך להכיר את השטח ברגליים כמו מקומי.',
    attacker: 'חיסרון ענק: האויב יכול להציב מארב או מטען חבלה בכל סיבוב. בנוסף, צבא גדול לא יכול להיכנס לשם עם טנקים ונאלץ ללכת ברגל, בטור ארוך וצר, מה שהופך אותו למטרה קלה.',
    defender: 'יתרון מובהק: המגן משחק במגרש הביתי שלו. הוא מכיר כל דלת סתרים, כל גג וכל מנהרה, ויכול לתקוף את החיילים ולהיעלם תוך שניות.',
    example: 'באלג\'יריה (1957), המורדים שלטו לחלוטין בקסבה הצפופה של הבירה. כדי לנצח אותם, הצבא הצרפתי נאלץ לשלוח יחידות קומנדו שיעברו פיזית, ויכבשו את העיר מבית לבית, דלת אחרי דלת.',
    icon: 'eye',
    color: 'text-accent-hot',
    bg: 'bg-accent-hot/10',
    border: 'border-accent-hot/40',
  },
];

export function UrbanMorphologyScene() {
  const [pattern, setPattern] = useState<Pattern>('grid');
  const meta = PATTERNS.find((p) => p.id === pattern)!;

  return (
    <section id="scene-morphology" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="10.1"
        eyebrow="מורפולוגיה עירונית"
        title={
          <>
            <span className="text-accent-hover">גריד או קסבה?</span> אותה משימה — שני עולמות שונים
          </>
        }
        intro="הצורה הפיזית של העיר משפיעה על הקרב הרבה יותר מאשר סוג הנשק או כמות החיילים. הילחמות ברחוב ישר ומסודר שונה לחלוטין מהילחמות בסמטה צפופה ומתפתלת. זה לא רק עניין של נוף – כל סביבה דורשת שיטת לחימה שונה לחלוטין."
      />

      <div className="p-5 mb-6">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">MOUT (לש"ב)</strong> — ראשי תיבות של "לוחמה בשטח בנוי" (Military Operations in Urban Terrain).
            <strong className="text-fg block mt-1.5">המאפיין הקריטי:</strong> בשטח פתוח חיילים יורים אחד על השני ממרחק של קילומטרים, אבל בעיר זה יורד ל<strong>מטרים בודדים, פנים אל פנים</strong>. בסביבה כזו, היתרון של טנקים או מטוסי קרב מצטמצם דרמטית, והיתרון של הצד שמכיר את הסמטאות הכי טוב – הופך למכריע.
          </div>
        </div>
      </div>

      {/* Pattern selector */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {PATTERNS.map((p) => {
          const isActive = pattern === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPattern(p.id)}
              className={cn(
                'surface p-4 text-right transition-all rounded-xl flex items-center gap-3',
                isActive ? `${p.border} ${p.bg}` : 'hover:border-border-strong'
              )}
            >
              <Icon name={p.icon} size={32} className={cn(p.color, 'shrink-0')} />
              <div>
                <div className={cn('font-display font-bold leading-tight', isActive && p.color)}>
                  {p.label}
                </div>
                <div className="text-[10px] font-mono text-fg-dim">{p.english}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Comparison map */}
      <div className="surface-elevated p-4 rounded-2xl mb-6">
        <div className="text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider">
          מבט אווירי · {meta.label}
        </div>
        <UrbanMap pattern={pattern} />
        <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-mono text-fg-dim flex-wrap">
          <span className="flex items-center gap-1"><span className="size-2 bg-accent-cool rounded-full" /> הכוח שלנו</span>
          <span className="flex items-center gap-1"><span className="size-2 bg-status-ok/40 rounded-sm" /> שטח מואר (קשר עין - LOS)</span>
          <span className="flex items-center gap-1"><span className="size-2 bg-status-danger/40 rounded-sm" /> שטח מת (מוסתר מהעין)</span>
          <span className="flex items-center gap-1"><span className="size-2 bg-accent-hot rounded-full" /> איום פוטנציאלי</span>
        </div>
      </div>

      {/* Pattern details */}
      <AnimatePresence mode="wait">
        <motion.div
          key={meta.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className={cn('surface-elevated p-6 rounded-2xl border-r-4 mb-12', meta.border.replace('border-', 'border-r-'))}
        >
          <div className="mb-4">
            <div className={cn('text-sm font-display font-semibold mb-1 tracking-wider', meta.color)}>
              {meta.english}
            </div>
            <h3 className="font-display font-bold text-2xl leading-tight mb-2 text-accent-deep">{meta.label}</h3>
            <p className="text-sm text-fg leading-relaxed">{meta.desc}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div className="surface p-4 rounded-xl">
              <div className="text-sm font-display font-semibold text-fg-muted mb-1.5 tracking-wider flex items-center gap-1.5">
                <Icon name="eye" size={11} />
                טווח LOS
              </div>
              <p className="text-sm text-fg leading-relaxed">{meta.losRange}</p>
            </div>
            <div className="surface p-4 rounded-xl">
              <div className="text-sm font-display font-semibold text-fg-muted mb-1.5 tracking-wider flex items-center gap-1.5">
                <Icon name="truck" size={11} />
                תנועה
              </div>
              <p className="text-sm text-fg leading-relaxed">{meta.movement}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div className="surface p-4 rounded-xl bg-accent-cool/5 border-accent-cool/30">
              <div className="text-sm font-display font-semibold text-accent-cool mb-1.5 tracking-wider">לתוקף</div>
              <p className="text-sm text-fg-muted leading-relaxed">{meta.attacker}</p>
            </div>
            <div className="surface p-4 rounded-xl bg-accent-hot/5 border-accent-hot/30">
              <div className="text-sm font-display font-semibold text-accent-hot mb-1.5 tracking-wider">למגן</div>
              <p className="text-sm text-fg-muted leading-relaxed">{meta.defender}</p>
            </div>
          </div>

          <div className="surface p-3 rounded-lg bg-bg-accent/30 border border-border">
            <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">דוגמה היסטורית</div>
            <p className="text-xs text-fg leading-relaxed italic">"{meta.example}"</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Enfilade concept callout */}
      <div className="">
        <div className="flex gap-4 items-start">
          <Icon name="crosshair" size={32} className="text-accent shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">
              Enfilade (אש לאורך הציר) · מלכודת המוות של הרחובות הישרים
            </div>
            <h3 className="font-display font-bold text-lg leading-tight mb-2">
              קו אש שמכסה את כל אורך הרחוב
            </h3>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty">
              <strong className="text-fg">Enfilade ("אנפילייד")</strong> = מצב שבו צלף או מכונת ירייה מתמקמים בקצה של רחוב ישר, ויכולים לפגוע בקלות בכל מי שהולך בו, גם ממרחק של מאות מטרים. בעיר שבה הרחובות מסודרים ברשת ישרה (גריד), זהו האיום הכי קטלני על החיילים.
              <strong className="text-fg block mt-1.5">הפתרון בשטח:</strong> במקום ללכת ברחוב כמו מטרות נעות, החיילים נעים דרך גגות או שוברים קירות כדי לעבור בין בתים (שיטה שנקראת "ריצת עכברים"), ובכך עוקפים את הרחוב הראשי לחלוטין.
              <strong className="text-fg block mt-1.5">לזכור:</strong> בסטלינגרד, שדרה אחת ארוכה קיבלה את השם "שדרת המוות". חייל גרמני שהוציא את הראש לרחוב – נורה ומת תוך 3 שניות בממוצע.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function UrbanMap({ pattern }: { pattern: Pattern }) {
  return (
    <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
      <svg viewBox="0 0 100 56" className="w-full h-full">
        <defs>
          <linearGradient id="urban-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e6ebf2" />
            <stop offset="100%" stopColor="#dde6f0" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="56" fill="url(#urban-bg)" />

        {pattern === 'grid' && <GridLayout />}
        {pattern === 'casbah' && <CasbahLayout />}
      </svg>
    </div>
  );
}

function GridLayout() {
  // Grid: regular blocks with wide streets
  const blocks: { x: number; y: number; w: number; h: number }[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 7; col++) {
      blocks.push({ x: 8 + col * 13, y: 5 + row * 12, w: 9, h: 8 });
    }
  }

  return (
    <g>
      {/* Streets background */}
      <rect x="0" y="0" width="100" height="56" className="fill-terrain-ridge/10" />

      {/* Blocks */}
      {blocks.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} className="fill-terrain-ridge/60 stroke-terrain-ridge" strokeWidth="0.2" />
      ))}

      {/* Soldier position */}
      <g>
        <circle cx="15" cy="28" r="1.6" className="fill-accent-cool" />
      </g>

      {/* Long LOS cone — visible along horizontal street */}
      <polygon points="15,28 95,26 95,32 15,30" className="fill-status-ok" opacity="0.18" />
      <line x1="15" y1="28" x2="95" y2="28" className="stroke-status-ok" strokeWidth="0.3" strokeDasharray="1.5 0.8" />
      <text x="55" y="25" textAnchor="middle" className="fill-status-ok font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
        קו ראייה ארוך · 800 מ׳
      </text>

      {/* Dead spaces (behind buildings) */}
      {[
        { x: 19, y: 16 },
        { x: 32, y: 16 },
        { x: 45, y: 16 },
        { x: 19, y: 40 },
        { x: 32, y: 40 },
      ].map((d, i) => (
        <rect key={i} x={d.x - 1} y={d.y - 1} width="10" height="10" className="fill-status-danger" opacity="0.15" />
      ))}

      {/* Threat from end of street */}
      <g>
        <circle cx="88" cy="28" r="1.3" className="fill-accent-hot" />
        <circle cx="88" cy="28" r="3" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
          <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="88" y="24" textAnchor="middle" className="fill-accent-hot font-display font-bold font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
          צלף בקצה הרחוב (Enfilade)
        </text>
      </g>

      {/* Stats label */}
      <text x="50" y="53" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
        רחובות ישרים · קווי אש ארוכים · האויב יודע מאיפה תבואו
      </text>
    </g>
  );
}

function CasbahLayout() {
  // Casbah: irregular blocks, twisting alleys
  const blocks: { x: number; y: number; w: number; h: number; rot?: number }[] = [
    { x: 8, y: 6, w: 9, h: 7 },
    { x: 19, y: 4, w: 8, h: 9 },
    { x: 29, y: 7, w: 10, h: 6 },
    { x: 41, y: 5, w: 7, h: 8 },
    { x: 50, y: 6, w: 9, h: 7 },
    { x: 61, y: 4, w: 8, h: 8 },
    { x: 71, y: 7, w: 7, h: 7 },
    { x: 80, y: 5, w: 9, h: 9 },
    // Row 2 — staggered
    { x: 7, y: 16, w: 7, h: 8 },
    { x: 16, y: 18, w: 9, h: 6 },
    { x: 27, y: 16, w: 8, h: 9 },
    { x: 37, y: 19, w: 10, h: 6 },
    { x: 49, y: 17, w: 7, h: 8 },
    { x: 58, y: 18, w: 9, h: 7 },
    { x: 69, y: 16, w: 8, h: 9 },
    { x: 79, y: 18, w: 9, h: 6 },
    // Row 3
    { x: 9, y: 27, w: 8, h: 8 },
    { x: 19, y: 28, w: 9, h: 7 },
    { x: 30, y: 26, w: 7, h: 9 },
    { x: 39, y: 29, w: 9, h: 6 },
    { x: 50, y: 27, w: 8, h: 8 },
    { x: 60, y: 28, w: 9, h: 7 },
    { x: 71, y: 26, w: 8, h: 9 },
    { x: 81, y: 28, w: 8, h: 7 },
    // Row 4
    { x: 8, y: 38, w: 9, h: 8 },
    { x: 19, y: 39, w: 7, h: 7 },
    { x: 28, y: 37, w: 9, h: 9 },
    { x: 39, y: 40, w: 8, h: 6 },
    { x: 49, y: 38, w: 9, h: 8 },
    { x: 60, y: 39, w: 7, h: 7 },
    { x: 69, y: 37, w: 9, h: 9 },
    { x: 80, y: 40, w: 8, h: 6 },
  ];

  return (
    <g>
      {/* Streets background */}
      <rect x="0" y="0" width="100" height="56" className="fill-terrain-ridge/15" />

      {/* Blocks — irregular */}
      {blocks.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          className="fill-terrain-ridge/60 stroke-terrain-ridge"
          strokeWidth="0.2"
        />
      ))}

      {/* Soldier position */}
      <g>
        <circle cx="12" cy="32" r="1.6" className="fill-accent-cool" />
      </g>

      {/* Short LOS cone — just up to first corner */}
      <polygon points="12,32 22,30 23,34 12,33" className="fill-status-ok" opacity="0.25" />
      <text x="18" y="29" textAnchor="middle" className="fill-status-ok font-display font-bold" fontSize="2.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
        קו ראייה קצר מ-8 מ׳
      </text>

      {/* Dead spaces (everywhere) */}
      {[
        { x: 28, y: 32 },
        { x: 42, y: 30 },
        { x: 58, y: 32 },
        { x: 72, y: 28 },
        { x: 30, y: 42 },
        { x: 50, y: 44 },
      ].map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="3" className="fill-status-danger" opacity="0.18" />
      ))}

      {/* Multiple threats — appearing from all directions */}
      {[
        { x: 32, y: 35, label: 'מארב פתע' },
        { x: 55, y: 40, label: 'מטען חבלה (IED)' },
        { x: 78, y: 30, label: 'מחבל מסתתר' },
      ].map((t, i) => (
        <g key={i}>
          <circle cx={t.x} cy={t.y} r="1" className="fill-accent-hot" />
          <circle cx={t.x} cy={t.y} r="2.5" fill="none" className="stroke-accent-hot/50" strokeWidth="0.25">
            <animate attributeName="r" values="1.6;4;1.6" dur="2s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
          </circle>
          <text x={t.x} y={t.y - 2.2} textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="1.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.6" strokeLinejoin="round">
            {t.label}
          </text>
        </g>
      ))}

      {/* Stats label */}
      <text x="50" y="53" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
        סמטאות מתפתלות · הראייה חסומה · איומים צצים מכל פינה
      </text>
    </g>
  );
}