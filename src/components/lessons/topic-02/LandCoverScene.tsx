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
const SECTION_TITLE = 'mt-16 mb-5 font-display text-2xl font-bold leading-tight text-fg sm:text-3xl';

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
    def: 'הצמחייה שגדלה על הקרקע. רובה טבעית — עשב, שיחים וחורש — אבל יש גם צומח שהאדם נטע, כמו יער נטוע.',
  },
  {
    id: 'human',
    label: 'פעילות האדם',
    def: 'מה שהאדם בנה או עיבד כדי לגור בשטח ולהתפרנס ממנו: יישובים ומבנים, וחקלאות — שדות, מטעים וטרסות.',
  },
  {
    id: 'infra',
    label: 'תשתיות',
    def: 'המערכות שהאדם הקים כדי לנוע בשטח ולהעביר בו משאבים: דרכים, קווי חשמל, מערכות מים וגדרות.',
  },
];

const FEATURES: CoverFeature[] = [
  // צומח
  { id: 'grove',     label: 'חורש',          cat: 'vegetation', origin: 'natural',    desc: 'עצים מעל 2 מטרים יחד עם שיחים ומטפסים, בפיזור לא סדור. לפי צפיפות החופה מבחינים בין חורש פתוח, חצי־סגור וסגור.' },
  { id: 'garrigue',  label: 'גריגה',         cat: 'vegetation', origin: 'natural',    desc: 'שיחים בגובה של כ־0.5–2 מטרים, במשטחים רציפים או ליד עצים.' },
  { id: 'batha',     label: 'בתה ועשבוני',   cat: 'vegetation', origin: 'natural',    desc: 'עשבים ובני־שיח נמוכים — עד כחצי מטר, בלי עצים. ירוקים בחורף ומתייבשים בקיץ.' },
  { id: 'planted',   label: 'יער נטוע',      cat: 'vegetation', origin: 'artificial', desc: 'עצים גבוהים (לעיתים מעל 5–6 מטרים) וביניהם מעט שיחים. הסדר והאחידות מסגירים שהאדם נטע אותו — זה לא צומח טבעי.' },
  // פעילות האדם
  { id: 'village',   label: 'יישוב ומבנים',  cat: 'human',      origin: 'artificial', desc: 'בתים, מבני ציבור וחצרות. במרכז הכפר — כיכר מרכזית.' },
  { id: 'fields',    label: 'שדות (גד״ש)',   cat: 'human',      origin: 'artificial', desc: 'גידולי שדה: צמחייה נמוכה וצפופה בחלקות סדורות, שמשנה צבע במהירות לאורך העונה.' },
  { id: 'orchard',   label: 'מטע',           cat: 'human',      origin: 'artificial', desc: 'עצים בשורות סדורות ובמרווחים קבועים — למשל הדרים, שנשארים ירוקים כל השנה.' },
  { id: 'terraces',  label: 'טרסות',         cat: 'human',      origin: 'artificial', desc: 'מדרגות אבן שהאדם בנה על המדרון, כדי ליצור משטחים שטוחים לעיבוד.' },
  // תשתיות
  { id: 'road',      label: 'כביש',          cat: 'infra',      origin: 'artificial', desc: 'דרך סלולה שמחברת בין יישובים.' },
  { id: 'track',     label: 'דרך עפר',       cat: 'infra',      origin: 'artificial', desc: 'דרך לא סלולה — למשל דרך שירות שמובילה לשדות ולמטעים.' },
  { id: 'power',     label: 'קו מתח',        cat: 'infra',      origin: 'artificial', desc: 'עמודים וכבלי חשמל שחוצים את השטח בקו ישר.' },
  { id: 'reservoir', label: 'מאגר מים',      cat: 'infra',      origin: 'artificial', desc: 'מאגר להשקיה — חלק ממערכת מים שכוללת גם צנרת ותעלות.' },
  { id: 'fence',     label: 'גדר',           cat: 'infra',      origin: 'artificial', desc: 'גדר שתוחמת שטח — כאן, סביב המטע, עם שער אחד.' },
];

const ORIGIN_LABEL: Record<Origin, string> = { natural: 'טבעית', artificial: 'מלאכותית' };

