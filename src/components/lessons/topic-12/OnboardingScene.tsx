'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { IntelCard } from '@/components/lesson/IntelCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type View = 'photo' | 'layers' | 'analysis' | 'decision';

type Step = {
  id: View;
  label: string;
  icon: IconName;
  popupTitle: string;
  popupBody: string;
};

const STEPS: Step[] = [
  {
    id: 'photo',
    label: 'מפה — תמונה סטטית',
    icon: 'eye',
    popupTitle: 'המפה הטיפשה',
    popupBody:
      'בעבר מפה הייתה <strong>תמונה</strong>. ציור על נייר. תלכלכת אותו עם עיפרון? אבד מידע. רוצה להוסיף משהו? צריך לצייר מחדש. <strong>הבעיה:</strong> המפה לא מבינה את עצמה. היא לא יודעת שהקו האדום הוא כביש, ושהמשולש הוא הר. היא רק רואה פיקסלים.',
  },
  {
    id: 'layers',
    label: 'GIS — שכבות חכמות',
    icon: 'layers',
    popupTitle: 'מפה שמבינה את עצמה',
    popupBody:
      'ב-GIS, כל סוג מידע הוא <strong>שכבה נפרדת ושקופה</strong>: שכבת טופוגרפיה, שכבת כבישים, שכבת מודיעין, שכבת תשתיות. ההמצאה הגדולה: כל פיסת מידע <strong>מעוגנת לקואורדינטה</strong>. אפשר להלביש שכבה על שכבה, לכבות/להדליק, ולקבל <strong>תמונה רב-ממדית</strong>.',
  },
  {
    id: 'analysis',
    label: 'ניתוח — המחשב חושב',
    icon: 'compass',
    popupTitle: 'מנתח מרחבי במקום סרגל',
    popupBody:
      'הכוח האמיתי של GIS הוא <strong>חישוב על השכבות</strong>: Viewshed (איפה רואים), Cost Surface (איפה זול לעבור), Least-Cost Path (איך לעקוף איומים), Buffers (טבעות איום), Network Analysis (איפה הצמת הקריטי). המחשב עושה ב-3 שניות מה שלוקח ידנית 3 שעות.',
  },
  {
    id: 'decision',
    label: 'החלטה — תוצר מבצעי',
    icon: 'crosshair',
    popupTitle: 'מהמפה ישר לחימוש',
    popupBody:
      'התוצאה: <strong>מסקנות מבצעיות</strong>. "המסלול הזה זול ב-40% מהאלכסון". "פיצוץ הגשר הזה משתק 3 דרכי אספקה". "סוללת הטילים בעמדה X מאיימת על 5 יישובים". GIS הוא לא תוצר — הוא <strong>סביבת קבלת החלטות</strong> שמחברת מודיעין לפעולה.',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'מודל תלת-ממדי איתר את בן לאדן',
    place: 'מבצע "Neptune Spear", פקיסטן · מאי 2011',
    lesson: 'ה-CIA בנה מודל GIS תלת-ממדי מדויק של המתחם באבוטאבאד — חצרות, חדרים, גבהי קירות, צמחייה. ה-SEALs אימנו שעות במודל הזה לפני שהגיעו. <strong>לא היה רגע אחד של "מה זה?"</strong> — הכל היה ידוע מראש.',
    icon: 'pyramid',
    accent: 'text-status-ok',
  },
  {
    headline: 'GIS תכנן את הנחיתה הגדולה ביותר',
    place: 'D-Day, נורמנדי · יוני 1944',
    lesson: 'לפני ה-GIS המחשבי, בעלות הברית עשו זאת ידנית: שכבת גאות-שפל, שכבת ביצורים, שכבת הסוואה, שכבת מזג אוויר. כל שכבה על שקף שקוף. <strong>"GIS אנלוגי" בקנה מידה ענק</strong>. המבצע הצליח כי הצליבת השכבות הייתה מדויקת.',
    icon: 'layers',
    accent: 'text-accent-cool',
  },
  {
    headline: 'אזרח עם לפטופ מנתח כמו המל"ט',
    place: 'אוקראינה · 2022 ואילך',
    lesson: 'אזרחים אוקראינים החלו להשתמש ב-QGIS (חינמי) + OpenStreetMap + תמונות לוויין מסחריות. הם זיהו תנועות צבא רוסי, חישבו טווחי טילים, ובנו מפות איום שעוזרות לצבא בזמן אמת. <strong>GIS דמוקרטי שמשנה את שדה הקרב.</strong>',
    icon: 'people',
    accent: 'text-status-warn',
  },
  {
    headline: 'יחידה 9900 — מודלים מבצעיים',
    place: 'צה"ל · יחידת התצלום הצבאי',
    lesson: 'יחידה 9900 מייצרת ב-GIS מודלי שטח תלת-ממדיים של אזורי מבצע. לוחמים "מטיילים" בהם ב-VR לפני שמגיעים בפועל. <strong>הוסיפו לכך Cost Surfaces ו-Buffers</strong> = מערכת קבלת החלטות לכל זרועות הצבא.',
    icon: 'satellite',
    accent: 'text-accent',
  },
];

