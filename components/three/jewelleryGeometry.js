import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { once, rng } from './assets.js';

const TAU = Math.PI * 2;
const identity = new THREE.Quaternion();
let buildingDetail = 'full';
const low = () => buildingDetail === 'card';
const detailKey = (key) => `${key}-${buildingDetail}`;

// 'full' is what the hero / bust shows up close, so it is tessellated for smooth
// silhouettes and clean highlights; 'card' stays lighter for the many small views.
export const granuleGeo = () => once(detailKey('jewel-granule'), () => new THREE.SphereGeometry(1, low() ? 8 : 14, low() ? 6 : 10));
export const pearlGeo = () => once(detailKey('jewel-pearl'), () => new THREE.SphereGeometry(1, low() ? 12 : 22, low() ? 8 : 16));
export const cabochonGeo = () => once(detailKey('jewel-cabochon'), () => new THREE.SphereGeometry(1, low() ? 18 : 36, low() ? 12 : 24));
export const ghungrooGeo = () => once(detailKey('jewel-ghungroo'), () => cavityColours(new THREE.SphereGeometry(1, low() ? 10 : 18, low() ? 7 : 12), true));
export const jewelleryLinkGeo = (detail = 'full') => once(`jewel-chain-link-${detail}`, () => {
  const g = new THREE.TorusGeometry(0.03, 0.0095, detail === 'card' ? 5 : 8, detail === 'card' ? 12 : 20);
  g.scale(1.45, 1, 1);
  return g;
});

export function circleShape(radius = 1) {
  const s = new THREE.Shape();
  s.absarc(0, 0, radius, 0, TAU, false);
  return s;
}

export function mangoShape() {
  const s = new THREE.Shape();
  s.moveTo(0.02, 0.53);
  s.bezierCurveTo(0.49, 0.30, 0.49, -0.31, 0.10, -0.48);
  s.bezierCurveTo(-0.22, -0.65, -0.48, -0.28, -0.28, -0.01);
  s.bezierCurveTo(-0.10, 0.20, 0.18, 0.15, 0.02, 0.53);
  return s;
}

function petalShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.55);
  s.bezierCurveTo(-0.65, -0.1, -0.45, 0.4, 0, 0.65);
  s.bezierCurveTo(0.45, 0.4, 0.65, -0.1, 0, -0.55);
  return s;
}

function peacockShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.13, -0.12);
  s.bezierCurveTo(-0.29, 0.04, -0.14, 0.21, 0.01, 0.17);
  s.bezierCurveTo(0.09, 0.14, 0.05, -0.04, 0.12, -0.01);
  s.bezierCurveTo(0.17, 0.00, 0.10, 0.16, 0.15, 0.19);
  s.bezierCurveTo(0.21, 0.23, 0.25, 0.16, 0.20, 0.12);
  s.bezierCurveTo(0.18, 0.08, 0.26, -0.16, 0.05, -0.17);
  s.bezierCurveTo(-0.02, -0.15, -0.07, -0.11, -0.13, -0.12);
  return s;
}

function flowerShape(petals = 8) {
  const s = new THREE.Shape();
  for (let i = 0; i <= petals * 12; i++) {
    const a = i / (petals * 12) * TAU;
    const r = 0.86 + 0.14 * Math.cos(a * petals);
    const x = Math.sin(a) * r, y = Math.cos(a) * r;
    if (!i) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

// Back faces and the roots of bevels retain a brown oxide; raised relief catches light.
function cavityColours(g, seam = false) {
  const p = g.attributes.position, n = g.attributes.normal;
  const colours = new Float32Array(p.count * 3);
  g.computeBoundingBox();
  const z0 = g.boundingBox.min.z, z1 = g.boundingBox.max.z;
  for (let i = 0; i < p.count; i++) {
    const h = (p.getZ(i) - z0) / (z1 - z0 || 1);
    const edge = Math.max(0, n.getZ(i));
    const v = seam && Math.abs(p.getY(i)) < 0.17 ? 0.34 : 0.46 + h * 0.37 + edge * 0.17;
    colours[i * 3] = v;
    colours[i * 3 + 1] = v * (0.82 + h * 0.18);
    colours[i * 3 + 2] = v * (0.60 + h * 0.40);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  return g;
}

function extrude(key, shape, depth = 0.045) {
  return once(detailKey(`jewel-extrude-${key}`), () => {
    const g = new THREE.ExtrudeGeometry(shape(), {
      depth, bevelEnabled: true, bevelThickness: 0.009, bevelSize: 0.01,
      bevelSegments: low() ? 2 : 4, curveSegments: low() ? 6 : 14,
    });
    g.clearGroups();
    return g;
  });
}

const leafGeo = () => extrude('leaf', petalShape);
const coinGeo = () => extrude('coin', () => circleShape(1));
const mangoGeo = () => extrude('mango', mangoShape, 0.06);
const flowerGeo = () => extrude('flower', () => flowerShape(8));
const peacockGeo = () => extrude('peacock', peacockShape, 0.055);

export const polkiGeo = () => once('jewel-polki', () => {
  const s = new THREE.Shape();
  const r = rng(197);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    const radius = 0.88 + r() * 0.18;
    const x = Math.cos(a) * radius, y = Math.sin(a) * radius;
    if (!i) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.10, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 1, curveSegments: 1,
  });
  g.clearGroups();
  return g;
});

function ringGeo() {
  return once(detailKey('jewel-oval-bezel'), () => {
    const s = circleShape(1.12);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.88, 0, TAU, true);
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.27, bevelEnabled: true, bevelSize: 0.065, bevelThickness: 0.04, bevelSegments: low() ? 2 : 4, curveSegments: low() ? 8 : 20,
    });
    g.clearGroups();
    return g;
  });
}

