'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

export function PrinciplesScene() {
  return (
    <section id="scene-principles" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="03.1"
        eyebrow="עקרונות הניווט"
        title={
          <>
            איך יודעים <span className="gradient-text">לאן ללכת</span>?
          </>
        }
        intro="ניווט הוא לא ניחוש - הוא מדע של דיוק. הכל מתחיל ב'אזימוט': הכלי שמאפשר לכם לדעת בדיוק לאן ללכת, גם באמצע שום מקום ובחושך מוחלט."
      />

      <div className="surface-elevated p-5 mb-6 border-r-4 border-r-accent-cool">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">מילון שטח מהיר:</strong>
            <ul className="mt-2 space-y-1 text-fg-muted">
              <li>· <strong className="text-fg">אזימוט (Azimuth)</strong> — הזווית המדויקת ליעד שלכם (0–360 מעלות). 0° זה צפון, 90° זה מזרח.</li>
              <li>· <strong className="text-fg">אזימוט חוזר (Back Azimuth)</strong> — הדרך המהירה והבטוחה הביתה. פשוט הופכים את הכיוון (מוסיפים או מחסירים 180°).</li>
              <li>· <strong className="text-fg">GPS-Denied</strong> — הרגע שבו הטכנולוגיה בוגדת בנו. כשהאויב משבש לוויינים או כשנמצאים מתחת לאדמה, חוזרים למפה ולמצפן.</li>
            </ul>
          </div>
        </div>
      </div>

      <AzimuthExplorer />

      <div className="my-12">
        <ThreeNorthsCard />
      </div>

      <div className="my-12">
        <GpsDeniedCard />
      </div>

      <ConclusionCard />
    </section>
  );
}

function AzimuthExplorer() {
  const [azimuth, setAzimuth] = useState(47);
  const back = (azimuth + 180) % 360;

  const direction =
    azimuth < 22 || azimuth >= 338 ? 'צפון'
    : azimuth < 67 ? 'צפון־מזרח'
    : azimuth < 112 ? 'מזרח'
    : azimuth < 157 ? 'דרום־מזרח'
    : azimuth < 202 ? 'דרום'
    : azimuth < 247 ? 'דרום־מערב'
    : azimuth < 292 ? 'מערב'
    : 'צפון־מערב';

  return (
    <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 items-stretch">
      <div className="surface-elevated p-6 sm:p-8 flex flex-col items-center justify-center">
        <CompassDial azimuth={azimuth} back={back} />
      </div>

      <div className="space-y-4">
        <div className="surface-elevated p-5 sm:p-6">
          <div className="text-[10px] font-mono text-fg-dim mb-2 tracking-widest uppercase">
            תנו למצפן סיבוב — בחרו כיוון
          </div>
          <div className="flex items-baseline gap-3 mb-4">
            <div className="font-display font-bold text-5xl tabular-nums text-accent">
              {azimuth}°
            </div>
            <div className="text-fg-muted text-sm">
              כיוון: <strong className="text-fg">{direction}</strong>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={azimuth}
            onChange={(e) => setAzimuth(Number(e.target.value))}
            className="w-full accent-accent"
            aria-label="אזימוט"
          />
          <div className="flex justify-between text-[10px] font-mono text-fg-dim mt-1">
            <span>0° צפון</span>
            <span>90° מזרח</span>
            <span>180° דרום</span>
            <span>270° מערב</span>
          </div>

          <div className="mt-5 pt-4 border-t border-border-subtle">
            <div className="text-[10px] font-mono text-fg-dim mb-2 tracking-widest uppercase">
              אזימוט חוזר (הדרך חזרה)
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-fg-muted text-sm">
                {azimuth}° {azimuth >= 180 ? '−' : '+'} 180° =
              </span>
              <span className="font-display font-bold text-3xl tabular-nums text-accent-cool">
                {back}°
              </span>
            </div>
            <p className="text-xs text-fg-muted mt-2 leading-relaxed">
              הלכתם ליעד ב-{azimuth}°? כדי לחזור בדיוק הביתה לנקודת המוצא, אתם צריכים את הדרך ההפוכה: {back}°.
            </p>
          </div>
        </div>

        <div className="surface p-4 border-r-4 border-r-accent-cool flex gap-3 items-start">
          <Icon name="spark" size={18} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong className="text-fg">מתי משתמשים באזימוט חוזר?</strong>
            <br />
            כדי לחזור הביתה בבטחה, כדי לוודא שחברים שלכם נמצאים במיקום הנכון, או כדי לבצע נסיגה חכמה דרך נתיב שכבר בדקתם וסימנתם כבטוח.
          </div>
        </div>
      </div>
    </div>
  );
}

