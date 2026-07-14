'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

const ContourCake3D = dynamic(() => import('./ContourCake3D'), {
  ssr: false,
  loading: () => (
    <div className="aspect-video sm:aspect-square max-h-[300px] w-full mx-auto flex items-center justify-center text-fg-dim text-sm">
      טוען מודל תלת־ממד…
    </div>
  ),
});

type Shape = {
  id: string;
  label: string;
  desc: string;
  contours: { rx: number; ry: number; cx?: number; cy?: number }[];
  steepnessHint: 'gentle' | 'mixed' | 'steep' | 'cliff';
};

const SHAPES: Shape[] = [
  {
    id: 'gentle',
    label: 'גבעה מתונה',
    desc: 'הקווים רחוקים זה מזה. זה אומר שהגובה משתנה לאט מאוד - זהו מדרון נוח. לוחם יכול לטפס כאן בקלות, וגם רכב שטח יעלה פה בלי להתאמץ.',
    contours: [
      { rx: 38, ry: 26 },
      { rx: 28, ry: 19 },
      { rx: 18, ry: 12 },
      { rx: 8, ry: 5 },
    ],
    steepnessHint: 'gentle',
  },
  {
    id: 'steep',
    label: 'הר תלול',
    desc: 'הקווים צפופים מאוד. זה אומר שתוך מרחק קצר אנחנו עולים הרבה בגובה. הטיפוס הרגלי יהיה קשה ומעייף, ורכבים לא יוכלו לעבור כאן בכלל.',
    contours: [
      { rx: 36, ry: 26 },
      { rx: 32, ry: 22 },
      { rx: 28, ry: 19 },
      { rx: 24, ry: 16 },
      { rx: 20, ry: 13 },
      { rx: 16, ry: 11 },
      { rx: 12, ry: 8 },
      { rx: 8, ry: 5 },
      { rx: 4, ry: 3 },
    ],
    steepnessHint: 'steep',
  },
  {
    id: 'cliff',
    label: 'מצוק',
    desc: 'הקווים כמעט נוגעים אחד בשני. זוהי נפילה חדה או קיר סלע. השטח בלתי עביר ברגל ודורש ציוד טיפוס (סנפלינג) או עיקוף של המכשול.',
    contours: [
      { rx: 38, ry: 26 },
      { rx: 32, ry: 23 },
      { rx: 26, ry: 20 },
      { rx: 22, ry: 17, cx: 52 },
      { rx: 21, ry: 16, cx: 53 },
      { rx: 20, ry: 16, cx: 54 },
    ],
    steepnessHint: 'cliff',
  },
];

