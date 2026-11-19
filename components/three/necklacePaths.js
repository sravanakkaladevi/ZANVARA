import * as THREE from 'three';
import { BUST_TRANSFORM, bustProfile, once } from './assets.js';

export const LENGTH_GEOMETRY = {
  choker: { frontY: 1.39, backY: 2.36, segments: 21, arc: 1.46, pendantScale: 0.78 },
  collar: { frontY: 0.80, backY: 2.36, segments: 25, arc: 1.40, pendantScale: 0.88 },
  princess: { frontY: -0.02, backY: 2.36, segments: 29, arc: 1.36, pendantScale: 0.98 },
  opera: { frontY: -1.72, backY: 2.36, segments: 37, arc: 1.30, pendantScale: 1.05 },
};
export const SURFACE_CLEARANCE = 0.045;
const Z_SCALE = BUST_TRANSFORM.scaleZ;
const UP = new THREE.Vector3(0, 1, 0);
const samples = () => once('fitting-profile', () => [
  ...bustProfile(), new THREE.Vector2(0.55, 3.62), new THREE.Vector2(0.0001, 3.64),
]);

// Piecewise linear interpolation matches the actual tessellated LatheGeometry.
export function bustRadius(y) {
  const profile = samples(), localY = y - BUST_TRANSFORM.y;
  let lo = 0, hi = profile.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (profile[mid].y > localY) hi = mid; else lo = mid;
  }
  const a = profile[lo], b = profile[hi];
  const slope = (b.x - a.x) / (b.y - a.y);
  return { radius: THREE.MathUtils.lerp(a.x, b.x, THREE.MathUtils.clamp((localY - a.y) / (b.y - a.y), 0, 1)), slope };
}

// Signed first-order distance to the flattened lathe. Negative means penetration.
export function bustDistance(p) {
  if (p.y > 3.64 + BUST_TRANSFORM.y || p.y < -3.4 + BUST_TRANSFORM.y) return Infinity;
  const { radius, slope } = bustRadius(p.y);
  const z = p.z - BUST_TRANSFORM.z;
  const q = Math.hypot(p.x, z / Z_SCALE);
  if (q < 0.000001) return -radius;
  const gradient = Math.hypot(p.x / q, z / (Z_SCALE * Z_SCALE * q), slope);
  return (q - radius) / gradient;
}

function surfaceNormal(theta, y) {
  return new THREE.Vector3(Math.sin(theta), -bustRadius(y).slope, Math.cos(theta) / Z_SCALE).normalize();
}

export function wornPoint(theta, length, clearance = SURFACE_CLEARANCE) {
  const c = LENGTH_GEOMETRY[length] || LENGTH_GEOMETRY.princess;
  const front = Math.pow((1 + Math.cos(theta)) / 2, 1.35);
  const y = THREE.MathUtils.lerp(c.backY, c.frontY, front);
  const r = bustRadius(y).radius;
  return new THREE.Vector3(r * Math.sin(theta), y, BUST_TRANSFORM.z + r * Z_SCALE * Math.cos(theta))
    .addScaledVector(surfaceNormal(theta, y), clearance);
}

export function flatPoint(theta, length) {
  // A closed figure-eight folds the long chain into two separate loops.
  if (length === 'opera') return new THREE.Vector3(1.03 * Math.sin(2 * theta), 0.035 + 0.095 * Math.pow(Math.max(0, Math.sin(theta)), 10), -0.19 + 0.70 * Math.cos(theta));
  const rx = length === 'choker' ? 1.03 : length === 'collar' ? 1.12 : 1.18;
  return new THREE.Vector3(rx * Math.sin(theta), 0.035, -0.31 + 0.64 * Math.cos(theta));
}

function frame(theta, length, flat) {
  const point = flat ? flatPoint : wornPoint;
  const position = point(theta, length);
  const tangent = point(theta + 0.001, length).sub(point(theta - 0.001, length)).normalize();
  const n = flat ? UP.clone() : surfaceNormal(theta, position.y);
  const normal = n.addScaledVector(tangent, -n.dot(tangent)).normalize();
  const vertical = new THREE.Vector3().crossVectors(normal, tangent).normalize();
  return { position, normal, quaternion: new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(tangent, vertical, normal)
  ) };
}

function arcTable(length, flat, start, end) {
  const count = 480, table = [0], points = [];
  for (let i = 0; i <= count; i++) {
    points.push((flat ? flatPoint : wornPoint)(THREE.MathUtils.lerp(start, end, i / count), length));
    if (i) table.push(table[i - 1] + points[i].distanceTo(points[i - 1]));
  }
  return { table, total: table[count], start, end, count };
}

function atArc(table, fraction) {
  const distance = table.total * fraction;
  let lo = 0, hi = table.count;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (table.table[mid] > distance) hi = mid; else lo = mid;
  }
  const f = (distance - table.table[lo]) / (table.table[hi] - table.table[lo] || 1);
  return THREE.MathUtils.lerp(table.start, table.end, (lo + f) / table.count);
}

export function pathFrames(length) {
  return once(`jewel-path-${length}`, () => {
    const c = LENGTH_GEOMETRY[length];
    const front = arcTable(length, false, -c.arc, c.arc);
    const flatFront = arcTable(length, true, -c.arc, c.arc);
    const motifs = Array.from({ length: c.segments }, (_, i) => {
      const fraction = (i + 0.5) / c.segments;
      return { worn: frame(atArc(front, fraction), length, false), flat: frame(atArc(flatFront, fraction), length, true) };
    });
    const loop = arcTable(length, false, -Math.PI, Math.PI);
    const flatLoop = arcTable(length, true, -Math.PI, Math.PI);
    const linkCount = Math.ceil(loop.total / 0.068);
    const links = Array.from({ length: linkCount }, (_, i) => {
      const fraction = (i + 0.5) / linkCount;
      const theta = atArc(loop, fraction);
      return { worn: frame(theta, length, false), flat: frame(atArc(flatLoop, fraction), length, true), back: Math.abs(theta) > Math.max(c.arc, Math.PI / 2 + 0.1) };
    });
    return {
      motifs, links, pendant: { worn: frame(0, length, false), flat: frame(0, length, true) },
      motifScale: Math.min(1, front.total / c.segments / 0.35), pendantScale: c.pendantScale,
    };
  });
}

export function cloneFrame(f, scale = 1) {
  return { position: f.position.clone(), quaternion: f.quaternion.clone(), normal: f.normal.clone(), scale };
}

export function frameMatrix(f, out = new THREE.Matrix4()) {
  return out.compose(f.position, f.quaternion, new THREE.Vector3(f.scale, f.scale, 1));
}

export function templateSamples(parts) {
  const out = [];
  for (const part of parts) {
    if (!part.geo.boundingBox) part.geo.computeBoundingBox();
    const box = part.geo.boundingBox;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      out.push(new THREE.Vector3(x, y, z).applyMatrix4(part.matrix));
    }
  }
  return out;
}

const testPoint = new THREE.Vector3(), testMatrix = new THREE.Matrix4();
export function fitFrame(f, localSamples) {
  // Fit the entire relief and fringe, rather than just its centreline.
  for (let pass = 0; pass < 12; pass++) {
    frameMatrix(f, testMatrix);
    let minimum = Infinity;
    for (const p of localSamples) minimum = Math.min(minimum, bustDistance(testPoint.copy(p).applyMatrix4(testMatrix)));
    if (minimum >= SURFACE_CLEARANCE - 0.0001) break;
    f.position.addScaledVector(f.normal, Math.min(0.12, (SURFACE_CLEARANCE - minimum) * 1.15));
  }
  return f;
}
