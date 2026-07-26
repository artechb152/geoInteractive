'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Dim = 'above' | 'street' | 'below';

type DimData = {
  id: Dim;
  label: string;
  english: string;
  icon: IconName;
  altitude: string;
  coreFactIcon: IconName;
  coreFact: string;
  threats: string[];
  weakness: string;
  example: string;
  exampleTag: string;
  color: string;
  bg: string;
  border: string;
};

const DIMS: DimData[] = [
  {
    id: 'above',
    label: 'מעל הקרקע',
    english: 'Above Ground · Vertical',
    icon: 'mountain',
    altitude: '5–150 מ׳ מעל הקרקע',
    coreFactIcon: 'eye',
    coreFact: 'יתרון תצפית: מגדלים הם "גבעות בטון" ששולטות על השטח',
    threats: [
      'צלפים על גגות עם טילי כתף (RPG) או נשק קל',
      'ירי טילי נ"ט מלמעלה — פוגע בגג הטנק, הנקודה הכי פגיעה שלו',
      'זריקת מטענים ורימונים על שיירות מתוך חלונות',
    ],
    weakness: 'חשיפה קטלנית מהאוויר. מי שנמצא על הגג גלוי לחלוטין לרחפנים, מסוקים ומטוסי קרב. בנוסף, למרות שלצלף יש זווית מצוינת, קשה לו מאוד לברוח מהר ממגדל גבוה.',
    example: 'בקרב על מוסול שבעיראק, צלפי דאעש פעלו מתוך מגדלי משרדים גבוהים. כוחות הקואליציה (בהובלת ארה"ב) הצליחו לפגוע בהם רק אחרי שאיתרו אותם במדויק מהאוויר והשתמשו בטילים מונחים.',
    exampleTag: 'מוסול, עיראק',
    color: 'text-accent-hot',
    bg: 'bg-accent-hot/10',
    border: 'border-accent-hot/40',
  },
  {
    id: 'street',
    label: 'גובה הרחוב',
    english: 'Street Level',
    icon: 'crosshair',
    altitude: '0–5 מ׳ — הקרקע',
    coreFactIcon: 'crosshair',
    coreFact: 'חשיפה מ-360°: איום בו-זמנית מלמעלה, מהצדדים ומלמטה',
    threats: [
      'מטעני חבלה (IED) בתוך קירות, מתחת לאספלט או ברכבים חונים',
      'מארבים ואש פתאומית מטווח אפס מתוך סמטאות צדדיות',
      'קרבות פנים-אל-פנים במרחק של מטרים בודדים',
    ],
    weakness: 'החיילים ברחוב הם המטרה הנוחה ביותר — הם מותקפים מכל הכיוונים בו-זמנית: מלמעלה (גגות), מהצדדים (חלונות) ומלמטה (מנהרות).',
    example: 'במלחמת צ\'צ\'ניה (1994), טור טנקים רוסי נכנס לרחוב הראשי של העיר גרוזני וחטף אש משלושה כיוונים בו-זמנית. הכוח נלכד, ובתוך 3 שעות בלבד כ-100 רכבים משוריינים הושמדו לחלוטין.',
    exampleTag: 'גרוזני, צ\'צ\'ניה 1994',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/40',
  },
  {
    id: 'below',
    label: 'תת-קרקע',
    english: 'Subterranean',
    icon: 'layers',
    altitude: '5–30 מ׳ מתחת לקרקע',
    coreFactIcon: 'satellite',
    coreFact: 'GPS-Denied: בלתי ניתן לאיתור מהאוויר, מלוויין או ממכ"ם',
    threats: [
      'מחבלים שמגיחים מהאדמה בהפתעה מאחורי הכוח',
      'מלכוד פתחי המנהרות במטענים קטלניים',
      'העברת נשק ולוחמים ממקום למקום מתחת לאף הצבא',
    ],
    weakness: 'הלוחמים מתמודדים עם חוסר חמצן, תנועה איטית וקושי לירות בתוך מנהרה צרה. בנוסף, המנהרה פועלת כמו "תיבת תהודה" גדולה — החיילים שנמצאים בחוץ יכולים לשמוע כל רעש או צעד שקורה בפנים.',
    example: 'בעזה (2023), העולם נחשף ל"מטרו" של חמאס: רשת מנהרות התקפיות באורך של מאות קילומטרים. פתחי המנהרות הוסתרו בכוונה מתחת לבתי חולים, בתי ספר ומסגדים, במטרה לשלב באופן קטלני בין תקיפה מהאדמה לבין הסתתרות בתוך אוכלוסייה אזרחית.',
    exampleTag: 'עזה, 2023',
    color: 'text-status-danger',
    bg: 'bg-status-danger/10',
    border: 'border-status-danger/40',
  },
];

