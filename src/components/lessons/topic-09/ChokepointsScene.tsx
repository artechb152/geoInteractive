'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
import {
  WORLD_LAND,
  GRATICULE,
  SHIPPING_ROUTES,
  WATER_CHANNELS,
} from './worldMapGeometry';

type ChokepointId = 'hormuz' | 'bab-el-mandeb' | 'suez' | 'malacca' | 'panama';

type Chokepoint = {
  id: ChokepointId;
  label: string;
  english: string;
  position: { x: number; y: number }; // projected viewBox coords (x 0-100, y 0-56)
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
    position: { x: 66.92, y: 23.8 },
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
    position: { x: 63, y: 27.99 },
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
    position: { x: 59.7, y: 22.6 },
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
    position: { x: 80.18, y: 30.84 },
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
    position: { x: 26.1, y: 29.04 },
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

/** Map-only label placement. The three Middle-East straits sit close together,
 *  so their labels are pushed into open water and tied back with a short leader
 *  line; Panama (open Pacific) and Malacca (Indian Ocean) read fine offset to
 *  the side. All positions are in the projected viewBox (x 0-100, y 0-56). */
const LABEL_LAYOUT: Record<ChokepointId, { x: number; y: number; leader: boolean }> = {
  panama: { x: 15.5, y: 27, leader: true },
  suez: { x: 50.5, y: 15.4, leader: true },
  'bab-el-mandeb': { x: 57, y: 34, leader: true },
  hormuz: { x: 76, y: 19, leader: true },
  malacca: { x: 85, y: 35, leader: true },
};

/** Faint water passages — each is stroked so the eye sees WHY the marker sits
 *  on a bottleneck (Mediterranean → Suez, the Red Sea → Bab, the Persian Gulf →
 *  Hormuz, the Malacca strait). Geometry lives in worldMapGeometry.ts. */
const CHANNELS: { d: string; w: number }[] = [
  { d: WATER_CHANNELS.med, w: 0.45 },
  { d: WATER_CHANNELS.redSea, w: 0.6 },
  { d: WATER_CHANNELS.gulf, w: 0.55 },
  { d: WATER_CHANNELS.malacca, w: 0.55 },
];

/** Shipping lanes + the chokepoints each one threads. A lane reads SOLID green
 *  (active/safe, per the course legend) while open; blocking ANY chokepoint on
 *  it severs the artery, so it re-renders red + dashed (disrupted). This is what
 *  makes the block interaction teach — the consequence shows on the map, not
 *  only in the marker. */
const ROUTES: { key: string; d: string; cps: ChokepointId[] }[] = [
  { key: 'mega', d: SHIPPING_ROUTES.mega, cps: ['suez', 'bab-el-mandeb', 'malacca'] },
  { key: 'gulf', d: SHIPPING_ROUTES.gulf, cps: ['hormuz'] },
  { key: 'panama', d: SHIPPING_ROUTES.panama, cps: ['panama'] },
];

function WorldMap({
  chokepoints,
  blocked,
  onToggle,
}: {
  chokepoints: Chokepoint[];
  blocked: Set<ChokepointId>;
  onToggle: (id: ChokepointId) => void;
}) {
  // Canal cuts are drawn at the two engineered chokepoints; read their
  // positions from the data so the cut always tracks the marker.
  const suezPos = chokepoints.find((c) => c.id === 'suez')!.position;
  const panamaPos = chokepoints.find((c) => c.id === 'panama')!.position;
  // The travelling blip represents live trade on the mega-artery — pause it
  // once that artery is severed anywhere.
  const megaDisrupted = ROUTES[0].cps.some((id) => blocked.has(id));
  return (
    <div className="relative w-full h-full min-h-[360px] rounded-xl overflow-hidden">
      <svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
        {/* Graticule — a faint sage meridian/parallel grid aligned to the map
            projection, so the board reads as survey paper without competing
            with the land. */}
        {GRATICULE.meridians.map((x, i) => (
          <line key={`v-${i}`} x1={x} y1="0" x2={x} y2="56" className="stroke-brand-dark/10" strokeWidth="0.08" />
        ))}
        {GRATICULE.parallels.map((y, i) => (
          <line key={`h-${i}`} x1="0" y1={y} x2="100" y2={y} className="stroke-brand-dark/10" strokeWidth="0.08" />
        ))}

        {/* Continents — warm sand silhouettes projected from real Natural
            Earth 1:50m coastlines (see worldMapGeometry.ts): the Americas at
            the left, Europe/Africa in the centre, Arabia and Asia (India +
            SE-Asia) to the right, Australia below, plus Greenland/Japan/
            Madagascar/UK/NZ for orientation. fillRule="evenodd" cuts inland
            seas (e.g. the Caspian); a slightly darker sand coastline gives
            definition without noise. */}
        <g
          className="fill-terrain-sand/45 stroke-terrain-sand/80"
          strokeWidth="0.2"
          strokeLinejoin="round"
          fillRule="evenodd"
        >
          {WORLD_LAND.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {/* Water channels — the narrow passages themselves. A faint cool
            stroke traces the Mediterranean, the Red Sea (Suez→Bab), the
            Persian Gulf (→Hormuz) and the Malacca strait, so the eye sees
            WHY each marker is a bottleneck. */}
        <g fill="none" className="stroke-accent-cool/40" strokeLinecap="round">
          {CHANNELS.map((ch, i) => (
            <path key={i} d={ch.d} strokeWidth={ch.w} />
          ))}
        </g>

        {/* Major shipping lanes — a small, intentional set of corridors so
            the relationship between routes and chokepoints is obvious. Solid
            green = open/active (course convention); once a chokepoint on the
            lane is blocked, the whole artery re-renders red + dashed to show
            it is severed. Asia↔Europe through Suez/Bab/Malacca, the Gulf-oil
            run out of Hormuz, and the Atlantic↔Panama↔Pacific corridor. */}
        {ROUTES.map((r) => {
          const disrupted = r.cps.some((id) => blocked.has(id));
          return (
            <path
              key={r.key}
              d={r.d}
              fill="none"
              strokeLinecap="round"
              className={cn('transition-colors', disrupted ? 'stroke-status-danger/80' : 'stroke-brand-dark/60')}
              strokeWidth={disrupted ? 0.4 : 0.34}
              strokeDasharray={disrupted ? '1.4 1' : undefined}
            />
          );
        })}

        {/* Suez + Panama read as engineered canals — a short cool corridor
            cutting the land, distinct from the natural straits. */}
        <g className="stroke-accent-cool/65" strokeWidth="0.5" strokeLinecap="round">
          <line x1={suezPos.x - 0.5} y1={suezPos.y - 1.4} x2={suezPos.x + 0.6} y2={suezPos.y + 1.4} />
          <line x1={panamaPos.x - 1.1} y1={panamaPos.y - 1.1} x2={panamaPos.x + 1.1} y2={panamaPos.y + 1} />
        </g>

        {!megaDisrupted && (
          <motion.circle
            r="0.7"
            className="fill-accent"
            animate={{ offsetDistance: ['0%', '100%'] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            style={{ offsetPath: `path("${SHIPPING_ROUTES.mega}")` }}
          />
        )}

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
              className={cn(isBlocked ? 'stroke-status-danger/55' : 'stroke-fg-dim/50')}
              strokeWidth="0.2"
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
                  <animate attributeName="r" values="1.8;3.6;1.8" dur="2s" repeatCount="indefinite" />
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