'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { BufferMap, LAYER_RANGE_KM, WidthGauge, type BufferLayer } from './BufferVisuals';
import { Icon, type IconName } from '@/components/Icon';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

type Layer = BufferLayer;

type LayerData = {
  id: Layer;
  label: string;
  english: string;
  icon: IconName;
  capability: string;
  cost: string;
  replaces: string;
};

const LAYERS: LayerData[] = [
  {
    id: 'physical',
    label: 'רצועה מפורזת',
    english: 'Physical Buffer',
    icon: 'mountain',
    capability:
      'שטח פיזי ריק ברוחב קילומטרים ספורים. הכניסה לכוחות צבא אסורה, ולעיתים קרובות אין בו גם אזרחים.',
    cost: 'תשלום במטבע של קרקע: דורש מהמדינה לוותר על שטח ריבוני.',
    replaces:
      'זהו בסיס ההגנה המסורתי. עצם קיום המרחק הוא מה שמעכב את האויב ומונע חיכוך סתמי.',
  },
  {
    id: 'fence',
    label: 'גדר חכמה',
    english: 'Smart Fence',
    icon: 'shield',
    capability:
      'מכשול פיזי משולב בטכנולוגיה — מזהה ניסיונות טיפוס, חיתוך רשת או תנועה קרובה. מתריע מיד בזמן אמת.',
    cost: 'כ-1 עד 3 מיליון דולר לכל קילומטר, פלוס עלויות תחזוקה גבוהות מאוד.',
    replaces:
      'מחליפה את הצורך בחייל שעומד פיזית על הקו. עם זאת, היא מתריעה רק כשנוגעים בה — כלומר לא מספקת עומק התרעתי.',
  },
  {
    id: 'sensors',
    label: 'חיישנים סייסמיים',
    english: 'Seismic Sensors',
    icon: 'wave',
    capability:
      'חיישנים הקבורים באדמה (או פרוסים סביבה) שמזהים תנודות ורעידות. יודעים להבחין בין אדם הולך, רכב נוסע או חפירת מנהרה.',
    cost: '200,000$ עד מיליון דולר לקילומטר. מחייב חיבור למערכת שליטה ובקרה (חמ"ל) מתקדמת.',
    replaces:
      'מחליפה סיורי שטח (פטרולים). מספקת "עיניים ואוזניים" שקופות על הקרקע בכיסוי של 24/7.',
  },
  {
    id: 'radar',
    label: 'רדאר ותצפית',
    english: 'Radar / Observation',
    icon: 'eye',
    capability:
      '"לראות מעבר לגבעה". מכ"מים שחודרים עננים, בלוני תצפית ומצלמות חום, שסורקים למרחק של עשרות קילומטרים לתוך שטח האויב.',
    cost: '5 עד 50 מיליון דולר למערכת תצפית בודדת, בהתאם לטווח ולרזולוציה.',
    replaces:
      'זו ההחלפה האמיתית של עומק אסטרטגי. מאפשרת למדינה קטנה לזהות תנועות אויב הרבה לפני שהוא בכלל מתקרב לגבול שלה.',
  },
];

const BUFFER_EXAMPLES = [
  {
    name: 'האזור המפורז הקוריאני (DMZ)',
    english: 'Korean DMZ · 1953',
    width: '~4 ק"מ',
    widthKm: 4,
    length: '~250 ק"מ',
    desc: 'הרצועה הצבאית המתוחה בעולם שעדיין פעילה. מלאה ב-2 מיליון מוקשים, מצלמות, ואלפי חיילים החמושים עד השיניים משני צידי המתרס.',
    success: 'הרתעה קפואה אך יציבה — למרות המתח האדיר, מ-1953 לא פרצה שם מלחמה כוללת.',
    icon: 'shield' as IconName,
  },
  {
    name: 'כוח אונדו"ף (UNDOF) ברמת הגולן',
    english: 'UN Disengagement Observer Force · 1974',
    width: '~10 ק"מ',
    widthKm: 10,
    length: '~80 ק"מ',
    desc: 'רצועת שטח שחוצצת בין צה"ל לצבא סוריה מאז מלחמת יום הכיפורים (1974). אסור להכניס אליה נשק כבד, והיא מפוקחת על ידי חיילי או"ם.',
    success: 'הצליחה לשמור על גבול שקט כמעט לחלוטין במשך 40 שנה, עד שפרצה מלחמת האזרחים בסוריה ב-2011.',
    icon: 'flag' as IconName,
  },
  {
    name: '"הקו הירוק" בקפריסין',
    english: 'Green Line · 1974',
    width: '~7 ק"מ ברוחב המקסימלי',
    widthKm: 7,
    length: '~180 ק"מ',
    desc: 'שטח הפרדה שחוצה את האי קפריסין (ואת הבירה ניקוסיה) לשניים, ומפריד בין הקפריסאים היוונים לטורקים כדי למנוע מלחמת אזרחים.',
    success: 'מנע בהצלחה הידרדרות אלימה, אך הנציח סטטוס-קוו בעייתי שמונע פתרון פוליטי כבר מעל ל-50 שנה.',
    icon: 'compass' as IconName,
  },
];

