'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { IntelCard } from '@/components/lesson/IntelCard';
import { SoftDivider } from '@/components/lesson/SoftDivider';
import {
  StepAccordionItem,
  AccordionSection,
  AccordionKicker,
  AccordionSectionTitle,
  AccordionSectionText,
} from '@/components/lesson/StepAccordion';
import { type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type View = 'photo' | 'layers' | 'analysis' | 'decision';

type Step = {
  id: View;
  label: string;
  icon: IconName;
  popupTitle: string;
  popupBody: string;
};

const STEPS: Step[] = [
  {
    id: 'photo',
    label: 'מפה — תמונה סטטית',
    icon: 'eye',
    popupTitle: 'המפה הטיפשה',
    popupBody:
      'בעבר מפה הייתה <strong>תמונה</strong>. ציור על נייר. תלכלכת אותו עם עיפרון? אבד מידע. רוצה להוסיף משהו? צריך לצייר מחדש. <strong>הבעיה:</strong> המפה לא מבינה את עצמה. היא לא יודעת שהקו האדום הוא כביש, ושהמשולש הוא הר. היא רק רואה פיקסלים.',
  },
  {
    id: 'layers',
    label: 'GIS — שכבות חכמות',
    icon: 'layers',
    popupTitle: 'מפה שמבינה את עצמה',
    popupBody:
      'ב-GIS, כל סוג מידע הוא <strong>שכבה נפרדת ושקופה</strong>: שכבת טופוגרפיה, שכבת כבישים, שכבת מודיעין, שכבת תשתיות. ההמצאה הגדולה: כל פיסת מידע <strong>מעוגנת לקואורדינטה</strong>. אפשר להלביש שכבה על שכבה, לכבות/להדליק, ולקבל <strong>תמונה רב-ממדית</strong>.',
  },
  {
    id: 'analysis',
    label: 'ניתוח — לא מציג, מחשב',
    icon: 'compass',
    popupTitle: 'מחשבון מרחבי, לא רק תצוגה',
    popupBody:
      'GIS לא נעצר בהצגת שכבות זו על זו — הוא <strong>מחשב עליהן</strong> ומפיק תשובה מבצעית: Viewshed (איפה רואים), Cost Surface (איפה זול לעבור), Least-Cost Path (איך לעקוף איומים), Buffers (טבעות איום), Network Analysis (איפה הצמת הקריטי). מה שלוקח ידנית 3 שעות, המחשב עושה ב-3 שניות.',
  },
  {
    id: 'decision',
    label: 'החלטה — תוצר מבצעי',
    icon: 'crosshair',
    popupTitle: 'מהמפה ישר לחימוש',
    popupBody:
      'התוצאה: <strong>מסקנות מבצעיות</strong>. "המסלול הזה זול ב-40% מהאלכסון". "פיצוץ הגשר הזה משתק 3 דרכי אספקה". "סוללת הטילים בעמדה X מאיימת על 5 יישובים". GIS הוא לא תוצר — הוא <strong>סביבת קבלת החלטות</strong> שמחברת מודיעין לפעולה.',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'מודל תלת-ממדי איתר את בן לאדן',
    place: 'מבצע "Neptune Spear", פקיסטן · מאי 2011',
    lesson: 'ה-CIA בנה מודל GIS תלת-ממדי מדויק של המתחם באבוטאבאד — חצרות, חדרים, גבהי קירות, צמחייה. ה-SEALs אימנו שעות במודל הזה לפני שהגיעו. <strong>לא היה רגע אחד של "מה זה?"</strong> — הכל היה ידוע מראש.',
    icon: 'pyramid',
    accent: 'text-status-ok',
  },
  {
    headline: 'GIS תכנן את הנחיתה הגדולה ביותר',
    place: 'D-Day, נורמנדי · יוני 1944',
    lesson: 'לפני ה-GIS המחשבי, בעלות הברית עשו זאת ידנית: שכבת גאות-שפל, שכבת ביצורים, שכבת הסוואה, שכבת מזג אוויר. כל שכבה על שקף שקוף. <strong>"GIS אנלוגי" בקנה מידה ענק</strong>. המבצע הצליח כי הצליבת השכבות הייתה מדויקת.',
    icon: 'layers',
    accent: 'text-accent-cool',
  },
  {
    headline: 'אזרח עם לפטופ מנתח כמו המל"ט',
    place: 'אוקראינה · 2022 ואילך',
    lesson: 'אזרחים אוקראינים החלו להשתמש ב-QGIS (חינמי) + OpenStreetMap + תמונות לוויין מסחריות. הם זיהו תנועות צבא רוסי, חישבו טווחי טילים, ובנו מפות איום שעוזרות לצבא בזמן אמת. <strong>GIS דמוקרטי שמשנה את שדה הקרב.</strong>',
    icon: 'people',
    accent: 'text-status-warn',
  },
  {
    headline: 'יחידה 9900 — מודלים מבצעיים',
    place: 'צה"ל · יחידת התצלום הצבאי',
    lesson: 'יחידה 9900 מייצרת ב-GIS מודלי שטח תלת-ממדיים של אזורי מבצע. לוחמים "מטיילים" בהם ב-VR לפני שמגיעים בפועל. <strong>הוסיפו לכך Cost Surfaces ו-Buffers</strong> = מערכת קבלת החלטות לכל זרועות הצבא.',
    icon: 'satellite',
    accent: 'text-accent',
  },
];

export function OnboardingScene() {
  const [view, setView] = useState<View>('photo');
  const [expandedStep, setExpandedStep] = useState<View | null>('photo');

  const handleStepClick = (id: View) => {
    if (expandedStep === id) {
      setExpandedStep(null);
    } else {
      setView(id);
      setExpandedStep(id);
    }
  };

  return (
    <section id="scene-onboarding" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="12.0"
        eyebrow="לפני שמתחילים"
title = {
  <>
    GIS הופך מפה רגילה ל<span className="text-accent-hover">מערכת שמקבלת החלטות</span>
  </>
}
        intro="מפה רגילה היא רק ציור. GIS הופך אותה לסביבת קבלת החלטות שמחשבת איומים, מציעה מסלולים, ומזהה נקודות תורפה. בוא נראה את ה-4 שלבים מההצילום למסקנה."
      />

      <div className="grid md:grid-cols-[2fr_3fr] gap-6 items-start">
        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const active = view === s.id;
            const expanded = expandedStep === s.id;
            const passed = STEPS.findIndex((x) => x.id === view) > i;
            return (
              <StepAccordionItem
                key={s.id}
                index={i}
                label={s.label}
                active={active}
                expanded={expanded}
                passed={passed}
                onToggle={() => handleStepClick(s.id)}
                panelId={`t13-onb-panel-${s.id}`}
              >
                <AccordionSection>
                  <AccordionKicker>למה זה משנה</AccordionKicker>
                  <AccordionSectionTitle>{s.popupTitle}</AccordionSectionTitle>
                  <AccordionSectionText dangerousHtml={s.popupBody} />
                </AccordionSection>
              </StepAccordionItem>
            );
          })}
        </div>

        <div className="surface-elevated bg-bg relative overflow-hidden aspect-video min-h-[320px]">
          <GISStage view={view} />
        </div>
      </div>

      <SoftDivider text="4 פעמים ש-GIS שינה תוצאה מבצעית" />

      <div className="grid sm:grid-cols-2 gap-4">
        {HISTORICAL.map((h, i) => (
          <IntelCard
            key={h.headline}
            place={h.place}
            headline={h.headline}
            lesson={h.lesson}
            icon={h.icon}
            accent={h.accent}
          />
        ))}
      </div>

      <ReadyCallout title="עכשיו אתם מוכנים">
        <p>הבנת ש-GIS זה לא "אפליקציית מפות" — זה <strong className="text-fg">סביבת קבלת החלטות</strong>. בשלוש הסצנות הבאות נצלול:
            <strong className="text-fg"> איך עובדות שכבות, איך מחשבים מסלול בעלות מינימלית, ואיך מאתרים את הגשר הקריטי שיהפוך לאויב לבעיה</strong>.</p>
      </ReadyCallout>
    </section>
  );
}

