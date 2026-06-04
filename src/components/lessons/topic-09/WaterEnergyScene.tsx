'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type EnergyType = 'oil' | 'gas' | 'solar' | 'hydrogen';
type EnergySource = {
  id: EnergyType;
  label: string;
  english: string;
  icon: IconName;
  geo: string;
  vulnerability: string;
  strategic: string;
  color: string;
  bg: string;
  border: string;
};

const ENERGY_SOURCES: EnergySource[] = [
  {
    id: 'oil',
    label: 'נפט גולמי',
    english: 'Crude Oil',
    icon: 'oil',
    geo: 'רובו מרוכז ב-5 מדינות בלבד (סעודיה, רוסיה, ארה"ב, עיראק ואיראן). משונע בעולם דרך צינורות ומכליות ענק (טנקרים).',
    vulnerability: 'תלות מסוכנת ב"נקודות חנק" – מיצרים צרים בים שקל מאוד לחסום (כמו מיצר באב אל-מנדב, שדרכו עובר 7% מהסחר העולמי).',
    strategic: 'הנשק הכלכלי הקלאסי. חרם הנפט הערבי ב-1973 הוכיח לעולם שמי ששולט במחיר הנפט, שולט בכלכלה העולמית כולה.',
    color: 'text-status-warn',
    bg: 'bg-status-warn/10',
    border: 'border-status-warn/40',
  },
  {
    id: 'gas',
    label: 'גז טבעי',
    english: 'Natural Gas',
    icon: 'fuel',
    geo: 'מועבר בעיקר דרך צינורות ענק יבשתיים. אפשר גם להעביר אותו כגז נוזלי (LNG) באוניות מטען, אבל זה תהליך יקר בהרבה.',
    vulnerability: 'צינור גז הוא מטרה קלה באורך מאות קילומטרים. כשצינור נורד סטרים פוצץ ב-2022, אירופה איבדה את מקור האנרגיה המרכזי שלה ביום אחד.',
    strategic: 'מייצר תלות גיאוגרפית עמוקה. רוסיה השתמשה בגז ככלי סחיטה נגד אירופה במשך שנים. כדי להשתחרר מזה, אירופה רצה כעת לעבור לייבוא גז נוזלי באוניות.',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/40',
  },
  {
    id: 'solar',
    label: 'אנרגיה סולארית',
    english: 'Solar / PV',
    icon: 'star',
    geo: 'אנרגיה מבוזרת (פזורה, לא נמצאת בידי מדינה אחת). כל שטח שטוף שמש הוא מועמד אידיאלי – ישראל, ספרד, מדבר סהרה או אוסטרליה.',
    vulnerability: 'התלות עברה לייצור הפאנלים עצמם (שוק שסין שולטת ב-80% ממנו). בנוסף, שדות סולאריים דורשים שטחי ענק שחשופים לפגיעה.',
    strategic: 'משחררת מדינות מהתלות בצינורות ומיצרים צרים בים. עם זאת, התלות פשוט עוברת למפעלים שמייצרים את הפאנלים מעבר לים.',
    color: 'text-status-ok',
    bg: 'bg-status-ok/10',
    border: 'border-status-ok/40',
  },
  {
    id: 'hydrogen',
    label: '"עמקי מימן"',
    english: 'Hydrogen Valleys',
    icon: 'bolt',
    geo: '"עמקי מימן" הם אזורי ענק שמתוכננים לייצור מימן בעתיד (כגון הנגב בישראל, אוסטרליה, צ\'ילה וסעודיה).',
    vulnerability: 'זוהי תשתית חדשה, אך היא צפויה להפוך למטרה אסטרטגיות רגישה בדיוק כמו בתי הזיקוק של היום. שינוע המימן ידרוש מכליות ים מיוחדות.',
    strategic: 'מסתמן כתחליף הנפט של העתיד. מדינות כמו ישראל יוכלו להפוך מצרכניות שתלויות באחרים ליצואניות של אנרגיה – מהפך מוחלט ביחסי הכוחות.',
    color: 'text-accent-cool',
    bg: 'bg-accent-cool/10',
    border: 'border-accent-cool/40',
  },
];

