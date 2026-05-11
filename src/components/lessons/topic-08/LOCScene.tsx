'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
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
  { id: 'none',       label: 'אין שיבוש',          icon: 'check',     desc: 'MSR פתוח, ASR בכוננות. שגרת אספקה רגילה.',                              msrEffect: 'open',    color: 'text-status-ok' },
  { id: 'ambush',     label: 'מארב כבד',           icon: 'crosshair', desc: 'מארב אויב בנקודת חנק. אפשר לפרוץ, אבל באובדן כלים וזמן יקר.',          msrEffect: 'partial', color: 'text-status-warn' },
  { id: 'flood',      label: 'הצפה / מכשול טבעי', icon: 'wave',      desc: 'גשר נשטף, ערוץ נחל הוצף. ה-MSR פיזית לא שמיש עד פעולה הנדסית.',      msrEffect: 'closed',  color: 'text-accent-cool' },
  { id: 'demolition', label: 'פיצוץ הנדסי',         icon: 'bolt',      desc: 'גשר ראשי פוצץ ע"י האויב. ה-MSR קרוס לחלוטין. ASR — האופציה היחידה.', msrEffect: 'closed',  color: 'text-status-danger' },
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
    label: 'MSR · ציר ראשי',
    english: 'Main Supply Route',
    thickness: 'כביש מהיר 4 נתיבים',
    capacity: '1,200 כלי רכב / יום',
    speed: '80 קמ"ש',
    vulnerability: 'מטרת איסוף עליונה לאויב. נקודת תורפה אחת = שיתוק.',
    use: 'זרימת המסה הקריטית: דלק, תחמושת, פינוי פצועים.',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/40',
  },
  {
    id: 'asr',
    label: 'ASR · ציר חלופי',
    english: 'Alternate Supply Route',
    thickness: 'כביש משני / שביל קשיח',
    capacity: '~400 כלי רכב / יום',
    speed: '40 קמ"ש',
    vulnerability: 'מסלול ארוך יותר, פחות מודיעין אויב. סיכון מארב נמוך יותר.',
    use: 'הפעלה רק כש-MSR לא שמיש. ממופה ומתורגל מראש.',
    color: 'text-accent-cool',
    bg: 'bg-accent-cool/10',
    border: 'border-accent-cool/40',
  },
];

