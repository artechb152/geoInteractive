'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Mode = 'natural' | 'artificial' | 'mobility' | 'counter';

type ModeMeta = {
  id: Mode;
  label: string;
  english: string;
  icon: IconName;
  color: string;
  bg: string;
  border: string;
  popupTitle: string;
  popupBody: string;
};

const MODES: ModeMeta[] = [
  {
    id: 'natural',
    label: 'מכשול טבעי',
    english: 'Natural Obstacle',
    icon: 'wave',
    color: 'text-terrain-sky',
    bg: 'bg-terrain-sky/10',
    border: 'border-terrain-sky/40',
    popupTitle: 'מה שהקרקע כבר מציעה',
    popupBody:
      'נהר רחב וזורם, מצוק תלול, יער עבות, ביצה — כולם מכשולים שנמצאים בשטח לפני שהאויב נכנס. תפקיד המתכנן הצבאי הוא <strong>לזהות אותם</strong> ולהפנות את האויב אליהם. מכשול טבעי הוא ה"שלד" של מערך ההגנה — חזק, אבל לבד הוא לא מספיק.',
  },
  {
    id: 'artificial',
    label: 'מכשול מלאכותי',
    english: 'Artificial Obstacle',
    icon: 'shield',
    color: 'text-accent-hot',
    bg: 'bg-accent-hot/10',
    border: 'border-accent-hot/40',
    popupTitle: 'הנדסה משדרגת את הטבע',
    popupBody:
      'שדה מוקשים, תעלת נ"ט עמוקה, גדר תלתלית, חומת בטון. שילוב <strong>סינרגטי</strong> עם מכשול טבעי — שדה מוקשים על גדת נחל, גדר אורך מצוק — יוצר "רשת עצירה" כמעט בלתי עבירה. עיקרון: לעולם לא לסמוך על מכשול בודד.',
  },
  {
    id: 'mobility',
    label: 'קידום ניידות',
    english: 'Mobility',
    icon: 'truck',
    color: 'text-status-ok',
    bg: 'bg-status-ok/10',
    border: 'border-status-ok/40',
    popupTitle: 'פורצים את המכשולים של האויב',
    popupBody:
      '<strong>Breaching</strong> — פעולות חיל ההנדסה לפריצת המכשולים של האויב. פינוי מוקשים בנתיב צר וברור, השלכת גשרים על נחלים, פיצוץ קירות, פילוס דרכים בבולדוזרים בטרשים. המטרה: לחדור דרך קווי ההגנה במהירות, לפני שהאויב יספיק להגיב.',
  },
  {
    id: 'counter',
    label: 'שלילת ניידות',
    english: 'Counter-Mobility',
    icon: 'bolt',
    color: 'text-status-danger',
    bg: 'bg-status-danger/10',
    border: 'border-status-danger/40',
    popupTitle: 'נועלים את המרחב לאויב',
    popupBody:
      'הצד השני של המטבע: מיקוש נגדי נרחב, פיצוץ גשרים אסטרטגיים, יצירת מכתשים בכבישים, חסימת צירים נוחים. המטרה: <strong>לתעל</strong> את האויב בעל כורחו לתוך "שטחי השמדה" — אזורים שכבר מוכנים מראש לקליטת אש מסונכרנת מכל הכיוונים.',
  },
];

