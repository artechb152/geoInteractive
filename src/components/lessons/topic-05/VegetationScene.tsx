'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type VegId = 'herbaceous' | 'batta' | 'griga' | 'forest';
type Season = 'winter' | 'summer';

type VegType = {
  id: VegId;
  label: string;
  english: string;
  height: string;
  winter: string;
  summer: string;
  cover: string;
  concealment: string;
  mobility: string;
  density: number; // 1-4 visual density indicator
};

const VEGETATION: VegType[] = [
  {
    id: 'herbaceous',
    label: 'עשבוני / חד־שנתי',
    english: 'Herbaceous / Annual',
    height: 'עד 0.3 מ\'',
    winter: 'ירוק עז ובהיר אחרי נביטה — קל לזהות שטחים מסוקלים ושבילי מרעולים.',
    summer: 'מתייבש לחלוטין. הצבע הופך לחום-זהוב והקרקע חשופה. סכנת שריפה.',
    cover: 'אפס. גובה נמוך מדי לעצור אש או רסיסים.',
    concealment: 'נמוכה. רק לשכיבה — בהליכה נחשפים מיד.',
    mobility: 'מצוינת. אין מכשולים. רק"ם נע בחופשיות.',
    density: 1,
  },
  {
    id: 'batta',
    label: 'בתה',
    english: 'Batha',
    height: 'עד 0.5 מ\'',
    winter: 'משלב עשבוני ובני־שיח נמוכים. שינוי עונתי בולט בצבע.',
    summer: 'שיחים שורדים אך עשבים מתייבשים. רואים שבילים ומרעולים בבירור.',
    cover: 'מינימלי. מסת השיחים קטנה מדי לעצור כדורים.',
    concealment: 'בינונית. מספקת כיסוי לכריעה ולזחילה — לא להליכה זקופה.',
    mobility: 'טובה. כלים זחליליים עוברים, גלגליים זקוקים לנתיב מוסדר.',
    density: 2,
  },
  {
    id: 'griga',
    label: 'גריגה',
    english: 'Garigue',
    height: '0.5–2 מ\'',
    winter: 'ירוק כהה ועז. לעיתים פריחה בסוף החורף ובאביב.',
    summer: 'חום-אפור-ירקרק. צפיפות נשמרת — תכסית פעילה כל השנה.',
    cover: 'משתנה. שיחי סירה ואלון מצוי יכולים לעצור רסיסים קטנים, לא כדורי 5.56.',
    concealment: 'גבוהה. עומד תקוע — אויב 20 מ\' מולך לא רואה אותך.',
    mobility: 'מוגבלת. כלי רגלי איטי, רק"ם נצמד לשבילים. דורש פריצה הנדסית.',
    density: 3,
  },
  {
    id: 'forest',
    label: 'חורש (סגור / חצי-סגור / פתוח)',
    english: 'Forest / Maquis',
    height: 'מעל 2 מ\' (עד 5–6 מ\')',
    winter: 'ירוק עד / נשירים: שלכת חלקית. החופה מתעבה כלפי האביב.',
    summer: 'חופה מלאה — בחורש סגור, חופות נוגעות זו בזו, הקרקע מוסתרת לחלוטין.',
    cover: 'גזעי עצים עבים = מחסה מקומי. כל גזע = "סלע" של חי"ר.',
    concealment: 'מקסימלית. גילוי מהאוויר כמעט בלתי אפשרי בחורש סגור.',
    mobility: 'איטית מאוד. נתיב צר לרק"ם, חי"ר תלוי בשבילים. נקודות חנק בכל פינה.',
    density: 4,
  },
];

type AgType = {
  id: string;
  label: string;
  english: string;
  icon: IconName;
  desc: string;
  ops: string;
  examples: string;
};

