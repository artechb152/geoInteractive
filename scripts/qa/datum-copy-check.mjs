// Copy inventory for the guided datum block: every Hebrew sentence of the
// original DatumFit block (CoordinatesScene.tsx at git blob 6eb1e4f, i.e.
// commit 9ee44d3 and before) must appear verbatim in the new block — except
// the changes the interaction brief approved (APPROVED_REMOVED, below) — the
// brief's own wordings (or the user's later copy edits) must be present, the removed controls and any score
// must stay out, and every Hebrew string the new block adds is listed.
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

/* Approved copy changes (design/mockups/datum-concepts/claude-interaction-and-learning-refinement-prompt.md,
   2026-10-12): the original sentences the brief reworded, or removed together with the control they
   belonged to. Any OTHER original sentence that goes missing still fails. */
const APPROVED_REMOVED = new Map([
  ['נחשוב על הדאטום כעל הגוף המתמטי שמתאר בצורה הטובה ביותר את כדור הארץ כולו, או חלק ממנו – ונזכיר כי בלתי אפשרי לתאר את כדור הארץ בצורה מתמטית, רק פיזיקלית.', 'station 1 reworded by the brief'],
  ['המטרה:', 'station 2 reworded by the brief (focused explanation)'],
  ['שהדאטום יהיה כמה שיותר דומה וקרוב לפני השטח.', 'station 2 reworded by the brief'],
  ['בתרשים – כדור הארץ כפי שהוא מוגדר על ידי שילוב של גיאואיד (בכחול) ואליפסואיד (בכתום).', 'station 2 reworded by the brief (the bodies are labelled on the globe)'],
  ['בהמחשה הדו־ממדית יש ארבעה פרמטרים בלבד:', 'replaced by the experiment’s note "זהו ניסוי סכמטי בחתך דו־ממדי…"'],
  ['הזזה בשני צירים, סיבוב וקנה מידה.', 'replaced by the experiment’s note'],
  ['הזזה – ציר X', 'slider label → "הזזה אופקית (X)"'],
  ['הזזה בציר X', 'its accessible value prefix follows the label'],
  ['הזזה – ציר Y', 'slider label → "הזזה אנכית (Y)"'],
  ['הזזה בציר Y', 'its accessible value prefix follows the label'],
  ['התאמה לכל כדור הארץ', 'the 0–100 % meter is removed'],
  ['התאמה לאזור המסומן', 'the 0–100 % meter is removed'],
  ['האליפסואיד מותאם מרחבית לכלל כדור הארץ – זהו דאטום עולמי.', 'success feedback at ≥ 80 % — removed with the meter'],
  ['האליפסואיד מותאם מרחבית רק לאזור המסומן – זהו דאטום מקומי.', 'success feedback at ≥ 80 % — removed with the meter'],
  ['אחוז.', 'the score in the accessible description is removed'],
  ['מתאימים את האליפסואיד מרחבית לכלל כדור הארץ.', 'user-requested accordion copy simplification, 2026-10-12'],
  ['מתאימים את האליפסואיד מרחבית רק לאזור מסוים על פני כדור הארץ (מסומן בקו עבה).', 'user-requested accordion copy simplification, 2026-10-12'],
  ['הזיזו, סובבו ושנו את קנה המידה של האליפסואיד כדי להלביש אותו על הגיאואיד.', 'user-requested experiment copy simplification, 2026-10-12'],
  ['הוא מכלול הפרמטרים המגדירים ומעגנים את האליפסואיד ביחס לפני כדור הארץ.', 'user-requested clearer datum definition, 2026-10-13'],
  ['ההבדל בין אליפסואיד לדאטום', 'user-requested clarity audit: seven parameters describe a coordinate transformation, 2026-10-13'],
  ['תהליך המעבר מאליפסואיד לדאטום נעשה בשבעה פרמטרים:', 'corrected to a method for converting coordinates between datums, 2026-10-13'],
  ['– הזזה של הדאטום עצמו במרחב (', 'shortened to translation along the axes, 2026-10-13'],
  ['– סיבוב של הדאטום סביב הצירים שלו (', 'shortened to rotation around the axes, 2026-10-13'],
  ['– שינוי הגודל של הדאטום.', 'corrected to coordinate scale, 2026-10-13'],
  ['כמו פקק שצריך להתאים לבקבוק שלו.', 'unnecessary analogy removed at user request, 2026-10-13'],
  ['הדאטומים השונים נבדלים ביניהם בפרמטרים הבאים:', 'clarified ellipsoid choice and anchoring, 2026-10-13'],
  ['רדיוס (', 'clarified as ellipsoid size, 2026-10-13'],
  ['שלושה פרמטרי הזזה במרחב (', 'clarified as ellipsoid position, 2026-10-13'],
  ['התאמה:', 'the stage label lost "התאמה": the block is about the ellipsoid and its anchoring (lesson 2 tasks 14–15, 2026-10-26)'],
  ['התאמת האליפסואיד לכדור הארץ', 'title → "דאטום: אליפסואיד ועיגון" — a fit to the geoid is not what defines a datum (lesson 2 tasks 14–15, 2026-10-26)'],
  ['איפוס', 'the four-slider experiment is removed (lesson 2 tasks 14–15, 2026-10-26)'],
  ['הצגת התאמה', 'the four-slider experiment is removed (lesson 2 tasks 14–15, 2026-10-26)'],
  ['שלושה פרמטרי הזזה', 'the seven parameters moved to the "הרחבה" card as "שלוש הזזות" (lesson 2 tasks 14–15, 2026-10-26)'],
  ['שלושה פרמטרי סיבוב', 'the seven parameters moved to the "הרחבה" card as "שלושה סיבובים" (lesson 2 tasks 14–15, 2026-10-26)'],
  ['פרמטר קנה מידה', 'the seven parameters moved to the "הרחבה" card as "קנה מידה" (lesson 2 tasks 14–15, 2026-10-26)'],
  ['ההבדל בין הדאטומים השונים', 'the card became station 2 and the check "מה השתנה?" (lesson 2 tasks 14–15, 2026-10-26)'],
]);
/** Required copy: the block as lesson 2 tasks 14–15 rebuilt it (2026-10-26). */
const REQUIRED_NEW = [
  'דאטום: אליפסואיד ועיגון',
  'מגדיר את גוף הייחוס ואת עיגונו ביחס לכדור הארץ. האליפסואיד קובע את הצורה והגודל; העיגון קובע היכן מרכז האליפסואיד ולאן מכוונים ציריו.',
  'אותו אליפסואיד, עיגון אחר', 'דאטום עולמי ומקומי', 'בדיקה: מה השתנה?',
  'עיגון א׳', 'עיגון ב׳', 'עולמי', 'מקומי', 'באזור המסומן', 'מחוץ לאזור',
  'העיגון בלבד', 'האליפסואיד בלבד', 'גם וגם', 'לזוג הבא', 'מההתחלה', 'הצגת המעבר שוב',
  'אותו אליפסואיד בעיגון אחר הוא דאטום אחר.',
  'ההבדלים מוגדלים מאוד להמחשה',
  'הרחבה: המרת קואורדינטות בין דאטומים',
  'המרת קואורדינטות היא פעולה אחרת: חישוב הקואורדינטות של אותה נקודה בדאטום אחר.',
  'הוא אינו משנה את האליפסואיד.',
]
/** Controls the brief removed from the datum block, and any score: they must stay out. */
const FORBIDDEN = ['אחוז', 'החזרת המבט', 'מסך מלא', 'יציאה ממסך מלא', 'השהיה', 'התקדמות ההדגמה', 'הפעלת ההדגמה', 'נסו בעצמכם', 'תהליך המעבר מאליפסואיד לדאטום'];

