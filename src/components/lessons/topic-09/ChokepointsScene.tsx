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
};

const CHOKEPOINTS: Chokepoint[] = [
  {
    id: 'hormuz',
    label: 'מיצרי הורמוז',
    english: 'Strait of Hormuz',
    position: { x: 60, y: 39 },
    width: '~21 מייל בנקודה הצרה',
    depth: '~60 מ׳',
    tradePct: 21,
    whatPasses: 'כ-21% מהנפט הגולמי בעולם. כ-17 מיליון חביות ביום שיוצאות מסעודיה, איראן, איחוד האמירויות וכווית לשאר העולם.',
    threats: 'איראן מאיימת באופן קבוע לחסום את המיצר בתגובה לסנקציות. האיומים כוללים סירות קומנדו מהירות, מוקשים ימיים ומתקפות סייבר.',
    incidents: 'ב-2019 הותקפו 4 מכליות נפט במוקשים, וב-2023 איראן השתלטה על מספר מכליות. בתגובה, צבאות ארה"ב ובריטניה מחזיקים שם כוחות קבועים.',
    color: 'text-accent-hot',
  },
  {
    id: 'bab-el-mandeb',
    label: 'באב אל-מנדב',
    english: 'Bab el-Mandeb',
    position: { x: 53, y: 47 },
    width: '~18 מייל בכניסה מים סוף',
    depth: '~100 מ׳',
    tradePct: 12,
    whatPasses: 'השער לים סוף ולתעלת סואץ — עובר בו 7% מהנפט העולמי ורוב הסחורות שנעות מאסיה לאירופה.',
    threats: 'החות\'ים בתימן, שמשתמשים בטילים זולים וברחפנים מתאבדים. קל וזול מאוד לייצר שם כאוס ביטחוני.',
    incidents: 'ב-2023-2024 החות\'ים תקפו ספינות ללא הפסקה. חברות ענק נאלצו לוותר על המסלול הזה ולהקיף את כל אפריקה, מה שהוסיף שבועות של הפלגה וייקר את המחירים לכולנו.',
    color: 'text-status-danger',
  },
  {
    id: 'suez',
    label: 'תעלת סואץ',
    english: 'Suez Canal',
    position: { x: 51, y: 39 },
    width: 'תעלה מלאכותית, ~205 מ׳ רוחב',
    depth: '~24 מ׳',
    tradePct: 12,
    whatPasses: 'הקיצור המשמעותי ביותר בין אירופה לאסיה. כ-12% מהסחר העולמי עובר פה: נפט, גז ובעיקר מכולות סחורה (קונטיינרים).',
    threats: 'הסכנה המרכזית היא חסימה פיזית של התעלה (כי היא מלאכותית וצרה מאוד), או אי-יציבות ביטחונית במצרים.',
    incidents: 'ב-2021 ספינת משא אחת ענקית ("Ever Given") נתקעה באלכסון וחסמה את התעלה ל-6 ימים. הנזק לכלכלה העולמית: כ-9.6 מיליארד דולר ביום(!).',
    color: 'text-accent',
  },
  {
    id: 'malacca',
    label: 'מיצרי מלאקה',
    english: 'Strait of Malacca',
    position: { x: 75, y: 53 },
    width: '~1.5 מייל בנקודה הצרה',
    depth: '~25 מ׳',
    tradePct: 30,
    whatPasses: 'העורק המרכזי מכולם — כ-30% מהסחר העולמי. הדרך העיקרית להעביר נפט מהמזרח התיכון למעצמות כמו סין, יפן ודרום קוריאה.',
    threats: 'איום של שודדי ים, אבל בעיקר מתח צבאי בין ארה"ב לסין. לסינים יש פחד קיומי שנקרא "דילמת מלאקה" — ההבנה שמי שחוסם להם את המיצר, חונק אותם למוות.',
    incidents: 'בגלל הפחד מ"חנק", סין משקיעה היום מיליארדים בבניית כבישים ורכבות עוקפות ("פרויקט החגורה והדרך") רק כדי לא להיות תלויה בלעדית במיצר הזה.',
    color: 'text-accent-cool',
  },
  {
    id: 'panama',
    label: 'תעלת פנמה',
    english: 'Panama Canal',
    position: { x: 22, y: 53 },
    width: 'תעלה מלאכותית עם 3 מנעולים',
    depth: '~12–15 מ׳',
    tradePct: 6,
    whatPasses: 'כ-6% מהסחר העולמי. החיבור היחיד בין האוקיינוס האטלנטי לאוקיינוס השקט, קריטי במיוחד לכלכלה של ארה"ב.',
    threats: 'האיום פה הוא לא צבאי אלא אקלימי. התעלה פועלת על בסיס מי אגמים מתוקים, ובצורת גורמת לירידת מפלס המים ומונעת מעבר ספינות כבדות.',
    incidents: 'ב-2023 בצורת קשה חתכה את יכולת המעבר ב-50%. זה גרם לעיכובים עצומים במסחר והקפיץ את מחירי השילוח לשמיים.',
    color: 'text-status-warn',
  },
];

