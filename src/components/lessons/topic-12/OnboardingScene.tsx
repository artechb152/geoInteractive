'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { IntelCard } from '@/components/lesson/IntelCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type View = 'optical' | 'multi' | 'georef' | 'fusion';

type Step = {
  id: View;
  label: string;
  icon: IconName;
  popupTitle: string;
  popupBody: string;
};

const STEPS: Step[] = [
  {
    id: 'optical',
    label: 'תמונה אופטית — מה שעין רואה',
    icon: 'eye',
    popupTitle: 'IMINT — Imagery Intelligence',
    popupBody:
      'תמונת לוויין רגילה. בריזולוציה של ס"מ בודדים אפשר לזהות סוג טנק, צבעים, שלטים. <strong>היתרון:</strong> פירוט ויזואלי בלתי מתפשר. <strong>החיסרון:</strong> תלות באור שמש ובמזג אוויר בהיר. ענן אחד — סוף הצילום. בלילה? אפס.',
  },
  {
    id: 'multi',
    label: 'סנסורים שלא רואים אור',
    icon: 'satellite',
    popupTitle: 'SAR, IR, רדיומטריה — חודרים את הסתר',
    popupBody:
      '<strong>SAR</strong> (רדאר אקטיבי) שולח גלי רדיו ובוחן את ההחזר. רואה דרך עננים, ערפל, חושך, רשתות הסוואה. רגיש למתכות. <strong>IR תרמי</strong> רואה חתימות חום — אפילו של גוף אדם בלילה. <strong>היתרון:</strong> השלמת ה-IMINT בכל מצב. <strong>החיסרון:</strong> פחות פירוט, יותר נתונים שצריך לפענח.',
  },
  {
    id: 'georef',
    label: 'גאו-עיגון — מצמידים למפה',
    icon: 'compass',
    popupTitle: 'Georeferencing — כל פיקסל בקואורדינטה',
    popupBody:
      'כל תמונה, כל חיישן, כל דיווח — מוצמדים ל<strong>נקודת ציון מדויקת על כדור הארץ</strong>. תמונת SAR מ-2018 על אותו אתר בדיוק כמו תמונה אופטית מ-2024 = השוואה אפשרית. שינוי קרקעי קטן (עמדה חפורה חדשה, רוחב חדש) קופץ מיד. <strong>בלי גאו-עיגון, GEOINT לא קיים.</strong>',
  },
  {
    id: 'fusion',
    label: 'הצלבת סנסורים — האמת המודיעינית',
    icon: 'layers',
    popupTitle: 'Sensor Fusion — האמת מתגלה בפער',
    popupBody:
      'המצלמה רואה "טנק". ה-SAR לא קולט החזר של מתכת. <strong>זאת הונאה.</strong> כל מודיעין נכון נשען על <strong>הצלבת מקורות</strong>: IMINT + SAR + IR + SIGINT (האזנות) + HUMINT (סוכנים). הפער בין המקורות הוא לעיתים <strong>חשוב יותר מהתוכן עצמו</strong> — שם מסתתרת ההטעיה של האויב.',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'תמונת לוויין אחת שכמעט גרמה למלחמת עולם',
    place: 'משבר הטילים בקובה · אוקטובר 1962',
    lesson: 'מטוס U-2 צילם בקובה אתרי שיגור טילי SS-4 סובייטים. תמונות אופטיות ברורות — 13 ימים של משא ומתן על סף מלחמה גרעינית. <strong>IMINT לבד הספיק להוכיח</strong> שלאויב יש יכולת זריקה לארה"ב. עידן GEOINT התחיל שם.',
    icon: 'plane',
    accent: 'text-accent',
  },
  {
    headline: 'SAR ראה את הטנקים — האופטיקה לא',
    place: 'מבצע "סופת המדבר", עיראק · 1991',
    lesson: 'עיראק החביאה טנקים תחת רשתות הסוואה ב-לילות עננים. תמונות אופטיות לא ראו כלום. SAR ה-American AWACS ראה החזרי מתכת ברורים מתחת לרשתות. <strong>הטכנולוגיה ביטלה את הסוואה.</strong>',
    icon: 'tank',
    accent: 'text-accent-cool',
  },
  {
    headline: 'מטוסים מסחריים חשפו את הצבא הרוסי',
    place: 'אוקראינה · 2022 ואילך',
    lesson: 'חברות אזרחיות (Planet, Maxar) פרסמו תמונות לוויין יומיות של תנועות הצבא הרוסי. כל מתאם, כל אזרח, כל עיתונאי — מנתח מודיעין. <strong>OSINT הפך לכוח גלובלי.</strong> רוסיה לא יכולה להחביא דבר.',
    icon: 'satellite',
    accent: 'text-status-warn',
  },
  {
    headline: 'טנקים מתנפחים — והם עבדו!',
    place: 'מבצע "Fortitude", D-Day · 1944',
    lesson: 'בעלות הברית בנו כוח דמה שלם בדרום אנגליה: טנקי גומי, רכבי קרטון, מחנות אוהלים ריקים. גרמניה ראתה זאת מהאוויר — והפנתה את כוחות העתודה שלה לכאלה. <strong>הונאה גיאוגרפית = אסטרטגיה.</strong> והיא עדיין עובדת היום, רק בגרסה דיגיטלית.',
    icon: 'mask',
    accent: 'text-status-danger',
  },
];

