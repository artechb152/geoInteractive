// Export the lesson's existing height model for offline Blender rendering.
// No dependency installation required (Node 24's built-in TS stripping).
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const root = path.resolve(__dirname, '../..');
const src = fs.readFileSync(path.join(root, 'src/components/lessons/topic-02/contourDensityGeometry.ts'), 'utf8');
const plain = src.replace(/export /g, '');
const data = new Function(stripTypeScriptTypes(plain) + '; return { MODELS, ringPoint, heightAlongSection, GEOMETRY };')();
const n = 240;
const result = {};
for (const [kind, m] of Object.entries(data.MODELS)) {
  const vertices = [], faces = [];
  for (let row = 0; row <= n; row++) for (let col = 0; col <= n; col++) {
    const x = 4 + col / n * 192, y = 2 + row / n * 114;
    const dx = x - 100, dy = (y - 58) / .56;
    const t = Math.atan2(dy, dx), u = Math.hypot(dx, dy) / m.R(t);
    const h = u >= 1 ? 0 : m.H * m.g(u, t);
    vertices.push([(x - 100) / 40, -(y - 58) / 40, h / 55]);
    if (row < n && col < n) {
      const i = row * (n + 1) + col;
      faces.push([i, i + n + 1, i + n + 2, i + 1]);
    }
  }
  const rings = data.GEOMETRY[kind].rings.filter(r=>r.visible).map(r=>({
    height:r.h,
    points:Array.from({length:512},(_,i)=>{
      const [x,y] = data.ringPoint(m,r.h,i/512*Math.PI*2);
      return [(x-100)/40,-(y-58)/40,r.h/55];
    }),
    label:(()=>{const [x,y]=data.ringPoint(m,r.h,2.2);return [(x-100)/40,-(y-58)/40,r.h/55];})(),
    crossings:[[(r.xw-100)/40,0,r.h/55],[(r.xe-100)/40,0,r.h/55]],
  }));
  const profile = Array.from({length:337},(_,i)=>{
    const x=16+i/336*168;
    return [(x-100)/40,0,data.heightAlongSection(m,x)/55];
  });
  // Isolated mountain: exact natural footprint, with no surrounding flat tile.
  const sideVertices = [[0, 0, m.H / 55]], sideFaces = [];
  const radialSteps = 120, angularSteps = 256;
  for (let j = 1; j <= radialSteps; j++) for (let i = 0; i < angularSteps; i++) {
    const t = -i / angularSteps * Math.PI * 2, u = j / radialSteps;
    const r = m.R(t) * u;
    sideVertices.push([r * Math.cos(t) / 40, -r * Math.sin(t) * .56 / 40, m.H * m.g(u, t) / 55]);
    const a = 1 + (j - 1) * angularSteps + i;
    const b = 1 + (j - 1) * angularSteps + (i + 1) % angularSteps;
    if (j === 1) sideFaces.push([0, a, b]);
    else sideFaces.push([a - angularSteps, a, b, b - angularSteps]);
  }
  result[kind]={vertices,faces,rings,profile,sideVertices,sideFaces};
}
const out=path.join(root,'qa-output/density-blender');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'geometry.json'),JSON.stringify(result));
console.log('Exported three exact terrain meshes, contour rings and A–B profiles.');
