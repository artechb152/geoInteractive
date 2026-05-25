// Make every OnboardingScene fit in one viewport with the diagram fully
// visible AND its bottom edge aligned with the accordion column's bottom.
//
// Pattern across all 12 files:
//   - grid `items-start` makes the diagram column shrink to its content
//     height while the accordion stretches further → bottom misalignment
//     + the page becomes scrollable.
//   - The diagram wrapper is `sticky top-6` which causes the top to
//     scroll out of view when the accordion is taller than the viewport.
//   - The TerrainStage is locked to `aspect-[4/3]` with the SVG using
//     `preserveAspectRatio="none"`, so the diagram both refuses to
//     shrink and gets visually distorted if the box is reshaped.
//
// Fixes applied:
//   1. Drop `items-start` → grid items stretch to row height by
//      default, so the diagram card matches the accordion height and
//      both bottom-align.
//   2. Drop `sticky top-6` and add `min-h-[280px]` so the card has a
//      sensible floor and never gets "stuck" partially off-screen.
//   3. Replace TerrainStage's `aspect-[4/3]` wrapper with
//      `relative w-full h-full` so the SVG fills whatever the card
//      offers (height now comes from the grid row).
//   4. Switch the SVG's `preserveAspectRatio` to `xMidYMid meet`, so
//      the diagram is shown in full inside the card with letterboxing
//      when proportions don't match — never cropped, never distorted.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const lessonsDir = path.join(root, 'src', 'components', 'lessons');

const replacements = [
  // 1. grid alignment
  [
    'grid md:grid-cols-[2fr_3fr] gap-6 items-start',
    'grid md:grid-cols-[2fr_3fr] gap-6',
  ],
  [
    'grid lg:grid-cols-[2fr_3fr] gap-6 items-start',
    'grid lg:grid-cols-[2fr_3fr] gap-6',
  ],
  // 2. card wrapper
  [
    'surface-elevated relative overflow-hidden sticky top-6',
    'surface-elevated relative overflow-hidden min-h-[280px]',
  ],
  // 3. TerrainStage wrapper
  [
    'aspect-[4/3] relative',
    'relative w-full h-full',
  ],
  // 4. SVG aspect preservation
  ['preserveAspectRatio="none"', 'preserveAspectRatio="xMidYMid meet"'],
];

let changed = 0;
for (const topic of fs.readdirSync(lessonsDir).filter((d) => d.startsWith('topic-'))) {
  const file = path.join(lessonsDir, topic, 'OnboardingScene.tsx');
  if (!fs.existsSync(file)) continue;

  const orig = fs.readFileSync(file, 'utf8');
  let next = orig;
  for (const [a, b] of replacements) {
    if (next.includes(a)) next = next.split(a).join(b);
  }
  if (next !== orig) {
    fs.writeFileSync(file, next, 'utf8');
    changed++;
    console.log(`  fixed: ${topic}/OnboardingScene.tsx`);
  }
}
console.log(`\n${changed} OnboardingScene file(s) updated.`);