export const doriGeo = (detail = 'full') => once(`jewel-twisted-dori-${detail}`, () => {
  const strands = [0, Math.PI].map((phase) => {
    const points = Array.from({ length: 19 }, (_, i) => {
      const t = i / 18, a = t * TAU * 1.5 + phase;
      return new THREE.Vector3((t - 0.5) * 0.11, Math.sin(a) * 0.008, Math.cos(a) * 0.008);
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), detail === 'card' ? 14 : 32, 0.008, detail === 'card' ? 5 : 8, false);
  });
  const result = mergeGeometries(strands, false);
  strands.forEach((g) => g.dispose());
  return result;
});

function matrix(p = [0, 0, 0], s = [1, 1, 1], rz = 0) {
  return new THREE.Matrix4().compose(new THREE.Vector3(...p),
    rz ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rz) : identity,
    new THREE.Vector3(...s));
}

function metal(key, parts) {
  return once(detailKey(`jewel-metal-${key}`), () => {
    const transformed = parts.map(([g, p, s, rz]) => (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(matrix(p, s, rz)));
    const merged = mergeGeometries(transformed, false);
    transformed.forEach((g) => g.dispose());
    return cavityColours(merged);
  });
}

// A template describes small, reusable instances in a motif's local tangent frame.
function template() {
  const parts = [];
  const add = (geo, material, p = [0, 0, 0], s = [1, 1, 1], rz = 0, drop = null) => {
    parts.push({ geo, material, matrix: matrix(p, s, rz), drop });
  };
  const border = (shape, sx, sy, x = 0, y = 0, z = 0.075, n = 28, radius = 0.012) => {
    shape.getSpacedPoints(n).slice(0, -1).forEach((p) => add(granuleGeo(), 'gold',
      [x + p.x * sx, y + p.y * sy, z], [radius, radius, radius]));
  };
  const stone = (x, y, sx, sy, material = 'gem', z = 0.095) => {
    add(ringGeo(), 'gold', [x, y, z - 0.035], [sx, sy, 0.11]);
    add(cabochonGeo(), material, [x, y, z], [sx * 0.88, sy * 0.88, 0.045]);
  };
  const pearlCluster = (x, y, number, seed, radius = 0.027) => {
    const r = rng(seed + 1);
    const drop = { pivot: [x, y + 0.025, 0.035], phase: seed * 1.73 };
    add(granuleGeo(), 'gold', [x, y + 0.005, 0.04], [0.012, 0.022, 0.012], 0, drop);
    for (let i = 0; i < number; i++) {
      const a = i * 2.399, ring = Math.sqrt(i) * radius * 0.64;
      const v = radius * (0.9 + r() * 0.2);
      add(pearlGeo(), 'pearl', [x + Math.cos(a) * ring, y - radius * 1.3 - Math.floor(i / 3) * radius * 1.45, 0.06 + Math.sin(a) * ring],
        [v, v * (1.03 + r() * 0.15), v], 0, drop);
    }
  };
  return { parts, add, border, stone, pearlCluster };
}

function templeDrops(t, width, y, n, seed = 0) {
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1) - 0.5) * width;
    const drop = { pivot: [x, y + 0.03, 0.045], phase: i * 1.61 + seed };
    t.add(granuleGeo(), 'gold', [x, y, 0.06], [0.012, 0.035, 0.012], 0, drop);
    for (let k = 0; k < 3; k++) {
      t.add(ghungrooGeo(), 'gold', [x + (k - 1) * 0.028, y - 0.048 - (k === 1 ? 0.035 : 0), 0.06],
        [0.026, 0.028, 0.026], 0, drop);
    }
  }
}

