'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

type ChokepointId = 'hormuz' | 'bab-el-mandeb' | 'suez' | 'malacca' | 'panama';

type Chokepoint = {
  id: ChokepointId;
  label: string;
  english: string;
  position: { x: number; y: number }; // 0-100 viewBox coords
  width: string;
  depth: string;
  tradePct: number;
  whatPasses: string;
  threats: string;
  incidents: string;
  color: string;
  /** Revealed only when the user blocks this chokepoint. Real-world
   * cascade — concrete numbers the user discovers via the action.
   * Designed for the instructional-design "interactive consequence"
   * pattern: blocking isn't decorative, it teaches a fact. */
  blockImpact: {
    headline: string;
    detourDays: string;
    costPerDay: string;
    whoBleeds: string;
  };
};

const CHOKEPOINTS: Chokepoint[] = [
  {
    id: 'hormuz',
    label: 'מיצרי הורמוז',
    english: 'Strait of Hormuz',
    position: { x: 68, y: 21.5 },
    width: '~21 מייל בנקודה הצרה',
    depth: '~60 מ׳',
    tradePct: 21,
    whatPasses: 'כ-21% מהנפט הגולמי בעולם. כ-17 מיליון חביות ביום שיוצאות מסעודיה, איראן, איחוד האמירויות וכווית לשאר העולם.',
    threats: 'איראן מאיימת באופן קבוע לחסום את המיצר בתגובה לסנקציות. האיומים כוללים סירות קומנדו מהירות, מוקשים ימיים ומתקפות סייבר.',
    incidents: 'ב-2019 הותקפו 4 מכליות נפט במוקשים, וב-2023 איראן השתלטה על מספר מכליות. בתגובה, צבאות ארה"ב ובריטניה מחזיקים שם כוחות קבועים.',
    color: 'text-accent-hot',
    blockImpact: {
      headline: 'מחיר הדלק העולמי מזנק תוך 24 שעות',
      detourDays: 'אין מעקף ימי',
      costPerDay: '+50% במחיר הנפט',
      whoBleeds: 'כל מי שמתדלק רכב — ארה"ב, אירופה, סין, ישראל',
    },
  },
  {
    id: 'bab-el-mandeb',
    label: 'באב אל-מנדב',
    english: 'Bab el-Mandeb',
    position: { x: 60.3, y: 26.5 },
    width: '~18 מייל בכניסה מים סוף',
    depth: '~100 מ׳',
    tradePct: 12,
    whatPasses: 'השער לים סוף ולתעלת סואץ — עובר בו 7% מהנפט העולמי ורוב הסחורות שנעות מאסיה לאירופה.',
    threats: 'החות\'ים בתימן, שמשתמשים בטילים זולים וברחפנים מתאבדים. קל וזול מאוד לייצר שם כאוס ביטחוני.',
    incidents: 'ב-2023-2024 החות\'ים תקפו ספינות ללא הפסקה. חברות ענק נאלצו לוותר על המסלול הזה ולהקיף את כל אפריקה, מה שהוסיף שבועות של הפלגה וייקר את המחירים לכולנו.',
    color: 'text-status-danger',
    blockImpact: {
      headline: 'ספינות מאסיה מקיפות את אפריקה — שבועיים של דרך',
      detourDays: '+10–14 ימים',
      costPerDay: '+30% עלות שילוח',
      whoBleeds: 'יבואנים אירופיים · מצרים מאבדת הכנסות מסואץ',
    },
  },
  {
    id: 'suez',
    label: 'תעלת סואץ',
    english: 'Suez Canal',
    position: { x: 56.7, y: 17.5 },
    width: 'תעלה מלאכותית, ~205 מ׳ רוחב',
    depth: '~24 מ׳',
    tradePct: 12,
    whatPasses: 'הקיצור המשמעותי ביותר בין אירופה לאסיה. כ-12% מהסחר העולמי עובר פה: נפט, גז ובעיקר מכולות סחורה (קונטיינרים).',
    threats: 'הסכנה המרכזית היא חסימה פיזית של התעלה (כי היא מלאכותית וצרה מאוד), או אי-יציבות ביטחונית במצרים.',
    incidents: 'ב-2021 ספינת משא אחת ענקית ("Ever Given") נתקעה באלכסון וחסמה את התעלה ל-6 ימים. הנזק לכלכלה העולמית: כ-9.6 מיליארד דולר ביום(!).',
    color: 'text-accent',
    blockImpact: {
      headline: '9.6 מיליארד דולר נזק עולמי. בכל יום.',
      detourDays: '+10 ימים מסביב לאפריקה',
      costPerDay: '$9.6B נזק / יום',
      whoBleeds: 'מצרים (50M$/יום מהכנסות תעלה) · יבואני אירופה',
    },
  },
  {
    id: 'malacca',
    label: 'מיצרי מלאקה',
    english: 'Strait of Malacca',
    position: { x: 80, y: 34 },
    width: '~1.5 מייל בנקודה הצרה',
    depth: '~25 מ׳',
    tradePct: 30,
    whatPasses: 'העורק המרכזי מכולם — כ-30% מהסחר העולמי. הדרך העיקרית להעביר נפט מהמזרח התיכון למעצמות כמו סין, יפן ודרום קוריאה.',
    threats: 'איום של שודדי ים, אבל בעיקר מתח צבאי בין ארה"ב לסין. לסינים יש פחד קיומי שנקרא "דילמת מלאקה" — ההבנה שמי שחוסם להם את המיצר, חונק אותם למוות.',
    incidents: 'בגלל הפחד מ"חנק", סין משקיעה היום מיליארדים בבניית כבישים ורכבות עוקפות ("פרויקט החגורה והדרך") רק כדי לא להיות תלויה בלעדית במיצר הזה.',
    color: 'text-accent-cool',
    blockImpact: {
      headline: 'סין מאבדת ~80% מאספקת הנפט תוך שבועיים',
      detourDays: 'אין מעקף ריאלי באוקיינוס',
      costPerDay: 'משבר אנרגיה אסיה',
      whoBleeds: 'סין · יפן · דרום קוריאה · טייוואן — כולם תלויים',
    },
  },
  {
    id: 'panama',
    label: 'תעלת פנמה',
    english: 'Panama Canal',
    position: { x: 26, y: 29.5 },
    width: 'תעלה מלאכותית עם 3 מנעולים',
    depth: '~12–15 מ׳',
    tradePct: 6,
    whatPasses: 'כ-6% מהסחר העולמי. החיבור היחיד בין האוקיינוס האטלנטי לאוקיינוס השקט, קריטי במיוחד לכלכלה של ארה"ב.',
    threats: 'האיום פה הוא לא צבאי אלא אקלימי. התעלה פועלת על בסיס מי אגמים מתוקים, ובצורת גורמת לירידת מפלס המים ומונעת מעבר ספינות כבדות.',
    incidents: 'ב-2023 בצורת קשה חתכה את יכולת המעבר ב-50%. זה גרם לעיכובים עצומים במסחר והקפיץ את מחירי השילוח לשמיים.',
    color: 'text-status-warn',
    blockImpact: {
      headline: 'חוף מערב ארה"ב מתנתק מהמזרח',
      detourDays: '+8,000 מייל סביב דרום אמריקה',
      costPerDay: '+40% מחירי שילוח לארה"ב',
      whoBleeds: 'ארה"ב (קליפורניה, טקסס) · יצואני דרום אמריקה',
    },
  },
];

