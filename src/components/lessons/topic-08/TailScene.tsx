'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

export function TailScene() {
  const [depth, setDepth] = useState(150); // km into enemy territory
  const [secured, setSecured] = useState(40); // % of tail secured (0-100)

  // Calculations
  const baseTrucks = 80;
  const trucksInPipeline = Math.round(baseTrucks + depth * 0.35);
  const vulnerableFraction = Math.max(0, 1 - secured / 100);
  const vulnerableTrucks = Math.round(trucksInPipeline * vulnerableFraction);
  const daysReserve = Math.max(0.5, Math.min(7, (10 - depth / 100) * (secured / 50 + 0.5))).toFixed(1);

  // Status classification
  const riskScore = depth * vulnerableFraction;
  const status: 'safe' | 'caution' | 'high' | 'critical' =
    riskScore < 50 ? 'safe' : riskScore < 150 ? 'caution' : riskScore < 280 ? 'high' : 'critical';

  const statusMeta = {
    safe: { label: 'מצב בטוח', color: 'text-status-ok', bg: 'bg-status-ok/10', border: 'border-status-ok/40', msg: 'המצב בשליטה. שרשרת האספקה זורמת לחזית ללא הפרעות.' },
    caution: { label: 'נורת אזהרה', color: 'text-status-warn', bg: 'bg-status-warn/10', border: 'border-status-warn/40', msg: 'הקו מתחיל להתארך ויש פערים. חייבים לתגבר את השמירה על הצירים.' },
    high: { label: 'סיכון גבוה', color: 'text-accent-hot', bg: 'bg-accent-hot/10', border: 'border-accent-hot/40', msg: 'קו האספקה ארוך וחשוף. חוליות אויב ("ציידים") כבר אורבות בדרך.' },
    critical: { label: 'מצב קריטי!', color: 'text-status-danger', bg: 'bg-status-danger/10', border: 'border-status-danger/40', msg: 'הקו פרוץ לחלוטין ויש סכנת קריסה מיידית. חובה להאט את ההתקדמות ולטפל באבטחה.' },
  };

  const sm = statusMeta[status];

  return (
    <section id="scene-tail" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="08.2"
        eyebrow="הבטן הלוגיסטית"
title = {
  <>
    ככל ש<span className="text-accent-hover">מתקדמים עמוק יותר</span> — משלמים יותר על כל קילומטר
  </>
}
        intro="להתקדם עמוק לשטח האויב דורש יותר מסתם אומץ – זה דורש חישוב קר. על כל קילומטר שנתקדם, נצטרך לשלוח עוד משאיות על הכביש כדי להעביר את הציוד, וכל משאית כזו הופכת למטרה קלה. בואו נראה איך זה עובד במספרים."
      />

      <div className="grid md:grid-cols-2 gap-4 mb-12 items-stretch">
        <div className="surface-elevated p-5 rounded-2xl">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-accent mb-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            השיטה
          </div>
          <h3 className="font-display font-bold text-lg leading-tight text-accent-hover mb-2">
            דחיפה · Push Logistics
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            הציוד נשלח באופן רציף מהעורף אל החזית, כמו <strong className="text-fg">סרט נע</strong>. עובד מצוין בשטח שלנו — אבל כשמתקדמים לעומק שטח האויב, הקו הארוך הופך לנקודת תורפה רצינית.
          </p>
        </div>
        <div className="surface-elevated p-5 rounded-2xl">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-accent mb-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            האיום
          </div>
          <h3 className="font-display font-bold text-lg leading-tight text-accent-hover mb-2">
            "ציידי לוגיסטיקה"
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            חוליות קטנות ומהירות של האויב שמסתובבות מאחורי הגב שלנו. הן לא מנסות להילחם בכוח המרכזי בחזית — רק תוקפות משאיות אספקה. <strong className="text-fg">חוליה של 20 לוחמים יכולה לשתק כוח של 10,000 חיילים</strong>.
          </p>
        </div>
      </div>

      {/* Main visualization */}
      <div className="surface-elevated p-4 rounded-2xl mb-6 overflow-hidden">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
            אורך הבטן הלוגיסטית · {depth} ק"מ
          </div>
          <div className={cn('chip', sm.border, sm.bg, sm.color)}>
            <Icon name={status === 'safe' ? 'check' : 'spark'} size={12} strokeWidth={2.5} />
            <span className="font-display font-medium tracking-wide">{sm.label}</span>
          </div>
        </div>

        <TailViz depth={depth} secured={secured} status={status} trucksInPipeline={trucksInPipeline} />

        {/* Legend — carries the zone/raider meaning outside the crowded
            diagram center, so the belly reads correctly even when a short
            zone hides its in-diagram word. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-[11px] font-display font-medium text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-status-ok/40 border border-status-ok/60" aria-hidden />
            אזור מאובטח — שיירות מוגנות
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-status-danger/40 border border-status-danger/60" aria-hidden />
            בטן חשופה — ציד לוגיסטי
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="10" height="9" viewBox="0 0 10 9" aria-hidden className="shrink-0">
              <path d="M1 8 L9 8 L5 1 Z" className="fill-status-danger" />
            </svg>
            חוליית אויב
          </span>
        </div>

        <p className={cn('text-sm leading-relaxed mt-3', sm.color)}>{sm.msg}</p>
      </div>

      {/* Stats + Controls */}
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-stretch mb-12">
        {/* Controls */}
        <div className="space-y-3">
          <div className="surface-elevated p-5 rounded-2xl">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-3">
              מרחק ההתקדמות לעומק שטח האויב
            </div>
            <div className="font-display font-bold text-3xl tabular-nums text-accent mb-3">
              {depth}<span className="text-sm text-fg-muted ms-1">ק"מ</span>
            </div>
            <input
              type="range"
              min={20}
              max={500}
              step={10}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full accent-accent"
              aria-label="עומק חדירה"
            />
            <div className="flex justify-between text-[10px] font-display font-medium tracking-wide text-fg-dim mt-1">
              <span>20</span>
              <span>150</span>
              <span>300</span>
              <span>500</span>
            </div>
          </div>

          <div className="surface-elevated p-5 rounded-2xl">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-3">
              רמת האבטחה על הציר (כמה מהדרך מאובטחת?)
            </div>
            <div className="font-display font-bold text-3xl tabular-nums text-accent mb-3">
              {secured}<span className="text-sm text-fg-muted ms-1">%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={secured}
              onChange={(e) => setSecured(Number(e.target.value))}
              className="w-full accent-accent"
              aria-label="% אבטחה"
            />
            <div className="text-[11px] text-fg-muted mt-2 leading-relaxed">
              פחות אבטחה = חוליות האויב חוגגות על קווי האספקה שלנו. יותר אבטחה = נצטרך להשאיר חיילים מאחור כדי לשמור עליהם, מה שאומר שיהיו לנו פחות לוחמים בחזית.
            </div>
          </div>
        </div>

        {/* Stats panel */}
        <div className="surface-elevated p-5 rounded-2xl">
          <div className="text-sm font-display font-semibold text-fg-muted mb-4 tracking-wider">
            המחיר בשטח (ההשפעה על הכוחות)
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="משאיות בדרך"
              value={trucksInPipeline}
              unit=""
              hint="כלי רכב שחייבים להיות בתנועה מתמדת כדי לספק ציוד"
              color="text-accent"
            />
            <StatCard
              label="משאיות בסכנה"
              value={vulnerableTrucks}
              unit=""
              hint={`נמצאות בשטח ללא שמירה (${Math.round(vulnerableFraction * 100)}% לא מאובטח)`}
              color={vulnerableFraction > 0.5 ? 'text-status-danger' : vulnerableFraction > 0.3 ? 'text-status-warn' : 'text-status-ok'}
            />
            <StatCard
              label="רזרבות"
              value={Number(daysReserve)}
              unit="ימים"
              hint="כמה ימים החיילים ישרדו אם קו האספקה ינותק עכשיו"
              color={Number(daysReserve) < 2 ? 'text-status-danger' : Number(daysReserve) < 4 ? 'text-status-warn' : 'text-status-ok'}
            />
            <StatCard
              label="זמן נסיעה"
              value={Math.round(depth / 30 * 2)}
              unit="שעות"
              hint="כמה שעות לוקח למשאית לעשות הלוך-חזור"
              color="text-fg"
            />
          </div>

          <div className="mt-4 pt-4 border-t border-border-subtle">
            <div className="text-sm font-display font-semibold text-fg-muted mb-2 tracking-wider">
              דילמת המפקד
            </div>
            <p className="text-xs text-fg-muted leading-relaxed">
              ככל שנתקדם יותר, נצטרך יותר משאיות על הכביש. כדי להגן עליהן, נהיה חייבים להציב חיילים לאורך הדרך – המשמעות היא פחות לוחמים בחזית.
              <strong className="text-fg block mt-1.5">החלטה אסטרטגית:</strong> על כמה כוח אש אנחנו מוכנים לוותר בחזית הקרב, כדי להבטיח שהאוכל והתחמושת ימשיכו להגיע?
            </p>
          </div>
        </div>
      </div>

      {/* Push vs Pull comparison */}
      <SoftDivider text="דחיפה (Push) מול משיכה (Pull) · שתי גישות לניהול הלוגיסטיקה" />

      <div className="grid md:grid-cols-2 gap-4 mb-10">
        <div className="">
          <div className="flex items-center gap-2.5 mb-3">
            <Icon name="arrow-left" size={32} className="text-accent shrink-0" />
            <div>
              <div className="font-display font-bold text-lg text-accent leading-tight">Push Logistics</div>
              <div className="text-[10px] font-display font-medium tracking-wide text-fg-dim">דחיפה מהעורף</div>
            </div>
          </div>
          <p className="text-sm text-fg leading-relaxed mb-3">
            שולחים ציוד כל הזמן מראש, לפי הערכה של מה שהחיילים יצטרכו. זה מבטיח שפע, אבל ככל שמתקדמים – קשה יותר לאבטח את השיירות.
          </p>
          <ul className="space-y-1.5 text-xs">
            <li className="flex gap-2"><Icon name="check" size={12} strokeWidth={2.5} className="text-status-ok shrink-0 mt-0.5" /><span className="text-fg-muted">זרם אספקה חזק וקבוע.</span></li>
            <li className="flex gap-2"><Icon name="check" size={12} strokeWidth={2.5} className="text-status-ok shrink-0 mt-0.5" /><span className="text-fg-muted">מעולה כשהחזית בקושי זזה (מלחמת חפירות למשל).</span></li>
            <li className="flex gap-2"><Icon name="spark" size={12} strokeWidth={2.5} className="text-status-warn shrink-0 mt-0.5" /><span className="text-fg-muted">מסוכן מאוד כשהכוחות מתקדמים מהר לעומק האויב.</span></li>
          </ul>
        </div>

        <div className="">
          <div className="flex items-center gap-2.5 mb-3">
            <Icon name="arrow-right" size={32} className="text-accent-cool shrink-0" />
            <div>
              <div className="font-display font-bold text-lg text-accent-cool leading-tight">Pull Logistics</div>
              <div className="text-[10px] font-display font-medium tracking-wide text-fg-dim">משיכה (דרישה מהחזית)</div>
            </div>
          </div>
          <p className="text-sm text-fg leading-relaxed mb-3">
            החיילים בחזית מזמינים בדיוק את מה שחסר להם באותו רגע. זה חוסך משאיות על הכביש, אבל דורש תקשורת מעולה ומחסנים קרובים.
          </p>
          <ul className="space-y-1.5 text-xs">
            <li className="flex gap-2"><Icon name="check" size={12} strokeWidth={2.5} className="text-status-ok shrink-0 mt-0.5" /><span className="text-fg-muted">אין משאיות מיותרות על הכביש.</span></li>
            <li className="flex gap-2"><Icon name="check" size={12} strokeWidth={2.5} className="text-status-ok shrink-0 mt-0.5" /><span className="text-fg-muted">פחות מטרות ש"ציידי האויב" יכולים לתקוף.</span></li>
            <li className="flex gap-2"><Icon name="spark" size={12} strokeWidth={2.5} className="text-status-warn shrink-0 mt-0.5" /><span className="text-fg-muted">תלות מוחלטת בתקשורת מהירה ואמינה (אם אין קשר – אין אספקה).</span></li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function TailViz({
  depth,
  secured,
  status,
  trucksInPipeline,
}: {
  depth: number;
  secured: number;
  status: 'safe' | 'caution' | 'high' | 'critical';
  trucksInPipeline: number;
}) {
  // Scale depth (20-500) to x position of the front (24.7-90)
  const frontX = 22 + (depth / 500) * 68;
  const baseX = 8;
  const routeY = 30; // supply-route centerline

  // How many trucks to render along the route (capped for visual)
  const shownTrucks = Math.min(14, Math.max(3, Math.round(trucksInPipeline / 12)));
  const truckPositions = Array.from({ length: shownTrucks }, (_, i) => {
    const t = (i + 0.5) / shownTrucks;
    return baseX + t * (frontX - baseX);
  });

  // Secured zone is from base outward (left portion); the rest is exposed.
  const securedEndX = baseX + ((frontX - baseX) * secured) / 100;
  const securedW = securedEndX - baseX;
  const vulnW = frontX - securedEndX;
  const atRisk = Math.round((1 - secured / 100) * trucksInPipeline);

  return (
    <div className="aspect-[16/9] relative rounded-xl overflow-hidden bg-bg-accent/40">
      <svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
        {/* Parent div carries `bg-bg-accent/40` — no internal gradient rect needed. */}

        {/* Background terrain (kept low so it never crosses the label lanes) */}
        <path d="M0 48 L25 46 L45 47 L65 45 L85 47 L100 46 L100 56 L0 56 Z" className="fill-terrain-sand/20" />

        {/* Summary line (top lane) */}
        <text x="50" y="9" textAnchor="middle" className="fill-fg-muted font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
          {trucksInPipeline} משאיות בצינור · {atRisk} בסיכון
        </text>

        {/* Secured zone (green band) */}
        {securedW > 0.5 && (
          <rect x={baseX} y="23" width={securedW} height="14" className="fill-status-ok" opacity="0.15" />
        )}
        {/* Vulnerable zone (red band) */}
        {vulnW > 0.5 && (
          <rect x={securedEndX} y="23" width={vulnW} height="14" className="fill-status-danger" opacity="0.13" />
        )}

        {/* Supply route line */}
        <line x1={baseX} y1={routeY} x2={frontX} y2={routeY} className="stroke-accent" strokeWidth="0.5" strokeDasharray="2 1" />

        {/* Endpoint labels (top lane) — name + km stacked above each end.
            baseX is fixed and frontX >= 24.7, so these never overlap. */}
        <text x={baseX} y="15" textAnchor="middle" className="fill-accent-cool font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">בסיס</text>
        <text x={baseX} y="19" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">0 ק"מ</text>
        <text x={frontX} y="15" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">חזית</text>
        <text x={frontX} y="19" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">{depth} ק"מ</text>

        {/* Base marker */}
        <g>
          <rect x={baseX - 4} y={routeY - 3} width="8" height="6" rx="0.8" className="fill-accent-cool" />
          <rect x={baseX - 3} y={routeY - 1.5} width="2" height="3" className="fill-bg" />
          <rect x={baseX} y={routeY - 1.5} width="2" height="3" className="fill-bg" />
        </g>

        {/* Supply trucks along route */}
        {truckPositions.map((x, i) => {
          const isSecure = x <= securedEndX;
          return (
            <g key={i}>
              <rect x={x - 1.4} y={routeY - 0.85} width="2.8" height="1.7" rx="0.3" className={isSecure ? 'fill-accent' : 'fill-status-warn'} />
              <circle cx={x - 0.8} cy={routeY + 0.65} r="0.4" className="fill-fg" />
              <circle cx={x + 0.8} cy={routeY + 0.65} r="0.4" className="fill-fg" />
              {!isSecure && status !== 'safe' && (
                <circle cx={x} cy={routeY - 2.5} r="0.4" className="fill-status-danger">
                  <animate attributeName="opacity" values="1;0.2;1" dur="1.4s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* Front marker */}
        <g>
          <circle cx={frontX} cy={routeY} r="2.4" className="fill-accent-hot" />
          <circle cx={frontX} cy={routeY} r="3.8" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
            <animate attributeName="r" values="3;6;3" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Logistics raiders — label-free triangles inside the exposed belly.
            Their meaning is carried by the legend below the diagram. */}
        {vulnW > 6 && status !== 'safe' && (
          <>
            {[0.38, 0.72].map((f, i) => {
              const rx = securedEndX + vulnW * f;
              return (
                <path key={i} d={`M${rx - 1.3} 34 L${rx + 1.3} 34 L${rx} 31 Z`} className="fill-status-danger">
                  <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />
                </path>
              );
            })}
          </>
        )}

        {/* Zone brackets + short words (bottom lane). Words are width-gated
            so a narrow zone drops its word instead of overlapping. */}
        {securedW > 2 && <ZoneBracket x1={baseX} x2={securedEndX} y={40} className="stroke-status-ok" />}
        {vulnW > 2 && <ZoneBracket x1={securedEndX} x2={frontX} y={40} className="stroke-status-danger" />}
        {securedW >= 12 && (
          <text x={baseX + securedW / 2} y="45.5" textAnchor="middle" className="fill-status-ok font-display font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">מאובטח</text>
        )}
        {vulnW >= 9 && (
          <text x={securedEndX + vulnW / 2} y="45.5" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">חשוף</text>
        )}
      </svg>
    </div>
  );
}

function ZoneBracket({
  x1,
  x2,
  y,
  className,
}: {
  x1: number;
  x2: number;
  y: number;
  className: string;
}) {
  return (
    <g className={className} strokeWidth="0.4" strokeLinecap="round">
      <line x1={x1 + 0.4} y1={y} x2={x2 - 0.4} y2={y} />
      <line x1={x1 + 0.4} y1={y - 1.2} x2={x1 + 0.4} y2={y} />
      <line x1={x2 - 0.4} y1={y - 1.2} x2={x2 - 0.4} y2={y} />
    </g>
  );
}

function StatCard({
  label,
  value,
  unit,
  hint,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  hint: string;
  color: string;
}) {
  return (
    <div className="surface p-3 rounded-lg">
      <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">{label}</div>
      <div className={cn('font-display font-bold text-2xl tabular-nums', color)}>
        {value}<span className="text-xs text-fg-muted ms-1">{unit}</span>
      </div>
      <div className="text-[10px] text-fg-dim mt-0.5 leading-snug">{hint}</div>
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