function templeMotif() {
  const t = template();
  t.add(metal('temple-motif', [
    [coinGeo(), [0, 0, 0], [0.15, 0.16, 1]],
    [peacockGeo(), [-0.008, 0.01, 0.045], [0.65, 0.65, 0.55]],
    [leafGeo(), [-0.12, 0.10, 0.03], [0.075, 0.10, 0.6], -0.8],
    [leafGeo(), [0.12, 0.10, 0.03], [0.075, 0.10, 0.6], 0.8],
  ]), 'gold');
  t.border(circleShape(), 0.151, 0.161);
  t.stone(-0.035, -0.025, 0.037, 0.047);
  t.stone(0.105, 0.10, 0.023, 0.032, 'gem2');
  templeDrops(t, 0.25, -0.18, 4);
  return t.parts;
}

function templePendant() {
  const t = template();
  const arch = new THREE.Shape();
  arch.moveTo(-0.46, -0.59); arch.lineTo(-0.46, -0.36);
  arch.bezierCurveTo(-0.46, -0.03, -0.14, 0.05, 0, 0.06);
  arch.bezierCurveTo(0.14, 0.05, 0.46, -0.03, 0.46, -0.36);
  arch.lineTo(0.46, -0.59); arch.lineTo(0.36, -0.59); arch.lineTo(0.36, -0.36);
  arch.bezierCurveTo(0.36, -0.12, 0.14, -0.06, 0, -0.05);
  arch.bezierCurveTo(-0.14, -0.06, -0.36, -0.12, -0.36, -0.36);
  arch.lineTo(-0.36, -0.59); arch.closePath();
  const body = new THREE.Shape();
  body.moveTo(-0.08, -0.32); body.quadraticCurveTo(-0.21, -0.4, -0.25, -0.50);
  body.lineTo(-0.30, -0.38); body.lineTo(-0.34, -0.41); body.lineTo(-0.27, -0.59);
  body.lineTo(-0.12, -0.52); body.lineTo(-0.13, -0.65);
  body.quadraticCurveTo(-0.40, -0.78, -0.22, -0.79);
  body.quadraticCurveTo(0, -0.73, 0.22, -0.79);
  body.quadraticCurveTo(0.40, -0.78, 0.13, -0.65);
  body.lineTo(0.12, -0.52); body.lineTo(0.27, -0.59); body.lineTo(0.34, -0.41);
  body.lineTo(0.30, -0.38); body.lineTo(0.25, -0.50);
  body.quadraticCurveTo(0.21, -0.4, 0.08, -0.32); body.closePath();
  const parts = [
    [flowerGeo(), [0, -0.48, 0], [0.51, 0.5, 0.8]],
    [extrude('temple-canopy', () => arch, 0.07), [0, -0.04, 0.035]],
    [extrude('lakshmi-relief', () => body, 0.06), [0, 0, 0.06]],
    [coinGeo(), [0, -0.25, 0.075], [0.075, 0.09, 0.7]],
    [leafGeo(), [0, -0.13, 0.08], [0.10, 0.12, 0.7]],
  ];
  for (const side of [-1, 1]) {
    parts.push([coinGeo(), [side * 0.39, -0.49, 0.08], [0.052, 0.25, 0.6]]);
    parts.push([coinGeo(), [side * 0.39, -0.72, 0.08], [0.09, 0.04, 0.7]]);
    parts.push([coinGeo(), [side * 0.39, -0.31, 0.08], [0.09, 0.04, 0.7]]);
  }
  for (let i = 0; i < 7; i++) parts.push([leafGeo(), [(i - 3) * 0.075, -0.79, 0.09], [0.10, 0.11, 0.6], (i - 3) * -0.21]);
  // Rounded sculptural relief over the silhouette: crown, face, robes and lotus seat.
  parts.push([granuleGeo(), [0, -0.26, 0.13], [0.070, 0.085, 0.045]]);
  parts.push([leafGeo(), [0, -0.13, 0.13], [0.10, 0.14, 0.9]]);
  parts.push([granuleGeo(), [0, -0.27, 0.17], [0.012, 0.029, 0.018]]);
  parts.push([granuleGeo(), [0, -0.31, 0.16], [0.023, 0.008, 0.012]]);
  parts.push([granuleGeo(), [0, -0.46, 0.12], [0.095, 0.15, 0.055]]);
  for (const side of [-1, 1]) {
    parts.push([granuleGeo(), [side * 0.28, -0.40, 0.12], [0.033, 0.046, 0.027]]);
    parts.push([leafGeo(), [side * 0.12, -0.67, 0.13], [0.15, 0.25, 0.8], side * 1.1]);
    parts.push([leafGeo(), [side * 0.145, -0.44, 0.105], [0.065, 0.23, 0.75], side * 0.9]);
  }
  for (let i = 0; i < 5; i++) parts.push([leafGeo(), [(i - 2) * 0.035, -0.54, 0.165], [0.023, 0.22, 0.5], (i - 2) * -0.10]);
  t.add(metal('temple-pendant', parts), 'gold');
  for (const side of [-1, 1]) t.add(granuleGeo(), 'cord', [side * 0.026, -0.25, 0.172], [0.007, 0.005, 0.004]);
  t.stone(0, -0.21, 0.008, 0.012, 'gem', 0.18);
  t.border(flowerShape(), 0.50, 0.49, 0, -0.48, 0.065, 76, 0.017);
  t.stone(0, 0.0, 0.058, 0.074, 'gem', 0.14);
  t.stone(-0.38, -0.49, 0.029, 0.045, 'gem2', 0.14);
  t.stone(0.38, -0.49, 0.029, 0.045, 'gem2', 0.14);
  templeDrops(t, 0.79, -0.98, 9, 4);
  return t.parts;
}

