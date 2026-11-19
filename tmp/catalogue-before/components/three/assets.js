import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ------------------------------------------------------------------
   Procedural geometry, textures and materials for the jewellery.
   Everything is generated in code — no model downloads needed.
------------------------------------------------------------------- */

const memo = {};
const once = (k, f) => memo[k] || (memo[k] = f());

// deterministic random
export function rng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function octShape(w, h, c) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + c, -h / 2);
  s.lineTo(w / 2 - c, -h / 2);
  s.lineTo(w / 2, -h / 2 + c);
  s.lineTo(w / 2, h / 2 - c);
  s.lineTo(w / 2 - c, h / 2);
  s.lineTo(-w / 2 + c, h / 2);
  s.lineTo(-w / 2, h / 2 - c);
  s.lineTo(-w / 2, -h / 2 + c);
  s.closePath();
  return s;
}

/* Round brilliant (diamond) — table faces +Z, radius 1 */
export const brilliantGeo = () =>
  once('brilliant', () => {
    const pts = [
      [0.0001, -0.86],
      [0.6, -0.4],
      [1, -0.03],
      [1, 0.03],
      [0.84, 0.18],
      [0.57, 0.31],
      [0.0001, 0.31],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const g = new THREE.LatheGeometry(pts, 16);
    g.rotateX(Math.PI / 2);
    return g;
  });

/* Step-cut "emerald cut" gem, faces +Z */
export const emeraldCutGeo = (w = 0.42, h = 0.58) =>
  once(`ecut-${w}-${h}`, () => {
    const g = new THREE.ExtrudeGeometry(octShape(w * 0.6, h * 0.7, w * 0.08), {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: w * 0.2,
      bevelSegments: 3,
      curveSegments: 1,
    });
    g.center();
    return g;
  });

/* Octagonal bezel frame */
export const bezelGeo = (w, h, c) =>
  once(`bezel-${w}-${h}`, () => {
    const s = octShape(w + 0.08, h + 0.08, c + 0.035);
    s.holes.push(octShape(w - 0.03, h - 0.03, Math.max(0.01, c - 0.012)));
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.07,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.012,
      bevelSegments: 2,
      curveSegments: 1,
    });
    g.translate(0, 0, -0.035);
    return g;
  });

export const plateGeo = (w, h, c) =>
  once(`plate-${w}-${h}`, () => {
    const g = new THREE.ExtrudeGeometry(octShape(w, h, c), {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
      curveSegments: 1,
    });
    g.translate(0, 0, -0.015);
    return g;
  });

/* Chain link — elongated torus, long axis X */
export const linkGeo = () =>
  once('link', () => {
    const g = new THREE.TorusGeometry(0.03, 0.0095, 8, 20);
    g.scale(1.45, 1, 1);
    return g;
  });

/* Raw hexagonal emerald crystal */
export const crystalGeo = (seed = 3) =>
  once(`crystal-${seed}`, () => {
    const g = new THREE.CylinderGeometry(0.42, 0.5, 1.5, 6, 4);
    const pos = g.attributes.position;
    const r = rng(seed);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > 0.7) pos.setY(i, y + (r() - 0.3) * 0.35);
      pos.setX(i, pos.getX(i) * (0.92 + r() * 0.16));
      pos.setZ(i, pos.getZ(i) * (0.92 + r() * 0.16));
    }
    g.computeVertexNormals();
    return g;
  });

