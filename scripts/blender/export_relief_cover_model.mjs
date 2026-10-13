// The "בשטח" model of „אותה גבעה, שלושה נופים” for Blender: the ground and every object of every
// state, from the same TS the page draws the map and the live mesh with (reliefCoverCompare.data,
// reliefCoverMesh). render_relief_cover_model.py builds its scene from these files only.
//
//   node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/blender/export_relief_cover_model.mjs
//
// Writes qa-output/relief-cover-model/:
//   model.json   world mapping (VEX, DATUM, centre), drape regions, ground grid axes, objects, cover per state
//   ground.bin   Float32 per grid node (row-major, y then x): hill height, quarried height, quarry rock 0…1
import { mkdir, writeFile } from 'node:fs/promises';
import { COVER, GROVE, HILL, HOUSES, ORCHARD, QUARRIED, SHRUBS, STATES, houseCorners, quarryMask, quarryRock } from '../../src/components/lessons/topic-02/reliefCoverCompare.data.ts';
import { APRON, CENTER, DATUM, DRAPE, VEX } from '../../src/components/lessons/topic-02/reliefCoverMesh.ts';

const OUT = 'qa-output/relief-cover-model';
await mkdir(OUT, { recursive: true });

// Ground grid: 1 m over the ring the mid render covers, then steps growing outward to past the apron.
const FINE = 1;
function axis(lo, hi, far0, far1) {
  const inner = [];
  for (let v = lo; v <= hi + 1e-9; v += FINE) inner.push(v);
  const out = (edge, end, dir) => {
    const r = [];
    let step = FINE;
    for (let v = edge; dir > 0 ? v < end : v > end; ) {
      step = Math.min(step * 1.12, 40);
      v += dir * step;
      r.push(v);
    }
    return r;
  };
  return [...out(lo, far0, -1).reverse(), ...inner, ...out(hi, far1, 1)];
}
const { mid, outer } = DRAPE;
const xs = axis(mid.x0 - 10, mid.x1 + 10, outer.x0, outer.x1);
const ys = axis(mid.y0 - 10, mid.y1 + 10, outer.y0, outer.y1);
const n = xs.length * ys.length;
const buf = new Float32Array(n * 3);
let k = 0;
for (const y of ys) {
  for (const x of xs) {
    const h0 = HILL(x, y);
    const cut = quarryMask(x, y) > 0;
    buf[k++] = h0;
    buf[k++] = cut ? QUARRIED(x, y) : h0;
    buf[k++] = cut ? quarryRock(x, y) : 0;
  }
}
await writeFile(`${OUT}/ground.bin`, Buffer.from(buf.buffer));

const ids = (list) => list.map((o) => o.id);
const model = {
  vex: VEX,
  datum: DATUM,
  center: CENTER,
  apron: APRON,
  drape: DRAPE,
  grid: { xs, ys },
  grove: GROVE.map((t) => ({ ...t, ground: HILL(t.x, t.y) })),
  orchard: ORCHARD.map((t) => ({ ...t, ground: HILL(t.x, t.y) })),
  shrubs: SHRUBS.map((s) => ({ ...s, ground: HILL(s.x, s.y) })),
  houses: HOUSES.map((h) => {
    const g = houseCorners(h).map(([x, y]) => HILL(x, y));
    return { ...h, lo: Math.min(...g), hi: Math.max(...g) };
  }),
  cover: Object.fromEntries(
    STATES.map((s) => [s, { grove: ids(COVER[s].grove), shrubs: ids(COVER[s].shrubs), orchard: ids(COVER[s].orchard), houses: ids(COVER[s].houses) }]),
  ),
};
await writeFile(`${OUT}/model.json`, JSON.stringify(model));
console.log(`grid ${xs.length} × ${ys.length} (${n} nodes), x ${xs[0].toFixed(0)}…${xs.at(-1).toFixed(0)}, y ${ys[0].toFixed(0)}…${ys.at(-1).toFixed(0)}`);
console.log(`objects: ${GROVE.length} grove, ${SHRUBS.length} shrubs, ${ORCHARD.length} orchard, ${HOUSES.length} houses`);
