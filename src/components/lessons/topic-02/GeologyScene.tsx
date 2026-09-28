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

const ROCKS: Rock[] = [
  {
    id: 'igneous',
    label: 'סלעי יסוד',
    description: 'אלו סלעים שנוצרו מהתקרבות של מאגמה רותחת (לבה). הם נחשבים לסלעים הקשים והחזקים ביותר בטבע.',
    examples: 'גרניט, בזלת',
    military: 'כמעט בלתי אפשרי לחפור בהם ידנית. הם מהווים בסיס מעולה לבונקרים ומבנים כבדים, אך בגלל חוזקם, הם יוצרים לעיתים נוף חשוף וחד שקשה למצוא בו מחסה טבעי.',
    color: 'text-accent-hot',
  },
  {
    id: 'sediment',
    label: 'סלעי משקע',
    description: 'הצטברות של שכבות חול, שרידי בעלי חיים וצמחייה שנדחסו לאורך מיליוני שנים. אלו הסלעים הנפוצים ביותר בישראל (כמו גיר).',
    examples: 'גיר, חוואר, אבן חול',
    military: 'סלעים רכים יחסית שמאפשרים חפירה מהירה (גם של מנהרות ותעלות). הם נוטים ליצור נוף"רך" ומעוגל, אך הם פגיעים יותר להפצצות ועלולים להתפורר בקלות תחת אש ארטילרית.',
    color: 'text-accent',
  },
  {
    id: 'metamorphic',
    label: 'סלעים מותמרים',
    description: 'סלעים קיימים שעברו"גלגול" (התמרה) כתוצאה מחום קיצוני או לחץ אדיר בעומק האדמה, מה ששינה לחלוטין את תכונותיהם.',
    examples: 'שיש, צפחה',
    military: 'סלעים אלו מופיעים לרוב בשכבות דקות ושבירות, מה שהופך את המדרונות שלהם למסוכנים מאוד לטיפוס או לתנועה. הם נדירים באזורנו אך נפוצים מאוד ברכסי הרים גבוהים בעולם.',
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

const FORCES: Force[] = [
  {
    id: 'endo',
    label: 'כוחות מבפנים כדור הארץ (אנדוגניים)',
    scale: 'מקרו-טופוגרפיה · הרים שלמים',
    what: 'אלו הכוחות ה"בונים": תהליכים שמתרחשים עמוק מתחת לפני השטח (כמו תזוזת לוחות טקטוניים). הם אלו שיוצרים את המקרו-טופוגרפיה – רכסי ההרים העצומים, בקעים עמוקים והרי געש. הם קובעים את"המבנה הגדול" של שדה הקרב.',
    examples: ['רכסי הרים שלמים', 'שברים ארוכים (כמו השבר הסורי-אפריקני)', 'הרי געש', 'רעידות אדמה'],
  },
  {
    id: 'exo',
    label: 'כוחות מבחוץ, על פני השטח (אקסוגניים)',
    scale: 'מיקרו-טופוגרפיה · קפלי קרקע מקומיים',
    what: 'אלו הכוחות ה"מפסלים": פועלים על פני השטח עצמו – השפעות של מזג האוויר (גשם, רוח, שינויי טמפרטורה) שגורמות לבלייה (התפוררות הסלע). הם אלו שיוצרים את המיקרו-טופוגרפיה – ערוצי נחלים קטנים, מצוקים ודרדרות. הם אלו שקובעים אם תוכל להסתיר כוח בתוך כפל קרקע קטן.',
    examples: ['ערוצי נחל וגיאיות', 'מצוקים שנגרסים מגלים', 'דיונות חול בנוצרות מרוח', 'דרדרות סלעים במדרונות'],
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
          title="כדי להבין שטח — צריך להבין ממה הוא בנוי"
          intro='גיאולוגיה היא"תורת הסלע". היא מסבירה איך נוצר החומר שנמצא לנו מתחת לרגליים ואיך הוא מעצב את ההרים והעמקים שמעליו. בלי להבין את המבנה הפנימי של הקרקע, לא נוכל להעריך נכון את האתגרים שהשטח מציב לנו.'
        />

        {/* ── Why it matters ─────────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-6 mb-12">
          <WhyCard title="סוג הסלע = הצלחת המשימה">
            סוג הסלע קובע אם הכוח שלך יתקע בבוץ אחרי הגשם הראשון, אם תוכל לחפור עמדות הגנה יציבות, ואם השטח עביר לטנקים או רק ללוחמים רגליים.
          </WhyCard>
          <WhyCard title="מניחוש להחלטה מבצעית חכמה">
            הבנת המסלע (סוג הסלע) הופכת ניחוש להחלטה: איפה לבסס בונקרים, איפה לנוע, איפה להניח גשר ואיפה לחפור מארב. בלי זה — אתה מתכנן באוויר.
          </WhyCard>
        </div>

        {/* ── Rock types: select + explanation board ─────────────────── */}
        <div id="geo-rocks" className="my-12">
          <div className="mb-5">
            <h3 id="geo-rocks-title" className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
              3 סוגי הסלעים
            </h3>
            <p className="mt-2 text-base leading-relaxed text-fg-muted">
              כל הסלעים בעולם נכנסים לאחת משלוש הקבוצות האלה. כל קבוצה — אופי שונה והשלכות צבאיות שונות.
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
                    <InfoBlock title="איך נוצר ומאיפה?">
                      {rockData.description}
                    </InfoBlock>
                    <InfoBlock title="המשמעות הצבאית" emphasis>
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
              2 כוחות שמעצבים כל הר בכוכב הזה
            </h3>
            <p className="mt-2 text-base leading-relaxed text-fg-muted text-pretty">
              הנוף לא קיים סתם ככה. הוא נוצר מ-2 סוגי כוחות: כוחות שדוחפים מבפנים כדור הארץ, מתחת לפני השטח (יוצרים הרים), וכוחות שמבלים מבחוץ, על פני השטח עצמו (חורצים גיאיות).
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
                    <h4 className="mb-2 font-display text-base font-bold text-fg">דוגמאות בנוף</h4>
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
          <div className="mb-2 font-display text-lg font-bold leading-snug text-fg md:text-xl">בשורה התחתונה</div>
          <p className="text-base text-fg leading-relaxed text-pretty">
            הנוף הוא"מאבק" תמידי: הכוחות הפנימיים דוחפים למעלה ובונים הרים, בעוד הכוחות החיצוניים מנסים לשחוק ולשטח אותם. סוג הסלע הוא זה שקובע מי מנצח ובאיזו מהירות – וזה ההבדל בין צוק בזלת חד ובלתי עביר לבין גבעת גיר רכה ונוחה לתנועה.
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
