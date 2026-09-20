'use client';

/* ──────────────── ציר זמן — חמש חזיתות (5-station timeline) ────────────────
   מחליף את הגרסה הקודמת של TimePressureExperience (3 סבבים של "חזו ואז
   בדקו" + מפת לחצים). הפעילות החדשה: משתמשים מתקדמים על ציר זמן בן חמש
   תחנות (יום 1 → שנה 2), וכל תחנה מוסיפה חזית אחת לטבלת השוואה קבועה בת
   חמש שורות בין צבא סדיר לשחקן לא-סדיר. כל הטקסטים מגיעים מ-
   TimePressureContent.ts. ראו design/docs/assumptions.md ("Topic-01 …
   rebuilt as a 5-station timeline") למודל המצב המלא.

   דפוס "פאנל פרטים אחד עם crossfade" הושאל מ-ActorTypologySelector
   שבאותו קובץ סצנה (AsymmetricScene.tsx) — כולל מוסכמת סדר ה-DOM ל-RTL:
   ילד ה-DOM הראשון נוחת בימין החזותי (יום 1 → שנה 2 משמאל לימין ב-STATIONS,
   ולכן גם בציר הזמן וגם בטבלה). */

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/Icon';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
import { StatusChip } from '@/components/ui/StatusChip';
import { cn } from '@/lib/utils';
import {
  INSIGHT_PARAGRAPHS,
  INSTRUCTION,
  JUST_ADDED_LABEL,
  NOT_IN_MODEL_LABEL,
  NOT_YET_ADDED_LABEL,
  SOURCE_QUESTION,
  STATIONS,
  TABLE_HEADER,
  TIMELINE_NOTE,
  TITLE,
  UI,
  type Station,
  type StationId,
} from './TimePressureContent';

