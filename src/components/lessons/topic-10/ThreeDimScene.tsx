'use client';

import { useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { CombineDiagram, ThreatBadge, UrbanSection, type Dim, type SectionLabels } from './ThreeDimVisuals';

type DimData = {
  id: Dim;
  label: string;
  english: string;
  icon: IconName;
  altitude: string;
  threats: string[];
  advantages: string[];
  weakness: string;
  example: string;
};

const DIMS: DimData[] = [
  {
    id: 'above',
    label: 'מעל הקרקע',
    english: 'Above Ground · Vertical',
    icon: 'mountain',
    altitude: '5–150 מ׳ מעל הקרקע',
    threats: [
      'צלפים המסתתרים בגגות עם טילי כתף (RPG) או נשק קל',
      'ירי טילי נ"ט (נגד טנקים) מלמעלה — פוגע בגג הטנק, שזו הנקודה הכי פגיעה שלו',
      'זריקת מטענים, רימונים או חפצים על שיירות מתוך חלונות',
      'שימוש בגגות כנקודות תצפית כדי לאסוף מודיעין על תנועת הכוחות',
    ],
    advantages: [
      'שדה ראייה רחב שמאפשר לשלוט על כל האזור',
      'יתרון הגובה — האויב נמצא למטה וקל יותר לפגוע בו',
      'יכולת לברוח ולהיעלם דרך מעברים פנימיים בין בניינים',
    ],
    weakness: 'חשיפה קטלנית מהאוויר. מי שנמצא על הגג גלוי לחלוטין לרחפנים, מסוקים ומטוסי קרב. בנוסף, למרות שלצלף יש זווית מצוינת, קשה לו מאוד לברוח מהר ממגדל גבוה.',
    example: 'בקרב על מוסול שבעיראק, צלפי דאעש פעלו מתוך מגדלי משרדים גבוהים. כוחות הקואליציה (בהובלת ארה"ב) הצליחו לפגוע בהם רק אחרי שאיתרו אותם במדויק מהאוויר והשתמשו בטילים מונחים.',
  },
  {
    id: 'street',
    label: 'גובה הרחוב',
    english: 'Street Level',
    icon: 'crosshair',
    altitude: '0–5 מ׳ — הקרקע',
    threats: [
      'מטעני חבלה מוסתרים (IED) בתוך קירות, מתחת לאספלט או בתוך רכבים חונים',
      'ירי פתאומי מטווח אפס מתוך סמטאות צדדיות',
      'מארבים שמחכים לחיילים כמעט בכל פינת רחוב',
      'קרבות פנים-אל-פנים במרחק של מטרים בודדים',
    ],
    advantages: [
      'חופש תנועה המאפשר להתקדם למספר רב של כיוונים',
      'אפשרות להכניס ציוד כבד כמו טנקים, נגמ"שים ודחפורים',
      'מכשירי הקשר והקליטה הסלולרית עובדים בצורה חלקה',
    ],
    weakness: 'החיילים ברחוב הם המטרה הנוחה ביותר. הם מותקפים מכל הכיוונים — מלמעלה (גגות), מהצדדים (חלונות) ומלמטה (מנהרות). הצורך להיות דרוכים ב-360 מעלות יוצר לחץ מנטלי (קוגניטיבי) עצום.',
    example: 'במלחמת צ\'צ\'ניה (1994), טור טנקים רוסי נכנס לרחוב הראשי של העיר גרוזני וחטף אש משלושה כיוונים בו-זמנית. הכוח נלכד, ובתוך 3 שעות בלבד כ-100 רכבים משוריינים הושמדו לחלוטין.',
  },
  {
    id: 'below',
    label: 'תת-קרקע',
    english: 'Subterranean',
    icon: 'layers',
    altitude: '5–30 מ׳ מתחת לקרקע',
    threats: [
      'מחבלים שמגיחים מהאדמה בהפתעה מאחורי הכוח הצבאי',
      'מלכוד פתחי המנהרות במטעני חבלה קטלניים',
      'סכנת חטיפה של חיילים אל תוך פיר מנהרה',
      'העברת נשק ולוחמים ממקום למקום מתחת לאף של הצבא',
    ],
    advantages: [
      '"רואה ואינו נראה" — אין קליטת GPS, כך שאי אפשר לאתר אותך מרחוק',
      'מסתור מושלם מהאוויר — מצלמות החום של המטוסים לא מסוגלות לחדור את האדמה',
      'נתיבי מילוט סודיים שמאפשרים לתקוף ולהיעלם מיד',
      'אחסון בטוח של משגרי טילים, נשק ותחמושת',
    ],
    weakness: 'הלוחמים מתמודדים עם חוסר חמצן, תנועה איטית וקושי לירות בתוך מנהרה צרה. בנוסף, המנהרה פועלת כמו "תיבת תהודה" גדולה — החיילים שנמצאים בחוץ יכולים לשמוע כל רעש או צעד שקורה בפנים.',
    example: 'בעזה (2023), העולם נחשף ל"מטרו" של חמאס: רשת מנהרות התקפיות באורך של מאות קילומטרים. פתחי המנהרות הוסתרו בכוונה מתחת לבתי חולים, בתי ספר ומסגדים, במטרה לשלב באופן קטלני בין תקיפה מהאדמה לבין הסתתרות בתוך אוכלוסייה אזרחית.',
  },
];

const dimLabel = (d: Dim) => DIMS.find((x) => x.id === d)!.label;

/** In-section labels — the same copy the old inline SVG carried. */
const SECTION_LABELS: SectionLabels = {
  bands: { above: dimLabel('above'), street: dimLabel('street'), below: dimLabel('below') },
  ground: '— פני הקרקע —',
  sniper: 'צלף',
  ied: 'IED',
  tunnels: 'רשת מנהרות · אין קליטת לווינים (GPS)',
  ticks: [
    { m: 150, label: '+150 מ׳' },
    { m: 50, label: '+50 מ׳' },
    { m: 5, label: '+5 מ׳' },
    { m: 0, label: '0' },
    { m: -10, label: '-10 מ׳' },
    { m: -25, label: '-25 מ׳' },
  ],
};

/** "עקרון השילוב" diagram labels — terms from that paragraph. */
const COMBINE_LABELS = { sniper: 'צלף', shaft: 'פיר במרתף' };

export function ThreeDimScene() {
  const [activeDim, setActiveDim] = useState<Dim | null>('above');
  // Threat number under the pointer (list ↔ section link).
  const [hover, setHover] = useState<number | null>(null);
  const [run, setRun] = useState(0);
  const meta = activeDim ? DIMS.find((d) => d.id === activeDim)! : null;

  const choose = (d: Dim | null) => {
    setActiveDim(d);
    setHover(null);
  };

  // Tabs: arrows follow the visual order (RTL — ArrowLeft/ArrowDown move forward).
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = DIMS.length;
    let next: number;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = (i + 1) % n;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    choose(DIMS[next].id);
    document.getElementById(`threedim-tab-${DIMS[next].id}`)?.focus();
  };

  return (
    <section id="scene-threedim" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="10.2"
        eyebrow="ממד אנכי ותת-קרקע"
title = {
  <>
    בעיר, הסכנה מגיעה <span className="text-accent-hover">מלמעלה, מהרחוב ומתחת לרגליים</span>
  </>
}
        intro="בעיר, הסכנה לא מחכה לכם רק 'ממול'. היא יכולה להגיע מ-30 קומות מעל, או מ-20 מטרים מתחת לאדמה. צבא שרוצה לנצח חייב להילחם בשלושת הממדים במקביל — אחרת, הוא פשוט מתעלם מרוב האיומים בשטח ונועד להיכשל."
      />

      <div className="p-5 mb-6">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">הקרב התלת-ממדי בעיר:</strong> מגדלים בעיר מתפקדים כמו "גבעות בטון" ומעניקים יתרון אדיר למי ששולט בהם. במקביל, מתחת לרגליים, רשת מנהרות מספקת לאויב אוטוסטרדה סודית ש<strong>שום כלי טיס לא יכול לראות</strong>. צבא שמתכונן רק ללחימה בגובה הקרקע – פשוט יפסיד בקרב.
          </div>
        </div>
      </div>

      {/* 3D Cross-section visualization — one section model (ThreeDimVisuals) */}
      <div className="surface-elevated p-4 rounded-2xl mb-6 overflow-hidden">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
            חתך צד של לחימה בעיר · לחצו על הממדים למטה
          </div>
          <div className="flex items-center gap-2">
            {meta && (
              <div className="chip border-border bg-bg-elevated text-fg text-[13px]">
                <Icon name={meta.icon} size={14} className="text-brand-dark" />
                <span>{meta.label}</span>
              </div>
            )}
            {meta && (
              <button
                type="button"
                onClick={() => setRun((r) => r + 1)}
                aria-label="הפעלה חוזרת של ההדגמה"
                className="motion-reduce:hidden size-8 shrink-0 rounded-xl border border-border bg-bg-elevated text-fg-muted hover:text-fg hover:border-brand/30 hover:bg-brand/[0.03] transition-colors inline-flex items-center justify-center"
              >
                <Icon name="refresh" size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="aspect-[160/84] relative rounded-xl overflow-hidden border border-border-subtle">
          <UrbanSection active={activeDim} onBand={choose} hover={hover} onHover={setHover} run={run} labels={SECTION_LABELS} />
        </div>
      </div>

      {/* Dimension tabs + details (the tab panel) */}
      <div className="grid grid-cols-3 gap-2 mb-4" role="tablist" aria-label="ממד אנכי ותת-קרקע">
        {DIMS.map((d, i) => {
          const isActive = activeDim === d.id;
          return (
            <button
              key={d.id}
              id={`threedim-tab-${d.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="threedim-panel"
              tabIndex={isActive || (activeDim === null && i === 0) ? 0 : -1}
              onClick={() => choose(d.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cn(
                'surface p-4 text-start transition-all rounded-xl flex items-center gap-3 cursor-pointer',
                isActive ? 'border-accent bg-accent/10' : 'hover:border-border-strong'
              )}
            >
              <Icon name={d.icon} size={28} className={cn(isActive ? 'text-accent-deep' : 'text-brand-dark', 'shrink-0')} />
              <div className="min-w-0">
                <div className="font-display font-bold text-sm leading-tight text-fg">
                  {d.label}
                </div>
                <div className="text-[13px] text-fg-dim mt-0.5">{d.altitude}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active dimension details */}
      <AnimatePresence mode="wait">
        {meta && (
          <motion.div
            key={meta.id}
            id="threedim-panel"
            role="tabpanel"
            aria-labelledby={`threedim-tab-${meta.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="surface-elevated p-6 rounded-2xl border-s-4 border-s-brand mb-12"
          >
            <div className="mb-5">
              <div className="text-sm font-display font-semibold mb-1 tracking-wider text-brand-dark">
                {meta.english} · {meta.altitude}
              </div>
              <h3 className="font-display font-bold text-2xl leading-tight text-fg">{meta.label}</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="surface p-4 rounded-2xl bg-status-danger/5 border-status-danger/30">
                <div className="text-sm font-display font-semibold text-status-danger mb-2 tracking-wider flex items-center gap-1.5">
                  <Icon name="crosshair" size={13} />
                  איומים
                </div>
                {/* Numbered as on the section above; hover links both ways. */}
                <ul className="space-y-1.5 text-sm">
                  {meta.threats.map((t, i) => (
                    <li
                      key={t}
                      className="flex gap-2"
                      onMouseEnter={() => setHover(i + 1)}
                      onMouseLeave={() => setHover(null)}
                    >
                      <ThreatBadge n={i + 1} hot={hover === i + 1} />
                      <span className="text-fg leading-relaxed">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="surface p-4 rounded-2xl bg-brand/5 border-brand/30">
                <div className="text-sm font-display font-semibold text-brand-dark mb-2 tracking-wider flex items-center gap-1.5">
                  <Icon name="shield" size={13} />
                  היתרונות (למי ששולט במרחב)
                </div>
                <ul className="space-y-1.5 text-sm">
                  {meta.advantages.map((a) => (
                    <li key={a} className="flex gap-2">
                      <Icon name="check" size={13} strokeWidth={2.5} className="text-brand-dark shrink-0 mt-1" />
                      <span className="text-fg leading-relaxed">{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="surface p-4 rounded-2xl mb-3">
              <div className="text-sm font-display font-semibold mb-1.5 tracking-wider text-brand-dark">החיסרון המרכזי (נקודת התורפה)</div>
              <p className="text-sm text-fg-muted leading-relaxed">{meta.weakness}</p>
            </div>

            <div className="surface p-3 rounded-2xl bg-bg-accent/30 border border-border">
              <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">דוגמה מבצעית</div>
              <p className="text-[13px] text-fg-muted leading-relaxed italic">"{meta.example}"</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key insight: combined threat */}
      <div className="">
        <div className="flex gap-4 items-start">
          <Icon name="spark" size={32} className="text-brand-dark shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-display font-semibold text-brand-dark mb-1 tracking-wider">
              עקרון השילוב
            </div>
            <h3 className="font-display font-bold text-lg leading-tight mb-2">
              אויב מסוכן משלב את כל הממדים יחד
            </h3>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty">
              דאעש במוסול, חמאס בעזה והצ'צ'נים בגרוזני הוכיחו דבר אחד: אסטרטגיה עירונית מנצחת בנויה על <strong className="text-fg">שילוב ממדים</strong>. צלף יורה מהגג (למעלה), בורח מיד אל פיר במרתף (למטה), ומופיע מחדש בקצה השני של העיר. כשהצבא פורץ אל הבניין כדי לתפוס אותו — הוא כבר מזמן לא שם.
              <strong className="text-fg block mt-1.5">איך צבא מודרני מתמודד עם זה?</strong> בעזרת שילוב טכנולוגיות בעצמו: כלבים ורובוטים לגילוי מנהרות, רחפנים זעירים שסורקים חלונות, מכ"מים שרואים דרך קירות, ויחידות קומנדו שמתמחות בלחימה בחושך המוחלט שמתחת לאדמה.
            </p>
            {/* Same section model: roof → shaft in the basement → tunnel →
                out at the far end, while the force breaks into an empty building. */}
            <CombineDiagram labels={COMBINE_LABELS} />
          </div>
        </div>
      </div>
    </section>
  );
}
