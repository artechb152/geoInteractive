'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

type CountryExample = {
  id: string;
  name: string;
  region: string;
  depth: number;          // km
  timeLabel: string;      // human-readable "≈ X hours/days/months to capital"
  reference: string;      // concrete real-world scale-anchor
  doctrine: string;       // forced strategy
  allows: string;         // what this depth lets you do
  prevents: string;       // what this depth makes impossible
  historical: string;     // one historical case in plain language
};

/* Each country card now answers FIVE concrete questions instead of
   one abstract sentence:
   (1) how many km,
   (2) how much TIME does that buy at a standard 30 km/day advance,
   (3) a familiar real-world scale anchor (so the learner can FEEL it),
   (4) what the depth allows / prevents (operational consequences),
   (5) a historical case that makes (3)+(4) concrete. */
const COUNTRIES: CountryExample[] = [
  {
    id: 'israel',
    name: 'ישראל',
    region: 'אזור הצר במרכז',
    depth: 14,
    timeLabel: '≈ 11 שעות עד לב המדינה',
    reference: 'מרחק נסיעה של 12 דקות במכונית. צבא חיל-רגלים יחצה את כל המדינה בנסיעה אחת.',
    doctrine: 'מתקפה מקדימה (Preemptive)',
    allows: 'לתקוף ראשונים — לקפוץ בבוקר על שדות התעופה של האויב לפני שיתקוף.',
    prevents: 'לוותר אפילו על עיר אחת. אין מרחב נסיגה — כל שטח שאובד הוא קצה הקו.',
    historical: 'מלחמת ששת הימים (1967): ישראל זיהתה הצטברות צבא מצרי בסיני וירדה ראשונה על שדות התעופה ב-5 ביוני. הסיבה: עוד 24 שעות שיהוי = מצרים תוקפת ראשונה.',
  },
  {
    id: 'lebanon',
    name: 'לבנון',
    region: 'מהגבול הדרומי לבירות',
    depth: 80,
    timeLabel: '≈ 3 ימים מהגבול לבירות',
    reference: 'מרחק נסיעה של כשעה. כמו מתל אביב לחיפה — והגעת לבירה של מדינה.',
    doctrine: 'הגנה מבוססת שטח (טופוגרפיה כמגן)',
    allows: 'להישען על הרי לבנון כקווי הגנה טבעיים — להשהות אויב מתקדם, לסחוט אבדות, לקנות שעות.',
    prevents: 'לסגת לעומק — אין לאן. כל יום של נסיגה = 20-30 ק"מ קרובים יותר לבירות.',
    historical: 'מלחמת לבנון השנייה (2006): רקטות חיזבאללה מהדרום הגיעו לחיפה — 60 ק"מ דרומה מהגבול. צה"ל התקדם בעמקים בהדרגה, אבל ב-34 ימים לא הגיע אפילו לליטני.',
  },
  {
    id: 'ukraine',
    name: 'אוקראינה',
    region: 'מהגבול הרוסי לקייב',
    depth: 600,
    timeLabel: '≈ 3 שבועות (אם אין התנגדות)',
    reference: 'מרחק מתל אביב ללוקסור (מצרים). חצי הדרך מלונדון לרומא.',
    doctrine: 'הגנה גמישה + נסיגה מבוקרת',
    allows: 'לאבד ערים שלמות (חרסון, מאריאופול) ועדיין להמשיך להילחם. זמן לארגן סיוע מ-50 מדינות, להעביר תעשייה מערבה, לאמן חיילים חדשים.',
    prevents: 'נסיגה אינסופית — בסוף קייב היא הקו האדום. אם נופלת — המדינה נופלת.',
    historical: 'מלחמת רוסיה-אוקראינה (2022 ואילך): רוסיה תפסה ~20% משטח אוקראינה אך לא הצליחה להגיע לקייב. העומק נתן לאוקראינה שנתיים של זמן — והכריע את מאזן הסיוע המערבי.',
  },
  {
    id: 'russia',
    name: 'רוסיה',
    region: 'מהגבול המערבי למוסקבה',
    depth: 4000,
    timeLabel: '≈ 4 חודשים+ (תיאורטית)',
    reference: 'יותר מרוחב יבשת אירופה כולה. שאיפה אבסולוטית — אין מי שיכול לכבוש את כולה.',
    doctrine: 'התשה (לבלוע את האויב פנימה)',
    allows: 'לאבד עיר אחר עיר — מינסק, סמולנסק, ואפילו פאתי מוסקבה — ועדיין יש 2,500 ק"מ של מרחב מאחור.',
    prevents: 'כיבוש מלא — לא קרה אף פעם בהיסטוריה. השטח עצמו הוא הצבא.',
    historical: 'נפוליאון (1812): כבש את מוסקבה — ונסוג כי קווי האספקה התארכו 2,000 ק"מ. היטלר (1941): הגיע 20 ק"מ ממוסקבה — קרס מאותה סיבה. החורף קטל, אבל המרחק קיבע את הגזר דין.',
  },
  {
    id: 'usa',
    name: 'ארה"ב',
    region: 'מכל גבול ימי לוושינגטון',
    depth: 4500,
    timeLabel: 'לא רלוונטי — אוקיינוס חוצץ',
    reference: 'אוקיינוס שלם בין כל אויב פוטנציאלי לגבול היבשתי. גרסת על של עומק.',
    doctrine: 'הגנה מעבר לים (Forward Defense)',
    allows: 'לנהל מלחמה 20 שנה רחוק מבית בלי שאזרח בקליפורניה ירגיש סכנה פיזית. שקט נפשי מוחלט בעורף.',
    prevents: 'פלישה קרקעית — לא קיימת כאיום ריאלי כבר יותר מ-200 שנה (מאז 1812).',
    historical: 'וייטנאם (1965-1973), עיראק (2003-2011), אפגניסטן (2001-2021): כל המלחמות האלה נוהלו 10,000 ק"מ מבית. אזרחי ארה"ב חוו מלחמה רק במסכים — והפסידו כשדעת הקהל קרסה, לא כשהאויב התקרב.',
  },
];

