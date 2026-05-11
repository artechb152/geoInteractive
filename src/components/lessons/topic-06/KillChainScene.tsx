'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Stage = 'find' | 'fix' | 'engage' | 'hit';

type StageData = {
  id: Stage;
  label: string;
  english: string;
  icon: IconName;
  question: string;
  losRole: string;
  failure: string;
  fix: string;
  color: string;
  bg: string;
  border: string;
};

const STAGES: StageData[] = [
  {
    id: 'find',
    label: 'איתור',
    english: 'Find / Detect',
    icon: 'eye',
    question: 'איפה האויב?',
    losRole: 'סנסור (תצפיתן, רחפן, לוויין) חייב LOS כדי <strong>לראות</strong> את המטרה ולסווג אותה. בלי קו ראייה — אין מטרה.',
    failure: 'תצפית חוסמה ע"י ערפל בוקר. סוללת רקטות שיוצרת חתימה תרמית אבל לא חזותית — נשארת בלתי מסווגת.',
    fix: 'הצלבת סנסורים: SAR (רדאר) רואה דרך ענן, אופטיקה רגילה לא. ESM (חיתוך תקשורת) משלים. סנסור מצליב סנסור.',
    color: 'text-terrain-sky',
    bg: 'bg-terrain-sky/10',
    border: 'border-terrain-sky/40',
  },
  {
    id: 'fix',
    label: 'נעילה',
    english: 'Fix / Track',
    icon: 'crosshair',
    question: 'איפה היא תהיה כשהחימוש יגיע?',
    losRole: 'הסנסור חייב להמשיך לראות את המטרה כדי <strong>לעדכן</strong> את המיקום ולחשב את נקודת הפגיעה. LOS רציף — לא מבזק.',
    failure: 'כטב"ם שמעקב אחרי טנק. הטנק נכנס לפרדס סבוך. LOS נשבר. כשהוא יוצא בצד השני, נעלם מהמסך — נעילה אבדה.',
    fix: 'מספר סנסורים שעוקבים במקביל. אם אחד מאבד — השני נכנס. או — חישוב מסלול חזוי על סמך הנתון האחרון, עד חזרת LOS.',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/40',
  },
  {
    id: 'engage',
    label: 'שיגור',
    english: 'Engage / Launch',
    icon: 'bolt',
    question: 'באיזה חימוש לפגוע?',
    losRole: 'חימושים מונחי לייזר / וידאו <strong>דורשים LOS רציף</strong> מהמטוס/הקת"ק לאורך כל מעוף הטיל. חימוש GPS לא — אבל פחות מדויק.',
    failure: 'תקיפת לייזר בעיראק 2003: ענן נכנס בין המטוס למטרה ברגע השיגור. הלייזר איבד את הסימון. הטיל נפל בשדה ריק.',
    fix: 'תכנון תאורת מטרה ע"י <strong>קת"ק שני</strong> מזווית שונה, או חימוש GPS חלופי כאשר ה-LOS האופטי לא בטוח.',
    color: 'text-accent-hot',
    bg: 'bg-accent-hot/10',
    border: 'border-accent-hot/40',
  },
  {
    id: 'hit',
    label: 'פגיעה ובדיקת תוצאה',
    english: 'Hit / BDA',
    icon: 'target',
    question: 'האם פגענו?',
    losRole: 'הערכת נזק (BDA - Battle Damage Assessment) דורשת LOS חדש על המטרה <strong>אחרי</strong> הפגיעה — סנסור שונה לרוב, מאוחר יותר.',
    failure: 'תקיפה בלילה על מתחם. עשן ואבק הסתירו את הנזק. ב-BDA למחרת התברר שהפצצה פספסה ב-20 מטר ולא פגעה בכלל.',
    fix: 'תכנון מראש של <strong>מסלולי BDA</strong> — רחפן שעובר אחרי, סנסור SAR שעובד בכל מזג אוויר, או OSINT (תמונות לוויין מסחריות).',
    color: 'text-status-ok',
    bg: 'bg-status-ok/10',
    border: 'border-status-ok/40',
  },
];