export function EngineeringScene() {
  const [active, setActive] = useState<Mode>('natural');
  const [expanded, setExpanded] = useState<Mode | null>('natural');

  const handleClick = (id: Mode) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setActive(id);
      setExpanded(id);
    }
  };

  return (
    <section id="scene-engineering" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="05.2"
        eyebrow="הנדסה גיאוגרפית"
        title={
          <>
            <span className="gradient-text">הנדסה</span> הופכת שטח רגיל למבצר
          </>
        }
        intro="הנדסה גיאוגרפית היא לא 'תוספת' — היא חצי מהמערך. שני המאמצים — קידום ניידות לכוחותינו, שלילת ניידות לאויב — רצים במקביל. מי ששולט בשניהם, שולט בקצב הקרב."
      />

      <div className="surface-elevated p-5 mb-6 border-r-4 border-r-accent-cool">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">העיקרון המנחה:</strong>{' '}
            לעולם לא לסמוך על מכשול בודד. שילוב <strong className="text-fg">סינרגטי</strong> בין מכשול טבעי (קיים בשטח) למכשול מלאכותי (הנדסי) הופך כל נחל למלכודת, כל ואדי לקופסת הריגה. זה ההבדל בין "צבא בשטח" ל"שטח שמשרת את הצבא".
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[2fr_3fr] gap-6 items-start mb-12">
        {/* Accordion */}
        <div className="space-y-3">
          {MODES.map((m) => {
            const isActive = active === m.id;
            const isExpanded = expanded === m.id;
            return (
              <div
                key={m.id}
                className={cn(
                  'surface overflow-hidden transition-colors',
                  isActive ? `${m.border} shadow-glow ${m.bg}` : 'hover:border-border-strong'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleClick(m.id)}
                  aria-expanded={isExpanded}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  <span
                    className={cn(
                      'size-10 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all',
                      isActive ? `${m.border} ${m.bg}` : 'border-border bg-bg-accent'
                    )}
                  >
                    <Icon name={m.icon} size={18} className={isActive ? m.color : 'text-fg-dim'} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={cn('font-display font-bold leading-tight', isActive && m.color)}>
                      {m.label}
                    </div>
                    <div className="text-[10px] font-mono text-fg-dim mt-0.5">{m.english}</div>
                  </div>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('shrink-0 inline-flex', isExpanded ? m.color : 'text-fg-dim')}
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
                  {isExpanded && (
                    <motion.div
                      key={`panel-${m.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className={cn('px-4 pb-4 pt-1 border-t', m.border)}>
                        <div className={cn('text-[10px] font-mono mt-3 mb-2 tracking-widest uppercase', m.color)}>
                          {m.english}
                        </div>
                        <h4 className="font-display font-bold text-base sm:text-lg leading-tight mb-2">
                          {m.popupTitle}
                        </h4>
                        <p
                          className="text-sm leading-relaxed text-fg-muted text-pretty"
                          dangerouslySetInnerHTML={{ __html: m.popupBody }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Visualization */}
        <div className="surface-elevated relative overflow-hidden sticky top-6">
          <EngineeringStage mode={active} />
        </div>
      </div>

      {/* Mobility vs Counter-Mobility comparison table */}
      <div className="surface-elevated p-5 sm:p-6 rounded-2xl">
        <div className="mb-5">
          <h3 className="font-display font-bold text-lg leading-tight mb-1">
            שני צדדים של אותו מטבע
          </h3>
          <p className="text-sm text-fg-muted leading-relaxed">
            חיל ההנדסה הצבאי מפעיל את שני המאמצים <strong className="text-fg">במקביל</strong> — פורץ נתיב לכוחותינו, סוגר נתיב לאויב. החלוקה הזו מסבירה למה ההנדסה היא לא יחידת תמיכה, אלא חיל קרבי.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="surface p-5 border-r-4 border-r-status-ok rounded-xl bg-status-ok/5">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="truck" size={20} className="text-status-ok" />
              <div>
                <div className="font-display font-bold text-status-ok">קידום ניידות</div>
                <div className="text-[10px] font-mono text-fg-dim">Mobility · Breaching</div>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              {[
                'פילוס דרכים חדשות בטרשים',
                'הצבת גשרי בייאלי (Bailey) על נחלים',
                'פינוי שדות מוקשים בנתיב צר ומסומן',
                'פריצה מבוקרת דרך קירות וגדרות',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <Icon name="check" size={13} strokeWidth={2.5} className="text-status-ok shrink-0 mt-1" />
                  <span className="text-fg leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface p-5 border-r-4 border-r-status-danger rounded-xl bg-status-danger/5">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="bolt" size={20} className="text-status-danger" />
              <div>
                <div className="font-display font-bold text-status-danger">שלילת ניידות</div>
                <div className="text-[10px] font-mono text-fg-dim">Counter-Mobility · Denial</div>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              {[
                'מיקוש נגדי נרחב בצירים מרכזיים',
                'פיצוץ גשרים וצמתים אסטרטגיים',
                'יצירת מכתשים עמוקים בכבישים',
                'חסימת מעברי ואדי ואוכפים בקיריות',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <Icon name="spark" size={13} strokeWidth={2.5} className="text-status-danger shrink-0 mt-1" />
                  <span className="text-fg leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5 p-4 rounded-xl bg-bg-accent/40 border border-border flex gap-3 items-start">
          <Icon name="eye" size={18} className="text-accent shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-fg-muted">
            <strong className="text-fg">סיור הנדסי קדמי:</strong> שני המאמצים נשענים על מידע מהשטח —
            עומק נחלים, יכולת נשיאת גשרים ישנים, רמת לחות הקרקע, אפשרויות חפירה. מודיעין הנדסי גרוע = הפתעות אסון = אוגדה תקועה.
          </div>
        </div>
      </div>
    </section>
  );
}

function EngineeringStage({ mode }: { mode: Mode }) {
  const showNatural = mode === 'natural' || mode === 'mobility' || mode === 'counter';
  const showArtificial = mode === 'artificial' || mode === 'counter';
  const showMobility = mode === 'mobility';
  const showCounter = mode === 'counter';

  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <defs>
          <linearGradient id="ground-eng" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3f5f9" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="75" fill="url(#ground-eng)" />

        {/* Background ridges */}
        <path d="M0 55 L20 40 L40 50 L60 35 L80 45 L100 38 L100 75 L0 75 Z" className="fill-terrain-sand/15" />

        {/* Natural obstacles: river + cliffs */}
        <motion.g initial={false} animate={{ opacity: showNatural ? 1 : 0.25 }} transition={{ duration: 0.3 }}>
          {/* River */}
          <path
            d="M0 55 Q 25 52 50 55 T 100 52"
            fill="none"
            className="stroke-terrain-sky"
            strokeWidth="2.2"
            opacity="0.75"
          />
          <text x="22" y="51" textAnchor="middle" className="fill-terrain-sky font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round">
            נהר זורם
          </text>
          {/* Cliff */}
          <path
            d="M60 25 L75 22 L78 30 L62 32 Z"
            className="fill-terrain-ridge/40 stroke-terrain-ridge"
            strokeWidth="0.4"
          />
          <text x="69" y="22" textAnchor="middle" className="fill-terrain-ridge font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
            מצוק
          </text>
        </motion.g>

        {/* Artificial obstacles: mines + AT ditch + wire */}
        <motion.g initial={false} animate={{ opacity: showArtificial ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          {/* Minefield */}
          <rect x="28" y="40" width="18" height="8" rx="1" className="fill-status-danger/25 stroke-status-danger" strokeWidth="0.5" strokeDasharray="1.2 0.6" />
          {[
            [30, 42], [33, 44], [36, 42.5], [38, 45], [42, 43.5], [44, 41.5],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="0.7" className="fill-status-danger" />
            </g>
          ))}
          <text x="37" y="38" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
            שדה מוקשים
          </text>

          {/* AT ditch */}
          <path d="M55 40 L80 42 L80 45 L55 43 Z" className="fill-fg/30 stroke-fg" strokeWidth="0.3" />
          <text x="67.5" y="48.5" textAnchor="middle" className="fill-fg font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
            תעלת נ"ט
          </text>

          {/* Wire entanglement */}
          {[10, 14, 18, 22, 26].map((x) => (
            <path
              key={x}
              d={`M ${x} 60 q 1.2 -2 2.4 0 t 2.4 0`}
              fill="none"
              className="stroke-fg-muted"
              strokeWidth="0.3"
            />
          ))}
          <text x="18" y="65" textAnchor="middle" className="fill-fg-muted font-display font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
            גדר תלתלית
          </text>
        </motion.g>

        {/* Mobility (breaching) overlay */}
        <motion.g initial={false} animate={{ opacity: showMobility ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          {/* Bridge over river */}
          <rect x="48" y="52" width="6" height="6" rx="0.6" className="fill-status-ok stroke-status-ok" strokeWidth="0.5" />
          <text x="51" y="65" textAnchor="middle" className="fill-status-ok font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
            גשר זמני
          </text>
          {/* Breaching arrow through */}
          <path
            d="M10 65 Q 30 60 51 55 Q 75 35 90 25"
            fill="none"
            className="stroke-status-ok"
            strokeWidth="0.7"
            strokeDasharray="2 1.2"
            markerEnd="url(#arrow-ok)"
          />
          <defs>
            <marker id="arrow-ok" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
              <polygon points="0,0 4,2 0,4" className="fill-status-ok" />
            </marker>
          </defs>
          <text x="40" y="58" textAnchor="middle" className="fill-status-ok font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round">
            פריצה
          </text>
        </motion.g>

        {/* Counter-mobility: channeling into kill zone */}
        <motion.g initial={false} animate={{ opacity: showCounter ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          {/* Kill zone */}
          <ellipse cx="80" cy="32" rx="9" ry="6" className="fill-status-danger/15 stroke-status-danger" strokeWidth="0.4" strokeDasharray="1.5 0.8" />
          <text x="80" y="22" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round">
            שטח השמדה
          </text>
          {/* Channeling arrows */}
          <path d="M20 65 Q 40 60 60 50 Q 70 42 80 32" fill="none" className="stroke-status-danger" strokeWidth="0.5" strokeDasharray="1 0.6" />
          <path d="M10 60 Q 25 55 45 48 Q 65 43 80 32" fill="none" className="stroke-status-danger" strokeWidth="0.5" strokeDasharray="1 0.6" />
        </motion.g>

        {/* Start/end markers */}
        <g>
          <circle cx="6" cy="68" r="1.6" className="fill-accent-cool" />
          <text x="6" y="73" textAnchor="middle" className="fill-accent-cool font-mono font-bold" fontSize="2.8">A</text>
        </g>
        <g>
          <circle cx="92" cy="18" r="1.6" className="fill-accent-hot" />
          <text x="92" y="15" textAnchor="middle" className="fill-accent-hot font-mono font-bold" fontSize="2.8">B</text>
        </g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        אותו מרחב · 4 פרספקטיבות הנדסיות
      </div>
    </div>
  );
}
