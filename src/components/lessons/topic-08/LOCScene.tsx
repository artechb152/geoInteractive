'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { InsightCard } from '@/components/lesson/InsightCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Disruption = 'none' | 'ambush' | 'flood' | 'demolition';

type DisruptionMeta = {
  id: Disruption;
  label: string;
  icon: IconName;
  desc: string;
  msrEffect: 'open' | 'partial' | 'closed';
  color: string;
};

const DISRUPTIONS: DisruptionMeta[] = [
  { id: 'none', label: 'הכל פתוח (אין שיבוש)', icon: 'check', desc: 'הציר הראשי (MSR) פתוח והציר החלופי (ASR) בכוננות. אספקה זורמת לחזית כרגיל.', msrEffect: 'open', color: 'text-status-ok' },
  { id: 'ambush', label: 'מארב אויב', icon: 'crosshair', desc: 'האויב מציב מארב בנקודה בעייתית לאורך הציר. אפשר לנסות לפרוץ דרכו, אבל זה יעלה באובדן חיי אדם, הרס ציוד ועיכובים קריטיים.', msrEffect: 'partial', color: 'text-status-warn' },
  { id: 'flood', label: 'מכשול טבעי (למשל הצפה)', icon: 'wave', desc: 'שיטפון שהרס גשר או חסם נחל. הציר הראשי פשוט לא עביר פיזית עד שכלים הנדסיים יבואו לתקן אותו.', msrEffect: 'closed', color: 'text-accent-cool' },
  { id: 'demolition', label: 'פיצוץ יזום של האויב', icon: 'bolt', desc: 'האויב פוצץ בכוונה גשר מרכזי. הציר הראשי מושבת לחלוטין. הציר החלופי (ASR) נשאר "גלגל ההצלה" היחיד שלנו.', msrEffect: 'closed', color: 'text-status-danger' },
];

type RouteData = {
  id: 'msr' | 'asr';
  label: string;
  english: string;
  thickness: string;
  capacity: string;
  speed: string;
  vulnerability: string;
  use: string;
  color: string;
  bg: string;
  border: string;
};

const ROUTES: RouteData[] = [
  {
    id: 'msr',
    label: 'MSR · הציר הראשי',
    english: 'Main Supply Route',
    thickness: 'כמו כביש מהיר עם 4 נתיבים',
    capacity: 'כ-1,200 רכבים ביום',
    speed: '80 קמ"ש',
    vulnerability: 'מטרה מספר אחת של האויב. חסימה אחת קטנה, וכל המערכת משתתקת.',
    use: 'העברת הרוב המוחלט של הציוד - דלק, תחמושת, ופינוי מהיר של פצועים.',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/40',
  },
  {
    id: 'asr',
    label: 'ASR · הציר החלופי',
    english: 'Alternate Supply Route',
    thickness: 'כביש עפר משני או שביל צר',
    capacity: 'רק כ-400 רכבים ביום',
    speed: '40 קמ"ש',
    vulnerability: 'המסלול אמנם ארוך ואיטי יותר, אבל הוא מושך פחות אש ותשומת לב מצד האויב.',
    use: 'משמש כ"גלגל הצלה" רק כשהציר הראשי חסום. חייב להיות מתוכנן מראש.',
    color: 'text-accent-cool',
    bg: 'bg-accent-cool/10',
    border: 'border-accent-cool/40',
  },
];

