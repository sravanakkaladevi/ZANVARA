import * as THREE from 'three';
import { templeCordTemplate, templeMedallion, templePeacock } from './assets.js';

export const TEMPLE_SEGMENTS = 15;
const FRONT = 1.4;
const ARC_SAMPLES = 240;
const CORD_SAMPLES = 112;
const CORD_SIDES = 7;
const UP = new THREE.Vector3(0, 1, 0);
const p = new THREE.Vector3(), q = new THREE.Vector3(), tangent = new THREE.Vector3();
const normal = new THREE.Vector3(), vertical = new THREE.Vector3(), scale = new THREE.Vector3();
const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), euler = new THREE.Euler();

/* Original fitting path, unchanged: front theta=0, neck/back theta=PI. */
export function curvePoint(th, d, out) {
  const front = Math.pow((1 + Math.cos(th)) / 2, 1.6);
  return out.set(1.36 * Math.sin(th), d * 2.25 * (1 - front), 1.0 * Math.cos(th) + 0.08 * Math.pow((1 + Math.cos(th)) / 2, 10));
}

function frameAt(th, d, out, size = 1) {
  curvePoint(th, d, p);
  curvePoint(th + 0.0001, d, tangent);
  curvePoint(th - 0.0001, d, q);
  tangent.sub(q).normalize();
  // Surface gradient of the existing bust's 0.27-deep cross-section. This
  // keeps the lower fringe outside its widening shoulders at the sides.
  normal.set(p.x * 0.27 * 0.27, 0, p.z).normalize();
  // As the case closes, the relief faces up and its fringe points outward.
  const angle = Math.min(1, d) * Math.PI / 2;
  normal.multiplyScalar(Math.sin(angle)).addScaledVector(UP, Math.cos(angle));
  normal.addScaledVector(tangent, -normal.dot(tangent)).normalize();
  vertical.crossVectors(normal, tangent).normalize();
  out.makeBasis(tangent, vertical, normal).scale(scale.setScalar(size)).setPosition(p);
  return out;
}

export function createTempleRig() {
  const rig = {
    segments: [], peacocks: [], medallions: [], primary: [], secondary: [], accents: [], granules: [],
    joints: [], cordBeads: [], drops: [], length: new Float64Array(ARC_SAMPLES + 1),
    cordGeometry: templeCordTemplate().clone(),
    cordPoints: Array.from({ length: (CORD_SAMPLES + 1) * 2 }, () => new THREE.Vector3()),
    drape: -1, layoutVersion: 0,
  };
  rig.cordGeometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  rig.cordGeometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < TEMPLE_SEGMENTS; i++) {
    const kind = i % 2 === 0 ? 'peacocks' : 'medallions';
    const motif = kind === 'peacocks' ? templePeacock() : templeMedallion();
    const frame = new THREE.Matrix4();
    rig.segments.push({ frame, theta: 0 });
    rig[kind].push({ frame, position: [0, 0, 0], scale: [1, 1, 1] });
    for (const key of ['primary', 'secondary', 'accents', 'granules']) for (const item of motif[key]) rig[key].push({ ...item, frame });
    const count = i === 0 || i === TEMPLE_SEGMENTS - 1 ? 3 : 5;
    for (let j = 0; j < count; j++) {
      const x = j - (count - 1) / 2;
      rig.drops.push({ frame, position: [x * 0.047, -0.148, 0.04], length: 0.06 + (2 - Math.abs(x)) * 0.014, radius: 0.025, phase: i * 1.7 + j * 0.61 });
    }
  }
  for (let i = 0; i <= TEMPLE_SEGMENTS; i++) rig.joints.push({
    frame: new THREE.Matrix4(), position: [0, 0.035, 0.025], scale: [1, 0.82, 1],
  });
  for (let i = 0; i < 12; i++) rig.cordBeads.push({
    theta: FRONT + 0.08 + i / 11 * (Math.PI * 2 - FRONT * 2 - 0.16),
    frame: new THREE.Matrix4(), position: [0, 0, 0], scale: [1, 1, 1],
  });
  return rig;
}

