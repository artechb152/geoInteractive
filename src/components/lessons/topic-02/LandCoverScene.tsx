'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { SortQuiz, type SortItem } from './SortQuiz';
import { LandCoverMap } from './LandCoverMap';
import {
  CatGlyph,
  NaturalVignette,
  PlantedVignette,
  SeasonGlyph,
  VegetationLadder,
} from './LandCoverVisuals';
import { cn } from '@/lib/utils';

/** T1 section title (cleanup spec §3) — replaces the labelled SoftDivider; spacing instead of rules. */
const SECTION_TITLE = 'mt-12 mb-5 font-display text-2xl font-bold leading-tight text-fg sm:text-3xl';

/** Option (clickable) — idle / selected (cleanup spec §1, §2). */
const OPTION_IDLE = 'border-border bg-bg-elevated text-fg hover:border-brand/30 hover:bg-brand/[0.03]';
const OPTION_ON = 'border-accent bg-accent/10 text-fg';

/**
 * תת-נושא „תכסית” — ממשיך את התבליט ותבניות הנוף: מה נמצא על הקרקע.
 * חלוקה לפי מקור (טבעית / מלאכותית) ולפי סוג (צומח · פעילות האדם · תשתיות),
 * כולל הקשר בין מסלע, תבליט וצומח.
 * שלב layout: מבנה, תוכן ואינטראקציה. העיצוב הסופי ייקבע לפי מוקאפ.
 */

type Cat = 'vegetation' | 'human' | 'infra';
type Origin = 'natural' | 'artificial';
type Season = 'winter' | 'summer';

type CoverFeature = {
  id: string;
  label: string;
  cat: Cat;
  origin: Origin;
  desc: string;
};

const CATS: { id: Cat; label: string; def: string }[] = [
  {
    id: 'vegetation',
    label: 'צומח',
    def: 'הצמחייה שעל פני הקרקע, ובה עשב, שיחים ועצים. צומח יכול להיות טבעי או נטוע בידי אדם, כמו יער נטוע.',
  },
  {
    id: 'human',
    label: 'פעילות האדם',
    def: 'מרכיבי תכסית שנוצרו בעקבות בנייה ועיבוד חקלאי: יישובים, מבנים, שדות, מטעים וטרסות.',
  },
  {
    id: 'infra',
    label: 'תשתיות',
    def: 'מערכות ומתקנים שהאדם הקים לצורכי תנועה, אספקה ותיחום שטחים: דרכים, קווי חשמל, מערכות מים וגדרות.',
  },
];

