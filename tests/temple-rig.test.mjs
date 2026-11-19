import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  brilliantGeo, bustGeo, templeCabochonGeo, templeCordBeadGeo, templeDropGeo,
  templeGranuleGeo, templeJointGeo, templeMedallion, templePeacock, templePendant, templeWireGeo,
} from '../components/three/assets.js';
import { createTempleRig, curvePoint, layoutTempleRig, writeTempleDrops, writeTempleInstances } from '../components/three/templeRig.js';

const material = new THREE.MeshBasicMaterial();
const batchGeometry = {
  peacocks: () => templePeacock().geometry, medallions: () => templeMedallion().geometry,
  primary: templeCabochonGeo, secondary: templeCabochonGeo, accents: brilliantGeo,
  granules: templeGranuleGeo, joints: templeJointGeo, cordBeads: templeCordBeadGeo,
};

function visit(mesh, callback) {
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3();
  const a = mesh.geometry.attributes.position;
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix);
    for (let j = 0; j < a.count; j++) callback(point.fromBufferAttribute(a, j).applyMatrix4(matrix));
  }
}

function visitRig(rig, callback) {
  for (const [key, geometry] of Object.entries(batchGeometry)) {
    const mesh = new THREE.InstancedMesh(geometry(), material, rig[key].length);
    writeTempleInstances(mesh, rig[key]); visit(mesh, callback); mesh.dispose();
  }
  const beads = new THREE.InstancedMesh(templeDropGeo(), material, rig.drops.length);
  const wires = new THREE.InstancedMesh(templeWireGeo(), material, rig.drops.length);
  writeTempleDrops(beads, wires, rig.drops, 0, rig.drape);
  visit(beads, callback); visit(wires, callback); beads.dispose(); wires.dispose();
  const point = new THREE.Vector3(), a = rig.cordGeometry.attributes.position;
  for (let i = 0; i < a.count; i++) callback(point.fromBufferAttribute(a, i));
}

test('the original fitting path retains its front, sides, back and flattened dimensions', () => {
  const p = new THREE.Vector3();
  for (const drape of [0, 0.07, 1, 1.25]) {
    assert.deepEqual(curvePoint(0, drape, p).toArray(), [0, 0, 1.08]);
    curvePoint(Math.PI, drape, p);
    assert.ok(Math.abs(p.x) < 1e-12);
    assert.equal(p.y, 2.25 * drape); assert.equal(p.z, -1);
    curvePoint(Math.PI / 2, drape, p); assert.equal(p.x, 1.36);
  }
});

test('relief geometry is cached, finite, bevelled and merged into one material batch', () => {
  for (const build of [templePeacock, templeMedallion, templePendant]) {
    const a = build(); assert.equal(a, build());
    assert.equal(a.geometry.groups.length, 0);
    for (const attr of Object.values(a.geometry.attributes)) assert.ok(attr.array.every(Number.isFinite));
    const colors = a.geometry.attributes.color.array;
    assert.ok(colors.some(value => value < 0.5), 'oxidised recesses exist');
    assert.ok(colors.some(value => value > 0.8), 'raised edges retain highlights');
  }
});

test('fifteen alternating segments have stable, right-handed tangent frames throughout draping', () => {
  const rig = createTempleRig();
  assert.equal(rig.segments.length, 15);
  assert.equal(rig.peacocks.length, 8); assert.equal(rig.medallions.length, 7);
  assert.equal(rig.drops.length + templePendant().drops.length, 95);
  const x = new THREE.Vector3(), y = new THREE.Vector3(), z = new THREE.Vector3();
  for (const drape of [0, 0.07, 0.3, 0.75, 1, 1.25]) {
    layoutTempleRig(rig, drape);
    for (const segment of rig.segments) {
      assert.ok(segment.frame.determinant() > 0);
      segment.frame.extractBasis(x, y, z);
      assert.ok(Math.abs(x.dot(y)) < 1e-9 && Math.abs(x.dot(z)) < 1e-9 && Math.abs(y.dot(z)) < 1e-9);
    }
    assert.ok(rig.cordGeometry.attributes.position.array.every(Number.isFinite));
  }
  rig.cordGeometry.dispose();
});