const SEASON_NOTE: Record<Season, string> = {
  winter: 'בחורף העשב, הבתה והשדות ירוקים, והשיחים בגוון ירוק כהה.',
  summer: 'בקיץ העשב והשדות מתייבשים ומבליטים את צבע הקרקע, והשיחים מאפירים. עצים ירוקי־עד, כמו מטע הדרים, נשארים ירוקים.',
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
  { id: 'q-grove',     label: 'חורש',        answer: 'natural',    why: 'עצים ושיחים שגדלו מעצמם, בפיזור לא סדור.' },
  { id: 'q-citrus',    label: 'מטע הדרים',   answer: 'artificial', why: 'עצים שהאדם נטע בשורות — צומח, אבל תכסית מלאכותית.' },
  { id: 'q-garrigue',  label: 'גריגה',       answer: 'natural',    why: 'שיחים שגדלו באופן טבעי.' },
  { id: 'q-planted',   label: 'יער נטוע',    answer: 'artificial', why: 'זה יער — אבל האדם נטע אותו, ולכן זו תכסית מלאכותית.' },
  { id: 'q-terraces',  label: 'טרסות',       answer: 'artificial', why: 'מדרגות אבן שהאדם בנה על המדרון.' },
  { id: 'q-batha',     label: 'בתה',         answer: 'natural',    why: 'עשבים ובני־שיח נמוכים שגדלו באופן טבעי.' },
  { id: 'q-reservoir', label: 'מאגר מים',    answer: 'artificial', why: 'מאגר שהאדם הקים להשקיה — תשתית.' },
  { id: 'q-wheat',     label: 'שדה חיטה',    answer: 'artificial', why: 'גידול שדה שהאדם זרע ומעבד.' },
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
        title="מה מכסה את הקרקע?"
        intro="אחרי שהכרנו את התבליט, את תבניות הנוף ואת הסלעים שמתחתיהם, עוברים לשכבה שמעל הקרקע. תכסית היא כל מה שנמצא על פני הקרקע. מחלקים אותה לפי המקור שלה — טבעית או מלאכותית — ולפי הסוג: צומח, פעילות האדם ותשתיות."
      />

      {/* ── Screen 1: natural vs. artificial — one flat info card, so the map workspace is the first strong surface ── */}
      <div className="surface p-5 sm:p-6">
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
          <OriginCard
            title="תכסית טבעית"
            tone="natural"
            body="נוצרה בלי התערבות האדם — בעיקר צומח טבעי: עשב, שיחים וחורש."
            examples={['עשבוני ובתה', 'גריגה', 'חורש']}
          />
          <OriginCard
            title="תכסית מלאכותית"
            tone="artificial"
            body="האדם יצר אותה או שינה אותה: יישובים ומבנים, חקלאות ותשתיות."
            examples={['בתים', 'שדות ומטעים', 'כבישים', 'קווי חשמל', 'גדרות']}
          />
        </div>
        <div className="mt-6 rounded-xl bg-bg-accent/60 p-4">
          <p className="font-display text-base font-bold text-fg">לא כל ירוק הוא טבעי</p>
          <p className="mt-1 text-base leading-relaxed text-fg-muted">
            יער נטוע, מטע ושדה הם צומח — אבל האדם נטע וזרע אותם, ולכן הם תכסית מלאכותית.
            רמז לזיהוי: שורות ישרות, מרווחים קבועים וגבולות חלקה חדים.
          </p>
        </div>
      </div>

      {/* ── Screen 2: three types, on one map sample ── */}
      <div className={SECTION_TITLE}>שלושה סוגי תכסית</div>

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
                    className="min-h-[132px] rounded-xl bg-bg-accent/60 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                      <h4 className="font-display font-bold text-lg text-fg">{selected.label}</h4>
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
                    className="min-h-[132px] rounded-xl bg-bg-accent/60 p-4"
                  >
                    <p className="text-base text-fg-muted leading-relaxed">
                      לחצו על אזור במפה או על אחד הרכיבים כדי לראות מה הוא ולאיזה סוג הוא שייך.
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
              מבט מלמעלה על שטח לדוגמה · האיור סכמטי, ואינו מפה או מקרא אמיתיים
            </p>
          </div>
        </div>
      </div>

      {/* ── Screen 3: vegetation, and what shapes it ── */}
      <div className={SECTION_TITLE}>צומח טבעי: מהנמוך לגבוה</div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-stretch">
        <div className="surface-elevated p-5">
          <div className="text-sm font-display font-semibold text-fg-muted mb-3">
            תצורות הצומח במרחב הים־תיכוני — לפי הגובה
          </div>
          <VegetationLadder items={VEG_LADDER} legend="מסגרת מקווקוות = צומח שנטע האדם." />
        </div>

        <div className="surface p-5 sm:p-6">
          <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl">מה קובע איזה צומח יגדל?</h3>
          <p className="mt-2 text-base text-fg-muted leading-relaxed">
            הצומח לא מתפזר באקראי — הוא תלוי בשכבות שמתחתיו ובסביבה:
          </p>
          {/* each item leads with its bold factor — spacing separates them, no bullet dots */}
          <ul className="mt-4 space-y-3 text-base text-fg-muted leading-relaxed">
            <li>
              <span>
                <strong className="text-fg">התבליט</strong> — גובה מעל פני הים וכיוון המדרון (מפנה). מדרון צפוני מקבל פחות קרינה ישירה, ולכן הצומח בו לרוב צפוף וגבוה יותר. מדרון דרומי חשוף לשמש — הצומח בו נמוך ודליל יותר.
              </span>
            </li>
            <li>
              <span>
                <strong className="text-fg">המסלע והקרקע</strong> — גיר קשה עשוי לתמוך בחורש; מסלע רך מתבטא לרוב במעט עשבים ושיחים נמוכים; קרקע עמוקה — בעשבים וקוצים.
              </span>
            </li>
            <li>
              <span>
                <strong className="text-fg">האקלים</strong> — כמות הגשם והטמפרטורות.
              </span>
            </li>
            <li>
              <span>
                <strong className="text-fg">פעילות האדם</strong> — כריתה, רעייה, נטיעה ועיבוד.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Screen 4: quick check ── */}
      <div className={SECTION_TITLE}>בדיקה מהירה</div>

      <SortQuiz
        title="טבעית או מלאכותית?"
        prompt="לכל סוג תכסית — בחרו אם הוא נוצר בטבע או בידי האדם."
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
        <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl pt-1">{title}</h3>
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
