'use client';

import Link from 'next/link';
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { Merriweather, Rubik } from 'next/font/google';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { lessons } from '@/lib/lessons';
import { lessonScenes } from '@/lib/lesson-scenes';
import { useCourseProgress } from '@/lib/course-progress';
import styles from './MapTableHome.module.css';

/* Type matched to the approved concept: the headline is a heavy true italic (Rubik Italic),
   the chapter numbers a sturdy bold-italic serif (Merriweather Italic, narrowed on its wdth axis). */
const headlineFont = Rubik({ subsets: ['hebrew', 'latin'], style: ['italic'], variable: '--font-map-headline', display: 'swap' });
const numeralFont = Merriweather({ subsets: ['latin'], style: ['italic'], axes: ['wdth', 'opsz'], variable: '--font-map-numeral', display: 'swap' });

const ASSETS = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/home/map-table`;
const ARTWORK: Record<string, string> = {
  'topic-02': 'chapter-terrain',
  'topic-02b': 'chapter-cartography',
  'topic-06': 'chapter-navigation',
};
const TITLES: Record<string, string> = {
  'topic-02': 'תבליט, תכסית וטופוגרפיה',
  'topic-02b': 'קרטוגרפיה וקריאת מפות',
  'topic-06': 'ניווטים',
};
const TITLE_LINES: Record<string, [string, string?]> = {
  'topic-02': ['תבליט, תכסית', 'וטופוגרפיה'],
  'topic-02b': ['קרטוגרפיה', 'וקריאת מפות'],
  'topic-06': ['ניווטים'],
};
/** Sub-chapters = the lesson's scenes without its framing scenes (same rule as CoursePlanPanel.toLessonItem). */
const FRAMING_SCENE_IDS = new Set(['hook', 'onboarding', 'recap']);
const subChapters = (id: string) => (lessonScenes[id] ?? []).filter(scene => !FRAMING_SCENE_IDS.has(scene.id)).map(scene => scene.label);

/** Chapters that fit on the sheet at once. Paging controls exist only when more chapters than this are public. */
const VISIBLE = 3;

/* The sheet is rendered for four window shapes; keep in sync with home_map_table_sheets.json and the CSS. */
const SHEETS = [
  { media: '(min-aspect-ratio: 39/20)', key: 'd' },
  { media: '(min-aspect-ratio: 17/10)', key: 'c' },
  { media: '(min-aspect-ratio: 29/20)', key: 'b' },
] as const;

const prefersStill = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function ChapterCard({ lesson, order }: { lesson: (typeof lessons)[number]; order: number }) {
  const title = TITLES[lesson.id] || lesson.shortTitle;
  const lines = TITLE_LINES[lesson.id] || [title];
  const parts = subChapters(lesson.id);
  const partsId = `chapter-${lesson.id}-parts`;
  // Pointer response is added ON TOP of the resting pose (the pose itself lives in CSS).
  const tilt = (event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== 'mouse' || prefersStill()) return;
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - rect.x) / rect.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - rect.y) / rect.height * 2 - 1));
    card.style.setProperty('--tilt-x', `${-y * 4}deg`);
    card.style.setProperty('--tilt-y', `${x * 4}deg`);
    card.style.setProperty('--light-x', `${(x + 1) * 50}%`);
    card.style.setProperty('--light-y', `${(y + 1) * 50}%`);
  };
  const resetTilt = (event: PointerEvent<HTMLAnchorElement>) => {
    for (const property of ['--tilt-x', '--tilt-y', '--light-x', '--light-y']) event.currentTarget.style.removeProperty(property);
  };
  return (
    <Link
      href={`/lessons/${lesson.id}/`}
      className={styles.card}
      data-chapter-id={lesson.id}
      aria-label={`פרק ${lesson.number} — ${title}`}
      aria-describedby={parts.length ? partsId : undefined}
      onPointerMove={tilt}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
      draggable={false}
      style={{ '--i': order } as CSSProperties}
    >
      <img src={`${ASSETS}/${ARTWORK[lesson.id] || 'chapter-terrain'}.webp`} alt="" className={styles.artwork} draggable={false} width={1200} height={1200} />
      <div className={styles.cardCopy}>
        <span className={styles.number} dir="ltr" aria-hidden>{String(lesson.number).padStart(2, '0')}</span>
        <h3 className={styles.cardTitle}>{lines.map((line, index) => <span key={index}>{index > 0 ? ' ' : ''}{line}</span>)}</h3>
      </div>
      {parts.length > 0 && (
        // Revealed on hover and keyboard focus; the whole card stays one link into the chapter.
        <div className={styles.parts} id={partsId} data-chapter-parts>
          <div className={styles.partsHead}>
            <span>בפרק</span>
            <span className={styles.enter}>כניסה לפרק<ArrowLeft aria-hidden /></span>
          </div>
          <ol className={styles.partsList}>
            {parts.map(part => <li key={part}>{part}</li>)}
          </ol>
        </div>
      )}
    </Link>
  );
}

/** All artwork is decorative: navigation and Hebrew copy are real HTML.
    The map sheet fills most of the window; the copy and cards are laid out on the sheet in u
    (see --u in the stylesheet), so everything fits on one screen and never sits on a fold. */
export function MapTableHome() {
  const progress = useCourseProgress();
  const [page, setPage] = useState(0);
  const lampFrame = useRef(0);
  const pageCount = Math.ceil(lessons.length / VISIBLE);
  const paged = pageCount > 1;
  const shown = lessons.slice(page * VISIBLE, page * VISIBLE + VISIBLE);
  const turn = (delta: number) => setPage(current => Math.max(0, Math.min(pageCount - 1, current + delta)));
  const keyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!paged || event.altKey || event.ctrlKey || event.metaKey) return;
    switch (event.key) {
      case 'ArrowLeft': turn(1); break;
      case 'ArrowRight': turn(-1); break;
      case 'Home': setPage(0); break;
      case 'End': setPage(pageCount - 1); break;
      default: return;
    }
    event.preventDefault();
  };
  // a soft desk-lamp highlight follows the mouse across the sheet
  const moveLamp = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || prefersStill()) return;
    const table = event.currentTarget;
    const { clientX, clientY } = event;
    cancelAnimationFrame(lampFrame.current);
    lampFrame.current = requestAnimationFrame(() => {
      const rect = table.getBoundingClientRect();
      table.style.setProperty('--lamp-x', `${clientX - rect.left}px`);
      table.style.setProperty('--lamp-y', `${clientY - rect.top}px`);
      table.dataset.lamp = 'on';
    });
  };
  const leaveLamp = (event: PointerEvent<HTMLElement>) => {
    cancelAnimationFrame(lampFrame.current);
    delete event.currentTarget.dataset.lamp;
  };

  return (
    <main
      className={`${styles.table} ${headlineFont.variable} ${numeralFont.variable}`}
      data-home="map-table"
      onPointerMove={moveLamp}
      onPointerLeave={leaveLamp}
    >
      <img className={styles.felt} src={`${ASSETS}/felt.webp`} alt="" draggable={false} fetchPriority="high" />
      <div className={styles.sheet}>
        <picture className={styles.paper}>
          {SHEETS.map(sheet => <source key={sheet.key} media={sheet.media} srcSet={`${ASSETS}/sheet-${sheet.key}.webp`} />)}
          <img src={`${ASSETS}/sheet-a.webp`} alt="" draggable={false} fetchPriority="high" />
        </picture>
        <div className={styles.lamp} aria-hidden />
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="גיאוגרפיה צבאית — עמוד הבית">
            <svg aria-hidden viewBox="0 0 104 36" className={styles.emblem} fill="currentColor">
              <path d="M0 35 25 4l17 21-5 1L25 11 6 35Z" />
              <path d="M30 26 61 1l43 34h-8L61 9 37 28Z" />
              <path d="M44 22 61 9l-2 6-12 9Z" opacity=".55" />
            </svg>
            <span className={styles.brandTitle}>גיאוגרפיה צבאית</span>
          </Link>
          <Link href={progress.continueHref} className={styles.continue} data-continue aria-label="המשך ללמוד">
            <span>המשך ללמוד</span>
          </Link>
        </header>

        <div className={styles.hero}>
          <h1>כל מסע מתחיל<br />בקריאת השטח.</h1>
        </div>

        <section
          id="syllabus"
          className={styles.chapters}
          aria-labelledby="home-chapters-title"
          aria-roledescription={paged ? 'קרוסלה' : undefined}
          onKeyDown={keyDown}
        >
          <h2 id="home-chapters-title" className={styles.sectionTitle}>פרקי הקורס</h2>
          <div className={styles.track} data-chapter-track>
            {shown.map((lesson, slot) => (
              <div key={lesson.id} className={styles.cardSlot} data-slot={slot}>
                <ChapterCard lesson={lesson} order={slot} />
              </div>
            ))}
          </div>
          {paged && (
            <nav className={styles.controls} aria-label="דפדוף בין פרקי הקורס">
              <button type="button" className={styles.arrow} aria-label="הפרקים הקודמים" disabled={page === 0} onClick={() => turn(-1)}><ChevronRight aria-hidden /></button>
              <div className={styles.dots}>
                {Array.from({ length: pageCount }, (_, index) => (
                  <button key={index} type="button" className={styles.dot} aria-label={`עמוד פרקים ${index + 1}`} aria-pressed={index === page} onClick={() => setPage(index)} />
                ))}
              </div>
              <button type="button" className={styles.arrow} aria-label="הפרקים הבאים" disabled={page === pageCount - 1} onClick={() => turn(1)}><ChevronLeft aria-hidden /></button>
              <p className={styles.srOnly} role="status" aria-live="polite">עמוד {page + 1} מתוך {pageCount}</p>
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}
