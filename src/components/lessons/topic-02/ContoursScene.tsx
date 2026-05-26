'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

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
              מבט מהצד · ההר כעוגת פרוסות
            </div>
            <div className="surface bg-bg-accent/20 rounded-xl p-4 border border-border/40">
              <SlicedHill activeRing={activeRing} />
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
          return (
            <button
              key={s.id}
              onClick={() => setShapeId(s.id)}
              className={cn(
                'surface p-5 text-right transition-all rounded-xl relative overflow-hidden',
                active ? 'border-accent bg-accent/5' : 'hover:border-border-strong opacity-80 hover:opacity-100'
              )}
            >
              <div className="font-display font-bold text-lg mb-1">{s.label}</div>
              <div className={cn('text-sm font-display font-semibold tracking-wider font-bold', active ? 'text-accent' : 'text-fg-muted')}>
                {s.steepnessHint === 'gentle' && '↘ מדרון נוח'}
                {s.steepnessHint === 'steep' && '↑ תלול ומאתגר'}
                {s.steepnessHint === 'cliff' && '! חסימה / מצוק'}
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

function SlicedHill({ activeRing }: { activeRing: number | null }) {
  const slices = [
    { y: 80, w: 70, color: 'fill-terrain-sand/40' },
    { y: 65, w: 56, color: 'fill-terrain-sand/55' },
    { y: 50, w: 42, color: 'fill-terrain-ridge/55' },
    { y: 35, w: 28, color: 'fill-terrain-ridge/70' },
    { y: 20, w: 14, color: 'fill-terrain-ridge' },
  ];
  return (
    <div className="aspect-video sm:aspect-square max-h-[300px] mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {slices.map((s, i) => {
          const isActive = activeRing === i;
          return (
            <g key={i}>
              <ellipse
                cx="50"
                cy={s.y}
                rx={s.w / 2}
                ry={s.w / 6}
                className={cn(s.color, 'transition-all duration-300', isActive && 'fill-accent/60')}
                stroke="currentColor"
                strokeWidth="0.4"
                style={{ color: isActive ? '#D4A72C' : 'rgba(58, 68, 82, 0.5)' }}
              />
              <text
                x={50 + s.w / 2 + 5}
                y={s.y + 1}
                className={cn('text-[3px] font-display font-bold font-bold tabular-nums', isActive ? 'fill-accent' : 'fill-fg-dim')}
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >
                {(slices.length - i) * 10} מ׳
              </text>
            </g>
          );
        })}
        <line x1="10" y1="20" x2="10" y2="80" className="stroke-border-strong" strokeWidth="0.3" strokeDasharray="1 1" />
        <text x="12" y="22" className="fill-fg-dim text-[2.5px] font-display font-bold font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >↑ גובה</text>
      </svg>
    </div>
  );
}

function ContoursAsMap({ activeRing, setActiveRing }: { activeRing: number | null; setActiveRing: (n: number | null) => void; }) {
  const rings = [
    { rx: 38, ry: 28, h: 10 },
    { rx: 30, ry: 22, h: 20 },
    { rx: 22, ry: 16, h: 30 },
    { rx: 14, ry: 10, h: 40 },
    { rx: 6, ry: 4,   h: 50 },
  ];
  return (
    <div className="aspect-video sm:aspect-square max-h-[300px] mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full select-none">
        {Array.from({ length: 11 }).map((_, i) => (
          <g key={i}>
            <line x1={i * 10} y1="0" x2={i * 10} y2="100" className="stroke-border-subtle/30" strokeWidth="0.1" />
            <line x1="0" y1={i * 10} x2="100" y2={i * 10} className="stroke-border-subtle/30" strokeWidth="0.1" />
          </g>
        ))}

        {rings.map((r, i) => {
          const isActive = activeRing === i;
          return (
            <g
              key={i}
              onMouseEnter={() => setActiveRing(i)}
              onMouseLeave={() => setActiveRing(null)}
              className="cursor-crosshair"
            >
              <ellipse cx="50" cy="50" rx={r.rx + 3} ry={r.ry + 3} fill="transparent" />
              <ellipse
                cx="50" cy="50" rx={r.rx} ry={r.ry}
                fill="none"
                stroke="currentColor"
                strokeWidth={isActive ? 0.8 : 0.4}
                className={cn('transition-colors', isActive ? 'text-accent' : 'text-accent/40')}
              />
              <text x="50" y={50 - r.ry - 1} textAnchor="middle" className={cn('text-[2.5px] font-display font-bold font-bold', isActive ? 'fill-accent' : 'fill-fg-dim')}
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >
                {r.h}
              </text>
            </g>
          );
        })}
        <path d="M50 48 L50 52 M48 50 L52 50" className="stroke-accent" strokeWidth="0.5" />
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