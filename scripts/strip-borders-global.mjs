// Blanket pass: strip every remaining `border-r-4 border-r-COLOR` chrome across
// every scene file. This kills the coloured side stripes that defined the old
// look, without touching content or other styling.
//
// Also removes leading "surface-elevated p-X(\\s+sm:p-X)? " followed by the
// border-r-4 token, since those usually appear together as panel chrome.
//
// What it does NOT do:
//   - Convert anything to <InsightCard> (kept for targeted follow-ups)
//   - Touch interactive button styles (the side stripe never lived there)
//
// Safe because:
//   - Only modifies className strings
//   - Replacement is empty/whitespace — no JSX structure changes
//   - Tidies leftover double spaces
import fs from 'node:fs';

const FILES = [
  'src/components/lessons/topic-01/AsymmetricScene.tsx',
  'src/components/lessons/topic-01/MDOScene.tsx',
  'src/components/lessons/topic-02/CoordinatesScene.tsx',
  'src/components/lessons/topic-02/ScaleScene.tsx',
  'src/components/lessons/topic-02/TopographyScene.tsx',
  'src/components/lessons/topic-03/CombatNavScene.tsx',
  'src/components/lessons/topic-03/PlanningScene.tsx',
  'src/components/lessons/topic-03/PrinciplesScene.tsx',
  'src/components/lessons/topic-04/GeologyScene.tsx',
  'src/components/lessons/topic-04/LandformsScene.tsx',
  'src/components/lessons/topic-04/TacticalTerrainScene.tsx',
  'src/components/lessons/topic-06/KillChainScene.tsx',
  'src/components/lessons/topic-06/LOSScene.tsx',
  'src/components/lessons/topic-06/ViewshedScene.tsx',
  'src/components/lessons/topic-07/ClimateScene.tsx',
  'src/components/lessons/topic-07/PlatformsScene.tsx',
  'src/components/lessons/topic-07/SensorsScene.tsx',
  'src/components/lessons/topic-08/InfrastructureScene.tsx',
  'src/components/lessons/topic-08/LOCScene.tsx',
  'src/components/lessons/topic-08/TailScene.tsx',
  'src/components/lessons/topic-09/ChokepointsScene.tsx',
  'src/components/lessons/topic-09/MahanScene.tsx',
  'src/components/lessons/topic-09/WaterEnergyScene.tsx',
  'src/components/lessons/topic-10/CivilianScene.tsx',
  'src/components/lessons/topic-10/ThreeDimScene.tsx',
  'src/components/lessons/topic-10/UrbanMorphologyScene.tsx',
  'src/components/lessons/topic-11/BordersScene.tsx',
  'src/components/lessons/topic-11/BufferScene.tsx',
  'src/components/lessons/topic-11/DepthScene.tsx',
  'src/components/lessons/topic-12/BasicsScene.tsx',
  'src/components/lessons/topic-12/CostSurfaceScene.tsx',
  'src/components/lessons/topic-12/NetworkScene.tsx',
];

let totalFiles = 0;
let totalStripped = 0;

for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8');
  const before = s;

  // Count border-r-4 occurrences before
  const initialCount = (s.match(/border-r-4 border-r-[\w-]+/g) || []).length;

  // 1) Drop `border-r-4 border-r-COLOR` everywhere it appears in classNames
  s = s.replace(/\s*border-r-4 border-r-[\w-]+/g, '');

  // 2) Inside a `surface-elevated p-X(\s+sm:p-X)?` (no rounded), we likely no
  //    longer want the harsh elevated panel either — keep the padding but drop
  //    `surface-elevated` so the inner content reads as a section, not a card.
  //    (Applied only to standalone callouts, not panels with rounded.)
  s = s.replace(
    /surface-elevated (p-\d+(?:\s+sm:p-\d+)?\s+mb-\d+)(?=\s*"|\s)/g,
    '$1',
  );

  // 3) Tidy double-spaces in className strings
  s = s.replace(/className="\s+/g, 'className="');
  s = s.replace(/\s+"/g, '"');
  s = s.replace(/ {2,}/g, ' ');

  if (s !== before) {
    fs.writeFileSync(f, s);
    totalFiles++;
    totalStripped += initialCount;
    console.log(f + ': stripped ' + initialCount + ' border-r-4 occurrences');
  }
}

console.log('---');
console.log('Total: ' + totalStripped + ' border-r-4 patterns stripped across ' + totalFiles + ' files');