const FEATURES: CoverFeature[] = [
  // צומח
  { id: 'grove',     label: 'חורש',          cat: 'vegetation', origin: 'natural',    desc: 'צומח הכולל עצים שגובהם מעל 2 מטרים, לצד שיחים ומטפסים בפיזור לא סדור. לפי צפיפות כיסוי צמרות העצים מבחינים בין חורש פתוח, חצי־סגור וסגור.' },
  { id: 'garrigue',  label: 'גריגה',         cat: 'vegetation', origin: 'natural',    desc: 'שיחים בגובה של כ־0.5–2 מטרים, במשטחים רציפים או ליד עצים.' },
  { id: 'batha',     label: 'בתה ועשבוני',   cat: 'vegetation', origin: 'natural',    desc: 'תצורות צומח נמוכות ללא עצים: בבתה בולטים בני־שיח נמוכים, עד כחצי מטר, ובצומח עשבוני בולטים עשבים. באיור מוצג השינוי העונתי בין צומח ירוק בחורף לצומח יבש בקיץ.' },
  { id: 'planted',   label: 'יער נטוע',      cat: 'vegetation', origin: 'artificial', desc: 'יער שהאדם נטע, ובו עצים שעשויים להגיע לגובה של 5–6 מטרים ואף יותר. שורות סדורות ומרווחים קבועים בין העצים עשויים להעיד על נטיעה מתוכננת. לפי מקורו, היער מסווג כתכסית מלאכותית.' },
  // פעילות האדם
  { id: 'village',   label: 'יישוב ומבנים',  cat: 'human',      origin: 'artificial', desc: 'שטח בנוי הכולל בתים, מבני ציבור וחצרות. בכפר המוצג באיור יש גם כיכר מרכזית.' },
  { id: 'fields',    label: 'שדות (גד״ש)',   cat: 'human',      origin: 'artificial', desc: 'חלקות חקלאיות המשמשות לגידולי שדה (גד״ש). מראה הצומח וצבעו משתנים בהתאם לסוג הגידול, לשלב הצמיחה ולעונה.' },
  { id: 'orchard',   label: 'מטע',           cat: 'human',      origin: 'artificial', desc: 'שטח חקלאי שבו עצים נטועים בשורות ובמרווחים קבועים. באיור מוצג מטע הדרים, שעציו ירוקים לאורך השנה.' },
  { id: 'terraces',  label: 'טרסות',         cat: 'human',      origin: 'artificial', desc: 'מדרגות חקלאיות שהאדם יצר במדרון בעזרת קירות אבן, כדי לאפשר עיבוד על משטחים מישוריים.' },
  // תשתיות
  { id: 'road',      label: 'כביש',          cat: 'infra',      origin: 'artificial', desc: 'דרך סלולה שמחברת בין יישובים.' },
  { id: 'track',     label: 'דרך עפר',       cat: 'infra',      origin: 'artificial', desc: 'דרך לא סלולה המשמשת לתנועה בשטח, למשל לצורך גישה לשדות ולמטעים.' },
  { id: 'power',     label: 'קו מתח',        cat: 'infra',      origin: 'artificial', desc: 'תשתית להעברת חשמל, המורכבת מעמודים ומכבלים העוברים ביניהם.' },
  { id: 'reservoir', label: 'מאגר מים',      cat: 'infra',      origin: 'artificial', desc: 'מתקן לאגירת מים לצורכי השקיה. המאגר משתלב במערכת אספקת מים הכוללת צינורות או תעלות.' },
  { id: 'fence',     label: 'גדר',           cat: 'infra',      origin: 'artificial', desc: 'מתקן לתיחום שטח ולהסדרת הכניסה אליו. באיור הגדר מקיפה את המטע וכוללת שער אחד.' },
];

const ORIGIN_LABEL: Record<Origin, string> = { natural: 'טבעית', artificial: 'מלאכותית' };

const SEASON_NOTE: Record<Season, string> = {
  winter: 'בתצוגת החורף העשב, הבתה והשדות מוצגים בירוק, והשיחים בגוון ירוק כהה. השוו לתצוגת הקיץ כדי לזהות את השינויים במראה הצומח.',
  summer: 'בתצוגת הקיץ העשב והשדות מוצגים כיבשים, צבע הקרקע בולט יותר והשיחים מאפירים. עצים ירוקי־עד, כגון עצי הדר, נשארים ירוקים. בשטח, השינוי תלוי גם בסוג הצומח ובהשקיה.',
};

/** Mediterranean vegetation, low → high (content/topic-04.md, 4.4). */
const VEG_LADDER: { label: string; height: string; planted?: boolean }[] = [
  { label: 'עשבוני',    height: 'נמוך, ללא עצים' },
  { label: 'בתה',       height: 'עד כחצי מטר' },
  { label: 'גריגה',     height: 'כ־0.5–2 מטרים' },
  { label: 'חורש',      height: 'עצים מעל 2 מטרים' },
  { label: 'יער נטוע',  height: 'לעיתים מעל 5–6 מטרים · נטוע', planted: true },
];

const EASE = [0.22, 1, 0.36, 1] as const;