export function ThreeDimScene() {
  const [activeDim, setActiveDim] = useState<Dim>('above');
  const [showDetails, setShowDetails] = useState(false);
  const meta = DIMS.find((d) => d.id === activeDim)!;

  const selectDim = (d: Dim) => {
    setActiveDim(d);
    setShowDetails(false);
  };

  return (
    <section id="scene-threedim" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="10.2"
        eyebrow="ממד אנכי ותת-קרקע"
title = {
  <>
    בעיר, הסכנה מגיעה <span className="text-accent-hover">מלמעלה, מהרחוב ומתחת לרגליים</span>
  </>
}
        intro="בעיר, הסכנה לא מחכה לכם רק 'ממול'. היא יכולה להגיע מ-30 קומות מעל, או מ-20 מטרים מתחת לאדמה. צבא שרוצה לנצח חייב להילחם בשלושת הממדים במקביל — אחרת, הוא פשוט מתעלם מרוב האיומים בשטח ונועד להיכשל."
      />

      <div className="p-5 mb-6">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">הקרב התלת-ממדי בעיר:</strong> מגדלים בעיר מתפקדים כמו "גבעות בטון" ומעניקים יתרון אדיר למי ששולט בהם. במקביל, מתחת לרגליים, רשת מנהרות מספקת לאויב אוטוסטרדה סודית ש<strong>שום כלי טיס לא יכול לראות</strong>. צבא שמתכונן רק ללחימה בגובה הקרקע – פשוט יפסיד בקרב.
          </div>
        </div>
      </div>

      {/* Cross-section diagram + dimension detail panel, side by side */}
      <div className="flex flex-col lg:flex-row gap-4 mb-12 items-start">
        {/* Diagram column (visually left, inline-end) */}
        <div className="order-1 lg:order-2 w-full lg:flex-1 surface-elevated p-4 rounded-[4px] overflow-hidden">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
              חתך צד של לחימה בעיר
            </div>
            <div className={cn('chip', meta.border, meta.bg, meta.color)}>
              <Icon name={meta.icon} size={12} />
              <span className="font-mono">{meta.label}</span>
            </div>
          </div>

          {/* Persistent zone legend — orients the eye before any click */}
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            {DIMS.map((d) => (
              <button
                key={d.id}
                onClick={() => selectDim(d.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 text-[11px] font-mono transition-colors',
                  activeDim === d.id ? d.color : 'text-fg-dim hover:text-fg-muted'
                )}
              >
                <span className={cn('inline-block size-2 rounded-full', d.bg.replace('/10', ''))} />
                {d.label}
              </button>
            ))}
          </div>

          <CrossSection activeDim={activeDim} onSelect={selectDim} />
        </div>

        {/* Info column: dimension selector + details (visually right, inline-start) */}
        <div className="order-2 lg:order-1 w-full lg:w-[400px] lg:shrink-0 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            {DIMS.map((d) => {
              const isActive = activeDim === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => selectDim(d.id)}
                  className={cn(
                    'surface p-3 text-right transition-all rounded-[3px] flex items-center gap-2',
                    isActive ? `${d.border} ${d.bg}` : 'hover:border-border-strong'
                  )}
                >
                  <Icon name={d.icon} size={22} className={cn(d.color, 'shrink-0')} />
                  <div className="min-w-0">
                    <div className={cn('font-display font-bold text-xs leading-tight', isActive && d.color)}>
                      {d.label}
                    </div>
                    <div className="text-[9px] font-mono text-fg-dim mt-0.5">{d.altitude}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={meta.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className={cn('surface-elevated p-5 rounded-[4px] border-r-4', meta.border.replace('border-', 'border-r-'))}
            >
              <div className="mb-3">
                <div className={cn('text-xs font-display font-semibold mb-1 tracking-wider', meta.color)}>
                  {meta.english} · {meta.altitude}
                </div>
                <h3 className="font-display font-bold text-xl leading-tight text-accent-deep">{meta.label}</h3>
              </div>

              {/* Core doctrine fact — the one thing to remember about this dimension */}
              <div className={cn('flex items-start gap-2 p-2.5 rounded-[3px] mb-3', meta.bg)}>
                <Icon name={meta.coreFactIcon} size={15} className={cn(meta.color, 'shrink-0 mt-0.5')} />
                <p className={cn('text-xs font-display font-semibold leading-snug', meta.color)}>{meta.coreFact}</p>
              </div>

              <div className="surface p-3 rounded-[3px] bg-status-danger/5 border-status-danger/30 mb-3">
                <div className="text-xs font-display font-semibold text-status-danger mb-2 tracking-wider flex items-center gap-1.5">
                  <Icon name="crosshair" size={11} />
                  איומים
                </div>
                <ul className="space-y-1.5 text-sm">
                  {meta.threats.map((t) => (
                    <li key={t} className="flex gap-2">
                      <Icon name="spark" size={11} className="text-status-danger shrink-0 mt-1" />
                      <span className="text-fg leading-relaxed">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => setShowDetails((v) => !v)}
                className="w-full flex items-center justify-between gap-2 text-xs font-display font-semibold text-fg-muted hover:text-fg py-1.5 px-1"
              >
                <span>פרטים נוספים: חולשה ודוגמה מבצעית</span>
                <Icon
                  name="arrow-left"
                  size={12}
                  className={cn('transition-transform shrink-0', showDetails ? '-rotate-90' : 'rotate-90')}
                />
              </button>

              <AnimatePresence initial={false}>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="surface p-3 rounded-[3px] mt-2 mb-3">
                      <div className={cn('text-xs font-display font-semibold mb-1.5 tracking-wider', meta.color)}>החיסרון המרכזי (נקודת התורפה)</div>
                      <p className="text-sm text-fg-muted leading-relaxed">{meta.weakness}</p>
                    </div>

                    <div className="surface p-3 rounded-[3px] bg-bg-accent/30 border border-border">
                      <div className="text-xs font-display font-semibold text-fg-muted mb-1 tracking-wider">דוגמה מבצעית · {meta.exampleTag}</div>
                      <p className="text-xs text-fg-muted leading-relaxed italic">"{meta.example}"</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Key insight: combined threat */}
      <div className="">
        <div className="flex gap-4 items-start">
          <Icon name="spark" size={32} className="text-accent shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">
              עקרון השילוב
            </div>
            <h3 className="font-display font-bold text-lg leading-tight mb-2">
              אויב מסוכן משלב את כל הממדים יחד
            </h3>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty">
              דאעש במוסול, חמאס בעזה והצ'צ'נים בגרוזני הוכיחו דבר אחד: אסטרטגיה עירונית מנצחת בנויה על <strong className="text-fg">שילוב ממדים</strong>. צלף יורה מהגג (למעלה), בורח מיד אל פיר במרתף (למטה), ומופיע מחדש בקצה השני של העיר. כשהצבא פורץ אל הבניין כדי לתפוס אותו — הוא כבר מזמן לא שם.
              <strong className="text-fg block mt-1.5">איך צבא מודרני מתמודד עם זה?</strong> בעזרת שילוב טכנולוגיות בעצמו: כלבים ורובוטים לגילוי מנהרות, רחפנים זעירים שסורקים חלונות, מכ"מים שרואים דרך קירות, ויחידות קומנדו שמתמחות בלחימה בחושך המוחלט שמתחת לאדמה.
            </p>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty mt-2">
              <strong className="text-fg">עומס קוגניטיבי:</strong> הצורך להיות דרוכים ב-360 מעלות בו-זמנית — מעלה, מהצדדים ומלמטה — יוצר לחץ מנטלי עצום על הלוחמים ומאט את קצב ההתקדמות של הכוח בשטח העירוני.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SvgLabel({
  x,
  y,
  text,
  fontSize = 2.6,
  textClassName,
  chipClassName = 'fill-bg-elevated/85',
}: {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  textClassName: string;
  chipClassName?: string;
}) {
  // Always center-anchored: RTL page direction flips the meaning of
  // textAnchor="start"/"end" on inline SVG <text>, clipping the label —
  // "middle" is the only anchor that stays correct regardless of direction.
  const w = text.length * fontSize * 0.6 + fontSize * 1.4;
  const h = fontSize * 1.7;

  return (
    <g>
      <rect x={x - w / 2} y={y - h * 0.65} width={w} height={h} rx={h * 0.28} className={chipClassName} />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        className={cn('font-display font-bold', textClassName)}
      >
        {text}
      </text>
    </g>
  );
}

const BUILDINGS = [
  { x: 6, w: 7, h: 24 },
  { x: 15, w: 6, h: 14 },
  { x: 23, w: 9, h: 19 },
  { x: 35, w: 7, h: 26 },
  { x: 44, w: 8, h: 12 },
  { x: 56, w: 6, h: 21 },
  { x: 65, w: 9, h: 15 },
  { x: 77, w: 7, h: 23 },
  { x: 87, w: 8, h: 17 },
];

const SKY_BOTTOM = 30;
const STREET_BOTTOM = 38;

function CrossSection({ activeDim, onSelect }: { activeDim: Dim; onSelect: (d: Dim) => void }) {
  return (
    <div className="aspect-[16/9] relative rounded-[3px] overflow-hidden">
      <svg viewBox="0 0 100 56" className="w-full h-full">
        <defs>
          <linearGradient id="sky-cross" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dde6f0" />
            <stop offset="100%" stopColor="#f0f4f9" />
          </linearGradient>
          <linearGradient id="earth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7a6648" />
            <stop offset="100%" stopColor="#3a2f1f" />
          </linearGradient>
        </defs>

        {/* Sky zone */}
        <rect x="0" y="0" width="100" height={SKY_BOTTOM} fill="url(#sky-cross)" />
        {/* Street zone — its own band, not just a boundary line */}
        <rect x="0" y={SKY_BOTTOM} width="100" height={STREET_BOTTOM - SKY_BOTTOM} fill="#C9B892" />
        {/* Earth zone */}
        <rect x="0" y={STREET_BOTTOM} width="100" height={56 - STREET_BOTTOM} fill="url(#earth)" opacity="0.92" />
        {/* Seams between zones */}
        <line x1="0" y1={SKY_BOTTOM} x2="100" y2={SKY_BOTTOM} stroke="#E8DCC4" strokeWidth="0.5" />
        <line x1="0" y1={STREET_BOTTOM} x2="100" y2={STREET_BOTTOM} stroke="#4a3d29" strokeWidth="0.4" opacity="0.6" />

        {/* === ABOVE GROUND zone === */}
        <g onClick={() => onSelect('above')} style={{ cursor: 'pointer' }}>
          <rect x="0" y="0" width="100" height={SKY_BOTTOM} fill="transparent" />
          {activeDim === 'above' && <rect x="0" y="0" width="100" height={SKY_BOTTOM} className="fill-accent-hot/10" />}

          {BUILDINGS.map((b, i) => (
            <g key={i}>
              <rect
                x={b.x}
                y={SKY_BOTTOM - b.h}
                width={b.w}
                height={b.h}
                className={cn(
                  activeDim === 'above' ? 'fill-accent-hot/35 stroke-accent-hot' : 'fill-terrain-ridge/45 stroke-terrain-ridge/70'
                )}
                strokeWidth="0.25"
              />
              {Array.from({ length: Math.floor(b.h / 3) }).map((_, f) => (
                <rect
                  key={f}
                  x={b.x + 0.6}
                  y={SKY_BOTTOM - b.h + 1.5 + f * 3}
                  width={b.w - 1.2}
                  height="0.8"
                  className="fill-accent-cool"
                  opacity="0.5"
                />
              ))}
            </g>
          ))}

          {activeDim === 'above' && (
            <g>
              <circle cx="38" cy="6" r="1.4" className="fill-accent-hot" />
              <circle cx="38" cy="6" r="3" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
                <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
              </circle>
              <line x1="38" y1="6" x2="80" y2={SKY_BOTTOM + 4} className="stroke-accent-hot" strokeWidth="0.35" strokeDasharray="1 0.6" />
              <polygon
                points="-1.6,-1 1.6,0 -1.6,1"
                transform={`translate(80, ${SKY_BOTTOM + 4}) rotate(34)`}
                className="fill-accent-hot"
              />
              <SvgLabel x={38} y={2.6} text="צלף" fontSize={2.4} textClassName="fill-accent-hot" />
              <SvgLabel x={60} y={19} text="קו ראייה" fontSize={1.9} textClassName="fill-accent-hot" />
            </g>
          )}

          <SvgLabel x={17} y={3.4} text="מעל הקרקע" fontSize={3} textClassName={activeDim === 'above' ? 'fill-accent-hot' : 'fill-fg-muted'} />
        </g>

        {/* === STREET LEVEL zone === */}
        <g onClick={() => onSelect('street')} style={{ cursor: 'pointer' }}>
          <rect x="0" y={SKY_BOTTOM} width="100" height={STREET_BOTTOM - SKY_BOTTOM} fill="transparent" />
          {activeDim === 'street' && (
            <rect x="0" y={SKY_BOTTOM} width="100" height={STREET_BOTTOM - SKY_BOTTOM} className="fill-accent/15" />
          )}

          {/* Soldier */}
          <circle cx="50" cy="34" r="1.5" className={cn(activeDim === 'street' ? 'fill-accent' : 'fill-fg-muted')} />
          <line x1="50" y1="35.3" x2="52" y2="35.8" className="stroke-fg" strokeWidth="0.4" />

          {/* Vehicle */}
          <rect x="62" y="32.7" width="6" height="2.8" rx="0.4" className={cn(activeDim === 'street' ? 'fill-accent' : 'fill-fg-muted/70')} />
          <circle cx="63.5" cy="35.6" r="0.5" className="fill-fg" />
          <circle cx="66.5" cy="35.6" r="0.5" className="fill-fg" />

          {activeDim === 'street' &&
            [28, 72].map((x, i) => (
              <g key={i}>
                <rect x={x - 1} y="33.3" width="2" height="2" className="fill-status-danger" />
                <SvgLabel x={x} y={31.4} text="IED" fontSize={2} textClassName="fill-status-danger" />
              </g>
            ))}

          <SvgLabel
            x={50}
            y={STREET_BOTTOM - 1.6}
            text="רחוב · פני הקרקע"
            fontSize={2.2}
            textClassName={activeDim === 'street' ? 'fill-accent' : 'fill-fg-muted'}
          />
        </g>

        {/* === UNDERGROUND zone === */}
        <g onClick={() => onSelect('below')} style={{ cursor: 'pointer' }}>
          <rect x="0" y={STREET_BOTTOM} width="100" height={56 - STREET_BOTTOM} fill="transparent" />
          {activeDim === 'below' && (
            <rect x="0" y={STREET_BOTTOM} width="100" height={56 - STREET_BOTTOM} className="fill-status-danger/10" />
          )}

          <path
            d="M5 42 L 30 42 L 30 48 L 56 48 L 56 44 L 80 44 L 80 50 L 95 50"
            fill="none"
            className={cn(activeDim === 'below' ? 'stroke-status-danger' : 'stroke-status-danger/60')}
            strokeWidth="0.7"
          />
          <path
            d="M22 52 L 38 52 L 38 46 L 65 46"
            fill="none"
            className={cn(activeDim === 'below' ? 'stroke-status-danger/85' : 'stroke-status-danger/55')}
            strokeWidth="0.55"
          />

          {[12, 38, 62, 86].map((x, i) => (
            <line
              key={i}
              x1={x}
              y1={STREET_BOTTOM}
              x2={x}
              y2="42"
              className={cn(activeDim === 'below' ? 'stroke-status-danger' : 'stroke-status-danger/60')}
              strokeWidth="0.45"
              strokeDasharray="0.7 0.5"
            />
          ))}

          {[18, 40, 70].map((x, i) => (
            <rect
              key={i}
              x={x - 2}
              y="42"
              width="4"
              height="6"
              className={cn(
                activeDim === 'below' ? 'fill-status-danger/35 stroke-status-danger' : 'fill-status-danger/20 stroke-status-danger/60'
              )}
              strokeWidth="0.35"
            />
          ))}

          {activeDim === 'below' && (
            <motion.circle
              r="0.9"
              className="fill-status-danger"
              initial={{ cx: 10, cy: 42 }}
              animate={{ cx: [10, 90], cy: [42, 50] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            />
          )}

          <SvgLabel
            x={50}
            y={54.2}
            text={activeDim === 'below' ? 'רשת מנהרות · GPS-Denied' : 'תת-קרקע'}
            fontSize={activeDim === 'below' ? 2.5 : 2.2}
            textClassName={activeDim === 'below' ? 'fill-status-danger' : 'fill-fg-muted'}
          />
        </g>
      </svg>
    </div>
  );
}