export function OnboardingScene() {
  const [view, setView] = useState<View>('optical');
  const [expandedStep, setExpandedStep] = useState<View | null>('optical');

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
            איך <span className="gradient-text">מודיעין</span> רואה היום
          </>
        }
        intro="לפני 80 שנה, צילום אווירי אחד שינה מלחמות. היום, GEOINT הוא שכבת מציאות שלמה — מאות סנסורים, מקורות גלויים, מודלים תלת-ממדיים. בוא נראה ב-4 שכבות מההצילום הבסיסי ועד להצלבה שמגלה הונאה."
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
                  aria-controls={`t12-onb-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t12-onb-bar"
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
                      key={`t12-onb-panel-${s.id}`}
                      id={`t12-onb-panel-${s.id}`}
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
          <IntelStage view={view} />
        </div>
      </div>

      <SoftDivider text="4 רגעי מודיעין ששינו את ההיסטוריה" />

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
        <p>הבנת ש-GEOINT הוא לא "תמונה" — זה <strong>שכבת מציאות</strong>. בשלוש הסצנות הבאות נצלול:
            <strong className="text-fg"> מה GEOINT בנוי ממנו, אילו פלטפורמות אוספות, ואיך OSINT והונאה משחקים בעולם הזה</strong>.</p>
      </ReadyCallout>
    </section>
  );
}

function IntelStage({ view }: { view: View }) {
  const showSar = view === 'multi' || view === 'georef' || view === 'fusion';
  const showGrid = view === 'georef' || view === 'fusion';
  const showFusion = view === 'fusion';

  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <defs>
          <linearGradient id="ground-12" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3f5f9" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="75" fill="url(#ground-12)" />

        {/* Base aerial scene */}
        <path d="M0 55 L25 50 L45 55 L65 48 L85 52 L100 50 L100 75 L0 75 Z" className="fill-terrain-sand/20" />

        {/* Buildings/objects (always visible) */}
        {[
          { x: 22, y: 50 },
          { x: 38, y: 53 },
          { x: 55, y: 48 },
          { x: 72, y: 50 },
        ].map((b, i) => (
          <g key={i}>
            <rect x={b.x - 3} y={b.y - 4} width="6" height="4" className="fill-terrain-ridge/70 stroke-terrain-ridge" strokeWidth="0.2" />
          </g>
        ))}

        {/* "Camouflaged" tank */}
        <g>
          <rect x="62" y="56" width="6" height="3" rx="0.4" className="fill-terrain-olive/70" />
          {/* Vegetation cover */}
          <ellipse cx="65" cy="56.5" rx="5" ry="1.5" className="fill-terrain-olive opacity-50" />
        </g>

        {/* Layer 1: Optical view markers (always visible — labels of what optical sees) */}
        <motion.g initial={false} animate={{ opacity: view === 'optical' ? 1 : 0.35 }} transition={{ duration: 0.3 }}>
          <text x="50" y="10" textAnchor="middle" className="fill-accent font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.95" strokeLinejoin="round">
            תמונה אופטית · יום בהיר
          </text>
          {/* Sun */}
          <circle cx="88" cy="14" r="3" className="fill-accent" opacity="0.6" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = (i * Math.PI) / 4;
            return (
              <line
                key={i}
                x1={88 + Math.cos(a) * 4}
                y1={14 + Math.sin(a) * 4}
                x2={88 + Math.cos(a) * 6}
                y2={14 + Math.sin(a) * 6}
                className="stroke-accent"
                strokeWidth="0.3"
                opacity="0.6"
              />
            );
          })}
        </motion.g>

        {/* Layer 2: SAR — reveals camouflaged tank */}
        <motion.g initial={false} animate={{ opacity: showSar ? 1 : 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          {/* SAR returns (metallic glints) */}
          <circle cx="65" cy="56.5" r="4" fill="none" className="stroke-accent-hot" strokeWidth="0.4" strokeDasharray="0.6 0.4">
            <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="65" y="48" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
            SAR מזהה: מתכת!
          </text>

          {/* SAR signal lines from satellite */}
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1={88}
              y1="8"
              x2={60 + i * 3}
              y2="56"
              className="stroke-accent-hot"
              strokeWidth="0.15"
              strokeDasharray="0.5 0.4"
              opacity="0.3"
            />
          ))}
        </motion.g>

        {/* Layer 3: Geo-referenced grid */}
        <motion.g initial={false} animate={{ opacity: showGrid ? 1 : 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`gx${i}`} x1={i * 10} y1="35" x2={i * 10} y2="75" className="stroke-accent-cool" strokeWidth="0.1" opacity="0.4" />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={`gy${i}`} x1="0" y1={35 + i * 10} x2="100" y2={35 + i * 10} className="stroke-accent-cool" strokeWidth="0.1" opacity="0.4" />
          ))}
          {/* Coordinate label on tank */}
          <text x="65" y="62" textAnchor="middle" className="fill-accent-cool font-display font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
            32.07°N · 34.78°E
          </text>
        </motion.g>

        {/* Layer 4: Sensor fusion / cross-reference */}
        <motion.g initial={false} animate={{ opacity: showFusion ? 1 : 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
          {/* Multiple source markers */}
          <g transform="translate(15 18)">
            <rect x="-4" y="-2" width="8" height="4" rx="0.5" className="fill-bg-card stroke-accent" strokeWidth="0.3" />
            <text x="0" y="0.6" textAnchor="middle" className="fill-accent font-display font-bold font-bold" fontSize="2"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >IMINT ✓</text>
          </g>
          <g transform="translate(15 26)">
            <rect x="-4" y="-2" width="8" height="4" rx="0.5" className="fill-bg-card stroke-accent-hot" strokeWidth="0.3" />
            <text x="0" y="0.6" textAnchor="middle" className="fill-accent-hot font-display font-bold font-bold" fontSize="2"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >SAR ✓</text>
          </g>
          <g transform="translate(15 34)">
            <rect x="-4" y="-2" width="8" height="4" rx="0.5" className="fill-bg-card stroke-status-warn" strokeWidth="0.3" />
            <text x="0" y="0.6" textAnchor="middle" className="fill-status-warn font-display font-bold font-bold" fontSize="2"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >IR ✓</text>
          </g>

          {/* Convergence lines from all sources to tank */}
          {[
            { x: 20, y: 18 },
            { x: 20, y: 26 },
            { x: 20, y: 34 },
          ].map((p, i) => (
            <line key={i} x1={p.x} y1={p.y} x2="65" y2="56" className="stroke-accent" strokeWidth="0.2" strokeDasharray="0.6 0.4" opacity="0.5" />
          ))}

          <text x="65" y="68" textAnchor="middle" className="fill-status-ok font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.95" strokeLinejoin="round">
            ✓ אומת — לא הונאה
          </text>
        </motion.g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        אותו אתר · 4 שכבות מודיעין
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
