// Numeric and behavioural tests for lesson 2's practice: "קוראים את המפה" (cartography-practice).
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/cartography-practice.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

const M = await import('../../src/components/lessons/topic-02/cartography-practice/practiceModel.ts');
const T = await import('../../src/components/lessons/topic-02/cartography-practice/practiceTerrain.ts');

const SC = Array.from({ length: M.SCENARIO_COUNT }, (_, i) => M.scenario(i));
const run = (actions, s = M.initialState()) => actions.reduce(M.reducer, s);
const close = (a, b, eps, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≉ ${b} (±${eps})`);
const inside = (p, ring) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const distToPolyline = (p, line) => {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1];
    const [bx, by] = line[i];
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * (bx - ax) + (p[1] - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
    best = Math.min(best, Math.hypot(p[0] - (ax + t * (bx - ax)), p[1] - (ay + t * (by - ay))));
  }
  return best;
};

// ---------------------------------------------------------------- one data source

test('two fixed scenarios, every number of the map from the same model', () => {
  assert.equal(SC.length, 2);
  for (const sc of SC) {
    // contours lie on their levels (linear interpolation on the sample grid: within a fraction of the interval)
    for (const lv of sc.contours)
      for (const line of lv.lines)
        for (let i = 0; i < line.length; i += 7) close(T.heightAt(sc.terrain, ...line[i]), lv.level, sc.interval * 0.08, `${sc.id} contour ${lv.level}`);
    // levels are the multiples of the interval between the lowest and highest ground
    const levels = sc.contours.map((c) => c.level);
    for (const l of levels) assert.equal(l % sc.interval, 0);
    for (const lv of sc.contours) assert.equal(lv.index, lv.level % (sc.interval * sc.indexEvery) === 0);
    // spot heights are real tops (no higher ground within 60 m)
    for (const t of sc.tops)
      for (let a = 0; a < 360; a += 30) assert.ok(T.heightAt(sc.terrain, t.at[0] + 60 * Math.cos((a * Math.PI) / 180), t.at[1] + 60 * Math.sin((a * Math.PI) / 180)) < t.z, `${sc.id} top`);
    // no top sits just above a level (that would draw a speck of a ring around it)
    for (const t of sc.tops) assert.ok(t.z % sc.interval > sc.interval * 0.3, `${sc.id} top ${t.z.toFixed(1)} clear of its highest contour`);
    // the sheet is 200 × 150 mm at the scenario's scale
    close((sc.ground.w * 1000) / sc.denominator, 200, 1e-9);
    close((sc.ground.h * 1000) / sc.denominator, 150, 1e-9);
  }
});

// ---------------------------------------------------------------- task 1: relief

test('task 1: exactly one relief element; it is read from the contours, the others sit on cover symbols', () => {
  for (const sc of SC) {
    const relief = sc.marks.filter((m) => M.reliefVerdict(sc, m.letter) === 'right');
    assert.equal(relief.length, 1, `${sc.id}: one right mark`);
    assert.equal(relief[0].letter, sc.reliefAnswer);
    assert.equal(sc.marks.length, 3);
    for (const m of sc.marks) {
      const [gx, gy] = T.gradientAt(sc.terrain, ...m.at);
      if (m.kind === 'dome') {
        assert.ok(Math.hypot(gx, gy) < 1e-3, 'dome mark on the top');
        // the highest contour around it is a closed ring that holds the mark
        const lv = sc.contours.filter((c) => c.level < T.heightAt(sc.terrain, ...m.at)).at(-1);
        const ring = lv.lines.find((l) => inside(m.at, l));
        assert.ok(ring && T.dist(ring[0], ring.at(-1)) < 1e-6, `${sc.id}: closed contour ${lv.level} around the dome`);
      } else if (m.kind === 'saddle') {
        assert.ok(Math.hypot(gx, gy) < 1e-3, 'saddle mark on a critical point');
        // higher towards both tops, lower across
        const [p, q] = sc.tops.map((t) => t.at);
        const u = [(q[0] - p[0]) / T.dist(p, q), (q[1] - p[1]) / T.dist(p, q)];
        const z0 = T.heightAt(sc.terrain, ...m.at);
        const z = (dx, dy) => T.heightAt(sc.terrain, m.at[0] + dx, m.at[1] + dy);
        assert.ok(z(u[0] * 80, u[1] * 80) > z0 && z(-u[0] * 80, -u[1] * 80) > z0, 'rises towards both tops');
        assert.ok(z(-u[1] * 80, u[0] * 80) < z0 && z(u[1] * 80, -u[0] * 80) < z0, 'falls across the pass');
        // two separate closed groups of contours above it
        const above = sc.contours.find((c) => c.level > z0);
        const holders = sc.tops.map((t) => above.lines.findIndex((l) => inside(t.at, l)));
        assert.ok(holders.every((h) => h >= 0) && holders[0] !== holders[1], `${sc.id}: the tops sit in different rings of ${above.level}`);
      } else {
        // cover: on its symbol, far from tops and passes (no reading as a landform)
        if (m.kind === 'grove') assert.ok(sc.cover.groves.some((g) => inside(m.at, g)));
        if (m.kind === 'orchard') assert.ok(sc.cover.orchards.some((g) => inside(m.at, g)));
        if (m.kind === 'building') assert.ok(sc.cover.buildings.some((b) => T.dist(b.at, m.at) < 1));
        if (m.kind === 'road') assert.ok(sc.cover.roads.some((r) => distToPolyline(m.at, r) < 5));
        for (const t of sc.tops) assert.ok(T.dist(t.at, m.at) > 500, `${sc.id} ${m.kind} away from tops`);
        assert.ok(Math.hypot(gx, gy) < 0.12, `${sc.id} ${m.kind} on gentle ground (${Math.hypot(gx, gy).toFixed(3)})`);
      }
    }
  }
  // the second scenario changes the elements and the place, not only the letter
  assert.notEqual(SC[0].reliefAnswer, SC[1].reliefAnswer);
  assert.notDeepEqual(SC[0].marks.map((m) => m.kind).sort(), SC[1].marks.map((m) => m.kind).sort());
});

// ---------------------------------------------------------------- task 2: slopes

test('task 2: same height difference and interval, different horizontal distance, one clear answer', () => {
  for (const sc of SC) {
    const [lo, hi] = sc.slope.levels;
    assert.equal(lo % sc.interval, 0);
    assert.equal(hi % sc.interval, 0);
    for (const s of sc.segments) {
      close(T.heightAt(sc.terrain, ...s.a), hi, 0.01, `${sc.id} seg ${s.id} upper end`);
      close(T.heightAt(sc.terrain, ...s.b), lo, 0.01, `${sc.id} seg ${s.id} lower end`);
      const prof = T.profile(sc.terrain, s.a, s.b);
      for (let i = 1; i < prof.length; i++) assert.ok(prof[i] < prof[i - 1], `${sc.id} seg ${s.id} falls steadily`);
      // the same number of contour lines crosses each segment
      const crossed = sc.contours.filter((c) => c.level >= lo && c.level <= hi).length;
      assert.equal(crossed, (hi - lo) / sc.interval + 1);
      // inside the sheet
      for (const p of [s.a, s.b]) assert.ok(p[0] > 0 && p[0] < sc.ground.w && p[1] > 0 && p[1] < sc.ground.h);
    }
    const [g, o] = [sc.segments.find((s) => s.id === sc.slopeAnswer), sc.segments.find((s) => s.id !== sc.slopeAnswer)];
    assert.ok(g.length / o.length > 1.8, `${sc.id}: gentle ${g.length.toFixed(0)} m vs steep ${o.length.toFixed(0)} m`);
    // both long enough to read on the sheet (≥ 15 mm)
    for (const s of sc.segments) assert.ok((s.length * 1000) / sc.denominator >= 15, `${sc.id} seg ${s.id} ${(s.length * 1000) / sc.denominator} mm`);
    assert.equal(M.slopeVerdict(sc, g.id), 'right');
    assert.equal(M.slopeVerdict(sc, o.id), 'steeper');
  }
  assert.notEqual(SC[0].slopeAnswer, SC[1].slopeAnswer);
});

// ---------------------------------------------------------------- task 3: distance

test('task 3: the distance follows from the map geometry and its scale; convenient values', () => {
  for (const sc of SC) {
    const { metres, cm, tolerance } = sc.ground3;
    close(metres, T.dist(sc.distance.a, sc.distance.b), 1e-9);
    close(cm, (metres * 100) / sc.denominator, 1e-9);
    assert.equal(Math.round(metres) % 100, 0, 'whole hundreds of metres');
    assert.equal(Math.round(cm * 2) / 2, cm, 'ruler reading on a half cm');
    close(tolerance, (M.READ_MM / 1000) * sc.denominator, 1e-9);
    assert.equal(sc.mPerCm, sc.denominator / 100);
  }
  assert.notEqual(SC[0].ground3.metres, SC[1].ground3.metres);
  assert.notEqual(SC[0].denominator, SC[1].denominator);
});

test('task 3: the feedback tells units, scale and a far estimate apart; only the right range passes', () => {
  for (const sc of SC) {
    const { metres: D, cm, tolerance: T_ } = sc.ground3;
    assert.equal(M.distanceVerdict(sc, D), 'right');
    assert.equal(M.distanceVerdict(sc, D + T_), 'right');
    assert.equal(M.distanceVerdict(sc, D - T_), 'right');
    assert.notEqual(M.distanceVerdict(sc, D + T_ + 1), 'right');
    assert.notEqual(M.distanceVerdict(sc, D - T_ - 1), 'right');
    assert.equal(M.distanceVerdict(sc, cm), 'map-cm');
    assert.equal(M.distanceVerdict(sc, D / 1000), 'units-km');
    assert.equal(M.distanceVerdict(sc, D * 100), 'units-cm');
    assert.equal(M.distanceVerdict(sc, D * 10), 'scale');
    assert.equal(M.distanceVerdict(sc, D / 10), 'scale');
    assert.equal(M.distanceVerdict(sc, D * 2), 'scale');
    assert.equal(M.distanceVerdict(sc, D / 2), 'scale');
    assert.equal(M.distanceVerdict(sc, D * 1.5), 'far');
    assert.equal(M.distanceVerdict(sc, D * 0.7), 'far');
  }
  // the other scenario's scale reads as a scale mistake
  assert.equal(M.distanceVerdict(SC[0], SC[0].ground3.cm * SC[1].mPerCm), 'scale');
  assert.equal(M.distanceVerdict(SC[1], SC[1].ground3.cm * SC[0].mPerCm), 'scale');
  // typed forms
  assert.equal(M.parseMetres('800'), 800);
  assert.equal(M.parseMetres('1,800'), 1800);
  assert.equal(M.parseMetres(' 800 מ׳'), 800);
  assert.equal(M.parseMetres('0.8'), 0.8);
  assert.equal(M.parseMetres('8oo'), null);
  assert.equal(M.parseMetres(''), null);
  assert.equal(M.normalise('distance', '800.0'), M.normalise('distance', '800'));
});

// ---------------------------------------------------------------- task 4: location

test('task 4: the point is on a grid intersection; one reading matches it; the distractors are real reading errors', () => {
  for (const sc of SC) {
    assert.equal(sc.location.at[0] % sc.gridStep, 0);
    assert.equal(sc.location.at[1] % sc.gridStep, 0);
    assert.ok(sc.gridE.includes(sc.point.E) && sc.gridN.includes(sc.point.N), 'its lines are labelled on the frame');
    assert.ok(sc.point.E > sc.gridE[0] && sc.point.E < sc.gridE.at(-1) && sc.point.N > sc.gridN[0] && sc.point.N < sc.gridN.at(-1), 'inside the sheet');
    // frame labels from the model: every grid step, full metres, UTM-valid ranges
    for (let i = 1; i < sc.gridE.length; i++) assert.equal(sc.gridE[i] - sc.gridE[i - 1], sc.gridStep);
    for (const e of sc.gridE) assert.ok(e > 166_000 && e < 834_000);
    for (const n of sc.gridN) assert.ok(n > 0 && n < 9_330_000);
    const right = sc.readings.filter((r) => M.locationVerdict(sc, r.letter) === 'right');
    assert.equal(right.length, 1);
    assert.equal(right[0].letter, sc.locationAnswer);
    assert.equal(right[0].text, `WGS84 · UTM 36N · E ${sc.point.E} · N ${sc.point.N}`);
    // one format, similar length
    const lens = sc.readings.map((r) => r.text.length);
    assert.ok(Math.max(...lens) - Math.min(...lens) <= 1, `${sc.id} lengths ${lens}`);
    for (const r of sc.readings) assert.match(r.text, /^WGS84 · UTM 36[NS] · E \d{6,7} · N \d{6,7}$/);
    // a guess by majority (per slot) never lands on the answer
    const slots = sc.readings.map((r) => r.text.split(' · '));
    const vote = slots[0].map((_, k) => {
      const count = new Map();
      for (const s of slots) count.set(s[k], (count.get(s[k]) ?? 0) + 1);
      const best = [...count.entries()].sort((a, b) => b[1] - a[1]);
      return best[0][1] > 1 ? best[0][0] : null;
    });
    const guess = sc.readings.find((r, i) => vote.every((v, k) => v === null || slots[i][k] === v));
    assert.ok(!guess || guess.letter !== sc.locationAnswer, `${sc.id}: the majority guess is not the answer`);
  }
  // the verdicts the feedback explains
  assert.deepEqual(SC[0].readings.map((r) => M.locationVerdict(SC[0], r.letter)).sort(), ['adjacent-E', 'hemisphere', 'right'].sort());
  assert.deepEqual(SC[1].readings.map((r) => M.locationVerdict(SC[1], r.letter)).sort(), ['adjacent-N', 'right', 'swap'].sort());
  assert.notEqual(SC[0].locationAnswer, SC[1].locationAnswer);
});

// ---------------------------------------------------------------- feedback and help

test('selecting is not answering; a verdict only after a check, and only for the answer checked', () => {
  const sc = SC[0];
  const wrong = sc.marks.find((m) => m.letter !== sc.reliefAnswer).letter;
  let s = run([{ type: 'answer', task: 'relief', value: wrong }]);
  assert.equal(s.tasks.relief.checked, null);
  assert.equal(M.shownVerdict('relief', s.tasks.relief), null);
  s = M.reducer(s, { type: 'check', task: 'relief' });
  assert.equal(M.shownVerdict('relief', s.tasks.relief), 'cover-natural');
  // a changed answer carries no mark of the previous check
  s = M.reducer(s, { type: 'answer', task: 'relief', value: sc.reliefAnswer });
  assert.equal(M.shownVerdict('relief', s.tasks.relief), null);
  assert.equal(s.tasks.relief.outcome, null, 'no auto-advance, no auto-check');
  s = M.reducer(s, { type: 'check', task: 'relief' });
  assert.equal(s.tasks.relief.outcome, 'right');
  assert.equal(s.step, 0, 'no automatic move to the next step');
  assert.equal(M.resultOf(s.tasks.relief), 'self', 'a correction after feedback is still on one\'s own');
});

test('help: hint after the first wrong; solution after two different wrongs or after the hint; the same answer again is not a new try', () => {
  const sc = SC[0];
  const t = () => s.tasks.distance;
  let s = run([{ type: 'goto', step: 0 }]);
  s = run([{ type: 'answer', task: 'distance', value: '8' }, { type: 'check', task: 'distance' }], s);
  assert.equal(M.shownVerdict('distance', t()), 'map-cm');
  assert.deepEqual(M.helpOffer(t()), { hint: true, solve: false });
  const before = s;
  s = M.reducer(s, { type: 'check', task: 'distance' });
  assert.equal(s, before, 'the same answer re-checked changes nothing');
  s = run([{ type: 'answer', task: 'distance', value: '8.0' }, { type: 'check', task: 'distance' }], s);
  assert.equal(t().wrong.length, 1, '8.0 is the same answer as 8');
  s = run([{ type: 'answer', task: 'distance', value: '0.8' }, { type: 'check', task: 'distance' }], s);
  assert.equal(M.shownVerdict('distance', t()), 'units-km');
  assert.deepEqual(M.helpOffer(t()), { hint: true, solve: true }, 'two different wrong answers');
  // back to an earlier wrong answer: still two
  s = run([{ type: 'answer', task: 'distance', value: '8' }, { type: 'check', task: 'distance' }], s);
  assert.equal(t().wrong.length, 2);
  // the solution only on request
  assert.equal(t().outcome, null);
  s = M.reducer(s, { type: 'solve', task: 'distance' });
  assert.equal(t().outcome, 'solution');
  assert.equal(M.normalise('distance', t().answer), String(sc.ground3.metres));
  assert.equal(M.resultOf(t()), 'solution');

  // the hint alone opens the solution
  let h = run([{ type: 'answer', task: 'slope', value: SC[0].segments.find((x) => x.id !== SC[0].slopeAnswer).id }, { type: 'check', task: 'slope' }]);
  assert.deepEqual(M.helpOffer(h.tasks.slope), { hint: true, solve: false });
  h = M.reducer(h, { type: 'hint', task: 'slope' });
  assert.deepEqual(M.helpOffer(h.tasks.slope), { hint: false, solve: true });
  h = run([{ type: 'answer', task: 'slope', value: SC[0].slopeAnswer }, { type: 'check', task: 'slope' }], h);
  assert.equal(M.resultOf(h.tasks.slope), 'hint');
  // nothing offered before a wrong check; solving before the offer is refused
  const fresh = M.initialState();
  assert.deepEqual(M.helpOffer(fresh.tasks.relief), { hint: false, solve: false });
  assert.equal(M.reducer(fresh, { type: 'solve', task: 'relief' }), fresh);
  assert.equal(M.reducer(fresh, { type: 'hint', task: 'relief' }), fresh);
  // an empty or unreadable answer is not checked
  assert.equal(M.reducer(fresh, { type: 'check', task: 'relief' }), fresh);
  const junk = run([{ type: 'answer', task: 'distance', value: 'abc' }]);
  assert.equal(M.reducer(junk, { type: 'check', task: 'distance' }), junk);
});

test('steps: forward only after a task is done; going back keeps its answer and feedback; restart and another scenario', () => {
  const sc = SC[0];
  let s = M.initialState();
  assert.equal(M.reducer(s, { type: 'goto', step: 1 }), s, 'step 2 is closed until step 1 is done');
  s = run([{ type: 'answer', task: 'relief', value: sc.reliefAnswer }, { type: 'check', task: 'relief' }, { type: 'goto', step: 1 }], s);
  assert.equal(s.step, 1);
  s = run([{ type: 'answer', task: 'slope', value: sc.segments.find((x) => x.id !== sc.slopeAnswer).id }, { type: 'check', task: 'slope' }, { type: 'goto', step: 0 }], s);
  assert.equal(s.step, 0);
  assert.equal(s.tasks.relief.outcome, 'right');
  s = M.reducer(s, { type: 'goto', step: 1 });
  assert.equal(M.shownVerdict('slope', s.tasks.slope), 'steeper', 'its wrong check is still shown');
  assert.equal(M.reducer(s, { type: 'goto', step: 2 }), s, 'step 3 stays closed');
  // a locked right answer cannot be changed
  const r = run([{ type: 'goto', step: 0 }, { type: 'answer', task: 'relief', value: 'א' }], s);
  assert.equal(r.tasks.relief.answer, sc.reliefAnswer);
  // all four, then the summary
  const all = (i) => {
    const c = SC[i];
    return run(
      [
        { type: 'answer', task: 'relief', value: c.reliefAnswer }, { type: 'check', task: 'relief' }, { type: 'goto', step: 1 },
        { type: 'answer', task: 'slope', value: c.slopeAnswer }, { type: 'check', task: 'slope' }, { type: 'goto', step: 2 },
        { type: 'answer', task: 'distance', value: String(c.ground3.metres) }, { type: 'check', task: 'distance' }, { type: 'goto', step: 3 },
        { type: 'answer', task: 'location', value: c.locationAnswer }, { type: 'check', task: 'location' }, { type: 'goto', step: 4 },
      ],
      M.initialState(i),
    );
  };
  for (const i of [0, 1]) {
    const done = all(i);
    assert.equal(done.step, 4);
    assert.deepEqual(M.TASKS.map((t) => M.resultOf(done.tasks[t])), ['self', 'self', 'self', 'self']);
    const again = M.reducer(done, { type: 'restart' });
    assert.deepEqual(again, M.initialState(i));
    const next = M.reducer(done, { type: 'nextScenario' });
    assert.deepEqual(next, M.initialState((i + 1) % 2));
  }
});
