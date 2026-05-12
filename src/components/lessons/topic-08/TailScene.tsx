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
safe: { label: 'בטוח', color: 'text-status-ok', bg: 'bg-status-ok/10', border: 'border-status-ok/40', msg: 'בטן לוגיסטית תקינה. אספקה זורמת.' },
caution: { label: 'זהירות', color: 'text-status-warn', bg: 'bg-status-warn/10', border: 'border-status-warn/40', msg: 'מתחילים להיווצר פערים. אבטחת כבישים חיונית.' },
high: { label: 'סיכון גבוה', color: 'text-accent-hot', bg: 'bg-accent-hot/10', border: 'border-accent-hot/40', msg: 'הבטן ארוכה ופגיעה. ציידי לוגיסטיקה ממשיים.' },
critical: { label: 'קריטי', color: 'text-status-danger', bg: 'bg-status-danger/10', border: 'border-status-danger/40', msg: 'הזנב פעור. סכנת קריסה לוגיסטית — האטה חיונית.' },
 };
const sm = statusMeta[status];
return (
 <section id="scene-tail" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <SceneHeader
step="08.2"
eyebrow="הבטן הלוגיסטית"
title={
 <>
 ככל ש<span className="gradient-text">חודרים</span> — הזנב מתארך
 </>
 }
intro="עומק חדירה זה לא רק אומץ. זה חישוב לוגיסטי קר. בכל קילומטר נוסף לתוך עומק האויב, מספר המשאיות בצינור גדל, וכל אחת מהן הופכת למטרה. בוא נכמת."
 />

 <div className="p-5 mb-6">
 <div className="flex gap-3 items-start">
 <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
 <div className="text-sm leading-relaxed">
 <strong className="text-fg">Push Logistics</strong> — הציוד"נדחף" מהעורף לחזית בצינור רציף. זה עובד מצוין בשטח שלך. בעומק אויב — הזנב הופך לפצע פתוח.
 <strong className="text-fg block mt-1.5">"ציידי לוגיסטיקה"</strong> — יחידות אויב קלות שמטיילות בעורף שלך, לא מתנגשות בכוח הראשי, רק חוטפות משאיות.
 יחידה אחת של 20 חיילים יכולה לשתק אוגדה של 10,000.
 </div>
 </div>
 </div>

 {/* Main visualization */}
 <div className="surface-elevated p-4 rounded-2xl mb-6 overflow-hidden">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 הבטן הלוגיסטית · {depth} ק"מ
 </div>
 <div className={cn('chip', sm.border, sm.bg, sm.color)}>
 <Icon name={status === 'safe' ? 'check' : 'spark'} size={12} strokeWidth={2.5} />
 <span className="font-mono">{sm.label}</span>
 </div>
 </div>

 <TailViz depth={depth} secured={secured} status={status} trucksInPipeline={trucksInPipeline} />

 <p className={cn('text-sm leading-relaxed mt-3', sm.color)}>{sm.msg}</p>
 </div>

 {/* Stats + Controls */}
 <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-stretch mb-12">
 {/* Controls */}
 <div className="space-y-3">
 <div className="surface-elevated p-5 rounded-2xl">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-3">
 עומק חדירה לעומק האויב
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
 <div className="flex justify-between text-[10px] font-mono text-fg-dim mt-1">
 <span>20</span>
 <span>150</span>
 <span>300</span>
 <span>500</span>
 </div>
 </div>

 <div className="surface-elevated p-5 rounded-2xl">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-3">
 אבטחת הציר (% מהבטן מוגן)
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
 אבטחה נמוכה = ציידי לוגיסטיקה חופשיים בעורף. אבטחה גבוהה = משאיות חיילים נוספות, פחות כוח לחזית.
 </div>
 </div>
 </div>

 {/* Stats panel */}
 <div className="surface-elevated p-5 rounded-2xl">
 <div className="text-sm font-display font-semibold text-fg-muted mb-4 tracking-wider">
 השפעה על הסד"כ
 </div>
 <div className="grid grid-cols-2 gap-3">
 <StatCard
label="משאיות בצינור"
value={trucksInPipeline}
unit=""
hint="כלי רכב בתנועה כדי לקיים את הזרימה"
color="text-accent"
 />
 <StatCard
label="משאיות חשופות"
value={vulnerableTrucks}
unit=""
hint={`${Math.round(vulnerableFraction * 100)}% לא מאובטח`}
color={vulnerableFraction > 0.5 ? 'text-status-danger' : vulnerableFraction > 0.3 ? 'text-status-warn' : 'text-status-ok'}
 />
 <StatCard
label="ימי רזרבה"
value={Number(daysReserve)}
unit="ימים"
hint="אספקה במחסני קצה אם הצינור ייקטע"
color={Number(daysReserve) < 2 ? 'text-status-danger' : Number(daysReserve) < 4 ? 'text-status-warn' : 'text-status-ok'}
 />
 <StatCard
label="זמן הגעה"
value={Math.round(depth / 30 * 2)}
unit="שעות"
hint="הלוך-חזור של משאית בודדת"
color="text-fg"
 />
 </div>

 <div className="mt-4 pt-4 border-t border-border-subtle">
 <div className="text-sm font-display font-semibold text-fg-muted mb-2 tracking-wider">
 משוואת המאזן
 </div>
 <p className="text-xs text-fg-muted leading-relaxed">
 ככל שמעמיקים — צריך יותר משאיות בצינור. אם רוצים שיותר מהן יהיו מוגנות — צריך יותר חיילים על הצירים, ופחות חיילים בחזית.
 <strong className="text-fg block mt-1.5">החלטה אסטרטגית:</strong> כמה חיילים אתה מוכן להוציא מהקרב כדי לשמור על הצינור?
 </p>
 </div>
 </div>
 </div>

 {/* Push vs Pull comparison */}
 <SoftDivider text="Push מול Pull · שתי דוקטרינות, שתי גישות" />

 <div className="grid md:grid-cols-2 gap-4 mb-10">
 <div className="">
 <div className="flex items-center gap-2.5 mb-3">
 <div className="size-12 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center shrink-0">
 <Icon name="arrow-left" size={22} className="text-accent" />
 </div>
 <div>
 <div className="font-display font-bold text-lg text-accent leading-tight">Push Logistics</div>
 <div className="text-[10px] font-mono text-fg-dim">דחיפה מהעורף</div>
 </div>
 </div>
 <p className="text-sm text-fg leading-relaxed mb-3">
 הציוד נדחף לחזית באופן רציף לפי תחזית צריכה. תזרים גבוה, אבל הזנב מתארך עם החדירה.
 </p>
 <ul className="space-y-1.5 text-xs">
 <li className="flex gap-2"><Icon name="check" size={12} strokeWidth={2.5} className="text-status-ok shrink-0 mt-0.5" /><span className="text-fg-muted">תזרים אספקה חזק וקבוע</span></li>
 <li className="flex gap-2"><Icon name="check" size={12} strokeWidth={2.5} className="text-status-ok shrink-0 mt-0.5" /><span className="text-fg-muted">אידיאלי לחזית סטטית</span></li>
 <li className="flex gap-2"><Icon name="spark" size={12} strokeWidth={2.5} className="text-status-warn shrink-0 mt-0.5" /><span className="text-fg-muted">פגיעות גוברת עם עומק חדירה</span></li>
 </ul>
 </div>

 <div className="">
 <div className="flex items-center gap-2.5 mb-3">
 <div className="size-12 rounded-xl bg-accent-cool/15 border border-accent-cool/40 flex items-center justify-center shrink-0">
 <Icon name="arrow-right" size={22} className="text-accent-cool" />
 </div>
 <div>
 <div className="font-display font-bold text-lg text-accent-cool leading-tight">Pull Logistics</div>
 <div className="text-[10px] font-mono text-fg-dim">דרישה מהחזית</div>
 </div>
 </div>
 <p className="text-sm text-fg leading-relaxed mb-3">
 החזית מבקשת בדיוק מה שהיא צריכה. תזרים נמוך אבל חכם. דורש רשת תקשורת אמינה ומחסני קצה.
 </p>
 <ul className="space-y-1.5 text-xs">
 <li className="flex gap-2"><Icon name="check" size={12} strokeWidth={2.5} className="text-status-ok shrink-0 mt-0.5" /><span className="text-fg-muted">מינימום משאיות מיותרות</span></li>
 <li className="flex gap-2"><Icon name="check" size={12} strokeWidth={2.5} className="text-status-ok shrink-0 mt-0.5" /><span className="text-fg-muted">פחות חשיפה ל"ציידי לוגיסטיקה"</span></li>
 <li className="flex gap-2"><Icon name="spark" size={12} strokeWidth={2.5} className="text-status-warn shrink-0 mt-0.5" /><span className="text-fg-muted">תלות בתקשורת ובמחסני קצה</span></li>
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
 // Scale depth (20-500) to x position of the front (50-92)
const frontX = 22 + (depth / 500) * 68;
const baseX = 8;

 // How many trucks to render along the route (capped for visual)
const shownTrucks = Math.min(14, Math.max(3, Math.round(trucksInPipeline / 12)));
const truckPositions = Array.from({ length: shownTrucks }, (_, i) => {
const t = (i + 0.5) / shownTrucks;
return baseX + t * (frontX - baseX);
 });

 // Secured zone is from base outward (left portion)
const securedEndX = baseX + ((frontX - baseX) * secured) / 100;
return (
 <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
 <svg viewBox="0 0 100 56" className="w-full h-full">
 <defs>
 <linearGradient id="tail-bg" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#f3f5f9" />
 <stop offset="100%" stopColor="#e6ebf2" />
 </linearGradient>
 </defs>

 <rect x="0" y="0" width="100" height="56" fill="url(#tail-bg)" />

 {/* Background terrain */}
 <path d="M0 42 L25 38 L45 41 L65 36 L85 40 L100 38 L100 56 L0 56 Z" className="fill-terrain-sand/20" />

 {/* Secured zone (green band) */}
 <rect x={baseX - 2} y="25" width={Math.max(0, securedEndX - baseX + 2)} height="14" className="fill-status-ok" opacity="0.15" />
 {securedEndX > baseX + 4 && (
 <text x={(baseX + securedEndX) / 2} y="22" textAnchor="middle" className="fill-status-ok font-display font-bold font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
 אזור מאובטח
 </text>
 )}

 {/* Vulnerable zone (red band) */}
 {securedEndX < frontX - 2 && (
 <>
 <rect x={securedEndX} y="25" width={frontX - securedEndX} height="14" className="fill-status-danger" opacity="0.12" />
 <text x={(securedEndX + frontX) / 2} y="22" textAnchor="middle" className="fill-status-danger font-display font-bold font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
 אזור פגיעות
 </text>
 </>
 )}

 {/* Supply route line */}
 <line x1={baseX} y1="32" x2={frontX} y2="32" className="stroke-accent" strokeWidth="0.5" strokeDasharray="2 1" />

 {/* Base marker */}
 <g>
 <rect x={baseX - 4} y="29" width="8" height="6" rx="0.8" className="fill-accent-cool" />
 <rect x={baseX - 3} y="30.5" width="2" height="3" className="fill-bg" />
 <rect x={baseX} y="30.5" width="2" height="3" className="fill-bg" />
 <text x={baseX} y="26" textAnchor="middle" className="fill-accent-cool font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">בסיס</text>
 <text x={baseX} y="42" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">0 ק"מ</text>
 </g>

 {/* Front marker */}
 <g>
 <circle cx={frontX} cy="32" r="2.4" className="fill-accent-hot" />
 <circle cx={frontX} cy="32" r="3.8" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
 <animate attributeName="r" values="3;6;3" dur="2.4s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
 </circle>
 <text x={frontX} y="26" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">חזית</text>
 <text x={frontX} y="42" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">{depth} ק"מ</text>
 </g>

 {/* Supply trucks along route */}
 {truckPositions.map((x, i) => {
const isSecure = x <= securedEndX;
return (
 <g key={i}>
 <rect x={x - 1.4} y="30.5" width="2.8" height="1.7" rx="0.3" className={isSecure ? 'fill-accent' : 'fill-status-warn'} />
 <circle cx={x - 0.8} cy="32.5" r="0.4" className="fill-fg" />
 <circle cx={x + 0.8} cy="32.5" r="0.4" className="fill-fg" />
 {!isSecure && status !== 'safe' && (
 <circle cx={x} cy="29" r="0.4" className="fill-status-danger">
 <animate attributeName="opacity" values="1;0.2;1" dur="1.4s" repeatCount="indefinite" />
 </circle>
 )}
 </g>
 );
 })}

 {/* Logistics raider markers (when vulnerable zone exists) */}
 {securedEndX < frontX - 3 && status !== 'safe' && (
 <>
 {[
 { x: securedEndX + (frontX - securedEndX) * 0.3, y: 49 },
 { x: securedEndX + (frontX - securedEndX) * 0.7, y: 49 },
 ].map((p, i) => (
 <g key={i}>
 <path d={`M${p.x - 1.5} ${p.y} L${p.x + 1.5} ${p.y} L${p.x} ${p.y - 2.5} Z`} className="fill-status-danger" />
 <text x={p.x} y={p.y + 3.5} textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="1.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.6" strokeLinejoin="round">
 צייד
 </text>
 </g>
 ))}
 </>
 )}

 {/* Truck count label */}
 <text x="50" y="9" textAnchor="middle" className="fill-fg-muted font-display font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
 {trucksInPipeline} משאיות בצינור · {Math.round((1 - secured / 100) * trucksInPipeline)} בסיכון
 </text>
 </svg>
 </div>
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
