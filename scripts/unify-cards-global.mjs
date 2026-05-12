// Global pass: apply the new InsightCard design language across topics 01-04 and 06-13.
//
// Two safe automatic transformations:
//  (A) Top-callout pattern → <InsightCard>:
//        <div className="surface-elevated p-X mb-Y border-r-4 border-r-COLOR">
//          <div className="flex gap-3 items-start">
//            <Icon name="ICON" size={N} className="text-COLOR shrink-0 mt-0.5" />
//            <div className="text-sm leading-relaxed">
//              <strong className="text-fg">LABEL:</strong>{' '} BODY
//            </div>
//          </div>
//        </div>
//
//  (B) Outer panel wrapper chrome → stripped (keeps mb-X only):
//        ...surface-elevated p-X rounded-Yxl border-r-4 border-r-COLOR mb-Z...
//        → ...mb-Z...
//
// Both transformations only fire when the regex matches exactly. Anything else
// is left untouched and surfaced as a "missed" report for manual follow-up.
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
  'src/components/lessons/topic-12/DeceptionScene.tsx',
  'src/components/lessons/topic-12/GEOINTScene.tsx',
  'src/components/lessons/topic-12/PlatformsScene.tsx',
  'src/components/lessons/topic-13/BasicsScene.tsx',
  'src/components/lessons/topic-13/CostSurfaceScene.tsx',
  'src/components/lessons/topic-13/NetworkScene.tsx',
];

const IMPORT = "import { InsightCard } from '@/components/lesson/InsightCard';";

const TONE_MAP = {
  'accent': 'accent',
  'accent-cool': 'cool',
  'accent-hover': 'accent',
  'accent-hot': 'hot',
  'accent-intel': 'intel',
  'brand': 'brand',
  'brand-dark': 'brand',
  'status-ok': 'ok',
  'status-warn': 'warn',
  'status-danger': 'hot',
  'terrain-sky': 'sky',
  'terrain-ridge': 'ridge',
  'terrain-sand': 'sand',
  'terrain-olive': 'ok',
  'terrain-steel': 'cool',
};

// (A) Top-callout regex — captures the icon name, color, label, body
const topCalloutRe = new RegExp(
  '<div className="surface-elevated p-\\d+(?:\\s+sm:p-\\d+)?\\s+mb-\\d+\\s+border-r-4\\s+border-r-([\\w-]+)">\\s*' +
  '<div className="flex gap-3 items-start">\\s*' +
  '<Icon name="(\\w+)" size=\\{(\\d+)\\}\\s+className="text-[\\w-]+ shrink-0 mt-0\\.5"\\s*\\/>\\s*' +
  '<div className="text-sm leading-relaxed">\\s*' +
  '<strong className="text-fg">([^<]+):<\\/strong>\\{\' \'\\}([\\s\\S]*?)' +
  '<\\/div>\\s*<\\/div>\\s*<\\/div>',
  'g',
);

// (B) Outer-wrapper chrome — strip these tokens from any className
//     Matches things like: "surface-elevated p-6 rounded-2xl border-r-4 border-r-accent"
const wrapperChromeRe = /surface-elevated\s+p-\d+(?:\s+sm:p-\d+)?\s+rounded-(?:2xl|xl)\s+border-r-4\s+border-r-[\w-]+/g;

let totalFiles = 0;
let totalCalloutsTransformed = 0;
let totalWrappersStripped = 0;
const stillRemaining = [];

for (const f of FILES) {
  if (!fs.existsSync(f)) {
    console.log('SKIP (missing): ' + f);
    continue;
  }
  let s = fs.readFileSync(f, 'utf8');
  const before = s;

  // (A) Transform top callouts
  let calloutCount = 0;
  s = s.replace(topCalloutRe, (match, color, iconName, iconSize, label, body) => {
    const tone = TONE_MAP[color] || 'accent';
    const cleanBody = body.trim();
    calloutCount++;
    return (
      '<InsightCard tone="' + tone + '" icon="' + iconName + '" label="' + label + '">\n' +
      '        ' + cleanBody + '\n' +
      '      </InsightCard>'
    );
  });

  // (B) Strip outer wrapper chrome
  let wrapperCount = 0;
  s = s.replace(wrapperChromeRe, () => {
    wrapperCount++;
    return '';
  });

  // Tidy double-spaces produced by the strip
  s = s.replace(/className="\s+/g, 'className="');
  s = s.replace(/(\s)\s+(\w)/g, '$1$2');

  // Add InsightCard import if needed
  if (s.includes('<InsightCard') && !s.includes(IMPORT)) {
    if (s.match(/import \{ SceneHeader \} from '\.\/SceneHeader';\n/)) {
      s = s.replace(/(import \{ SceneHeader \} from '\.\/SceneHeader';\n)/, '$1' + IMPORT + '\n');
    } else if (s.match(/import .*? from '@\/components\/Icon';\n/)) {
      s = s.replace(/(import .*? from '@\/components\/Icon';\n)/, '$1' + IMPORT + '\n');
    }
  }

  if (s !== before) {
    fs.writeFileSync(f, s);
    totalFiles++;
    totalCalloutsTransformed += calloutCount;
    totalWrappersStripped += wrapperCount;
    console.log(f + ': ' + calloutCount + ' callouts → InsightCard, ' + wrapperCount + ' wrappers stripped');
  }

  // Sanity check: any remaining border-r-4 border-r-* in this file?
  const remaining = (s.match(/border-r-4 border-r-[\w-]+/g) || []).length;
  if (remaining > 0) stillRemaining.push(f + ' (' + remaining + ')');
}

console.log('---');
console.log('Total: ' + totalCalloutsTransformed + ' callouts, ' + totalWrappersStripped + ' wrappers, ' + totalFiles + ' files touched');
if (stillRemaining.length) {
  console.log('Files with remaining border-r-4 patterns (manual follow-up):');
  stillRemaining.forEach((m) => console.log('  ' + m));
}
