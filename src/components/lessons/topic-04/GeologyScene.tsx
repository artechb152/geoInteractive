'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Rock = {
  id: 'igneous' | 'sediment' | 'metamorphic';
  label: string;
  english: string;
  description: string;
  examples: string;
  military: string;
  color: string;
};

const ROCKS: Rock[] = [
  {
    id: 'igneous',
    label: 'סלעי יסוד',
    english: 'Igneous',
    description: 'נוצרו מהתקשות של מאגמה (סלע נוזלי מתחת לפני האדמה). זה הסלע הקשה והיציב ביותר.',
    examples: 'גרניט, בזלת',
    military: 'קשה לחפור בו עמדות. מצוין לבסיסים מבוצרים. אבל אם הוא נחשף — קשה גם להסתתר עליו.',
    color: 'text-accent-hot',
  },
  {
    id: 'sediment',
    label: 'סלעי משקע',
    english: 'Sedimentary',
    description: 'נוצרו משכבות של חול, אבנים וצמחייה שנדחסו לאורך מיליוני שנים. רך יותר מסלעי יסוד.',
    examples: 'גיר, חוואר, אבן חול',
    military: 'נוח לחפור בו מנהרות (כמו בעזה). יוצר נופים מעוגלים. אבל מתפורר תחת הפצצות חוזרות.',
    color: 'text-accent',
  },
  {
    id: 'metamorphic',
    label: 'סלעים מותמרים',
    english: 'Metamorphic',
    description: 'סלעים שעברו שינוי תחת חום ולחץ אדירים, ושינו את הצורה והמבנה שלהם.',
    examples: 'שיש, צפחה',
    military: 'חוזק משתנה. לפעמים יוצר שכבות מסוכנות לטיפוס. נדיר בישראל אבל נפוץ בהרי טורוס.',
    color: 'text-accent-intel',
  },
];

type Force = {
  id: 'endo' | 'exo';
  label: string;
  english: string;
  scale: string;
  what: string;
  examples: string[];
  icon: IconName;
};

const FORCES: Force[] = [
  {
    id: 'endo',
    label: 'כוחות מבפנים (אנדוגניים)',
    english: 'Endogenic',
    scale: 'מקרו-טופוגרפיה · הרים שלמים',
    what: 'כוחות שפועלים עמוק מתחת לקרקע — זרמי מאגמה, תזוזת לוחות טקטוניים. הם דוחפים, מקפלים ושוברים את הקרום של כדור הארץ.',
    examples: ['רכסי הרים שלמים', 'שברים ארוכים (כמו השבר הסורי-אפריקני)', 'הרי געש', 'רעידות אדמה'],
    icon: 'mountain',
  },
  {
    id: 'exo',
    label: 'כוחות מבחוץ (אקסוגניים)',
    english: 'Exogenic',
    scale: 'מיקרו-טופוגרפיה · קפלי קרקע מקומיים',
    what: 'כוחות שפועלים על פני השטח — מים, רוח, חום וקור, כוח המשיכה. הם מבלים, סוחפים ומפוררים את הסלע במשך זמן.',
    examples: ['ערוצי נחל וגיאיות', 'מצוקים שנגרסים מגלים', 'דיונות חול בנוצרות מרוח', 'דרדרות סלעים במדרונות'],
    icon: 'wave',
  },
];

