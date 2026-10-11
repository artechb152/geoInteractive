// Copy inventory for the guided datum block: every Hebrew sentence of the
// original DatumFit block (CoordinatesScene.tsx at git blob 6eb1e4f, i.e.
// commit 9ee44d3 and before) must appear verbatim in the new block, and every
// Hebrew string the new block adds is listed for the report.
// Run: node scripts/qa/datum-copy-check.mjs
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const OLD_REV = process.env.DATUM_OLD_REV || '9ee44d3';
const old = execSync(`git show ${OLD_REV}:src/components/lessons/topic-02/CoordinatesScene.tsx`, { encoding: 'utf8' });
const start = old.indexOf('דאטום (deck slides 15–20)');
const end = old.indexOf('סיכום (deck slides');
if (start < 0 || end < 0) throw new Error('old block anchors not found');
const oldBlock = old.slice(old.lastIndexOf('\n', start), old.lastIndexOf('\n', end));
const NEW_FILES = ['src/components/lessons/topic-02/datum/DatumGuided.tsx', 'src/components/lessons/topic-02/datum/DatumSection.tsx', 'src/components/lessons/topic-02/datum/datumOverlays.tsx'];
const newSrc = NEW_FILES.map((f) => readFileSync(f, 'utf8')).join('\n');

const HE = /[֐-׿]/;
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Hebrew runs: string literals, and JSX text between tags/braces. */
function runs(src) {
  const s = stripComments(src);
  const out = [];
  for (const m of s.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)) {
    const v = m[1] ?? m[2] ?? m[3];
    if (HE.test(v)) out.push(...v.split(/\$\{[^}]*\}/).map(norm).filter((x) => HE.test(x)));
  }
  for (const m of s.matchAll(/>([^<>{}]*)</g)) if (HE.test(m[1])) out.push(norm(m[1]));
  return [...new Set(out)];
}
const sentences = (t) => t.split(/(?<=[.:])\s+(?=\S)/).map(norm).filter((x) => HE.test(x));

const newRuns = runs(newSrc);
const newText = norm(newRuns.join(' '));
const missing = [];
for (const r of runs(oldBlock)) for (const s of sentences(r)) if (!newText.includes(s)) missing.push(s);

const oldText = norm(runs(oldBlock).join(' '));
const added = newRuns.filter((r) => !sentences(r).every((s) => oldText.includes(s)));

console.log(`old block Hebrew runs: ${runs(oldBlock).length}; new: ${newRuns.length}`);
console.log(missing.length ? `MISSING from the new block (${missing.length}):\n  ${missing.join('\n  ')}` : 'every original sentence is present verbatim');
console.log(`\nadded strings (functional labels / accessible names) — ${added.length}:\n  ${added.join('\n  ')}`);
process.exit(missing.length ? 1 : 0);
