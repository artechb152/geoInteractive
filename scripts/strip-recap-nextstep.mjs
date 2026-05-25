// Remove the bottom "השלב הבא · תרגול אינטראקטיבי / או · בדיקת ידע" card
// pair from every RecapScene. That used to live in a per-file
// `NextStepCard()` helper, called as `<NextStepCard />` at the end of
// the scene's JSX.
//
// The new model: PagedLearn shows a single "השיעור הבא" link in the
// recap's bottom prev/next slot (consuming LessonNavContext), so the
// NextStepCard pair is redundant.
//
// What this codemod does to each RecapScene.tsx (12 files):
//   1. Remove the `<NextStepCard />` JSX call at the bottom of the
//      main scene return.
//   2. Remove the `function NextStepCard() { … }` declaration entirely.
//
// We deliberately do NOT touch imports — `Icon`, `motion` etc. are
// still used by CompletionBanner above; any leftover unused-import
// warnings are at TS hint level.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const lessonsDir = path.join(root, 'src', 'components', 'lessons');

let changed = 0;
for (const topic of fs.readdirSync(lessonsDir).filter((d) => d.startsWith('topic-'))) {
  const file = path.join(lessonsDir, topic, 'RecapScene.tsx');
  if (!fs.existsSync(file)) continue;

  // Normalise line endings so the regexes are CRLF-tolerant.
  let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const orig = src;

  // 1. Remove `<NextStepCard />` (the JSX call, on its own line).
  src = src.replace(/\n\s*<NextStepCard\s*\/>\n/, '\n');

  // 2. Remove `function NextStepCard() { … }`. The function is at the
  //    top level of the module, so its closing `}` is at column 0 —
  //    we match a leading newline + the function header, then lazy
  //    everything, then a column-0 `}` followed by an optional newline.
  src = src.replace(
    /\n+function NextStepCard\(\)\s*\{[\s\S]*?^\}\n?/m,
    '\n',
  );

  if (src !== orig) {
    fs.writeFileSync(file, src, 'utf8');
    changed++;
    console.log(`  stripped: ${topic}/RecapScene.tsx`);
  }
}
console.log(`\n${changed} RecapScene file(s) updated.`);