export function OnboardingScene() {
  const [view, setView] = useState<View>('photo');
  const [expandedStep, setExpandedStep] = useState<View | null>('photo');

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
        step="12.0"
        eyebrow="לפני שמתחילים"
        title={
          <>
            ממפה <span className="gradient-text">טיפשה</span> למפה <span className="gradient-text">חכמה</span>
          </>
        }
        intro="מפה רגילה היא רק ציור. GIS הופך אותה לסביבת קבלת החלטות שמחשבת איומים, מציעה מסלולים, ומזהה נקודות תורפה. בוא נראה את ה-4 שלבים מההצילום למסקנה."
      />

      <div className="grid md:grid-cols-[2fr_3fr] gap-6 items-start">
        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const active = view === s.id;
            const expanded = expandedStep === s.id;
            const passed = STEPS.findIndex((x) => x.id === view) > i;
            return (
              <div
                key={s.id}
                className={cn(
                  'surface overflow-hidden transition-colors',
                  active
                    ? 'border-accent shadow-glow bg-accent/5'
                    : 'hover:border-border-strong',
                  passed && !active && 'opacity-80'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleStepClick(s.id)}
                  aria-expanded={expanded}
                  aria-controls={`t13-onb-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t13-onb-bar"
                      className="absolute inset-y-0 end-0 w-1 bg-accent rounded-l-full"
                    />
                  )}
                  <span
                    className={cn(
                      'size-9 rounded-xl flex items-center justify-center shrink-0 transition-all',
                      active ? 'bg-accent text-bg shadow-glow' : passed ? 'bg-status-ok/15 text-status-ok' : 'bg-bg-accent text-fg-muted'
                    )}
                  >
                    {passed && !active ? (
                      <Icon name="check" size={16} strokeWidth={2.5} />
                    ) : (
                      <span className="font-mono text-sm font-bold">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={cn('font-medium leading-tight', active && 'text-accent')}>{s.label}</div>
                  </div>
                  <Icon
                    name={s.icon}
                    size={20}
                    className={cn('transition-colors shrink-0', active ? 'text-accent' : 'text-fg-dim')}
                  />
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('shrink-0 inline-flex', expanded ? 'text-accent' : 'text-fg-dim')}
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
                      key={`t13-onb-panel-${s.id}`}
                      id={`t13-onb-panel-${s.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-accent/20">
                        <div className="text-sm font-display font-semibold text-accent-hover mt-3 mb-2 tracking-wider">
                          למה זה משנה
                        </div>
                        <h4 className="font-display font-bold text-base sm:text-lg leading-tight text-balance mb-2">
                          {s.popupTitle}
                        </h4>
                        <p
                          className="text-sm leading-relaxed text-fg-muted text-pretty"
                          dangerouslySetInnerHTML={{ __html: s.popupBody }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="surface-elevated relative overflow-hidden sticky top-6">
          <GISStage view={view} />
        </div>
      </div>

      <SoftDivider text="4 פעמים ש-GIS שינה תוצאה מבצעית" />

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

      <ReadyCallout title="עכשיו אתה מוכן">
        <p>הבנת ש-GIS זה לא "אפליקציית מפות" — זה <strong className="text-fg">סביבת קבלת החלטות</strong>. בשלוש הסצנות הבאות נצלול:
            <strong className="text-fg"> איך עובדות שכבות, איך מחשבים מסלול בעלות מינימלית, ואיך מאתרים את הגשר הקריטי שיהפוך לאויב לבעיה</strong>.</p>
      </ReadyCallout>
    </section>
  );
}

function GISStage({ view }: { view: View }) {
  const showLayers = view === 'layers' || view === 'analysis' || view === 'decision';
  const showAnalysis = view === 'analysis' || view === 'decision';
  const showDecision = view === 'decision';

  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <defs>
          <linearGradient id="ground-13" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3f5f9" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="75" fill="url(#ground-13)" />

        {/* Base map — terrain (always visible) */}
        <path d="M0 50 L20 40 L40 48 L60 38 L80 45 L100 42 L100 75 L0 75 Z" className="fill-terrain-sand/20" />

        {/* Layer 1: Photo (default state — just terrain + buildings shown as flat) */}
        <motion.g initial={false} animate={{ opacity: view === 'photo' ? 1 : 0.35 }} transition={{ duration: 0.3 }}>
          {[
            { x: 22, y: 50 },
            { x: 38, y: 53 },
            { x: 55, y: 48 },
            { x: 72, y: 50 },
          ].map((b, i) => (
            <rect key={i} x={b.x - 3} y={b.y - 3} width="6" height="3" className="fill-fg/50" />
          ))}
          <text x="50" y="9" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.95" strokeLinejoin="round">
            תמונה: רואים — לא יודעים
          </text>
        </motion.g>

        {/* Layer 2: GIS Layers (toggles visible) */}
        <motion.g initial={false} animate={{ opacity: showLayers ? 1 : 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          {/* Roads */}
          <path d="M0 55 L25 50 L50 53 L75 50 L100 52" fill="none" className="stroke-accent" strokeWidth="0.8" />
          {/* Threat zone */}
          <circle cx="60" cy="40" r="8" fill="none" className="stroke-status-danger" strokeWidth="0.4" strokeDasharray="1 0.7" opacity="0.7" />
          <circle cx="60" cy="40" r="0.8" className="fill-status-danger" />
          {/* Friendly position */}
          <circle cx="20" cy="56" r="1" className="fill-accent-cool" />

          {/* Layer labels stacked */}
          <g transform="translate(8 14)">
            {[
              { label: 'תבליט', color: 'text-terrain-ridge' },
              { label: 'דרכים', color: 'text-accent' },
              { label: 'מודיעין', color: 'text-status-danger' },
              { label: 'כוחותינו', color: 'text-accent-cool' },
            ].map((l, i) => (
              <g key={i} transform={`translate(0 ${i * 4})`}>
                <rect x="0" y="-1.5" width="3" height="3" className={cn('fill-current', l.color)} opacity="0.7" />
                <text x="4" y="0.8" className={cn('font-display font-bold', l.color)} fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.75" strokeLinejoin="round">
                  {l.label}
                </text>
              </g>
            ))}
          </g>
        </motion.g>

        {/* Layer 3: Analysis — Cost surface heatmap + path */}
        <motion.g initial={false} animate={{ opacity: showAnalysis ? 1 : 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
          {/* Heatmap cells */}
          {Array.from({ length: 32 }).map((_, i) => {
            const col = i % 8;
            const row = Math.floor(i / 8);
            const x = 14 + col * 9;
            const y = 30 + row * 6;
            const distToThreat = Math.sqrt((x - 60) ** 2 + (y - 40) ** 2);
            const cost = Math.max(0, 1 - distToThreat / 20);
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width="8"
                height="5"
                className={cost > 0.6 ? 'fill-status-danger' : cost > 0.3 ? 'fill-status-warn' : 'fill-status-ok'}
                opacity={0.15 + cost * 0.25}
              />
            );
          })}
          <text x="80" y="32" textAnchor="middle" className="fill-status-danger font-display font-bold font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
            עלות גבוהה
          </text>
        </motion.g>

        {/* Layer 4: Decision — Least Cost Path */}
        <motion.g initial={false} animate={{ opacity: showDecision ? 1 : 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
          <path
            d="M20 56 L 30 58 L 42 62 L 55 65 L 72 58 L 85 50 L 92 42"
            fill="none"
            className="stroke-status-ok"
            strokeWidth="1"
          />
          <motion.circle
            r="1"
            className="fill-status-ok"
            animate={{ offsetDistance: ['0%', '100%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            style={{
              offsetPath: 'path("M20 56 L 30 58 L 42 62 L 55 65 L 72 58 L 85 50 L 92 42")',
            }}
          />
          <text x="50" y="70" textAnchor="middle" className="fill-status-ok font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.95" strokeLinejoin="round">
            ✓ נתיב מומלץ
          </text>
          {/* Target */}
          <circle cx="92" cy="42" r="1.2" className="fill-accent-hot" />
          <circle cx="92" cy="42" r="2.5" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
            <animate attributeName="r" values="1.8;4;1.8" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
          </circle>
        </motion.g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        אותו אזור · 4 שכבות חשיבה
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