function kundanDrops(t, width, y, n) {
  for (let i = 0; i < n; i++) {
    const x = (i / Math.max(1, n - 1) - 0.5) * width;
    const drop = { pivot: [x, y, 0.06], phase: i * 1.49 };
    t.add(cabochonGeo(), 'gem', [x, y - 0.060, 0.065], [0.031, 0.053, 0.032], 0, drop);
    t.pearlCluster(x, y - 0.13, 1, i + 7, 0.028);
  }
}

function kundanMotif() {
  const t = template();
  const parts = [];
  [[-0.073, 0.06, 0.075], [0.073, 0.06, 0.075], [0, -0.075, 0.09]].forEach(([x, y, r]) => {
    parts.push([ringGeo(), [x, y, 0.02], [r, r * 1.1, 0.15]]);
    t.add(polkiGeo(), 'diamond', [x, y, 0.056], [r * 0.79, r * 0.87, 0.12], x * 2);
  });
  t.add(metal('kundan-motif', parts), 'gold');
  t.add(flowerGeo(), 'enamel', [0, 0, -0.018], [0.169, 0.20, 0.5]);
  t.border(flowerShape(), 0.15, 0.18, 0, 0, 0.045, 32, 0.009);
  t.stone(0, 0.17, 0.025, 0.031, 'gem2', 0.075);
  kundanDrops(t, 0.15, -0.19, 3);
  return t.parts;
}

function kundanPendant() {
  const t = template(), parts = [];
  parts.push([flowerGeo(), [0, -0.39, 0], [0.45, 0.47, 0.65]]);
  parts.push([ringGeo(), [0, -0.39, 0.045], [0.15, 0.19, 0.22]]);
  t.add(cabochonGeo(), 'gem', [0, -0.39, 0.12], [0.135, 0.175, 0.075]);
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * TAU;
    const x = Math.sin(a) * 0.30, y = -0.39 + Math.cos(a) * 0.32;
    parts.push([ringGeo(), [x, y, 0.035], [0.078, 0.10, 0.18], -a]);
    t.add(polkiGeo(), 'diamond', [x, y, 0.085], [0.061, 0.081, 0.15], -a);
  }
  t.add(metal('kundan-pendant', parts), 'gold');
  t.add(flowerGeo(), 'enamel', [0, -0.39, -0.02], [0.46, 0.48, 0.45]);
  t.border(flowerShape(), 0.45, 0.47, 0, -0.39, 0.06, 64, 0.012);
  kundanDrops(t, 0.67, -0.87, 9);
  return t.parts;
}

function floralMetal(key, radius, y, n) {
  const parts = [[coinGeo(), [0, y, 0], [radius * 0.52, radius * 0.52, 1]]];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    parts.push([leafGeo(), [Math.sin(a) * radius * 0.67, y + Math.cos(a) * radius * 0.67, 0.025],
      [radius * 0.50, radius * 0.62, 0.75], -a]);
    // A fine raised vein needs very few triangles; the surrounding petal retains its bevelled outline.
    parts.push([once('jewel-petal-vein', () => new THREE.CylinderGeometry(0.45, 0.75, 1.2, 5, 1)),
      [Math.sin(a) * radius * 0.72, y + Math.cos(a) * radius * 0.72, 0.078],
      [radius * 0.06, radius * 0.46, radius * 0.04], -a]);
  }
  return metal(key, parts);
}