export function ChokepointsScene() {
  const [blocked, setBlocked] = useState<Set<ChokepointId>>(new Set());

  const blockedTradePct = Array.from(blocked).reduce((s, id) => {
    const c = CHOKEPOINTS.find((x) => x.id === id);
    return s + (c?.tradePct || 0);
  }, 0);

  const toggleBlock = (id: ChokepointId) => {
    setBlocked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section id="scene-chokepoints" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="09.2"
        eyebrow="נקודות חנק ימיות"
title = {
  <>
    <span className="text-accent-hover">כמה מעברים צרים</span> מחזיקים את כל הסחר העולמי
  </>
}
        intro="רוב הסחר הימי בעולם זורם דרך מספר קטן של מעברים צרים. כל אחד מהם הוא מטרה אסטרטגית עם ערך עצום. בואו נכיר אותם, ונראה מה קורה כשסוגרים אפילו אחד מהם."
      />

      {/* Two SEPARATE feature cards side-by-side (no nesting). Both
          carry the same orange accent treatment — eyebrow dot, h3
          colour, divider — so they read as a matched pair. */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-12 items-stretch">
        {/* Card A — concept */}
        <div className="surface-elevated p-6 sm:p-8 rounded-2xl flex flex-col">
          <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent-hover mb-2.5">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            עיקרון מנחה
          </div>
          <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight mb-3 text-accent-hover">
            נקודת חנק ימית <span className="text-fg-muted font-medium text-base sm:text-lg">(Maritime Chokepoint)</span>
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            מיצר ים צר — מעבר בין יבשות או מדינות — שעובר דרכו חלק ענק מהסחר העולמי. מכיוון שאי אפשר באמת לעקוף אותו, הוא הופך ל<strong className="text-fg">מעבר כמעט בלעדי</strong>.
          </p>
        </div>

        {/* Card B — vulnerability */}
        <div className="surface-elevated p-6 sm:p-8 rounded-2xl flex flex-col">
          <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent-hover mb-2.5">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            נקודת התורפה
          </div>
          <h3 className="font-display font-bold text-2xl sm:text-3xl text-balance leading-tight text-accent-hover mb-3">
            שחקן אחד קטן הופך למשבר עולמי
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            בגלל שהמעבר כל כך צר, אפילו ארגון טרור קטן עם כמה רקטות פשוטות יכול לחסום אותו לחלוטין. הכלכלה העולמית כולה יכולה להיתקע בגלל <strong className="text-fg">שחקן אחד</strong>.
          </p>
        </div>
      </div>

      {/* Map + sidebar of chokepoint chips. Sidebar is the FIRST DOM
          child so it lands on the RIGHT in RTL — the user explicitly
          asked for the buttons to sit to the right of the map. */}
      <div className="grid lg:grid-cols-[1fr_2fr] gap-4 mb-6 items-stretch">
        {/* Sidebar — 5 chokepoint cards, vertical stack */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold text-brand-dark tracking-[0.2em] uppercase mb-1">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            5 מיצרים · בחר ובדוק
          </div>
          {CHOKEPOINTS.map((c) => {
            const isBlocked = blocked.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleBlock(c.id)}
                className={cn(
                  'group rounded-xl border p-3 text-right transition-all flex items-center gap-3 cursor-pointer',
                  isBlocked
                    ? 'border-status-danger/60 bg-status-danger/8'
                    : 'border-border bg-bg-elevated hover:border-accent/50 hover:bg-accent/[0.04]',
                )}
                aria-pressed={isBlocked}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold text-sm leading-tight text-fg">
                    {c.label}
                  </div>
                  <div className="text-[11px] font-display font-medium tracking-wide text-fg-dim mt-0.5">
                    {c.english}
                  </div>
                </div>
                <div className={cn(
                  'font-display font-bold text-base tabular-nums shrink-0 leading-none',
                  isBlocked ? 'text-status-danger' : 'text-fg',
                )}>
                  {c.tradePct}<span className="text-xs">%</span>
                </div>
                {/* The block / unblock toggle — visible on every card,
                    it's the diagram's main interaction. */}
                <span
                  className={cn(
                    'shrink-0 inline-flex items-center justify-center size-8 rounded-md text-[11px] font-display font-bold transition-colors',
                    isBlocked
                      ? 'bg-status-ok text-bg-elevated'
                      : 'bg-status-danger text-bg-elevated',
                  )}
                  aria-hidden
                >
                  <Icon name={isBlocked ? 'check' : 'bolt'} size={14} strokeWidth={2.5} />
                </span>
              </button>
            );
          })}
        </div>

        {/* Map column */}
        <div className="surface-elevated bg-bg-accent/30 p-4 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 text-sm font-display font-semibold text-brand-dark tracking-wider">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              מפת הסחר הימי העולמי
            </div>
            <div className={cn(
              'chip',
              blocked.size === 0 ? 'border-status-ok/40 bg-status-ok/10 text-status-ok' :
                blockedTradePct < 20 ? 'border-status-warn/40 bg-status-warn/10 text-status-warn' :
                  'border-status-danger/40 bg-status-danger/10 text-status-danger'
            )}>
              <Icon name={blocked.size === 0 ? 'check' : 'spark'} size={12} strokeWidth={2.5} />
              <span className="font-display font-semibold tracking-wide tabular-nums">{blockedTradePct}% מהסחר חסום</span>
            </div>
          </div>

          <div className="flex-1">
            <WorldMap
              chokepoints={CHOKEPOINTS}
              blocked={blocked}
              onToggle={toggleBlock}
            />
          </div>

          {/* Live impact stack — appears in the map area itself so the
              cause (block) and the consequence (real-world headline)
              sit side by side. When nothing is blocked, the tip text
              invites the action. */}
          {blocked.size === 0 ? (
            <div className="mt-4 text-[11px] font-display font-medium tracking-wide text-fg-dim text-center">
              לחצו על מיצר ברשימה או על המפה כדי לחסום נתיב ולראות את ההשפעה האמיתית
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-status-danger">
                <span className="size-1.5 rounded-full bg-status-danger animate-pulse" aria-hidden />
                השפעות פעילות · {blocked.size} מיצרים חסומים
              </div>
              <AnimatePresence initial={false}>
                {CHOKEPOINTS.filter((c) => blocked.has(c.id)).map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="w-full rounded-lg border border-status-danger/35 bg-status-danger/5 p-3 text-right"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="inline-flex items-center gap-1.5">
                        <Icon name="bolt" size={11} className="text-status-danger" />
                        <span className="font-display font-bold text-sm text-fg">{c.label}</span>
                      </div>
                      <span className="font-display font-bold text-xs tabular-nums text-status-danger">
                        −{c.tradePct}% מהסחר
                      </span>
                    </div>
                    <div className="text-[12px] font-medium text-fg-muted leading-snug text-balance">
                      {c.blockImpact.headline}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

    </section>
  );
}

/** The Asia↔Europe mega-artery — the single route that threads Suez,
 *  Bab el-Mandeb, the Hormuz corner and Malacca. It bends INTO each strait
 *  so the converging-into-chokepoints idea reads at a glance; the travelling
 *  blip rides this path. */
const MEGA_ARTERY =
  'M47,17 Q52,17.4 56.3,18.2 Q59,22 60.3,26.5 Q64.5,29.6 68,28 Q73,29.5 76.5,31.5 Q78.5,32.7 80,34 Q85.5,31 89,24';

/** Map-only label placement. The three Middle-East straits sit close
 *  together, so their labels are pushed into open water and tied back with
 *  a short leader line; Panama and Malacca read fine directly below. */
const LABEL_LAYOUT: Record<ChokepointId, { x: number; y: number; leader: boolean }> = {
  panama: { x: 26, y: 35.4, leader: false },
  suez: { x: 50, y: 9.6, leader: true },
  'bab-el-mandeb': { x: 52, y: 31.8, leader: true },
  hormuz: { x: 75.5, y: 26.4, leader: true },
  malacca: { x: 80, y: 40.4, leader: false },
};

function WorldMap({
  chokepoints,
  blocked,
  onToggle,
}: {
  chokepoints: Chokepoint[];
  blocked: Set<ChokepointId>;
  onToggle: (id: ChokepointId) => void;
}) {
  return (
    <div className="relative w-full h-full min-h-[360px] rounded-xl overflow-hidden">
      <svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
        {/* Subtle "map paper" grid — a faint sage graticule (same sage as
            the site grid-pattern token) that reads as survey paper without
            competing with the land. */}
        {Array.from({ length: 11 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={i * 10}
            y1="0"
            x2={i * 10}
            y2="56"
            className="stroke-brand-dark/10"
            strokeWidth="0.08"
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={i * 8}
            x2="100"
            y2={i * 8}
            className="stroke-brand-dark/10"
            strokeWidth="0.08"
          />
        ))}

        {/* Continents — warm sand silhouettes drawn as a deliberate,
            recognisable world map: the Americas at the left, Europe /
            Africa in the centre, the Arabian peninsula and Asia (with
            India + SE-Asia) to the right, plus supporting landmasses
            (Greenland, Japan, Madagascar, Australia) for orientation. A
            faint sand coastline gives them definition without noise. */}
        <g className="fill-terrain-sand/40 stroke-terrain-sand/60" strokeWidth="0.2" strokeLinejoin="round">
          {/* North America + the Central-America isthmus as ONE landmass, so
              the land bridge reads as a deliberate waist Panama cuts through
              (no thin double-stroke sliver). */}
          <path d="M11,13 Q11,8.5 14,6.8 Q18,4.8 23,5.4 Q27.5,5 30.5,7.2 Q32.6,9.5 31.4,12.6 Q30.6,15.2 28.6,16.8 Q29.2,18.4 28.2,19.6 Q27,18.4 26.4,17 Q24.4,17.4 22.8,18.8 Q21,20.6 20.4,22.6 Q22.4,24.6 24.4,26.6 Q26,28.2 27,29.4 Q27.7,30.2 27,31 Q25.9,30.6 24.6,29.2 Q22.6,27.4 20.6,25.2 Q18.4,23 16.4,20.4 Q13.4,17.4 12,14.6 Q11.2,13.6 11,13 Z" />
          {/* South America — Brazil bulge (east), Andes coast, taper to Cape Horn */}
          <path d="M27,30.4 Q31,29.2 34.6,30.4 Q37.6,31.8 38.4,35.4 Q38.6,38 36.8,39.8 Q37,42 35.4,44.6 Q33,49 30.6,52.6 Q29.6,53 29.2,52 Q28.8,48.4 28.6,44.4 Q27,40.4 25.8,36 Q25,32.8 25.8,31 Q26.2,30.4 27,30.4 Z" />
          {/* Greenland */}
          <path d="M36,4 Q39,2.5 41.2,4.6 Q42.2,7 39.2,8.6 Q36,8 35.6,6 Q35.2,4.5 36,4 Z" />
          {/* Europe — a Scandinavian peninsula above the Mediterranean */}
          <path d="M44.5,14.4 Q44.4,12 46.4,11 Q47.6,8.8 49.2,10 Q49.8,7.4 51.4,9 Q54,9 55.2,11 Q55.8,13 53.2,13.8 Q49,14.4 46.6,14.9 Q45.2,15 44.5,14.4 Z" />
          {/* Africa — connects to Arabia just N/S of the Suez marker, so Suez
              reads as a canal cut through a continuous Africa–Asia landbridge. */}
          <path d="M42.6,17.2 Q47,15.6 52.5,15.8 Q55.4,15.6 56.4,16.6 L56.4,17.5 Q56.5,18.2 56.9,18.7 Q58.6,19.2 59.4,21.2 Q59,23.4 60.2,25 Q59,26.4 57.4,28.4 Q55,32.4 52.6,38 Q50,44 48,48.6 Q46,46.6 45.2,42 Q44,37.6 43.8,33 Q42.8,31.6 41.6,29 Q40.4,25.6 40.2,22.4 Q40.6,19.4 42,17.8 Q42.3,17.5 42.6,17.2 Z" />
          {/* Arabian peninsula — touches Africa at Suez; Persian Gulf mouth at Hormuz */}
          <path d="M56.9,18.7 Q59,19 60.6,19.8 Q63,18.6 65.8,19.2 Q68.2,20.6 68,22.6 Q66.4,24.4 63.8,25.8 Q61.6,26.4 60.4,24.4 Q59.6,22 59.2,20.4 Q58,19.6 56.9,18.7 Z" />
          {/* Asia / Eurasia — Bay-of-Bengal concavity lightens the right side;
              the Malay peninsula drops to pinch the Malacca strait. */}
          <path d="M54.8,11 Q57.6,7.4 63.4,6.4 Q73,5.4 82.4,5.9 Q88.6,6.4 91.6,9 Q93.8,11.2 91,14.6 Q89,17.2 87,17 Q85.4,18.8 84.2,20.8 Q82.4,23.6 80,25.8 Q76.6,24 74.6,25.8 Q73.6,27.4 73.4,29.6 Q75.4,29.2 77.2,29.6 Q79,30 79.4,31.4 Q79.2,32.8 78,33.2 Q76.2,33 74.6,32.4 Q73.2,31.6 72.4,30 Q71.4,27.4 71,24.4 Q70,22 68.2,20.6 Q66,19 63,17.6 Q60.4,16.2 57.8,15.8 Q55.8,14.6 54.8,11 Z" />
          {/* Japan */}
          <path d="M90,12 Q92,10.5 92.8,13 Q92.5,15 91,17 Q90,16 90,14 Q89.7,12.8 90,12 Z" />
          {/* Madagascar — orients the East-Africa / Indian-Ocean corner */}
          <path d="M62.8,34 Q63.8,33.5 64.1,35 Q64.3,38 63.3,40 Q62.6,39 62.5,37 Q62.3,35 62.8,34 Z" />
          {/* Sumatra — the far bank of the Malacca strait */}
          <path d="M77.4,33.4 Q79.4,34.6 82,37.4 Q83.6,39.4 82,40 Q79.8,39.4 77.6,36.6 Q76.4,34.8 77.4,33.4 Z" />
          {/* Australia */}
          <path d="M85,41 Q89,38.5 93,40 Q96,41.5 95.5,45 Q94,48.5 90,49 Q86,48.5 84.5,45 Q84,42.5 85,41 Z" />
        </g>

        {/* Water channels — the narrow passages themselves. A faint cool
            stroke traces the Mediterranean, the Red Sea (Suez→Bab), the
            Persian Gulf (→Hormuz) and the Malacca strait, so the eye sees
            WHY each marker is a bottleneck. */}
        <g fill="none" className="stroke-accent-cool/40" strokeLinecap="round">
          <path d="M45.5,14.9 Q51,14.4 56,15.1" strokeWidth="0.5" className="stroke-accent-cool/30" />
          <path d="M57.2,18 Q58.8,21.6 60.2,25.6" strokeWidth="0.6" />
          <path d="M61.6,17 Q64.6,19 68,21.5" strokeWidth="0.6" />
          <path d="M79,31.6 Q79.8,32.8 80.4,34.4" strokeWidth="0.55" />
        </g>

        {/* Major shipping lanes — a small, intentional set of corridors so
            the relationship between routes and chokepoints is obvious. Drawn
            SOLID (the course convention: a safe/continuous lane is solid, a
            dangerous straight run would be dashed): the Asia↔Europe artery
            through Suez/Bab/Hormuz/Malacca, the Gulf-oil run out of Hormuz,
            and one continuous Atlantic↔Panama↔Pacific corridor. */}
        {[
          MEGA_ARTERY,
          'M68,21.5 Q71.5,26.5 75,29.5 Q78,32 80,34',
          'M47,16 Q40,20 33,23.5 Q29.5,26.5 26,29.5 Q19,31.5 12,32.5 Q9,33 7,34.5',
        ].map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            className="stroke-brand-dark/55"
            strokeWidth="0.34"
            strokeLinecap="round"
          />
        ))}

        {/* Suez + Panama read as engineered canals — a short cool corridor
            cutting the land, distinct from the natural straits. */}
        <g className="stroke-accent-cool/60" strokeWidth="0.45" strokeLinecap="round">
          <line x1="56.7" y1="16.2" x2="56.7" y2="18.8" />
          <line x1="24.4" y1="27.6" x2="27.2" y2="30" />
        </g>

        <motion.circle
          r="0.7"
          className="fill-accent"
          animate={{ offsetDistance: ['0%', '100%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          style={{ offsetPath: `path("${MEGA_ARTERY}")` }}
        />

        {/* Leader lines — drawn under the markers so an offset label ties
            cleanly back to its strait. */}
        {chokepoints.map((c) => {
          const lay = LABEL_LAYOUT[c.id];
          if (!lay.leader) return null;
          const isBlocked = blocked.has(c.id);
          return (
            <line
              key={`lead-${c.id}`}
              x1={c.position.x}
              y1={c.position.y}
              x2={lay.x}
              y2={lay.y - 0.8}
              className={cn(isBlocked ? 'stroke-status-danger/50' : 'stroke-fg-dim/45')}
              strokeWidth="0.12"
            />
          );
        })}

        {/* Chokepoint markers — each marker is itself the toggle.
            Blocked markers turn red with an X; unblocked are sage.
            Hover ring on un-blocked invites the click. */}
        {chokepoints.map((c) => {
          const isBlocked = blocked.has(c.id);
          const lay = LABEL_LAYOUT[c.id];
          return (
            <g
              key={c.id}
              onClick={() => onToggle(c.id)}
              style={{ cursor: 'pointer' }}
              className="group"
            >
              {isBlocked && (
                <circle
                  cx={c.position.x}
                  cy={c.position.y}
                  r="3"
                  fill="none"
                  className="stroke-status-danger"
                  strokeWidth="0.35"
                >
                  <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0;0.9" dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              <circle
                cx={c.position.x}
                cy={c.position.y}
                r="1.6"
                className={cn(
                  'transition-all',
                  isBlocked
                    ? 'fill-status-danger'
                    : 'fill-brand-dark group-hover:fill-accent',
                )}
                stroke="#ffffff"
                strokeWidth="0.5"
              />

              {isBlocked && (
                <g>
                  <line x1={c.position.x - 0.9} y1={c.position.y - 0.9} x2={c.position.x + 0.9} y2={c.position.y + 0.9} className="stroke-bg-elevated" strokeWidth="0.55" strokeLinecap="round" />
                  <line x1={c.position.x - 0.9} y1={c.position.y + 0.9} x2={c.position.x + 0.9} y2={c.position.y - 0.9} className="stroke-bg-elevated" strokeWidth="0.55" strokeLinecap="round" />
                </g>
              )}

              {/* Name label — pushed into open water for the crowded
                  Middle-East cluster, directly below otherwise. Red when
                  blocked, dark fg otherwise. */}
              <text
                x={lay.x}
                y={lay.y}
                textAnchor="middle"
                className={cn(
                  'font-display font-bold pointer-events-none',
                  isBlocked ? 'fill-status-danger' : 'fill-fg',
                )}
                fontSize="2.6"
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth="0.95"
                strokeLinejoin="round"
              >
                {c.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}