export function TimePressureExperience() {
  const uid = useId();
  const reduce = !!useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [viewedFrontId, setViewedFrontId] = useState<StationId | null>(null);
  const [insightOpen, setInsightOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);

  const current = STATIONS[currentIndex];
  const viewedIndex = viewedFrontId ? STATIONS.findIndex((s) => s.id === viewedFrontId) : -1;
  const viewingPrevious = viewedIndex >= 0 && viewedIndex < currentIndex;
  const panelStation: Station = viewedIndex >= 0 ? STATIONS[viewedIndex] : current;
  const panelText = viewedFrontId === null ? current.stationText : panelStation.frontDetail;

  const goTo = (index: 0 | 1 | 2 | 3 | 4) => {
    setCurrentIndex(index);
    setViewedFrontId(null);
    setAnnouncement(UI.liveUpdate(STATIONS[index], index + 1));
  };

  const viewFront = (id: StationId) => setViewedFrontId(id);
  const backToAdded = () => setViewedFrontId(null);

  // Preload the next station's image so the crossfade never waits on network.
  useEffect(() => {
    const next = STATIONS[currentIndex + 1];
    if (!next) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = next.image.src;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [currentIndex]);

  const panelKey = `${current.id}-${viewedFrontId ?? 'default'}`;
  const fadeTransition = reduce ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' as const };

  return (
    <div className="mt-12">
      {/* כותרת + הנחיה — מבנה סעיף 1 */}
      <div className="mb-5">
        <h3 className="font-display text-2xl font-bold leading-tight text-black sm:text-3xl">
          {TITLE}
          <span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-accent" />
        </h3>
        <p className="mt-2 text-base leading-relaxed text-fg-muted">{INSTRUCTION}</p>
      </div>

      {/* עדכון נגיש קצר — לא מקריא מחדש את הטבלה */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* ציר זמן — סעיף 2: חמש תחנות, יום 1 מימין (ראשון ב-DOM) לשנה 2 משמאל */}
      <Timeline current={currentIndex} onSelect={goTo} uid={uid} reduce={reduce} />

      {/* משטח מרכזי אחד — סעיף 3: טקסט מימין, תמונה משמאל */}
      <div className="surface-elevated mt-5 grid gap-0 overflow-hidden md:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col justify-center p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={panelKey}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={fadeTransition}
            >
              {viewingPrevious && (
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <StatusChip tone="neutral">{UI.viewingPrevious(panelStation.frontLabel)}</StatusChip>
                  <button type="button" onClick={backToAdded} className="btn-ghost text-sm">
                    {UI.backToAdded}
                  </button>
                </div>
              )}
              <h4
                ref={panelHeadingRef}
                tabIndex={-1}
                className="font-display text-xl font-bold leading-tight text-black outline-none"
              >
                {panelStation.frontLabel}
              </h4>
              <p className="mt-3 text-base leading-relaxed text-black text-pretty">{panelText}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative min-h-[220px]" style={{ aspectRatio: '3 / 2' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={panelKey}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={fadeTransition}
              className="absolute inset-0"
            >
              <IsometricAsset
                assetId={panelStation.image.assetId}
                src={panelStation.image.src}
                alt={panelStation.image.alt}
                aspect="4/3"
                fit="contain"
                prompt={panelStation.image.prompt}
                className="absolute inset-0 size-full bg-bg-accent [aspect-ratio:auto]"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* הקודם/הבא */}
      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => currentIndex > 0 && goTo((currentIndex - 1) as 0 | 1 | 2 | 3 | 4)}
          disabled={currentIndex === 0}
          className={cn('btn-secondary', currentIndex === 0 && 'cursor-not-allowed opacity-45')}
        >
          {UI.prev}
        </button>
        <button
          type="button"
          onClick={() => currentIndex < 4 && goTo((currentIndex + 1) as 0 | 1 | 2 | 3 | 4)}
          disabled={currentIndex === 4}
          className={cn('btn-primary', currentIndex === 4 && 'cursor-not-allowed opacity-45')}
        >
          {UI.next}
          <Icon name="arrow-left" size={18} strokeWidth={2} />
        </button>
      </div>

      {/* טבלת השוואה — סעיף 4 */}
      <ComparisonTable currentIndex={currentIndex} viewedFrontId={viewedFrontId} onViewFront={viewFront} />

      {/* שורת סיכום — סעיף 5 */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusChip tone="accent">{UI.regularSummary(currentIndex + 1)}</StatusChip>
        <StatusChip tone="neutral">{UI.irregularSummary}</StatusChip>
        <span className="text-sm text-fg-muted">{UI.summaryTag}</span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-fg-muted text-pretty">{TIMELINE_NOTE}</p>

      {/* "מה המשמעות?" — סעיף 6, לא מותנה */}
      <InsightDisclosure open={insightOpen} onToggle={() => setInsightOpen((o) => !o)} uid={uid} />
    </div>
  );
}

/* ───────────────────────────────── Timeline ─────────────────────────────────
   חמשת כפתורי התחנה עצמם הם החלופה המלאה לגרירה (קריטריון a11y, לפי תדריך
   המשימה) — האגודל הנגרר הוא שיפור פרוגרסיבי בלבד, לעכבר/מגע, ולכן aria-hidden
   ומחוץ לסדר ה-Tab. מיקומו נמדד עם getBoundingClientRect() האמיתי של כל
   כפתור (לא חשבון שברים) כדי לא "להיאבק" ידנית בפריסת RTL — ולכן העוגן שלו
   חייב לחיות באותה מערכת קואורדינטות פיזית (viewport) שממנה המדידות הגיעו;
   ראו ההערה על ה-style המוחלט למטה.

   האגודל יושב במסלול צר משלו *מתחת* לשורת הכפתורים (לא עליה/דרכה) —
   באופן מכוון, לא רק קוסמטי: כשהאגודל חופף גיאומטרית לתיבת-לחיצה של כפתור
   (וזה קורה תמיד לתחנה הנוכחית, כי הוא תמיד נח שם), z-index גבוה יותר עליו
   מספיק כדי ש-Playwright/דפדפן יראו אותו כ"מיירט" את הקליק ולחסום את
   הכפתור מתחתיו — נבדק ישירות ותועד. הפרדה אנכית מלאה מבטלת את הבעיה
   מבנית, בלי תלות ב-z-index. */

const TIMELINE_THUMB_SIZE = 16; // px, תואם size-4