export function KillChainScene() {
  const [active, setActive] = useState<Stage>('find');
  const meta = STAGES.find((s) => s.id === active)!;
  const activeIdx = STAGES.findIndex((s) => s.id === active);

  return (
    <section id="scene-killchain" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="06.3"
        eyebrow="LOS ו-Kill Chain"
        title={
          <>
            <span className="gradient-text">שרשרת התקיפה</span> — וההלולאה שמחזיקה אותה
          </>
        }
        intro="כל תקיפה מבצעית היא שרשרת של 4 שלבים. כל שלב מחובר בחוט אחד — קו הראייה. אם החוט נקטע באמצע, השרשרת קורסת. בוא נראה איפה ולמה."
      />

      <div className="surface-elevated p-5 mb-6 border-r-4 border-r-accent-cool">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">Kill Chain</strong> (שרשרת התקיפה) — תהליך 4 שלבי שמתחיל באיתור המטרה ומסתיים בהשמדתה.
            <strong className="text-fg block mt-1.5">הסוד:</strong> כל שלב תלוי בשלב שלפניו. LOS שבור בשלב 2 = הכל מתבטל. ניתוח גיאוגרפי טוב = ניתוח של LOS בכל אחד מ-4 השלבים, מראש.
          </div>
        </div>
      </div>

      {/* Chain visualization — 4 stages connected */}
      <div className="surface-elevated p-5 sm:p-6 rounded-2xl mb-6">
        <div className="text-[10px] font-mono text-fg-dim mb-4 tracking-widest uppercase text-center">
          לחץ על שלב כדי לראות את התלות שלו ב-LOS
        </div>

        <div className="flex flex-row-reverse items-center justify-between gap-2 sm:gap-4 relative">
          {STAGES.map((s, i) => {
            const isActive = active === s.id;
            const isPassed = activeIdx > i;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => setActive(s.id)}
                  className={cn(
                    'group flex flex-col items-center gap-2 relative w-full p-2 sm:p-3 rounded-xl transition-all',
                    isActive && `${s.border} ${s.bg} shadow-glow`,
                    !isActive && 'hover:bg-bg-accent/40'
                  )}
                >
                  <div
                    className={cn(
                      'size-12 sm:size-14 rounded-2xl flex items-center justify-center border-2 transition-all',
                      isActive ? `${s.border} ${s.bg}` : isPassed ? 'border-status-ok/40 bg-status-ok/10' : 'border-border bg-bg-accent'
                    )}
                  >
                    <Icon
                      name={s.icon}
                      size={22}
                      className={cn(
                        isActive ? s.color : isPassed ? 'text-status-ok' : 'text-fg-dim'
                      )}
                    />
                  </div>
                  <div className={cn('font-display font-bold text-xs sm:text-sm leading-tight text-center', isActive && s.color)}>
                    {s.label}
                  </div>
                  <div className="text-[9px] font-mono text-fg-dim text-center hidden sm:block">{s.english}</div>
                </button>
                {/* Connector arrow (between stages, but not after the last one) */}
                {i < STAGES.length - 1 && (
                  <div className="hidden sm:flex items-center px-1 text-fg-dim shrink-0">
                    <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
                      <path
                        d="M22 7L1 7"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeDasharray="2 1.5"
                      />
                      <path d="M5 3L1 7L5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active stage details */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className={cn('surface-elevated p-6 rounded-2xl border-r-4 mb-12', meta.border.replace('border-', 'border-r-'))}
        >
          <div className="flex items-start gap-4 mb-5">
            <div className={cn('size-12 rounded-xl flex items-center justify-center border-2 shrink-0', meta.border, meta.bg)}>
              <Icon name={meta.icon} size={22} className={meta.color} />
            </div>
            <div className="flex-1">
              <div className={cn('text-[10px] font-mono mb-0.5 tracking-widest uppercase', meta.color)}>
                שלב {activeIdx + 1}: {meta.english}
              </div>
              <h3 className="font-display font-bold text-xl leading-tight mb-1">{meta.label}</h3>
              <p className="text-sm text-fg-muted leading-relaxed italic">"{meta.question}"</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="surface p-4 rounded-xl bg-bg-accent/20">
              <div className={cn('text-[10px] font-mono mb-2 tracking-widest uppercase flex items-center gap-1.5', meta.color)}>
                <Icon name="eye" size={11} />
                תפקיד LOS
              </div>
              <p
                className="text-sm text-fg leading-relaxed"
                dangerouslySetInnerHTML={{ __html: meta.losRole }}
              />
            </div>
            <div className="surface p-4 rounded-xl bg-status-danger/5 border-status-danger/30">
              <div className="text-[10px] font-mono text-status-danger mb-2 tracking-widest uppercase flex items-center gap-1.5">
                <Icon name="spark" size={11} />
                מה קורה כש-LOS נשבר
              </div>
              <p className="text-sm text-fg-muted leading-relaxed">{meta.failure}</p>
            </div>
            <div className="surface p-4 rounded-xl bg-status-ok/5 border-status-ok/30">
              <div className="text-[10px] font-mono text-status-ok mb-2 tracking-widest uppercase flex items-center gap-1.5">
                <Icon name="check" size={11} strokeWidth={2.5} />
                איך מתמודדים
              </div>
              <p
                className="text-sm text-fg leading-relaxed"
                dangerouslySetInnerHTML={{ __html: meta.fix }}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <SoftDivider text="המושג שמחזיק את הכל יחד" />

      {/* Continuous coverage cell */}
      <div className="surface-elevated p-6 rounded-2xl">
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-center">
          <div>
            <div className="text-[10px] font-mono text-accent mb-1 tracking-widest uppercase">
              מרחב הכיסוי הרציף
            </div>
            <h3 className="font-display font-bold text-xl mb-3 leading-tight">
              תא שטח שבכל רגע נתון <span className="gradient-text">מישהו רואה אותו</span>
            </h3>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty mb-3">
              זה מושג שמתאר תא שטח (אווירי וקרקעי) שבו מתקיים בכל רגע <strong className="text-fg">כיסוי חיישני מלא</strong> — לוויינים, רחפנים, האזנות, תצפיות. בתוך התא, אויב או רכב לא יכול לחמוק ממעקב.
            </p>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty">
              <strong className="text-fg">הסיבה לסנכרון:</strong> אם המטרה יוצאת מגבולות התא — נדרש מעבר מיידי לרשת המודיעין השכנה, אחרת מאבדים מגע. ניתוח גיאוגרפי טוב = הגדרת התא, גבולותיו, ומי "מקבל" את המטרה במעבר.
            </p>
          </div>

          {/* Coverage visualization */}
          <CoverageCellViz />
        </div>
      </div>
    </section>
  );
}

function CoverageCellViz() {
  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <defs>
          <radialGradient id="cell-1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--status-ok)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--status-ok)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cell-2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cell-3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-cool)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent-cool)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="100" height="75" className="fill-bg-elevated" />

        {/* Grid */}
        {Array.from({ length: 11 }).map((_, i) => (
          <g key={i}>
            <line x1={i * 10} y1="0" x2={i * 10} y2="75" className="stroke-border-subtle" strokeWidth="0.1" />
            <line x1="0" y1={i * 7.5} x2="100" y2={i * 7.5} className="stroke-border-subtle" strokeWidth="0.1" />
          </g>
        ))}

        {/* Sensor coverage circles (overlapping) */}
        <ellipse cx="28" cy="32" rx="22" ry="18" fill="url(#cell-1)" />
        <ellipse cx="58" cy="40" rx="24" ry="20" fill="url(#cell-2)" />
        <ellipse cx="78" cy="28" rx="20" ry="17" fill="url(#cell-3)" />

        {/* Sensor markers */}
        {[
          { x: 28, y: 32, name: 'תצפית', color: 'fill-status-ok stroke-status-ok' },
          { x: 58, y: 40, name: 'כטב"ם', color: 'fill-accent stroke-accent' },
          { x: 78, y: 28, name: 'לוויין', color: 'fill-accent-cool stroke-accent-cool' },
        ].map((s) => (
          <g key={s.name}>
            <circle cx={s.x} cy={s.y} r="1.6" className={s.color} />
            <text
              x={s.x}
              y={s.y - 3.5}
              textAnchor="middle"
              className={cn('font-mono font-bold', s.color.split(' ')[0])}
              fontSize="3"
              paintOrder="stroke"
              stroke="#ffffff"
              strokeWidth="1"
              strokeLinejoin="round"
            >
              {s.name}
            </text>
          </g>
        ))}

        {/* Moving target */}
        <motion.g
          animate={{ x: [0, 60, 0] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
        >
          <circle cx="18" cy="55" r="1.5" className="fill-accent-hot" />
          <circle cx="18" cy="55" r="3" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
            <animate attributeName="r" values="2;5;2" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </motion.g>

        {/* Dead zone */}
        <rect x="6" y="60" width="16" height="11" rx="1" className="fill-status-danger/15 stroke-status-danger/50" strokeWidth="0.4" strokeDasharray="1 0.6" />
        <text
          x="14"
          y="67.5"
          textAnchor="middle"
          className="fill-status-danger font-display font-bold"
          fontSize="3"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="1"
          strokeLinejoin="round"
        >
          פער כיסוי
        </text>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        3 סנסורים · כיסוי מצטבר
      </div>
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
