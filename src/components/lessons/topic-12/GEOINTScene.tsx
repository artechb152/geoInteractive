'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Layer = 'imint' | 'sigint' | 'humint' | 'osint';

type LayerData = {
  id: Layer;
  label: string;
  english: string;
  icon: IconName;
  source: string;
  strength: string;
  limitation: string;
  color: string;
  bg: string;
  border: string;
};

const LAYERS: LayerData[] = [
  {
    id: 'imint',
    label: 'IMINT',
    english: 'Imagery Intelligence',
    icon: 'eye',
    source: 'תמונות לוויין, מטוס, רחפן. ראייה חזותית של השטח.',
    strength: 'פירוט גבוה — סוג כלי, סימני היכר, צבעים. <strong>אין תחליף לזיהוי ויזואלי.</strong>',
    limitation: 'תלות באור שמש. ענן או חושך = עיוורון. רגיש להונאה ויזואלית (טנקי דמה).',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/40',
  },
  {
    id: 'sigint',
    label: 'SIGINT',
    english: 'Signals Intelligence',
    icon: 'bolt',
    source: 'האזנות לתקשורת אויב, רדיו, תקשורת לוויין. מאזינים, לא רואים.',
    strength: 'לוכד <strong>כוונה</strong>, לא רק מיקום. שמיעת פקודה לפני שמתבצעת. אין תלות במזג אוויר.',
    limitation: 'תלות בהפעלת תקשורת ע"י האויב. שתיקה אלקטרונית = אפס מידע. הצפנה מקשה.',
    color: 'text-accent-cool',
    bg: 'bg-accent-cool/10',
    border: 'border-accent-cool/40',
  },
  {
    id: 'humint',
    label: 'HUMINT',
    english: 'Human Intelligence',
    icon: 'people',
    source: 'סוכנים, מקורות, חיילים בשטח. בני אדם המדווחים על מה שהם רואים.',
    strength: 'הקשר, מוטיבציה, שיחות. סוכן יכול לראות מסמך, להבין משמעות, לאמת זהות.',
    limitation: 'איטי, יקר. סוכן אחד מסכן את חייו. דיווחים סובייקטיביים. סיכון לדיסאינפורמציה.',
    color: 'text-accent-hot',
    bg: 'bg-accent-hot/10',
    border: 'border-accent-hot/40',
  },
  {
    id: 'osint',
    label: 'OSINT',
    english: 'Open Source Intelligence',
    icon: 'megaphone',
    source: 'רשתות חברתיות, חדשות, פרסומים, תמונות לוויין מסחריות (Planet, Maxar).',
    strength: 'זמין ל<strong>כולם</strong>. עיתונאי באוקראינה זיהה תזוזת טנקים בטוויטר לפני המל"ט. דמוקרטיזציה של GEOINT.',
    limitation: 'רעש רב. ניסיון הטעיה אזרחית קל. דורש כלי AI לעיבוד וסינון.',
    color: 'text-status-warn',
    bg: 'bg-status-warn/10',
    border: 'border-status-warn/40',
  },
];