function guttapusaluDrops(t, width, y, n, size = 0.025) {
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1) - 0.5) * width;
    t.pearlCluster(x, y - 0.025 * Math.cos(i * 1.2), 5, i + 19, size);
  }
}

function guttapusaluMotif() {
  const t = template();
  t.add(floralMetal('guttapusalu-motif', 0.16, 0, 7), 'gold');
  t.stone(0, 0, 0.045, 0.052);
  t.stone(-0.13, 0.045, 0.024, 0.034, 'gem2');
  t.stone(0.13, 0.045, 0.024, 0.034, 'gem2');
  guttapusaluDrops(t, 0.27, -0.18, 5);
  return t.parts;
}

function guttapusaluPendant() {
  const t = template();
  t.add(floralMetal('guttapusalu-pendant', 0.47, -0.43, 12), 'gold');
  t.stone(0, -0.43, 0.145, 0.18, 'gem', 0.13);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    t.stone(Math.sin(a) * 0.32, -0.43 + Math.cos(a) * 0.32, 0.032, 0.044, i % 2 ? 'gem2' : 'gem');
  }
  t.border(circleShape(), 0.22, 0.25, 0, -0.43, 0.09, 40, 0.012);
  guttapusaluDrops(t, 0.86, -0.88, 18, 0.029);
  return t.parts;
}

function haramDrops(t, width, y, n) {
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1) - 0.5) * width;
    t.pearlCluster(x, y, 2, i + 47, 0.028);
    const drop = { pivot: [x, y + 0.02, 0.06], phase: i * 1.13 };
    t.add(ghungrooGeo(), 'gold', [x, y - 0.11, 0.055], [0.022, 0.025, 0.022], 0, drop);
  }
}

function haramMotif() {
  const t = template();
  t.add(metal('haram-motif', [
    [mangoGeo(), [0, 0.005, 0], [0.39, 0.40, 0.8]],
    [mangoGeo(), [0.006, -0.003, 0.047], [0.25, 0.29, 0.5]],
    [leafGeo(), [-0.08, 0.12, 0.045], [0.09, 0.12, 0.55], -0.6],
  ]), 'gold');
  t.border(mangoShape(), 0.39, 0.40, 0, 0.005, 0.06, 32, 0.011);
  t.stone(0.037, -0.06, 0.044, 0.059);
  t.stone(0.01, 0.105, 0.025, 0.035, 'gem2');
  haramDrops(t, 0.14, -0.225, 3);
  return t.parts;
}

function haramPendant() {
  const t = template();
  t.add(metal('haram-pendant', [
    [mangoGeo(), [-0.04, -0.44, 0], [1.02, 1.05, 1]],
    [mangoGeo(), [-0.015, -0.46, 0.065], [0.77, 0.80, 0.8]],
    [leafGeo(), [-0.30, -0.25, 0.06], [0.28, 0.37, 0.9], -0.5],
    [peacockGeo(), [-0.06, -0.50, 0.11], [0.90, 0.90, 0.7]],
  ]), 'gold');
  t.border(mangoShape(), 1.02, 1.05, -0.04, -0.44, 0.075, 86, 0.016);
  t.border(mangoShape(), 0.73, 0.78, -0.015, -0.46, 0.13, 60, 0.010);
  t.stone(0.075, -0.64, 0.11, 0.15, 'gem', 0.18);
  t.stone(0.04, -0.20, 0.065, 0.095, 'gem2', 0.17);
  haramDrops(t, 0.64, -1.03, 9);
  return t.parts;
}

const BUILDERS = {
  temple: { motif: templeMotif, pendant: templePendant },
  kundan: { motif: kundanMotif, pendant: kundanPendant },
  guttapusalu: { motif: guttapusaluMotif, pendant: guttapusaluPendant },
  haram: { motif: haramMotif, pendant: haramPendant },
};

export function jewelleryTemplates(style, detail = 'full') {
  return once(`jewel-templates-${style}-${detail}`, () => {
    const previous = buildingDetail;
    buildingDetail = detail;
    try {
      const b = BUILDERS[style] || BUILDERS.temple;
      return { motif: b.motif(), pendant: b.pendant() };
    } finally { buildingDetail = previous; }
  });
}
