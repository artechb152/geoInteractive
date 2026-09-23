/**
 * check-budget.mjs — שומר הסף של תקציב הביצועים (M-04).
 * נכשל אם אזור כלשהו חורג מהתקציב, כדי שהחריגה תתגלה ב-CI ולא במכשיר של לומד.
 *
 *   node tools/check-budget.mjs
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, loadConfig } from './lib/geo.mjs';

/** תקציב לאזור: כל השכבות יחד, בפורמט המודרני וברוחב שמוגש למסך רגיל. */
const BUDGET_KB = 400;
/** השכבות הנספרות. ההצללה אופציונלית — אזור בלעדיה עדיין תקף. */
const LAYERS = ['aerial', 'topo', 'hillshade'];
/** הרוחב שנחשב "מסך רגיל" לצורך המדידה. */
const TARGET_WIDTH = 1200;

const ASSETS = resolve(ROOT, 'src', 'assets', 'areas');
const kb = (b) => Math.round(b / 1024);

let worst = 0;
const rows = [];
const problems = [];

for (const area of loadConfig().areas) {
  const dir = resolve(ASSETS, area.id);
  if (!existsSync(dir)) continue;
  const files = readdirSync(dir);
  let total = 0;
  const parts = [];
  for (const layer of LAYERS) {
    const widths = files
      .filter((f) => f.startsWith(`${layer}-`) && f.endsWith('.avif'))
      .map((f) => Number(f.match(/-(\d+)\.avif$/)?.[1] || 0))
      .filter(Boolean)
      .sort((a, b) => a - b);
    const w = widths.find((x) => x >= TARGET_WIDTH) ?? widths[widths.length - 1];
    if (!w) continue;
    const size = statSync(resolve(dir, `${layer}-${w}.avif`)).size;
    total += size;
    parts.push(`${layer}@${w}=${kb(size)}KB`);
  }
  if (!total) continue;
  worst = Math.max(worst, total);
  rows.push(`  ${area.id.padEnd(10)} ${String(kb(total)).padStart(4)}KB   ${parts.join('  ')}`);
  if (kb(total) > BUDGET_KB) {
    problems.push(`${area.id}: ${kb(total)}KB > ${BUDGET_KB}KB`);
  }
}

console.log(`תקציב נכסים — עד ${BUDGET_KB}KB לאזור (AVIF, רוחב ${TARGET_WIDTH}px):`);
console.log(rows.join('\n') || '  (אין אזורים)');

if (problems.length) {
  console.error('\nחריגה מהתקציב:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`\nתקין. הכבד ביותר: ${kb(worst)}KB.`);