/* Velvet display bust */
export const bustGeo = () =>
  once('bust', () => {
    const ctrl = [
      [3.05, -3.4],
      [3.12, -1.6],
      [3.02, -0.45],
      [2.75, 0.3],
      [2.15, 0.86],
      [1.3, 1.26],
      [0.93, 1.72],
      [0.8, 2.35],
      [0.76, 3.05],
      [0.74, 3.5],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const curve = new THREE.SplineCurve(ctrl);
    const pts = [new THREE.Vector2(0.0001, -3.4), ...curve.getPoints(70), new THREE.Vector2(0.55, 3.62), new THREE.Vector2(0.0001, 3.64)];
    return new THREE.LatheGeometry(pts, 96);
  });

/* ---------------- textures ---------------- */
function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

export const velvetBump = () =>
  once('velvetBump', () =>
    canvasTex(
      512,
      (ctx, n) => {
        const img = ctx.createImageData(n, n);
        const r = rng(7);
        for (let y = 0; y < n; y++)
          for (let x = 0; x < n; x++) {
            const twill = ((x + y) % 6 < 3 ? 1 : 0) * 40;
            const v = 90 + twill + r() * 110;
            const i = (y * n + x) * 4;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
            img.data[i + 3] = 255;
          }
        ctx.putImageData(img, 0, 0);
      },
      6
    )
  );

export const leatherBump = () =>
  once('leatherBump', () =>
    canvasTex(
      512,
      (ctx, n) => {
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, n, n);
        const r = rng(11);
        for (let i = 0; i < 5200; i++) {
          const x = r() * n,
            y = r() * n,
            s = 1 + r() * 4;
          ctx.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},0.12)`;
          ctx.beginPath();
          ctx.arc(x, y, s, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      3
    )
  );

export const starTexture = () =>
  once('star', () => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.12, 'rgba(255,250,235,0.65)');
    g.addColorStop(0.4, 'rgba(255,240,210,0.08)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    ctx.globalCompositeOperation = 'lighter';
    const ray = (a) => {
      ctx.save();
      ctx.translate(64, 64);
      ctx.rotate(a);
      const lg = ctx.createLinearGradient(-64, 0, 64, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(0.5, 'rgba(255,255,255,0.95)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(-64, -1.2, 128, 2.4);
      ctx.restore();
    };
    ray(0);
    ray(Math.PI / 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });

/* ---------------- materials ---------------- */
export function makeGold(color = '#f2c877') {
  const surface = hammeredGoldTexture();
  const material = new THREE.MeshPhysicalMaterial({
    color, metalness: 1, roughness: 0.42, envMapIntensity: 1.15,
    roughnessMap: surface, bumpMap: surface, bumpScale: 0.0018,
    clearcoat: 0.12, clearcoatRoughness: 0.4, vertexColors: true,
  });
  // The box's piping and the older miniatures have no colour attribute.
  material.defaultAttributeValues = { color: [1, 1, 1] };
  return material;
}
export function makeGem(color = '#0c8f50', emissive = '#03371c') {
  return new THREE.MeshPhysicalMaterial({
    color,
    emissive,
    emissiveIntensity: 0.08,
    metalness: 0,
    roughness: 0.15,
    transmission: 0.3,
    thickness: 0.075,
    ior: 1.7,
    attenuationDistance: 0.65,
    attenuationColor: new THREE.Color(color),
    flatShading: false,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.45,
  });
}
export function makeDiamond() {
  return new THREE.MeshPhysicalMaterial({
    color: '#f6f9ff',
    metalness: 0.85,
    roughness: 0.02,
    flatShading: true,
    emissive: '#8c96a6',
    emissiveIntensity: 0.32,
    envMapIntensity: 3.6,
    clearcoat: 1,
    clearcoatRoughness: 0,
    iridescence: 0.8,
    iridescenceIOR: 2.2,
  });
}

/* ---------------- antique temple jewellery ----------------
   The cached assemblies have one material group each. Stones, granules
   and moving drops are described separately so they can be instanced.
------------------------------------------------------------ */
export const hammeredGoldTexture = () => once('hammered-gold', () => canvasTex(256, (ctx, n) => {
  const image = ctx.createImageData(n, n);
  const random = rng(603);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const hammer = Math.sin(x * 0.37 + Math.sin(y * 0.19) * 2) * Math.cos(y * 0.41);
    const value = 225 + hammer * 14 + (random() - 0.5) * 25;
    const i = (y * n + x) * 4;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}, 7));

export const silkThreadTexture = () => once('silk-thread', () => canvasTex(128, (ctx, n) => {
  const image = ctx.createImageData(n, n);
  const random = rng(109);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const twist = Math.sin((x + y * 0.75) * Math.PI / 8);
    const fibre = Math.sin((x - y * 0.5) * Math.PI) * 12;
    const value = 150 + twist * 55 + fibre + random() * 14;
    const i = (y * n + x) * 4;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}, 6));

export const templeSilkMaterial = () => once('temple-silk-material', () => new THREE.MeshPhysicalMaterial({
  color: '#c99619', roughness: 0.62, metalness: 0,
  sheen: 1, sheenColor: new THREE.Color('#ffe09b'), sheenRoughness: 0.35,
  bumpMap: silkThreadTexture(), bumpScale: 0.002, envMapIntensity: 0.7,
}));

function antiqueVertexColors(geometry, tone = 1) {
  geometry.computeBoundingBox();
  const p = geometry.attributes.position;
  const n = geometry.attributes.normal;
  const { min, max } = geometry.boundingBox;
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const lift = THREE.MathUtils.clamp((p.getZ(i) - min.z) / (max.z - min.z || 1), 0, 1);
    const worn = Math.pow(lift, 0.65) * (0.64 + Math.max(0, n.getZ(i)) * 0.36);
    const shade = THREE.MathUtils.clamp((0.38 + worn * 0.62) * tone, 0.12, 1);
    colors[i * 3] = shade;
    colors[i * 3 + 1] = shade * (0.57 + worn * 0.43);
    colors[i * 3 + 2] = shade * (0.29 + worn * 0.71);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function ellipse(x, y, rx, ry) {
  const shape = new THREE.Shape();
  shape.absellipse(x, y, rx, ry, 0, Math.PI * 2, false, 0);
  return shape;
}

function leaf(x, y, w, h, angle = 0) {
  const shape = new THREE.Shape();
  const point = (a, b) => new THREE.Vector2(x + a * Math.cos(angle) - b * Math.sin(angle), y + a * Math.sin(angle) + b * Math.cos(angle));
  const p = point(0, -h / 2);
  shape.moveTo(p.x, p.y);
  const a = point(-w, -h * 0.1), b = point(-w * 0.5, h * 0.3), c = point(0, h / 2);
  shape.bezierCurveTo(a.x, a.y, b.x, b.y, c.x, c.y);
  const d = point(w * 0.5, h * 0.3), e = point(w, -h * 0.1);
  shape.bezierCurveTo(d.x, d.y, e.x, e.y, p.x, p.y);
  return shape;
}

function flower(x, y, radius, petals = 12) {
  const shape = new THREE.Shape();
  const count = petals * 6;
  for (let i = 0; i <= count; i++) {
    const a = i / count * Math.PI * 2;
    const r = radius * (0.91 + Math.cos(a * petals) * 0.09);
    if (i === 0) shape.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else shape.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  shape.closePath();
  return shape;
}

function assembly() {
  const parts = [];
  const result = { primary: [], secondary: [], accents: [], granules: [], drops: [] };
  const add = (geometry, { x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, rz = 0, tone = 1 } = {}) => {
    let g = geometry;
    if (g.index) { g = geometry.toNonIndexed(); geometry.dispose(); }
    if (!g.attributes.color) antiqueVertexColors(g, tone);
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rz), new THREE.Vector3(sx, sy, sz));
    g.applyMatrix4(matrix);
    if (matrix.determinant() < 0) {
      // Mirrored reliefs need reversed winding as well as mirrored normals.
      for (const attr of Object.values(g.attributes)) for (let i = 0; i < attr.count; i += 3) for (let k = 0; k < attr.itemSize; k++) {
        const a = (i + 1) * attr.itemSize + k, b = (i + 2) * attr.itemSize + k;
        const value = attr.array[a]; attr.array[a] = attr.array[b]; attr.array[b] = value;
      }
    }
    parts.push(g);
  };
  const shape = (path, depth = 0.035, z = 0, tone = 1, bevel = 0.005) => add(new THREE.ExtrudeGeometry(path, {
    depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel,
    bevelSegments: 3, curveSegments: 9, steps: 1,
  }), { z, tone });
  const ball = (x, y, z, rx, ry = rx, rz = rx, tone = 1) => add(new THREE.SphereGeometry(1, 12, 8), { x, y, z, sx: rx, sy: ry, sz: rz, tone });
  const line = (points, radius = 0.004, z = 0.06, tone = 0.95) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], z)));
    add(new THREE.TubeGeometry(curve, Math.max(6, points.length * 4), radius, 5, false), { tone });
  };
  const border = (path, count = 32, z = 0.05, radius = 0.007) => {
    const points = path.getSpacedPoints(count);
    for (let i = 0; i < count; i++) result.granules.push({ position: [points[i].x, points[i].y, z], scale: [radius, radius, radius] });
  };
  const stone = (type, x, y, rx, ry = rx, z = 0.06, rotation = 0) => {
    const ring = ellipse(0, 0, rx + 0.008, ry + 0.008);
    ring.holes.push(ellipse(0, 0, rx * 0.81, ry * 0.81));
    add(new THREE.ExtrudeGeometry(ring, { depth: 0.012, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 3, curveSegments: 12 }), { x, y, z, rz: rotation });
    result[type].push({ position: [x, y, z + 0.014], scale: [rx, ry, Math.min(rx, ry) * 0.56], rotation });
  };
  const append = (other, { x = 0, y = 0, z = 0, scale = 1, mirror = false } = {}) => {
    const sign = mirror ? -1 : 1;
    add(other.geometry.clone(), { x, y, z, sx: scale * sign, sy: scale, sz: scale });
    for (const key of ['primary', 'secondary', 'accents', 'granules']) for (const item of other[key]) result[key].push({
      ...item, position: [x + item.position[0] * scale * sign, y + item.position[1] * scale, z + item.position[2] * scale],
      scale: item.scale.map(v => v * scale), rotation: (item.rotation || 0) * sign,
    });
  };
  return { ...result, shape, ball, line, border, stone, append, finish() {
    const geometry = mergeGeometries(parts, false);
    if (!geometry) throw new Error('Unable to merge temple relief');
    geometry.clearGroups();
    geometry.computeBoundingSphere();
    parts.forEach(g => g.dispose());
    return { ...result, geometry };
  } };
}

/* Four arms, a tiered crown, crossed legs and lotus throne: modelled relief,
   including a raised face, nose, necklace, garment folds and hand-held lotuses. */
function addDeity(a, cx, cy, scale = 1, z = 0.05) {
  const local = assembly();
  const body = new THREE.Shape();
  body.moveTo(-0.055, 0.09);
  body.bezierCurveTo(-0.1, 0.02, -0.055, -0.02, -0.07, -0.08);
  body.bezierCurveTo(-0.19, -0.08, -0.2, -0.16, -0.12, -0.17);
  body.bezierCurveTo(-0.04, -0.19, 0.03, -0.12, 0.11, -0.17);
  body.bezierCurveTo(0.22, -0.17, 0.18, -0.08, 0.065, -0.07);
  body.bezierCurveTo(0.045, -0.01, 0.1, 0.035, 0.055, 0.09);
  body.closePath();
  local.shape(body, 0.035, 0, 0.85);
  for (const side of [-1, 1]) {
    local.line([[side * 0.05, 0.06], [side * 0.105, 0.04], [side * 0.14, 0.15]], 0.016, 0.037);
    local.line([[side * 0.05, 0.04], [side * 0.11, -0.035], [side * 0.155, -0.045]], 0.015, 0.055);
    local.ball(side * 0.145, 0.15, 0.045, 0.018, 0.023, 0.014);
    local.shape(leaf(side * 0.145, 0.195, 0.027, 0.05), 0.012, 0.043);
    local.ball(side * 0.155, -0.045, 0.06, 0.022, 0.018, 0.013);
    local.ball(side * 0.03, 0.035, 0.048, 0.028, 0.027, 0.021);
    local.line([[side * 0.04, -0.04], [side * 0.09, -0.12], [side * 0.145, -0.14]], 0.004, 0.055, 0.63);
    local.line([[side * 0.008, 0.14], [side * 0.026, 0.145], [side * 0.039, 0.135]], 0.0025, 0.092, 0.42);
  }
  local.ball(0, 0.13, 0.046, 0.044, 0.058, 0.037);
  local.ball(0, 0.119, 0.082, 0.008, 0.017, 0.012);
  local.line([[-0.012, 0.102], [0, 0.098], [0.012, 0.102]], 0.0023, 0.082, 0.55);
  for (let i = -2; i <= 2; i++) local.shape(leaf(i * 0.018, 0.205 + (2 - Math.abs(i)) * 0.012, 0.016, 0.065), 0.016, 0.045);
  local.line([[-0.049, 0.178], [0, 0.185], [0.049, 0.178]], 0.007, 0.06);
  local.line([[-0.053, -0.025], [0, -0.032], [0.053, -0.025]], 0.008, 0.054);
  for (let i = -3; i <= 3; i++) local.shape(leaf(i * 0.04, -0.19 + Math.abs(i) * 0.007, 0.03, 0.065, -i * 0.18), 0.016, 0.01);
  local.border(ellipse(0, 0.04, 0.063, 0.06), 16, 0.07, 0.004);
  a.append(local.finish(), { x: cx, y: cy, z, scale });
}

export const templePeacock = () => once('temple-peacock', () => {
  const a = assembly();
  const fan = new THREE.Shape();
  fan.moveTo(0.035, -0.13);
  fan.bezierCurveTo(-0.115, -0.175, -0.163, -0.015, -0.11, 0.09);
  fan.bezierCurveTo(-0.065, 0.18, 0.02, 0.125, 0.055, 0.065);
  fan.bezierCurveTo(0.09, -0.015, 0.085, -0.085, 0.035, -0.13);
  a.shape(fan, 0.035, 0, 0.7);
  a.border(fan, 35, 0.048, 0.0065);
  for (let i = 0; i < 5; i++) {
    const angle = -0.6 + i * 0.28;
    a.shape(leaf(-0.055 + i * 0.019, -0.014 - i * 0.009, 0.023, 0.17, angle), 0.018, 0.039, 0.88, 0.003);
  }
  const body = new THREE.Shape();
  body.moveTo(-0.015, -0.09);
  body.bezierCurveTo(0.085, -0.14, 0.085, -0.035, 0.052, 0.016);
  body.bezierCurveTo(0.029, 0.065, 0.056, 0.095, 0.09, 0.095);
  body.bezierCurveTo(0.142, 0.096, 0.124, 0.155, 0.082, 0.144);
  body.bezierCurveTo(0.017, 0.13, -0.005, 0.08, 0.012, 0.026);
  body.bezierCurveTo(-0.04, 0.035, -0.057, -0.065, -0.015, -0.09);
  a.shape(body, 0.03, 0.061, 1, 0.006);
  a.shape(leaf(-0.003, -0.025, 0.042, 0.1, -0.25), 0.018, 0.092);
  a.line([[0.113, 0.124], [0.137, 0.116], [0.113, 0.113]], 0.004, 0.085);
  for (let i = 0; i < 3; i++) a.shape(leaf(0.068 + i * 0.014, 0.164, 0.007, 0.028, 0.25 - i * 0.25), 0.009, 0.073, 1, 0.002);
  a.stone('primary', -0.006, -0.03, 0.027, 0.042, 0.11, -0.25);
  a.stone('secondary', -0.086, 0.018, 0.013, 0.024, 0.066, -0.4);
  a.stone('secondary', -0.059, -0.06, 0.012, 0.021, 0.066, -0.2);
  a.accents.push({ position: [0.096, 0.127, 0.101], scale: [0.007, 0.007, 0.007] });
  return a.finish();
});

export const templeMedallion = () => once('temple-medallion', () => {
  const a = assembly();
  const outline = flower(0, 0, 0.142, 12);
  a.shape(outline, 0.033, 0, 0.74);
  a.border(outline, 42, 0.048, 0.0065);
  const rim = ellipse(0, 0, 0.118, 0.118);
  rim.holes.push(ellipse(0, 0, 0.1, 0.1));
  a.shape(rim, 0.015, 0.039, 0.95, 0.003);
  addDeity(a, 0, -0.016, 0.42, 0.047);
  a.stone('primary', 0, 0.115, 0.022, 0.026, 0.055);
  for (const side of [-1, 1]) a.stone('secondary', side * 0.087, -0.078, 0.015, 0.021, 0.046, side * 0.4);
  return a.finish();
});

function archShape(outer, inner) {
  const arch = (w, top, base) => {
    const s = new THREE.Shape();
    s.moveTo(-w, base); s.lineTo(-w, -0.4);
    s.bezierCurveTo(-w, top, w, top, w, -0.4);
    s.lineTo(w, base); s.closePath();
    return s;
  };
  const shape = arch(outer, -0.035, -0.88);
  shape.holes.push(arch(inner, -0.22, -0.766));
  return shape;
}

export const templePendant = () => once('temple-pendant', () => {
  const a = assembly();
  const frame = archShape(0.338, 0.245);
  a.shape(frame, 0.046, 0, 0.68, 0.009);
  a.border(frame, 92, 0.063, 0.008);
  a.border(frame.holes[0], 65, 0.063, 0.0055);
  addDeity(a, 0, -0.536, 1.08, 0.032);
  for (const side of [-1, 1]) {
    for (const dx of [-0.02, 0, 0.02]) a.line([[side * 0.29 + dx, -0.4], [side * 0.29 + dx, -0.59], [side * 0.29 + dx, -0.78]], 0.005, 0.071, dx === 0 ? 0.65 : 1);
    for (const y of [-0.37, -0.71, -0.79]) a.ball(side * 0.29, y, 0.055, 0.056, 0.017, 0.024);
    a.append(templePeacock(), { x: side * 0.395, y: -0.64, z: 0.006, scale: 0.9, mirror: side < 0 });
    a.stone('secondary', side * 0.292, -0.523, 0.028, 0.046, 0.071);
  }
  for (let i = 0; i < 7; i++) {
    const angle = Math.PI * (0.08 + i / 6 * 0.84);
    const x = Math.cos(angle) * 0.306, y = -0.39 + Math.sin(angle) * 0.255;
    a.stone(i % 2 ? 'secondary' : 'primary', x, y, 0.026, 0.033, 0.06, -angle + Math.PI / 2);
  }
  for (let i = -4; i <= 4; i++) {
    a.shape(leaf(i * 0.064, -0.856, 0.045, 0.108, -i * 0.1), 0.025, 0.041, 0.93);
    if (i % 2 === 0) a.stone('primary', i * 0.064, -0.846, 0.018, 0.025, 0.072);
  }
  a.stone('primary', 0, -0.56, 0.019, 0.025, 0.137);
  const bail = ellipse(0, -0.045, 0.039, 0.049);
  bail.holes.push(ellipse(0, -0.045, 0.019, 0.029));
  a.shape(bail, 0.035, 0.004, 1, 0.005);
  a.line([[0, -0.09], [0, -0.12], [0, -0.15]], 0.014, 0.024);
  for (let i = 0; i < 17; i++) a.drops.push({ position: [(i - 8) * 0.048, -0.876 + Math.abs(i - 8) * 0.003, 0.045], length: 0.065 + (1 - Math.abs(i - 8) / 9) * 0.025, radius: 0.027, phase: i * 0.73 });
  // Second, smaller lotus drop; full assembly stays between y=0.01 and -1.47.
  a.line([[0, -0.96], [0, -1.025], [0, -1.07]], 0.012, 0.044);
  const lower = flower(0, -1.171, 0.116, 10);
  a.shape(lower, 0.035, 0.014, 0.8);
  a.border(lower, 32, 0.063, 0.007);
  for (let i = -2; i <= 2; i++) a.shape(leaf(i * 0.033, -1.17, 0.022, 0.17, -i * 0.27), 0.016, 0.055);
  a.stone('secondary', 0, -1.169, 0.045, 0.061, 0.076);
  for (let i = 0; i < 7; i++) a.drops.push({ position: [(i - 3) * 0.03, -1.27 + Math.abs(i - 3) * 0.009, 0.045], length: 0.075 + (3 - Math.abs(i - 3)) * 0.013, radius: 0.021, phase: i * 1.1 });
  for (const x of [-0.245, 0, 0.245]) a.accents.push({ position: [x, -0.79, 0.108], scale: [0.011, 0.011, 0.011] });
  return a.finish();
});

export const templeCabochonGeo = () => once('temple-cabochon', () => new THREE.SphereGeometry(1, 20, 12));
export const templeGranuleGeo = () => once('temple-granule', () => antiqueVertexColors(new THREE.SphereGeometry(1, 7, 5)));
export const templeDropGeo = () => once('temple-drop', () => {
  const geometry = new THREE.SphereGeometry(1, 12, 8);
  antiqueVertexColors(geometry);
  const p = geometry.attributes.position, color = geometry.attributes.color;
  for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) + 0.38) < 0.07) {
    color.setXYZ(i, 0.43, 0.25, 0.1); // incised seam around the ghungroo
  }
  return geometry;
});
export const templeWireGeo = () => once('temple-wire', () => antiqueVertexColors(new THREE.CylinderGeometry(1, 1, 1, 6)));
export const templeJointGeo = () => once('temple-joint', () => antiqueVertexColors(new THREE.TorusGeometry(0.029, 0.007, 6, 14)));
export const templeCordBeadGeo = () => once('temple-cord-bead', () => {
  const a = assembly();
  const s = ellipse(0, 0, 0.044, 0.044); s.holes.push(ellipse(0, 0, 0.032, 0.032));
  a.shape(s, 0.105, -0.052, 0.95, 0.003);
  for (const z of [-0.047, 0.047]) {
    const ring = new THREE.TorusGeometry(0.045, 0.006, 6, 14);
    // The tube's local axis is Z; the rig aligns it to the cord tangent.
    ring.translate(0, 0, z);
    a.append({ geometry: antiqueVertexColors(ring), primary: [], secondary: [], accents: [], granules: [] });
  }
  return a.finish().geometry;
});

export const templeCordTemplate = () => once('temple-cord-template', () => {
  const path = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
  const thread = new THREE.TubeGeometry(path, 112, 0.018, 7, false);
  const geometry = mergeGeometries([thread, thread], false);
  thread.dispose();
  geometry.clearGroups();
  return geometry;
});
