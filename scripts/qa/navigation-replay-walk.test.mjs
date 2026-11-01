import test from 'node:test';
import assert from 'node:assert/strict';
const base='../../src/components/lessons/topic-06/navigation-replay/';
const W=await import(base+'replayWorld.ts');
const S=await import(base+'replayScenario.ts');
const M=await import(base+'replayWalk.ts');
const C=await import(base+'replayBuildCache.ts');
const SC=await import(base+'replayScatter.ts');
const TM=await import(base+'scene/terrainMesh.ts');
const T=await import(base+'replayTerrain.ts');
const P=await import(base+'replayPreparation.ts');
const THREE=await import('three');

test('walking follows the real route and arrives at the exact next station',()=>{
 for(const [a,b] of [['depart','enroute'],['enroute','saddle']]){
  const p=M.walkPlan(a,b);assert.ok(p);
  assert.ok(W.distW(M.sampleWalk(p,0).at,W.toWorld(S.momentById(a).truth.at))<1e-8);
  assert.ok(W.distW(M.sampleWalk(p,1).at,W.toWorld(S.momentById(b).truth.at))<1e-8);
  let length=0,last=M.sampleWalk(p,0).at;
  for(let i=1;i<=1000;i++){const at=M.sampleWalk(p,i/1000).at;length+=W.distW(last,at);last=at;}
  assert.ok(Math.abs(length-p.route.length)<.1);
 }
});
test('the hidden drift, backwards navigation and jumps never get a walking route',()=>{
 for(const pair of [['saddle','after'],['depart','after'],['enroute','depart'],['after','saddle']])assert.equal(M.walkPlan(...pair),null);
});
test('walking clock pauses during preparation, clamps background-tab gaps and can be cancelled',()=>{
 const s=M.createWalkStore();s.start('enroute','saddle',S.momentById('enroute').view);
 s.step(1000);assert.equal(s.get().progress,0);s.ready();
 s.step(1000);assert.ok(s.get().progress<.03,'a hidden tab cannot teleport the eye');
 s.cancel();s.step(1000);assert.equal(s.get().phase,'idle');
});
test('skip arrives once; late preparation cannot resurrect a cancelled walk',()=>{
 const s=M.createWalkStore();s.start('depart','enroute',S.momentById('depart').view);
 const id=s.get().id;s.skip();assert.equal(s.get().phase,'arrived');
 s.cancel();s.ready(id);assert.equal(s.get().phase,'idle');
});
test('preparation deduplicates concurrent requests and disposes late results after unmount',async()=>{
 let builds=0,disposed=0,release;
 const c=C.createBuildCache(async(key,signal)=>{builds++;await new Promise(r=>release=r);return{key,signal};},()=>disposed++);
 const a=c.get('approach'),b=c.get('approach');assert.equal(a,b);
 await new Promise(r=>setTimeout(r,0));assert.equal(builds,1);
 c.dispose();release();await assert.rejects(a);assert.equal(disposed,1);
});
test('only the three known world groups can be cached, regardless of repeated visits',async()=>{
 let disposed=0;const c=C.createBuildCache(async key=>({key}),()=>disposed++);
 for(let i=0;i<10;i++)for(const key of ['depart','approach','after'])await c.get(key);
 assert.equal(c.size,3);await assert.rejects(c.get('unbounded-key'));c.dispose();assert.equal(disposed,3);
});
test('corridor scatter reaches every part of the walk and yields to input',async()=>{
 let turns=0;const clock=setInterval(()=>turns++,0);
 const path=M.APPROACH_POINTS;const center=M.approachBounds().center;
 const ground={height:()=>100,road:()=>100,stream:()=>100};
 try{const list=await SC.scatterAsync('grass',center.x,center.z,ground,{path});
  assert.ok(turns>0,'background work yields');
  for(let t=0;t<=1;t+=.1){const at=M.sampleWalk(M.walkPlan('enroute','saddle'),t).at;assert.ok(list.some(p=>W.distW(p,at)<12));}
  assert.ok(list.length<60000,'corridor is bounded, not a full high-detail world');
 }finally{clearInterval(clock);}
});
test('walking terrain covers the full horizon, keeps fine detail along the approach and cancels cleanly',async()=>{
 const {center,radius}=M.approachBounds();
 const ground={height:(x,z)=>100+.01*x+.02*z,road:()=>100,stream:()=>100};
 const g=await TM.buildTerrainGeometryAsync(ground,center.x,center.z,radius);
 assert.ok(g.index.count/3<1400000,'bounded mesh budget');
 const pos=g.attributes.position;let near=0,max=0;
 for(let i=0;i<pos.count;i++){const r=Math.hypot(pos.getX(i),pos.getZ(i));if(r<radius)near++;max=Math.max(max,r);}
 assert.ok(near>70000);assert.ok(max>15999);g.dispose();
 const ac=new AbortController();ac.abort();await assert.rejects(TM.buildTerrainGeometryAsync(ground,0,0,100,ac.signal));
});
test('nearby vegetation does not disappear or change size when the prepared corridor replaces departure',()=>{
 const at=W.toWorld(S.momentById('depart').truth.at), center=M.approachBounds().center;
 const ground={height:T.groundAt,road:(x,z)=>T.surfaceAt(x,z).roadD,stream:(x,z)=>T.surfaceAt(x,z).streamD};
 const band={far:240,clearancePath:M.APPROACH_POINTS};
 const first=SC.scatter('shrub',at.x,at.z,ground,band).filter(p=>W.distW(at,p)<180);
 const corridor=new Map(SC.scatter('shrub',center.x,center.z,ground,{...band,path:M.APPROACH_POINTS}).map(p=>[`${p.x},${p.z}`,p]));
 for(const p of first){const other=corridor.get(`${p.x},${p.z}`);assert.ok(other,`shrub ${p.x},${p.z} disappeared`);assert.equal(p.scale,other.scale,'same shrub retains its size');}
});
test('the rendered corridor surface stays under the eye throughout the real approach',async()=>{
 const cache=P.createReplayPreparation();let material;
 try{
  const world=await cache.get('approach');material=new THREE.MeshBasicMaterial();
  const mesh=new THREE.Mesh(world.geometry,material);mesh.position.set(world.anchor.x,0,world.anchor.z);mesh.updateMatrixWorld();
  for(const t of [0,.2,.4,.6,.8,1]){
   const at=M.sampleWalk(M.walkPlan('enroute','saddle'),t).at;
   const ground=world.terrain.height(at.x,at.z);
   const ray=new THREE.Raycaster(new THREE.Vector3(at.x,ground+50,at.z),new THREE.Vector3(0,-1,0),0,100);
   const hit=ray.intersectObject(mesh)[0];assert.ok(hit,`no ground at ${t}`);
   assert.ok(Math.abs(hit.point.y-ground)<.35,`surface/eye mismatch ${hit.point.y-ground}m at ${t}`);
  }
 }finally{material?.dispose();cache.dispose();}
});