test('idle frames leave layout and geometry untouched; draping reuses the existing topology', () => {
  const rig = createTempleRig(); layoutTempleRig(rig, 1);
  const geometry = rig.cordGeometry, positions = geometry.attributes.position.array, index = geometry.index.array;
  const version = geometry.attributes.position.version, layoutVersion = rig.layoutVersion;
  for (let i = 0; i < 120; i++) assert.equal(layoutTempleRig(rig, 1), false);
  assert.equal(geometry.attributes.position.version, version); assert.equal(rig.layoutVersion, layoutVersion);
  layoutTempleRig(rig, 0);
  assert.equal(rig.cordGeometry, geometry); assert.equal(geometry.attributes.position.array, positions);
  assert.equal(geometry.index.array, index);
  geometry.dispose();
});

test('ghungroo motion is deterministic and comes to rest when laid flat', () => {
  const rig = createTempleRig(); layoutTempleRig(rig, 0);
  const beads = new THREE.InstancedMesh(templeDropGeo(), material, rig.drops.length);
  const wires = new THREE.InstancedMesh(templeWireGeo(), material, rig.drops.length);
  writeTempleDrops(beads, wires, rig.drops, 0, 0);
  const flat = beads.instanceMatrix.array.slice();
  writeTempleDrops(beads, wires, rig.drops, 100, 0); assert.deepEqual(beads.instanceMatrix.array, flat);
  writeTempleDrops(beads, wires, rig.drops, 2.5, 1); const moving = beads.instanceMatrix.array.slice();
  writeTempleDrops(beads, wires, rig.drops, 2.5, 1); assert.deepEqual(beads.instanceMatrix.array, moving);
  assert.notDeepEqual(moving, flat);
  beads.dispose(); wires.dispose(); rig.cordGeometry.dispose();
});

test('all worn motif, stone, cord and bead vertices clear the existing velvet bust', () => {
  const profile = bustGeo().parameters.points.filter(p => p.x > 0.5);
  const radius = y => {
    for (let i = 1; i < profile.length; i++) if (profile[i].y >= y) {
      const a = profile[i - 1], b = profile[i];
      return THREE.MathUtils.lerp(a.x, b.x, THREE.MathUtils.clamp((y - a.y) / (b.y - a.y || 1), 0, 1));
    }
    return 0;
  };
  const rig = createTempleRig(); layoutTempleRig(rig, 1);
  let minimum = Infinity;
  visitRig(rig, p => {
    const clearance = Math.hypot(p.x, (p.z + 0.04) / 0.27) - radius(p.y + 0.02);
    minimum = Math.min(minimum, clearance);
  });
  assert.ok(minimum >= -0.001, `bust penetration: ${minimum}`);
  rig.cordGeometry.dispose();
});

test('the complete flattened necklace fits the existing 3.7-unit case', () => {
  const rig = createTempleRig(); layoutTempleRig(rig, 0);
  const box = new THREE.Box3(), shifted = new THREE.Vector3();
  const add = p => box.expandByPoint(shifted.copy(p).add(new THREE.Vector3(0, -0.17, -0.42)));
  visitRig(rig, add);
  const pendant = templePendant(), matrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  matrix.setPosition(0, -0.015, 1.1);
  const point = new THREE.Vector3(), a = pendant.geometry.attributes.position;
  for (let i = 0; i < a.count; i++) add(point.fromBufferAttribute(a, i).applyMatrix4(matrix));
  const beads = new THREE.InstancedMesh(templeDropGeo(), material, pendant.drops.length);
  const wires = new THREE.InstancedMesh(templeWireGeo(), material, pendant.drops.length);
  writeTempleDrops(beads, wires, pendant.drops, 0, 0);
  visit(beads, p => add(p.applyMatrix4(matrix))); visit(wires, p => add(p.applyMatrix4(matrix)));
  assert.ok(box.min.x >= -1.85 && box.max.x <= 1.85);
  assert.ok(box.min.z >= -1.47 && box.max.z <= 2.23, JSON.stringify(box));
  assert.ok(box.min.y >= -0.23, 'jewellery stays above the case floor');
  beads.dispose(); wires.dispose(); rig.cordGeometry.dispose();
});