export function ContoursScene() {
  const [shapeId, setShapeId] = useState(SHAPES[0].id);
  const [activeRing, setActiveRing] = useState<number | null>(null);
  const shape = SHAPES.find((s) => s.id === shapeId)!;

  return (
    <section id="scene-contours" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SceneHeader
        step="02.4"
        eyebrow="קווי גובה"
title={
          <>
          לפצח את השטח: איך פורסים הר תלת-ממדי ל<span className="gradient-text">קווים שאפשר לקרוא</span>?
          </>
        }
               intro="האתגר הכי גדול במפה הוא להבין איך השטח נראה במציאות. הרי המפה היא דף שטוח, אבל העולם הוא תלת-ממדי. כדי לפתור את זה, אנחנו משתמשים בשיטה חכמה: קווי גובה. דמיינו שחתכנו את ההר לפרוסות אופקיות (כמו עוגת קומות). כל קו שתראו במפה הוא פשוט הקצה של פרוסה כזו."
      />

      <div className="bg-paper-bright border border-border/60 rounded-2xl shadow-elevated p-6 mb-6">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-3">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider font-bold text-center">
              מבט מלמעלה · איך זה נראה במפה
            </div>
            <div className="p-2">
              <ContoursAsMap activeRing={activeRing} setActiveRing={setActiveRing} />
            </div>
            <div className="text-[11px] text-accent/80 font-medium text-center animate-pulse">
               רחפו עם העכבר על הקווים במפה כדי לראות את הפרוסה התואמת
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider font-bold text-center">
              מבט תלת־ממדי · ההר כעוגת פרוסות
            </div>
            <div className="p-2">
              <ContourCake3D activeRing={activeRing} setActiveRing={setActiveRing} />
            </div>
            <div className="text-[11px] text-accent/80 font-medium text-center">
              גררו כדי לסובב · גלגלת לזום
            </div>
          </div>
        </div>
      </div>

      <SoftDivider text="זיהוי תנאי שטח לפי צפיפות" compact />

      <div className="grid lg:grid-cols-[1fr_1.35fr] gap-8 items-start">
        <div className="lg:border-e lg:border-border/50 lg:pe-8">
          <Glossary />
        </div>

        <div className="bg-paper-bright border border-border/60 rounded-2xl shadow-elevated p-6">
          <div className="flex rounded-full border border-border p-1 bg-bg-elevated gap-1">
            {SHAPES.map((s) => {
              const active = s.id === shapeId;
              return (
                <button
                  key={s.id}
                  onClick={() => setShapeId(s.id)}
                  className={cn(
                    'flex-1 rounded-full py-2.5 px-4 text-center font-display font-bold text-base transition-colors border',
                    active
                      ? 'border-accent bg-bg-elevated text-accent'
                      : 'border-transparent text-fg hover:text-accent/80'
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-stretch mt-6">
            <div className="bg-bg-accent/20 relative overflow-hidden rounded-xl border border-border/40">
              <ShapeMap shape={shape} />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={shape.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="border-s-4 border-accent ps-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Icon name="mountain" size={36} className="text-accent shrink-0" />
                  <h3 className="font-display font-bold text-2xl leading-tight">{shape.label}</h3>
                </div>
                <p className="text-sm text-fg-muted leading-relaxed font-medium">
                  {shape.desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Shared elevation model for both views, so the side view (cake) and the
 * top view (map) stay perfectly consistent. Index 0 = the lowest band
 * (10 m, widest / outermost / bottom slice); the last index = the peak
 * (50 m, narrowest / innermost / top slice). The `fill`/`op` ramp goes
 * sand → ridge → olive as we climb, and is identical across both views
 * so a band reads as "the same place" in either picture.
 */
const LEVELS = [
  { h: 10, fill: 'fill-terrain-sand',  op: 0.35 },
  { h: 20, fill: 'fill-terrain-sand',  op: 0.55 },
  { h: 30, fill: 'fill-terrain-ridge', op: 0.5 },
  { h: 40, fill: 'fill-terrain-ridge', op: 0.7 },
  { h: 50, fill: 'fill-terrain-olive', op: 0.85 },
];

// Top view (map): perfectly concentric, constant aspect ratio.
const CX = 50;
const MAP_CY = 50;
const RING_K = 0.7;                                  // ry / rx, fixed for all rings
const ringRx = (i: number) => 40 - i * 8;           // 40 → 8 (outer → inner)
const ringRy = (i: number) => ringRx(i) * RING_K;

function ContoursAsMap({ activeRing, setActiveRing }: { activeRing: number | null; setActiveRing: (n: number | null) => void; }) {
  return (
    <div className="aspect-video sm:aspect-square max-h-[300px] mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full select-none">
        {Array.from({ length: 11 }).map((_, i) => (
          <g key={i}>
            <line x1={i * 10} y1="0" x2={i * 10} y2="100" className="stroke-border-subtle/30" strokeWidth="0.1" />
            <line x1="0" y1={i * 10} x2="100" y2={i * 10} className="stroke-border-subtle/30" strokeWidth="0.1" />
          </g>
        ))}

        {/* filled elevation bands — outer (lowest) first, peak painted last on top */}
        {LEVELS.map((lvl, i) => {
          const isActive = activeRing === i;
          return (
            <ellipse
              key={`band-${i}`}
              cx={CX} cy={MAP_CY} rx={ringRx(i)} ry={ringRy(i)}
              className={cn('transition-all duration-300', isActive ? 'fill-accent/30' : lvl.fill)}
              style={{ opacity: isActive ? 0.9 : lvl.op }}
            />
          );
        })}

        {/* contour line strokes + labels + hover targets */}
        {LEVELS.map((lvl, i) => {
          const isActive = activeRing === i;
          const rx = ringRx(i);
          const ry = ringRy(i);
          return (
            <g
              key={`ring-${i}`}
              onMouseEnter={() => setActiveRing(i)}
              onMouseLeave={() => setActiveRing(null)}
              className="cursor-crosshair"
            >
              {/* wider invisible hit area */}
              <ellipse cx={CX} cy={MAP_CY} rx={rx + 3.5} ry={ry + 3.5} fill="transparent" />
              <ellipse
                cx={CX} cy={MAP_CY} rx={rx} ry={ry}
                fill="none"
                stroke="currentColor"
                strokeWidth={isActive ? 0.9 : 0.45}
                className={cn('transition-colors', isActive ? 'text-accent' : 'text-terrain-olive/70')}
              />
              <text
                x={CX} y={MAP_CY - ry - 1.2} textAnchor="middle"
                className={cn(
                  'text-[2.6px] font-display font-bold tabular-nums',
                  isActive ? 'fill-accent' : 'fill-fg-dim'
                )}
                paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round"
              >
                {lvl.h}
              </text>
            </g>
          );
        })}

        {/* peak marker */}
        <path d={`M${CX} ${MAP_CY - 2.5} L${CX} ${MAP_CY + 2.5} M${CX - 2.5} ${MAP_CY} L${CX + 2.5} ${MAP_CY}`} className="stroke-accent" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

function ShapeMap({ shape }: { shape: Shape }) {
  return (
    <div className="relative w-full h-full min-h-[280px]">
      <svg viewBox="0 0 100 75" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
        {Array.from({ length: 11 }).map((_, i) => (
          <g key={i}>
            <line x1={i * 10} y1="0" x2={i * 10} y2="75" className="stroke-border-subtle/30" strokeWidth="0.1" />
            <line x1="0" y1={i * 7.5} x2="100" y2={i * 7.5} className="stroke-border-subtle/30" strokeWidth="0.1" />
          </g>
        ))}

        {shape.contours.map((c, i) => (
          <motion.ellipse
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            cx={c.cx ?? 50}
            cy={c.cy ?? 38}
            rx={c.rx}
            ry={c.ry}
            fill="none"
            stroke="currentColor"
            strokeWidth={i % 5 === 0 ? 0.7 : 0.3}
            className="text-accent"
            style={{ opacity: i % 5 === 0 ? 0.9 : 0.5 }}
          />
        ))}

        <circle cx={50} cy={38} r="0.5" className="fill-accent" />
      </svg>
    </div>
  );
}

function Glossary() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <div className="h-px flex-1 bg-border/50" />
        <div className="text-sm font-display font-semibold text-accent tracking-wider font-bold whitespace-nowrap">
          מילון מושגים לניווט
        </div>
        <div className="h-px flex-1 bg-border/50" />
      </div>
      <div className="divide-y divide-border/40">
        <Item
          icon="rings"
          term="קו גובה (Contour Line)"
          def="הקו שמחבר את כל הנקודות בגובה זהה. תחשבו עליו כעל 'פרוסה' של ההר."
        />
        <Item
          icon="interval"
          term="רווח אנכי (Contour Interval)"
          def="הפרש הגובה הקבוע בין קו לקו. במפות צה''ל זה תמיד 10 מטרים."
        />
        <Item
          icon="ellipse"
          term="קו אינדקס (Index Contour)"
          def="כל קו חמישי הוא עבה יותר ורשום עליו הגובה. זה ה'עוגן' שעוזר לספור גבהים מהר."
        />
        <Item
          icon="lines"
          term="צפיפות = תלילות"
          def="החוק הכי חשוב: קווים קרובים = הר תלול וקשה. קווים רחוקים = גבעה נוחה או מישור."
        />
      </div>
    </div>
  );
}

type GlossaryIconKind = 'rings' | 'interval' | 'ellipse' | 'lines';

/**
 * Small decorative glyphs for the glossary rows — purely illustrative, not
 * shared/locked icons, so they live locally next to their one use site.
 */
function GlossaryIcon({ kind }: { kind: GlossaryIconKind }) {
  return (
    <span className="size-11 rounded-full bg-bg-accent border border-border/50 flex items-center justify-center shrink-0">
      <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.4} className="text-fg-muted">
        {kind === 'rings' && (
          <>
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5.5" />
            <circle cx="12" cy="12" r="2" />
          </>
        )}
        {kind === 'interval' && (
          <>
            <path d="M7 4v16M17 4v16" strokeDasharray="2 2" strokeWidth={1} />
            <path d="M12 5v14" />
            <path d="M9 8l3-3 3 3M9 16l3 3 3-3" />
          </>
        )}
        {kind === 'ellipse' && <ellipse cx="12" cy="12" rx="9" ry="5.5" />}
        {kind === 'lines' && (
          <path d="M4 6h16M4 10.5h16M4 15h11M4 19.5h7" />
        )}
      </svg>
    </span>
  );
}

function Item({ icon, term, def }: { icon: GlossaryIconKind; term: string; def: string }) {
  return (
    <div className="flex items-start gap-4 py-4 first:pt-0 last:pb-0 group">
      <GlossaryIcon kind={icon} />
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-sm text-fg mb-1 group-hover:text-accent transition-colors">
          {term}
        </div>
        <div className="text-xs text-fg-muted leading-relaxed">{def}</div>
      </div>
    </div>
  );
}

function SoftDivider({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-6', compact ? 'my-8' : 'my-14')}>
      <div className="h-px flex-1 bg-gradient-to-l from-border/50 to-transparent" />
      <span
        className={cn(
          'font-display font-semibold text-fg-muted tracking-wider font-bold',
          compact ? 'text-xs' : 'text-sm'
        )}
      >
        {text}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
    </div>
  );
}