const AGRICULTURE: AgType[] = [
  {
    id: 'field',
    label: 'גידולי שדה (גד״ש)',
    english: 'Field Crops',
    icon: 'layers',
    desc: 'צמחייה נמוכה וצפופה, עונתיות גבוהה, שינויי צבע מהירים. עיבוד והשקיה אינטנסיביים.',
    ops: 'בקיץ — חשוף לחלוטין. בחורף — בוץ עמוק, עבירות לקויה. תנועה רגלית קלה, רק"ם תלוי בעונה.',
    examples: 'חיטה, תירס, חמניות, כותנה',
  },
  {
    id: 'orchard',
    label: 'מטעים מודרניים',
    english: 'Modern Orchards',
    icon: 'mountain',
    desc: 'נטיעה בשורות סדורות עם רווחים. השקיה ופעילות אנושית מתמשכת לאורך שנים. גובה 3–4 מ\'.',
    ops: 'מרווחי שורה מאפשרים תנועת רכב — אבל גם תיעול. עלווה מסתירה מתצפית אווירית. בחורף (נשירים) — חשיפה.',
    examples: 'הדרים, פרדסים, נשירים, בננות',
  },
  {
    id: 'traditional',
    label: 'חקלאות מסורתית',
    english: 'Traditional',
    icon: 'star',
    desc: 'פיזור פחות סדור, מרווחים גדולים. טיפוח והשקיה מצומצמים. גילים מבוגרים — עצים גדולים.',
    ops: 'אפשרות מעבר בין עצים. גזעים עבים = מחסה. נוכחות אזרחית עונתית (מסיק בסתיו).',
    examples: 'זיתים, בוסתן, גפן ותאנה',
  },
];

const AG_TRIANGLE = [
  { label: 'הצמח', desc: 'מין, גובה, תפרוסת חופה, קוצניות, נשיר או ירוק־עד.', icon: 'mountain' as IconName, color: 'text-status-ok' },
  { label: 'פעילות האדם', desc: 'יישור, ניקוי, שתילה, גיזום, איסוף — לוח הזמנים העונתי שמושך אזרחים לשטח.', icon: 'people' as IconName, color: 'text-accent' },
  { label: 'ארגון השטח', desc: 'טרסות, חומות, סוללות סיקול, בזנ"טים, גדרות, דרכי שירות, השקיה — תיעול תנועה.', icon: 'layers' as IconName, color: 'text-accent-cool' },
];