export function BufferScene() {
  const [activeLayers, setActiveLayers] = useState<Set<Layer>>(new Set(['physical']));

  // Accordion value (multi-open) is the SAME as the active layers — opening
  // a panel turns the layer on in the viz, closing turns it off. One click,
  // one mental model: each accordion IS its layer.
  const accordionValue = Array.from(activeLayers);
  const handleAccordionChange = (vals: string[]) => {
    setActiveLayers(new Set(vals as Layer[]));
  };

  // Outermost footprint of the active collection layers (radar 25 · sensors 8 · fence 1).
  const detectionRange = Math.max(0, ...Array.from(activeLayers, (l) => LAYER_RANGE_KM[l] ?? 0));

  // The intrusion demo plays once per layer change (and on the replay control).
  const [run, setRun] = useState(0);
  const layersKey = Array.from(activeLayers).sort().join(',');
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setRun((r) => r + 1);
  }, [layersKey]);
  const reactionTime = activeLayers.has('radar')
    ? '15+ דקות'
    : activeLayers.has('sensors')
      ? '5–10 דקות'
      : activeLayers.has('fence')
        ? '1–2 דקות'
        : 'מיידי בלבד';

  return (
    <section id="scene-buffer" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="11.2"
        eyebrow="אזורי חיץ וטכנולוגיה"
title = {
  <>
    כשאין עומק למדינה — <span className="text-brand-dark">הטכנולוגיה צריכה לקנות לה זמן</span>
  </>
}
        intro={`מדינה צרה לא יכולה להרשות לעצמה אזור הפרדה של 100 ק"מ. במקום זה, היא משתמשת במודיעין וסנסורים: גדרות חכמות, חיישני קרקע ומערכות רדאר. הטכנולוגיה מנסה לקנות את מה שהגיאוגרפיה לא נותנת — זמן התרעה. לחצו על שכבה ברשימה — היא תיפתח להסבר ותידלק בתצוגה.`}
      />

      <div className="grid md:grid-cols-2 gap-4 mb-12 items-stretch">
        <div className="surface-elevated p-6">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wide text-brand-dark mb-2">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            הגדרת היסוד
          </div>
          <h3 className="font-display font-bold text-xl leading-tight mb-3 text-fg">
            אזור חיץ — שטח שמרכך את המכה הראשונה
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            שטח "נקי" מצבא (מפורז) או דליל מאוד בכוחות, שמפריד בין שתי מדינות עוינות. המטרה שלו כפולה: <strong className="text-fg">למנוע חיכוך יומיומי</strong>, ו<strong className="text-fg">לקלוט את המכה הראשונה</strong> במקרה של פלישה כדי לתת התרעה מוקדמת.
          </p>
        </div>
        <div className="surface-elevated p-6">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wide text-brand-dark mb-2">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            כשאין שטח
          </div>
          <h3 className="font-display font-bold text-xl leading-tight mb-3 text-fg">
            אזור חיץ וירטואלי — טכנולוגיה במקום מרחק
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            צבאות מתקדמים פורסים "שכבות איסוף" (גדרות חכמות, מכ"מים, לוויינים) שיוצרות "אזור חיץ וירטואלי" ומספקות התרעה מרחוק, במקום להסתמך על מרחק פיזי שאין למדינה.
          </p>
        </div>
      </div>

      {/* Main 2-column block — accordions right (source first), viz left.
          Same layout family as topic-01 OnboardingScene. */}
      <div className="grid lg:grid-cols-[2fr_3fr] gap-6 mb-12">
        {/* Right (RTL): 4 accordion items, one per layer */}
        <Accordion
          type="multiple"
          value={accordionValue}
          onValueChange={handleAccordionChange}
          className="space-y-3"
        >
          {LAYERS.map((l, i) => {
            const isActive = activeLayers.has(l.id);
            return (
              <AccordionItem
                key={l.id}
                value={l.id}
                className={cn(
                  'transition-all duration-300 ease-snap',
                  isActive
                    ? 'border-brand/45 bg-bg-elevated'
                    : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                )}
              >
                <AccordionTrigger>
                  {isActive && (
                    <motion.span
                      layoutId="t11-buffer-bar"
                      className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-e-full"
                    />
                  )}
                  <span
                    className={cn(
                      'size-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                      isActive
                        ? 'bg-brand-dark text-bg-elevated border-brand-dark'
                        : 'bg-bg-accent text-fg-muted border-border',
                    )}
                  >
                    <span className="font-display text-sm font-bold">{i + 1}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold leading-tight transition-colors text-black text-base md:text-lg">
                      {l.label}
                    </div>
                    <div className="font-display font-medium tracking-wide text-[13px] text-fg-dim mt-0.5">
                      {l.english}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                    מה השכבה הזו עושה
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
                        יכולת
                      </div>
                      <p className="text-base leading-relaxed text-black">{l.capability}</p>
                    </div>
                    <div>
                      <div className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
                        עלות
                      </div>
                      <p className="text-base leading-relaxed text-black">{l.cost}</p>
                    </div>
                    <div>
                      <div className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
                        מה היא מחליפה
                      </div>
                      <p className="text-base leading-relaxed text-black">{l.replaces}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Left (RTL): cumulative buffer visualisation */}
        {/* Sticky so the map stays in view while the learner reads the open layers. */}
        <div className="surface-elevated p-4 overflow-hidden flex flex-col lg:sticky lg:top-24 self-start">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 text-sm font-display font-semibold text-brand-dark tracking-wider">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
              אזור חיץ עם שכבות טכנולוגיה
            </div>
            <div className="flex items-center gap-2">
              <div className="chip text-[13px] border-brand/40 bg-brand/10 text-brand-dark">
                <Icon name="eye" size={12} strokeWidth={2.5} />
                <span className="font-display font-medium tracking-wide tabular-nums">
                  זיהוי {detectionRange} ק"מ · התרעה {reactionTime}
                </span>
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

          <BufferMap
            active={activeLayers}
            range={detectionRange}
            warning={reactionTime}
            run={run}
            ariaLabel="אזור חיץ עם שכבות טכנולוגיה"
            labels={{
              enemy: 'שטח אויב',
              buffer: 'אזור חיץ מפורז',
              ours: 'שטחנו',
              fence: 'גדר חכמה',
              sensors: 'חיישנים סייסמיים',
              radar: 'רדאר',
              radarScan: '↤ סריקה לטווח 25 ק"מ עמוק לשטח האויב',
              noDefense: '⚠ אין הגנה',
              km: 'ק"מ',
            }}
          />
        </div>
      </div>

      <SoftDivider text="3 אזורי חיץ מהעולם שבאמת עובדים (בדרך כלל)" />

      {/* Examples */}
      <div className="grid lg:grid-cols-3 gap-3 mb-6">
        {BUFFER_EXAMPLES.map((e, i) => (
          <motion.div
            key={e.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.08 }}
            className="surface p-5"
          >
            <div className="mb-3">
              <div className="font-display font-bold leading-tight">{e.name}</div>
              <div className="text-[13px] font-display font-medium tracking-wide text-fg-dim">{e.english}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-[13px]">
              <div className="surface p-2 rounded-xl">
                <div className="text-[13px] font-display font-medium tracking-wide text-fg-dim">רוחב</div>
                <div className="font-display font-bold text-sm text-fg">{e.width}</div>
              </div>
              <div className="surface p-2 rounded-xl">
                <div className="text-[13px] font-display font-medium tracking-wide text-fg-dim">אורך</div>
                <div className="font-display font-bold text-sm text-fg">{e.length}</div>
              </div>
            </div>
            {/* Same 0–10 km tape on all three cards, so the widths compare at a glance */}
            <div className="mb-3">
              <WidthGauge km={e.widthKm} />
            </div>

            <p className="text-sm text-fg-muted leading-relaxed mb-3">{e.desc}</p>
            <div className="text-sm text-fg bg-bg-accent/40 rounded-xl p-3 leading-relaxed">
              <strong className="text-fg block mb-1 text-[13px] font-display font-semibold tracking-[0.2em] uppercase text-fg-muted">
                תוצאה
              </strong>
              {e.success}
            </div>
          </motion.div>
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
