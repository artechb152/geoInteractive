'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Level = 'strategic' | 'operational' | 'tactical';

type LevelMeta = {
  label: string;
  english: string;
  who: string;
  zoom: string;
  zoomIcon: IconName;
  time: string;
  example: string;
  borderActive: string;
  bgActive: string;
  borderRight: string;
  text: string;
  fillClass: string;
  zoomLevel: number; // 1=widest, 3=closest
};

const LEVELS: Record<Level, LevelMeta> = {
  strategic: {
    label: 'אסטרטגית',
    english: 'Strategic',
    who: 'הדרג המדיני (הממשלה) והרמטכ"ל',
    zoom: '"מבט מלוויין" (גלובלי) – מדינות שלמות, יבשות ואוקיינוסים.',
    zoomIcon: 'globe',
    time: 'חודשים עד שנים. החלטות שמשפיעות על דורות.',
    example: 'האם המדינה יוצאת למלחמה כוללת? עם אילו מדינות חותמים ברית? החלטות תקציב דרמטיות, למשל – להפסיק לייצר טנקים ולרכוש צוללות במקום.',
    borderActive: 'border-accent-intel',
    bgActive: 'bg-accent-intel/15',
    borderRight: 'border-r-accent-intel',
    text: 'text-accent-intel',
    fillClass: 'fill-accent-intel/30',
    zoomLevel: 1,
  },
  operational: {
    label: 'אופרטיבית',
    english: 'Operational',
    who: 'אלופי הפיקודים ומפקדי האוגדות — דרג הביניים שמחבר בין החזון לשטח.',
    zoom: '"מבט רחב ב-Waze" (אזורי) – עשרות עד מאות קילומטרים.',
    zoomIcon: 'layers',
    time: 'ימים, שבועות או חודשים.',
    example: 'תכנון איך להזרים 30,000 חיילים ומאות טנקים לחזית מבלי ליצור פקק תנועה ענק ופגיע, והחלטה איפה להקים עבורם מאגרי דלק ענקיים בשטח.',
    borderActive: 'border-accent',
    bgActive: 'bg-accent/15',
    borderRight: 'border-r-accent',
    text: 'text-accent',
    fillClass: 'fill-accent/30',
    zoomLevel: 2,
  },
  tactical: {
    label: 'טקטית',
    english: 'Tactical',
    who: 'המפקדים בשטח (מג"דים, מ"פים) ועד החייל הבודד בקצה.',
    zoom: '"Street View" (מקומי) – נמדד במטרים: סלע בודד, חלון בבניין או ערוץ נחל.',
    zoomIcon: 'crosshair',
    time: 'שניות, דקות או שעות ספורות. החלטות של חיים ומוות ב"כאן ועכשיו".',
    example: 'בחירת סלע ספציפי שיסתיר חייל מצלף, החלטה מאיזו זווית לפרוץ לבניין כדי שהשמש תסנוור את האויב, ובאיזה ערוץ נחל הפלוגה תתגנב בשקט בלי להתגלות.',
    borderActive: 'border-terrain-sand',
    bgActive: 'bg-terrain-sand/15',
    borderRight: 'border-r-terrain-sand',
    text: 'text-terrain-sand',
    fillClass: 'fill-terrain-sand/30',
    zoomLevel: 3,
  },
};

const SCENARIOS: { text: string; correct: Level; icon: IconName }[] = [
  { text: 'מפקד פלוגה מאתר עמדת מקלע אויב על שלוחה', correct: 'tactical', icon: 'crosshair' },
  { text: 'מטכ"ל מחליט לפתוח גזרה חדשה בצפון', correct: 'strategic', icon: 'globe' },
  { text: 'אלוף הפיקוד מסנכרן תנועת אוגדה מול חיל אוויר', correct: 'operational', icon: 'layers' },
  { text: 'נגד מפעיל מקלע מתחלף לעמדה סמוכה', correct: 'tactical', icon: 'target' },
  { text: 'ראש ממשלה מאשר העברת תקציב הגנה לזירה אסיאתית', correct: 'strategic', icon: 'flag' },
  { text: 'מפקדת חטיבה משריינת מתאמת ציר לוגיסטי עם פיקוד עורף', correct: 'operational', icon: 'truck' },
];

