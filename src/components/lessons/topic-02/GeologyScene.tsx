'use client';
import { useRef, useState, type ComponentType, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { cn } from '@/lib/utils';
import { EndogenicVisual, ExogenicVisual } from './GeologyVisuals';
import { RockDiorama, RockSpecimen } from './RockVisuals';

type Rock = {
  id: 'igneous' | 'sediment' | 'metamorphic';
  label: string;
  description: string;
  examples: string;
  military: string;
  color: string;
};

// Formation terminology: USGS, "What are igneous / sedimentary / metamorphic rocks?"
// https://www.usgs.gov/faqs/what-are-igneous-rocks
// https://www.usgs.gov/faqs/what-are-sedimentary-rocks
// https://www.usgs.gov/faqs/what-are-metamorphic-rocks
const ROCKS: Rock[] = [
  {
    id: 'igneous',
    label: 'סלעי יסוד',
    description: 'סלעים שנוצרים מהתקררות ומהתמצקות של חומר סלעי מותך. בעומק כדור הארץ חומר זה נקרא מאגמה, וכאשר הוא מגיע אל פני השטח הוא נקרא לבה. גרניט נוצר בעומק, ואילו בזלת נוצרת מהתקררות לבה על פני השטח.',
    examples: 'גרניט, בזלת',
    military: 'סלעי יסוד קשים, כגון גרניט ובזלת, עשויים להקשות על חפירה ועבודות הנדסה. עם זאת, השפעתם על התנועה ועל יציבות השטח תלויה גם בסדקים, במידת ההתפוררות ובמבנה המדרון. שם קבוצת הסלעים לבדו אינו מספיק להערכת תנאי השטח.',
    color: 'text-accent-hot',
  },
  {
    id: 'sediment',
    label: 'סלעי משקע',
    description: 'סלעים שנוצרים מהצטברות של משקעים ומהתלכדותם, או משקיעת חומרים מתוך מים. המשקעים עשויים לכלול שברי סלעים, גרגירי חול ושרידי יצורים חיים. סלעי משקע מופיעים לעיתים קרובות בשכבות.',
    examples: 'גיר, חוואר, אבן חול',
    military: 'תכונות סלעי המשקע מגוונות, ולכן אין להניח שכולם רכים או קלים לחפירה. בהערכת השטח חשוב להתייחס לסוג הסלע, לחוזקו, לסדקים ולמבנה השכבות. מאפיינים אלה משפיעים על אפשרויות החפירה ועל יציבות המדרונות.',
    color: 'text-accent',
  },
  {
    id: 'metamorphic',
    label: 'סלעים מותמרים',
    description: 'סלעים קיימים שהרכבם המינרלי או מבנם השתנו בהשפעת חום ולחץ, ללא התכה. תהליך זה נקרא התמרה. לדוגמה, שיש נוצר מהתמרה של גיר, וצפחה נוצרת מהתמרה של סלעי משקע דקי־גרגר.',
    examples: 'שיש, צפחה',
    military: 'בחלק מהסלעים המותמרים, כגון צפחה, יש כיוונים שבהם הסלע מתפצל בקלות יחסית. מאפיין זה עשוי להשפיע על החפירה ועל יציבות המדרון. חשוב לבחון כל סוג סלע בנפרד, משום שלא לכל הסלעים המותמרים אותן תכונות.',
    color: 'text-accent-intel',
  },
];

type Force = {
  id: 'endo' | 'exo';
  label: string;
  scale: string;
  what: string;
  examples: string[];
};

// Surface-process terminology: NPS, "Weathering" and "Geology and Physical Processes".
// https://www.nps.gov/subjects/erosion/weathering.htm
// https://www.nps.gov/subjects/mountains/geology.htm
const FORCES: Force[] = [
  {
    id: 'endo',
    label: 'כוחות פנימיים (אנדוגניים)',
    scale: 'תהליכים שמקורם בפנים כדור הארץ',
    what: 'כוחות פנימיים מעצבים את קרום כדור הארץ באמצעות תהליכים כגון תנועת לוחות טקטוניים — הלוחות המרכיבים את מעטפתו החיצונית הקשיחה. תהליכים אלה יוצרים קימוטים ושברים, מרימים רכסי הרים וקשורים גם לפעילות געשית ולרעידות אדמה.',
    examples: ['התרוממות רכסי הרים', 'היווצרות שברים ובקעים', 'פעילות געשית', 'רעידות אדמה'],
  },
  {
    id: 'exo',
    label: 'כוחות חיצוניים (אקסוגניים)',
    scale: 'תהליכים שפועלים על פני השטח',
    what: 'מים, רוח, שינויי טמפרטורה וכוח המשיכה משנים את פני השטח. בלייה היא פירוק הסלע או שינויו במקום; סחיפה היא הסרה והובלה של חומר. החומר המובל עשוי לשקוע במקום אחר. תהליכים אלה מעצבים בין היתר ערוצי נחלים, מצוקים, דיונות ודרדרות.',
    examples: ['חריצת ערוצי נחלים', 'שחיקת מצוקי חוף בידי גלים', 'הצטברות חול לדיונות בהשפעת הרוח', 'הצטברות שברי סלעים במדרונות ובבסיסם'],
  },
];

type Visual = ComponentType<{ reduce: boolean }>;

const FORCE_VISUALS: Record<Force['id'], Visual> = {
  endo: EndogenicVisual,
  exo: ExogenicVisual,
};

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Option (tab) surface. The tabs sit on the textured page, so the tint is a
 * layer over a solid white base — the selected/hover tint must not let the
 * page's contour texture show through.
 */
const OPTION_BASE =
  'relative isolate rounded-xl border bg-bg-elevated text-start cursor-pointer transition-colors duration-200 ease-snap before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap';
const OPTION_ACTIVE = 'border-accent before:bg-accent/10';
const OPTION_IDLE = 'border-border hover:border-brand/30 hover:before:bg-brand/[0.03]';

/** Board content swap (AnimatePresence mode="wait", ~0.3s). */
const swap = (reduce: boolean) => ({
  initial: { opacity: 0, y: reduce ? 0 : 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: reduce ? 0 : -6 },
  transition: { duration: reduce ? 0.12 : 0.3, ease: EASE },
});

/**
 * Keyboard support for a tablist (automatic activation): arrows move the
 * selection (RTL-aware: ←/→ follow the visual order), Home/End jump.
 */
function useTabKeys<T extends string>(ids: readonly T[], value: T, onSelect: (id: T) => void) {
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = ids.indexOf(value);
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    let next: number;
    switch (e.key) {
      case 'ArrowLeft':
        next = i + (rtl ? 1 : -1);
        break;
      case 'ArrowRight':
        next = i + (rtl ? -1 : 1);
        break;
      case 'ArrowDown':
        next = i + 1;
        break;
      case 'ArrowUp':
        next = i - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = ids.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const id = ids[(next + ids.length) % ids.length];
    onSelect(id);
    refs.current.get(id)?.focus();
  };
  const register = (id: T) => (el: HTMLButtonElement | null) => {
    if (el) refs.current.set(id, el);
    else refs.current.delete(id);
  };
  return { onKeyDown, register };
}

const ROCK_IDS = ROCKS.map((r) => r.id);
const FORCE_IDS = FORCES.map((f) => f.id);

export function GeologyScene() {
  const reduce = !!useReducedMotion();
  const [rock, setRock] = useState<Rock['id']>('sediment');
  const [force, setForce] = useState<Force['id']>('endo');
  const rockData = ROCKS.find((r) => r.id === rock)!;
  const forceData = FORCES.find((f) => f.id === force)!;
  const rockKeys = useTabKeys(ROCK_IDS, rock, setRock);
  const forceKeys = useTabKeys(FORCE_IDS, force, setForce);
  const ForceVisual = FORCE_VISUALS[force];

  return (
    <MotionConfig reducedMotion="user">
      <section id="scene-geology" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SceneHeader
          step="04.1"
          eyebrow="גיאולוגיה צבאית"
          title="גיאולוגיה: סוגי הסלעים ועיצוב פני השטח"
          intro="גיאולוגיה עוסקת במבנה כדור הארץ, בחומרים המרכיבים אותו ובתהליכים שמשנים אותו. בחלק זה נכיר שלוש קבוצות סלעים ואת הכוחות המעצבים את הנוף, ונבחן כיצד הם משפיעים על תנאי השטח."
        />

        {/* ── Why it matters ─────────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-6 mb-12">
          <WhyCard title="השפעת הסלע על הפעילות בשטח">
            סוג הסלע ומצבו משפיעים על אפשרויות החפירה, על יציבות המדרונות ועל התנועה בשטח. כדי להעריך תנאים אלה, יש לבחון גם את הקרקע שמעל הסלע, את השיפוע ואת תנאי הרטיבות.
          </WhyCard>
          <WhyCard title="הכרת המסלע כחלק מהערכת השטח">
            מסלע הוא מכלול הסלעים המרכיבים אזור מסוים. הכרתו מסייעת לזהות מגבלות לתנועה ולעבודות הנדסה. זהו מרכיב בהערכת השטח, שאותו משלבים עם נתונים על התבליט, התכסית ותנאי הסביבה.
          </WhyCard>
        </div>

        {/* ── Rock types: select + explanation board ─────────────────── */}
        <div id="geo-rocks" className="my-12">
          <div className="mb-5">
            <h3 id="geo-rocks-title" className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
              שלוש קבוצות הסלעים
            </h3>
            <p className="mt-2 text-base leading-relaxed text-fg-muted">
              מסווגים סלעים לשלוש קבוצות לפי אופן היווצרותם. בחרו קבוצה כדי להכיר את תהליך היווצרותה ואת משמעותה להערכת השטח.
            </p>
          </div>

          <div>
            <div
              role="tablist"
              aria-labelledby="geo-rocks-title"
              aria-orientation="horizontal"
              onKeyDown={rockKeys.onKeyDown}
              className="grid sm:grid-cols-3 gap-3 mb-4"
            >
              {ROCKS.map((r, i) => {
                const active = rock === r.id;
                return (
                  <button
                    key={r.id}
                    ref={rockKeys.register(r.id)}
                    id={`geo-rock-tab-${r.id}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls="geo-rock-panel"
                    tabIndex={active ? 0 : -1}
                    onClick={() => setRock(r.id)}
                    className={cn(
                      OPTION_BASE,
                      'flex items-center gap-4 p-3.5 pe-4',
                      active ? OPTION_ACTIVE : OPTION_IDLE,
                    )}
                  >
                    <span className="relative shrink-0">
                      <RockSpecimen kind={r.id} className="size-14 rounded-lg ring-1 ring-black/5" />
                      <span
                        className={cn(
                          'absolute -top-1.5 -start-1.5 size-6 rounded-full border-2 flex items-center justify-center font-display font-bold text-[13px] transition-colors',
                          active ? 'bg-accent text-white border-transparent' : 'bg-bg-accent text-fg-muted border-bg-elevated',
                        )}
                      >
                        {i + 1}
                      </span>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-display font-bold text-base text-fg leading-tight">{r.label}</span>
                      <span className="block text-sm text-fg-muted leading-snug mt-1">{r.examples}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              role="tabpanel"
              id="geo-rock-panel"
              aria-labelledby={`geo-rock-tab-${rock}`}
              className="surface-elevated overflow-hidden"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={rock}
                  {...swap(reduce)}
                  className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] gap-4 lg:gap-6 p-5 sm:p-6 items-center"
                >
                  <div className="space-y-3">
                    <InfoBlock title="תהליך ההיווצרות">
                      {rockData.description}
                    </InfoBlock>
                    <InfoBlock title="המשמעות להערכת השטח" emphasis>
                      {rockData.military}
                    </InfoBlock>
                  </div>
                  <figure className="relative m-0 rounded-xl bg-paper-card overflow-hidden">
                    <RockDiorama kind={rock} reduce={reduce} />
                    {/* Rock sample — a hand specimen of this rock family */}
                    <div className="absolute top-3 start-3 w-[104px] rounded-xl bg-bg-elevated p-1.5">
                      <RockSpecimen kind={rock} className="w-full aspect-square rounded-lg" />
                      <div className="mt-1 px-0.5 text-center text-sm leading-snug text-fg-muted text-balance">
                        {rockData.examples}
                      </div>
                    </div>
                  </figure>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Forces: select + cause→effect diagram ──────────────────── */}
        <div id="geo-forces" className="my-12">
          <div className="mb-5">
            <h3 id="geo-forces-title" className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
              כוחות פנימיים וחיצוניים בעיצוב הנוף
            </h3>
            <p className="mt-2 text-base leading-relaxed text-fg-muted text-pretty">
              הנוף מתעצב בהשפעת תהליכים שמקורם בפנים כדור הארץ ותהליכים שפועלים על פני השטח. בחרו כל קבוצה כדי לבחון כיצד היא משנה את הנוף.
            </p>
          </div>

          <div>
            <div
              role="tablist"
              aria-labelledby="geo-forces-title"
              aria-orientation="horizontal"
              onKeyDown={forceKeys.onKeyDown}
              className="grid md:grid-cols-2 gap-3 mb-4"
            >
              {FORCES.map((f) => {
                const active = force === f.id;
                return (
                  <button
                    key={f.id}
                    ref={forceKeys.register(f.id)}
                    id={`geo-force-tab-${f.id}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls="geo-force-panel"
                    tabIndex={active ? 0 : -1}
                    onClick={() => setForce(f.id)}
                    className={cn(
                      OPTION_BASE,
                      'block p-4',
                      active ? OPTION_ACTIVE : OPTION_IDLE,
                    )}
                  >
                    <span className="block font-display font-bold text-base text-fg leading-tight">{f.label}</span>
                    <span className="block text-sm text-fg-muted leading-snug mt-1.5">{f.scale}</span>
                  </button>
                );
              })}
            </div>

            <div
              role="tabpanel"
              id="geo-force-panel"
              aria-labelledby={`geo-force-tab-${force}`}
              className="surface-elevated overflow-hidden"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={force}
                  {...swap(reduce)}
                  className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] gap-4 lg:gap-6 p-5 sm:p-6 items-center"
                >
                  <div className="p-1 sm:p-2">
                    <p className="text-base text-fg leading-relaxed text-pretty mb-5">{forceData.what}</p>
                    <h4 className="mb-2 font-display text-base font-bold text-fg">דוגמאות לתהליכים ולתוצאותיהם</h4>
                    <ul className="list-disc ps-5 space-y-1.5 marker:text-fg-muted">
                      {forceData.examples.map((e) => (
                        <li key={e} className="text-base text-fg leading-snug">
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <figure className="m-0 rounded-xl bg-paper-card overflow-hidden">
                    <ForceVisual reduce={reduce} />
                  </figure>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Bottom line ────────────────────────────────────────────── */}
        <div className="surface p-5 sm:p-6">
          <div className="mb-2 font-display text-lg font-bold leading-snug text-fg md:text-xl">הקשר בין המסלע לצורת השטח</div>
          <p className="text-base text-fg leading-relaxed text-pretty">
            צורת השטח היא תוצאה של שילוב בין תכונות הסלעים לבין הכוחות הפנימיים והחיצוניים שפועלים עליהם. סוג הסלע משפיע על תגובתו לתהליכים אלה, אך אינו קובע לבדו את צורת הנוף או את העבירות. בהערכת השטח משלבים את הכרת המסלע עם בחינת השיפוע, מבנה הקרקע והתכסית.
          </p>
        </div>
      </section>
    </MotionConfig>
  );
}

/** Pre-interaction explanation — plain info text on the page (no card, icon or kicker). */
function WhyCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="min-w-0">
      <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl">{title}</h3>
      <p className="mt-2 text-base leading-relaxed text-fg text-pretty">{children}</p>
    </article>
  );
}

/** Text block inside the rock board; `emphasis` = the key-fact inset (tint only, no border). */
function InfoBlock({
  title,
  emphasis = false,
  children,
}: {
  title: string;
  emphasis?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn('rounded-xl p-4', emphasis && 'bg-bg-accent/60')}>
      <h4 className="mb-1.5 font-display text-base font-bold text-fg">{title}</h4>
      <p className="text-base leading-relaxed text-fg text-pretty">{children}</p>
    </div>
  );
}