const QUIZ_ITEMS: SortItem<Origin>[] = [
  { id: 'q-grove',     label: 'חורש',        answer: 'natural',    why: 'העצים והשיחים בחורש גדלו באופן טבעי, ולכן הוא תכסית טבעית.' },
  { id: 'q-citrus',    label: 'מטע הדרים',   answer: 'artificial', why: 'עצי המטע ניטעו בידי אדם, ולכן המטע הוא תכסית מלאכותית.' },
  { id: 'q-garrigue',  label: 'גריגה',       answer: 'natural',    why: 'גריגה היא תצורת שיחים שגדלו באופן טבעי, ולכן היא תכסית טבעית.' },
  { id: 'q-planted',   label: 'יער נטוע',    answer: 'artificial', why: 'היער נוצר בנטיעה בידי אדם, ולכן הוא תכסית מלאכותית.' },
  { id: 'q-terraces',  label: 'טרסות',       answer: 'artificial', why: 'הטרסות נבנו בידי אדם לצורך עיבוד חקלאי, ולכן הן תכסית מלאכותית.' },
  { id: 'q-batha',     label: 'בתה',         answer: 'natural',    why: 'בני־השיח בבתה גדלו באופן טבעי, ולכן היא תכסית טבעית.' },
  { id: 'q-reservoir', label: 'מאגר מים',    answer: 'artificial', why: 'המאגר המוצג הוקם בידי אדם לצורכי השקיה, ולכן הוא תכסית מלאכותית.' },
  { id: 'q-wheat',     label: 'שדה חיטה',    answer: 'artificial', why: 'החיטה נזרעה בשטח שהאדם מעבד, ולכן השדה הוא תכסית מלאכותית.' },
];