function CompassDial({ azimuth, back }: { azimuth: number; back: number }) {
  return (
    <div className="relative aspect-square w-full max-w-[320px]">
      <svg viewBox="-50 -50 100 100" className="w-full h-full">
        {/* Outer ring */}
        <circle cx="0" cy="0" r="44" className="fill-bg-card stroke-border" strokeWidth="0.4" />
        <circle cx="0" cy="0" r="40" className="fill-bg-elevated stroke-border-subtle" strokeWidth="0.3" />

        {/* Tick marks */}
        {Array.from({ length: 36 }).map((_, i) => {
          const a = (i * 10 - 90) * (Math.PI / 180);
          const isBig = i % 3 === 0;
          return (
            <line
              key={i}
              x1={Math.cos(a) * (isBig ? 36 : 38)}
              y1={Math.sin(a) * (isBig ? 36 : 38)}
              x2={Math.cos(a) * 40}
              y2={Math.sin(a) * 40}
              className={isBig ? 'stroke-fg-muted' : 'stroke-border-strong'}
              strokeWidth={isBig ? 0.4 : 0.25}
            />
          );
        })}

        {/* Cardinal labels */}
        {[
          { angle: 0, label: 'N', class: 'fill-accent font-bold' },
          { angle: 90, label: 'E', class: 'fill-fg-muted' },
          { angle: 180, label: 'S', class: 'fill-fg-muted' },
          { angle: 270, label: 'W', class: 'fill-fg-muted' },
        ].map((m) => {
          const a = ((m.angle - 90) * Math.PI) / 180;
          const x = Math.cos(a) * 32;
          const y = Math.sin(a) * 32;
          return (
            <text
              key={m.label}
              x={x}
              y={y + 1.5}
              textAnchor="middle"
              className={cn('text-[4px] font-display', m.class)}
            >
              {m.label}
            </text>
          );
        })}

        {/* Azimuth degree numbers (every 30°) */}
        {[30, 60, 120, 150, 210, 240, 300, 330].map((deg) => {
          const a = ((deg - 90) * Math.PI) / 180;
          return (
            <text
              key={deg}
              x={Math.cos(a) * 32}
              y={Math.sin(a) * 32 + 1}
              textAnchor="middle"
              className="fill-fg-dim text-[2.5px] font-mono"
            >
              {deg}
            </text>
          );
        })}

        {/* Forward arrow (azimuth) */}
        <motion.g
          animate={{ rotate: azimuth }}
          transition={{ type: 'spring', stiffness: 80, damping: 15 }}
          style={{ transformOrigin: '0 0' }}
        >
          <line x1="0" y1="0" x2="0" y2="-32" className="stroke-accent" strokeWidth="1" />
          <polygon points="0,-32 -3,-26 3,-26" className="fill-accent" />
          <text x="0" y="-36" textAnchor="middle" className="fill-accent text-[3.5px] font-mono font-bold">
            {azimuth}°
          </text>
        </motion.g>

        {/* Back azimuth arrow (dimmer) */}
        <motion.g
          animate={{ rotate: back }}
          transition={{ type: 'spring', stiffness: 80, damping: 15 }}
          style={{ transformOrigin: '0 0' }}
        >
          <line x1="0" y1="0" x2="0" y2="-22" className="stroke-accent-cool/60" strokeWidth="0.6" strokeDasharray="1 1" />
          <polygon points="0,-22 -2,-18 2,-18" className="fill-accent-cool/70" />
          <text x="0" y="-26" textAnchor="middle" className="fill-accent-cool text-[2.5px] font-mono">
            {back}°
          </text>
        </motion.g>

        {/* Center pin */}
        <circle cx="0" cy="0" r="2" className="fill-bg stroke-accent" strokeWidth="0.5" />
        <circle cx="0" cy="0" r="0.7" className="fill-accent" />
      </svg>

      <div className="absolute bottom-2 inset-x-0 flex justify-center gap-3 text-[10px] font-mono">
        <span className="flex items-center gap-1 text-accent">
          <span className="size-2 bg-accent" /> אזימוט
        </span>
        <span className="flex items-center gap-1 text-accent-cool">
          <span className="size-2 bg-accent-cool" /> חוזר
        </span>
      </div>
    </div>
  );
}