function GISStage({ view }: { view: View }) {
  const showLayers = view === 'layers' || view === 'analysis' || view === 'decision';
  const showAnalysis = view === 'analysis' || view === 'decision';
  const showDecision = view === 'decision';

  return (
    <div className="relative w-full h-full bg-bg-accent">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <rect x="0" y="0" width="100" height="75" className="fill-bg-accent" />

        {/* Base map — terrain (always visible) */}
        <path d="M0 50 L20 40 L40 48 L60 38 L80 45 L100 42 L100 75 L0 75 Z" className="fill-terrain-sand/20" />

        {/* Layer 1: Photo (default state — just terrain + buildings shown as flat) */}
        <motion.g initial={false} animate={{ opacity: view === 'photo' ? 1 : 0.35 }} transition={{ duration: 0.3 }}>
          {[
            { x: 22, y: 50 },
            { x: 38, y: 53 },
            { x: 55, y: 48 },
            { x: 72, y: 50 },
          ].map((b, i) => (
            <rect key={i} x={b.x - 3} y={b.y - 3} width="6" height="3" className="fill-fg/50" />
          ))}
          <text x="50" y="9" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.95" strokeLinejoin="round">
            תמונה: רואים — לא יודעים
          </text>
        </motion.g>

        {/* Layer 2: GIS Layers (toggles visible) */}
        <motion.g initial={false} animate={{ opacity: showLayers ? 1 : 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          {/* Roads */}
          <path d="M0 55 L25 50 L50 53 L75 50 L100 52" fill="none" className="stroke-accent" strokeWidth="0.8" />
          {/* Threat zone */}
          <circle cx="60" cy="40" r="8" fill="none" className="stroke-status-danger" strokeWidth="0.4" strokeDasharray="1 0.7" opacity="0.7" />
          <circle cx="60" cy="40" r="0.8" className="fill-status-danger" />
          {/* Friendly position */}
          <circle cx="20" cy="56" r="1" className="fill-accent-cool" />

          {/* Layer labels stacked */}
          <g transform="translate(8 14)">
            {[
              { label: 'תבליט', color: 'text-terrain-ridge' },
              { label: 'דרכים', color: 'text-accent' },
              { label: 'מודיעין', color: 'text-status-danger' },
              { label: 'כוחותינו', color: 'text-accent-cool' },
            ].map((l, i) => (
              <g key={i} transform={`translate(0 ${i * 4})`}>
                <rect x="0" y="-1.5" width="3" height="3" className={cn('fill-current', l.color)} opacity="0.7" />
                <text x="4" y="0.8" className={cn('font-display font-bold', l.color)} fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.75" strokeLinejoin="round">
                  {l.label}
                </text>
              </g>
            ))}
          </g>
        </motion.g>

        {/* Layer 3: Analysis — Cost surface heatmap + path */}
        <motion.g initial={false} animate={{ opacity: showAnalysis ? 1 : 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
          {/* Heatmap cells */}
          {Array.from({ length: 32 }).map((_, i) => {
            const col = i % 8;
            const row = Math.floor(i / 8);
            const x = 14 + col * 9;
            const y = 30 + row * 6;
            const distToThreat = Math.sqrt((x - 60) ** 2 + (y - 40) ** 2);
            const cost = Math.max(0, 1 - distToThreat / 20);
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width="8"
                height="5"
                className={cost > 0.6 ? 'fill-status-danger' : cost > 0.3 ? 'fill-status-warn' : 'fill-status-ok'}
                opacity={0.15 + cost * 0.25}
              />
            );
          })}
          <text x="80" y="32" textAnchor="middle" className="fill-status-danger font-display font-bold font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
            עלות גבוהה
          </text>
        </motion.g>

        {/* Layer 4: Decision — Least Cost Path */}
        <motion.g initial={false} animate={{ opacity: showDecision ? 1 : 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
          <path
            d="M20 56 L 30 58 L 42 62 L 55 65 L 72 58 L 85 50 L 92 42"
            fill="none"
            className="stroke-status-ok"
            strokeWidth="1"
          />
          <motion.circle
            r="1"
            className="fill-status-ok"
            animate={{ offsetDistance: ['0%', '100%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            style={{
              offsetPath: 'path("M20 56 L 30 58 L 42 62 L 55 65 L 72 58 L 85 50 L 92 42")',
            }}
          />
          <text x="50" y="70" textAnchor="middle" className="fill-status-ok font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.95" strokeLinejoin="round">
            ✓ נתיב מומלץ
          </text>
          {/* Target */}
          <circle cx="92" cy="42" r="1.2" className="fill-accent-hot" />
          <circle cx="92" cy="42" r="2.5" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
            <animate attributeName="r" values="1.8;4;1.8" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
          </circle>
        </motion.g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        אותו אזור · 4 שכבות חשיבה
      </div>
    </div>
  );
}
