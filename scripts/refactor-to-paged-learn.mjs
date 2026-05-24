// Refactor every TopicNNLesson.tsx from the long-scroll layout
// (HookScene → SceneDivider → OnboardingScene → … → RecapScene)
// to the paged layout (<PagedLearn scenes={SCENES} />).
//
// Scene order, names, and labels are derived from the existing JSX
// (preceding <SceneDivider next="…" /> is the next scene's label).
// HookScene — which never has a preceding divider — gets the label
// "פתיחה".
//
// Also deletes each topic's now-orphaned SceneProgress.tsx and
// SceneDivider.tsx (the latter was just a re-export of the shared
// component anyway; PagedLearn replaces the side nav too).

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

let refactored = 0;
let deletedProgress = 0;
let deletedDivider = 0;

for (const topic of topics) {
  const dir = path.join(lessonsDir, topic);
  const num = topic.slice(-2);
  const lessonFile = path.join(dir, `Topic${num}Lesson.tsx`);
  if (!fs.existsSync(lessonFile)) {
    console.warn(`  skip:  ${topic} — no Topic${num}Lesson.tsx`);
    continue;
  }

  const src = fs.readFileSync(lessonFile, 'utf8');

  // ── Parse: which scene components are imported (ignore SceneProgress
  // and SceneDivider — those are being removed).
  const importRe = /^import\s*{\s*(\w+)\s*}\s*from\s*'\.\/(\w+)';\s*$/gm;
  const sceneImports = [];
  let m;
  while ((m = importRe.exec(src))) {
    const [, compName, fromFile] = m;
    if (compName !== fromFile) continue;
    if (compName === 'SceneProgress' || compName === 'SceneDivider') continue;
    if (!compName.endsWith('Scene')) continue;
    sceneImports.push(compName);
  }

  // ── Parse: scene order in the JSX, pairing each <…Scene /> with
  // the label from the immediately preceding <SceneDivider next="…" />.
  // A combined regex captures either a divider or a scene tag in order.
  const tokenRe =
    /<(SceneDivider)\s+next="([^"]+)"\s*\/>|<(\w+Scene)\s*\/>/g;
  const scenes = [];
  let lastLabel = null;
  while ((m = tokenRe.exec(src))) {
    if (m[1] === 'SceneDivider') {
      lastLabel = m[2];
    } else if (m[3]) {
      const compName = m[3];
      // Derive id from component name — "HookScene" → "hook" — to match
      // the `id="scene-<id>"` already on each scene's <section>.
      const id = compName.replace(/Scene$/, '').toLowerCase();
      const label = lastLabel ?? (compName === 'HookScene' ? 'פתיחה' : compName);
      scenes.push({ id, compName, label });
      lastLabel = null;
    }
  }

  if (scenes.length === 0) {
    console.warn(`  skip:  ${topic} — no scenes parsed`);
    continue;
  }

  // ── Emit new TopicNNLesson.tsx
  const importBlock = sceneImports
    .map((c) => `import { ${c} } from './${c}';`)
    .join('\n');

  // Right-align Comp names so the const reads like a clean table.
  const longestId = Math.max(...scenes.map((s) => s.id.length));
  const longestLabel = Math.max(...scenes.map((s) => s.label.length));
  const sceneEntries = scenes
    .map((s) => {
      const idPad = `'${s.id}',`.padEnd(longestId + 3);
      const lblPad = `'${s.label}',`.padEnd(longestLabel + 3);
      return `  { id: ${idPad} label: ${lblPad} Comp: ${s.compName} },`;
    })
    .join('\n');

  const out = `'use client';

${importBlock}
import { PagedLearn, type PagedScene } from '@/components/lesson/PagedLearn';

const SCENES: PagedScene[] = [
${sceneEntries}
];

export function Topic${num}Lesson() {
  return <PagedLearn scenes={SCENES} />;
}
`;

  fs.writeFileSync(lessonFile, out, 'utf8');
  refactored++;
  console.log(`  refactored: ${topic}/Topic${num}Lesson.tsx (${scenes.length} scenes)`);

  // ── Delete now-orphaned per-topic SceneProgress.tsx
  const progressFile = path.join(dir, 'SceneProgress.tsx');
  if (fs.existsSync(progressFile)) {
    fs.unlinkSync(progressFile);
    deletedProgress++;
  }

  // ── Delete the per-topic SceneDivider.tsx re-export (the shared
  // component at @/components/lesson/SceneDivider still exists).
  const dividerFile = path.join(dir, 'SceneDivider.tsx');
  if (fs.existsSync(dividerFile)) {
    fs.unlinkSync(dividerFile);
    deletedDivider++;
  }
}

console.log(
  `\n${refactored} lesson file(s) refactored · ` +
    `${deletedProgress} SceneProgress deleted · ` +
    `${deletedDivider} SceneDivider deleted.`,
);
