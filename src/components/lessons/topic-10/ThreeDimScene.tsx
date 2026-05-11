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
  threats: string[];
  advantages: string[];
  weakness: string;
  example: string;
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
    threats: [
      'צלפים בגגות עם RPG / נשק קל',
      'נ"ט מלמעלה — פוגע בגג טנק (פגיע)',
      'הטלת חפצים על שיירה מבעד לחלונות',
      'התנהלות פלסטינית — שימוש בגגות לתצפית',
    ],
    advantages: [
      'תצפית רחבה על השטח',
      'יתרון אנכי — האויב מתחתיך',
      'יציאות בריחה דרך מערכת בניינים',
    ],
    weakness: 'חשיפה לרחפנים, מסוקים, חיל אוויר. צלף מצוין אבל חסר תנועתיות.',
    example: 'במוסול, צלפי דאעש פעלו ממגדלי משרדים — צה"ל הצליח לפגוע בהם רק אחרי איתור מדויק וטיל יעודי.',
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
    threats: [
      'מטענים מאולתרים (IED) בקירות, ברצפה, ברכבים חונים',
      'אש קצרת טווח מסמטאות צדדיות',
      'מארבים בכל פינה',
      'הסתערות מקרבת — מטרי גוף לגוף',
    ],
    advantages: [
      'יכולת תנועה רחבה (לכל הכיוונים)',
      'גישה לציוד כבד',
      'תקשורת רדיו אפקטיבית',
    ],
    weakness: 'חשוף לאיומים מ-3 ממדים — מעל, מצדדים ולפעמים מתחת. עומס קוגניטיבי גבוה.',
    example: 'בגרוזני (1994–95), טור משוריין רוסי חטף שני RPG מ-3 כיוונים בו-זמנית. 100 רכבים נחרבו ב-3 שעות.',
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
    threats: [
      'יציאה פתאומית מאחורי כוח תוקף',
      'הטמנת מטענים בנקודות יציאה',
      'חטיפה דרך פתח מנהרה',
      'הברחת ציוד וכוחות בלי גילוי',
    ],
    advantages: [
      'GPS לא עובד — האויב לא רואה אותך',
      'מסך אווירי מלא — סנסור IR לא חודר אדמה',
      'נתיבי בריחה והפתעה',
      'נשק כבד (טילים) במחסנים מוגנים',
    ],
    weakness: 'תנועה איטית, חמצן מוגבל, אש חיכוך פנימית מצומצמת. תיבת תהודה לרעש — הכוח התוקף שומע אותך מתקרב.',
    example: 'בעזה 2023–24, חמאס בנה רשת מנהרות באורך מאות קילומטרים. נקודות יציאה ליד בתי חולים, בתי ספר ומסגדים. אסטרטגיה מתואמת לחלוטין עם הממד האנכי.',
    color: 'text-status-danger',
    bg: 'bg-status-danger/10',
    border: 'border-status-danger/40',
  },
];

