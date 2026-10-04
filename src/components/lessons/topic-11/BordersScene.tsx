'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { BordersMap, type BordersMapLabels, type Spot } from './BordersMap';
import { InsightCard } from '@/components/lesson/InsightCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type BorderType = 'mountain' | 'river' | 'coast' | 'desert' | 'latitude' | 'political';

type Border = {
  id: BorderType;
  label: string;
  english: string;
  category: 'natural' | 'artificial';
  icon: IconName;
  stability: number; // 1-5
  defensibility: number; // 1-5
  desc: string;
  example: string;
  strength: string;
  weakness: string;
};

const BORDERS: Border[] = [
  {
    id: 'mountain',
    label: 'רכס הרים',
    english: 'Mountain Range',
    category: 'natural',
    icon: 'mountain',
    stability: 5,
    defensibility: 5,
    desc: 'חומת מגן טבעית וגבוהה. אפשר לעבור רק דרך "צווארי בקבוק" ספציפיים בוואדיות.',
    example: 'הרי ההימלאיה (בין הודו לסין) שמרו על שקט בין שתי המעצמות במשך אלפי שנים. גם האלפים בין איטליה לשוויץ הם דוגמה מצוינת.',
    strength: 'הגנה פסיבית מעולה. הצבא לא צריך לפרוס כוחות בכל מקום, אלא רק לאבטח את מעברי ההרים המעטים.',
    weakness: 'מנתק קשר אזרחי או מסחרי. אזורים הרריים הם לרוב קשים למחיה, קפואים ולא מפותחים.',
  },
  {
    id: 'river',
    label: 'נהר רחב',
    english: 'Wide River',
    category: 'natural',
    icon: 'wave',
    stability: 4,
    defensibility: 3,
    desc: 'מכשול רטוב שחותך את השטח. צבא שרוצה לתקוף חייב להשתמש בגשרים קיימים או לבנות גשרי צליחה תחת אש.',
    example: 'נהר הריין (מפריד בין גרמניה לצרפת), או נהר הירדן (מפריד בין ישראל לירדן).',
    strength: 'בולם לחלוטין מעבר של טנקים וכלים כבדים. קל מאוד להגן עליו על ידי פיצוץ הגשרים או מארב סביבם.',
    weakness: 'ניתן לחצות את הנהר בקיץ כשמפלס המים יורד, ואם האויב תפס גשר אחד — כל קו ההגנה עלול לקרוס.',
  },
  {
    id: 'coast',
    label: 'קו חוף / אוקיינוס',
    english: 'Coastline / Ocean',
    category: 'natural',
    icon: 'ship',
    stability: 5,
    defensibility: 5,
    desc: 'הגבול הטבעי המושלם. מחייב את האויב לבצע פלישה מהים — אחד המבצעים הצבאיים המסובכים ביותר.',
    example: 'מדינות-אי כמו בריטניה ויפן, או מדינות מוקפות אוקיינוסים כמו ארה"ב. בזכות התעלה שלה, בריטניה לא נכבשה מאז שנת 1066.',
    strength: 'דורש מהתוקף להרים צי ספינות עצום ופלישה אווירית וימית מסונכרנת (כמו הפלישה לנורמנדי).',
    weakness: 'ערי נמל עלולות להיות מטרות לתקיפות טילים מהים (כמו צוללות או ספינות קרב).',
  },
  {
    id: 'desert',
    label: 'מדבר',
    english: 'Desert',
    category: 'natural',
    icon: 'hourglass',
    stability: 3,
    defensibility: 3,
    desc: 'מרחב פתוח לחלוטין ועוין למחיה. מחייב כל כוח צבאי להביא איתו אספקה אדירה של מים ודלק (לוגיסטיקה כבדה).',
    example: 'מדבר סהרה (בין מרוקו לאלג\'יריה), מדבר סיני והנגב (בין ישראל למצרים) או מדבר גובי (בין מונגוליה לסין).',
    strength: '"ים של חול" שיוצר מרחק הרתעתי. קל לזהות אויב מתקרב ממרחק רב (למשל, בעזרת ענני האבק שמעלים הטנקים).',
    weakness: 'קשה מאוד לאטום גבול כזה לחלוטין, מה שמאפשר חדירות של מבריחים וכוחות קטנים שמכירים את השטח.',
  },
  {
    id: 'latitude',
    label: 'קו אורך/רוחב',
    english: 'Latitude / Longitude',
    category: 'artificial',
    icon: 'compass',
    stability: 2,
    defensibility: 1,
    desc: 'קו גיאומטרי ישר ששורטט על המפה בלי שום קשר למה שיש בשטח (הרים, עמקים או אנשים).',
    example: 'חלק ניכר מהגבול בין ארה"ב למקסיקו, גבולות מדינות אפריקה (שנקבעו על ידי האימפריאליזם האירופי), או קו הרוחב 38 המחלק את קוריאה.',
    strength: 'יתרון משפטי בלבד: קל מאוד להסכים עליו בחדר המשא ומתן ולצייר אותו בחוזה.',
    weakness: 'מנותק מהמציאות. הוא חוצה כפרים ומשפחות לשניים, לא מפריד בין צבאות ומהווה מוקד חיכוך והברחות תמידי.',
  },
  {
    id: 'political',
    label: 'הסכם פוליטי',
    english: 'Political Agreement',
    category: 'artificial',
    icon: 'flag',
    stability: 2,
    defensibility: 2,
    desc: 'גבול שקיים רק מכוח הסכם חתום בין מדינות, כתוצאה מפשרה דיפלומטית, וללא תלות בשטח.',
    example: 'הסכמי סייקס-פיקו (1916) שיצרו את לבנון, סוריה וירדן יש מאין. "חלוקת אפריקה" בברלין (1885).',
    strength: 'מקבל הכרה חוקית של האו"ם והקהילה הבינלאומית, ומונע מלחמה בטווח המיידי.',
    weakness: 'הגבול יציב רק כל עוד יש שלום בין המדינות. ברגע שהיחסים קורסים, אין מכשול טבעי שימנע הסלמה ומלחמה.',
  },
];

