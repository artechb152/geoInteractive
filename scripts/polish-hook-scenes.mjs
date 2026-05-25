// Polish every HookScene.tsx (12 files):
//
//   1. Remove the 4 stat tiles + their `const STATS = [...]` source data.
//      The opening screen now reads as just: lesson chip → hero
//      headline → subtitle → CTA. No noise.
//
//   2. Emphasise the "שיעור NN · …" chip.
//      Bigger, bolder, slight glow, font-display weight. The chip is
//      now the strongest secondary element on the page so the reader
//      knows immediately which lesson they're in.
//
//   3. Replace the small "לחץ כדי להתחיל" link with a proper accent-
//      coloured primary button (matches the rest of the site), kept
//      centred. Topic-02 had a scroll-indicator bar instead — replaced
//      with the same button for consistency.
//
//   4. The hide-prev/next-on-hook change is handled in
//      src/components/lesson/PagedLearn.tsx (separate edit), not here.
//
// The codemod preserves each lesson's icon name, lesson number, and
// subtitle text that originally lived inside the chip, so no content
// is lost.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const lessonsDir = path.join(root, 'src', 'components', 'lessons');

const topics = fs
  .readdirSync(lessonsDir)
  .filter((d) => d.startsWith('topic-'))
  .sort();

let processed = 0;
for (const topic of topics) {
  const file = path.join(lessonsDir, topic, 'HookScene.tsx');
  if (!fs.existsSync(file)) continue;

  // Normalise to LF so our regexes (which use \n) work regardless of
  // whether git checked the file out as CRLF or LF on Windows.
  let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const origSrc = src;

  // ── 1. Capture chip details for re-emission ───────────────────────
  // The chip wraps either `<div className="chip border-accent/40 …">`
  // (11 lessons) or the same with extra rounded/flex classes (topic-02).
  const chipBlockRe =
    /<div className="chip[^"]*">[\s\S]*?<\/div>/;
  const chipBlock = src.match(chipBlockRe)?.[0];
  if (!chipBlock) {
    console.warn(`  skip:  ${topic} — chip block not found`);
    continue;
  }
  const iconName = chipBlock.match(/<Icon name="([\w-]+)"/)?.[1] ?? 'spark';
  const lessonNum = chipBlock.match(/שיעור\s*(\d+)/)?.[1] ?? '01';
  // The subtitle is the last <span>…</span> before the closing </div>.
  // It may carry its own className.
  const subtitleMatch = chipBlock.match(
    /<span[^>]*>([^<][^<]*?)<\/span>\s*<\/div>/,
  );
  const subtitle = subtitleMatch?.[1] ?? '';

  // ── 2. Remove the STATS const declaration ────────────────────────
  src = src.replace(
    /^const STATS:[\s\S]*?^\];\n+/m,
    '',
  );

  // ── 3. Remove the stats tile grid (the motion.div wrapping
  //       STATS.map). Anchor on `initial="hidden"` which is the
  //       distinctive prop of the STATS wrapper — the outer content
  //       wrapper uses `initial={{ opacity: 0, y: 28 }}` instead, so
  //       this won't accidentally eat the wrapper.
  src = src.replace(
    /\n\s*<motion\.div\s+initial="hidden"[\s\S]*?<\/motion\.div>\s*\)\)\}\s*<\/motion\.div>\n/,
    '\n',
  );

  // ── 4. Replace the chip with the emphasised version ──────────────
  const emphasisedChip = `<div className="inline-flex items-center gap-2.5 mb-10 mx-auto px-4 py-2 rounded-full border border-accent/50 bg-accent/12 shadow-glow w-fit">
          <Icon name="${iconName}" size={16} className="text-accent" />
          <span className="font-display font-bold text-sm text-accent-hover tracking-wider">שיעור ${lessonNum}</span>
          <span className="text-fg-dim text-sm" aria-hidden>·</span>
          <span className="text-sm font-display font-semibold text-fg">${subtitle}</span>
        </div>
`;
  src = src.replace(chipBlockRe, emphasisedChip);

  // ── 5. Replace the bottom click-to-start with a proper CTA button.
  //       Match either: <motion.button …aria-label="התחל את השיעור"
  //       …></motion.button>  OR  topic-02's scroll-indicator block
  //       (which starts with `{/* Scroll Indicator */}`).
  const ctaButton = `<motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="mt-14 flex justify-center"
        >
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('learn:next'))}
            className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-xl bg-accent text-fg font-display font-semibold text-base hover:bg-accent-hover transition-all duration-200 shadow-glow"
            aria-label="התחל את השיעור"
          >
            <span>לחץ כדי להתחיל</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-1" aria-hidden>
              <path d="M11 4l-6 4 6 4" />
            </svg>
          </button>
        </motion.div>
`;

  // Topic-02 uses a "Scroll Indicator" motion.div instead of a button.
  const scrollIndicatorRe =
    /\n\s*\{\/\* Scroll Indicator \*\/\}\n\s*<motion\.div\b[\s\S]*?<\/motion\.div>\n/;
  // Standard motion.button (the other 11 files).
  const motionButtonRe =
    /\n\s*<motion\.button\b[\s\S]*?aria-label="התחל את השיעור"[\s\S]*?<\/motion\.button>\n/;

  if (scrollIndicatorRe.test(src)) {
    src = src.replace(scrollIndicatorRe, '\n        ' + ctaButton);
  } else {
    src = src.replace(motionButtonRe, '\n        ' + ctaButton);
  }

  // ── 6. The STATS type import can stay (Icon is still used for the
  //       chip). If `IconName` type is now unused we leave it — TS
  //       hint-level warning at worst, not an error.

  if (src === origSrc) {
    console.warn(`  skip:  ${topic} — no changes applied`);
    continue;
  }
  fs.writeFileSync(file, src, 'utf8');
  processed++;
  console.log(`  polished: ${topic}/HookScene.tsx`);
}

console.log(`\n${processed} HookScene file(s) updated.`);
