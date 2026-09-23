/**
 * check-package.mjs — מוודא שכל מה ש-package.json מבטיח באמת נבנה.
 *
 * `exports` שמצביע לקובץ שאינו קיים אינו נכשל בבנייה — הוא נכשל אצל מי
 * שמתקין את החבילה, בשלב ה-import, עם הודעה שאינה מסבירה דבר.
 *
 *   node tools/check-package.mjs
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './lib/geo.mjs';

const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
const problems = [];

/** אוסף כל נתיב יחסי שמוזכר בשדות ההפצה. */
function collect(node, path = 'exports') {
  if (typeof node === 'string') {
    if (node.startsWith('./') && !node.endsWith('package.json')) return [[path, node]];
    return [];
  }
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => collect(v, `${path}.${k}`));
  }
  return [];
}

const targets = [
  ...collect(pkg.exports),
  ['main', pkg.main],
  ['module', pkg.module],
  ['types', pkg.types],
].filter(([, p]) => typeof p === 'string' && p);

for (const [field, rel] of targets) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) {
    problems.push(`${field} → ${rel} — הקובץ אינו קיים`);
    continue;
  }
  if (statSync(abs).size === 0) {
    problems.push(`${field} → ${rel} — הקובץ ריק`);
  }
}

/* CSS: הרכיב מייבא את הגיליון שלו, ולכן הוא חייב להיפלט כקובץ נפרד ולא
   להיבלע פנימה — אחרת הצרכן מייבא "./style.css" שאינו קיים. */
const css = resolve(ROOT, 'dist-lib', 'style.css');
if (!existsSync(css)) {
  problems.push('dist-lib/style.css — לא נוצר; הצרכן לא יקבל עיצוב');
} else if (!readFileSync(css, 'utf8').includes('.tms')) {
  problems.push('dist-lib/style.css — אינו מכיל את מחלקות הרכיב');
}

/* React חייב להישאר חיצוני: שני עותקים של React בדף אינם משקל כפול אלא
   hooks שבורים. */
const esm = resolve(ROOT, 'dist-lib', 'terrain-map-simulator.mjs');
if (existsSync(esm)) {
  const src = readFileSync(esm, 'utf8');
  if (/function\s+useState\s*\(/.test(src) && src.includes('__SECRET_INTERNALS')) {
    problems.push('React נארז לתוך החבילה במקום להישאר peerDependency');
  }
}

if (problems.length) {
  console.error('בעיות באריזת החבילה:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`תקין. ${targets.length} נתיבי הפצה קיימים, ו-style.css נפלט בנפרד.`);
