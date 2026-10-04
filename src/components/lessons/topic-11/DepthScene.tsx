'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { DepthCrossSection, DepthScale, ZONE_BREAKS, depthToFrac } from './DepthVisuals';
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

/* Visual scale for the comparison bars, the slider and the cross-section:
   one log scale (DepthVisuals.depthToFrac). Linear scale crushes Israel
   (14 km) to invisible width next to the USA (4500 km). Log-scale
   keeps all 5 countries visible AND reflects how perception of "more
   depth" diminishes (each doubling matters less than the previous). */
const depthToPct = (km: number) => depthToFrac(km) * 100;

type Doctrine = 'offensive' | 'layered' | 'flexible' | 'absorptive';
const DOCTRINE_ORDER: Doctrine[] = ['offensive', 'layered', 'flexible', 'absorptive'];

export function DepthScene() {
  const [depth, setDepth] = useState(80);
  // The example country the learner picked (preset button or ruler row).
  // Clicking it again clears it; dragging the slider clears it too.
  const [pinned, setPinned] = useState<string | null>('lebanon');
  // Bumped once per settled selection and by the replay control → the
  // attack demo in the cross-section plays once per bump.
  const [run, setRun] = useState(0);
  const reduce = !!useReducedMotion();

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = window.setTimeout(() => setRun((r) => r + 1), 450);
    return () => window.clearTimeout(id);
  }, [depth]);

  const pickCountry = (c: CountryExample) => {
    if (pinned === c.id) {
      setPinned(null);
      return;
    }
    setPinned(c.id);
    setDepth(c.depth);
  };

  // Calculations
  const enemySpeed = 30; // km/day for ground advance
  const daysToCapital = Math.max(0.5, depth / enemySpeed);
  const formatTime = (days: number) =>
    daysToCapital < 1 ? `${Math.round(days * 24)} שעות` : `${Math.round(days)} ימים`;
  const doctrine: Doctrine =
    depth < ZONE_BREAKS[0] ? 'offensive' : depth < ZONE_BREAKS[1] ? 'layered' : depth < ZONE_BREAKS[2] ? 'flexible' : 'absorptive';

  const doctrineMeta = {
    offensive: {
      label: 'מתקפת מנע (התקפה מקדימה)',
      desc: 'כשאין עומק - אין לאן לסגת. הצבא חייב ליזום, לתקוף ראשון ולהעביר את הלחימה מיד לשטח האויב לפני שהאיום יגיע לאזרחים.'
    },
    layered: {
      label: 'הגנה בשכבות (מרובדת)',
      desc: 'יש מספיק שטח כדי לבנות מספר קווי הגנה זה אחר זה. האסטרטגיה נשענת על מכשולים בטבע (הרים, וואדיות) כדי לעכב את האויב, אבל אי אפשר לסגת לאחור לנצח.'
    },
    flexible: {
      label: 'הגנה גמישה והשהייה',
      desc: 'השטח הגדול מאפשר לצבא לסגת לאחור בצורה מסודרת תוך כדי לחימה. אפשר להקים קווי הגנה חדשים, להתיש את האויב ולמשוך זמן יקר — למשל, עד שיגיע סיוע או נשק ממדינות בחו"ל.'
    },
    absorptive: {
      label: 'ספיגה והתשה (נסיגה אסטרטגית)',
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
    <span className="text-brand-dark">עומק אסטרטגי</span> הוא הזמן שמדינה קונה לעצמה
  </>
}
        intro={`כל קילומטר של מרחק בין קו החזית לבין מרכזי האוכלוסייה הוא למעשה עוד שעה של זמן חסד לקבלת החלטות. בואו נשחק עם המרחק ונראה איך אותה מתקפת אויב נראית כשיש למדינה רק 14 ק"מ של עומק, לעומת 4,000 ק"מ.`}
      />

      <div className="grid md:grid-cols-2 gap-4 mb-12 items-stretch">
        <div className="surface-elevated p-6">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wide text-brand-dark mb-2">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            ההגדרה
          </div>
          <h3 className="font-display font-bold text-xl leading-tight mb-3 text-fg">
            עומק אסטרטגי = המרחק בין החזית ללב המדינה
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            המרחק הפיזי בין אזור הלחימה (החזית) לבין לב המדינה — המקום שבו נמצאים האזרחים, מפעלי התעשייה ומוסדות השלטון. הוא הגורם שקובע את חופש הפעולה של הצבא ושל מקבלי ההחלטות מאחור.
          </p>
        </div>
        <div className="surface-elevated p-6">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wide text-brand-dark mb-2">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            למה זה קובע הכל
          </div>
          <h3 className="font-display font-bold text-xl leading-tight mb-3 text-fg">
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
        <div className="surface-elevated p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
              מבט חתך: מהגבול ועד ללב המדינה
            </div>
            <div className="flex items-center gap-2">
              <div className="chip text-[13px] border-brand/40 bg-brand/10 text-brand-dark">
                <Icon name="shield" size={12} strokeWidth={2.5} />
                <span className="font-display font-medium tracking-wide">{dm.label}</span>
              </div>
              <button
                type="button"
                onClick={() => setRun((r) => r + 1)}
                aria-label="הפעלה חוזרת של ההדגמה"
                className="motion-reduce:hidden size-8 shrink-0 rounded-xl border border-border bg-bg-elevated text-fg-muted hover:text-fg hover:border-brand/30 hover:bg-brand/[0.03] transition-colors inline-flex items-center justify-center"
              >
                <Icon name="refresh" size={15} />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex">
            <DepthCrossSection
              depth={depth}
              days={daysToCapital}
              zone={DOCTRINE_ORDER.indexOf(doctrine)}
              zoneTitles={DOCTRINE_ORDER.map((d) => doctrineMeta[d].label)}
              showAlert={doctrine === 'offensive'}
              formatTime={formatTime}
              run={run}
              ariaLabel="מבט חתך: מהגבול ועד ללב המדינה"
              labels={{
                enemy: 'שטח אויב',
                border: 'גבול',
                heart: 'לב המדינה',
                attack: 'התקפה',
                alert: '⚠ סכנה קיומית מיידית!',
                depth: `עומק · ${depth.toLocaleString('en-US')} ק"מ`,
              }}
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="surface p-2 rounded-xl text-center">
              <div className="text-[13px] font-display font-medium tracking-wide text-fg-dim">עומק</div>
              <div className="font-display font-bold text-lg text-fg tabular-nums">{depth.toLocaleString('en-US')} ק"מ</div>
            </div>
            <div className="surface p-2 rounded-xl text-center">
              <div className="text-[13px] font-display font-medium tracking-wide text-fg-dim">זמן עד הגעה לבירה</div>
              <div className="font-display font-bold text-lg tabular-nums text-fg">
                {formatTime(daysToCapital)}
              </div>
            </div>
            <div className="surface p-2 rounded-xl text-center">
              <div className="text-[13px] font-display font-medium tracking-wide text-fg-dim">בדומה למדינה:</div>
              <div className="font-display font-bold text-sm text-fg">{closestCountry.name}</div>
            </div>
          </div>
        </div>

        {/* Controls + doctrine */}
        <div className="space-y-3">
          <div className="surface-elevated p-5">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-3">
              עומק אסטרטגי
            </div>
            <div className="font-display font-bold text-3xl tabular-nums text-fg mb-3">
              {depth.toLocaleString('en-US')}<span className="text-sm text-fg-muted ms-1">ק"מ</span>
            </div>
            <DepthScale
              value={depth}
              onChange={(km) => {
                setPinned(null);
                setDepth(km);
              }}
              ariaLabel="עומק"
              valueText={`${depth.toLocaleString('en-US')} ק"מ`}
              ticks={[
                { km: 10, text: '10' },
                { km: 500, text: '500' },
                { km: 2000, text: '2,000' },
                { km: 4500, text: '4,500' },
              ]}
              marks={COUNTRIES.map((c) => ({ km: c.depth, active: pinned === c.id }))}
            />

            {/* Preset country buttons — click again to clear the pick */}
            <div className="grid grid-cols-5 gap-1.5 mt-3">
              {COUNTRIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickCountry(c)}
                  aria-pressed={pinned === c.id}
                  className={cn(
                    'px-1.5 py-1.5 rounded-xl text-[13px] font-display font-medium tracking-wide border transition-colors text-center',
                    pinned === c.id
                      ? 'border-accent bg-accent/10 text-fg'
                      : 'border-border hover:border-border-strong text-fg-muted'
                  )}
                >
                  {c.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={doctrine}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="surface p-4 border-2 border-brand/40 bg-brand/5"
            >
              <div className="text-sm font-display font-semibold mb-1 tracking-wider text-brand-dark">
                שיטת הלחימה הנדרשת
              </div>
              <div className="font-display font-bold text-lg leading-tight mb-1 text-fg">
                {dm.label}
              </div>
              <p className="text-sm text-fg-muted leading-relaxed">{dm.desc}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <SoftDivider text="חמש דוגמאות לעומק אסטרטגי בעולם" />

      {/* Quick log-scale ruler — lets the eye compare all 5 at once
          before reading the individual cards. */}
      <div className="surface-elevated p-5 mb-4">
        <div className="text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider">
          קנה מידה השוואתי · ק"מ מהגבול ללב המדינה (סולם לוגריתמי — כל הכפלה היא צעד אחד)
        </div>
        {/* Each row picks its country (syncs the slider + cross-section above);
            clicking the picked row again clears it. The bars share the slider's
            log scale and run left→right like it — a scale is never mirrored.
            The orange hairline is the slider's current depth. */}
        <div className="space-y-1">
          {COUNTRIES.map((c) => {
            const isPicked = pinned === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => pickCountry(c)}
                aria-pressed={isPicked}
                className={cn(
                  'w-full grid grid-cols-[100px_1fr_72px] items-center gap-3 text-sm text-start rounded-xl px-2 py-1.5 transition-colors',
                  isPicked ? 'bg-accent/10' : 'hover:bg-brand/[0.05]'
                )}
              >
                <span className="font-display font-bold text-fg shrink-0">{c.name}</span>
                <span dir="ltr" className="relative block h-2 bg-bg-accent rounded-full">
                  <span
                    className={cn('absolute inset-y-0 start-0 rounded-full transition-colors', isPicked ? 'bg-accent' : 'bg-brand/70')}
                    style={{ width: `${depthToPct(c.depth)}%` }}
                  />
                  <span
                    aria-hidden
                    className="absolute -inset-y-1 w-0.5 -ms-px rounded-full bg-accent"
                    style={{ insetInlineStart: `${depthToPct(depth)}%` }}
                  />
                </span>
                <span className="font-display font-bold tabular-nums text-fg text-end">
                  {c.depth.toLocaleString()} ק"מ
                </span>
              </button>
            );
          })}
          {/* Scale markers */}
          <div className="grid grid-cols-[100px_1fr_72px] gap-3 px-2 text-[13px] font-display font-medium tracking-wide text-fg-dim pt-1">
            <span />
            <div dir="ltr" className="relative h-4">
              {[10, 100, 1000, 4500].map((k) => (
                <span
                  key={k}
                  className="absolute top-0 flex w-0 justify-center tabular-nums"
                  style={{ insetInlineStart: `${depthToPct(k)}%` }}
                >
                  <span className="whitespace-nowrap">{k.toLocaleString()}</span>
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
            className={cn('surface-elevated p-5 sm:p-6 transition-shadow', pinned === c.id && 'ring-2 ring-accent')}
          >
            {/* Header: name + region + the two big numbers */}
            <div className="grid sm:grid-cols-[1fr_auto] gap-4 mb-4 pb-4 border-b border-border-subtle">
              <div>
                <h4 className="font-display font-bold text-xl leading-tight text-fg">{c.name}</h4>
                <div className="text-[13px] font-display font-medium tracking-wide text-fg-dim mt-1">
                  {c.region}
                </div>
              </div>
              <div className="sm:text-end">
                <div className="font-display font-bold text-3xl tabular-nums text-fg leading-none">
                  {c.depth.toLocaleString()}<span className="text-base text-fg-muted ms-1">ק"מ</span>
                </div>
                <div className="text-[13px] text-fg-muted mt-1">{c.timeLabel}</div>
              </div>
            </div>

            {/* Reference scale anchor — makes the number feel real */}
            <div className="text-sm text-fg-muted leading-relaxed mb-4 text-pretty">
              <strong className="text-fg">בקנה מידה: </strong>{c.reference}
            </div>

            {/* The instructional pair: allows / prevents */}
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl border border-brand/30 bg-brand/5 p-3">
                <div className="text-[13px] font-display font-semibold tracking-[0.2em] uppercase text-brand-dark mb-1.5">
                  מה זה מאפשר
                </div>
                <p className="text-sm text-fg leading-relaxed text-pretty">{c.allows}</p>
              </div>
              <div className="rounded-xl border border-status-danger/30 bg-status-danger/5 p-3">
                <div className="text-[13px] font-display font-semibold tracking-[0.2em] uppercase text-status-danger mb-1.5">
                  מה זה לא מאפשר
                </div>
                <p className="text-sm text-fg leading-relaxed text-pretty">{c.prevents}</p>
              </div>
            </div>

            {/* Doctrine + historical case */}
            <div className="rounded-xl bg-bg-accent/40 p-3">
              <div className="text-[13px] font-display font-semibold tracking-[0.2em] uppercase text-brand-dark mb-1">
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

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-sm font-display font-semibold text-fg-muted tracking-wider">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}