export function LOCScene() {
  const [disruption, setDisruption] = useState<Disruption>('none');
  const [expandedId, setExpandedId] = useState<Disruption | null>('none');

  const handleClick = (id: Disruption) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setDisruption(id);
      setExpandedId(id);
    }
  };

  return (
    <section id="scene-loc" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="08.1"
        eyebrow="קווי אספקה: כשהתוכנית משתבשת"
title = {
  <>
    <span className="text-accent-hover">ציר אחד שנחסם</span> יכול לעצור מערכה שלמה
  </>
}        intro="הציר הראשי (MSR) הוא העורק המרכזי של הלחימה. בדיוק בגלל זה, האויב יעשה הכל כדי לחתוך אותו. בואו נראה למה תכנון נכון מחייב שתמיד יהיה לנו ציר חלופי (ASR) שמוכן לפעולה."
      />

      <InsightCard tone="cool" icon="spark" label="עיקרון הגיבוי (הקווים הכפולים)">
        כל צבא רציני מתכנן מראש <strong>לפחות שני קווי אספקה</strong>. ה-MSR הוא ערוץ העבודה הרגיל והמהיר שלנו. ה-ASR הוא תוכנית המגירה – מסלול שסיירנו בו, הכנו אותו ותרגלנו נסיעה בו הרבה לפני שהיינו צריכים אותו.
        <strong className="text-fg block mt-1.5">כלל ברזל:</strong> אם הציר הראשי נחסם ורק אז התחלת לחפש ציר חלופי – כבר איחרת את המועד.
      </InsightCard>

      {/* Disruption picker (left) + live map (right) — same pattern as
          the OnboardingScene of every lesson: 2fr/3fr split, vertical
          expandable cards on the start side, the diagram on the end. */}
      <div className="grid md:grid-cols-[2fr_3fr] gap-6 mb-12">
        <div className="space-y-3">
          {DISRUPTIONS.map((d) => {
            const active = disruption === d.id;
            const expanded = expandedId === d.id;
            return (
              <div
                key={d.id}
                className={cn(
                  'surface overflow-hidden transition-all duration-300 ease-snap',
                  active
                    ? 'border-brand/45 bg-bg-elevated'
                    : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                )}
              >
                <button
                  type="button"
                  onClick={() => handleClick(d.id)}
                  aria-expanded={expanded}
                  aria-controls={`t8-loc-panel-${d.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t8-loc-bar"
                      className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
                    />
                  )}
                  <span
                    className={cn(
                      'size-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                      active
                        ? 'bg-brand-dark text-bg-elevated border-brand-dark'
                        : 'bg-bg-accent text-fg-muted border-border',
                    )}
                  >
                    <Icon name={d.icon} size={16} strokeWidth={2.5} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold leading-tight text-fg">
                      {d.label}
                    </div>
                    <div className="text-[10px] font-display font-medium tracking-wide text-fg-dim mt-0.5">
                      {d.msrEffect === 'open'
                        ? 'MSR פתוח'
                        : d.msrEffect === 'partial'
                          ? 'MSR מסוכן / איטי'
                          : 'MSR חסום'}
                    </div>
                  </div>
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn(
                      'shrink-0 inline-flex',
                      expanded ? 'text-brand-dark' : 'text-fg-dim',
                    )}
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
                      key={`t8-loc-panel-${d.id}`}
                      id={`t8-loc-panel-${d.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-brand/20">
                        <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-brand-dark mt-3 mb-2.5">
                          <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                          מה קורה במצב הזה
                        </div>
                        <p className="text-sm leading-relaxed text-fg-muted text-pretty">
                          {d.desc}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="surface-elevated bg-bg-accent/30 relative overflow-hidden min-h-[280px]">
          <LOCMap disruption={disruption} />
        </div>
      </div>

      <SoftDivider text="ראש בראש: הציר הראשי מול הציר החלופי" />

      {/* MSR vs ASR comparison */}
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        {ROUTES.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            className={cn('surface-elevated p-5 rounded-2xl border-r-4', r.bg, r.border.replace('border-', 'border-r-'))}
          >
            <div className="flex items-center gap-3 mb-3">
              <Icon name={r.id === 'msr' ? 'truck' : 'compass'} size={32} className={cn(r.color, 'shrink-0')} />
              <div>
                <div className={cn('font-display font-bold text-lg leading-tight', r.color)}>{r.label}</div>
                <div className="text-[10px] font-display font-medium tracking-wide text-fg-dim">{r.english}</div>
              </div>
            </div>

            <dl className="space-y-2.5 text-sm">
              <Row label="תשתית" value={r.thickness} />
              <Row label="קיבולת" value={r.capacity} />
              <Row label="מהירות שיוט" value={r.speed} />
              <Row label="פגיעות" value={r.vulnerability} />
              <Row label="שימוש" value={r.use} />
            </dl>
          </motion.div>
        ))}
      </div>

      {/* Key insight callout */}
      <div className="">
        <div className="flex gap-4 items-start">
          <Icon name="spark" size={32} className="text-accent shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">
              השורה התחתונה
            </div>
            <h3 className="font-display font-bold text-lg leading-tight mb-2">
              הציר הראשי נועד למהירות, הציר החלופי נועד להישרדות.
            </h3>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty">
              <strong className="text-fg">ציר ה-MSR</strong> מתוכנן להעביר כמויות. כשהוא פתוח, הציוד זורם לחזית בכמויות אדירות ובמהירות. לעומת זאת, <strong className="text-fg">ציר ה-ASR</strong> מתוכנן לשמר רציפות תפעולית – אספקה, תנועה והגנה על הכוח. הוא פחות נוח, איטי יותר ומעביר פחות ציוד, אבל הוא שם כשהציר הראשי נחסם.
              <br /><br />
              <strong className="text-fg">המבחן האמיתי בשטח:</strong> כשהטיל הראשון פוגע בציר הראשי, האם הציר החלופי שלנו יכול להיכנס לפעולה תוך שעתיים? אם לא מיפינו ותרגלנו נסיעה בו מראש – אין לנו באמת ציר חלופי, יש לנו רק תפילות.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LOCMap({ disruption }: { disruption: Disruption }) {
  const msrBlocked = disruption === 'flood' || disruption === 'demolition';
  const msrPartial = disruption === 'ambush';
  const asrActive = disruption !== 'none';

  return (
    <div className="relative w-full h-full min-h-[220px] rounded-xl overflow-hidden">
      <svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
        {/* Subtle map-paper grid — matches other diagrams (ContoursScene
            ShapeMap, KillChainScene CoverageCellViz) so all maps in the
            course read as one family. */}
        {Array.from({ length: 11 }).map((_, i) => (
          <g key={`v-${i}`}>
            <line x1={i * 10} y1="0" x2={i * 10} y2="56" className="stroke-border-subtle/30" strokeWidth="0.1" />
          </g>
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`h-${i}`} x1="0" y1={i * 8} x2="100" y2={i * 8} className="stroke-border-subtle/30" strokeWidth="0.1" />
        ))}

        {/* Terrain hints */}
        <path d="M0 42 L25 38 L45 41 L60 36 L80 40 L100 38 L100 56 L0 56 Z" className="fill-terrain-sand/25" />
        {/* River (potential ASR cross point) */}
        <path d="M0 12 Q 35 14 55 18 T 100 22" fill="none" className="stroke-terrain-sky/55" strokeWidth="1.4" />

        {/* Front line zone */}
        <rect x="82" y="0" width="18" height="56" className="fill-status-danger/8" />
        <line x1="82" y1="0" x2="82" y2="56" className="stroke-status-danger" strokeWidth="0.3" strokeDasharray="1 0.8" />
        <text x="91" y="6" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round">חזית</text>

        {/* MSR — primary route */}
        <motion.path
          d="M14 45 Q 30 42 50 40 Q 70 38 88 32"
          fill="none"
          className={msrBlocked ? 'stroke-status-danger' : msrPartial ? 'stroke-status-warn' : 'stroke-accent'}
          strokeWidth="2"
          strokeDasharray={msrBlocked ? '2 1.5' : undefined}
          opacity={msrBlocked ? 0.5 : 1}
          animate={{ strokeWidth: msrBlocked ? 1.5 : 2 }}
        />
        <text
          x="38"
          y="48"
          textAnchor="middle"
          className={cn('font-display font-bold', msrBlocked ? 'fill-status-danger' : msrPartial ? 'fill-status-warn' : 'fill-accent')}
          fontSize="3"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="1"
          strokeLinejoin="round"
        >
          MSR
        </text>

        {/* ASR — alternate route (upper, dashed normally) */}
        <motion.path
          d="M14 45 Q 25 30 45 22 Q 65 16 88 28"
          fill="none"
          className={asrActive ? 'stroke-status-ok' : 'stroke-accent-cool/50'}
          strokeWidth={asrActive ? 1.8 : 1}
          strokeDasharray={asrActive ? undefined : '2 1.2'}
          animate={{ strokeWidth: asrActive ? 1.8 : 1 }}
        />
        <text
          x="48"
          y="13"
          textAnchor="middle"
          className={cn('font-display font-bold', asrActive ? 'fill-status-ok' : 'fill-accent-cool')}
          fontSize="2.8"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="1"
          strokeLinejoin="round"
        >
          ASR {asrActive && '· מופעל כעת'}
        </text>

        {/* Disruption marker on MSR */}
        {disruption === 'ambush' && (
          <g>
            <circle cx="60" cy="39" r="3" className="fill-status-warn/30 stroke-status-warn" strokeWidth="0.5">
              <animate attributeName="r" values="2;5;2" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx="60" cy="39" r="1.5" className="fill-status-warn" />
            <text x="60" y="34" textAnchor="middle" className="fill-status-warn font-display font-bold font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">מארב</text>
          </g>
        )}
        {(disruption === 'flood' || disruption === 'demolition') && (
          <g>
            <g transform="translate(60 39)">
              <circle r="3.5" className="fill-status-danger/20 stroke-status-danger" strokeWidth="0.6" />
              <line x1="-1.8" y1="-1.8" x2="1.8" y2="1.8" className="stroke-status-danger" strokeWidth="0.7" strokeLinecap="round" />
              <line x1="-1.8" y1="1.8" x2="1.8" y2="-1.8" className="stroke-status-danger" strokeWidth="0.7" strokeLinecap="round" />
            </g>
            <text x="60" y="32" textAnchor="middle" className="fill-status-danger font-display font-bold font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
              {disruption === 'flood' ? 'הצפה' : 'פיצוץ גשר'}
            </text>
          </g>
        )}

        {/* Supply flow animation along active route */}
        {!msrBlocked && (
          <motion.circle
            r="1.1"
            className={msrPartial ? 'fill-status-warn' : 'fill-accent'}
            animate={{ offsetDistance: ['0%', '100%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            style={{
              offsetPath: 'path("M14 45 Q 30 42 50 40 Q 70 38 88 32")',
            }}
          />
        )}
        {asrActive && (
          <motion.circle
            r="1.1"
            className="fill-status-ok"
            animate={{ offsetDistance: ['0%', '100%'] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
            style={{
              offsetPath: 'path("M14 45 Q 25 30 45 22 Q 65 16 88 28")',
            }}
          />
        )}

        {/* Base marker */}
        <g>
          <rect x="9" y="42" width="9" height="9" rx="1" className="fill-accent-cool" />
          <rect x="11" y="44" width="2.2" height="3" className="fill-bg" />
          <rect x="14" y="44" width="2.2" height="3" className="fill-bg" />
          <text x="13.5" y="40" textAnchor="middle" className="fill-accent-cool font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">בסיס האם</text>
        </g>

        {/* Front unit marker */}
        <g>
          <circle cx="88" cy="30" r="2.4" className="fill-accent-hot" />
          <circle cx="88" cy="30" r="3.8" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
            <animate attributeName="r" values="3;6;3" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <text x="88" y="26" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">הכוח הלוחם</text>
        </g>
      </svg>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-display font-semibold text-fg-muted mb-0.5 tracking-wider">{label}</dt>
      <dd className="text-fg leading-relaxed">{value}</dd>
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