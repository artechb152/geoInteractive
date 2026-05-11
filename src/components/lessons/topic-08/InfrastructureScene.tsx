'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type NodeId = 'port' | 'rail' | 'road' | 'air';

type NodeData = {
  id: NodeId;
  label: string;
  english: string;
  icon: IconName;
  capacity: number; // % of total
  vulnerability: string;
  role: string;
  strategic: string;
  position: { x: number; y: number };
  color: string;
};

const NODES: NodeData[] = [
  {
    id: 'port',
    label: 'נמל מים עמוקים',
    english: 'Deep-Water Port',
    icon: 'ship',
    capacity: 40,
    vulnerability: 'תעלה אחת לכניסה. מיקוש ימי, צוללות, או הטבעת ספינה אחת — שיתוק מלא.',
    role: 'קליטת ספינות אסטרטגיות: נושאות מטוסים, ספינות אספקה כבדות, מכליות.',
    strategic: 'שינוי במאזן הכוחות. שליטה בנמל = שליטה בים. ניתוק = שרשרת אספקה אסטרטגית קרסה.',
    position: { x: 18, y: 55 },
    color: 'text-terrain-sky',
  },
  {
    id: 'rail',
    label: 'מסילת רכבת',
    english: 'Rail Terminal',
    icon: 'box',
    capacity: 25,
    vulnerability: 'נקודות חציה ספציפיות (גשרים, מנהרות). הריסת גשר אחד = ימים-שבועות לשיקום.',
    role: 'שינוע טובין כבדים למרחקים ארוכים בעלות נמוכה. רכבת אחת = 100 משאיות.',
    strategic: 'גב הלוגיסטיקה האסטרטגית. בריה"מ ניצחה את גרמניה בעיקר בזכות הרכבת הסיבירית.',
    position: { x: 50, y: 50 },
    color: 'text-accent',
  },
  {
    id: 'road',
    label: 'כביש מהיר',
    english: 'Highway System',
    icon: 'truck',
    capacity: 25,
    vulnerability: 'המון נקודות תקיפה (גשרים, מחלפים, מנהרות). אבל ניתן לעקוף — הכי גמיש.',
    role: 'הזרמת ההמשכיות היומיומית. גמישות תפעולית עליונה. כל משאית עצמאית.',
    strategic: 'הכי גמיש להפעלה ולתיקון. אבל גם הכי איטי ויקר לכמויות גדולות.',
    position: { x: 75, y: 60 },
    color: 'text-accent-cool',
  },
  {
    id: 'air',
    label: 'שדה תעופה לוגיסטי',
    english: 'Logistics Airfield',
    icon: 'plane',
    capacity: 10,
    vulnerability: 'מסלול אחד או שניים. הריסת המסלול במכתשים = שיתוק עד לתיקון. כל מטוס יקר.',
    role: 'אספקה דחופה למרחקים ארוכים: דם, חלפים קריטיים, יחידות מיוחדות.',
    strategic: 'מהירות חסרת תקדים. עלות גבוהה ותפוקה נמוכה — לא לכמויות גדולות.',
    position: { x: 65, y: 18 },
    color: 'text-accent-hot',
  },
];

