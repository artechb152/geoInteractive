// Strip hover effects from the TERMS-grid cards in every RecapScene.
// Leave the NextStepCard navigation links untouched (they are anchor
// elements and should remain interactive).
// Also remove the now-misleading "רחף כדי לראות..." instruction from
// the scene intro text.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const lessonsDir = path.join(root, 'src', 'components', 'lessons');

const TERM_CARD_BEFORE =
  'surface p-5 group hover:border-accent/40 hover:shadow-elevated transition-all duration-300 relative overflow-hidden';
const TERM_CARD_AFTER = 'surface p-5 relative overflow-hidden';

// Inner element hover effects inside the term card
const INNER_REPLACEMENTS = [
  [
    'bg-accent/5 group-hover:bg-accent/10 blur-2xl transition-colors',
    'bg-accent/5 blur-2xl',
  ],
  [
    'font-display font-bold mb-1 leading-tight group-hover:text-accent transition-colors',
    'font-display font-bold mb-1 leading-tight',
  ],
  [
    'text-sm text-fg-muted opacity-70 group-hover:opacity-100 transition-opacity leading-relaxed',
    'text-sm text-fg-muted leading-relaxed',
  ],
  // misleading "hover to see" instruction in intros
  [' רחף כדי לראות את ההגדרה.', ''],
  [' רחף כדי לראות את ההסבר.', ''],
  // Framer-Motion hover slide on the term card (missed by Tailwind sweep)
  ['            whileHover={{ x: -4 }}\n', ''],
];

let changed = 0;
const topics = fs.readdirSync(lessonsDir).filter((d) => d.startsWith('topic-'));
for (const topic of topics) {
  const file = path.join(lessonsDir, topic, 'RecapScene.tsx');
  if (!fs.existsSync(file)) continue;
  const orig = fs.readFileSync(file, 'utf8');
  let next = orig;

  if (next.includes(TERM_CARD_BEFORE)) {
    next = next.replaceAll(TERM_CARD_BEFORE, TERM_CARD_AFTER);
  }
  for (const [a, b] of INNER_REPLACEMENTS) {
    if (next.includes(a)) next = next.replaceAll(a, b);
  }

  if (next !== orig) {
    fs.writeFileSync(file, next, 'utf8');
    changed++;
    console.log(`  fixed: ${topic}/RecapScene.tsx`);
  } else {
    console.log(`  skip:  ${topic}/RecapScene.tsx (no changes)`);
  }
}
console.log(`\n${changed} file(s) updated.`);