export function GeologyScene() {
  const [rock, setRock] = useState<Rock['id']>('sediment');
  const [force, setForce] = useState<Force['id']>('endo');
  const rockData = ROCKS.find((r) => r.id === rock)!;
  const forceData = FORCES.find((f) => f.id === force)!;

  return (
    <section id="scene-geology" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="04.1"
        eyebrow="גיאולוגיה צבאית"
        title={
          <>
            לפני שלומדים <span className="gradient-text">איך הנוף נראה</span>, צריך להבין מה הוא עשוי
          </>
        }
        intro="גיאולוגיה זה תורת הקרקע: מאיזה חומר עשוי הסלע, איך הוא נוצר, ואיך הוא משפיע על הנוף שמעליו. בלי זה, אי אפשר באמת לקרוא נכון את צורת השטח."
      />

      <div className="surface-elevated p-5 mb-6 border-r-4 border-r-accent-cool">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">למה זה חשוב למפקד?</strong>{' '}
            סוג הסלע קובע אם אפשר לחפור עמדה, אם הקרקע סופגת מים (חשוב לעבירות אחרי גשם),
            ואם אפשר להעביר טנקים או רק כוחות רגליים. סלע אחד = החלטות שונות בכל המבצע.
          </div>
        </div>
      </div>

      <div className="my-12">
        <div className="mb-5">
          <h3 className="text-xl font-bold mb-1">3 סוגי הסלעים</h3>
          <p className="text-fg-muted text-sm">
            כל הסלעים בעולם נכנסים לאחת משלוש הקבוצות האלה. כל קבוצה — אופי שונה והשלכות צבאיות שונות.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          {ROCKS.map((r) => {
            const active = rock === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRock(r.id)}
                className={cn(
                  'surface p-4 text-right transition-all',
                  active ? 'border-accent shadow-glow bg-accent/5' : 'hover:border-border-strong'
                )}
              >
                <div className={cn('font-display font-bold', active ? 'text-accent' : r.color)}>{r.label}</div>
                <div className="text-[10px] font-mono text-fg-dim mt-1">{r.english}</div>
                <div className="text-[11px] text-fg-muted mt-2 leading-relaxed">{r.examples}</div>
              </button>
            );
          })}
        </div>

        <motion.div
          key={rock}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-elevated p-5 sm:p-6 grid md:grid-cols-2 gap-6"
        >
          <div className="flex gap-4 items-start">
            <Icon name="layers" size={22} className="text-accent-cool shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-mono text-accent-cool mb-1.5 tracking-widest uppercase">
                איך נוצר ומאיפה
              </div>
              <p className="text-sm leading-relaxed text-fg">{rockData.description}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <Icon name="crosshair" size={22} className="text-accent shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-mono text-accent mb-1.5 tracking-widest uppercase">
                המשמעות הצבאית
              </div>
              <p className="text-sm leading-relaxed text-fg">{rockData.military}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="my-12">
        <div className="mb-5">
          <h3 className="text-xl font-bold mb-1">2 כוחות שמעצבים כל הר בכוכב הזה</h3>
          <p className="text-fg-muted text-sm">
            הנוף לא קיים סתם ככה. הוא נוצר מ-2 סוגי כוחות: כוחות שדוחפים מבפנים (יוצרים הרים), וכוחות
            שמבלים מבחוץ (חורצים גיאיות).
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_1fr] gap-3 mb-4">
          {FORCES.map((f) => {
            const active = force === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setForce(f.id)}
                className={cn(
                  'surface p-5 text-right transition-all flex items-start gap-3',
                  active ? 'border-accent shadow-glow bg-accent/5' : 'hover:border-border-strong'
                )}
              >
                <div className={cn(
                  'size-12 rounded-xl flex items-center justify-center shrink-0',
                  active ? 'bg-accent/15 border border-accent/40 text-accent' : 'bg-bg-accent text-fg-muted'
                )}>
                  <Icon name={f.icon} size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn('font-display font-bold leading-tight', active && 'text-accent')}>{f.label}</div>
                  <div className="text-[10px] font-mono text-fg-dim mt-0.5">{f.english}</div>
                  <div className="text-[11px] text-fg-muted mt-1.5">{f.scale}</div>
                </div>
              </button>
            );
          })}
        </div>

        <motion.div
          key={force}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-elevated p-5 sm:p-6"
        >
          <p className="text-sm sm:text-base text-fg leading-relaxed mb-4">{forceData.what}</p>
          <div className="text-[10px] font-mono text-fg-dim mb-2 tracking-widest uppercase">דוגמאות בנוף</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {forceData.examples.map((e) => (
              <div key={e} className="flex gap-2 items-start text-sm">
                <Icon name="check" size={14} className="text-accent mt-1 shrink-0" strokeWidth={2.5} />
                <span className="text-fg-muted">{e}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="surface-elevated p-6 border-r-4 border-r-accent flex gap-4 items-start"
      >
        <Icon name="spark" size={22} className="text-accent shrink-0 mt-0.5" />
        <div>
          <div className="text-[10px] font-mono text-accent mb-1 tracking-widest uppercase">סיכום העיקרון</div>
          <p className="text-fg leading-relaxed text-pretty">
            כל נוף שאתה רואה הוא תוצאה של שני כוחות: <strong className="text-fg">בפנים דוחפים, בחוץ מבלים</strong>.
            סוג הסלע קובע באיזה קצב הכוחות האלה פועלים — וזה אומר איזה נוף תקבל. הר בזלת קשה ייראה אחרת
            לחלוטין מגבעות גיר רכות. ההכרה הזו היא הבסיס לכל מה שבא אחר כך.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
