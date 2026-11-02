import test from 'node:test';
import assert from 'node:assert/strict';
const M=await import('../../src/components/lessons/topic-06/route-story/workbenchModel.ts');
const choose=(field,value)=>({type:'answer',field,value});
const run=actions=>actions.reduce(M.workbenchReducer,M.INITIAL_WORKBENCH);
const solved=(i)=>[choose('az',[35,65,50,40][i]),choose('m',[500,700,500,600][i]),choose('end',M.LEG_ENDS[i]),{type:'check'}];
test('starts at first leg with all four answer cards empty; check and next guarded',()=>{
 const h=run([{type:'check'},{type:'next'}]);assert.equal(h.present.selectedLeg,0);
 for(const l of h.present.legs){assert.deepEqual(l.answer,{az:null,m:null,end:null});assert.equal(l.checked,null);assert.equal(l.done,false);}
});
test('each leg validates its own direction length and end; route completes only after four',()=>{
 let h=M.INITIAL_WORKBENCH;
 for(let i=0;i<4;i++) {h=solved(i).reduce(M.workbenchReducer,h);assert.equal(h.present.legs[i].done,true);assert.equal(M.routeComplete(h.present),i===3);h=M.workbenchReducer(h,{type:'next'});assert.equal(h.present.selectedLeg,Math.min(i+1,3));}
});
test('answers from another leg fail and feedback names current endpoints',()=>{
 const h=run([{type:'leg',index:1},...solved(0)]);assert.equal(h.present.legs[1].done,false);
 assert.equal(M.fieldVerdict(h.present,'az'),'wrong');assert.match(M.feedback(h.present,'az'),/נקודה 2/);assert.match(M.feedback(h.present,'az'),/נקודה 3/);
 const edited=M.workbenchReducer(h,choose('az',65));assert.equal(M.fieldVerdict(edited.present,'az'),null);assert.equal(M.fieldVerdict(edited.present,'end'),'wrong');
});
test('switching preserves separate partial work and completion; reset undo restores whole route',()=>{
 const h=run([...solved(0),{type:'next'},choose('az',65),{type:'leg',index:0},{type:'leg',index:1},{type:'reset'},{type:'undo'}]);
 assert.equal(h.present.legs[0].done,true);assert.equal(h.present.legs[1].answer.az,65);assert.equal(h.present.legs[1].answer.m,null);assert.equal(h.present.selectedLeg,1);
});
test('invalid numeric values and invalid selection cannot enter state',()=>{
 for(const value of [NaN,Infinity,-1,361])assert.equal(run([choose('az',value)]).present.legs[0].answer.az,null);
 assert.equal(run([choose('m',-20)]).present.legs[0].answer.m,null);
 for(const index of [-1,4,NaN,0.5])assert.equal(run([{type:'leg',index}]).present.selectedLeg,0);
});
test('tolerance applies to all legs without accepting incomplete answers',()=>{
 for(let i=0;i<4;i++)for(const [da,dm,expected] of [[-3,-35,true],[3,35,true],[-4,0,false],[4,0,false],[0,-36,false],[0,36,false]]){
 const h=run([{type:'leg',index:i},choose('az',[35,65,50,40][i]+da),choose('m',[500,700,500,600][i]+dm),choose('end',M.LEG_ENDS[i]),{type:'check'}]);assert.equal(h.present.legs[i].done,expected);
 }
 assert.equal(run([choose('az',35),choose('m',500),{type:'check'}]).present.legs[0].checked,null);
});
test('completed leg locks edits; undo reverses check then last edit',()=>{
 let h=run([...solved(0),choose('m',300)]);assert.equal(h.present.legs[0].answer.m,500);
 h=M.workbenchReducer(h,{type:'undo'});assert.equal(h.present.legs[0].done,false);
 h=M.workbenchReducer(h,{type:'undo'});assert.equal(h.present.legs[0].answer.end,null);
});
// ---------------------------------------------------------------- map tools: one 100 m everywhere, nothing read out
const T=await import('../../src/components/lessons/topic-06/route-story/workbenchTools.ts');
const R=await import('../../src/components/lessons/topic-06/route-story/routeStoryModel.ts');
const near=(a,b,e=1e-9)=>Math.abs(a-b)<=e;
test('grid square, scale-bar segment and ruler division are the same 100 m on the map',()=>{
 assert.equal(T.GRID_M,100);assert.ok(near(T.GRID_U*R.M_PER_UNIT,100));
 for(const lines of [T.GRID_X,T.GRID_Y])for(let i=1;i<lines.length;i++)assert.ok(near(lines[i].at-lines[i-1].at,T.GRID_U,2e-3));
 assert.ok(near(T.SCALE_BAR_U/T.SCALE_BAR_SEGMENTS,T.GRID_U));assert.equal(T.SCALE_BAR_M,T.MAJOR_EVERY*T.GRID_M);
 const majors=T.RULER_TICKS.filter(t=>t.major);for(let i=1;i<majors.length;i++)assert.ok(near(majors[i].u-majors[i-1].u,T.GRID_U));
 assert.ok(near(T.RULER_U*R.M_PER_UNIT,T.RULER_M));assert.ok(T.RULER_M>Math.max(...R.LEGS.map(l=>l.m)));
 // נ.ה sits on a major intersection; every fifth line is major
 assert.ok(T.GRID_X.some(l=>l.major&&near(l.at,R.START.x,1e-3)));assert.ok(T.GRID_Y.some(l=>l.major&&near(l.at,R.START.y,1e-3)));
 for(const [lines,o] of [[T.GRID_X,R.START.x],[T.GRID_Y,R.START.y]])for(const l of lines){const k=Math.round((l.at-o)/T.GRID_U);assert.equal(l.major,k%5===0,`line ${l.at}`);}
});
test('each leg measures its stated length and bearing on the map',()=>{
 for(let i=0;i<4;i++){const a=R.POINT_XY[i],b=R.POINT_XY[i+1];assert.ok(Math.abs(R.dist(a,b)*R.M_PER_UNIT-R.LEGS[i].m)<1);assert.ok(Math.abs(T.aimAt(a,b)-R.LEGS[i].az)<.1);}
});
test('tools start off the route and never on a point; dropped near a point they land on it',()=>{
 for(const pose of [T.PARKED.protractor,T.PARKED.ruler]){assert.equal(T.snapPoint(pose.at),null);for(const p of R.POINT_XY)assert.ok(R.dist(pose.at,p)>T.SNAP_U*3);}
 // the parked protractor's ring keeps clear of every point marker (2.55 units)
 for(const p of R.POINT_XY)assert.ok(R.dist(T.PARKED.protractor.at,p)>T.PROTRACTOR_R+2.55);
 assert.equal(T.PARKED.protractor.az,0);
 const p3=R.POINT_XY[2];assert.deepEqual(T.snap({x:p3.x+1.1,y:p3.y-.8}),p3);
 const off={x:p3.x+2,y:p3.y};assert.deepEqual(T.snap(off),off);
 assert.deepEqual(T.clampToBox({x:-99,y:999}),{x:T.BOX.x,y:T.BOX.y+T.BOX.height});
});
test('turning a tool follows the handle exactly — no snapping to the answer',()=>{
 const at=R.POINT_XY[3];for(const az of [0,37.4,41,222.2,359.6]){const tip=T.armTip({at,az},20);assert.ok(Math.abs(T.aimAt(at,tip)-az)<.05);}
 assert.equal(T.norm360(-5),355);assert.equal(T.norm360(725),5);
});
test('protractor: 360 graduations, numbers every 10° clockwise from north',()=>{
 assert.equal(T.PROTRACTOR_TICKS.length,360);assert.equal(T.PROTRACTOR_TICKS.filter(t=>t.kind==='ten').length,36);assert.equal(T.PROTRACTOR_TICKS.filter(t=>t.kind==='five').length,36);
 const tip=T.armTip({at:{x:0,y:0},az:90},10);assert.ok(near(tip.x,10,1e-6)&&near(tip.y,0,1e-6)); // 90° is east (clockwise from north)
});
test('azimuth feedback names the reverse bearing and the anticlockwise reading; reset is counted for the map',()=>{
 const wrong=(az)=>run([{type:'leg',index:1},choose('az',az),choose('m',700),choose('end','saddle'),{type:'check'}]).present;
 assert.match(M.feedback(wrong(245),'az'),/ההפוך/);assert.match(M.feedback(wrong(295),'az'),/נגד כיוון השעון/);assert.doesNotMatch(M.feedback(wrong(120),'az'),/ההפוך|נגד כיוון/);
 assert.equal(M.fieldVerdict(wrong(67),'az'),'right');
 assert.match(M.feedback(run([choose('m',900),choose('az',35),choose('end','stream-bend'),{type:'check'}]).present,'m'),/משבצת/);
 assert.equal(run([{type:'reset'}]).present.resets,1);assert.equal(M.INITIAL_WORKBENCH.present.resets,0);
});
