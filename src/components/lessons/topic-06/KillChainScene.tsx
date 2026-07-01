'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Stage = 'find' | 'fix' | 'engage' | 'hit';

type StageData = {
  id: Stage;
  label: string;
  english: string;
  icon: IconName;
  question: string;
  losRole: string;
  failure: string;
  fix: string;
  color: string;
  bg: string;
  border: string;
};

// All four stages share the same palette — one *active* tone, since the
// stages are types of activity (sense → track → act → verify), not
// outcomes. The active tone is the site's primary brand accent (orange),
// which matches the convention every other selector in the course uses
// for its active state (LOCScene's disruption picker, ContoursScene's
// shape picker, the hero CTA).
const STAGE_COLOR = 'text-accent';
const STAGE_BG = 'bg-accent/8';
const STAGE_BORDER = 'border-accent/35';

const STAGES: StageData[] = [
  {
    id: 'find',
    label: 'איתור',
    english: 'Find / Detect',
    icon: 'eye',
    question: 'איפה המטרה?',
    losRole: 'התצפיתן, הרחפן או הלוויין חייבים קו ראייה (LOS – Line of Sight) נקי כדי לראות את המטרה ולהבין מהי. בלי קו ראייה — המטרה פשוט לא קיימת מבחינתנו.',
    failure: 'תצפית בעין שנחסמת בגלל ערפל בוקר כבד, או סוללת טילים שמוסתרת היטב בתוך יער ולא ניתן לאמת אותה.',
    fix: 'שילוב של כלים שונים. למשל: רדאר (מכ"ם) שיכול "לראות" דרך עננים, או חיישנים שקולטים שידורי קשר. אם כלי אחד מתעוור, השני משלים אותו.',
    color: STAGE_COLOR,
    bg: STAGE_BG,
    border: STAGE_BORDER,
  },
  {
    id: 'fix',
    label: 'נעילה / מעקב',
    english: 'Fix / Track',
    icon: 'crosshair',
    question: 'איפה המטרה תהיה כשהטיל יגיע?',
    losRole: 'אנחנו חייבים לשמור על קו ראייה רציף כדי לעקוב אחרי המטרה ולעדכן את המיקום שלה בכל שנייה, ולא רק לקבל תמונה אחת שלה.',
    failure: 'רחפן עוקב אחרי רכב נמלט. הרכב נכנס לתוך מנהרה או חורשה סבוכה. קו הראייה נשבר, והרכב אבד לנו.',
    fix: 'שימוש בכמה אמצעי מעקב במקביל מכיוונים שונים. בנוסף, אלגוריתמים שמנסים "לנחש" לאן המטרה נסעה לפי המהירות והכיוון האחרונים שלה, עד שהיא מופיעה שוב.',
    color: STAGE_COLOR,
    bg: STAGE_BG,
    border: STAGE_BORDER,
  },
  {
    id: 'engage',
    label: 'שיגור',
    english: 'Engage / Launch',
    icon: 'bolt',
    question: 'איך פוגעים?',
    losRole: 'טילים "חכמים" שמונחים בעזרת קרן לייזר או מצלמת וידאו דורשים קו ראייה רציף מהרגע שירינו ועד הפגיעה. טילים שמבוססים על מיקום (GPS) לא צריכים קו ראייה, אבל הם פחות מדויקים מול מטרות זזות.',
    failure: 'בעיראק (2003) שוגר טיל מונחה לייזר. שנייה אחרי השיגור, ענן עבר והסתיר את המטרה. קרן הלייזר נשברה, והטיל נפל בשדה ריק.',
    fix: 'מיקום כוח נוסף בזווית אחרת שיכול "להאיר" את המטרה בלייזר, או בחירה מראש בטיל מבוסס GPS כשמזג האוויר בעייתי.',
    color: STAGE_COLOR,
    bg: STAGE_BG,
    border: STAGE_BORDER,
  },
  {
    id: 'hit',
    label: 'בדיקת תוצאות',
    english: 'Hit / BDA',
    icon: 'target',
    question: 'האם באמת פגענו?',
    losRole: 'בסוף כל תקיפה חובה לבדוק מה קרה. זה דורש להשיג קו ראייה חדש על המטרה <strong>אחרי</strong> הפגיעה, בדרך כלל ממצלמה אחרת שמגיעה מאוחר יותר.',
    failure: 'בוצעה תקיפה בלילה. ענן ענק של אבק ועשן הסתיר את המקום. רק בבוקר, כשהאבק שקע, ראו שהפצצה פספסה את הבניין ב-20 מטרים.',
    fix: 'תכנון מראש: שולחים רחפן אחר שיצלם דקות אחרי התקיפה, משתמשים ברדאר שרואה דרך עשן, או אפילו בודקים תמונות לוויין אזרחיות מגוגל מפות (לזה קוראים OSINT).',
    color: STAGE_COLOR,
    bg: STAGE_BG,
    border: STAGE_BORDER,
  },
];