function updateCord(rig, d) {
  const points = rig.cordPoints;
  for (let strand = 0; strand < 2; strand++) for (let i = 0; i <= CORD_SAMPLES; i++) {
    const u = i / CORD_SAMPLES;
    const th = FRONT + u * (Math.PI * 2 - FRONT * 2);
    curvePoint(th, d, p);
    curvePoint(th + 0.001, d, tangent); tangent.sub(p).normalize();
    normal.set(p.x, 0, p.z).normalize().addScaledVector(tangent, -normal.dot(tangent)).normalize();
    vertical.crossVectors(tangent, normal).normalize();
    const twist = u * Math.PI * 2 * 19 + strand * Math.PI;
    points[strand * (CORD_SAMPLES + 1) + i].copy(p)
      .addScaledVector(normal, Math.cos(twist) * 0.014)
      .addScaledVector(vertical, Math.sin(twist) * 0.014);
  }
  const positions = rig.cordGeometry.attributes.position;
  const normals = rig.cordGeometry.attributes.normal;
  let vertex = 0;
  for (let strand = 0; strand < 2; strand++) for (let i = 0; i <= CORD_SAMPLES; i++) {
    const offset = strand * (CORD_SAMPLES + 1);
    p.copy(points[offset + i]);
    tangent.copy(points[offset + Math.min(i + 1, CORD_SAMPLES)]).sub(points[offset + Math.max(0, i - 1)]).normalize();
    normal.set(p.x, 0, p.z).normalize().addScaledVector(tangent, -normal.dot(tangent)).normalize();
    vertical.crossVectors(tangent, normal).normalize();
    for (let j = 0; j <= CORD_SIDES; j++) {
      const angle = j / CORD_SIDES * Math.PI * 2;
      q.copy(normal).multiplyScalar(-Math.cos(angle)).addScaledVector(vertical, Math.sin(angle));
      positions.setXYZ(vertex, p.x + q.x * 0.018, p.y + q.y * 0.018, p.z + q.z * 0.018);
      normals.setXYZ(vertex++, q.x, q.y, q.z);
    }
  }
  positions.needsUpdate = normals.needsUpdate = true;
  rig.cordGeometry.computeBoundingSphere();
}

/* Updates existing buffers and matrices; never constructs geometry in a frame. */
export function layoutTempleRig(rig, drape) {
  const d = THREE.MathUtils.clamp(drape, 0, 1.25);
  if (Math.abs(d - rig.drape) <= 0.0005) return false;
  curvePoint(-FRONT, d, p);
  rig.length[0] = 0;
  for (let i = 1; i <= ARC_SAMPLES; i++) {
    curvePoint(-FRONT + i / ARC_SAMPLES * FRONT * 2, d, q);
    rig.length[i] = rig.length[i - 1] + p.distanceTo(q);
    p.copy(q);
  }
  let j = 0;
  for (let i = 0; i < TEMPLE_SEGMENTS; i++) {
    const target = (i + 0.5) / TEMPLE_SEGMENTS * rig.length[ARC_SAMPLES];
    while (j < ARC_SAMPLES - 1 && rig.length[j + 1] < target) j++;
    const f = (target - rig.length[j]) / (rig.length[j + 1] - rig.length[j] || 1);
    const th = -FRONT + (j + f) / ARC_SAMPLES * FRONT * 2;
    const size = 0.96 - Math.pow(Math.abs(th) / FRONT, 1.4) * 0.2;
    rig.segments[i].theta = th;
    frameAt(th, d, rig.segments[i].frame, size);
  }
  for (let i = 0; i < rig.joints.length; i++) {
    const a = i === 0 ? -FRONT : rig.segments[i - 1].theta;
    const b = i === TEMPLE_SEGMENTS ? FRONT : rig.segments[i].theta;
    frameAt((a + b) / 2, d, rig.joints[i].frame);
  }
  for (const entry of rig.cordBeads) {
    frameAt(entry.theta, d, entry.frame);
    // Local +Z of a sleeve follows the thread, rather than the relief normal.
    entry.frame.multiply(matrix.makeRotationY(Math.PI / 2));
  }
  updateCord(rig, d);
  rig.drape = d;
  rig.layoutVersion++;
  return true;
}

export function writeTempleInstances(mesh, entries) {
  if (!mesh) return;
  for (let i = 0; i < entries.length; i++) {
    const item = entries[i];
    rotation.setFromEuler(euler.set(0, 0, item.rotation || 0));
    matrix.compose(p.fromArray(item.position), rotation, scale.fromArray(item.scale));
    if (item.frame) matrix.premultiply(item.frame);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.count = entries.length;
  mesh.instanceMatrix.needsUpdate = true;
}

export function writeTempleDrops(beads, wires, drops, time, drape = 1) {
  if (!beads || !wires) return;
  const amplitude = Math.min(1, drape) * 0.04;
  for (let i = 0; i < drops.length; i++) {
    const drop = drops[i];
    const angle = Math.sin(time * 1.65 + drop.phase) * amplitude;
    const x = Math.sin(angle), y = -Math.cos(angle);
    p.fromArray(drop.position).addScaledVector(q.set(x, y, 0), drop.length);
    matrix.compose(p, rotation.identity(), scale.set(drop.radius, drop.radius * 0.94, drop.radius));
    if (drop.frame) matrix.premultiply(drop.frame);
    beads.setMatrixAt(i, matrix);
    p.fromArray(drop.position).addScaledVector(q, drop.length * 0.5);
    rotation.setFromEuler(euler.set(0, 0, angle));
    matrix.compose(p, rotation, scale.set(0.003, drop.length, 0.003));
    if (drop.frame) matrix.premultiply(drop.frame);
    wires.setMatrixAt(i, matrix);
  }
  beads.instanceMatrix.needsUpdate = wires.instanceMatrix.needsUpdate = true;
}