/* Visual scale for the comparison bars. Linear scale crushes Israel
   (14 km) to invisible width next to the USA (4500 km). Log-scale
   keeps all 5 countries visible AND reflects how perception of "more
   depth" diminishes (each doubling matters less than the previous). */
const MAX_DEPTH = 4500;
const MIN_DEPTH = 10;
const logMin = Math.log10(MIN_DEPTH);
const logMax = Math.log10(MAX_DEPTH);
function depthToPct(km: number): number {
  return ((Math.log10(km) - logMin) / (logMax - logMin)) * 100;
}

export function DepthScene() {
  const [depth, setDepth] = useState(80);

  // Calculations
  const enemySpeed = 30; // km/day for ground advance
  const daysToCapital = Math.max(0.5, depth / enemySpeed);
  const doctrine: 'offensive' | 'layered' | 'flexible' | 'absorptive' =
    depth < 30 ? 'offensive' : depth < 200 ? 'layered' : depth < 1000 ? 'flexible' : 'absorptive';
  
  const doctrineMeta = {
    offensive: { 
      label: 'מתקפת מנע (התקפה מקדימה)', 
      color: 'text-status-danger', 
      bg: 'bg-status-danger/10', 
      desc: 'כשאין עומק - אין לאן לסגת. הצבא חייב ליזום, לתקוף ראשון ולהעביר את הלחימה מיד לשטח האויב לפני שהאיום יגיע לאזרחים.' 
    },
    layered: { 
      label: 'הגנה בשכבות (מרובדת)', 
      color: 'text-status-warn', 
      bg: 'bg-status-warn/10', 
      desc: 'יש מספיק שטח כדי לבנות מספר קווי הגנה זה אחר זה. האסטרטגיה נשענת על מכשולים בטבע (הרים, וואדיות) כדי לעכב את האויב, אבל אי אפשר לסגת לאחור לנצח.' 
    },
    flexible: { 
      label: 'הגנה גמישה והשהייה', 
      color: 'text-accent', 
      bg: 'bg-accent/10', 
      desc: 'השטח הגדול מאפשר לצבא לסגת לאחור בצורה מסודרת תוך כדי לחימה. אפשר להקים קווי הגנה חדשים, להתיש את האויב ולמשוך זמן יקר — למשל, עד שיגיע סיוע או נשק ממדינות בחו"ל.' 
    },
    absorptive: { 
      label: 'ספיגה והתשה (נסיגה אסטרטגית)', 
      color: 'text-status-ok', 
      bg: 'bg-status-ok/10', 
      desc: 'עומק עצום שמאפשר פשוט "לבלוע" את צבא האויב פנימה. ככל שהאויב מתקדם לעומק השטח, קווי האספקה שלו מתארכים ונהיים פגיעים, עד שהוא קורס מעייפות ומחסור בציוד.' 
    },
  };
  
  const dm = doctrineMeta[doctrine];

  // Find closest country example
  const closestCountry = COUNTRIES.reduce((prev, curr) =>
    Math.abs(curr.depth - depth) < Math.abs(prev.depth - depth) ? curr : prev
  );

  return (
    <section id="scene-depth" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="11.1"
        eyebrow="עומק אסטרטגי"
title = {
  <>
    <span className="text-accent-hover">עומק אסטרטגי</span> הוא הזמן שמדינה קונה לעצמה
  </>
}
        intro={`כל קילומטר של מרחק בין קו החזית לבין מרכזי האוכלוסייה הוא למעשה עוד שעה של זמן חסד לקבלת החלטות. בואו נשחק עם המרחק ונראה איך אותה מתקפת אויב נראית כשיש למדינה רק 14 ק"מ של עומק, לעומת 4,000 ק"מ.`}
      />

      <div className="grid md:grid-cols-2 gap-4 mb-12 items-stretch">
        <div className="surface-elevated p-6 rounded-2xl">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wide text-accent mb-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            ההגדרה
          </div>
          <h3 className="font-display font-bold text-xl leading-tight mb-3 text-accent-hover">
            עומק אסטרטגי = המרחק בין החזית ללב המדינה
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            המרחק הפיזי בין אזור הלחימה (החזית) לבין לב המדינה — המקום שבו נמצאים האזרחים, מפעלי התעשייה ומוסדות השלטון. הוא הגורם שקובע את חופש הפעולה של הצבא ושל מקבלי ההחלטות מאחור.
          </p>
        </div>
        <div className="surface-elevated p-6 rounded-2xl">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wide text-accent mb-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            למה זה קובע הכל
          </div>
          <h3 className="font-display font-bold text-xl leading-tight mb-3 text-accent-hover">
            העומק קובע 3 דברים קריטיים
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            <strong className="text-fg">זמן תגובה</strong> — כמה זמן יש למנהיגים לפני שהאויב מגיע לבירה. <strong className="text-fg">מרחב נסיגה</strong> — כמה שטח אפשר "להקריב" כדי להתארגן מחדש. <strong className="text-fg">שיטת לחימה</strong> — איזו אסטרטגיה צבאית בכלל אפשרית: התקפית, הגנתית או השהייה.
          </p>
        </div>
      </div>

      {/* Main interactive */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch mb-12">
        {/* Visualization */}
        <div className="surface-elevated p-4 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
              מבט חתך: מהגבול ועד ללב המדינה
            </div>
            <div className={cn('chip', dm.bg, dm.color, 'border-current/40')}>
              <Icon name="shield" size={12} strokeWidth={2.5} />
              <span className="font-display font-medium tracking-wide">{dm.label}</span>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex">
            <DepthVisualization depth={depth} doctrine={doctrine} />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="surface p-2 rounded-lg text-center">
              <div className="text-[11px] font-display font-medium tracking-wide text-fg-dim">עומק</div>
              <div className="font-display font-bold text-lg text-accent tabular-nums">{depth} ק"מ</div>
            </div>
            <div className="surface p-2 rounded-lg text-center">
              <div className="text-[11px] font-display font-medium tracking-wide text-fg-dim">זמן עד הגעה לבירה</div>
              <div className={cn('font-display font-bold text-lg tabular-nums', daysToCapital < 1 ? 'text-status-danger' : daysToCapital < 5 ? 'text-status-warn' : 'text-status-ok')}>
                {daysToCapital < 1 ? `${Math.round(daysToCapital * 24)} שעות` : `${Math.round(daysToCapital)} ימים`}
              </div>
            </div>
            <div className="surface p-2 rounded-lg text-center">
              <div className="text-[11px] font-display font-medium tracking-wide text-fg-dim">בדומה למדינה:</div>
              <div className="font-display font-bold text-sm text-fg">{closestCountry.name}</div>
            </div>
          </div>
        </div>

        {/* Controls + doctrine */}
        <div className="space-y-3">
          <div className="surface-elevated p-5 rounded-2xl">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-3">
              עומק אסטרטגי
            </div>
            <div className="font-display font-bold text-3xl tabular-nums text-accent mb-3">
              {depth}<span className="text-sm text-fg-muted ms-1">ק"מ</span>
            </div>
            <input
              type="range"
              min={10}
              max={4500}
              step={10}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full accent-accent"
              aria-label="עומק"
            />
            <div className="flex justify-between text-[11px] font-display font-medium tracking-wide text-fg-dim mt-1">
              <span>10</span>
              <span>500</span>
              <span>2,000</span>
              <span>4,500</span>
            </div>

            {/* Preset country buttons */}
            <div className="grid grid-cols-5 gap-1 mt-3">
              {COUNTRIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setDepth(c.depth)}
                  className={cn(
                    'px-1.5 py-1 rounded-md text-[11px] font-display font-medium tracking-wide border transition-colors text-center',
                    Math.abs(depth - c.depth) < 5
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border hover:border-border-strong text-fg-muted'
                  )}
                >
                  {c.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={doctrine}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className={cn('surface p-4 rounded-xl border-2', dm.bg)}
              style={{ borderColor: 'currentColor' }}
            >
              <div className={cn('text-sm font-display font-semibold mb-1 tracking-wider', dm.color)}>
                שיטת הלחימה הנדרשת
              </div>
              <div className={cn('font-display font-bold text-lg leading-tight mb-1', dm.color)}>
                {dm.label}
              </div>
              <p className="text-xs text-fg-muted leading-relaxed">{dm.desc}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <SoftDivider text="חמש דוגמאות לעומק אסטרטגי בעולם" />

      {/* Quick log-scale ruler — lets the eye compare all 5 at once
          before reading the individual cards. */}
      <div className="surface-elevated p-5 rounded-2xl mb-4">
        <div className="text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider">
          קנה מידה השוואתי · ק"מ מהגבול ללב המדינה (סולם לוגריתמי — כל הכפלה היא צעד אחד)
        </div>
        <div className="space-y-2">
          {COUNTRIES.map((c) => (
            <div key={c.id} className="grid grid-cols-[100px_1fr_60px] items-center gap-3 text-sm">
              <span className="font-display font-bold text-fg shrink-0">{c.name}</span>
              <div className="relative h-2 bg-bg-accent rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 right-0 bg-accent rounded-full"
                  style={{ width: `${depthToPct(c.depth)}%` }}
                />
              </div>
              <span className="font-display font-bold tabular-nums text-accent text-right">
                {c.depth.toLocaleString()} ק"מ
              </span>
            </div>
          ))}
          {/* Scale markers */}
          <div className="grid grid-cols-[100px_1fr_60px] gap-3 text-[10px] font-display font-medium tracking-wide text-fg-dim pt-1">
            <span />
            <div className="relative h-3">
              {[10, 100, 1000, 4500].map((k) => (
                <span
                  key={k}
                  className="absolute"
                  style={{ right: `${depthToPct(k)}%`, transform: 'translateX(50%)' }}
                >
                  {k.toLocaleString()}
                </span>
              ))}
            </div>
            <span />
          </div>
        </div>
      </div>

      {/* Per-country profile cards */}
      <div className="space-y-3">
        {COUNTRIES.map((c, i) => (
          <motion.article
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.06 }}
            className="surface-elevated p-5 sm:p-6 rounded-2xl"
          >
            {/* Header: name + region + the two big numbers */}
            <div className="grid sm:grid-cols-[1fr_auto] gap-4 mb-4 pb-4 border-b border-border-subtle">
              <div>
                <h4 className="font-display font-bold text-xl leading-tight text-fg">{c.name}</h4>
                <div className="text-[11px] font-display font-medium tracking-wide text-fg-dim mt-1">
                  {c.region}
                </div>
              </div>
              <div className="sm:text-left">
                <div className="font-display font-bold text-3xl tabular-nums text-accent-hover leading-none">
                  {c.depth.toLocaleString()}<span className="text-base text-fg-muted ms-1">ק"מ</span>
                </div>
                <div className="text-xs text-fg-muted mt-1">{c.timeLabel}</div>
              </div>
            </div>

            {/* Reference scale anchor — makes the number feel real */}
            <div className="text-sm text-fg-muted leading-relaxed mb-4 text-pretty">
              <strong className="text-fg">בקנה מידה: </strong>{c.reference}
            </div>

            {/* The instructional pair: allows / prevents */}
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <div className="rounded-lg border border-status-ok/30 bg-status-ok/5 p-3">
                <div className="text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-status-ok mb-1.5">
                  מה זה מאפשר
                </div>
                <p className="text-sm text-fg leading-relaxed text-pretty">{c.allows}</p>
              </div>
              <div className="rounded-lg border border-status-danger/30 bg-status-danger/5 p-3">
                <div className="text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-status-danger mb-1.5">
                  מה זה לא מאפשר
                </div>
                <p className="text-sm text-fg leading-relaxed text-pretty">{c.prevents}</p>
              </div>
            </div>

            {/* Doctrine + historical case */}
            <div className="rounded-lg bg-bg-accent/40 p-3">
              <div className="text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent-hover mb-1">
                דוקטרינה כפויה · {c.doctrine}
              </div>
              <p className="text-sm text-fg leading-relaxed text-pretty">{c.historical}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function DepthVisualization({
  depth,
  doctrine,
}: {
  depth: number;
  doctrine: 'offensive' | 'layered' | 'flexible' | 'absorptive';
}) {
  // Scale depth (10-4500 km) to visual width (10-90 viewBox units)
  const visualDepth = Math.max(8, Math.min(90, 8 + (Math.log10(depth) - 1) * 25));
  const borderX = 10;
  const capitalX = borderX + visualDepth;
  const enemyProgress = 0.15; // enemy has advanced 15% into depth

  return (
    <div className="relative w-full h-full min-h-[240px] rounded-xl overflow-hidden bg-bg-accent">
      <svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
        <rect x="0" y="0" width="100" height="56" className="fill-bg-accent" />

        {/* Enemy territory (left of border) */}
        <rect x="0" y="0" width={borderX} height="56" className="fill-status-danger/10" />
        <text x={borderX / 2} y="9" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
          שטח אויב
        </text>

        {/* Own territory (from border to capital + beyond) */}
        <rect x={borderX} y="0" width={Math.max(visualDepth, 90 - borderX)} height="56" className="fill-terrain-ridge/15" />

        {/* Border line */}
        <line x1={borderX} y1="0" x2={borderX} y2="56" className="stroke-accent-hot" strokeWidth="0.6" />
        <text x={borderX} y="14" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.95" strokeLinejoin="round">
          גבול
        </text>

        {/* Depth bar / ruler */}
        <line x1={borderX} y1="40" x2={borderX + visualDepth} y2="40" className="stroke-accent" strokeWidth="0.5" strokeDasharray="2 1" />
        <text x={borderX + visualDepth / 2} y="37" textAnchor="middle" className="fill-accent font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
          עומק · {depth.toLocaleString()} ק"מ
        </text>

        {/* Capital marker (heartland) */}
        <g>
          <circle cx={capitalX} cy="28" r="2.5" className="fill-accent" />
          <circle cx={capitalX} cy="28" r="4" fill="none" className="stroke-accent/50" strokeWidth="0.3">
            <animate attributeName="r" values="3;6;3" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <text x={capitalX} y="22" textAnchor="middle" className="fill-accent font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.95" strokeLinejoin="round">
            לב המדינה
          </text>
        </g>

        {/* Population centers / cities along the depth */}
        {visualDepth > 20 && (
          <g>
            {[0.3, 0.6, 0.85].map((p, i) => (
              <g key={i}>
                <rect x={borderX + visualDepth * p - 1} y="27" width="2" height="2" className="fill-fg/50" />
              </g>
            ))}
          </g>
        )}

        {/* Enemy advance arrow */}
        <motion.g
          animate={{ x: [0, visualDepth * enemyProgress, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <line x1={borderX} y1="46" x2={borderX + 6} y2="46" className="stroke-status-danger" strokeWidth="0.5" />
          <polygon points={`${borderX + 6},45 ${borderX + 8},46 ${borderX + 6},47`} className="fill-status-danger" />
        </motion.g>
        <text x={borderX + 4} y="50" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="2.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.75" strokeLinejoin="round">
          התקפה
        </text>

        {/* Time-to-capital indicator on right */}
        {doctrine === 'offensive' && (
          <text x="50" y="9" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
            ⚠ סכנה קיומית מיידית!
          </text>
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