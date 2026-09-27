// Checks the shared source driving Blender's 3D surface, contours and section.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const root=path.resolve(__dirname,'../..');
const src=fs.readFileSync(path.join(root,'src/components/lessons/topic-02/contourDensityGeometry.ts'),'utf8');
const {MODELS,ringPoint,heightAlongSection,GEOMETRY}=new Function(stripTypeScriptTypes(src.replace(/export /g,''))+';return {MODELS,ringPoint,heightAlongSection,GEOMETRY};')();
for(const [kind,m] of Object.entries(MODELS)){
  for(let i=0;i<180;i++){
    const theta=i/180*Math.PI*2;
    let last=1;
    for(let j=0;j<=200;j++){
      const h=m.g(j/200,theta);
      assert.ok(h>=-1e-8 && h<=1+1e-8,kind+': height out of bounds');
      assert.ok(h<=last+1e-8,kind+': non-monotonic ray would invalidate contour solver');
      last=h;
    }
    for(const ring of GEOMETRY[kind].rings.filter(r=>r.visible)){
      const [x,y]=ringPoint(m,ring.h,theta);
      const u=Math.hypot(x-100,(y-58)/.56)/m.R(theta);
      assert.ok(Math.abs(m.H*m.g(u,theta)-ring.h)<1e-5,kind+': contour is not at stated elevation');
    }
  }
  for(const ring of GEOMETRY[kind].rings.filter(r=>r.visible)){
    for(const x of [ring.xw,ring.xe]) assert.ok(Math.abs(heightAlongSection(m,x)-ring.h)<1e-5,kind+': A–B crossing differs from terrain');
  }
  assert.equal(GEOMETRY[kind].rings.filter(r=>r.visible).length,kind==='gentle'?4:8);
}
const width=(kind,h)=>{const r=GEOMETRY[kind].rings.find(r=>r.h===h);return r.xe-r.xw;};
assert.ok(width('gentle',10)-width('gentle',40)>width('steep',10)-width('steep',40),'Gentle slope must have wider contour spacing');
const cliff=GEOMETRY.cliff.rings;
assert.ok(cliff[0].xe-cliff[7].xe<cliff[7].xw-cliff[0].xw,'Cliff must compress contours on the eastern face');
console.log('PASS: 3 landforms, 108,540 height samples, exact contour elevations, A–B consistency, density ordering.');