function Timeline({
  current,
  onSelect,
  uid,
  reduce,
}: {
  current: 0 | 1 | 2 | 3 | 4;
  onSelect: (index: 0 | 1 | 2 | 3 | 4) => void;
  uid: string;
  reduce: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const thumbX = useMotionValue(0);
  const [centers, setCenters] = useState<number[]>([]);
  const didMountRef = useRef(false);

  useLayoutEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const trackRect = track.getBoundingClientRect();
      setCenters(
        buttonRefs.current.map((btn) => {
          if (!btn) return 0;
          const r = btn.getBoundingClientRect();
          return r.left + r.width / 2 - trackRect.left;
        }),
      );
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // מיישר את האגודל למיקום המדוד של `current` בכל שינוי — קפיצה מיידית
  // בעליית הרכיב (כדי לא להחליק מ-0), אנימציה בכל שינוי תחנה אחר-כך.
  useEffect(() => {
    if (centers.length !== 5) return;
    const target = centers[current] - TIMELINE_THUMB_SIZE / 2;
    if (!didMountRef.current) {
      thumbX.set(target);
      didMountRef.current = true;
      return;
    }
    const controls = animate(
      thumbX,
      target,
      reduce ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
    );
    return () => controls.stop();
  }, [current, centers, reduce, thumbX]);

  const handleDragEnd = () => {
    if (centers.length !== 5) return;
    const releasedCenter = thumbX.get() + TIMELINE_THUMB_SIZE / 2;
    let nearest: 0 | 1 | 2 | 3 | 4 = 0;
    let nearestDistance = Infinity;
    centers.forEach((center, i) => {
      const distance = Math.abs(center - releasedCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = i as 0 | 1 | 2 | 3 | 4;
      }
    });
    onSelect(nearest);
  };

  const dragConstraints = useMemo(
    () =>
      centers.length === 5
        ? { left: centers[0] - TIMELINE_THUMB_SIZE / 2, right: centers[4] - TIMELINE_THUMB_SIZE / 2 }
        : { left: 0, right: 0 },
    [centers],
  );

  return (
    <div ref={trackRef} className="relative mt-5">
      <div className="flex items-stretch justify-between gap-2">
        {STATIONS.map((station, i) => {
          const index = i as 0 | 1 | 2 | 3 | 4;
          const isCurrent = index === current;
          return (
            <button
              key={station.id}
              id={`${uid}-timeline-${station.id}`}
              ref={(el) => {
                buttonRefs.current[i] = el;
              }}
              type="button"
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => onSelect(index)}
              className={cn(
                'flex-1 rounded-xl border px-2 py-2.5 text-center transition-colors duration-200 ease-snap',
                isCurrent ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:bg-bg-accent',
              )}
            >
              <span
                className={cn(
                  'font-display text-sm font-bold leading-none',
                  isCurrent ? 'text-accent' : 'text-black',
                )}
              >
                {station.timeLabel}
              </span>
            </button>
          );
        })}
      </div>
      {/* מסלול האגודל: שורה נפרדת מתחת לכפתורים (לא חופפת אותם אנכית בכלל)
          — ראו ההערה מעל הפונקציה. `left: 0` + היסט `x` הנמדד פיזית
          (getBoundingClientRect) הם עוגן פיזי מכוון, לא start-0 לוגי, כי אז
          המערכת הייתה מתחילה בקצה הנגדי תחת RTL והחשבון היה נשבר. אותו
          עיקרון פיזי-במכוון כמו קואורדינטות תוויות הצמתים ב-PressureMap
          הישן (לא תוכן, מדידת פיקסלים אמיתית). */}
      <div className="relative mt-2 h-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-border-strong/60"
        />
        <motion.div
          aria-hidden
          drag="x"
          dragConstraints={dragConstraints}
          dragElastic={0.15}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={{ left: 0, x: thumbX }}
          className="absolute top-0 size-4 touch-none rounded-full border-2 border-accent bg-bg-elevated shadow-elevated cursor-grab active:cursor-grabbing"
        />
      </div>
    </div>
  );
}