export function LandCoverScene() {
  const [cat, setCat] = useState<Cat>('vegetation');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [season, setSeason] = useState<Season>('winter');
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeCat = CATS.find((c) => c.id === cat)!;
  const selected = FEATURES.find((f) => f.id === selectedId) ?? null;
  const swap = { duration: reduce ? 0 : 0.28, ease: EASE };

  const selectFeature = (id: string) => {
    const f = FEATURES.find((x) => x.id === id);
    if (!f) return;
    setCat(f.cat);
    setSelectedId(id);
  };

  const chooseCat = (id: Cat) => {
    setCat(id);
    setSelectedId(null);
  };

  /** Tabs follow the WAI-ARIA pattern; in RTL ArrowLeft moves forward. */
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const n = CATS.length;
    let next = -1;
    if (e.key === 'ArrowLeft') next = (idx + 1) % n;
    else if (e.key === 'ArrowRight') next = (idx - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    chooseCat(CATS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="scene-landcover" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SceneHeader
        title="תכסית: זיהוי וסיווג המרכיבים שעל פני הקרקע"
        intro="לאחר שהכרנו את מבנה הקרקע ואת סוגי הסלעים, נבחן את התכסית — המרכיבים שנמצאים על פני הקרקע. נלמד לסווג אותם לפי מקורם, טבעי או מלאכותי, ולפי סוגם: צומח, פעילות האדם ותשתיות."
      />

      {/* ── Screen 1: natural vs. artificial — one flat info card, so the map workspace is the first strong surface ── */}
      <div className="surface p-5 sm:p-6">
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
          <OriginCard
            title="תכסית טבעית"
            tone="natural"
            body="תכסית שמקורה בתהליכים טבעיים, כגון עשב, שיחים וחורש שגדלו ללא זריעה או נטיעה בידי אדם."
            examples={['עשבוני ובתה', 'גריגה', 'חורש']}
          />
          <OriginCard
            title="תכסית מלאכותית"
            tone="artificial"
            body="תכסית שהאדם יצר או עיצב באמצעות בנייה, חקלאות והקמת תשתיות, ובה יישובים, שדות ודרכים."
            examples={['בתים', 'שדות ומטעים', 'כבישים', 'קווי חשמל', 'גדרות']}
          />
        </div>
        <div className="mt-6 rounded-xl bg-bg-accent/60 p-4">
          <p className="font-display text-base font-bold text-fg">סיווג צומח לפי מקורו</p>
          <p className="mt-1 text-base leading-relaxed text-fg-muted">
            יער נטוע, מטע ושדה מסווגים כתכסית מלאכותית משום שנוצרו בנטיעה או בזריעה בידי אדם.
            שורות ישרות, מרווחים קבועים וגבולות חלקה ברורים עשויים לסייע בזיהוי פעילות זו.
          </p>
        </div>
      </div>

      {/* ── Screen 2: three types, on one map sample ── */}
      <h3 className={SECTION_TITLE}>זיהוי סוגי תכסית בשטח</h3>

      {/* One workspace: tabs + explanation/controls + map — the screen's visual focus */}
      <div className="surface-elevated p-5 sm:p-6">
        <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="סוגי תכסית">
          {CATS.map((c, i) => {
            const on = cat === c.id;
            return (
              <button
                key={c.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                id={`${uid}-tab-${c.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`${uid}-panel`}
                tabIndex={on ? 0 : -1}
                onClick={() => chooseCat(c.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-display font-bold text-sm cursor-pointer',
                  'transition-colors duration-200 ease-snap motion-reduce:transition-none',
                  on ? OPTION_ON : OPTION_IDLE,
                )}
              >
                <CatGlyph cat={c.id} className="text-fg-muted" />
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[1fr_1.6fr] gap-6 lg:gap-8 items-start">
          {/* Explanation + items (first child → right in RTL) */}
          <div className="space-y-6">
            <div
              id={`${uid}-panel`}
              role="tabpanel"
              aria-labelledby={`${uid}-tab-${cat}`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={cat}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={swap}
                >
                  <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl mb-2">{activeCat.label}</h3>
                  <p className="text-base text-fg-muted leading-relaxed mb-4">{activeCat.def}</p>
                  <div className="flex flex-wrap gap-2">
                    {FEATURES.filter((f) => f.cat === cat).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        aria-pressed={selectedId === f.id}
                        onClick={() => setSelectedId(f.id)}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-display font-semibold cursor-pointer',
                          'transition-colors duration-200 ease-snap motion-reduce:transition-none',
                          selectedId === f.id ? OPTION_ON : OPTION_IDLE,
                        )}
                      >
                        {/* origin key: sage = natural, grey = man-made (same key as the result line below) */}
                        <span
                          aria-hidden
                          className={cn('size-2 rounded-full shrink-0', f.origin === 'natural' ? 'bg-brand' : 'bg-fg-dim')}
                        />
                        {f.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                {selected ? (
                  <motion.div
                    key={selected.id}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    transition={swap}
                    className={cn(
                      // result inset — tinted by the origin data colour it reports (same key as the dots)
                      'min-h-[148px] rounded-xl p-4',
                      selected.origin === 'natural' ? 'bg-brand/10' : 'bg-fg-dim/10',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                      <h4 className="font-display text-lg font-bold leading-snug text-fg md:text-xl">{selected.label}</h4>
                      <span className="inline-flex items-center gap-1.5 text-sm text-fg-muted">
                        <CatGlyph cat={selected.cat} className="text-fg-muted" />
                        {CATS.find((c) => c.id === selected.cat)!.label}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm text-fg-muted">
                        <span
                          aria-hidden
                          className={cn('size-2 rounded-full shrink-0', selected.origin === 'natural' ? 'bg-brand' : 'bg-fg-dim')}
                        />
                        תכסית {ORIGIN_LABEL[selected.origin]}
                      </span>
                    </div>
                    <p className="text-base text-fg leading-relaxed">{selected.desc}</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    transition={swap}
                    className="min-h-[148px]"
                  >
                    <p className="text-sm text-fg-muted leading-relaxed">
                      בחרו רכיב באיור או ברשימה כדי לקרוא את תיאורו, את סוגו ואת מקורו כתכסית טבעית או מלאכותית.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-sm font-display font-semibold text-fg-muted">עונה</span>
                <div className="inline-flex gap-1.5" role="group" aria-label="בחירת עונה">
                  {(['winter', 'summer'] as Season[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={season === s}
                      onClick={() => setSeason(s)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-display font-bold cursor-pointer',
                        'transition-colors duration-200 ease-snap motion-reduce:transition-none',
                        season === s ? OPTION_ON : OPTION_IDLE,
                      )}
                    >
                      <SeasonGlyph season={s} className="text-fg-muted" />
                      {s === 'winter' ? 'חורף' : 'קיץ'}
                    </button>
                  ))}
                </div>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={season}
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={swap}
                  className="text-sm text-fg-muted leading-relaxed"
                >
                  {SEASON_NOTE[season]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Map sample — sits directly in the workspace; the paper tile is its own neat-line */}
          <div>
            <LandCoverMap
              features={FEATURES}
              cat={cat}
              selectedId={selectedId}
              season={season}
              onSelect={selectFeature}
              ariaLabel="מבט מלמעלה על שטח לדוגמה: חורש, גריגה, בתה, יער נטוע, כפר, שדות, מטע, טרסות, כביש, דרך עפר, קו מתח, מאגר מים וגדר"
            />
            <p className="mt-3 text-sm text-fg-muted leading-snug text-center">
              מבט מלמעלה על שטח לדוגמה · המחשה סכמטית, ללא שימוש בסימני מפה מוסכמים
            </p>
          </div>
        </div>
      </div>

      {/* ── Screen 3: vegetation, and what shapes it ── */}
      <h3 className={SECTION_TITLE}>תצורות הצומח וגובהן</h3>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-stretch">
        <div className="surface-elevated p-5 sm:p-6">
          <div className="text-sm font-display font-semibold text-fg-muted mb-3">
            תצורות הצומח במרחב הים־תיכוני — לפי הגובה
          </div>
          <VegetationLadder items={VEG_LADDER} legend="מסגרת בקו מקווקו מציינת צומח שניטע בידי אדם." />
        </div>

        <div className="surface p-5 sm:p-6">
          <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl">הגורמים המשפיעים על הצומח</h3>
          <p className="mt-2 text-base text-fg-muted leading-relaxed">
            סוג הצומח, גובהו וצפיפותו מושפעים מתנאי השטח והסביבה:
          </p>
          {/* each item leads with its bold factor — spacing separates them, no bullet dots */}
          <ul className="mt-4 space-y-3 text-base text-fg-muted leading-relaxed">
            <li>
              <span>
                <strong className="text-fg">התבליט</strong> — הגובה מעל פני הים וכיוון המדרון, הנקרא מפנה. במרחב הים־תיכוני בישראל, מדרון צפוני מקבל לרוב פחות קרינה ישירה ממדרון דרומי. הבדל זה עשוי להתבטא בצומח צפוף וגבוה יותר במפנה הצפוני.
              </span>
            </li>
            <li>
              <span>
                <strong className="text-fg">המסלע והקרקע</strong> — סוג הסלע, עומק הקרקע ותכונותיה משפיעים על תנאי הצמיחה. יש לבחון אותם יחד עם האקלים ותנאי השטח, ולא להסיק על סוג הצומח מסוג הסלע בלבד.
              </span>
            </li>
            <li>
              <span>
                <strong className="text-fg">האקלים</strong> — כמות המשקעים, פיזורם לאורך השנה והטמפרטורות.
              </span>
            </li>
            <li>
              <span>
                <strong className="text-fg">פעילות האדם</strong> — כריתה, רעייה, נטיעה ועיבוד חקלאי משנים את הרכב הצומח ואת פיזורו.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Screen 4: quick check ── */}
      <h3 className={SECTION_TITLE}>תרגול: סיווג התכסית לפי מקור</h3>

      <SortQuiz
        title="טבעית או מלאכותית?"
        prompt="סווגו כל רכיב כתכסית טבעית או מלאכותית לפי מקורו. לאחר הבחירה יוצג הסבר לסיווג."
        options={[
          { id: 'natural', label: 'טבעית' },
          { id: 'artificial', label: 'מלאכותית' },
        ]}
        items={QUIZ_ITEMS}
      />
    </section>
  );
}

function OriginCard({
  title,
  tone,
  body,
  examples,
}: {
  title: string;
  tone: Origin;
  body: string;
  examples: string[];
}) {
  return (
    <article>
      <div className="flex items-start justify-between gap-4 mb-2">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold leading-snug text-fg md:text-xl pt-1">
          {/* legend key for the origin dots on the feature pills and in the result (sage = natural, grey = man-made) */}
          <span
            aria-hidden
            className={cn('size-2.5 rounded-full shrink-0', tone === 'natural' ? 'bg-brand' : 'bg-fg-dim')}
          />
          {title}
        </h3>
        {/* the vignette carries the identification cue (irregular crowns vs. rows) — kept, bare */}
        <span aria-hidden className="shrink-0 -mt-1">
          {tone === 'natural' ? <NaturalVignette /> : <PlantedVignette />}
        </span>
      </div>
      <p className="text-base text-fg-muted leading-relaxed mb-3">{body}</p>
      {/* static examples: plain inline list, `·` separators drawn by CSS (not chips) */}
      <ul className="flex flex-wrap gap-y-1 text-sm font-semibold text-fg">
        {examples.map((e) => (
          <li key={e} className="after:mx-2 after:font-normal after:text-fg-dim after:content-['·'] last:after:content-none">
            {e}
          </li>
        ))}
      </ul>
    </article>
  );
}