export function WaterEnergyScene() {
  const [damClosure, setDamClosure] = useState(20); // % closed (0=open, 100=closed)
  const [activeEnergy, setActiveEnergy] = useState<EnergyType>('oil');

  // Compute downstream effect
  const downstreamFlow = 100 - damClosure;
  const status: 'normal' | 'reduced' | 'critical' | 'crisis' =
    damClosure < 25 ? 'normal' : damClosure < 50 ? 'reduced' : damClosure < 80 ? 'critical' : 'crisis';
  const statusMeta = {
    normal: { label: 'זרימה רגילה', color: 'text-status-ok', bg: 'bg-status-ok/10', msg: 'אספקת מים תקינה במדינה התלויה.' },
    reduced: { label: 'זרימה מופחתת', color: 'text-status-warn', bg: 'bg-status-warn/10', msg: 'אזהרה: חקלאות נפגעת. מצוקת מים אזורית.' },
    critical: { label: 'מצוקה חמורה', color: 'text-accent-hot', bg: 'bg-accent-hot/10', msg: 'משבר אזורי. כלכלה ויציבות פוליטית בסכנה.' },
    crisis: { label: 'משבר קיומי', color: 'text-status-danger', bg: 'bg-status-danger/10', msg: 'מיליוני אנשים ללא מי שתייה. סכנת מלחמה.' },
  };
  const sm = statusMeta[status];
  const ePick = ENERGY_SOURCES.find((e) => e.id === activeEnergy)!;

  return (
    <section id="scene-waterenergy" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="09.1"
        eyebrow="הידרו-פוליטיקה ואנרגיה"
title = {
  <>
    <span className="text-accent-hover">מי ששולט במים</span> מחזיק את הברז של מדינות שלמות
  </>
}
        intro="במאה ה-20 מדינות יצאו למלחמות על נפט, אבל המאה ה-21 שייכת למים. היום, מי ששולט במקור המים שולט בגורלן של מדינות שלמות. במקביל, גם האנרגיה הפסיקה להיות רק מוצר שקונים ומוכרים, והפכה לנשק פוליטי וזירת עימות מרכזית."
      />

      {/* Hydro-politics primary block. Promoted from a tooltip-style
          callout to a two-column feature card so it reads as core
          content, not a footnote. Left: term + definition headline;
          right: a stat-hero case study (95% of Egypt's water from the
          Nile) with the cause-and-effect under it. */}
      <div className="surface-elevated p-6 sm:p-8 rounded-2xl mb-12 grid md:grid-cols-[1.2fr_1fr] gap-6 md:gap-8 items-start">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-brand-dark mb-2.5">
            <span className="size-1.5 rounded-full bg-brand-dark" aria-hidden />
            עיקרון מנחה
          </div>
          <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight mb-3 text-brand-dark">
            פוליטיקה של מים <span className="text-fg-muted font-medium text-base sm:text-lg">(הידרו-פוליטיקה)</span>
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            המאבק הפוליטי והצבאי על שליטה במשאבי מים. חוק האצבע פשוט: ככל שמדינה תלויה יותר במקור מים שמגיע ממדינה אחרת, כך אפשר לסחוט אותה יותר.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-bg p-5 sm:p-6">
          <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent-hover mb-3">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            המקרה הקלאסי · מצרים · אתיופיה
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <div className="font-display font-bold text-5xl sm:text-6xl tabular-nums text-accent-hover leading-none">
              95%
            </div>
            <div className="text-sm text-fg-muted leading-tight">
              ממימי <strong className="text-fg">מצרים</strong>
              <br />
              מגיעים מנהר הנילוס
            </div>
          </div>
          <p className="text-sm text-fg leading-relaxed text-pretty mt-4 pt-4 border-t border-border-subtle">
            ברגע שאתיופיה, שנמצאת בתחילת הנהר, מחליטה לבנות סכר בשטחה — עבור מצרים מדובר ב<strong className="text-fg">סכנה קיומית ודאית</strong>.
          </p>
        </div>
      </div>

      {/* Dam simulator */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch mb-12">
        <div className="surface-elevated p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
              סכר במעלה הנהר · השפעה על המורד
            </div>
            <div className={cn('chip', sm.bg, sm.color, 'border-current/40')}>
              <Icon name={status === 'normal' ? 'check' : 'spark'} size={12} strokeWidth={2.5} />
              <span className="font-display font-semibold tracking-wide">{sm.label}</span>
            </div>
          </div>

          <DamSimulator closure={damClosure} status={status} />

          <p className={cn('text-sm leading-relaxed mt-3', sm.color)}>{sm.msg}</p>
        </div>

        <div className="space-y-3">
          <div className="surface-elevated p-5 rounded-2xl">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-3">
              מידת סגירת הסכר
            </div>
            <div className="font-display font-bold text-3xl tabular-nums text-accent mb-3">
              {damClosure}<span className="text-sm text-fg-muted ms-1">%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={damClosure}
              onChange={(e) => setDamClosure(Number(e.target.value))}
              className="w-full accent-accent"
              aria-label="סגירת סכר"
            />
            <div className="flex justify-between text-[11px] font-display font-medium tracking-wide text-fg-dim mt-1.5">
              <span>פתוח</span>
              <span>חלקי</span>
              <span>סגור</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="surface p-2 rounded-lg text-center">
                <div className="text-[11px] font-display font-medium tracking-wide text-fg-dim">זרימה במורד</div>
                <div className="font-display font-bold text-lg text-accent tabular-nums">{downstreamFlow}%</div>
              </div>
              <div className="surface p-2 rounded-lg text-center">
                <div className="text-[11px] font-display font-medium tracking-wide text-fg-dim">מים במאגר</div>
                <div className="font-display font-bold text-lg text-accent-cool tabular-nums">{damClosure}%</div>
              </div>
            </div>
          </div>

          <div className="surface p-3 rounded-xl text-xs text-fg-muted bg-bg-accent/30 border border-border">
            <strong className="text-fg block mb-1">תרחיש לדוגמה:</strong>
            אם המדינה שאצלה הסכר סוגרת אותו ל-70% למשך חצי שנה, מיליוני אזרחים במדינה התלויה יישארו בלי מים נקיים לשתייה וחקלאות. בהיסטוריה, מצוקה כזו בדיוק היא עילה מרכזית לפרוץ מלחמות.
          </div>
        </div>
      </div>

      <SoftDivider text="מקורות אנרגיה · גיאוגרפיה ואסטרטגיה" />

      {/* Energy source selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {ENERGY_SOURCES.map((e) => {
          const isActive = activeEnergy === e.id;
          return (
            <button
              key={e.id}
              onClick={() => setActiveEnergy(e.id)}
              className={cn(
                'surface p-3 text-right transition-all rounded-xl flex items-center gap-2',
                isActive ? `${e.border} ${e.bg}` : 'hover:border-border-strong'
              )}
            >
              <Icon name={e.icon} size={28} className={cn(e.color, 'shrink-0')} />
              <div className="min-w-0">
                <div className={cn('font-display font-bold text-sm leading-tight', isActive && e.color)}>
                  {e.label}
                </div>
                <div className="text-[10px] font-mono text-fg-dim">{e.english}</div>
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={ePick.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className={cn('surface-elevated p-6 rounded-2xl border-r-4 mb-6', ePick.border.replace('border-', 'border-r-'))}
        >
          <div className="flex items-center gap-3 mb-4">
            <Icon name={ePick.icon} size={32} className={cn(ePick.color, 'shrink-0')} />
            <div>
              <div className={cn('font-display font-bold text-xl leading-tight', ePick.color)}>{ePick.label}</div>
              <div className="text-[10px] font-mono text-fg-dim mt-0.5">{ePick.english}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <div className={cn('text-sm font-display font-semibold mb-1.5 tracking-wider', ePick.color)}>פריסה גיאוגרפית</div>
              <p className="text-sm text-fg leading-relaxed">{ePick.geo}</p>
            </div>
            <div>
              <div className="text-sm font-display font-semibold text-fg-muted mb-1.5 tracking-wider">פגיעות מבצעית</div>
              <p className="text-sm text-fg-muted leading-relaxed">{ePick.vulnerability}</p>
            </div>
            <div>
              <div className="text-sm font-display font-semibold text-accent mb-1.5 tracking-wider">ערך אסטרטגי</div>
              <p className="text-sm text-fg leading-relaxed">{ePick.strategic}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="">
        <div className="flex gap-4 items-start">
          <Icon name="spark" size={32} className="text-accent shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-display font-semibold text-accent mb-1 tracking-wider">
              מריכוזיות לביזור · ממעמד של תלות לעצמאות אנרגטית
            </div>
            <h3 className="font-display font-bold text-lg leading-tight mb-2">
              מרכוז ← ביזור · מתלות לעצמאות אנרגטית
            </h3>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty">
              במאה ה-20, האנרגיה הייתה <strong className="text-fg">מרוכזת מבחינה גיאוגרפית</strong> (נפט במזרח התיכון, גז ברוסיה). הריכוזיות הזו יצרה תלות מוחלטת ופתח לסחיטה פוליטית.
              היום, העולם המערבי מנסה לעבור ל<strong className="text-fg">ביזור (פיזור מוקדים)</strong>: הקמת שדות סולאריים, פיתוח "עמקי מימן" עצמאיים ומתקני אגירת חשמל מקומיים.
              <strong className="text-fg block mt-1.5">המטרה:</strong> לייצר מצב שבו אף מדינה לא תוכל לשתק אותך באמצעות עצירת אספקה או פיצוץ של צינור בודד.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DamSimulator({ closure, status }: { closure: number; status: 'normal' | 'reduced' | 'critical' | 'crisis' }) {
  const reservoirHeight = 8 + (closure / 100) * 18;
  const downstreamOpacity = (100 - closure) / 100;
  return (
    <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
      <svg viewBox="0 0 100 56" className="w-full h-full">
        <defs>
          <linearGradient id="sky-dam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dde6f0" />
            <stop offset="100%" stopColor="#f0f4f9" />
          </linearGradient>
          <linearGradient id="reservoir" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--terrain-sky)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--accent-cool)" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="56" fill="url(#sky-dam)" />

        {/* Upstream country (mountainous) */}
        <path d="M0 36 L10 22 L18 28 L28 18 L38 26 L45 30 L45 56 L0 56 Z" className="fill-terrain-ridge/30 stroke-terrain-ridge/60" strokeWidth="0.3" />

        {/* Reservoir water (behind the dam) */}
        <rect
          x="38"
          y={42 - reservoirHeight}
          width="10"
          height={reservoirHeight}
          fill="url(#reservoir)"
        />
        {/* Water surface waves */}
        {[40, 43, 46].map((x, i) => (
          <path
            key={i}
            d={`M${x} ${43 - reservoirHeight + i * 0.3} q 0.6 -0.7 1.2 0 t 1.2 0`}
            fill="none"
            className="stroke-terrain-sky"
            strokeWidth="0.15"
            opacity="0.5"
          />
        ))}

        {/* Dam structure */}
        <rect x="47" y="20" width="3.5" height="22" rx="0.3" className="fill-terrain-ridge stroke-fg" strokeWidth="0.3" />
        {/* Dam gates */}
        <rect x="47.4" y="35" width="1.3" height="6" className="fill-fg/40" />
        <rect x="49" y="35" width="1.3" height="6" className="fill-fg/40" />
        <text
          x="48.8"
          y="16"
          textAnchor="middle"
          className="fill-terrain-ridge font-display font-bold"
          fontSize="3"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="0.95"
          strokeLinejoin="round"
        >
          סכר
        </text>

        {/* Closure indicator on the dam */}
        <rect x="47.4" y="35" width="2.9" height={6 * (closure / 100)} className="fill-status-danger/70" />

        {/* Downstream river (becomes thinner as dam closes) */}
        <motion.path
          d={`M50.5 ${42 - 1.5} Q 65 ${42 - 0.5} 80 ${42} Q 90 ${42 + 0.5} 100 ${42 + 0.5}`}
          fill="none"
          className={status === 'crisis' ? 'stroke-status-danger' : status === 'critical' ? 'stroke-accent-hot' : status === 'reduced' ? 'stroke-status-warn' : 'stroke-terrain-sky'}
          strokeWidth={Math.max(0.5, 3 * downstreamOpacity)}
          opacity={Math.max(0.3, downstreamOpacity)}
        />

        {/* Downstream country (lower, dependent) */}
        <path d="M55 56 L55 44 L65 44 L75 46 L85 45 L100 47 L100 56 Z" className="fill-terrain-sand/30 stroke-terrain-sand/60" strokeWidth="0.3" />

        {/* Cities / population markers downstream */}
        {[68, 78, 88].map((x, i) => {
          const isWilting = closure > 50;
          return (
            <g key={i}>
              <rect x={x - 1.4} y={42 + 2} width="2.8" height="3" rx="0.3" className={isWilting ? 'fill-status-warn/70' : 'fill-fg/50'} />
              <rect x={x - 1} y={42 + 2.4} width="0.6" height="1" className="fill-bg" />
              <rect x={x - 0.1} y={42 + 2.4} width="0.6" height="1" className="fill-bg" />
              <rect x={x + 0.5} y={42 + 2.4} width="0.6" height="1" className="fill-bg" />
            </g>
          );
        })}

        {/* Crops / fields (wilting as water decreases) */}
        {[60, 64, 72, 76, 82, 86, 92].map((x, i) => {
          const isWilting = closure > 30;
          return (
            <line
              key={i}
              x1={x}
              y1="49"
              x2={x + 0.3}
              y2={47 + (isWilting ? 1.5 : 0)}
              className={isWilting ? 'stroke-status-warn' : 'stroke-status-ok'}
              strokeWidth="0.5"
              opacity={isWilting ? 0.5 : 0.8}
            />
          );
        })}

        {/* Labels */}
        <text x="20" y="9" textAnchor="middle" className="fill-fg-dim font-display font-bold font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
          מדינת המעלה
        </text>
        <text x="80" y="9" textAnchor="middle" className="fill-fg-dim font-display font-bold font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
          מדינת המורד · תלויה
        </text>

        {/* Flow indicator (animated water droplets when flow exists) */}
        {downstreamOpacity > 0.2 && (
          <motion.circle
            r="0.7"
            className="fill-terrain-sky"
            animate={{ offsetDistance: ['0%', '100%'] }}
            transition={{ duration: 4 / Math.max(0.3, downstreamOpacity), repeat: Infinity, ease: 'linear' }}
            style={{
              offsetPath: 'path("M50.5 40.5 Q 65 41.5 80 42 Q 90 42.5 100 42.5")',
            }}
          />
        )}
      </svg>
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