export function KillChainScene() {
  const [active, setActive] = useState<Stage>('find');
  const meta = STAGES.find((s) => s.id === active)!;
  const activeIdx = STAGES.findIndex((s) => s.id === active);

  return (
    <section id="scene-killchain" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="06.3"
        eyebrow="שרשרת התקיפה (Kill Chain) וקו הראייה"
title = {
  <>
    <span className="gradient-text">אם איבדתם קשר עין</span> — איבדתם את כל התקיפה
  </>
}
        intro="כל תקיפה מורכבת משרשרת של 4 שלבים. כל שלב מחובר לשני בעזרת חוט דק אחד — קו הראייה (LOS – Line of Sight). אם החוט הזה נחתך באמצע, כל השרשרת קורסת. בואו נבין איך זה עובד."
      />

      <div className="grid md:grid-cols-2 gap-4 mb-12 items-stretch">
        <div className="surface-elevated p-5 rounded-2xl">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-accent mb-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            השרשרת
          </div>
          <h3 className="font-display font-bold text-lg leading-tight text-accent-hover mb-2">
            Kill Chain · 4 שלבי חובה
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            תהליך מחייב של ארבעה שלבים שמתחיל ברגע שמחפשים את המטרה ומסתיים רק כשווידאנו שהיא הושמדה. כל שלב חייב להסתיים בהצלחה כדי שאפשר יהיה לעבור לבא אחריו.
          </p>
        </div>
        <div className="surface-elevated p-5 rounded-2xl">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-accent mb-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            הסוד
          </div>
          <h3 className="font-display font-bold text-lg leading-tight text-accent-hover mb-2">
            אסור לדלג על שלבים
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            אם איבדנו קו ראייה (LOS – Line of Sight) בשלב 2 — כל השלבים הבאים מתבטלים. לכן, מנתח שטח חכם בודק <strong className="text-fg">מראש</strong> שיש לו קו ראייה רציף בכל אחד מארבעת השלבים.
          </p>
        </div>
      </div>

      {/* Chain visualization — 4 stages connected */}
      <div className="surface-elevated p-5 sm:p-6 rounded-2xl mb-6">
        <div className="text-sm font-display font-semibold text-fg-muted mb-4 tracking-wider text-center">
          לחצו על שלב כדי לראות את התלות שלו בקו הראייה
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-4 relative">
          {STAGES.map((s, i) => {
            const isActive = active === s.id;
            const isPassed = activeIdx > i;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => setActive(s.id)}
                  className={cn(
                    'group flex flex-col items-center gap-2 relative w-full p-2 sm:p-3 rounded-xl transition-all',
                    isActive && `${s.border} ${s.bg}`,
                    !isActive && 'hover:bg-bg-accent/40'
                  )}
                >
                  <Icon
                    name={s.icon}
                    size={36}
                    className={cn(
                      'transition-all',
                      isActive ? s.color : isPassed ? 'text-brand-dark/70' : 'text-fg-dim'
                    )}
                  />
                  <div className={cn('font-display font-bold text-xs sm:text-sm leading-tight text-center', isActive && s.color)}>
                    {s.label}
                  </div>
                  <div className="text-[9px] font-display font-medium tracking-wide text-fg-dim text-center hidden sm:block">{s.english}</div>
                </button>
                {/* Connector arrow (between stages, but not after the last one) */}
                {i < STAGES.length - 1 && (
                  <div className="hidden sm:flex items-center px-1 text-fg-dim shrink-0">
                    <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
                      <path
                        d="M22 7L1 7"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeDasharray="2 1.5"
                      />
                      <path d="M5 3L1 7L5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active stage details */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className={cn('surface-elevated p-6 rounded-2xl border-r-4 mb-12', meta.border.replace('border-', 'border-r-'))}
        >
          <div className="flex items-start gap-4 mb-5">
            <div className="flex-1">
              <div className={cn('text-sm font-display font-semibold mb-0.5 tracking-wider', meta.color)}>
                שלב {activeIdx + 1}: {meta.english}
              </div>
              <h3 className="font-display font-bold text-xl leading-tight mb-1">{meta.label}</h3>
              <p className="text-sm text-fg-muted leading-relaxed italic">"{meta.question}"</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="surface p-4 rounded-xl bg-bg-accent/20">
              <div className={cn('text-sm font-display font-semibold mb-2 tracking-wider flex items-center gap-1.5', meta.color)}>
                <Icon name="eye" size={11} />
                למה צריך פה קו ראייה?
              </div>
              <p
                className="text-sm text-fg leading-relaxed"
                dangerouslySetInnerHTML={{ __html: meta.losRole }}
              />
            </div>
            <div className="surface p-4 rounded-xl bg-bg-accent/20">
              <div className="text-sm font-display font-semibold text-fg mb-2 tracking-wider flex items-center gap-1.5">
                <Icon name="spark" size={11} className="text-fg-muted" />
                מה קורה כשקו הראייה נשבר
              </div>
              <p className="text-sm text-fg-muted leading-relaxed">{meta.failure}</p>
            </div>
            <div className="surface p-4 rounded-xl bg-bg-accent/20">
              <div className="text-sm font-display font-semibold text-fg mb-2 tracking-wider flex items-center gap-1.5">
                <Icon name="check" size={11} strokeWidth={2.5} className="text-fg-muted" />
                איך מתמודדים
              </div>
              <p
                className="text-sm text-fg leading-relaxed"
                dangerouslySetInnerHTML={{ __html: meta.fix }}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <SoftDivider text="המושג שמחזיק את הכל יחד" />

      {/* Continuous coverage cell */}
      <div className="surface-elevated p-6 rounded-2xl">
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-center">
          <div>
            <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">
              מרחב הכיסוי הרציף
            </div>
            <h3 className="font-display font-bold text-xl leading-tight mb-3">
              האזור שבו <span className="text-accent">אי אפשר להתחבא</span>
            </h3>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty mb-3">
              מדובר בשטח שבו יש כיסוי מלא ורציף של אמצעי איסוף שונים — תצפיתנים, רחפנים או לוויינים. כל עוד המטרה בתוך האזור הזה, אי אפשר לפספס אותה ויש עליה קו ראייה (LOS – Line of Sight) קבוע.
            </p>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty">
              <strong className="text-fg">למה זה כל כך קריטי?</strong> כי ברגע שהמטרה יוצאת מהשטח הזה, חייבים להעביר את ה"משמורת" עליה לאמצעי מעקב באזור הבא (למשל, למצלמה אחרת בהמשך הכביש). מנתח שטח מעולה ידע בדיוק איפה הכיסוי שלו נגמר ומי אחראי "לקבל" את המטרה כדי שהיא לא תיעלם.
            </p>
          </div>

          {/* Coverage visualization */}
          <CoverageCellViz />
        </div>
      </div>
    </section>
  );
}

function CoverageCellViz() {
  // 3 sensors with overlapping coverage zones. Geometry chosen so:
  //  - all three sensor ellipses overlap pairwise (sensor 1∩2, sensor 2∩3)
  //  - the union forms a roughly horizontal "band" of continuous coverage
  //  - there's room beneath the band for a dead-zone adjacent to (touching)
  //    the lower edge of the coverage envelope.
  const sensors = [
    { id: 'obs',  x: 26, y: 28, rx: 18, ry: 14, name: 'תצפית' },
    { id: 'uav',  x: 50, y: 30, rx: 20, ry: 15, name: 'כטב"ם' },
    { id: 'sat',  x: 74, y: 27, rx: 18, ry: 14, name: 'לוויין' },
  ];

  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <defs>
          {/* Diagonal hatch for the dead zone — clearly different texture */}
          <pattern id="dead-hatch" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
            <rect width="3" height="3" className="fill-status-danger/12" />
            <line x1="0" y1="0" x2="0" y2="3" className="stroke-status-danger/65" strokeWidth="0.5" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="100" height="75" className="fill-bg-elevated" />

        {/* Subtle grid */}
        {Array.from({ length: 11 }).map((_, i) => (
          <g key={i}>
            <line x1={i * 10} y1="0" x2={i * 10} y2="75" className="stroke-border-subtle" strokeWidth="0.1" />
            <line x1="0" y1={i * 7.5} x2="100" y2={i * 7.5} className="stroke-border-subtle" strokeWidth="0.1" />
          </g>
        ))}

        {/* (1) Coverage fills — same brand colour for all three sensors.
            Combined with mix-blend-mode: multiply, overlapping zones naturally
            darken, which is exactly the "stronger tracking where two sensors
            see" idea. */}
        <g style={{ mixBlendMode: 'multiply' }}>
          {sensors.map((s) => (
            <ellipse
              key={s.id}
              cx={s.x}
              cy={s.y}
              rx={s.rx}
              ry={s.ry}
              className="fill-brand"
              opacity="0.35"
            />
          ))}
        </g>

        {/* (2) Per-sensor dashed outline — makes each sensor's individual reach
            visible AS a distinct shape, so the merged blob can be decomposed. */}
        {sensors.map((s) => (
          <ellipse
            key={`outline-${s.id}`}
            cx={s.x} cy={s.y} rx={s.rx} ry={s.ry}
            fill="none"
            className="stroke-brand-dark/35"
            strokeWidth="0.35"
            strokeDasharray="1.2 0.9"
          />
        ))}

        {/* (3) Envelope outline — wraps the union of all three sensor circles.
            This is the boundary the body text refers to: outside this line,
            you can hide. */}
        <path
          d="M 6 28 Q 10 13 26 13 Q 50 11 74 13 Q 90 14 94 28 Q 92 43 74 43 Q 50 47 26 43 Q 8 42 6 28 Z"
          fill="none"
          className="stroke-brand-dark/60"
          strokeWidth="0.55"
          strokeDasharray="1.4 0.8"
        />

        {/* (4) Coverage label — anchored above the band, doesn't compete with content inside */}
        <text
          x="50" y="8"
          textAnchor="middle"
          className="fill-brand-dark font-display font-bold"
          fontSize="3.2"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="1"
          strokeLinejoin="round"
        >
          אזור כיסוי רציף — אי אפשר להתחבא
        </text>

        {/* (5) Sensor markers + names — large enough to read, in the centre of
            each sensor's own zone. */}
        {sensors.map((s) => (
          <g key={`sensor-${s.id}`}>
            <circle cx={s.x} cy={s.y} r="1.8" className="fill-brand-dark stroke-bg-elevated" strokeWidth="0.5" />
            <text
              x={s.x} y={s.y - 2.8}
              textAnchor="middle"
              className="fill-fg font-display font-bold"
              fontSize="3"
              paintOrder="stroke"
              stroke="#ffffff"
              strokeWidth="1.1"
              strokeLinejoin="round"
            >
              {s.name}
            </text>
          </g>
        ))}

        {/* (6) Hand-off annotations — placed at the two overlap regions
            (sensor 1∩2 around x=38, sensor 2∩3 around x=62). Made small but
            with a stroke-outlined arrow icon for clarity. */}
        {[
          { x: 38, y: 30, label: '⇄ מעבר' },
          { x: 62, y: 30, label: '⇄ מעבר' },
        ].map((h, i) => (
          <text
            key={i}
            x={h.x} y={h.y}
            textAnchor="middle"
            className="fill-accent-hover font-display font-bold"
            fontSize="2.6"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            {h.label}
          </text>
        ))}

        {/* (7) Dead zone — adjacent to (touching) the lower edge of the coverage
            envelope, NOT floating separately. */}
        <rect
          x="6" y="55"
          width="34" height="15"
          rx="1.5"
          fill="url(#dead-hatch)"
          className="stroke-status-danger/70"
          strokeWidth="0.55"
        />
        <text
          x="23" y="60.5"
          textAnchor="middle"
          className="fill-status-danger font-display font-bold"
          fontSize="2.8"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="1"
          strokeLinejoin="round"
        >
          שטח מת
        </text>
        <text
          x="23" y="64"
          textAnchor="middle"
          className="fill-status-danger/85 font-display font-semibold"
          fontSize="2"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="0.7"
          strokeLinejoin="round"
        >
          (אפשר להתחבא)
        </text>

        {/* (8) Tracked target — inside the coverage band. Pulsing red dot with
            label "מזוהה ✓". Demonstrates the state when target is in coverage. */}
        <g>
          <circle cx="60" cy="38" r="3.2" fill="none" className="stroke-accent-hot/60" strokeWidth="0.35">
            <animate attributeName="r" values="2.5;5;2.5" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="60" cy="38" r="1.7" className="fill-accent-hot stroke-bg-elevated" strokeWidth="0.4" />
          <rect x="49" y="40.5" width="22" height="5" rx="2.5" className="fill-bg-elevated stroke-accent-hot/50" strokeWidth="0.35" />
          <text
            x="60" y="44.1"
            textAnchor="middle"
            className="fill-accent-hot font-display font-bold"
            fontSize="2.6"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeLinejoin="round"
          >
            מטרה · מזוהה ✓
          </text>
        </g>

        {/* (9) Escape arrow — from tracked target, crossing the envelope, into
            the dead zone. The dashed curve visualizes "the moment custody is lost". */}
        <defs>
          <marker id="escape-head" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
            <polygon points="0 0, 4 2, 0 4" className="fill-fg-dim" />
          </marker>
        </defs>
        <path
          d="M 55 41 Q 38 50 25 56"
          fill="none"
          className="stroke-fg-dim"
          strokeWidth="0.45"
          strokeDasharray="1.2 1"
          strokeLinecap="round"
          markerEnd="url(#escape-head)"
        />

        {/* (10) Lost target — inside dead zone. Ghosted (low opacity) gray dot
            with strike-through label "אבד". Same target, different state. */}
        <g opacity="0.55">
          <circle cx="23" cy="67" r="1.7" fill="none" className="stroke-fg-dim" strokeWidth="0.5" strokeDasharray="0.8 0.5" />
          <rect x="13" y="69" width="20" height="5" rx="2.5" className="fill-bg-elevated stroke-fg-dim" strokeWidth="0.35" strokeDasharray="0.8 0.5" />
          <text
            x="23" y="72.6"
            textAnchor="middle"
            className="fill-fg-dim font-display font-bold"
            fontSize="2.6"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeLinejoin="round"
          >
            אותה מטרה · אבד ✗
          </text>
        </g>
      </svg>

      {/* Top-corner legend — explains the two regions */}
      <div className="absolute top-2 start-2 flex flex-col gap-1 text-[10px]">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-bg-elevated/85 backdrop-blur border border-brand/30">
          <span className="size-1.5 rounded-full bg-brand-dark" />
          <span className="text-fg-muted">כיסוי רציף</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-bg-elevated/85 backdrop-blur border border-status-danger/30">
          <span className="size-1.5 rounded-full bg-status-danger" />
          <span className="text-fg-muted">שטח מת</span>
        </span>
      </div>

      <div className="absolute top-3 end-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        3 סנסורים · כיסוי מצטבר
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