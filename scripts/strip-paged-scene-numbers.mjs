// Strip the "NN.M ·" numeric prefix from each scene label inside every
// TopicNNLesson.tsx SCENES array. We don't want "07.1 · מיקרו-אקלים" —
// the navigator already shows position visually, and the user asked to
// drop the numbers entirely. After this pass the labels read as plain
// nouns: "פתיחה", "מיקרו-אקלים", "סיכום".
//
// Pattern matched: 'XX.Y · <label>'   →   '<label>'
//   - XX is two digits (lesson number)
//   - Y is one digit (sub-scene index)
//   - The separator is the middle-dot " · " with single spaces.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const lessonsDir = path.join(root, 'src', 'components', 'lessons');

const re = /'(\d{2}\.\d)\s*·\s*([^']+)'/g;

let changed = 0;
for (const topic of fs.readdirSync(lessonsDir).filter((d) => d.startsWith('topic-'))) {
  const num = topic.slice(-2);
  const file = path.join(lessonsDir, topic, `Topic${num}Lesson.tsx`);
  if (!fs.existsSync(file)) continue;

  const orig = fs.readFileSync(file, 'utf8');
  const next = orig.replace(re, (_m, _prefix, label) => `'${label}'`);
  if (next !== orig) {
    fs.writeFileSync(file, next, 'utf8');
    changed++;
    console.log(`  stripped: ${topic}/Topic${num}Lesson.tsx`);
  }
}
console.log(`\n${changed} lesson file(s) updated.`);