export function ChokepointsScene() {
  const [active, setActive] = useState<ChokepointId>('hormuz');
  const [blocked, setBlocked] = useState<Set<ChokepointId>>(new Set());

  const meta = CHOKEPOINTS.find((c) => c.id === active)!;
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
        title={
          <>
            <span className="gradient-text">5 מיצרים</span> ששולטים בכלכלה העולמית
          </>
        }
        intro="רוב הסחר הימי בעולם זורם דרך מספר קטן של מעברים צרים. כל אחד מהם הוא מטרה אסטרטגית עם ערך עצום. בואו נכיר אותם, ונראה מה קורה כשסוגרים אפילו אחד מהם."
      />

      <div className="p-5 mb-6">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">נקודת חנק ימית (Maritime Chokepoint)</strong> — מיצר ים צר (מעבר בין יבשות או מדינות) שעובר דרכו חלק ענק מהסחר העולמי. מכיוון שאי אפשר באמת לעקוף אותו, הוא הופך ל<strong>מעבר כמעט בלעדי</strong>.
            <strong className="text-fg block mt-1.5">נקודת התורפה:</strong> בגלל שהמעבר כל כך צר, אפילו ארגון טרור קטן עם כמה רקטות פשוטות יכול לחסום אותו לחלוטין. הכלכלה העולמית כולה יכולה להיתקע בגלל שחקן אחד קטן.
          </div>
        </div>
      </div>

      {/* World map */}
      <div className="surface-elevated p-4 rounded-2xl mb-6 overflow-hidden">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
            מפת הסחר הימי העולמי
          </div>
          <div className={cn(
            'chip',
            blocked.size === 0 ? 'border-status-ok/40 bg-status-ok/10 text-status-ok' :
              blockedTradePct < 20 ? 'border-status-warn/40 bg-status-warn/10 text-status-warn' :
                'border-status-danger/40 bg-status-danger/10 text-status-danger'
          )}>
            <Icon name={blocked.size === 0 ? 'check' : 'spark'} size={12} strokeWidth={2.5} />
            <span className="font-mono">{blockedTradePct}% מהסחר חסום</span>
          </div>
        </div>

        <WorldMap
          chokepoints={CHOKEPOINTS}
          active={active}
          blocked={blocked}
          onSelect={setActive}
        />

        <div className="mt-3 text-[10px] text-fg-dim text-center">
          לחצו על נקודת חנק במפה לפרטים · נסו לחסום נתיבים כדי לראות את ההשפעה
        </div>
      </div>

      {/* Selected chokepoint details */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="surface-elevated p-6 rounded-2xl mb-6"
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <div className={cn('text-sm font-display font-semibold mb-0.5 tracking-wider', meta.color)}>
                {meta.english}
              </div>
              <h3 className={cn('font-display font-bold text-2xl leading-tight', meta.color)}>{meta.label}</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-[10px] font-mono text-fg-dim">מסחר עולמי</div>
                <div className={cn('font-display font-bold text-2xl tabular-nums', meta.color)}>
                  {meta.tradePct}<span className="text-sm">%</span>
                </div>
              </div>
              <button
                onClick={() => toggleBlock(active)}
                className={cn(
                  'px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all',
                  blocked.has(active)
                    ? 'bg-status-ok text-bg shadow-glow hover:scale-[0.99]'
                    : 'bg-status-danger text-bg shadow-glow hover:scale-[1.02] active:scale-[0.98]'
                )}
              >
                <Icon name={blocked.has(active) ? 'check' : 'bolt'} size={14} strokeWidth={2.5} />
                {blocked.has(active) ? 'שחרר נתיב' : 'חסום נתיב'}
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="surface p-3 rounded-lg">
              <div className="text-sm font-display font-semibold text-fg-muted mb-0.5 tracking-wider">רוחב גיאוגרפי</div>
              <div className="text-sm text-fg font-medium">{meta.width}</div>
            </div>
            <div className="surface p-3 rounded-lg">
              <div className="text-sm font-display font-semibold text-fg-muted mb-0.5 tracking-wider">עומק / שוקע</div>
              <div className="text-sm text-fg font-medium">{meta.depth}</div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className={cn('text-sm font-display font-semibold mb-1 tracking-wider', meta.color)}>מה עובר שם</div>
              <p className="text-sm text-fg leading-relaxed">{meta.whatPasses}</p>
            </div>
            <div>
              <div className="text-sm font-display font-semibold text-status-warn mb-1 tracking-wider">איומים</div>
              <p className="text-sm text-fg-muted leading-relaxed">{meta.threats}</p>
            </div>
            <div className="pt-3 border-t border-border-subtle">
              <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">אירועים בולטים</div>
              <p className="text-sm text-fg-muted leading-relaxed italic">{meta.incidents}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* All chokepoints grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-12">
        {CHOKEPOINTS.map((c) => {
          const isActive = active === c.id;
          const isBlocked = blocked.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={cn(
                'surface p-3 text-right transition-all rounded-xl',
                isActive ? 'border-accent shadow-glow bg-accent/5' : 'hover:border-border-strong',
                isBlocked && 'border-status-danger/40 bg-status-danger/5'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={cn('size-2 rounded-full', isBlocked ? 'bg-status-danger' : 'bg-current', c.color)} />
                <div className={cn('font-display font-bold text-xs leading-tight', isActive && c.color)}>
                  {c.label}
                </div>
              </div>
              <div className="text-[10px] font-mono text-fg-dim">{c.english}</div>
              <div className="text-[10px] font-mono text-fg mt-1">{c.tradePct}% סחר</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function WorldMap({
  chokepoints,
  active,
  blocked,
  onSelect,
}: {
  chokepoints: Chokepoint[];
  active: ChokepointId;
  blocked: Set<ChokepointId>;
  onSelect: (id: ChokepointId) => void;
}) {
  return (
    <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
      <svg viewBox="0 0 100 56" className="w-full h-full">
        <defs>
          <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dde6f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="56" fill="url(#ocean)" />

        {/* Simplified continents */}
        {/* North America */}
        <path d="M5 18 L18 14 L26 22 L24 32 L18 38 L10 42 L5 38 L4 28 Z" className="fill-terrain-sand/40 stroke-terrain-sand/70" strokeWidth="0.2" />
        {/* South America */}
        <path d="M22 38 L28 38 L30 46 L26 54 L24 54 L21 46 Z" className="fill-terrain-sand/40 stroke-terrain-sand/70" strokeWidth="0.2" />
        {/* Europe */}
        <path d="M44 18 L52 14 L56 18 L54 26 L48 30 L42 28 L42 22 Z" className="fill-terrain-sand/40 stroke-terrain-sand/70" strokeWidth="0.2" />
        {/* Africa */}
        <path d="M46 30 L54 28 L58 32 L60 42 L56 50 L50 52 L46 48 L44 38 Z" className="fill-terrain-sand/40 stroke-terrain-sand/70" strokeWidth="0.2" />
        {/* Middle East / Asia */}
        <path d="M56 22 L70 20 L82 22 L88 28 L86 36 L80 40 L72 36 L64 32 L58 32 Z" className="fill-terrain-sand/40 stroke-terrain-sand/70" strokeWidth="0.2" />
        {/* Southeast Asia */}
        <path d="M74 40 L82 42 L84 48 L80 52 L74 50 L72 44 Z" className="fill-terrain-sand/40 stroke-terrain-sand/70" strokeWidth="0.2" />
        {/* Australia */}
        <path d="M82 50 L90 50 L92 54 L86 54 Z" className="fill-terrain-sand/40 stroke-terrain-sand/70" strokeWidth="0.2" />

        {/* Major shipping lanes */}
        {[
          'M14 38 Q 22 45 28 50', // Americas
          'M30 40 Q 35 36 50 38 Q 60 39 72 45 Q 78 48 84 50', // South route
          'M48 26 Q 52 32 55 38 Q 58 44 56 47', // Med to Suez
          'M55 38 Q 60 40 70 42 Q 78 45 84 50', // Asia route
        ].map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            className="stroke-accent"
            strokeWidth="0.3"
            strokeDasharray="1 0.8"
            opacity="0.5"
          />
        ))}

        {/* Animated ship blip */}
        <motion.circle
          r="0.6"
          className="fill-accent"
          animate={{ offsetDistance: ['0%', '100%'] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          style={{
            offsetPath: 'path("M30 40 Q 35 36 50 38 Q 60 39 72 45 Q 78 48 84 50")',
          }}
        />

        {/* Chokepoint markers */}
        {chokepoints.map((c) => {
          const isActive = active === c.id;
          const isBlocked = blocked.has(c.id);
          return (
            <g
              key={c.id}
              onClick={() => onSelect(c.id)}
              style={{ cursor: 'pointer' }}
            >
              {/* Pulse ring on active or blocked */}
              {(isActive || isBlocked) && (
                <circle
                  cx={c.position.x}
                  cy={c.position.y}
                  r="3"
                  fill="none"
                  className={isBlocked ? 'stroke-status-danger' : 'stroke-accent'}
                  strokeWidth="0.3"
                >
                  <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0;0.9" dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Marker */}
              <circle
                cx={c.position.x}
                cy={c.position.y}
                r={isActive ? 1.6 : 1.2}
                className={cn(
                  isBlocked ? 'fill-status-danger stroke-status-danger' : 'stroke-current',
                  c.color
                )}
                stroke="#ffffff"
                strokeWidth="0.4"
              />

              {/* X mark on blocked */}
              {isBlocked && (
                <g>
                  <line x1={c.position.x - 0.9} y1={c.position.y - 0.9} x2={c.position.x + 0.9} y2={c.position.y + 0.9} className="stroke-bg" strokeWidth="0.5" strokeLinecap="round" />
                  <line x1={c.position.x - 0.9} y1={c.position.y + 0.9} x2={c.position.x + 0.9} y2={c.position.y - 0.9} className="stroke-bg" strokeWidth="0.5" strokeLinecap="round" />
                </g>
              )}

              {/* Label */}
              <text
                x={c.position.x}
                y={c.position.y - 3}
                textAnchor="middle"
                className={cn('font-display font-bold', isBlocked ? 'fill-status-danger' : c.color)}
                fontSize="2.4"
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth="0.85"
                strokeLinejoin="round"
              >
                {c.label}
              </text>
              <text
                x={c.position.x}
                y={c.position.y + 4.5}
                textAnchor="middle"
                className="fill-fg-dim font-display font-bold"
                fontSize="1.8"
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth="0.7"
                strokeLinejoin="round"
              >
                {c.tradePct}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}