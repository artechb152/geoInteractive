// Scanned-stone contract: replacing an asset must not change placement bounds, UVs or offline loading.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../public/assets/lessons/topic06/dead-reckoning/', import.meta.url);
test('weathered scan stones retain the eleven placement names, bounded geometry and embedded textures', () => {
  const data = readFileSync(new URL('rounded-rocks.glb', root));
  assert.equal(data.readUInt32LE(0), 0x46546c67);
  assert.equal(data.readUInt32LE(4), 2);
  const json = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString());
  const expected = ['stone_a', 'stone_b', 'stone_c', 'stone_d', 'stone_e', 'rock_a', 'rock_b', 'rock_c', 'rock_d', 'rock07_a', 'boulder_a'];
  for (const name of expected) {
    const node = json.nodes.find(n => n.name === name);
    assert.ok(node && node.mesh !== undefined, name);
    for (const primitive of json.meshes[node.mesh].primitives) {
      assert.ok(primitive.attributes.NORMAL !== undefined && primitive.attributes.TEXCOORD_0 !== undefined, `${name}: scan normals and UVs`);
      const position = json.accessors[primitive.attributes.POSITION];
      assert.ok(position.count > 60, `${name}: actual scanned relief`);
      assert.ok(Math.abs(position.min[1]) < 0.002, `${name}: grounded base`);
      assert.ok(position.max[1] > 0.02 && position.max[1] < 0.6, `${name}: metre scale`);
    }
  }
  assert.ok(json.images.length > 0);
  assert.ok(json.images.every(i => i.bufferView !== undefined), 'no runtime network dependency');
  assert.ok(data.length < 2_000_000, 'compact enough for the lesson');
});
