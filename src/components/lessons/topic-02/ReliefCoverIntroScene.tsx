'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { SortQuiz, type SortItem } from './SortQuiz';
import { ReliefCoverTerrain } from './ReliefCoverTerrain';
import { cn } from '@/lib/utils';

/**
 * תת-נושא „תבליט ותכסית” — הסבר כללי שפותח את רצף לימוד השטח בשיעור 2:
 * תבליט ותכסית ← תבניות נוף (תבליט) ← גיאולוגיה ← תכסית.
 * MVP עיצובי: איור papercut אינטראקטיבי (ReliefCoverTerrain) + בקרות קומפקטיות.
 */

type Layer = 'relief' | 'cover';
type Origin = 'natural' | 'artificial';
type Feature = {
  id: string;
  label: string;
  layer: Layer;
  origin?: Origin;
  desc: string;
};

const FEATURES: Feature[] = [
  { id: 'hill',    label: 'כיפה',   layer: 'relief', desc: 'התרוממות בולטת של פני הקרקע מעל סביבתה.' },
  { id: 'saddle',  label: 'אוכף',   layer: 'relief', desc: 'השקע הנמוך שעל קו הרכס, בין שתי כיפות סמוכות.' },
  { id: 'slope',   label: 'מדרון',  layer: 'relief', desc: 'הצלע המשופעת של ההר — בין הפסגה לשטח הנמוך.' },
  { id: 'valley',  label: 'גיא',    layer: 'relief', desc: 'שטח נמוך בין שני שטחים גבוהים. לשם מתנקזים המים בזמן גשם.' },
  { id: 'plain',   label: 'מישור',  layer: 'relief', desc: 'שטח שטוח כמעט ללא הפרשי גובה.' },
  { id: 'grove',   label: 'חורש',   layer: 'cover', origin: 'natural',    desc: 'עצים ושיחים שגדלו על המדרון באופן טבעי, בפיזור לא סדור.' },
  { id: 'shrubs',  label: 'שיחים',  layer: 'cover', origin: 'natural',    desc: 'צומח נמוך שגדל באופן טבעי בין הסלעים.' },
  { id: 'houses',  label: 'בתים',   layer: 'cover', origin: 'artificial', desc: 'מבנים שהאדם בנה על הקרקע — חלק מיישוב.' },
  { id: 'orchard', label: 'מטע',    layer: 'cover', origin: 'artificial', desc: 'עצים שהאדם נטע בשורות ובמרווחים קבועים. זה צומח — אבל נטוע בידי אדם.' },
  { id: 'road',    label: 'כביש',   layer: 'cover', origin: 'artificial', desc: 'דרך שהאדם סלל על פני הקרקע.' },
  { id: 'power',   label: 'קו מתח', layer: 'cover', origin: 'artificial', desc: 'עמודים וכבלי חשמל — תשתית שהאדם הקים.' },
];

const LAYER_LABEL: Record<Layer, string> = { relief: 'תבליט', cover: 'תכסית' };
const ORIGIN_LABEL: Record<Origin, string> = { natural: 'טבעית', artificial: 'מלאכותית' };
const FEATURE_LABELS = Object.fromEntries(FEATURES.map((f) => [f.id, f.label])) as Record<string, string>;

/** Layer colour cue — the illustration's legend key (sand = relief, sage = cover). */
const LAYER_SWATCH: Record<Layer, string> = { relief: 'bg-terrain-sand', cover: 'bg-brand' };
/** Result inset tint = the selected feature's legend colour (cleanup spec §1 result role). */
const RESULT_TINT: Record<Layer, string> = { relief: 'bg-terrain-sand/20', cover: 'bg-brand/10' };