export function LevelsScene() {
  const [open, setOpen] = useState<Level>('operational');
  const [picks, setPicks] = useState<Record<number, Level>>({});

  const correctCount = Object.entries(picks).filter(
    ([i, l]) => SCENARIOS[Number(i)].correct === l
  ).length;
  const answered = Object.keys(picks).length;

  return (
    <section id="scene-levels" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="01.1"
        eyebrow="רמות המלחמה"
        title={
          <>
            <span className="gradient-text">3 רמות</span> · אותה מלחמה, רזולוציה אחרת
          </>
        }
        intro="בדיוק כמו באפליקציית ניווט, המלחמה נראית לגמרי אחרת בהתאם ל'זום' שבו מסתכלים עליה. לחצו על כל רמה כדי לגלות מי מחליט, על איזה שטח מדובר, ואיך מודדים שם זמן."
      />

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        <div className="surface-elevated p-6 flex flex-col items-center justify-center gap-4">
          <SVGPyramid open={open} setOpen={setOpen} />
          <div className="text-xs text-fg-dim font-mono tracking-widest uppercase mt-2">
            למעלה: רחב במרחב ובזמן · למטה: צמוד לקרקע
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={open}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className={cn('surface-elevated p-6 border-r-4', LEVELS[open].borderRight)}
          >
            <div className="flex items-baseline justify-between mb-5">
              <h3 className={cn('text-3xl font-bold', LEVELS[open].text)}>{LEVELS[open].label}</h3>
              <span className="font-mono text-xs text-fg-dim">{LEVELS[open].english}</span>
            </div>

            <ZoomIndicator level={LEVELS[open].zoomLevel} icon={LEVELS[open].zoomIcon} />

            <dl className="space-y-3 mt-5 mb-5">
              <Row label="מי מחליט" value={LEVELS[open].who} />
              <Row label="זום מרחבי" value={LEVELS[open].zoom} />
              <Row label="אופק זמן" value={LEVELS[open].time} />
            </dl>
            <div className="pt-4 border-t border-border-subtle">
              <div className="text-xs font-mono text-fg-dim mb-1.5 tracking-widest uppercase">דוגמה</div>
              <div className="text-sm text-fg leading-relaxed">{LEVELS[open].example}</div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-12">
        <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
          <div>
            <h3 className="text-xl font-bold mb-1">תרגול מהיר</h3>
            <p className="text-fg-muted text-sm">סווג כל אירוע לרמה הנכונה</p>
          </div>
          {answered > 0 && (
            <div className="chip border-accent/40 bg-accent/10 text-accent">
              <Icon name="check" size={14} strokeWidth={2.5} />
              <span className="font-mono">{correctCount}/{answered} נכון</span>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {SCENARIOS.map((s, i) => {
            const picked = picks[i];
            const isCorrect = picked === s.correct;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'surface p-4 transition-all',
                  picked && isCorrect && 'border-status-ok/40 bg-status-ok/5',
                  picked && !isCorrect && 'border-status-danger/40 bg-status-danger/5',
                  !picked && 'hover:border-border-strong'
                )}
              >
                <div className="flex gap-3 mb-3">
                  <div className={cn(
                    'size-8 rounded-lg flex items-center justify-center shrink-0',
                    picked ? (isCorrect ? 'bg-status-ok/15 text-status-ok' : 'bg-status-danger/15 text-status-danger') : 'bg-bg-accent text-fg-muted'
                  )}>
                    <Icon name={s.icon} size={16} />
                  </div>
                  <p className="text-sm leading-relaxed flex-1">{s.text}</p>
                </div>
                <div className="flex gap-1.5">
                  {(['strategic', 'operational', 'tactical'] as Level[]).map((l) => {
                    const showResult = !!picked && l === picked;
                    return (
                      <button
                        key={l}
                        onClick={() => setPicks((p) => ({ ...p, [i]: l }))}
                        className={cn(
                          'flex-1 px-2 py-2 rounded-lg text-xs font-medium border transition-all',
                          !picked && 'border-border hover:border-accent/50 hover:bg-accent/5 active:scale-[0.97]',
                          showResult && isCorrect && 'border-status-ok bg-status-ok/15 text-status-ok',
                          showResult && !isCorrect && 'border-status-danger bg-status-danger/15 text-status-danger',
                          picked && !showResult && l === s.correct && 'border-status-ok/50 bg-status-ok/5 text-status-ok',
                          picked && !showResult && l !== s.correct && 'opacity-40'
                        )}
                        disabled={!!picked}
                      >
                        {LEVELS[l].label}
                      </button>
                    );
                  })}
                </div>
                {picked && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={cn('mt-2 text-xs flex items-center gap-1.5', isCorrect ? 'text-status-ok' : 'text-status-danger')}
                  >
                    <Icon name={isCorrect ? 'check' : 'spark'} size={12} strokeWidth={2.5} />
                    {isCorrect ? 'נכון!' : `התשובה הנכונה: ${LEVELS[s.correct].label}`}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SVGPyramid({ open, setOpen }: { open: Level; setOpen: (l: Level) => void }) {
  const order: { id: Level; y: number; left: number; right: number }[] = [
    { id: 'strategic',   y: 8,   left: 5,  right: 95 },
    { id: 'operational', y: 40,  left: 22, right: 78 },
    { id: 'tactical',    y: 70,  left: 36, right: 64 },
  ];
  const bottomCap = { y: 98, left: 44, right: 56 };

  return (
    <svg viewBox="0 0 100 110" className="w-full max-w-[280px]">
      {/* Outer (inverted) pyramid outline — wide top, narrow truncated bottom */}
      <polygon
        points={`${order[0].left},${order[0].y - 3} ${order[0].right},${order[0].y - 3} ${bottomCap.right},${bottomCap.y + 2} ${bottomCap.left},${bottomCap.y + 2}`}
        className="fill-bg-card stroke-border"
        strokeWidth="0.5"
      />

      {order.map((r, i) => {
        const next = order[i + 1] ?? bottomCap;
        const isActive = open === r.id;
        const meta = LEVELS[r.id];
        const points = `${r.left},${r.y} ${r.right},${r.y} ${next.right},${next.y} ${next.left},${next.y}`;
        return (
          <g key={r.id} onClick={() => setOpen(r.id)} className="cursor-pointer">
            <polygon
              points={points}
              className={cn(
                'transition-all duration-300',
                isActive ? meta.fillClass : 'fill-bg-elevated',
                isActive ? 'stroke-current' : 'stroke-border-subtle',
                isActive && meta.text
              )}
              strokeWidth="0.6"
            />
            {/* Label */}
            <text
              x="50"
              y={(r.y + next.y) / 2 + 1}
              textAnchor="middle"
              className={cn(
                'text-[5px] font-display font-bold transition-colors',
                isActive ? `${meta.text}` : 'fill-fg-muted'
              )}
            >
              {meta.label}
            </text>
            <text
              x="50"
              y={(r.y + next.y) / 2 + 7}
              textAnchor="middle"
              className="fill-fg-dim text-[3px] font-mono"
            >
              {meta.english}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ZoomIndicator({ level, icon }: { level: number; icon: IconName }) {
  return (
    <div className="surface bg-bg-accent/40 px-4 py-3 flex items-center gap-3">
      <Icon name={icon} size={20} className="text-fg-muted" />
      <div className="flex-1">
        <div className="text-xs font-mono text-fg-dim mb-1.5 tracking-widest uppercase">רזולוציית התבוננות</div>
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all',
                i <= level ? 'bg-accent' : 'bg-bg-accent border border-border-subtle'
              )}
            />
          ))}
        </div>
      </div>
      <span className="font-mono text-xs text-fg-muted">{level === 1 ? 'רחוק' : level === 2 ? 'בינוני' : 'קרוב'}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <dt className="text-xs font-mono text-fg-dim mb-1 tracking-widest uppercase">{label}</dt>
      <dd className="text-fg leading-relaxed">{value}</dd>
    </div>
  );
}