export function LOCScene() {
  const [disruption, setDisruption] = useState<Disruption>('none');
  const meta = DISRUPTIONS.find((d) => d.id === disruption)!;

  return (
    <section id="scene-loc" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="08.1"
        eyebrow="קווי אספקה · MSR + ASR"
        title={
          <>
            <span className="gradient-text">ציר אחד</span> זה הימור.
            <br />
            שני צירים זה תוכנית.
          </>
        }
        intro="ה-MSR הוא הצינור הראשי שדרכו זורמת המלחמה. אבל בדיוק בגלל זה — כל מאמץ האויב מתמקד בו. בוא נראה למה תכנון מבצעי תקין דורש ASR מוכן מראש."
      />

      <div className="surface-elevated p-5 mb-6 border-r-4 border-r-accent-cool">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">עיקרון הקווים הכפולים:</strong>{' '}
            כל סד"כ צבאי רציני מתכנן <strong>שני קווי אספקה</strong> לפחות. MSR (Main) הוא הצינור המלא בשגרה. ASR (Alternate) הוא תוכנית מגירה — ממופה, מוכשר, ומתורגל לפני שצריך אותו.
            <strong className="text-fg block mt-1.5">החוק:</strong> אם ה-MSR נופל ואתה רק אז מחפש ASR — מאוחר מדי.
          </div>
        </div>
      </div>

      {/* Map visualization */}
      <div className="surface-elevated p-4 rounded-2xl mb-6 overflow-hidden">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-[10px] font-mono text-fg-dim tracking-widest uppercase">
            מפת גזרה · בסיס לחזית
          </div>
          <div className={cn('chip', meta.color, 'border-current/40')}>
            <Icon name={meta.icon} size={12} strokeWidth={2.5} />
            <span className="font-mono">{meta.label}</span>
          </div>
        </div>

        <LOCMap disruption={disruption} />

        <p className="text-sm text-fg-muted leading-relaxed mt-3">{meta.desc}</p>
      </div>

      {/* Disruption selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-12">
        {DISRUPTIONS.map((d) => {
          const isActive = disruption === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setDisruption(d.id)}
              className={cn(
                'surface p-3 text-right transition-all rounded-xl flex items-center gap-2',
                isActive ? 'border-accent shadow-glow bg-accent/5' : 'hover:border-border-strong'
              )}
            >
              <div className={cn(
                'size-9 rounded-lg flex items-center justify-center border-2 shrink-0',
                isActive ? 'border-accent/40 bg-accent/15' : 'border-border bg-bg-accent'
              )}>
                <Icon name={d.icon} size={16} className={isActive ? d.color : 'text-fg-dim'} />
              </div>
              <div>
                <div className={cn('font-display font-bold text-sm leading-tight', isActive && d.color)}>
                  {d.label}
                </div>
                <div className="text-[10px] font-mono text-fg-dim">
                  {d.msrEffect === 'open' ? 'MSR פתוח' : d.msrEffect === 'partial' ? 'MSR חלקי' : 'MSR סגור'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <SoftDivider text="MSR מול ASR · השוואה ישירה" />

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
              <div className={cn('size-12 rounded-xl flex items-center justify-center border-2 shrink-0', r.border, r.bg)}>
                <Icon name={r.id === 'msr' ? 'truck' : 'compass'} size={22} className={r.color} />
              </div>
              <div>
                <div className={cn('font-display font-bold text-lg leading-tight', r.color)}>{r.label}</div>
                <div className="text-[10px] font-mono text-fg-dim">{r.english}</div>
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
      <div className="surface-elevated p-6 rounded-2xl border-r-4 border-r-accent">
        <div className="flex gap-4 items-start">
          <div className="size-12 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center shrink-0">
            <Icon name="spark" size={22} className="text-accent" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-mono text-accent mb-1 tracking-widest uppercase">
              כלל אצבע למתכנן
            </div>
            <h3 className="font-display font-bold text-lg mb-2 leading-tight">
              MSR לזרימה. ASR להישרדות.
            </h3>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty">
              <strong className="text-fg">MSR</strong> מתוכנן לכמות. אם הכל פתוח — האספקה זורמת מהר ובהיקפים גדולים.{' '}
              <strong className="text-fg">ASR</strong> מתוכנן לרציפות. הוא לא יעיל, הוא לא מהיר — אבל הוא קיים כשה-MSR לא קיים.
              <br /><br />
              <strong className="text-fg">המבחן האמיתי:</strong> כשיורה ראשון נופל על MSR — האם ה-ASR מוכן לרוץ תוך שעתיים? תרגלת? מיפית? לא?
              אז אין לך באמת ASR. יש לך רק תקווה.
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

  // MSR path: base (10,55) → curve → front (90,30)
  // ASR path: base (10,55) → upper detour → front (90,30)

  return (
    <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
      <svg viewBox="0 0 100 56" className="w-full h-full">
        <defs>
          <linearGradient id="loc-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3f5f9" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="56" fill="url(#loc-ground)" />

        {/* Terrain hints */}
        <path d="M0 42 L25 38 L45 41 L60 36 L80 40 L100 38 L100 56 L0 56 Z" className="fill-terrain-sand/20" />
        {/* River (potential ASR cross point) */}
        <path d="M0 12 Q 35 14 55 18 T 100 22" fill="none" className="stroke-terrain-sky/60" strokeWidth="1.4" />

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
          ASR {asrActive && '· פעיל'}
        </text>

        {/* Disruption marker on MSR */}
        {disruption === 'ambush' && (
          <g>
            <circle cx="60" cy="39" r="3" className="fill-status-warn/30 stroke-status-warn" strokeWidth="0.5">
              <animate attributeName="r" values="2;5;2" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx="60" cy="39" r="1.5" className="fill-status-warn" />
            <text x="60" y="34" textAnchor="middle" className="fill-status-warn font-mono font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">מארב</text>
          </g>
        )}
        {(disruption === 'flood' || disruption === 'demolition') && (
          <g>
            <g transform="translate(60 39)">
              <circle r="3.5" className="fill-status-danger/20 stroke-status-danger" strokeWidth="0.6" />
              <line x1="-1.8" y1="-1.8" x2="1.8" y2="1.8" className="stroke-status-danger" strokeWidth="0.7" strokeLinecap="round" />
              <line x1="-1.8" y1="1.8" x2="1.8" y2="-1.8" className="stroke-status-danger" strokeWidth="0.7" strokeLinecap="round" />
            </g>
            <text x="60" y="32" textAnchor="middle" className="fill-status-danger font-mono font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
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
          <text x="13.5" y="40" textAnchor="middle" className="fill-accent-cool font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">בסיס עורף</text>
        </g>

        {/* Front unit marker */}
        <g>
          <circle cx="88" cy="30" r="2.4" className="fill-accent-hot" />
          <circle cx="88" cy="30" r="3.8" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
            <animate attributeName="r" values="3;6;3" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <text x="88" y="26" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">סדק לוחם</text>
        </g>
      </svg>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-mono text-fg-dim mb-0.5 tracking-widest uppercase">{label}</dt>
      <dd className="text-fg leading-relaxed">{value}</dd>
    </div>
  );
}

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-xs font-mono text-fg-dim tracking-widest uppercase">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
