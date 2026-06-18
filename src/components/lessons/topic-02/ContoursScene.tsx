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

      <div className="surface-elevated p-6 mb-6 rounded-2xl border border-border/50">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-3">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider font-bold">
              מבט תלת־ממדי · ההר כעוגת פרוסות
            </div>
            <div className="surface bg-bg-accent/20 rounded-xl p-4 border border-border/40">
              <ContourCake3D activeRing={activeRing} setActiveRing={setActiveRing} />
            </div>
            <div className="text-[11px] text-accent/80 font-medium text-center">
              גררו כדי לסובב · גלגלת לזום
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider font-bold">
              מבט מלמעלה · איך זה נראה במפה
            </div>
            <div className="surface bg-bg-accent/20 rounded-xl p-4 border border-border/40">
              <ContoursAsMap activeRing={activeRing} setActiveRing={setActiveRing} />
            </div>
            <div className="text-[11px] text-accent/80 font-medium text-center animate-pulse">
               רחפו עם העכבר על הקווים במפה כדי לראות את הפרוסה התואמת
            </div>
          </div>
        </div>
      </div>

      <SoftDivider text="זיהוי תנאי שטח לפי צפיפות" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {SHAPES.map((s) => {
          const active = s.id === shapeId;
          const badgeChar = s.steepnessHint === 'gentle' ? '↘' : s.steepnessHint === 'steep' ? '↑' : '!';
          const subtitle =
            s.steepnessHint === 'gentle'
              ? 'מדרון נוח'
              : s.steepnessHint === 'steep'
              ? 'תלול ומאתגר'
              : 'חסימה / מצוק';
          return (
            <button
              key={s.id}
              onClick={() => setShapeId(s.id)}
              className={cn(
                'surface p-4 text-right transition-all rounded-xl relative overflow-hidden flex items-center gap-3',
                active ? 'border-accent bg-bg-elevated' : 'bg-bg-elevated border-border hover:border-accent/50'
              )}
            >
              {active && (
                <motion.span
                  layoutId="t2-shape-bar"
                  className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
                />
              )}
              <span
                className={cn(
                  'size-10 rounded-xl flex items-center justify-center shrink-0 border transition-all font-display font-bold',
                  active ? 'bg-accent text-bg-elevated border-accent' : 'bg-bg-accent text-fg-muted border-border'
                )}
              >
                {badgeChar}
              </span>
              <div className="flex-1 min-w-0 text-right">
                <div className="font-display font-bold text-base text-fg leading-tight">{s.label}</div>
                <div className="text-xs font-display font-medium tracking-wide text-fg-dim mt-0.5">{subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-stretch">
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={shape.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="surface p-6 border-r-4 border-accent rounded-xl"
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

          <Glossary />
        </div>

        <div className="surface-elevated bg-bg-accent/20 relative overflow-hidden border border-border/50 rounded-2xl">
          <ShapeMap shape={shape} />
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
    <div className="surface p-6 rounded-xl space-y-4 bg-bg-accent/10 border border-border/30">
      <div className="text-sm font-display font-semibold text-accent tracking-wider font-bold mb-2">מילון מושגים לניווט</div>
      <Item term="קו גובה (Contour Line)" def="הקו שמחבר את כל הנקודות בגובה זהה. תחשבו עליו כעל 'פרוסה' של ההר." />
      <Item term="רווח אנכי (Contour Interval)" def="הפרש הגובה הקבוע בין קו לקו. במפות צה''ל זה תמיד 10 מטרים." />
      <Item term="קו אינדקס (Index Contour)" def="כל קו חמישי הוא עבה יותר ורשום עליו הגובה. זה ה'עוגן' שעוזר לספור גבהים מהר." />
      <Item term="צפיפות = תלילות" def="החוק הכי חשוב: קווים קרובים = הר תלול וקשה. קווים רחוקים = גבעה נוחה או מישור." />
    </div>
  );
}

function Item({ term, def }: { term: string; def: string }) {
  return (
    <div className="text-xs group">
      <div className="font-bold text-fg mb-1 group-hover:text-accent transition-colors">{term}</div>
      <div className="text-fg-muted leading-relaxed">{def}</div>
    </div>
  );
}

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-14 flex items-center gap-6">
      <div className="h-px flex-1 bg-gradient-to-l from-border/50 to-transparent" />
      <span className="text-sm font-display font-semibold text-fg-muted tracking-wider font-bold">{text}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
    </div>
  );
}