const QUIZ_ITEMS: SortItem<Layer>[] = [
  { id: 'q-hill',    label: 'גבעה',       answer: 'relief', why: 'גבעה היא צורה של הקרקע עצמה — התרוממות של פני השטח.' },
  { id: 'q-grove',   label: 'חורש',       answer: 'cover',  why: 'עצים ושיחים שגדלים על הקרקע — תכסית טבעית.' },
  { id: 'q-house',   label: 'בית',        answer: 'cover',  why: 'מבנה שהאדם בנה על הקרקע — תכסית מלאכותית.' },
  { id: 'q-valley',  label: 'עמק',        answer: 'relief', why: 'עמק הוא שטח נמוך בין שטחים גבוהים — צורה של הקרקע.' },
  { id: 'q-road',    label: 'כביש',       answer: 'cover',  why: 'דרך שהאדם סלל על פני הקרקע — תכסית מלאכותית.' },
  { id: 'q-slope',   label: 'מדרון',      answer: 'relief', why: 'מדרון הוא הצלע המשופעת של ההר — צורה של הקרקע.' },
  { id: 'q-olives',  label: 'מטע זיתים',  answer: 'cover',  why: 'עצים שהאדם נטע על הקרקע — תכסית מלאכותית, אף שמדובר בצומח.' },
  { id: 'q-saddle',  label: 'אוכף',       answer: 'relief', why: 'אוכף הוא השקע שבין שתי כיפות על קו הרכס — צורה של הקרקע.' },
];

const COMPARE_ROWS: { label: string; relief: string; cover: string }[] = [
  { label: 'מה זה?',            relief: 'הצורה של הקרקע עצמה — איפה היא עולה ואיפה היא יורדת.', cover: 'כל מה שנמצא על פני הקרקע ומכסה אותה.' },
  { label: 'דוגמאות',           relief: 'כיפה, שלוחה, גיא, אוכף, מכתש, מדרון, מישור.',          cover: 'עצים, שיחים ועשב · בתים, כבישים, שדות, מטעים, גדרות וקווי חשמל.' },
  { label: 'איך מחלקים?',       relief: 'לתבניות נוף — צורות יסוד שחוזרות בכל שטח.',            cover: 'לפי המקור: טבעית או מלאכותית. לפי הסוג: צומח, פעילות האדם ותשתיות.' },
  { label: 'כמה מהר משתנה?',    relief: 'לאט מאוד — בתהליכים טבעיים שנמשכים אלפי שנים ויותר. שינוי מהיר נגרם בעיקר מעבודות הנדסה, כמו חציבה ומילוי.', cover: 'מהר — הצומח משתנה עם העונות, ושדות, בתים וכבישים נוספים או נעלמים בתוך שנים ספורות.' },
  { label: 'איך מופיע במפה?',   relief: 'בעיקר בקווי גובה.',                                      cover: 'בסמלים ובצבעים מוסכמים, שמוסברים במקרא המפה.' },
];