export function VegetationScene() {
  const [active, setActive] = useState<VegId>('herbaceous');
  const [season, setSeason] = useState<Season>('winter');
  const [activeAg, setActiveAg] = useState<string>(AGRICULTURE[0].id);

  const meta = VEGETATION.find((v) => v.id === active)!;
  const agMeta = AGRICULTURE.find((a) => a.id === activeAg)!;

  return (
    <section id="scene-vegetation" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="05.4"
        eyebrow="ניתוח תכסית"
        title={
          <>
            <span className="gradient-text">צומח וחקלאות</span> — השכבה שמשנה הכל
          </>
        }
        intro="המורפולוגיה אומרת לך איפה אפשר ללכת. הצומח אומר לך מה מסתתר שם, מי מסתתר שם, ואיך הקרב יתנהל. אותה גבעה — עם או בלי חורש — היא שני שדות קרב שונים לחלוטין."
      />

      <div className="surface-elevated p-5 mb-6 border-r-4 border-r-accent-cool">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">5 גורמים מעצבים צומח טבעי:</strong>{' '}
            תבליט (גובה ומפנה שלוחה), מסלע וקרקע, אקלים, פעילות האדם.
            <strong className="text-fg block mt-1.5">מפנה צפוני</strong> מקבל פחות שמש → צומח צפוף וגבוה.{' '}
            <strong className="text-fg">מפנה דרומי</strong> חשוף → צומח דליל וגווני קרקע בהירים. זה אומר לכם מאיזה צד לטפס.
          </div>
        </div>
      </div>

      {/* 4 vegetation types */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {VEGETATION.map((v) => {
          const isActive = active === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setActive(v.id)}
              className={cn(
                'surface p-4 text-right transition-all rounded-xl flex flex-col gap-2',
                isActive ? 'border-accent shadow-glow bg-accent/5' : 'hover:border-border-strong'
              )}
            >
              <VegSilhouette density={v.density} season={season} />
              <div className="flex items-baseline justify-between">
                <div className={cn('font-display font-bold leading-tight', isActive && 'text-accent')}>
                  {v.label}
                </div>
                <div className="text-[10px] font-mono text-fg-dim">{v.height}</div>
              </div>
              <div className="text-[10px] font-mono text-fg-dim">{v.english}</div>
            </button>
          );
        })}
      </div>

      {/* Season toggle */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="text-xs font-mono text-fg-dim tracking-widest uppercase">עונה:</span>
        <div className="flex gap-1 p-1 bg-bg-card border border-border rounded-xl">
          {(['winter', 'summer'] as Season[]).map((s) => (
            <button
              key={s}
              onClick={() => setSeason(s)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                season === s ? 'bg-accent text-bg shadow-glow' : 'text-fg-muted hover:text-fg'
              )}
            >
              {s === 'winter' ? 'חורף' : 'קיץ'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${meta.id}-${season}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="surface-elevated p-6 rounded-2xl border-r-4 border-r-accent mb-12"
        >
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3">
            <h3 className="font-display font-bold text-xl leading-tight">{meta.label}</h3>
            <div className="text-xs font-mono text-fg-dim">{meta.english} · {meta.height}</div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <div className="surface p-4 rounded-xl bg-terrain-sky/5 border-terrain-sky/30">
              <div className="text-[10px] font-mono text-terrain-sky mb-1.5 tracking-widest uppercase">
                בחורף
              </div>
              <p className="text-sm text-fg leading-relaxed">{meta.winter}</p>
            </div>
            <div className="surface p-4 rounded-xl bg-terrain-sand/10 border-terrain-sand/30">
              <div className="text-[10px] font-mono text-terrain-sand mb-1.5 tracking-widest uppercase">
                בקיץ
              </div>
              <p className="text-sm text-fg leading-relaxed">{meta.summer}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 pt-4 border-t border-border-subtle">
            <div>
              <div className="text-[10px] font-mono text-status-warn mb-1.5 tracking-widest uppercase flex items-center gap-1.5">
                <Icon name="shield" size={11} />
                מחסה
              </div>
              <p className="text-xs text-fg-muted leading-relaxed">{meta.cover}</p>
            </div>
            <div>
              <div className="text-[10px] font-mono text-terrain-sky mb-1.5 tracking-widest uppercase flex items-center gap-1.5">
                <Icon name="eye" size={11} />
                הסתרה
              </div>
              <p className="text-xs text-fg-muted leading-relaxed">{meta.concealment}</p>
            </div>
            <div>
              <div className="text-[10px] font-mono text-accent mb-1.5 tracking-widest uppercase flex items-center gap-1.5">
                <Icon name="truck" size={11} />
                ניידות
              </div>
              <p className="text-xs text-fg-muted leading-relaxed">{meta.mobility}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <SoftDivider text="חקלאות — תכסית אזרחית מלאכותית" />

      {/* Agriculture types */}
      <p className="text-sm text-fg-muted leading-relaxed text-pretty mb-5 max-w-3xl">
        שטחים חקלאיים הם <strong className="text-fg">תכסית מלאכותית</strong> — מאופיינים בדפוסי זריעה סדורים, קרקע מעובדת ותשתיות
        (דרכי שירות, השקיה, גידור). הם משפיעים על ניידות, הסתרה ועל נוכחות אזרחית בשטח.
      </p>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        {AGRICULTURE.map((a) => {
          const isActive = activeAg === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setActiveAg(a.id)}
              className={cn(
                'surface p-4 text-right transition-all rounded-xl',
                isActive ? 'border-accent shadow-glow bg-accent/5' : 'hover:border-border-strong'
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={cn(
                  'size-10 rounded-xl flex items-center justify-center border-2',
                  isActive ? 'border-accent/40 bg-accent/15' : 'border-border bg-bg-accent'
                )}>
                  <Icon name={a.icon} size={18} className={isActive ? 'text-accent' : 'text-fg-dim'} />
                </div>
                <div>
                  <div className={cn('font-display font-bold text-sm leading-tight', isActive && 'text-accent')}>
                    {a.label}
                  </div>
                  <div className="text-[10px] font-mono text-fg-dim mt-0.5">{a.english}</div>
                </div>
              </div>
              <div className="text-[11px] text-fg-dim">{a.examples}</div>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={agMeta.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="surface-elevated p-6 rounded-2xl border-r-4 border-r-accent-cool mb-12"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-mono text-accent-cool mb-1.5 tracking-widest uppercase">
                מה זה בעצם
              </div>
              <p className="text-sm text-fg leading-relaxed">{agMeta.desc}</p>
            </div>
            <div>
              <div className="text-[10px] font-mono text-accent mb-1.5 tracking-widest uppercase">
                משמעות מבצעית
              </div>
              <p className="text-sm text-fg-muted leading-relaxed">{agMeta.ops}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <SoftDivider text="משולש החקלאות: 3 שכבות שצריך לנתח" />

      {/* Triangle model */}
      <div className="grid md:grid-cols-3 gap-3 mb-6">
        {AG_TRIANGLE.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.08 }}
            className="surface p-5 rounded-xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="size-9 rounded-xl bg-bg-accent border border-border flex items-center justify-center">
                <Icon name={t.icon} size={18} className={t.color} />
              </div>
              <div>
                <div className={cn('text-[10px] font-mono mb-0.5 tracking-widest uppercase', t.color)}>
                  שכבה {i + 1}
                </div>
                <div className="font-display font-bold leading-tight">{t.label}</div>
              </div>
            </div>
            <p className="text-xs text-fg-muted leading-relaxed">{t.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="surface-elevated p-5 rounded-2xl border-r-4 border-r-accent">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">השפעה משולבת על המבצע:</strong>{' '}
            ניידות (איך נכנסים), הסתרה (מי רואה אותנו), תצפית (מה אנחנו רואים), והפרעה לאש (מה חוסם קו ירי).
            <strong className="text-fg block mt-1.5">לדוגמה — פרדס בקיץ:</strong> ניידות גבוהה במרווחי השורות, הסתרה מהאוויר מצוינת, תצפית קרובה ולא רחוקה, מסך עלים שמעוות מסלול קליעים — אבל חקלאים נוכחים. כל מבצע שונה.
          </div>
        </div>
      </div>
    </section>
  );
}

function VegSilhouette({ density, season }: { density: number; season: Season }) {
  const colorWinter = ['#a3b18a', '#90a173', '#6d8254', '#3f5839'];
  const colorSummer = ['#cdb98a', '#b5a675', '#a78c5e', '#8c7a4d'];
  const color = season === 'winter' ? colorWinter[density - 1] : colorSummer[density - 1];
  const groundColor = season === 'winter' ? '#dbe5d4' : '#e4d6b8';

  return (
    <div className="aspect-[2/1] relative w-full">
      <svg viewBox="0 0 100 50" className="w-full h-full rounded-lg">
        <rect x="0" y="0" width="100" height="50" fill={groundColor} />
        {/* Ground line */}
        <line x1="0" y1="42" x2="100" y2="42" stroke="#94a3b8" strokeWidth="0.3" opacity="0.4" />

        {density === 1 && (
          // herbaceous: tiny strokes
          Array.from({ length: 30 }).map((_, i) => {
            const x = (i * 3.5) % 100;
            return (
              <line
                key={i}
                x1={x}
                y1="42"
                x2={x + 0.5}
                y2="40"
                stroke={color}
                strokeWidth="0.3"
              />
            );
          })
        )}
        {density === 2 && (
          // batta: short bushes
          Array.from({ length: 14 }).map((_, i) => {
            const x = 5 + (i * 7);
            return (
              <ellipse
                key={i}
                cx={x}
                cy="38"
                rx="2.2"
                ry="3.5"
                fill={color}
                opacity="0.85"
              />
            );
          })
        )}
        {density === 3 && (
          // griga: medium shrubs
          Array.from({ length: 8 }).map((_, i) => {
            const x = 8 + (i * 12);
            return (
              <ellipse
                key={i}
                cx={x}
                cy="33"
                rx="4.5"
                ry="7"
                fill={color}
                opacity="0.9"
              />
            );
          })
        )}
        {density === 4 && (
          // forest: tall trees with canopy
          Array.from({ length: 6 }).map((_, i) => {
            const x = 8 + (i * 16);
            return (
              <g key={i}>
                <line x1={x} y1="42" x2={x} y2="30" stroke="#574133" strokeWidth="1" />
                <ellipse cx={x} cy="22" rx="7" ry="10" fill={color} opacity="0.95" />
              </g>
            );
          })
        )}
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