function ThreeNorthsCard() {
  const [active, setActive] = useState<'magnetic' | 'grid' | 'true'>('magnetic');

  const NORTHS = {
    magnetic: {
      label: 'צפון מגנטי',
      english: 'Magnetic North',
      color: 'text-accent-hot',
      bg: 'bg-accent-hot/10',
      border: 'border-accent-hot',
      angle: 7, // visualization offset
      who: 'המצפן שביד שלכם',
      what: 'הכיוון שאליו נמשכת מחט המצפן. הוא "נצמד" למגנט הענק של כדור הארץ, אבל המגנט הזה קצת זז כל שנה.',
      why: 'יתרון: עובד תמיד, בלי סוללות. חיסרון: צריך לתקן את הסטייה שלו כשמשווים אותו למפה.',
    },
    grid: {
      label: 'צפון רשת',
      english: 'Grid North',
      color: 'text-accent',
      bg: 'bg-accent/10',
      border: 'border-accent',
      angle: 0,
      who: 'המפה הצבאית',
      what: 'הצפון של המפות. אלו הקווים הישרים שמודפסים על הנייר. זה הצפון הכי נוח לחישובים בתוך החמ"ל.',
      why: 'יתרון: קל לתכנון נ"צ ומסלולים. חיסרון: הוא לא תואם בדיוק את המצפן או את הכוכבים.',
    },
    true: {
      label: 'צפון אמיתי',
      english: 'True North',
      color: 'text-accent-cool',
      bg: 'bg-accent-cool/10',
      border: 'border-accent-cool',
      angle: -3,
      who: 'כוכבים, GPS וניווט מתקדם',
      what: 'הנקודה המדויקת של הקוטב הצפוני. שם נמצא כוכב הצפון. זהו כיוון קבוע ויציב שלא משתנה לעולם.',
      why: 'יתרון: הכי מדויק שיש. חיסרון: אי אפשר למדוד אותו עם מצפן פשוט בשטח.',
    },
  };

  const meta = NORTHS[active];

  return (
    <div className="surface-elevated p-6 sm:p-8">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-1">הצפון הוא לא אחד: הכירו את שלושת הצפונים</h3>
        <p className="text-fg-muted text-sm">
          זה נשמע מבלבל, אבל בשטח יש 3 סוגי "צפון". כדי לא ללכת לאיבוד, אתם חייבים להכיר את ההבדלים ביניהם.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-6 items-stretch">
        <div className="surface aspect-square sm:aspect-auto sm:min-h-[280px] flex items-center justify-center p-6 relative overflow-hidden">
          <svg viewBox="-50 -50 100 100" className="w-full h-full max-w-[260px]">
            <circle cx="0" cy="0" r="40" className="fill-bg-elevated stroke-border" strokeWidth="0.4" />

            {Object.entries(NORTHS).map(([id, n]) => {
              const isActive = id === active;
              const a = ((n.angle - 90) * Math.PI) / 180;
              const x = Math.cos(a) * 36;
              const y = Math.sin(a) * 36;
              return (
                <g key={id}>
                  <motion.line
                    x1="0"
                    y1="0"
                    x2={x}
                    y2={y}
                    className={cn('transition-all', n.color)}
                    stroke="currentColor"
                    strokeWidth={isActive ? 1 : 0.4}
                    opacity={isActive ? 1 : 0.4}
                  />
                  <motion.polygon
                    points={`${x},${y} ${x - 1.5},${y + 3} ${x + 1.5},${y + 3}`}
                    transform={`rotate(${n.angle} ${x} ${y})`}
                    className={n.color}
                    fill="currentColor"
                    opacity={isActive ? 1 : 0.5}
                    animate={{ opacity: isActive ? 1 : 0.5 }}
                  />
                  <text
                    x={x * 1.18}
                    y={y * 1.18 + 1}
                    textAnchor="middle"
                    className={cn('text-[3px] font-mono font-bold transition-opacity', n.color)}
                    opacity={isActive ? 1 : 0.4}
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}

            <circle cx="0" cy="0" r="1.5" className="fill-bg stroke-fg" strokeWidth="0.4" />
            <text x="0" y="48" textAnchor="middle" className="fill-fg-dim text-[2.5px] font-mono">
              *ההפרש מוגזם להמחשה ויזואלית
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(NORTHS) as [keyof typeof NORTHS, typeof NORTHS[keyof typeof NORTHS]][]).map(([id, n]) => {
              const isActive = id === active;
              return (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={cn(
                    'p-3 rounded-xl border-2 text-center transition-all',
                    isActive ? `${n.border} ${n.bg}` : 'border-border bg-bg-card hover:border-border-strong'
                  )}
                >
                  <div className={cn('font-display font-bold text-sm leading-tight', isActive && n.color)}>
                    {n.label}
                  </div>
                  <div className="text-[9px] font-mono text-fg-dim mt-0.5">{n.english}</div>
                </button>
              );
            })}
          </div>

          <div className={cn('surface-elevated p-5 border-r-4 transition-colors', meta.border)}>
            <div className={cn('text-[10px] font-mono mb-2 tracking-widest uppercase', meta.color)}>
              {meta.label}
            </div>
            <dl className="space-y-2.5 text-sm">
              <div>
                <dt className="text-fg-dim text-xs mb-0.5">במה משתמשים?</dt>
                <dd className="text-fg">{meta.who}</dd>
              </div>
              <div>
                <dt className="text-fg-dim text-xs mb-0.5">מה זה בעצם?</dt>
                <dd className="text-fg leading-relaxed">{meta.what}</dd>
              </div>
              <div>
                <dt className="text-fg-dim text-xs mb-0.5">למה כן? / למה לא?</dt>
                <dd className="text-fg-muted leading-relaxed">{meta.why}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="mt-5 surface p-4 border-r-4 border-r-status-warn flex gap-3 items-start">
        <Icon name="spark" size={18} className="text-status-warn shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <strong className="text-fg">שימו לב:</strong> אם תמדדו כיוון במצפן ותסמנו אותו ישר על המפה בלי "לתקן" את הסטייה - תפספסו את המטרה. בישראל הסטייה קטנה, אבל בניווטים ארוכים כל מעלה קובעת.
        </div>
      </div>
    </div>
  );
}

function GpsDeniedCard() {
  const items: { icon: IconName; title: string; desc: string }[] = [
    {
      icon: 'bolt',
      title: 'מלחמה אלקטרונית',
      desc: 'האויב משדר רעש "שמחשיך" את הלוויינים ברדיוס של מאות קילומטרים. פתאום המכשיר פשוט מפסיק לעבוד.',
    },
    {
      icon: 'mountain',
      title: 'מחסומים טבעיים',
      desc: 'לוויינים לא רואים דרך בטון, סלעים או אדמה. במנהרות, בתוך מבנים סבוכים או בואדיות עמוקים - ה-GPS מתעוור.',
    },
    {
      icon: 'satellite',
      title: 'תקלות והשבתה',
      desc: 'לוויינים יכולים ליפול, להתקלקל או להיפגע. צבא חכם תמיד שומר על היכולת לנצח גם עם מפת נייר ומצפן.',
    },
  ];

  return (
    <div className="surface-elevated p-6 sm:p-8">
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 items-start">
        <div>
          <h3 className="text-xl font-bold mb-2">למה אסור לסמוך רק על ה-GPS?</h3>
          <p className="text-fg-muted text-sm leading-relaxed">
            היום הכל עובד על GPS, וזו בדיוק הבעיה. זה נוח, עד שמישהו מחליט לכבות לכם את האור.
            <br /><br />
            המונח <strong className="text-fg">"GPS-Denied"</strong> מתאר כל מצב שבו המערכות הלווייניות מושבתות. נווט טוב הוא מי ששולט בשיטות ה"אולד-סקול" - מפה, מצפן וספירת צעדים - כי אלו הכלים היחידים שלא צריכים קליטה או סוללה.
          </p>
        </div>
        <div className="space-y-3">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="surface p-4 flex items-start gap-3 hover:border-accent/40 transition-colors"
            >
              <div className="size-10 rounded-xl bg-status-danger/10 border border-status-danger/30 flex items-center justify-center text-status-danger shrink-0">
                <Icon name={it.icon} size={18} />
              </div>
              <div>
                <h4 className="font-display font-semibold mb-0.5 text-sm">{it.title}</h4>
                <p className="text-xs text-fg-muted leading-relaxed">{it.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConclusionCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="surface-elevated p-6 border-r-4 border-r-accent flex gap-4 items-start"
    >
      <Icon name="spark" size={22} className="text-accent shrink-0 mt-0.5" />
      <div>
        <div className="text-[10px] font-mono text-accent mb-1 tracking-widest uppercase">
          השורה התחתונה
        </div>
        <p className="text-fg leading-relaxed text-pretty">
          ניווט הוא לא "בערך". זה <strong className="text-fg">אזימוט מדויק</strong>, הבנה של סוגי הצפונים, ומוכנות מלאה לרגע שבו הטכנולוגיה תפסיק לעבוד. היכולת הזו היא מה שמבדיל בין כוח שמגיע ליעד לבין כוח שהולך לאיבוד בשטח אויב.
        </p>
      </div>
    </motion.div>
  );
}
