'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

type CountryExample = {
  id: string;
  name: string;
  depth: number; // km
  doctrine: string;
  example: string;
};

const COUNTRIES: CountryExample[] = [
  { id: 'israel',   name: 'ישראל (אזור צר)',   depth: 14,   doctrine: 'התקפי מקדים — נשק קצר טווח', example: 'אי אפשר לאבד שום ק"מ. דוקטרינת "להעביר את המלחמה לשטח האויב" — חיל אוויר, יחידות מיוחדות.' },
  { id: 'lebanon',  name: 'לבנון',              depth: 80,   doctrine: 'הגנה מרובדת',                   example: 'מספיק עומק לעשות נסיגה הדרגתית, אבל לא מספיק לקרבות גדולים. הצבא נשען על טופוגרפיה (הרים).' },
  { id: 'ukraine',  name: 'אוקראינה',          depth: 600,  doctrine: 'הגנה במרחב + נסיגה מבוקרת',     example: 'במלחמה 2022 — איבדו ערים אבל לא קרסו. עומק = זמן לארגן מחדש, לקבל סיוע, ולהפעיל גישה לוחמתית גמישה.' },
  { id: 'russia',   name: 'רוסיה',              depth: 4000, doctrine: 'נסיגה אסטרטגית עמוקה',          example: 'אפשר לאבד עיר אחר עיר ועדיין לנצח. נפוליאון 1812 והיטלר 1941–43 שניהם הוכרעו ע"י העומק.' },
  { id: 'usa',      name: 'ארה"ב',              depth: 4500, doctrine: 'הגנה רחוקה (Far Forward)',      example: 'הקרב מתנהל באוקיינוס מרחוק. אזרחים בלוס אנג\'לס לא מודעים לקיומה של מלחמה. עומק = רגיעה.' },
];