const NEXT_STEPS = [
  { n: 1, title: 'תבניות נוף',  text: 'צורות היסוד של התבליט: כיפה, שלוחה, גיא, אוכף ומכתש.' },
  { n: 2, title: 'גיאולוגיה',   text: 'סוגי הסלעים שמתחת לקרקע, והכוחות שמעצבים את פני השטח.' },
  { n: 3, title: 'תכסית',       text: 'מה נמצא על הקרקע: צומח, פעילות האדם ותשתיות.' },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/** T1 section title (cleanup spec §3) — replaces the labelled SoftDividers. */
const SECTION_TITLE = 'mt-12 mb-5 font-display text-2xl font-bold leading-tight text-fg sm:text-3xl';

export function ReliefCoverIntroScene() {
  const [showRelief, setShowRelief] = useState(true);
  const [showCover, setShowCover] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const visible = (layer: Layer) => (layer === 'relief' ? showRelief : showCover);
  const selected = FEATURES.find((f) => f.id === selectedId && visible(f.layer)) ?? null;

  const toggleLayer = (layer: Layer) => {
    if (layer === 'relief') setShowRelief((v) => !v);
    else setShowCover((v) => !v);
  };
  /** Clicking the active feature again steps back to the overview. */
  const selectFeature = (id: string | null) => setSelectedId((cur) => (id === null || cur === id ? null : id));

  return (
    <section id="scene-relief-cover" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SceneHeader
        title={
          <>
            מה יש בשטח? <span className="gradient-text">תבליט ותכסית</span>
          </>
        }
        intro="כל שטח — במציאות או על המפה — בנוי משתי שכבות: הקרקע עצמה, וכל מה שנמצא עליה. את השכבה הראשונה מכנים תבליט, ואת השנייה — תכסית."
      />

      {/* ── Screen 1: the two definitions — one flat info card, so the
           interactive workspace below is the first strong surface ── */}
      <div className="surface p-5 sm:p-6">
        <div className="grid md:grid-cols-2 gap-6 md:gap-10">
          <DefinitionCard layer="relief" term="תבליט" lead="מבנה פני הקרקע.">
            התבליט הוא הצורה של השטח: איפה הקרקע עולה ואיפה היא יורדת. הרים וגבעות, עמקים ומדרונות, מישורים ושקעים — כולם תבליט.
            את התבליט מתארים באמצעות <strong className="text-fg">תבניות נוף</strong>: צורות יסוד שחוזרות בכל שטח.
          </DefinitionCard>
          <DefinitionCard layer="cover" term="תכסית" lead="כל מה שנמצא על הקרקע.">
            התכסית היא כל מה שמכסה את פני הקרקע. היא יכולה להיות <strong className="text-fg">טבעית</strong> — עצים, שיחים ועשב —
            או <strong className="text-fg">מלאכותית</strong>, כזו שהאדם יצר: בתים, כבישים, שדות ומטעים, גדרות וקווי חשמל.
          </DefinitionCard>
        </div>
        <p className="mt-6 rounded-xl bg-bg-accent/60 p-4 text-base text-fg-muted leading-relaxed text-pretty">
          דרך פשוטה לזכור: דמיינו שמסירים מהשטח את כל העצים, הבתים והכבישים. מה שנשאר הוא <strong className="text-fg">התבליט</strong>. כל מה שהסרתם הוא <strong className="text-fg">התכסית</strong>.
        </p>
      </div>

      {/* ── Screen 2: interactive layered terrain — the scene's workspace ── */}
      <h3 className={SECTION_TITLE}>מפרקים את השטח לשכבות</h3>

      <div className="surface-elevated p-5 sm:p-6 grid lg:grid-cols-[20rem_minmax(0,1fr)] gap-6 items-stretch">
        {/* Controls + info (first child → right in RTL) */}
        <div className="flex flex-col gap-5">
          <div className="space-y-5">
            <div>
              <div className="text-sm font-display font-semibold text-fg-muted mb-2.5">
                הדליקו וכבו כל שכבה
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['relief', 'cover'] as Layer[]).map((layer) => (
                  <LayerToggle key={layer} layer={layer} on={visible(layer)} onToggle={() => toggleLayer(layer)}>
                    שכבת {LAYER_LABEL[layer]}
                  </LayerToggle>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-display font-semibold text-fg-muted">
                לחצו על רכיב — באיור או כאן
              </div>
              {(['relief', 'cover'] as Layer[]).map((layer) => (
                <div key={layer} className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      'mt-[7px] inline-flex items-center gap-1.5 w-14 shrink-0 text-sm font-display font-semibold transition-opacity',
                      visible(layer) ? 'text-fg-muted' : 'text-fg-dim opacity-60',
                    )}
                  >
                    <span aria-hidden className={cn('size-2 rounded-full', LAYER_SWATCH[layer])} />
                    {LAYER_LABEL[layer]}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {FEATURES.filter((f) => f.layer === layer).map((f) => {
                      const isSel = selected?.id === f.id;
                      const off = !visible(layer);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          disabled={off}
                          aria-pressed={isSel}
                          onClick={() => selectFeature(f.id)}
                          onMouseEnter={() => setHoverId(f.id)}
                          onMouseLeave={() => setHoverId(null)}
                          onFocus={() => setHoverId(f.id)}
                          onBlur={() => setHoverId(null)}
                          className={cn(
                            'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-display font-semibold text-fg',
                            'transition-colors duration-200 ease-snap focus-visible:ring-offset-bg-elevated',
                            isSel
                              ? 'border-accent bg-accent/10'
                              : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03] cursor-pointer',
                            off && 'opacity-40 cursor-not-allowed hover:border-border hover:bg-bg-elevated',
                          )}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div aria-live="polite" className="flex-1 flex flex-col">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selected?.id ?? 'empty'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="flex-1 flex flex-col"
              >
                {selected ? (
                  <div className={cn('rounded-xl p-4 flex-1 min-h-[140px]', RESULT_TINT[selected.layer])}>
                    <div className="mb-2">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl">{selected.label}</h3>
                        <span className="inline-flex items-center gap-1.5 text-sm font-display font-semibold text-fg-muted">
                          <span aria-hidden className={cn('size-2 rounded-full', LAYER_SWATCH[selected.layer])} />
                          {LAYER_LABEL[selected.layer]}
                        </span>
                      </div>
                      {/* origin on its own line — inline beside the layer key it read as „תכסית תכסית …” */}
                      {selected.origin && (
                        <div className="mt-0.5 text-sm text-fg-muted">
                          תכסית {ORIGIN_LABEL[selected.origin]}
                        </div>
                      )}
                    </div>
                    <p className="text-base text-fg leading-relaxed">{selected.desc}</p>
                  </div>
                ) : (
                  <div className="flex-1 min-h-[140px]">
                    <p className="text-sm text-fg-muted leading-relaxed">
                      בחרו רכיב כדי לגלות אם הוא חלק מהתבליט או מהתכסית. נסו לכבות את שכבת התכסית — ותראו את הקרקע „החשופה”.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Illustration — the focal point */}
        <figure className="flex flex-col min-w-0">
          <div className="rounded-xl overflow-hidden border border-border-subtle bg-paper-card">
            <ReliefCoverTerrain
              showRelief={showRelief}
              showCover={showCover}
              selectedId={selected?.id ?? null}
              hoverId={hoverId}
              labels={FEATURE_LABELS}
              onSelect={selectFeature}
              onHover={setHoverId}
            />
          </div>
          <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="flex items-center gap-3" aria-hidden>
              {(['relief', 'cover'] as Layer[]).map((layer) => (
                <span
                  key={layer}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-sm font-display font-semibold transition-opacity duration-300',
                    visible(layer) ? 'text-fg-muted' : 'text-fg-dim opacity-50',
                  )}
                >
                  <span className={cn('size-2.5 rounded-full', LAYER_SWATCH[layer])} />
                  {LAYER_LABEL[layer]}
                </span>
              ))}
            </span>
            <span className="text-sm text-fg-muted leading-snug">
              חתך צד של שטח לדוגמה · האיור סכמטי ואינו בקנה מידה
            </span>
          </figcaption>
        </figure>
      </div>

      {/* ── Screen 3: side-by-side comparison (static info → flat card) ── */}
      <h3 className={SECTION_TITLE}>תבליט מול תכסית</h3>

      <div className="surface overflow-hidden">
        <div className="grid grid-cols-[minmax(7rem,0.6fr)_1fr_1fr] text-sm">
          <div className="p-3.5 bg-bg-accent/60 border-b border-border-subtle" />
          <CompareHead layer="relief">תבליט</CompareHead>
          <CompareHead layer="cover">תכסית</CompareHead>
          {COMPARE_ROWS.map((row, i) => (
            <div key={row.label} className="contents">
              <div className={cn('px-4 py-3.5 font-display font-semibold text-fg', i > 0 && 'border-t border-border-subtle')}>{row.label}</div>
              <div className={cn('px-4 py-3.5 text-fg-muted leading-relaxed', i > 0 && 'border-t border-border-subtle')}>{row.relief}</div>
              <div className={cn('px-4 py-3.5 text-fg-muted leading-relaxed', i > 0 && 'border-t border-border-subtle')}>{row.cover}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Screen 4: quick check ── */}
      <h3 className={SECTION_TITLE}>בדיקה מהירה</h3>

      <SortQuiz
        title="תבליט או תכסית?"
        prompt="לכל רכיב — בחרו לאיזו שכבה הוא שייך."
        options={[
          { id: 'relief', label: 'תבליט' },
          { id: 'cover', label: 'תכסית' },
        ]}
        items={QUIZ_ITEMS}
      />

      {/* ── Roadmap for the rest of the terrain block (static → one flat card) ── */}
      <h3 className={SECTION_TITLE}>איך נמשיך</h3>

      <ol className="surface p-5 sm:p-6 grid md:grid-cols-3 gap-6">
        {NEXT_STEPS.map((s) => (
          <li key={s.n} className="flex items-start gap-3">
            <span className="font-display text-lg font-bold leading-6 text-fg-muted tabular-nums shrink-0">
              {s.n}
            </span>
            <div>
              <div className="text-base font-display font-bold leading-6 text-fg">{s.title}</div>
              <div className="text-sm text-fg-muted leading-relaxed mt-1">{s.text}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function LayerToggle({
  layer,
  on,
  onToggle,
  children,
}: {
  layer: Layer;
  on: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={cn(
        'rounded-xl border ps-3 pe-2.5 py-2.5 font-display font-bold text-sm whitespace-nowrap transition-colors duration-200 ease-snap cursor-pointer',
        'flex items-center justify-between gap-2 focus-visible:ring-offset-bg-elevated',
        on
          ? layer === 'relief'
            ? 'border-terrain-sand/70 bg-terrain-sand/10 text-fg'
            : 'border-brand/60 bg-brand/10 text-fg'
          : 'border-border bg-bg-elevated text-fg-muted hover:border-brand/30 hover:bg-brand/[0.03]',
      )}
    >
      <span>{children}</span>
      {/* switch: knob travels to the inline-end when on */}
      <span
        aria-hidden
        className={cn(
          'relative flex h-[18px] w-8 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200',
          on ? (layer === 'relief' ? 'bg-terrain-sand justify-end' : 'bg-brand justify-end') : 'bg-fg-dim/25 justify-start',
        )}
      >
        <motion.span layout transition={{ duration: 0.2, ease: EASE }} className="size-3.5 rounded-full bg-white shadow-sm" />
      </span>
    </button>
  );
}

function CompareHead({ layer, children }: { layer: Layer; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3.5 bg-bg-accent/60 border-b border-border-subtle font-display font-bold text-base text-fg flex items-center gap-2">
      <span aria-hidden className={cn('size-2.5 rounded-full', LAYER_SWATCH[layer])} />
      {children}
    </div>
  );
}

/** One definition column inside the opening info card — plain text, no frame.
 *  The dot introduces the legend key (sand = relief, sage = cover) reused by the workspace, table and result. */
function DefinitionCard({
  layer,
  term,
  lead,
  children,
}: {
  layer: Layer;
  term: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <article>
      <h3 className="flex items-center gap-2 font-display text-lg font-bold leading-snug text-fg md:text-xl">
        <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', LAYER_SWATCH[layer])} />
        {term}
      </h3>
      <div className="mt-1 text-base font-display font-bold text-fg">{lead}</div>
      <p className="mt-2 text-base text-fg-muted leading-relaxed text-pretty">{children}</p>
    </article>
  );
}