export function GEOINTScene() {
  const [activeLayers, setActiveLayers] = useState<Set<Layer>>(new Set(['imint']));

  const toggleLayer = (id: Layer) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confidence = activeLayers.size * 20 + (activeLayers.size === 4 ? 20 : 0);

  return (
    <section id="scene-geoint" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="12.1"
        eyebrow="GEOINT — אבני בניין"
        title={
          <>
            <span className="gradient-text">GEOINT</span> זה לא תמונה. זה רשת.
          </>
        }
        intro="GEOINT הוא מוצר-על שמאחד תמונות, האזנות, דיווחי שטח, וOSINT — מעוגן בקואורדינטה אחת. כל סוג מודיעין רואה רק חלק. הצלבת המקורות = האמת."
      />

      <div className="surface-elevated p-5 mb-6 border-r-4 border-r-accent-cool">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">GEOINT</strong> (Geospatial Intelligence) — אינטגרציה, ניתוח והנגשה של מידע גיאוגרפי. כולל:
            <strong className="text-fg block mt-1.5">צילומי חלל + סנסורים + מודלים תלת-ממדיים + מקורות גלויים וסמויים</strong>, הכל מעוגן דרך
            <strong className="text-fg"> Georeferencing</strong> לנקודות ציון מדויקות על כדור הארץ.
            <strong className="text-fg block mt-1.5">המטרה:</strong> לחשוף דפוסים, לזהות שגרה חריגה, להבין מגמות.
          </div>
        </div>
      </div>

      {/* Map with toggleable layers */}
      <div className="surface-elevated p-4 rounded-2xl mb-6 overflow-hidden">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-[10px] font-mono text-fg-dim tracking-widest uppercase">
            רשת מודיעין מרחבית · {activeLayers.size}/4 שכבות
          </div>
          <div className={cn(
            'chip',
            confidence >= 80 ? 'border-status-ok/40 bg-status-ok/10 text-status-ok' :
            confidence >= 40 ? 'border-status-warn/40 bg-status-warn/10 text-status-warn' :
            'border-status-danger/40 bg-status-danger/10 text-status-danger'
          )}>
            <Icon name={confidence >= 80 ? 'check' : 'spark'} size={12} strokeWidth={2.5} />
            <span className="font-mono">ביטחון: {confidence}%</span>
          </div>
        </div>

        <GEOINTMap activeLayers={activeLayers} />

        {confidence >= 80 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 surface p-3 rounded-lg bg-status-ok/5 border-status-ok/30"
          >
            <div className="text-[10px] font-mono text-status-ok mb-1 tracking-widest uppercase">
              ביטחון מודיעיני מקסימלי
            </div>
            <p className="text-xs text-fg leading-relaxed">
              כל ארבעת המקורות מאשרים אחד את השני. <strong>ביטחון מבצעי גבוה</strong>. אפשר לפעול.
            </p>
          </motion.div>
        )}
      </div>

      {/* Layer toggles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
        {LAYERS.map((l) => {
          const isActive = activeLayers.has(l.id);
          return (
            <button
              key={l.id}
              onClick={() => toggleLayer(l.id)}
              className={cn(
                'surface p-3 text-right transition-all rounded-xl flex items-center gap-2',
                isActive ? `${l.border} shadow-glow ${l.bg}` : 'hover:border-border-strong opacity-70'
              )}
            >
              <div className={cn('size-10 rounded-lg flex items-center justify-center border-2 shrink-0', l.border, l.bg)}>
                <Icon name={l.icon} size={18} className={l.color} />
              </div>
              <div className="min-w-0">
                <div className={cn('font-display font-bold leading-tight', isActive && l.color)}>
                  {l.label}
                </div>
                <div className="text-[10px] font-mono text-fg-dim">{isActive ? 'פעיל' : 'כבוי'}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Layer details */}
      <div className="grid sm:grid-cols-2 gap-3 mb-12">
        {LAYERS.filter((l) => activeLayers.has(l.id)).map((l) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('surface-elevated p-5 rounded-2xl border-r-4', l.border.replace('border-', 'border-r-'), l.bg)}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={cn('size-11 rounded-xl flex items-center justify-center border-2 shrink-0', l.border)}>
                <Icon name={l.icon} size={20} className={l.color} />
              </div>
              <div>
                <div className={cn('font-display font-bold text-lg leading-tight', l.color)}>{l.label}</div>
                <div className="text-[10px] font-mono text-fg-dim">{l.english}</div>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <div className="text-[10px] font-mono text-fg-dim mb-0.5 tracking-widest uppercase">מקור</div>
                <p className="text-fg leading-relaxed">{l.source}</p>
              </div>
              <div>
                <div className="text-[10px] font-mono text-status-ok mb-0.5 tracking-widest uppercase">חוזק</div>
                <p
                  className="text-fg leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: l.strength }}
                />
              </div>
              <div>
                <div className="text-[10px] font-mono text-status-warn mb-0.5 tracking-widest uppercase">מגבלה</div>
                <p className="text-fg-muted leading-relaxed">{l.limitation}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Geographic-as-network concept */}
      <div className="surface-elevated p-6 rounded-2xl border-r-4 border-r-accent">
        <div className="flex gap-4 items-start">
          <div className="size-12 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center shrink-0">
            <Icon name="layers" size={22} className="text-accent" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-mono text-accent mb-1 tracking-widest uppercase">
              הגיאוגרפיה כ"רשת עבודה"
            </div>
            <h3 className="font-display font-bold text-lg mb-2 leading-tight">
              המפה היא לא תוצר — היא שכבת בסיס
            </h3>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty">
              בצבאות מודרניים (יחידה <strong className="text-fg">9900 בצה"ל</strong>, NGA בארה"ב), הגיאוגרפיה היא לא "תוצר מודיעיני סופי" — היא <strong className="text-fg">שכבת בסיס טופולוגית</strong> שעליה "מלבישים" בזמן אמת:
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {[
                'מיקום כוחותינו (Blue Force Tracking)',
                'התרעות סייבר',
                'זיהויי רדאר ותצפיות',
                'דיווחים אנושיים מהשטח',
                'תמונות בזמן אמת מרחפנים ולוויינים',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <Icon name="check" size={11} strokeWidth={2.5} className="text-accent shrink-0 mt-1" />
                  <span className="text-fg leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty mt-3">
              <strong className="text-fg">התוצאה:</strong> מודל תלת-ממדי אינטראקטיבי המשמש פלטפורמת מחקר משותפת לכלל הזרועות. המפה הופכת ל-<strong className="text-fg">"Google Earth מבצעי"</strong> שכולם רואים את אותו דבר באותו רגע.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function GEOINTMap({ activeLayers }: { activeLayers: Set<Layer> }) {
  return (
    <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
      <svg viewBox="0 0 100 56" className="w-full h-full">
        <defs>
          <linearGradient id="geoint-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dde6f0" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="56" fill="url(#geoint-bg)" />

        {/* Base terrain — always visible */}
        <path d="M0 42 L20 38 L40 44 L60 36 L80 42 L100 38 L100 56 L0 56 Z" className="fill-terrain-sand/20" />

        {/* Geographic grid (always visible — the "base layer") */}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`gx${i}`} x1={i * 10} y1="0" x2={i * 10} y2="56" className="stroke-fg-dim" strokeWidth="0.1" opacity="0.3" />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={`gy${i}`} x1="0" y1={i * 11} x2="100" y2={i * 11} className="stroke-fg-dim" strokeWidth="0.1" opacity="0.3" />
        ))}

        {/* Target area */}
        <rect x="40" y="22" width="20" height="14" fill="none" className="stroke-accent" strokeWidth="0.3" strokeDasharray="1 0.7" />
        <text x="50" y="20" textAnchor="middle" className="fill-accent font-mono font-bold" fontSize="2.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.75" strokeLinejoin="round">
          אזור מטרה
        </text>

        {/* IMINT layer */}
        {activeLayers.has('imint') && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Camera positions */}
            <circle cx="48" cy="28" r="0.6" className="fill-accent" />
            <rect x="45" y="30" width="2" height="1.4" rx="0.2" className="fill-accent" />
            <text x="62" y="26" textAnchor="middle" className="fill-accent font-mono font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
              [IMINT] טנק T-90
            </text>
          </motion.g>
        )}

        {/* SIGINT layer — radio waves */}
        {activeLayers.has('sigint') && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <circle cx="52" cy="30" r="1.5" fill="none" className="stroke-accent-cool" strokeWidth="0.4">
              <animate attributeName="r" values="1.5;5;1.5" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0.1;0.9" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="52" cy="30" r="0.5" className="fill-accent-cool" />
            <text x="68" y="34" textAnchor="middle" className="fill-accent-cool font-mono font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
              [SIGINT] שידור 144MHz
            </text>
          </motion.g>
        )}

        {/* HUMINT layer */}
        {activeLayers.has('humint') && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <circle cx="58" cy="34" r="0.8" className="fill-accent-hot" />
            <line x1="58" y1="35" x2="58" y2="37" className="stroke-accent-hot" strokeWidth="0.3" />
            <text x="44" y="40" textAnchor="middle" className="fill-accent-hot font-mono font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
              [HUMINT] סוכן: "נראו 3 לוחמים"
            </text>
          </motion.g>
        )}

        {/* OSINT layer */}
        {activeLayers.has('osint') && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <rect x="44" y="25" width="3" height="3" rx="0.3" className="fill-status-warn/50 stroke-status-warn" strokeWidth="0.2" />
            <text x="68" y="46" textAnchor="middle" className="fill-status-warn font-mono font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
              [OSINT] Twitter: "ראיתי טנקים בכפר"
            </text>
            <text x="68" y="49" textAnchor="middle" className="fill-status-warn font-mono" fontSize="1.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.6" strokeLinejoin="round">
              tweet · 14:32
            </text>
          </motion.g>
        )}

        {/* Cross-reference lines (only when 3+ sources active) */}
        {activeLayers.size >= 3 && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.5 }}>
            <line x1="48" y1="28" x2="52" y2="30" className="stroke-status-ok" strokeWidth="0.2" strokeDasharray="0.4 0.3" />
            <line x1="52" y1="30" x2="58" y2="34" className="stroke-status-ok" strokeWidth="0.2" strokeDasharray="0.4 0.3" />
            <line x1="48" y1="28" x2="58" y2="34" className="stroke-status-ok" strokeWidth="0.2" strokeDasharray="0.4 0.3" />
          </motion.g>
        )}

        {/* Confidence label */}
        {activeLayers.size === 0 && (
          <text x="50" y="8" textAnchor="middle" className="fill-fg-dim font-display" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.95" strokeLinejoin="round">
            אין נתונים — הפעל שכבת מודיעין
          </text>
        )}
      </svg>
    </div>
  );
}
