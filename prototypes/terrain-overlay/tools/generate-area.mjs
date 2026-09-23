/**
 * generate-area.mjs — הפקודה האחת שמייצרת אזור מקצה לקצה:
 *   תצ״א → מפה טופוגרפית → DEM וחילוץ צורות → אופטימיזציית נכסים → מודול TS
 *
 *   npm run generate:area -- --area=gilboa
 *   npm run generate:area -- --all --force
 *
 * הכול נשען על tools/areas.config.json ו-content/terrain.he.json בלבד.
 */
import { areasFromArgv, flag, log } from './lib/geo.mjs';
import { fetchImagery } from './fetch-imagery.mjs';
import { fetchTopo } from './fetch-topo.mjs';
import { renderHillshade } from './render-hillshade.mjs';
import { extractFeatures } from './extract-features.mjs';
import { optimizeArea } from './optimize-assets.mjs';
import { genArea, genIndex, genContent } from './gen-area.mjs';

const areas = areasFromArgv();
const force = Boolean(flag('force', false));
const skipAssets = Boolean(flag('skip-assets', false));

const failed = [];
for (const area of areas) {
  log(`\n=== ${area.id} ===`);
  try {
    if (!skipAssets) {
      await fetchImagery(area, { force });
      await fetchTopo(area, { force });
      await renderHillshade(area, { force });
      await optimizeArea(area);
    }
    await extractFeatures(area);
    genArea(area);
  } catch (e) {
    log(`!! ${area.id} נכשל: ${e.message}`);
    failed.push(area.id);
  }
}

genIndex();
genContent();

log('\n--------------------------------');
log(`הושלמו: ${areas.length - failed.length}/${areas.length} אזורים`);
if (failed.length) {
  log(`נכשלו: ${failed.join(', ')}`);
  process.exitCode = 1;
}
