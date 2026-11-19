import * as THREE from 'three';

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
  return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.17, envMapIntensity: 1.6 });
}
export function makeGem(color = '#0c8f50', emissive = '#03371c') {
  return new THREE.MeshPhysicalMaterial({
    color,
    emissive,
    emissiveIntensity: 0.7,
    metalness: 0.4,
    roughness: 0.03,
    flatShading: true,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.6,
    iridescence: 0.25,
    iridescenceIOR: 1.6,
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