/** In-map labels — terms that already appear in this scene. */
const MAP_LABELS: BordersMapLabels = {
  countryA: "מדינה א'",
  countryB: "מדינה ב'",
  mountain: 'רכס הרים',
  bridge: 'גשר',
  river: 'נהר',
  sea: 'ים פתוח',
  dunes: 'דיונות חול',
  desertSpan: 'עשרות ק"מ של חול וריק',
  latLine: 'קו רוחב 38° · קו שרירותי',
  latCut: 'קו שחותך דרך ערים ומשפחות',
  pact: 'הסכם',
  pactYear: '1916',
  sykes: 'סייקס-פיקו',
  paper: 'פשרה על הנייר - סכסוך במציאות',
  strength: 'חוזק',
  weakness: 'חולשה',
};

export function BordersScene() {
  const [active, setActive] = useState<BorderType>('mountain');
  // Selected hotspot on the map (חוזק / חולשה). Clicking it again, or the
  // empty map, clears it; switching type clears it too.
  const [spot, setSpot] = useState<Spot | null>(null);
  // Bumped on every hotspot pick and by the replay control → its demo plays once.
  const [run, setRun] = useState(0);
  const reduce = !!useReducedMotion();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const meta = BORDERS.find((b) => b.id === active)!;

  const chooseType = (id: BorderType) => {
    setActive(id);
    setSpot(null);
  };
  const pickSpot = (next: Spot | null) => {
    setSpot(next);
    if (next) setRun((r) => r + 1);
  };

  /** Tabs follow the WAI-ARIA pattern; in RTL ArrowLeft moves forward. */
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const n = BORDERS.length;
    let next = -1;
    if (e.key === 'ArrowLeft') next = (idx + 1) % n;
    else if (e.key === 'ArrowRight') next = (idx - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    chooseType(BORDERS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="scene-borders" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="11.3"
        eyebrow="טיפולוגיית גבולות"
title = {
  <>
    <span className="text-brand-dark">גבול טוב</span> הוא לא קו על מפה — הוא מכשול שעובד בשטח
  </>
}
        intro="ההיסטוריה מלמדת: גבול שנשען על רכס הרים יכול לשמור על שקט במשך 1,000 שנה, בזמן שגבול ששורטט על מפה בידי פוליטיקאים גורם למלחמות עד היום. בואו נכיר 6 סוגי גבולות, מהטבעיים והיציבים ביותר — ועד למלאכותיים והפגיעים ביותר."
      />

      <InsightCard tone="cool" icon="spark" label="החלוקה הבסיסית של גבולות">
        <strong className="text-fg">גבול טבעי:</strong> תוואי גבול שמבוסס על מכשול גיאוגרפי קיים (כמו נהר רחב, שרשרת הרים או אוקיינוס). קשה מאוד לחצות אותו.{' '}
        <strong className="text-fg">גבול מלאכותי:</strong> קו דמיוני ששורטט על מפה בחדר ישיבות (לפי קווי אורך/רוחב או הסכמים מדיניים). הקו הזה לרוב "חותך" דרך אוכלוסיות, שבטים או ערים, ללא שום היגיון גיאוגרפי.
        <strong className="text-fg block mt-1.5">שורה תחתונה:</strong> גבול טבעי מפריד כוחות ומונע חיכוך, בעוד שגבול מלאכותי הוא כמעט תמיד מתכון לסכסוכים אלימים.
      </InsightCard>

      {/* Type tabs — the full keyboard path between the six types */}
      <div role="tablist" aria-label="טיפולוגיית גבולות" className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-4 mb-4">
        {BORDERS.map((b, i) => {
          const isActive = active === b.id;
          return (
            <button
              key={b.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`t11-border-tab-${b.id}`}
              aria-selected={isActive}
              aria-controls="t11-border-panel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => chooseType(b.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cn(
                'relative overflow-hidden p-4 text-start transition-all duration-300 ease-snap rounded-xl border flex items-center gap-3',
                isActive
                  ? 'border-accent bg-bg-elevated'
                  : 'border-border bg-bg-elevated hover:border-brand/30'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="t11-borders-bar"
                  className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-e-full"
                />
              )}
              <span
                className={cn(
                  'size-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                  isActive
                    ? 'bg-accent text-bg-elevated border-accent'
                    : 'bg-bg-accent text-fg-muted border-border'
                )}
              >
                <Icon name={b.icon} size={18} strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-base text-fg leading-tight">
                  {b.label}
                </div>
                <div className="font-display font-medium tracking-wide text-[13px] text-fg-dim mt-0.5">
                  {b.category === 'natural' ? 'טבעי' : 'מלאכותי'} · יציבות {b.stability}/5
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Visual + details */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={meta.id}
          id="t11-border-panel"
          role="tabpanel"
          aria-labelledby={`t11-border-tab-${meta.id}`}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="surface-elevated p-5 mb-6"
        >
          <div className="relative">
            <BordersMap
              kind={meta.id}
              spot={spot}
              onSpot={pickSpot}
              run={run}
              labels={MAP_LABELS}
              ariaLabel={meta.label}
              describedBy={{ strength: 't11-border-strength', weakness: 't11-border-weakness' }}
            />
            {spot && (
              <button
                type="button"
                onClick={() => setRun((r) => r + 1)}
                aria-label="הפעלה חוזרת של ההדגמה"
                className="motion-reduce:hidden absolute top-3 end-3 size-8 rounded-xl border border-border bg-bg-elevated text-fg-muted hover:text-fg hover:border-brand/30 transition-colors inline-flex items-center justify-center"
              >
                <Icon name="refresh" size={15} />
              </button>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mt-5">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Icon name={meta.icon} size={32} className="text-brand-dark shrink-0" />
                <div>
                  <div className="font-display font-bold text-2xl leading-tight text-fg">{meta.label}</div>
                  <div className="text-[13px] font-display font-medium tracking-wide text-fg-dim">{meta.english} · {meta.category === 'natural' ? 'טבעי' : 'מלאכותי'}</div>
                </div>
              </div>

              <p className="text-sm text-fg leading-relaxed mb-3">{meta.desc}</p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <StatBar label="יציבות" value={meta.stability} />
                <StatBar label="כושר הגנה" value={meta.defensibility} />
              </div>
            </div>

            <div className="space-y-3">
              {/* The map's חוזק / חולשה hotspots point at these two cards */}
              <div className={cn('surface p-3 rounded-xl bg-brand/5 border-brand/30 transition-shadow', spot === 'strength' && 'ring-2 ring-accent')}>
                <div className="text-sm font-display font-semibold text-brand-dark mb-1 tracking-wider">חוזק</div>
                <p id="t11-border-strength" className="text-[13px] text-fg-muted leading-relaxed">{meta.strength}</p>
              </div>
              <div className={cn('surface p-3 rounded-xl bg-status-danger/5 border-status-danger/30 transition-shadow', spot === 'weakness' && 'ring-2 ring-accent')}>
                <div className="text-sm font-display font-semibold text-status-danger mb-1 tracking-wider">חולשה</div>
                <p id="t11-border-weakness" className="text-[13px] text-fg-muted leading-relaxed">{meta.weakness}</p>
              </div>
              <div className="surface p-3 rounded-xl bg-bg-accent/30">
                <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">דוגמה</div>
                <p className="text-[13px] text-fg leading-relaxed italic">{meta.example}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <SoftDivider text="טבעי מול מלאכותי · המאזן ב-1916" />

      <div className="">
        <div className="flex gap-4 items-start">
          <Icon name="compass" size={32} className="text-brand-dark shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-display font-semibold text-brand-dark mb-1 tracking-wider">
              סייקס-פיקו · שיעור כואב בהיסטוריה
            </div>
            <h3 className="font-display font-bold text-lg leading-tight mb-2">
              איך שני דיפלומטים בפריז יצרו 100 שנה של מלחמות
            </h3>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty">
              בשנת 1916 נפגשו מארק סייקס (הבריטי) ופרנסואה ז'ורז'-פיקו (הצרפתי) וחילקו ביניהם את המזרח התיכון על גבי מפה באמצעות <strong className="text-fg">סרגל</strong>. הקווים הישרים שהם שירטטו יצרו יש מאין מדינות חדשות: עיראק, סוריה, לבנון וירדן. הם התעלמו לחלוטין מהמציאות הדמוגרפית והטופוגרפית, ותפרו יחד אוכלוסיות עוינות (כורדים, סונים, שיעים, דרוזים) לתוך גבולות מלאכותיים.
              <strong className="text-fg block mt-2">התוצאה, גם בימינו:</strong> חוסר יציבות כרוני, מלחמות אזרחים עקובות מדם בסוריה ובעיראק, ועליית ארגוני טרור (כמו דאעש) שניצלו את חולשת "קווי הסרגל" כדי למחוק אותם לחלוטין.
              <strong className="text-fg block mt-1.5">הלקח המרכזי:</strong> גבול שלא מחובר לשטח ולאנשים שחיים בו — סופו לקרוס.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface p-2.5 rounded-xl">
      <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">{label}</div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              i <= value ? 'bg-brand-dark' : 'bg-bg-accent border border-border'
            )}
          />
        ))}
      </div>
      <div className="text-[13px] font-display font-bold mt-1 tabular-nums text-fg">{value}/5</div>
    </div>
  );
}

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-sm font-display font-semibold text-fg-muted tracking-wider">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}