export function InfrastructureScene() {
  const [selected, setSelected] = useState<NodeId>('port');
  const [destroyed, setDestroyed] = useState<NodeId | null>(null);

  const meta = NODES.find((n) => n.id === selected)!;

  const remainingCapacity = destroyed
    ? 100 - (NODES.find((n) => n.id === destroyed)?.capacity || 0)
    : 100;

  return (
    <section id="scene-infrastructure" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="08.3"
        eyebrow="נמלים, מסופים וצמתים היברידיים"
        title={
          <>
            <span className="gradient-text">צומת אחד</span>. ארבעה ממדים.
          </>
        }
        intro="התשתיות החיוניות הן נקודות החיבור הגיאוגרפיות שבהן נפגשים ים, רכבת, כביש ואוויר. שליטה בצומת אחד = שליטה ברמה הלאומית. נטרול שלו = משבר אסטרטגי."
      />

      <div className="surface-elevated p-5 mb-6 border-r-4 border-r-accent-cool">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">מסוף תעבורה היברידי (Intermodal Hub)</strong> — צומת גיאוגרפי שמשלב מספר ממדי תחבורה בנקודה אחת:
            ים + רכבת + כביש + אוויר.
            <strong className="text-fg block mt-1.5">המשמעות הצבאית:</strong> תקיפה ממוקדת על צומת היברידי לא רק משתקת את האספקה לחזית — היא יכולה להוביל לשיתוק כלכלי לאומי.
            לכן נמלי מים עמוקים ומסופים היברידיים נחשבים <strong>יעדים אסטרטגיים</strong> ברמת המדינה.
          </div>
        </div>
      </div>

      {/* Main visualization + controls */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch mb-12">
        {/* Hub map */}
        <div className="surface-elevated p-4 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-[10px] font-mono text-fg-dim tracking-widest uppercase">
              צומת לוגיסטי לאומי · 4 ממדים
            </div>
            <div className={cn(
              'chip',
              destroyed ? 'border-status-danger/40 bg-status-danger/10 text-status-danger' : 'border-status-ok/40 bg-status-ok/10 text-status-ok'
            )}>
              <Icon name={destroyed ? 'spark' : 'check'} size={12} strokeWidth={2.5} />
              <span className="font-mono">קיבולת זמינה: {remainingCapacity}%</span>
            </div>
          </div>

          <HubMap nodes={NODES} selected={selected} destroyed={destroyed} onSelect={setSelected} />

          <div className="mt-3 text-[10px] text-fg-dim text-center">
            לחץ על צומת כדי לבחון אותו · לחץ "תקוף" כדי לדמות נטרול
          </div>
        </div>

        {/* Side panel: selected node info */}
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="surface-elevated p-5 rounded-2xl"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('size-12 rounded-xl flex items-center justify-center border-2 shrink-0 border-current/40 bg-current/10', meta.color)}>
                  <Icon name={meta.icon} size={22} className={meta.color} />
                </div>
                <div>
                  <div className={cn('font-display font-bold text-lg leading-tight', meta.color)}>{meta.label}</div>
                  <div className="text-[10px] font-mono text-fg-dim">{meta.english}</div>
                </div>
              </div>

              <div className="mb-3">
                <div className="text-[10px] font-mono text-fg-dim mb-1 tracking-widest uppercase">חלק מקיבולת התשתית</div>
                <div className="flex items-baseline gap-2">
                  <div className={cn('font-display font-bold text-3xl tabular-nums', meta.color)}>{meta.capacity}%</div>
                  <div className="text-xs text-fg-muted">מסך אספקת המבצע</div>
                </div>
                <div className="mt-2 h-1.5 bg-bg-accent rounded-full overflow-hidden">
                  <motion.div className={cn('h-full', meta.color, 'bg-current')} animate={{ width: `${meta.capacity}%` }} transition={{ duration: 0.4 }} />
                </div>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div>
                  <dt className="text-[10px] font-mono text-fg-dim mb-0.5 tracking-widest uppercase">תפקיד</dt>
                  <dd className="text-fg leading-relaxed">{meta.role}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-mono text-fg-dim mb-0.5 tracking-widest uppercase">פגיעות</dt>
                  <dd className="text-fg-muted leading-relaxed">{meta.vulnerability}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-mono text-fg-dim mb-0.5 tracking-widest uppercase">ערך אסטרטגי</dt>
                  <dd className="text-fg leading-relaxed">{meta.strategic}</dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => setDestroyed(destroyed === selected ? null : selected)}
                className={cn(
                  'w-full mt-4 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all',
                  destroyed === selected
                    ? 'bg-status-ok text-bg shadow-glow hover:scale-[0.99]'
                    : 'bg-status-danger text-bg shadow-glow hover:scale-[1.02] active:scale-[0.98]'
                )}
              >
                <Icon name={destroyed === selected ? 'check' : 'bolt'} size={14} strokeWidth={2.5} />
                {destroyed === selected ? 'שחזר תשתית' : 'תקוף את הצומת'}
              </button>
            </motion.div>
          </AnimatePresence>

          {destroyed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="surface p-4 rounded-xl border-r-4 border-r-status-danger bg-status-danger/5"
            >
              <div className="text-[10px] font-mono text-status-danger mb-1 tracking-widest uppercase">השפעה אסטרטגית</div>
              <p className="text-xs text-fg-muted leading-relaxed">
                איבוד <strong className="text-fg">{NODES.find((n) => n.id === destroyed)?.capacity}%</strong> מקיבולת התשתית.
                שאר הצמתים יידרשו לקלוט עומס יתר — מובילי גוון לשבירות נוספות.
                <strong className="text-fg block mt-1.5">תקיפה אחת = השלכה לאומית.</strong>
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Deep-water port specific callout */}
      <SoftDivider text="נמל מים עמוקים · נקודת חניכה אסטרטגית" />

      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="surface-elevated p-5 rounded-2xl border-r-4 border-r-terrain-sky"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="size-12 rounded-xl bg-terrain-sky/15 border border-terrain-sky/40 flex items-center justify-center shrink-0">
              <Icon name="ship" size={22} className="text-terrain-sky" />
            </div>
            <div>
              <div className="font-display font-bold text-lg text-terrain-sky leading-tight">נמל מים עמוקים</div>
              <div className="text-[10px] font-mono text-fg-dim">Deep-Water Port</div>
            </div>
          </div>
          <p className="text-sm text-fg leading-relaxed mb-3">
            תשתית "שוקע" (עומק חפירה תת-ימי) משמעותית. חיוני לקליטת כלי שיט כבדים — <strong>נושאות מטוסים</strong>, ספינות אספקה אסטרטגיות, מכליות גדולות.
          </p>
          <div className="surface p-3 rounded-lg bg-bg-accent/30 border border-border">
            <div className="text-[10px] font-mono text-terrain-sky mb-1 tracking-widest uppercase">שליטה / נטרול</div>
            <p className="text-xs text-fg-muted leading-relaxed">
              שליטה בנמל = רציפות אספקה אסטרטגית מהים. נטרול ע"י <strong>מיקוש ימי</strong> או <strong>אש</strong> = גדיעת שרשרת האספקה מהים ליבשה. שינוי במאזן הכוחות האסטרטגי.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.08 }}
          className="surface-elevated p-5 rounded-2xl border-r-4 border-r-accent"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="size-12 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center shrink-0">
              <Icon name="layers" size={22} className="text-accent" />
            </div>
            <div>
              <div className="font-display font-bold text-lg text-accent leading-tight">מסוף היברידי</div>
              <div className="text-[10px] font-mono text-fg-dim">Intermodal Hub</div>
            </div>
          </div>
          <p className="text-sm text-fg leading-relaxed mb-3">
            מפגש של <strong>רכבת משא + כבישים מהירים + שדה תעופה לוגיסטי</strong> בנקודה אחת. השילוב מאפשר העברה חלקה ומהירה בין הפלטפורמות (מטוס → רכבת → משאית).
          </p>
          <div className="surface p-3 rounded-lg bg-bg-accent/30 border border-border">
            <div className="text-[10px] font-mono text-accent mb-1 tracking-widest uppercase">השפעת פגיעה</div>
            <p className="text-xs text-fg-muted leading-relaxed">
              הרס ממוקד של צומת היברידי לא רק משתק את שרשרת האספקה לחזית — הוא עלול להוביל ל<strong className="text-fg">שיתוק כלכלי לאומי</strong>. צמתים כאלו הם מטרה אסטרטגית ברמת ה-COG (מרכז הכובד).
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HubMap({
  nodes,
  selected,
  destroyed,
  onSelect,
}: {
  nodes: NodeData[];
  selected: NodeId;
  destroyed: NodeId | null;
  onSelect: (id: NodeId) => void;
}) {
  // Center hub at (50, 40)
  const hubX = 50;
  const hubY = 40;

  return (
    <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <defs>
          <linearGradient id="hub-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0f4f9" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="75" fill="url(#hub-bg)" />

        {/* Sea on left */}
        <rect x="0" y="40" width="22" height="35" className="fill-terrain-sky/20" />
        <path d="M0 42 Q 10 41 22 43 L22 75 L0 75 Z" className="fill-terrain-sky/30" />
        {[3, 8, 13, 18].map((x, i) => (
          <path key={i} d={`M${x} ${50 + i * 4} q 1 -1.5 2 0 t 2 0`} fill="none" className="stroke-terrain-sky" strokeWidth="0.18" opacity="0.5" />
        ))}
        <text x="11" y="72" textAnchor="middle" className="fill-terrain-sky font-mono" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">ים</text>

        {/* Connection lines from each node to the central hub */}
        {nodes.map((n) => {
          const isDestroyed = destroyed === n.id;
          return (
            <line
              key={`line-${n.id}`}
              x1={n.position.x}
              y1={n.position.y}
              x2={hubX}
              y2={hubY}
              className={isDestroyed ? 'stroke-status-danger' : 'stroke-fg-dim'}
              strokeWidth="0.6"
              strokeDasharray={isDestroyed ? '1.5 1' : undefined}
              opacity={isDestroyed ? 0.5 : 0.4}
            />
          );
        })}

        {/* Central hub */}
        <g>
          <circle cx={hubX} cy={hubY} r="6" className="fill-accent/20 stroke-accent" strokeWidth="0.4" strokeDasharray="0.8 0.6" />
          <circle cx={hubX} cy={hubY} r="3" className="fill-accent" />
          <text x={hubX} y={hubY + 1} textAnchor="middle" className="fill-bg font-display font-bold" fontSize="2.6">HUB</text>
          <text x={hubX} y={hubY + 9} textAnchor="middle" className="fill-fg-dim font-mono" fontSize="2.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">צומת מרכזי</text>
        </g>

        {/* Each node */}
        {nodes.map((n) => {
          const isSelected = selected === n.id;
          const isDestroyed = destroyed === n.id;
          return (
            <g
              key={n.id}
              onClick={() => onSelect(n.id)}
              style={{ cursor: 'pointer' }}
              className="hover:opacity-90"
            >
              {/* Pulse ring on selected */}
              {isSelected && !isDestroyed && (
                <circle cx={n.position.x} cy={n.position.y} r="5" fill="none" className="stroke-accent" strokeWidth="0.4">
                  <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0;0.9" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Marker */}
              <circle
                cx={n.position.x}
                cy={n.position.y}
                r="4"
                className={cn(
                  isDestroyed ? 'fill-status-danger/30 stroke-status-danger' :
                  isSelected ? `${n.color.replace('text-', 'fill-')} stroke-current` :
                  'fill-bg-card stroke-fg-dim',
                  n.color
                )}
                strokeWidth="0.6"
              />
              {/* Icon foreground (use foreignObject for icon would be complex; use letter abbreviation) */}
              <text
                x={n.position.x}
                y={n.position.y + 1.3}
                textAnchor="middle"
                className={cn(isDestroyed ? 'fill-status-danger' : isSelected ? 'fill-bg' : n.color, 'font-display font-bold')}
                fontSize="3.5"
              >
                {n.id === 'port' ? 'P' : n.id === 'rail' ? 'R' : n.id === 'road' ? 'H' : 'A'}
              </text>
              {/* Destroyed X overlay */}
              {isDestroyed && (
                <g>
                  <line x1={n.position.x - 2.5} y1={n.position.y - 2.5} x2={n.position.x + 2.5} y2={n.position.y + 2.5} className="stroke-status-danger" strokeWidth="0.8" strokeLinecap="round" />
                  <line x1={n.position.x - 2.5} y1={n.position.y + 2.5} x2={n.position.x + 2.5} y2={n.position.y - 2.5} className="stroke-status-danger" strokeWidth="0.8" strokeLinecap="round" />
                </g>
              )}
              {/* Label below */}
              <text
                x={n.position.x}
                y={n.position.y + 8.5}
                textAnchor="middle"
                className={cn('font-display font-bold', isDestroyed ? 'fill-status-danger' : n.color)}
                fontSize="2.6"
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth="0.85"
                strokeLinejoin="round"
              >
                {n.label}
              </text>
              <text
                x={n.position.x}
                y={n.position.y + 11.5}
                textAnchor="middle"
                className="fill-fg-dim font-mono"
                fontSize="2"
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth="0.7"
                strokeLinejoin="round"
              >
                {n.capacity}% מהקיבולת
              </text>
            </g>
          );
        })}

        {/* Animated supply flows */}
        {nodes.filter((n) => destroyed !== n.id).map((n, i) => (
          <motion.circle
            key={`flow-${n.id}`}
            r="0.7"
            className="fill-accent"
            animate={{
              cx: [n.position.x, hubX],
              cy: [n.position.y, hubY],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: i * 0.5 }}
          />
        ))}
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