/* ───────────────────────────── ComparisonTable ─────────────────────────────
   מוסכמת הרשת (grid grid-cols-3, שורת-תווית ברקע bg-bg-accent, מפרידי
   border-s) מועתקת מ-TypologyTable/TypologyTableHeader באותו קובץ סצנה —
   הטבלה הקודמת היחידה בטופיק הזה. */

function RegularStatusCell({ i, currentIndex }: { i: number; currentIndex: number }) {
  if (i > currentIndex) return <StatusChip tone="dim">{NOT_YET_ADDED_LABEL}</StatusChip>;
  if (i === currentIndex) return <StatusChip tone="accent">{JUST_ADDED_LABEL}</StatusChip>;
  return (
    <StatusChip tone="neutral" icon={<Icon name="check" size={12} strokeWidth={3} />}>
      {STATIONS[i].frontLabel}
    </StatusChip>
  );
}

function ComparisonTable({
  currentIndex,
  viewedFrontId,
  onViewFront,
}: {
  currentIndex: 0 | 1 | 2 | 3 | 4;
  viewedFrontId: StationId | null;
  onViewFront: (id: StationId) => void;
}) {
  return (
    <div className="surface-elevated mt-5 overflow-hidden">
      <div className="border-b border-border-subtle p-4 sm:p-5">
        <h4 className="font-display text-lg font-bold leading-tight text-black sm:text-xl">
          {SOURCE_QUESTION}
        </h4>
      </div>

      <div className="grid grid-cols-3 border-b border-border-strong bg-bg-accent">
        <div className="flex items-center p-3 sm:p-4">
          <span className="font-display text-base font-bold tracking-wider text-black">
            {TABLE_HEADER.front}
          </span>
        </div>
        <div className="flex items-center border-s border-border-subtle p-3 sm:p-4">
          <span className="font-display text-base font-bold tracking-wider text-black">
            {TABLE_HEADER.regular}
          </span>
        </div>
        <div className="flex items-center border-s border-border-subtle p-3 sm:p-4">
          <span className="font-display text-base font-bold tracking-wider text-black">
            {TABLE_HEADER.irregular}
          </span>
        </div>
      </div>

      {STATIONS.map((station, i) => {
        const reached = i <= currentIndex;
        return (
          <div key={station.id} className="grid grid-cols-3 border-b border-border-subtle last:border-b-0">
            <div className="flex items-center p-3 sm:p-4">
              {reached ? (
                <button
                  type="button"
                  onClick={() => onViewFront(station.id)}
                  aria-pressed={viewedFrontId === station.id}
                  className={cn(
                    'rounded-sm text-start font-display text-base font-bold underline-offset-4 hover:underline',
                    viewedFrontId === station.id ? 'text-accent' : 'text-black',
                  )}
                >
                  {station.frontLabel}
                </button>
              ) : (
                <span className="font-display text-base font-bold text-fg-dim">{station.frontLabel}</span>
              )}
            </div>
            <div className="flex items-center border-s border-border-subtle p-3 sm:p-4">
              <RegularStatusCell i={i} currentIndex={currentIndex} />
            </div>
            <div className="flex items-center border-s border-border-subtle p-3 sm:p-4">
              {i === 0 ? (
                <RegularStatusCell i={0} currentIndex={currentIndex} />
              ) : (
                <StatusChip tone="dim">{NOT_IN_MODEL_LABEL}</StatusChip>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── InsightDisclosure ─────────────────────────────
   גילוי פשוט, זמין תמיד — לא מותנה בשום אינטראקציה קודמת. */

function InsightDisclosure({
  open,
  onToggle,
  uid,
}: {
  open: boolean;
  onToggle: () => void;
  uid: string;
}) {
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${uid}-insight`}
        onClick={onToggle}
        className="btn-secondary mt-5"
      >
        {UI.toggleInsight}
      </button>
      {open && (
        <div id={`${uid}-insight`} className="surface-elevated mt-3 p-5 sm:p-6">
          <h4 className="font-display text-xl font-bold leading-tight text-black">{UI.insightHeading}</h4>
          {INSIGHT_PARAGRAPHS.map((p) => (
            <p key={p} className="mt-3 text-base leading-relaxed text-black text-pretty">
              {p}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
