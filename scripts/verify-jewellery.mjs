import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VARIANTS, cardFrame, flightLift } from '../lib/store.js';
import { createNecklaceRig } from '../components/three/necklaceRig.js';
import { cardReport, sampleInstances, surfaceReport } from '../components/three/necklaceChecks.js';

const material = new THREE.MeshBasicMaterial();
const results = [];
assert.equal(new Set(VARIANTS.map((p) => `${p.style}-${p.length}`)).size, VARIANTS.length, 'Every style/length pairing is unique');
for (const piece of VARIANTS) {
  for (const key of ['id', 'name', 'style', 'length', 'metal', 'gem', 'gem2', 'emissive', 'stone', 'carat', 'price', 'model', 'note']) assert.ok(piece[key], `${piece.id}: ${key}`);
  const rig = createNecklaceRig({ gold: material });
  rig.setPiece(piece); rig.layout(1);
  const fit = rig.inspect(), surface = surfaceReport(rig), card = cardReport(rig, cardFrame(piece.length));
  assert.equal(surface.penetrations, 0, `${piece.id}: rendered vertices intersect the bust`);
  assert.ok(surface.minimum >= 0.025, `${piece.id}: physical surface clearance`);
  assert.equal(fit.penetrations, 0, `${piece.id}: template intersects the bust`);
  assert.ok(fit.fitsBox, `${piece.id}: folded assembly exceeds the case`);
  assert.ok(card.fits, `${piece.id}: card clips at its maximum sway`);
  assert.ok(fit.batches < 150, `${piece.id}: batch budget`);
  const previewRig = createNecklaceRig({ gold: material });
  previewRig.setPiece(piece, 'card'); previewRig.layout(1);
  assert.equal(surfaceReport(previewRig).penetrations, 0, `${piece.id}: preview surface`);
  assert.ok(cardReport(previewRig, cardFrame(piece.length)).fits, `${piece.id}: preview framing`);
  assert.ok(previewRig.inspect().fitsBox, `${piece.id}: preview case fit`);
  previewRig.dispose();
  for (const time of [0, 1, 2, 3, 4]) {
    rig.sway(time, 1);
    assert.equal(surfaceReport(rig).penetrations, 0, `${piece.id}: swinging fringe intersects the bust`);
  }
  for (const fraction of [0.1, 0.3, 0.6, 1]) assert.equal(surfaceReport(rig, flightLift(piece.length) * fraction).penetrations, 0, `${piece.id}: vertical lift intersects the bust`);
  rig.layout(0); rig.sway(0, 0);
  let bottom = Infinity, top = -Infinity;
  sampleInstances(rig.group, (p) => { bottom = Math.min(bottom, p.y - 0.55); top = Math.max(top, p.y - 0.55); });
  assert.ok(bottom > -0.565, `${piece.id}: below the velvet bed`);
  assert.ok(top < -0.203, `${piece.id}: intersects the closed lid`);
  results.push({ id: piece.id, batches: fit.batches, instances: fit.instances, clearance: Number(surface.minimum.toFixed(4)), cardExtent: Number(Math.max(...card.max, ...card.min.map(Math.abs)).toFixed(3)), fitsBox: fit.fitsBox });
  rig.dispose();
}
material.dispose();
console.table(results);
console.log('PASS: 16 combinations, actual geometry, fringe sway, lift clearance, card framing, case floor and closed lid.');