const missingUnapproved = missing.filter((s) => !APPROVED_REMOVED.has(s));
const stale = [...APPROVED_REMOVED.keys()].filter((s) => !missing.includes(s));
const absent = REQUIRED_NEW.filter((s) => !newRuns.some((r) => r === s || r.includes(s)));
const forbidden = FORBIDDEN.filter((w) => newRuns.some((r) => r.includes(w)));
// a score shown or announced: an interpolated value followed by %, or the score itself in the UI
// (SVG attributes such as width="140%" are not text)
const code = stripComments(newSrc);
const percent = [...(code.match(/\}\s*%/g) || []), ...(code.match(/\bscoreFor\(|\bFIT_GOOD\b/g) || [])];

console.log(`old block Hebrew runs: ${runs(oldBlock).length}; new: ${newRuns.length}`);
console.log(missingUnapproved.length ? `MISSING from the new block, not approved (${missingUnapproved.length}):\n  ${missingUnapproved.join('\n  ')}` : 'every original sentence is present verbatim, except the approved changes');
console.log(`\napproved changes (${missing.length - missingUnapproved.length}):\n  ${missing.filter((s) => APPROVED_REMOVED.has(s)).map((s) => `${s}  ← ${APPROVED_REMOVED.get(s)}`).join('\n  ')}`);
if (stale.length) console.log(`\nnote — approved removals that are still present (${stale.length}):\n  ${stale.join('\n  ')}`);
console.log(absent.length ? `\nREQUIRED wording missing (${absent.length}):\n  ${absent.join('\n  ')}` : '\nevery wording the brief requires is present verbatim');
console.log(forbidden.length || percent.length ? `\nFORBIDDEN in the block: ${[...forbidden, ...percent].join(', ')}` : 'no score, no percentage, no removed control in the block');
console.log(`\nadded strings (functional labels / accessible names) — ${added.length}:\n  ${added.join('\n  ')}`);
process.exit(missingUnapproved.length || absent.length || forbidden.length || percent.length ? 1 : 0);