export function DepthScene() {
  const [depth, setDepth] = useState(80);

  // Calculations
  const enemySpeed = 30; // km/day for ground advance
  const daysToCapital = Math.max(0.5, depth / enemySpeed);

  const doctrine: 'offensive' | 'layered' | 'flexible' | 'absorptive' =
    depth < 30 ? 'offensive' : depth < 200 ? 'layered' : depth < 1000 ? 'flexible' : 'absorptive';

  const doctrineMeta = {
    offensive:  { label: 'התקפית מקדימה',     color: 'text-status-danger', bg: 'bg-status-danger/10', desc: 'אין זמן לסגת. חייבים להעביר את המלחמה לשטח האויב לפני שמגיעים אלינו.' },
    layered:    { label: 'הגנה מרובדת',       color: 'text-status-warn',   bg: 'bg-status-warn/10',   desc: 'מספיק זמן לקווי הגנה מרובדים — אבל לא לאסטרטגית "נסיגה אסטרטגית". מבוסס טופוגרפיה.' },
    flexible:   { label: 'הגנה גמישה',         color: 'text-accent',         bg: 'bg-accent/10',         desc: 'אפשר לסגת מסודר, להקים קווים חדשים, להפעיל גישה לוחמתית גמישה. זמן לקבל סיוע בינלאומי.' },
    absorptive: { label: 'נסיגה אסטרטגית',     color: 'text-status-ok',      bg: 'bg-status-ok/10',      desc: 'מספיק עומק לבלוע את המתקפה כולה. האויב נשחק, מסלולי האספקה שלו נמתחים, ובסוף קורס.' },
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
        title={
          <>
            <span className="gradient-text">עומק = זמן</span>. זמן = ניצחון.
          </>
        }
        intro={`כל קילומטר בין הגבול ללב המדינה הוא שעה נוספת לקבל החלטה. בוא נראה איך אותה מתקפה נראית אחרת ב-14 ק"מ עומק לעומת 4,000 ק"מ.`}
      />

      <div className="surface-elevated p-5 mb-6 border-r-4 border-r-accent-cool">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">עומק אסטרטגי (Strategic Depth)</strong> — המרחק הגיאוגרפי מקו החזית עד למרכזי החיים והתשתיות הלאומיות. הוא קובע:
            <strong className="text-fg block mt-1.5">1. כמה זמן יש לקבל החלטות.</strong>
            <strong className="text-fg block">2. עד כמה אפשר לסגת לפני שמפסידים את הבירה.</strong>
            <strong className="text-fg block">3. אילו אסטרטגיות בכלל אפשריות.</strong>
          </div>
        </div>
      </div>

      {/* Main interactive */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch mb-12">
        {/* Visualization */}
        <div className="surface-elevated p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-[10px] font-mono text-fg-dim tracking-widest uppercase">
              חתך אופקי של המדינה
            </div>
            <div className={cn('chip', dm.bg, dm.color, 'border-current/40')}>
              <Icon name="shield" size={12} strokeWidth={2.5} />
              <span className="font-mono">{dm.label}</span>
            </div>
          </div>

          <DepthVisualization depth={depth} doctrine={doctrine} />

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="surface p-2 rounded-lg text-center">
              <div className="text-[10px] font-mono text-fg-dim">עומק</div>
              <div className="font-display font-bold text-lg text-accent tabular-nums">{depth} ק"מ</div>
            </div>
            <div className="surface p-2 rounded-lg text-center">
              <div className="text-[10px] font-mono text-fg-dim">זמן לבירה</div>
              <div className={cn('font-display font-bold text-lg tabular-nums', daysToCapital < 1 ? 'text-status-danger' : daysToCapital < 5 ? 'text-status-warn' : 'text-status-ok')}>
                {daysToCapital < 1 ? `${Math.round(daysToCapital * 24)} שעות` : `${Math.round(daysToCapital)} ימים`}
              </div>
            </div>
            <div className="surface p-2 rounded-lg text-center">
              <div className="text-[10px] font-mono text-fg-dim">קו דומה</div>
              <div className="font-display font-bold text-sm text-fg">{closestCountry.name}</div>
            </div>
          </div>
        </div>

        {/* Controls + doctrine */}
        <div className="space-y-3">
          <div className="surface-elevated p-5 rounded-2xl">
            <div className="text-[10px] font-mono text-fg-dim tracking-widest uppercase mb-3">
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
            <div className="flex justify-between text-[10px] font-mono text-fg-dim mt-1">
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
                    'px-1.5 py-1 rounded-md text-[10px] font-mono border transition-colors text-center',
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
              <div className={cn('text-[10px] font-mono mb-1 tracking-widest uppercase', dm.color)}>
                הדוקטרינה הנדרשת
              </div>
              <div className={cn('font-display font-bold text-lg leading-tight mb-1', dm.color)}>
                {dm.label}
              </div>
              <p className="text-xs text-fg-muted leading-relaxed">{dm.desc}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <SoftDivider text="5 דוגמאות לעומק אסטרטגי בעולם" />

      {/* Country comparison */}
      <div className="space-y-3">
        {COUNTRIES.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.06 }}
            className="surface p-4 rounded-xl flex items-center gap-4 flex-wrap"
          >
            <div className="shrink-0 w-32">
              <div className="font-display font-bold text-sm">{c.name}</div>
              <div className="text-[10px] font-mono text-fg-dim">{c.depth.toLocaleString()} ק"מ</div>
            </div>
            {/* Bar */}
            <div className="flex-1 min-w-[180px]">
              <div className="h-2 bg-bg-accent rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    c.depth < 30 ? 'bg-status-danger' :
                    c.depth < 200 ? 'bg-status-warn' :
                    c.depth < 1000 ? 'bg-accent' :
                    'bg-status-ok'
                  )}
                  style={{ width: `${Math.min(100, (c.depth / 4500) * 100)}%` }}
                />
              </div>
            </div>
            {/* Doctrine */}
            <div className="text-xs text-fg-muted shrink-0 max-w-md">
              <strong className="text-fg block">{c.doctrine}.</strong>
              {c.example}
            </div>
          </motion.div>
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
    <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
      <svg viewBox="0 0 100 56" className="w-full h-full">
        <defs>
          <linearGradient id="depth-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dde6f0" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="56" fill="url(#depth-bg)" />

        {/* Enemy territory (left of border) */}
        <rect x="0" y="0" width={borderX} height="56" className="fill-status-danger/10" />
        <text x={borderX / 2} y="9" textAnchor="middle" className="fill-status-danger font-mono font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
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
        <text x={borderX + 4} y="50" textAnchor="middle" className="fill-status-danger font-mono" fontSize="2.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.75" strokeLinejoin="round">
          התקפה
        </text>

        {/* Time-to-capital indicator on right */}
        {doctrine === 'offensive' && (
          <text x="50" y="9" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
            ⚠ אין זמן לסגת!
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
      <span className="text-xs font-mono text-fg-dim tracking-widest uppercase">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
