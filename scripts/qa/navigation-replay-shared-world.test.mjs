import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/components/lessons/topic-06/navigation-replay/replayTerrain.ts';
import * as W from '../../src/components/lessons/topic-06/navigation-replay/replayWorld.ts';
import * as S from '../../src/components/lessons/topic-06/navigation-replay/replayScenario.ts';
import * as P from '../../src/components/lessons/topic-06/planning-lab/planningLabTerrain.ts';
import { exampleNodes } from '../../src/components/lessons/topic-06/planning-lab/planningLabState.ts';
import {shrubDensity} from '../../src/components/lessons/topic-06/navigation-replay/replayScatter.ts';
import * as VS from '../../src/components/lessons/topic-06/navigation-replay/replayViewStore.ts';
import {replayTrees} from '../../src/components/lessons/topic-06/navigation-replay/replayLandmarks.ts';
import * as G from '../../src/components/lessons/topic-06/navigation-replay/replayGeography.ts';

test('replay ground is the planning lab ground at the same metric coordinates', () => {
  for (const [E,N] of [[200,300],[640,650],[500,800],[300,950],[900,500],[-200,1400]]) {
    assert.ok(Math.abs(T.heightAt(E-500,600-N)-P.heightAt(E,N)) < 0.001, `ground mismatch at ${E},${N}`);
  }
});

test('both summit centres are inside the opening view when the learner compares them', () => {
 for(const id of ['depart','enroute']){
   const m=S.momentById(id), eye=W.toWorld(m.truth.at);
   for(const peak of [G.SUMMIT_N,G.SUMMIT_S]){
     const point=W.toWorld(peak), bearing=W.bearingW(eye,point);
     assert.ok(Math.abs(W.turnDeg(m.view.yawDeg,bearing))<38,`${id}: summit is outside the opening frame`);
     const elevation=Math.atan2(T.heightAt(point.x,point.z)-T.groundAt(eye.x,eye.z)-1.7,W.distW(eye,point))*180/Math.PI;
     const halfVertical=VS.verticalFovForAspect(VS.DEFAULT_VFOV,690/330)/2;
     assert.ok(Math.abs(elevation-m.view.pitchDeg)<halfVertical,`${id}: summit outside vertical frame`);
   }
 }
});

test('station material grid retains the lab ravine, not just the main stream', async () => {
 const x=658.7-500,z=600-505.38;
 const grid=await T.buildGrid(x,z,10,2,true);
 const station=new T.StationTerrain([grid]);
 assert.ok(Math.abs(station.stream(x,z)-T.surfaceAt(x,z).streamD)<1,'ravine mask must agree with the map');
});

test('the map crop includes the whole identified stream marker', () => {
 assert.ok(G.REPLAY_MAP_VIEW,'shared map crop');
 const b=G.REPLAY_MAP_VIEW;
 assert.ok(G.P1.y+2.1<=b.y+b.h&&G.P1.x-2.1>=b.x,'the fix ring must not be cut off');
});

test('woodland and orchard landmarks keep the lab positions and crown dimensions', () => {
 const shared=P.trees(), replay=replayTrees(); assert.equal(shared.length,replay.length);
 shared.forEach((t,i)=>{assert.ok(Math.abs(replay[i].x+500-t.E)<1e-9);assert.ok(Math.abs(600-replay[i].z-t.N)<1e-9);assert.deepEqual(replay[i].crown,P.crownShape(t));});
 assert.ok(replay.some(t=>t.group==='woodland'&&t.E<300));
});

test('camera keeps a natural 80 degree horizontal view when the frame or fullscreen aspect changes', () => {
  assert.equal(typeof VS.verticalFovForAspect,'function');
  for(const aspect of [1.3,1.78,2.1,3]) {
    const v=VS.verticalFovForAspect(VS.DEFAULT_VFOV,aspect);
    const horizontal=2*Math.atan(Math.tan(v*Math.PI/360)*aspect)*180/Math.PI;
    assert.ok(Math.abs(horizontal-80)<1e-8);
  }
});

test('vegetation has real clearings as well as dense patches away from roads and water', () => {
  const d=[];for(let z=-700;z<700;z+=27)for(let x=-600;x<600;x+=31)d.push(shrubDensity(x,z,500,500));
  d.sort((a,b)=>a-b);
  assert.ok(d[Math.floor(d.length*.1)]<.04, 'the open ground must not have a uniform shrub floor');
  assert.ok(d[Math.floor(d.length*.9)]>.5, 'retain dense coherent habitat patches');
});

test('identified replay stations are checkpoints of the lab example, not a second world', () => {
  const nodes=exampleNodes();
  for (const [id,feature] of [['depart','stream'],['after','saddle']]) {
    const at=W.toWorld(S.momentById(id).lastFix.at);
    const n=nodes.find(n=>n.feature===feature);
    assert.ok(Math.hypot(at.x+500-n.E,600-at.z-n.N)<0.01, `${feature} checkpoint mismatch`);
  }
  const at=W.toWorld(S.momentById('after').next.at);
  const n=nodes.find(n=>n.feature==='road');
  assert.ok(Math.hypot(at.x+500-n.E,600-at.z-n.N)<0.01, 'road checkpoint mismatch');
});