export function ThreeDimScene() {
  const [activeDim, setActiveDim] = useState<Dim>('above');
  const meta = DIMS.find((d) => d.id === activeDim)!;

  return (
    <section id="scene-threedim" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="10.2"
        eyebrow="ממד אנכי ותת-קרקע"
        title={
          <>
            הקרב <span className="gradient-text">התלת-ממדי</span>
          </>
        }
        intro="בעיר, האיום לא בא רק 'מקדימה'. הוא בא מ-30 קומות מעל, ולפעמים מ-20 מטר מתחת. דוקטרינה צבאית חייבת לחשוב על שלושת הממדים בו-זמנית — אחרת שני שלישים מהאיומים מפסידים."
      />

      <div className="surface-elevated p-5 mb-6 border-r-4 border-r-accent-cool">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">הקרב התלת-ממדי בעיר:</strong> בניינים גבוהים מעניקים יתרון תצפית כמו "גבעות בטון" — אבל כפי שגבעה היא יעד אסטרטגי, כך גם גג של מגדל. מתחת לרגליים, רשת מנהרות יוצרת ממד שלם של תנועה ש<strong>סנסור אווירי לא רואה</strong>. כוח שמתעלם מ-2 ממדים — נוצח.
          </div>
        </div>
      </div>

      {/* 3D Cross-section visualization */}
      <div className="surface-elevated p-4 rounded-2xl mb-6 overflow-hidden">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-[10px] font-mono text-fg-dim tracking-widest uppercase">
            חתך אנכי של מרחב אורבני · לחץ על ממד
          </div>
          <div className={cn('chip', meta.border, meta.bg, meta.color)}>
            <Icon name={meta.icon} size={12} />
            <span className="font-mono">{meta.label}</span>
          </div>
        </div>

        <CrossSection activeDim={activeDim} onSelect={setActiveDim} />
      </div>

      {/* Dimension selector + details */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {DIMS.map((d) => {
          const isActive = activeDim === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setActiveDim(d.id)}
              className={cn(
                'surface p-4 text-right transition-all rounded-xl flex items-center gap-3',
                isActive ? `${d.border} shadow-glow ${d.bg}` : 'hover:border-border-strong'
              )}
            >
              <div className={cn('size-10 rounded-xl flex items-center justify-center border-2 shrink-0', d.border, d.bg)}>
                <Icon name={d.icon} size={18} className={d.color} />
              </div>
              <div className="min-w-0">
                <div className={cn('font-display font-bold text-sm leading-tight', isActive && d.color)}>
                  {d.label}
                </div>
                <div className="text-[10px] font-mono text-fg-dim mt-0.5">{d.altitude}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active dimension details */}
      <AnimatePresence mode="wait">
        <motion.div
          key={meta.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className={cn('surface-elevated p-6 rounded-2xl border-r-4 mb-12', meta.border.replace('border-', 'border-r-'))}
        >
          <div className="mb-5">
            <div className={cn('text-[10px] font-mono mb-1 tracking-widest uppercase', meta.color)}>
              {meta.english} · {meta.altitude}
            </div>
            <h3 className={cn('font-display font-bold text-2xl leading-tight', meta.color)}>{meta.label}</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="surface p-4 rounded-xl bg-status-danger/5 border-status-danger/30">
              <div className="text-[10px] font-mono text-status-danger mb-2 tracking-widest uppercase flex items-center gap-1.5">
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
            <div className="surface p-4 rounded-xl bg-status-ok/5 border-status-ok/30">
              <div className="text-[10px] font-mono text-status-ok mb-2 tracking-widest uppercase flex items-center gap-1.5">
                <Icon name="shield" size={11} />
                יתרונות (למחזיק במרחב)
              </div>
              <ul className="space-y-1.5 text-sm">
                {meta.advantages.map((a) => (
                  <li key={a} className="flex gap-2">
                    <Icon name="check" size={11} strokeWidth={2.5} className="text-status-ok shrink-0 mt-1" />
                    <span className="text-fg leading-relaxed">{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="surface p-4 rounded-xl mb-3">
            <div className={cn('text-[10px] font-mono mb-1.5 tracking-widest uppercase', meta.color)}>נקודת תורפה</div>
            <p className="text-sm text-fg-muted leading-relaxed">{meta.weakness}</p>
          </div>

          <div className="surface p-3 rounded-lg bg-bg-accent/30 border border-border">
            <div className="text-[10px] font-mono text-fg-dim mb-1 tracking-widest uppercase">דוגמה מבצעית</div>
            <p className="text-xs text-fg-muted leading-relaxed italic">"{meta.example}"</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Key insight: combined threat */}
      <div className="surface-elevated p-6 rounded-2xl border-r-4 border-r-accent">
        <div className="flex gap-4 items-start">
          <div className="size-12 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center shrink-0">
            <Icon name="spark" size={22} className="text-accent" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-mono text-accent mb-1 tracking-widest uppercase">
              העיקרון של ערב
            </div>
            <h3 className="font-display font-bold text-lg mb-2 leading-tight">
              אויב טוב משלב את שלושת הממדים
            </h3>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty">
              דאעש במוסול, חמאס בעזה, הצ\'צ\'נים בגרוזני — כולם הראו שאסטרטגיה מנצחת בעיר היא <strong className="text-fg">שילוב</strong>: צלף בגג קשור לרשת מנהרות במרתף. הצלף יורה, יוצא דרך המרתף, מופיע בקצה השני של העיר. כוח תוקף סורק את הבניין — אבל הוא כבר במקום אחר.
              <strong className="text-fg block mt-1.5">התשובה הצבאית:</strong> שילוב יכולות. כלבים לגילוי מנהרות. כטב"מים זעירים לסריקת קומות. ראדאר חודר קירות. וכוחות מיוחדים שיודעים לעבוד בחושך מתחת לאדמה.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CrossSection({ activeDim, onSelect }: { activeDim: Dim; onSelect: (d: Dim) => void }) {
  return (
    <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
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

        {/* Sky */}
        <rect x="0" y="0" width="100" height="34" fill="url(#sky-cross)" />
        {/* Earth */}
        <rect x="0" y="34" width="100" height="22" fill="url(#earth)" opacity="0.85" />

        {/* === ABOVE GROUND zone === */}
        <g
          onClick={() => onSelect('above')}
          style={{ cursor: 'pointer' }}
          opacity={activeDim === 'above' ? 1 : 0.7}
        >
          {/* High-rises */}
          {[
            { x: 6,  w: 7, h: 28 },
            { x: 15, w: 6, h: 18 },
            { x: 23, w: 9, h: 23 },
            { x: 35, w: 7, h: 30 },
            { x: 44, w: 8, h: 16 },
            { x: 56, w: 6, h: 25 },
            { x: 65, w: 9, h: 19 },
            { x: 77, w: 7, h: 27 },
            { x: 87, w: 8, h: 21 },
          ].map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={34 - b.h} width={b.w} height={b.h} className={cn(activeDim === 'above' ? 'fill-accent-hot/30' : 'fill-terrain-ridge/35', 'stroke-terrain-ridge')} strokeWidth="0.2" />
              {Array.from({ length: Math.floor(b.h / 3) }).map((_, f) => (
                <rect key={f} x={b.x + 0.6} y={34 - b.h + 1.5 + f * 3} width={b.w - 1.2} height="0.8" className="fill-accent-cool" opacity="0.4" />
              ))}
            </g>
          ))}
          {/* Sniper marker on tallest building */}
          {activeDim === 'above' && (
            <g>
              <circle cx="38" cy="6" r="1.4" className="fill-accent-hot" />
              <circle cx="38" cy="6" r="3" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
                <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
              </circle>
              <line x1="38" y1="6" x2="80" y2="32" className="stroke-accent-hot" strokeWidth="0.3" strokeDasharray="0.8 0.5" />
              <text x="38" y="3" textAnchor="middle" className="fill-accent-hot font-mono font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">צלף</text>
            </g>
          )}
          <text x={activeDim === 'above' ? 5 : 5} y="6" className={cn('font-display font-bold', activeDim === 'above' ? 'fill-accent-hot' : 'fill-fg-dim')} fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.95" strokeLinejoin="round">
            מעל הקרקע
          </text>
        </g>

        {/* Ground line */}
        <line x1="0" y1="34" x2="100" y2="34" className="stroke-fg" strokeWidth="0.4" />
        <text x="50" y="33" textAnchor="middle" className="fill-fg-dim font-mono" fontSize="1.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.6" strokeLinejoin="round">— פני הקרקע —</text>

        {/* === STREET LEVEL === */}
        <g
          onClick={() => onSelect('street')}
          style={{ cursor: 'pointer' }}
          opacity={activeDim === 'street' ? 1 : 0.7}
        >
          {/* Soldier */}
          <circle cx="50" cy="32" r="1.4" className={cn(activeDim === 'street' ? 'fill-accent' : 'fill-accent-cool')} />
          <line x1="50" y1="33.5" x2="52" y2="34" className="stroke-fg" strokeWidth="0.4" />

          {/* Vehicle */}
          <rect x="62" y="31.5" width="6" height="2.5" rx="0.4" className={cn(activeDim === 'street' ? 'fill-accent' : 'fill-accent-cool/80')} />
          <circle cx="63.5" cy="34.2" r="0.5" className="fill-fg" />
          <circle cx="66.5" cy="34.2" r="0.5" className="fill-fg" />

          {activeDim === 'street' && (
            <g>
              {/* IED markers */}
              {[28, 72].map((x, i) => (
                <g key={i}>
                  <rect x={x - 1} y="32" width="2" height="2" className="fill-status-danger" />
                  <text x={x} y="30" textAnchor="middle" className="fill-status-danger font-mono font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">IED</text>
                </g>
              ))}
            </g>
          )}
        </g>

        {/* === UNDERGROUND === */}
        <g
          onClick={() => onSelect('below')}
          style={{ cursor: 'pointer' }}
          opacity={activeDim === 'below' ? 1 : 0.7}
        >
          {/* Tunnel network */}
          <path
            d="M5 42 L 30 42 L 30 48 L 56 48 L 56 44 L 80 44 L 80 50 L 95 50"
            fill="none"
            className={cn(activeDim === 'below' ? 'stroke-accent-hot' : 'stroke-accent-hot/50')}
            strokeWidth="0.6"
          />
          <path
            d="M22 52 L 38 52 L 38 46 L 65 46"
            fill="none"
            className={cn(activeDim === 'below' ? 'stroke-accent-hot/80' : 'stroke-accent-hot/40')}
            strokeWidth="0.5"
          />

          {/* Vertical shafts */}
          {[12, 38, 62, 86].map((x, i) => (
            <line key={i} x1={x} y1="34" x2={x} y2="42" className={cn(activeDim === 'below' ? 'stroke-accent-hot' : 'stroke-accent-hot/50')} strokeWidth="0.4" strokeDasharray="0.6 0.4" />
          ))}

          {/* Tunnel rooms / nodes */}
          {[18, 40, 70].map((x, i) => (
            <rect key={i} x={x - 2} y="42" width="4" height="6" className={cn(activeDim === 'below' ? 'fill-accent-hot/30 stroke-accent-hot' : 'fill-accent-hot/15 stroke-accent-hot/50')} strokeWidth="0.3" />
          ))}

          {activeDim === 'below' && (
            <g>
              {/* Underground figure */}
              <motion.circle
                r="0.8"
                className="fill-accent-hot"
                animate={{ cx: [10, 90], cy: [42, 50] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              />
              <text x="50" y="55" textAnchor="middle" className="fill-accent-hot font-mono font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
                רשת מנהרות · GPS-Denied
              </text>
            </g>
          )}
          {activeDim !== 'below' && (
            <text x="50" y="55" textAnchor="middle" className="fill-fg-dim font-mono" fontSize="2.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.75" strokeLinejoin="round">
              תת-קרקע
            </text>
          )}
        </g>

        {/* Depth labels (left side) */}
        {[
          { y: 5, label: '+150 מ׳' },
          { y: 18, label: '+50 מ׳' },
          { y: 34, label: '0' },
          { y: 44, label: '-10 מ׳' },
          { y: 54, label: '-25 מ׳' },
        ].map((d, i) => (
          <text key={i} x="2" y={d.y + 0.7} className="fill-fg-dim font-mono" fontSize="1.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.6" strokeLinejoin="round">
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
